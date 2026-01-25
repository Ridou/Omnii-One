/**
 * Google Calendar Ingestion Service
 *
 * Syncs calendar events to the knowledge graph with:
 * - Incremental sync using sync tokens
 * - Quality gate validation with CalendarEventSchema
 * - Attendee extraction as Contact nodes
 * - 410 error handling with fallback to full sync
 */

import { backOff } from "exponential-backoff";
import { getComposioClient } from "../composio-client";
import { getSyncStateService, type SyncSource } from "../sync-state";
import {
  CalendarEventSchema,
  type CalendarEvent,
  validateIngestionData,
} from "../validators";
import { createNode, createRelationship } from "../../graph/operations/crud";
import {
  NodeLabel,
  type EventNode,
  type ContactNode,
} from "../../graph/schema/nodes";
import { RelationshipType } from "../../graph/schema/relationships";
import type { Neo4jHTTPClient } from "../../services/neo4j/http-client";
import { discoverRelationships } from "../../services/graphrag/relationship-discovery";

const SYNC_SOURCE: SyncSource = "google_calendar";

/**
 * Result of a calendar sync operation
 */
export interface CalendarSyncResult {
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsSkipped: number;
  contactsCreated: number;
  entitiesExtracted: number;
  relationshipsCreated: number;
  errors: string[];
  nextSyncToken?: string;
}

/**
 * CalendarIngestionService handles syncing Google Calendar events to Neo4j
 */
export class CalendarIngestionService {
  private composio = getComposioClient();
  private syncStateService = getSyncStateService();

