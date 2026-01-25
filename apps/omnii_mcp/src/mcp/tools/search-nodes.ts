/**
 * MCP Tool: omnii_graph_search_nodes
 *
 * Performs semantic similarity search on the user's personal knowledge graph.
 * Uses vector embeddings to find nodes matching natural language queries.
 */

import { z } from 'zod';
import { searchByText, type NodeLabel } from '../../graph';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import { parseTemporalQuery } from '../../services/graphrag/temporal-context';

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
    .optional()
    .describe(
      'Filter results by created_at/start_time within relative time range'
    ),
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
        description: 'Filter results by time range (optional)',
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
    let results = await searchByText(client, parsed.query, {
      limit: parsed.limit,
      nodeTypes: parsed.nodeTypes?.map((t) => t as NodeLabel),
      minScore: parsed.minScore,
    });

    // Apply temporal filtering if time_range is provided
    if (parsed.timeRange) {
      try {
        const temporal = parseTemporalQuery(parsed.timeRange);

        // Extract result IDs for temporal filtering
        const resultIds = results.map((r) => r.id);

        if (resultIds.length > 0) {
          // Query to filter nodes by temporal range
          const cypher = `
            UNWIND $ids AS nodeId
            MATCH (n {id: nodeId})

            WITH n, datetime() AS now, datetime() - duration($duration) AS startTime

            // Check temporal fields (created_at for most nodes, start_time for Events)
            WHERE (n.created_at >= startTime AND n.created_at <= now)
               OR (n.start_time >= startTime AND n.start_time <= now)

            RETURN n.id AS id
          `;

          const filterResult = await client.query(cypher, {
            ids: resultIds,
            duration: temporal.duration,
          });

          if (filterResult.data && filterResult.data.values && filterResult.data.values.length > 0) {
            // Create set of filtered IDs
            const filteredIds = new Set(
              filterResult.data.values.map(
                (row) => row[filterResult.data.fields.indexOf('id')] as string
              )
            );

            // Filter results to only include temporally matched nodes
            results = results.filter((r) => filteredIds.has(r.id));
          } else {
            // No results match the temporal filter
            results = [];
          }
        }
      } catch (temporalError) {
        // If temporal parsing fails, return error with valid options
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error:
                  temporalError instanceof Error
                    ? temporalError.message
                    : 'Temporal filter error',
              }),
            },
          ],
          isError: true,
        };
      }
    }

    // Format response as MCP content
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query: parsed.query,
              timeRange: parsed.timeRange,
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
