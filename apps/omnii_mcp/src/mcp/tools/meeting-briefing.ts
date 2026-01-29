/**
 * MCP Tool: omnii_get_meeting_briefing
 *
 * Get comprehensive meeting briefing with attendee context,
 * related documents, previous meetings, and AI-generated summary.
 */

import { z } from 'zod';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import { generateBriefing } from '../../services/ai';
import type { MCPToolResponse } from './search-nodes';
import { logAuditEvent, AuditEventType } from '../../services/audit';

/**
 * Zod schema for meeting briefing input validation
 */
export const MeetingBriefingInputSchema = z.object({
  eventId: z
    .string()
    .min(1)
    .describe('The event ID to get briefing for, or "next" for the next upcoming meeting'),
  userId: z.string().min(1).describe('The user ID'),
});

/**
 * MCP tool definition for tools/list response
 */
export const meetingBriefingToolDefinition = {
  name: 'omnii_get_meeting_briefing',
  description:
    'Get a comprehensive briefing for an upcoming meeting, including attendee context, ' +
    'related documents, previous meetings, and AI-generated preparation summary. ' +
    'Use "next" for eventId to get the next upcoming meeting.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      eventId: {
        type: 'string',
        description: 'The event ID to get briefing for, or "next" for the next upcoming meeting',
      },
      userId: {
        type: 'string',
        description: 'The user ID',
      },
    },
    required: ['eventId', 'userId'],
  },
};

/**
 * Handle meeting briefing tool invocation
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param input - Raw input from MCP tool call
 * @param userId - User ID for multi-tenant isolation
 * @returns MCP-compliant response with meeting briefing
 */
export async function handleMeetingBriefing(
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
            error: 'User ID is required for meeting briefing',
          }),
        },
      ],
      isError: true,
    };
  }

  try {
    // Validate input with Zod schema
    const parsed = MeetingBriefingInputSchema.parse(input);

    // Log audit event for SEC-04 compliance
    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId,
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'meeting_briefing', name: 'omnii_get_meeting_briefing' },
      severity: 'info',
      metadata: {
        eventId: parsed.eventId,
      },
    });

    let targetEventId = parsed.eventId;

    // Handle "next" keyword
    if (parsed.eventId.toLowerCase() === 'next') {
      const nextQuery = `
        MATCH (e:Event)
        WHERE e.startTime > datetime()
        AND e.attendeeCount >= 2
        RETURN e.id as eventId
        ORDER BY e.startTime
        LIMIT 1
      `;
      const nextResult = await client.query(nextQuery, {});
      if (nextResult.records.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'No upcoming meetings found',
              }),
            },
          ],
        };
      }
      targetEventId = nextResult.records[0].get('eventId') as string;
    }

    const briefing = await generateBriefing(client, targetEventId);

    if (!briefing) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Event not found or briefing could not be generated',
            }),
          },
        ],
        isError: true,
      };
    }

    // Format for AI consumption
    const response = {
      meeting: {
        title: briefing.title,
        startTime: briefing.startTime,
        duration: `${briefing.duration} minutes`,
      },
      attendees: briefing.attendees.map((a) => ({
        name: a.name,
        role: a.role,
        company: a.company,
        relationshipStrength:
          a.relationshipStrength > 0.7
            ? 'strong'
            : a.relationshipStrength > 0.3
              ? 'moderate'
              : 'new',
        talkingPoints: a.talkingPoints,
      })),
      relatedDocuments: briefing.relatedDocuments.map((d) => ({
        title: d.title,
        type: d.type,
        relevance: d.relevanceScore > 0.7 ? 'high' : 'medium',
        keyPoints: d.keyPoints,
      })),
      previousMeetings: briefing.previousMeetings.map((m) => ({
        title: m.title,
        date: m.date,
        attendeeOverlap: m.attendeeOverlap,
      })),
      suggestedActions: briefing.suggestedActions.map((a) => ({
        action: a.description,
        priority: a.priority,
      })),
      aiSummary: briefing.aiSummary,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
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

    // Log error audit event
    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId: userId || 'unknown',
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'meeting_briefing', name: 'omnii_get_meeting_briefing' },
      severity: 'error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    };
  }
}