  /**
   * Sync calendar events for a user
   *
   * @param userId - User ID for Composio entity and Neo4j client lookup
   * @param client - Neo4j HTTP client for the user's database
   * @param forceFullSync - Force full sync ignoring sync token
   * @param extractEntities - Whether to extract entities from event content (default: true)
   */
  async syncEvents(
    userId: string,
    client: Neo4jHTTPClient,
    forceFullSync: boolean = false,
    extractEntities: boolean = true
  ): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      success: false,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsSkipped: 0,
      contactsCreated: 0,
      entitiesExtracted: 0,
      relationshipsCreated: 0,
      errors: [],
    };

    try {
      // Mark sync as started
      await this.syncStateService.markSyncStarted(userId, SYNC_SOURCE);

      // Get current sync state
      const syncState = await this.syncStateService.getState(userId, SYNC_SOURCE);
      const syncToken = forceFullSync ? null : (syncState?.sync_token ?? null);

      // Fetch events with incremental sync
      const { events, nextSyncToken } = await this.fetchCalendarEvents(
        userId,
        syncToken
      );

      // Process each event
      for (const rawEvent of events) {
        result.eventsProcessed++;

        // Validate against schema (quality gate)
        const validation = validateIngestionData(
          CalendarEventSchema,
          rawEvent,
          "calendar"
        );

        if (!validation.success) {
          const validationErrors = validation.errors;
          result.errors.push(...validationErrors);
          result.eventsSkipped++;
          continue;
        }

        const event = validation.data as CalendarEvent;

        // Skip cancelled events (they're returned for sync consistency)
        if (event.status === "cancelled") {
          result.eventsSkipped++;
          continue;
        }

        // Insert or update event in graph
        const created = await this.upsertEventNode(userId, client, event);
        if (created) {
          result.eventsCreated++;
        }

        // Extract entities from event (title + description)
        if (extractEntities && (event.summary || event.description)) {
          const textToAnalyze = [
            event.summary,
            event.description,
            // Include attendee names for context
            ...(event.attendees?.map((a) => a.displayName).filter(Boolean) || []),
          ]
            .filter(Boolean)
            .join(". ");

          try {
            const extractionResult = await discoverRelationships(
              client,
              userId,
              textToAnalyze,
              {
                sourceContext: `calendar_event:${event.id}`,
              }
            );

            if (extractionResult.nodesCreated > 0 || extractionResult.relationshipsCreated > 0) {
              result.entitiesExtracted += extractionResult.nodesCreated + extractionResult.nodesLinked;
              result.relationshipsCreated += extractionResult.relationshipsCreated;
              console.log(
                `Extracted ${extractionResult.entities.length} entities and ${extractionResult.relationshipsCreated} relationships from event "${event.summary}"`
              );
            }
          } catch (extractError) {
            // Log but don't fail the sync for extraction errors
            console.warn(`Entity extraction failed for event ${event.id}:`, extractError);
          }
        }

        // Extract attendees as contacts
        if (event.attendees && event.attendees.length > 0) {
          const contactsCreated = await this.extractAttendees(
            userId,
            client,
            event
          );
          result.contactsCreated += contactsCreated;
        }
      }

      // Mark sync as completed
      await this.syncStateService.markSyncCompleted(userId, SYNC_SOURCE, {
        syncToken: nextSyncToken,
        itemsSynced: result.eventsCreated,
      });

      result.success = true;
      result.nextSyncToken = nextSyncToken;
    } catch (error) {
      // Handle 410 Gone - sync token expired
      if (this.is410Error(error)) {
        console.log(
          `Sync token expired for user ${userId}, triggering full sync`
        );
        await this.syncStateService.clearSyncToken(userId, SYNC_SOURCE);
        // Retry with full sync, preserving extractEntities setting
        return this.syncEvents(userId, client, true, extractEntities);
      }

      // Handle rate limiting
      if (this.is429Error(error)) {
        await this.syncStateService.markRateLimited(userId, SYNC_SOURCE);
        result.errors.push("Rate limited by Google API, will retry later");
        return result;
      }

      // General error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.syncStateService.markSyncFailed(
        userId,
        SYNC_SOURCE,
        errorMessage
      );
      result.errors.push(errorMessage);
    }

    return result;
  }

  /**
   * Fetch calendar events from Google via Composio
   */
  private async fetchCalendarEvents(
    userId: string,
    syncToken: string | null
  ): Promise<{ events: unknown[]; nextSyncToken?: string }> {
    const entity = this.composio.getEntity(userId);
    const allEvents: unknown[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    do {
      const response = await backOff(
        async () => {
          // Execute Google Calendar list events action
          const result = await entity.execute({
            actionName: "googlecalendar_list_events",
            params: {
              calendarId: "primary",
              maxResults: 250,
              ...(syncToken ? { syncToken } : { timeMin: this.getTimeMin() }),
              ...(pageToken ? { pageToken } : {}),
            },
          });

          return result;
        },
        {
          numOfAttempts: 5,
          maxDelay: 30000,
          jitter: "full",
          retry: (error: unknown) => {
            // Retry on 5xx and 429, not on 4xx (except 429)
            const status = (error as { response?: { status?: number } })
              ?.response?.status;
            if (status === 429) return true;
            if (status && status >= 500) return true;
            return false;
          },
        }
      );

      // Extract events and pagination info
      const data = response.data as {
        items?: unknown[];
        nextPageToken?: string;
        nextSyncToken?: string;
      };

      if (data.items) {
        allEvents.push(...data.items);
      }

      pageToken = data.nextPageToken;
      nextSyncToken = data.nextSyncToken;
    } while (pageToken);

    return { events: allEvents, nextSyncToken };
  }

  /**
   * Insert or update an event in the graph
   */
  private async upsertEventNode(
    _userId: string,
    client: Neo4jHTTPClient,
    event: CalendarEvent
  ): Promise<boolean> {
    // Check if event already exists by Google event ID
    const existingEvents = await this.findEventByGoogleId(client, event.id);

    if (existingEvents.length > 0) {
      // Event exists - could update here if needed
      // For now, skip (incremental sync handles updates via deletion + recreation)
      return false;
    }

    // Determine start/end times
    const startTime = event.start.dateTime || `${event.start.date}T00:00:00Z`;
    const endTime = event.end?.dateTime || event.end?.date
      ? event.end.dateTime || `${event.end.date}T23:59:59Z`
      : undefined;

    // Create Event node
    await createNode<EventNode>(client, NodeLabel.Event, {
      name: event.summary,
      startTime,
      endTime,
      location: event.location,
      description: event.description,
      // Store Google ID in a custom property for deduplication
      // Note: EventNode doesn't have a properties field, so we store these directly
    } as Omit<EventNode, "id" | "createdAt">);

    // Store Google-specific metadata in a separate property update
    // For now, we store google_event_id as part of the description or via a separate query
    await this.storeGoogleMetadata(client, event.id, event.recurringEventId);

    return true;
  }

  /**
   * Store Google-specific metadata for the event
   */
  private async storeGoogleMetadata(
    client: Neo4jHTTPClient,
    googleEventId: string,
    recurringEventId?: string
  ): Promise<void> {
    // Find the most recently created event and add Google metadata
    const cypher = `
      MATCH (e:Event)
      WHERE NOT exists(e.google_event_id)
      WITH e ORDER BY e.createdAt DESC LIMIT 1
      SET e.google_event_id = $googleEventId,
          e.source = 'google_calendar'
          ${recurringEventId ? ", e.recurring_event_id = $recurringEventId" : ""}
      RETURN e.id
    `;

    await client.query(cypher, { googleEventId, recurringEventId });
  }

  /**
   * Find event by Google event ID
   */
  private async findEventByGoogleId(
    client: Neo4jHTTPClient,
    googleEventId: string
  ): Promise<EventNode[]> {
    const cypher = `
      MATCH (e:Event)
      WHERE e.google_event_id = $googleEventId
      RETURN properties(e) AS props
    `;

    const result = await client.query(cypher, { googleEventId });

    if (!result.data?.values?.length) {
      return [];
    }

    return result.data.values.map((row) => row[0] as EventNode);
  }

  /**
   * Extract attendees and create Contact nodes with relationships
   */
  private async extractAttendees(
    _userId: string,
    client: Neo4jHTTPClient,
    event: CalendarEvent
  ): Promise<number> {
    if (!event.attendees) return 0;

    let contactsCreated = 0;

    for (const attendee of event.attendees) {
      // Skip self (the user's own email)
      if (attendee.self) continue;

      // Check if contact already exists
      const existing = await this.findContactByEmail(client, attendee.email);

      let contactId: string;

      if (existing) {
        contactId = existing.id;
      } else {
        // Create new contact
        const contact = await createNode<ContactNode>(
          client,
          NodeLabel.Contact,
          {
            name: attendee.displayName || attendee.email.split("@")[0],
            email: attendee.email.toLowerCase(),
            // Organization can be inferred from email domain
            organization: this.inferOrganization(attendee.email),
          } as Omit<ContactNode, "id" | "createdAt">
        );
        contactId = contact.id;
        contactsCreated++;
      }

      // Find the event node to create relationship
      const eventNodes = await this.findEventByGoogleId(client, event.id);
      if (eventNodes.length > 0) {
        // Create ATTENDED_BY relationship (Event -> Contact)
        await createRelationship(
          client,
          eventNodes[0].id,
          contactId,
          RelationshipType.ATTENDED_BY,
          { metadata: { response_status: attendee.responseStatus } }
        );
      }
    }

    return contactsCreated;
  }

  /**
   * Find contact by email
   */
  private async findContactByEmail(
    client: Neo4jHTTPClient,
    email: string
  ): Promise<ContactNode | null> {
    const cypher = `
      MATCH (c:Contact {email: $email})
      RETURN properties(c) AS props
      LIMIT 1
    `;

    const result = await client.query(cypher, { email: email.toLowerCase() });

    if (!result.data?.values?.length) {
      return null;
    }

    return result.data.values[0][0] as ContactNode;
  }

  /**
   * Infer organization from email domain
   */
  private inferOrganization(email: string): string | undefined {
    const domain = email.split("@")[1];
    if (!domain) return undefined;

    // Skip common email providers
    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
      "protonmail.com",
      "aol.com",
    ];

    if (personalDomains.includes(domain.toLowerCase())) {
      return undefined;
    }

    // Convert domain to organization name
    return domain.split(".")[0];
  }

  /**
   * Get timeMin for initial sync (90 days ago)
   */
  private getTimeMin(): string {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString();
  }

  /**
   * Check if error is a 410 Gone (sync token expired)
   */
  private is410Error(error: unknown): boolean {
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    return status === 410;
  }

  /**
   * Check if error is a 429 Rate Limit
   */
  private is429Error(error: unknown): boolean {
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    return status === 429;
  }
}

// Singleton instance
let _calendarService: CalendarIngestionService | null = null;

export function getCalendarIngestionService(): CalendarIngestionService {
  if (!_calendarService) {
    _calendarService = new CalendarIngestionService();
  }
  return _calendarService;
}

/**
 * Convenience function for one-off calendar sync
 *
 * @param userId - User ID for Composio entity and Neo4j client lookup
 * @param client - Neo4j HTTP client for the user's database
 * @param forceFullSync - Force full sync ignoring sync token
 * @param extractEntities - Whether to extract entities from event content (default: true)
 */
export async function ingestCalendarEvents(
  userId: string,
  client: Neo4jHTTPClient,
  forceFullSync: boolean = false,
  extractEntities: boolean = true
): Promise<CalendarSyncResult> {
  const service = getCalendarIngestionService();
  return service.syncEvents(userId, client, forceFullSync, extractEntities);
}
