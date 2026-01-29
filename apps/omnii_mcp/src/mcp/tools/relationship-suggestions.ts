/**
 * MCP Tools: Relationship Suggestions
 *
 * Tools for viewing and managing inferred relationship suggestions.
 */

import { z } from 'zod';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import {
  getPendingSuggestions,
  approveSuggestion,
  formatForApproval,
} from '../../services/ai';
import type { MCPToolResponse } from './search-nodes';
import { logAuditEvent, AuditEventType } from '../../services/audit';

/**
 * Zod schema for get suggestions input
 */
export const GetRelationshipSuggestionsInputSchema = z.object({
  userId: z.string().min(1).describe('The user ID'),
  limit: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of suggestions to return'),
  minConfidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Minimum confidence threshold (0-1)'),
});

/**
 * MCP tool definition for get relationship suggestions
 */
export const getRelationshipSuggestionsToolDefinition = {
  name: 'omnii_get_relationship_suggestions',
  description:
    'Get pending relationship suggestions that were inferred from cross-source analysis ' +
    '(e.g., "John from this email also attended this meeting"). These require user approval ' +
    'before being added to the graph.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of suggestions to return (1-50, default: 10)',
      },
      minConfidence: {
        type: 'number',
        description: 'Minimum confidence threshold (0-1, default: 0.5)',
      },
    },
    required: ['userId'],
  },
};

/**
 * Handle get relationship suggestions tool invocation
 */
export async function handleGetRelationshipSuggestions(
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
            error: 'User ID is required',
          }),
        },
      ],
      isError: true,
    };
  }

  try {
    const parsed = GetRelationshipSuggestionsInputSchema.parse(input);

    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId,
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'relationship_suggestions', name: 'omnii_get_relationship_suggestions' },
      severity: 'info',
      metadata: {
        limit: parsed.limit,
        minConfidence: parsed.minConfidence,
      },
    });

    const suggestions = await getPendingSuggestions(
      client,
      parsed.limit ?? 10,
      parsed.minConfidence ?? 0.5
    );

    if (suggestions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'No pending relationship suggestions',
              suggestions: [],
            }),
          },
        ],
      };
    }

    // Format for AI/user review
    const formatted = suggestions.map((s) => {
      const f = formatForApproval(s);
      return {
        id: f.id,
        summary: f.summary,
        confidence: f.confidence,
        evidence: f.evidence,
        pattern: s.pattern.replace(/_/g, ' ').toLowerCase(),
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: formatted.length,
              suggestions: formatted,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
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

    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId: userId || 'unknown',
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'relationship_suggestions', name: 'omnii_get_relationship_suggestions' },
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

/**
 * Zod schema for approve relationship input
 */
export const ApproveRelationshipInputSchema = z.object({
  userId: z.string().min(1).describe('The user ID'),
  suggestionId: z.string().min(1).describe('The ID of the suggestion to approve'),
});

/**
 * MCP tool definition for approve relationship
 */
export const approveRelationshipToolDefinition = {
  name: 'omnii_approve_relationship',
  description:
    'Approve a relationship suggestion and create the relationship in the graph. ' +
    'Only use this after the user has confirmed they want to create the relationship.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID',
      },
      suggestionId: {
        type: 'string',
        description: 'The ID of the suggestion to approve',
      },
    },
    required: ['userId', 'suggestionId'],
  },
};

/**
 * Handle approve relationship tool invocation
 */
export async function handleApproveRelationship(
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
            error: 'User ID is required',
          }),
        },
      ],
      isError: true,
    };
  }

  try {
    const parsed = ApproveRelationshipInputSchema.parse(input);

    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId,
      actor: 'ai_assistant',
      action: 'create',
      resource: { type: 'relationship', name: 'omnii_approve_relationship' },
      severity: 'info',
      metadata: {
        suggestionId: parsed.suggestionId,
      },
    });

    const result = await approveSuggestion(client, parsed.suggestionId);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: result.error ?? 'Failed to approve suggestion',
            }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Relationship created successfully',
            relationshipId: result.relationshipId,
          }),
        },
      ],
    };
  } catch (error) {
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

    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId: userId || 'unknown',
      actor: 'ai_assistant',
      action: 'create',
      resource: { type: 'relationship', name: 'omnii_approve_relationship' },
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
