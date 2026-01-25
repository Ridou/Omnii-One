/**
 * Gmail Ingestion Service
 *
 * Syncs Gmail messages to the knowledge graph with:
 * - Incremental sync using historyId
 * - Quality gate validation with GmailMessageSchema
 * - Sender/recipient extraction as Contact nodes
 */

import { backOff } from "exponential-backoff";
import { getComposioClient } from "../composio-client";
import { getSyncStateService, type SyncSource } from "../sync-state";
import {
  GmailMessageSchema,
  type GmailMessage,
  validateIngestionData,
} from "../validators";
import { createNode } from "../../graph/operations/crud";
import {
  NodeLabel,
  type EntityNode,
  type ContactNode,
} from "../../graph/schema/nodes";
import type { Neo4jHTTPClient } from "../../services/neo4j/http-client";
import { discoverRelationships } from "../../services/graphrag/relationship-discovery";

const SYNC_SOURCE: SyncSource = "google_gmail";

export interface GmailSyncResult {
  success: boolean;
  messagesProcessed: number;
  messagesCreated: number;
  messagesSkipped: number;
  contactsCreated: number;
  entitiesExtracted: number;
  relationshipsCreated: number;
  errors: string[];
  latestHistoryId?: string;
}

export class GmailIngestionService {
  private composio = getComposioClient();
  private syncStateService = getSyncStateService();

