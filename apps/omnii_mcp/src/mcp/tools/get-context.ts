/**
 * MCP Tool: omnii_graph_get_context
 *
 * Retrieves detailed context about a specific node including
 * its properties and related nodes through graph traversal.
 */

import { z } from 'zod';
import { getNode, findRelatedNodes } from '../../graph';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import type { MCPToolResponse } from './search-nodes';

/**
 * Zod schema for get_context input validation.
 */
export const GetContextInputSchema = z.object({
  nodeId: z.string().uuid().describe('The unique ID (UUID) of the node'),
  includeRelated: z
    .boolean()
    .default(true)
    .describe('Include related nodes via graph traversal'),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(3)
    .default(1)
    .describe('Maximum traversal depth for related nodes'),
});

/**
 * MCP tool definition for tools/list response.
 */
export const getContextToolDefinition = {
  name: 'omnii_graph_get_context',
  description:
    'Get detailed context about a specific node including related nodes. ' +
    'Use this to explore connections and understand relationships in the knowledge graph.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      nodeId: {
        type: 'string',
        description: 'The unique ID (UUID) of the node',
      },
      includeRelated: {
        type: 'boolean',
        description: 'Include related nodes (default true)',
      },
      maxDepth: {
        type: 'number',
        description: 'Max traversal depth (1-3, default 1)',
      },
    },
    required: ['nodeId'],
  },
};

/**
 * Handle get_context tool invocation.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param input - Raw input from MCP tool call
 * @returns MCP-compliant response with node context
 */
export async function handleGetContext(
  client: Neo4jHTTPClient,
  input: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input with Zod schema
    const parsed = GetContextInputSchema.parse(input);

    // Fetch the node
    const node = await getNode(client, parsed.nodeId);

    if (!node) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Node not found: ${parsed.nodeId}`,
            }),
          },
        ],
        isError: true,
      };
    }

    // Optionally fetch related nodes
    let related: Awaited<ReturnType<typeof findRelatedNodes>> = [];
    if (parsed.includeRelated) {
      related = await findRelatedNodes(client, parsed.nodeId, {
        maxDepth: parsed.maxDepth,
        limit: 20,
      });
    }

    // Format response as MCP content
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              node: {
                id: node.id,
                name: node.name,
                labels: node.labels,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                // Include other properties except embedding (too large)
                properties: Object.fromEntries(
                  Object.entries(node).filter(
                    ([key]) =>
                      !['id', 'name', 'labels', 'createdAt', 'updatedAt', 'embedding'].includes(key)
                  )
                ),
              },
              relatedCount: related.length,
              related: related.map((r) => ({
                id: r.id,
                name: r.name,
                labels: r.labels,
                relationship: {
                  types: r.relationshipPath.types,
                  depth: r.relationshipPath.depth,
                },
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
