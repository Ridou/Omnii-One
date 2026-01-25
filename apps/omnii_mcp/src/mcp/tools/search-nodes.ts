/**
 * MCP Tool: omnii_graph_search_nodes
 *
 * Performs semantic similarity search on the user's personal knowledge graph.
 * Uses vector embeddings to find nodes matching natural language queries.
 */

import { z } from 'zod';
import { searchByText, type NodeLabel } from '../../graph';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';

/**
 * Zod schema for search_nodes input validation.
 */
export const SearchNodesInputSchema = z.object({
  query: z.string().min(1).max(500).describe('Natural language search query'),
  limit: z.number().int().min(1).max(50).default(10).describe('Max results'),
  nodeTypes: z
    .array(z.enum(['Concept', 'Entity', 'Event', 'Contact']))
    .optional()
    .describe('Filter results to specific node types'),
  minScore: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Minimum similarity score threshold'),
});

/**
 * MCP tool definition for tools/list response.
 */
export const searchNodesToolDefinition = {
  name: 'omnii_graph_search_nodes',
  description:
    "Search the user's personal knowledge graph using semantic similarity. " +
    'Returns nodes that match the natural language query, ranked by relevance.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query',
      },
      limit: {
        type: 'number',
        description: 'Max results (1-50, default 10)',
      },
      nodeTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['Concept', 'Entity', 'Event', 'Contact'],
        },
        description: 'Filter results to specific node types',
      },
      minScore: {
        type: 'number',
        description: 'Min similarity score (0-1, default 0.7)',
      },
    },
    required: ['query'],
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
 * Handle search_nodes tool invocation.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param input - Raw input from MCP tool call
 * @returns MCP-compliant response with search results
 */
export async function handleSearchNodes(
  client: Neo4jHTTPClient,
  input: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input with Zod schema
    const parsed = SearchNodesInputSchema.parse(input);

    // Perform semantic search
    const results = await searchByText(client, parsed.query, {
      limit: parsed.limit,
      nodeTypes: parsed.nodeTypes?.map((t) => t as NodeLabel),
      minScore: parsed.minScore,
    });

    // Format response as MCP content
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query: parsed.query,
              resultCount: results.length,
              results: results.map((r) => ({
                id: r.id,
                name: r.name,
                type: r.labels[0],
                score: r.score.toFixed(3),
                properties: r.properties,
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