  /**
   * Sync Gmail messages for a user
   *
   * @param userId - User ID for Composio entity and Neo4j client lookup
   * @param client - Neo4j HTTP client for the user's database
   * @param forceFullSync - Force full sync ignoring history ID
   * @param extractEntities - Whether to extract entities from email content (default: true)
   */
  async syncMessages(
    userId: string,
    client: Neo4jHTTPClient,
    forceFullSync: boolean = false,
    extractEntities: boolean = true
  ): Promise<GmailSyncResult> {
    const result: GmailSyncResult = {
      success: false,
      messagesProcessed: 0,
      messagesCreated: 0,
      messagesSkipped: 0,
      contactsCreated: 0,
      entitiesExtracted: 0,
      relationshipsCreated: 0,
      errors: [],
    };

    try {
      await this.syncStateService.markSyncStarted(userId, SYNC_SOURCE);

      const syncState = await this.syncStateService.getState(userId, SYNC_SOURCE);
      const historyId = forceFullSync ? null : syncState?.history_id;

      let messages: unknown[];
      let latestHistoryId: string | undefined;

      if (historyId) {
        // Incremental sync using history
        const historyResult = await this.fetchHistory(userId, historyId);
        messages = historyResult.messages;
        latestHistoryId = historyResult.latestHistoryId;

        // Handle 404 - historyId expired (>1 week old)
        if (!messages.length && !latestHistoryId) {
          await this.syncStateService.clearSyncToken(userId, SYNC_SOURCE);
          return this.syncMessages(userId, client, true, extractEntities);
        }
      } else {
        // Full sync - get recent messages (last 90 days)
        const fullResult = await this.fetchRecentMessages(userId);
        messages = fullResult.messages;
        latestHistoryId = fullResult.latestHistoryId;
      }

      for (const rawMessage of messages) {
        result.messagesProcessed++;

        const validation = validateIngestionData(GmailMessageSchema, rawMessage, "gmail");
        if (!validation.success) {
          result.errors.push(...(validation as { success: false; errors: string[] }).errors);
          result.messagesSkipped++;
          continue;
        }

        const message = validation.data;
        const created = await this.upsertMessageNode(userId, client, message);
        if (created) {
          result.messagesCreated++;
          const contacts = await this.extractEmailContacts(userId, client, message);
          result.contactsCreated += contacts;

          // Extract entities from email (subject + snippet)
          if (extractEntities) {
            const subject =
              message.payload?.headers?.find(
                (h) => h.name.toLowerCase() === "subject"
              )?.value || "";

            const textToAnalyze = [subject, message.snippet]
              .filter(Boolean)
              .join(". ");

            // Only analyze if there's meaningful content (>20 chars)
            if (textToAnalyze.length > 20) {
              try {
                const extractionResult = await discoverRelationships(
                  client,
                  userId,
                  textToAnalyze,
                  {
                    sourceContext: `gmail_message:${message.id}`,
                  }
                );

                if (
                  extractionResult.nodesCreated > 0 ||
                  extractionResult.relationshipsCreated > 0
                ) {
                  result.entitiesExtracted +=
                    extractionResult.nodesCreated + extractionResult.nodesLinked;
                  result.relationshipsCreated +=
                    extractionResult.relationshipsCreated;
                }
              } catch (extractError) {
                console.warn(
                  `Entity extraction failed for email ${message.id}:`,
                  extractError
                );
              }
            }
          }
        }
      }

      await this.syncStateService.markSyncCompleted(userId, SYNC_SOURCE, {
        historyId: latestHistoryId,
        itemsSynced: result.messagesCreated,
      });

      result.success = true;
      result.latestHistoryId = latestHistoryId;
    } catch (error) {
      // Handle 404 - historyId outside available range
      if (this.is404Error(error)) {
        await this.syncStateService.clearSyncToken(userId, SYNC_SOURCE);
        return this.syncMessages(userId, client, true, extractEntities);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.syncStateService.markSyncFailed(userId, SYNC_SOURCE, errorMessage);
      result.errors.push(errorMessage);
    }

    return result;
  }

  private async fetchHistory(
    userId: string,
    startHistoryId: string
  ): Promise<{ messages: unknown[]; latestHistoryId?: string }> {
    const entity = this.composio.getEntity(userId);

    const response = await backOff(
      async () =>
        entity.execute({
          actionName: "gmail_list_history",
          params: {
            userId: "me",
            startHistoryId,
            historyTypes: ["messageAdded"],
          },
        }),
      { numOfAttempts: 5, maxDelay: 30000, jitter: "full" }
    );

    const data = response.data as {
      history?: { messagesAdded?: { message: unknown }[] }[];
      historyId?: string;
    };
    const messages =
      data.history?.flatMap((h) => h.messagesAdded?.map((m) => m.message) || []) || [];

    return { messages, latestHistoryId: data.historyId };
  }

  private async fetchRecentMessages(
    userId: string
  ): Promise<{ messages: unknown[]; latestHistoryId?: string }> {
    const entity = this.composio.getEntity(userId);
    const allMessages: unknown[] = [];
    let pageToken: string | undefined;
    let latestHistoryId: string | undefined;

    // Fetch message list (IDs only)
    do {
      const response = await backOff(
        async () =>
          entity.execute({
            actionName: "gmail_list_messages",
            params: {
              userId: "me",
              maxResults: 100,
              q: "newer_than:90d", // Last 90 days
              ...(pageToken ? { pageToken } : {}),
            },
          }),
        { numOfAttempts: 5, maxDelay: 30000, jitter: "full" }
      );

      const data = response.data as {
        messages?: { id: string; historyId?: string }[];
        nextPageToken?: string;
      };
      if (data.messages) {
        // Get first message's historyId for tracking
        if (!latestHistoryId && data.messages[0]?.historyId) {
          latestHistoryId = data.messages[0].historyId;
        }

        // Fetch full message details in batches
        for (const msg of data.messages) {
          const fullMsg = await this.fetchMessageDetails(userId, msg.id);
          if (fullMsg) allMessages.push(fullMsg);
        }
      }
      pageToken = data.nextPageToken;

      // Limit to 500 messages for initial sync
      if (allMessages.length >= 500) break;
    } while (pageToken);

    return { messages: allMessages, latestHistoryId };
  }

  private async fetchMessageDetails(userId: string, messageId: string): Promise<unknown> {
    const entity = this.composio.getEntity(userId);

    const response = await backOff(
      async () =>
        entity.execute({
          actionName: "gmail_get_message",
          params: { userId: "me", id: messageId, format: "metadata" },
        }),
      { numOfAttempts: 3, maxDelay: 10000, jitter: "full" }
    );

    return response.data;
  }

  private async upsertMessageNode(
    _userId: string,
    client: Neo4jHTTPClient,
    message: GmailMessage
  ): Promise<boolean> {
    const existing = await this.findMessageByGmailId(client, message.id);
    if (existing) return false;

    // Extract subject from headers
    const subject =
      message.payload?.headers?.find((h) => h.name.toLowerCase() === "subject")?.value ||
      "No Subject";

    await createNode<EntityNode>(client, NodeLabel.Entity, {
      name: subject,
      type: "thing",
      properties: {
        entity_type: "email",
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId,
        source: "google_gmail",
        snippet: message.snippet,
        labels: message.labelIds,
        internal_date: message.internalDate,
      },
    } as Omit<EntityNode, "id" | "createdAt">);

    return true;
  }

  private async findMessageByGmailId(
    client: Neo4jHTTPClient,
    gmailId: string
  ): Promise<EntityNode | null> {
    const cypher = `
      MATCH (e:Entity)
      WHERE e.properties.gmail_message_id = $gmailId
      RETURN properties(e) AS props
      LIMIT 1
    `;
    const result = await client.query(cypher, { gmailId });
    return result.data?.values?.[0]?.[0] as EntityNode | null;
  }

  private async extractEmailContacts(
    _userId: string,
    client: Neo4jHTTPClient,
    message: GmailMessage
  ): Promise<number> {
    let created = 0;
    const headers = message.payload?.headers || [];

    for (const header of headers) {
      if (["from", "to", "cc"].includes(header.name.toLowerCase())) {
        const emails = this.parseEmailAddresses(header.value);
        for (const { email, name } of emails) {
          const contactCreated = await this.ensureContact(client, email, name);
          if (contactCreated) created++;
        }
      }
    }

    return created;
  }

  private parseEmailAddresses(value: string): { email: string; name?: string }[] {
    const results: { email: string; name?: string }[] = [];
    const regex = /(?:"?([^"<]+)"?\s*)?<([^>]+)>|([^\s,]+@[^\s,]+)/g;
    let match;

    while ((match = regex.exec(value)) !== null) {
      const name = match[1]?.trim();
      const email = (match[2] || match[3])?.toLowerCase();
      if (email) results.push({ email, name });
    }

    return results;
  }

