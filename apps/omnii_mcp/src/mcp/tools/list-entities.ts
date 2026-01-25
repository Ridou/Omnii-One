/**
 * MCP Tool: omnii_graph_list_entities
 *
 * Lists nodes in the knowledge graph by type with pagination support.
 * Useful for browsing available data or getting an overview of stored information.
 */

import { z } from 'zod';
import { getNodesByLabel, type NodeLabel } from '../../graph';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import type { MCPToolResponse } from './search-nodes';

/**
 * Zod schema for list_entities input validation.
 */
export const ListEntitiesInputSchema = z.object({
  nodeType: z
    .enum(['Concept', 'Entity', 'Event', 'Contact'])
    .describe('Type of nodes to list'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of results'),
  offset: z.number().int().min(0).default(0).describe('Pagination offset'),
});

/**
 * MCP tool definition for tools/list response.
 */
export const listEntitiesToolDefinition = {
  name: 'omnii_graph_list_entities',
  description:
    'List nodes in the knowledge graph by type. ' +
    'Supports pagination for browsing large collections of data.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      nodeType: {
        type: 'string',
        enum: ['Concept', 'Entity', 'Event', 'Contact'],
        description: 'Type of nodes to list',
      },
      limit: {
        type: 'number',
        description: 'Max results (1-100, default 20)',
      },
      offset: {
        type: 'number',
        description: 'Pagination offset (default 0)',
      },
    },
    required: ['nodeType'],
  },
};

/**
 * Handle list_entities tool invocation.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param input - Raw input from MCP tool call
 * @returns MCP-compliant response with paginated node list
 */
export async function handleListEntities(
  client: Neo4jHTTPClient,
  input: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input with Zod schema
    const parsed = ListEntitiesInputSchema.parse(input);

    // Fetch nodes (get extra to handle offset)
    const fetchLimit = parsed.limit + parsed.offset;
    const results = await getNodesByLabel(client, parsed.nodeType as NodeLabel, fetchLimit);

    // Apply pagination
    const paged = results.slice(parsed.offset, parsed.offset + parsed.limit);

    // Format response as MCP content
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              nodeType: parsed.nodeType,
              total: results.length,
              returned: paged.length,
              offset: parsed.offset,
              hasMore: results.length > parsed.offset + parsed.limit,
              nodes: paged.map((n) => ({
                id: n.id,
                name: n.name,
                createdAt: n.createdAt,
                updatedAt: n.updatedAt,
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
