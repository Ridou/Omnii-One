/**
 * MCP Tool: omnii_extract_relationships
 *
 * Extracts entities and relationships from unstructured text.
 * Uses LLM-based extraction to identify people, organizations, events, concepts,
 * and creates graph nodes with specific relationship types.
 */

import { z } from 'zod';
import { discoverRelationships } from '../../services/graphrag/relationship-discovery';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import { logAuditEvent, AuditEventType } from '../../services/audit';

/**
 * Zod schema for extract_relationships input validation.
 */
export const ExtractRelationshipsInputSchema = z.object({
  text: z
    .string()
    .min(10)
    .max(10000)
    .describe('Text to extract entities and relationships from (10-10000 chars)'),
  create_missing_nodes: z
    .boolean()
    .default(true)
    .describe('Create new nodes for unmatched entities'),
  min_confidence: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Minimum confidence threshold for extracted entities (0-1)'),
  source_context: z
    .string()
    .optional()
    .describe('Source identifier for provenance (e.g., "email:abc123")'),
});

/**
 * MCP tool definition for tools/list response.
 */
export const ExtractRelationshipsToolDefinition = {
  name: 'omnii_extract_relationships',
  description:
    'Extract entities and relationships from text. Identifies people, organizations, events, and concepts, then creates or links graph nodes. Use when processing emails, meeting notes, or other unstructured text to build the knowledge graph.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      text: {
        type: 'string',
        description: 'Text to analyze for entities and relationships',
      },
      create_missing_nodes: {
        type: 'boolean',
        default: true,
        description: 'Create new nodes for unmatched entities',
      },
      min_confidence: {
        type: 'number',
        default: 0.5,
        description: 'Minimum confidence (0-1)',
      },
      source_context: {
        type: 'string',
        description: 'Source identifier for provenance',
      },
    },
    required: ['text'],
  },
};

/**
 * MCP response type for tool handlers.
 */
export interface MCPToolResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Handle extract_relationships tool invocation.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param input - Raw input from MCP tool call
 * @param userId - User ID from auth context (optional for backward compatibility)
 * @returns MCP-compliant response with extraction results
 */
export async function handleExtractRelationships(
  client: Neo4jHTTPClient,
  input: unknown,
  userId?: string
): Promise<MCPToolResponse> {
  try {
    // userId is required for this tool
    if (!userId) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'User ID is required for relationship extraction',
            }),
          },
        ],
        isError: true,
      };
    }

    // Validate input with Zod schema
    const parsed = ExtractRelationshipsInputSchema.parse(input);

    // Log audit event for SEC-04 compliance
    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId: userId || 'unknown',
      actor: 'ai_assistant',
      action: 'create',
      resource: { type: 'graph_relationships', name: 'omnii_extract_relationships' },
      severity: 'info',
      metadata: {
        textLength: parsed.text.length,
        createMissingNodes: parsed.create_missing_nodes,
        minConfidence: parsed.min_confidence,
        sourceContext: parsed.source_context,
      },
    });

    // Discover relationships from text
    const result = await discoverRelationships(client, userId, parsed.text, {
      createMissingNodes: parsed.create_missing_nodes,
      minConfidence: parsed.min_confidence,
      sourceContext: parsed.source_context,
    });

    // Format extraction results for AI
    const formattedEntities = result.entities.map((entity) => ({
      name: entity.name,
      type: entity.type,
      confidence: entity.confidence.toFixed(2),
      properties: entity.properties,
    }));

    const formattedRelationships = result.relationships.map((rel) => ({
      from: rel.from,
      type: rel.type,
      to: rel.to,
      properties: rel.properties,
    }));

    // Return MCP response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              summary: {
                entitiesFound: result.entities.length,
                relationshipsFound: result.relationships.length,
                nodesCreated: result.nodesCreated,
                nodesLinked: result.nodesLinked,
                relationshipsCreated: result.relationshipsCreated,
              },
              entities: formattedEntities,
              relationships: formattedRelationships,
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
    // Log error audit event
    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId: userId || 'unknown',
      actor: 'ai_assistant',
      action: 'create',
      resource: { type: 'graph_relationships', name: 'omnii_extract_relationships' },
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