  private async ensureContact(
    client: Neo4jHTTPClient,
    email: string,
    name?: string
  ): Promise<boolean> {
    const cypher = `
      MATCH (c:Contact {email: $email})
      RETURN properties(c) AS props
      LIMIT 1
    `;
    const result = await client.query(cypher, { email });
    if (result.data?.values?.length) return false;

    await createNode<ContactNode>(client, NodeLabel.Contact, {
      name: name || email.split("@")[0],
      email,
    } as Omit<ContactNode, "id" | "createdAt">);

    return true;
  }

  private is404Error(error: unknown): boolean {
    return (error as { response?: { status?: number } })?.response?.status === 404;
  }
}

let _gmailService: GmailIngestionService | null = null;

export function getGmailIngestionService(): GmailIngestionService {
  if (!_gmailService) _gmailService = new GmailIngestionService();
  return _gmailService;
}

/**
 * Convenience function for one-off Gmail sync
 *
 * @param userId - User ID for Composio entity and Neo4j client lookup
 * @param client - Neo4j HTTP client for the user's database
 * @param forceFullSync - Force full sync ignoring history ID
 * @param extractEntities - Whether to extract entities from email content (default: true)
 */
export async function ingestGmail(
  userId: string,
  client: Neo4jHTTPClient,
  forceFullSync: boolean = false,
  extractEntities: boolean = true
): Promise<GmailSyncResult> {
  return getGmailIngestionService().syncMessages(
    userId,
    client,
    forceFullSync,
    extractEntities
  );
}
