/**
 * MCP Tool: omnii_calendar_query
 *
 * Queries calendar events with time-based filtering.
 * Uses temporal context service to filter events by relative time ranges.
 */

import { z } from 'zod';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import {
  queryTemporalEvents,
  type TemporalEventResult,
} from '../../services/graphrag/temporal-context';
import { searchByText } from '../../graph/operations/search';
import type { MCPToolResponse } from './search-nodes';
import { logAuditEvent, AuditEventType } from '../../services/audit';

/**
 * Zod schema for calendar_query input validation.
 */
export const CalendarQueryInputSchema = z.object({
  timeRange: z
    .enum([
      'today',
      'yesterday',
      'this week',
      'last week',
      'this month',
      'last month',
      'this year',
      'last year',
    ])
    .describe('Relative time range for calendar query'),
  eventType: z
    .string()
    .optional()
    .describe('Filter by event type (meeting, appointment, reminder, etc.)'),
  query: z
    .string()
    .optional()
    .describe('Optional semantic search within time range'),
  includeAttendees: z
    .boolean()
    .default(true)
    .describe('Include related contacts (attendees)'),
});

/**
 * MCP tool definition for tools/list response.
 */
export const calendarQueryToolDefinition = {
  name: 'omnii_calendar_query',
  description:
    'Query calendar events with time-based filtering. Use for questions about meetings, ' +
    'appointments, and scheduled events. Supports relative time ranges like "last week" or "this month".',
  inputSchema: {
    type: 'object' as const,
    properties: {
      timeRange: {
        type: 'string',
        enum: [
          'today',
          'yesterday',
          'this week',
          'last week',
          'this month',
          'last month',
          'this year',
          'last year',
        ],
        description: 'Relative time range for calendar query',
      },
      eventType: {
        type: 'string',
        description: 'Filter by event type',
      },
      query: {
        type: 'string',
        description: 'Optional semantic search within time range',
      },
      includeAttendees: {
        type: 'boolean',
        description: 'Include related contacts (default: true)',
      },
    },
    required: ['timeRange'],
  },
};

/**
 * Handle calendar_query tool invocation.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param input - Raw input from MCP tool call
 * @param userId - User ID for multi-tenant isolation
 * @returns MCP-compliant response with calendar events
 */
export async function handleCalendarQuery(
  client: Neo4jHTTPClient,
  input: unknown,
  userId?: string
): Promise<MCPToolResponse> {
  if (!userId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'User ID is required for calendar query',
          }),
        },
      ],
      isError: true,
    };
  }
  try {
    // Validate input with Zod schema
    const parsed = CalendarQueryInputSchema.parse(input);

    // Log audit event for SEC-04 compliance
    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId: userId || 'unknown',
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'calendar_events', name: 'omnii_calendar_query' },
      severity: 'info',
      metadata: {
        timeRange: parsed.timeRange,
        eventType: parsed.eventType,
        query: parsed.query,
        includeAttendees: parsed.includeAttendees,
      },
    });

    // Query temporal events from temporal context service
    let events = await queryTemporalEvents(client, userId, parsed.timeRange, {
      eventType: parsed.eventType,
      includeRelated: parsed.includeAttendees,
    });

    // If semantic query provided, filter events using vector similarity
    if (parsed.query && events.length > 0) {
      // Search for events matching the query
      const searchResults = await searchByText(client, parsed.query, {
        nodeTypes: ['Event'],
        limit: 50,
        minScore: 0.5,
      });

      // Create set of matching event IDs
      const matchingIds = new Set(searchResults.map((r) => r.id));

      // Filter temporal events to only include semantically matching ones
      events = events.filter((e) => matchingIds.has(e.id));
    }

    // Format response as MCP content
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              timeRange: parsed.timeRange,
              eventType: parsed.eventType,
              query: parsed.query,
              resultCount: events.length,
              events: events.map((e) => ({
                id: e.id,
                name: e.name,
                startTime: e.startTime,
                endTime: e.endTime,
                location: e.location,
                description: e.description,
                attendees: e.relatedContacts
                  ? e.relatedContacts.map((c) => ({
                      id: c.id,
                      name: c.name,
                      email: c.email,
                    }))
                  : undefined,
                relatedEntities: e.relatedEntities
                  ? e.relatedEntities.map((ent) => ({
                      id: ent.id,
                      name: ent.name,
                      type: ent.type,
                    }))
                  : undefined,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Invalid input',
              details: error.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            }),
          },
        ],
        isError: true,
      };
    }

    // Handle other errors
    const message = error instanceof Error ? error.message : 'Unknown error';

    // If temporal query error, include valid time_range options
    if (message.includes('Invalid time range')) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: message,
            }),
          },
        ],
        isError: true,
      };
    }

    // Log error audit event
    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId: userId || 'unknown',
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'calendar_events', name: 'omnii_calendar_query' },
      severity: 'error',
      metadata: {
        error: message,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: message,
          }),
        },
      ],
      isError: true,
    };
  }
}
