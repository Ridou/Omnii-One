/**
 * Google Contacts Ingestion Service
 *
 * Syncs Google Contacts to the knowledge graph with:
 * - Incremental sync using syncToken
 * - Quality gate validation with GoogleContactSchema
 * - 410 error handling for expired sync tokens
 */

import { backOff } from "exponential-backoff";
import { getComposioClient } from "../composio-client";
import { getSyncStateService, type SyncSource } from "../sync-state";
import {
  GoogleContactSchema,
  type GoogleContact,
  validateIngestionData,
} from "../validators";
import { createNode, updateNode } from "../../graph/operations/crud";
import { NodeLabel, type ContactNode } from "../../graph/schema/nodes";
import type { Neo4jHTTPClient } from "../../services/neo4j/http-client";

const SYNC_SOURCE: SyncSource = "google_contacts";

export interface ContactsSyncResult {
  success: boolean;
  contactsProcessed: number;
  contactsCreated: number;
  contactsUpdated: number;
  contactsSkipped: number;
  errors: string[];
  nextSyncToken?: string;
}

export class ContactsIngestionService {
  private composio = getComposioClient();
  private syncStateService = getSyncStateService();

  async syncContacts(
    userId: string,
    client: Neo4jHTTPClient,
    forceFullSync: boolean = false
  ): Promise<ContactsSyncResult> {
    const result: ContactsSyncResult = {
      success: false,
      contactsProcessed: 0,
      contactsCreated: 0,
      contactsUpdated: 0,
      contactsSkipped: 0,
      errors: [],
    };

    try {
      await this.syncStateService.markSyncStarted(userId, SYNC_SOURCE);

      const syncState = await this.syncStateService.getState(userId, SYNC_SOURCE);
      const syncToken = forceFullSync ? null : syncState?.sync_token;

      const { contacts, nextSyncToken } = await this.fetchContacts(userId, syncToken);

      for (const rawContact of contacts) {
        result.contactsProcessed++;

        const validation = validateIngestionData(GoogleContactSchema, rawContact, "contact");
        if (!validation.success) {
          result.errors.push(...(validation as { success: false; errors: string[] }).errors);
          result.contactsSkipped++;
          continue;
        }

        const contact = validation.data;
        const { created, updated } = await this.upsertContactNode(userId, client, contact);
        if (created) result.contactsCreated++;
        if (updated) result.contactsUpdated++;
      }

      await this.syncStateService.markSyncCompleted(userId, SYNC_SOURCE, {
        syncToken: nextSyncToken,
        itemsSynced: result.contactsCreated + result.contactsUpdated,
      });

      result.success = true;
      result.nextSyncToken = nextSyncToken;
    } catch (error) {
      // Handle 410 Gone - sync token expired
      if (this.is410Error(error)) {
        await this.syncStateService.clearSyncToken(userId, SYNC_SOURCE);
        return this.syncContacts(userId, client, true);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.syncStateService.markSyncFailed(userId, SYNC_SOURCE, errorMessage);
      result.errors.push(errorMessage);
    }

    return result;
  }

  private async fetchContacts(
    userId: string,
    syncToken: string | null
  ): Promise<{ contacts: unknown[]; nextSyncToken?: string }> {
    const entity = this.composio.getEntity(userId);
    const allContacts: unknown[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    do {
      const response = await backOff(
        async () =>
          entity.execute({
            actionName: "googlecontacts_list_connections",
            params: {
              resourceName: "people/me",
              personFields: "names,emailAddresses,phoneNumbers,organizations,photos,birthdays",
              pageSize: 100,
              ...(syncToken ? { syncToken, requestSyncToken: true } : { requestSyncToken: true }),
              ...(pageToken ? { pageToken } : {}),
            },
          }),
        { numOfAttempts: 5, maxDelay: 30000, jitter: "full" }
      );

      const data = response.data as {
        connections?: unknown[];
        nextPageToken?: string;
        nextSyncToken?: string;
      };

      if (data.connections) allContacts.push(...data.connections);
      pageToken = data.nextPageToken;
      nextSyncToken = data.nextSyncToken;
    } while (pageToken);

    return { contacts: allContacts, nextSyncToken };
  }

  private async upsertContactNode(
    _userId: string,
    client: Neo4jHTTPClient,
    contact: GoogleContact
  ): Promise<{ created: boolean; updated: boolean }> {
    const primaryEmail = contact.emailAddresses?.[0]?.value?.toLowerCase();
    const primaryName = contact.names?.[0];

    // Try to find existing contact by Google resource name or email
    const existing = await this.findContact(client, contact.resourceName, primaryEmail);

    const contactData = {
      name:
        primaryName?.displayName ||
        `${primaryName?.givenName || ""} ${primaryName?.familyName || ""}`.trim() ||
        primaryEmail ||
        "Unknown Contact",
      email: primaryEmail,
      phone: contact.phoneNumbers?.[0]?.value,
      organization: contact.organizations?.[0]?.name,
    };

    if (existing) {
      await updateNode<ContactNode>(client, existing.id, contactData);
      return { created: false, updated: true };
    }

    await createNode<ContactNode>(client, NodeLabel.Contact, {
      ...contactData,
      properties: {
        google_resource_name: contact.resourceName,
        source: "google_contacts",
      },
    } as Omit<ContactNode, "id" | "createdAt">);

    return { created: true, updated: false };
  }

  private async findContact(
    client: Neo4jHTTPClient,
    resourceName: string,
    email?: string
  ): Promise<(ContactNode & { id: string }) | null> {
    // First try by Google resource name
    let cypher = `
      MATCH (c:Contact)
      WHERE c.properties.google_resource_name = $resourceName
      RETURN properties(c) AS props, c.id AS id
      LIMIT 1
    `;
    let result = await client.query(cypher, { resourceName });

    if (result.data?.values?.length) {
      const props = result.data.values[0][0] as ContactNode;
      return { ...props, id: result.data.values[0][1] as string };
    }

    // Fallback to email match
    if (email) {
      cypher = `
        MATCH (c:Contact {email: $email})
        RETURN properties(c) AS props, c.id AS id
        LIMIT 1
      `;
      result = await client.query(cypher, { email });

      if (result.data?.values?.length) {
        const props = result.data.values[0][0] as ContactNode;
        return { ...props, id: result.data.values[0][1] as string };
      }
    }

    return null;
  }

  private is410Error(error: unknown): boolean {
    return (error as { response?: { status?: number } })?.response?.status === 410;
  }
}

let _contactsService: ContactsIngestionService | null = null;

export function getContactsIngestionService(): ContactsIngestionService {
  if (!_contactsService) _contactsService = new ContactsIngestionService();
  return _contactsService;
}

export async function ingestContacts(
  userId: string,
  client: Neo4jHTTPClient,
  forceFullSync: boolean = false
): Promise<ContactsSyncResult> {
  return getContactsIngestionService().syncContacts(userId, client, forceFullSync);
}
