/**
 * MCP Tool: omnii_task_operations
 *
 * Query and search tasks with status filtering and temporal range.
 * Supports both list and search operations for task management.
 */

import { z } from 'zod';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import { localSearch } from '../../services/graphrag/local-search';
import { parseTemporalQuery } from '../../services/graphrag/temporal-context';
import type { MCPToolResponse } from './search-nodes';

/**
 * Zod schema for task_operations input validation.
 */
export const TaskOperationsInputSchema = z.object({
  operation: z.enum(['list', 'search']).describe('Operation to perform'),
  query: z
    .string()
    .optional()
    .describe('Search query (required for search operation)'),
  status: z
    .enum(['pending', 'completed', 'all'])
    .default('all')
    .describe('Filter by task status'),
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
    .describe('Filter by due date time range'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum tasks to return'),
});

/**
 * MCP tool definition for tools/list response.
 */
export const taskOperationsToolDefinition = {
  name: 'omnii_task_operations',
  description:
    'Query and search tasks. Supports filtering by status (pending/completed) and ' +
    'due date time range. Use list operation for browsing, search operation for ' +
    'semantic queries.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      operation: {
        type: 'string',
        enum: ['list', 'search'],
        description: 'Operation to perform',
      },
      query: {
        type: 'string',
        description: 'Search query (required for search operation)',
      },
      status: {
        type: 'string',
        enum: ['pending', 'completed', 'all'],
        description: 'Filter by task status (default: all)',
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
        description: 'Filter by due date time range',
      },
      limit: {
        type: 'number',
        description: 'Maximum tasks to return (1-100, default: 20)',
      },
    },
    required: ['operation'],
  },
};

/**
 * Handle task_operations tool invocation.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param input - Raw input from MCP tool call
 * @param userId - User ID for multi-tenant isolation
 * @returns MCP-compliant response with tasks
 */
export async function handleTaskOperations(
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
            error: 'User ID is required for task operations',
          }),
        },
      ],
      isError: true,
    };
  }
  try {
    // Validate input with Zod schema
    const parsed = TaskOperationsInputSchema.parse(input);

    // Validate that query is provided for search operation
    if (parsed.operation === 'search' && !parsed.query) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Search operation requires a query parameter',
            }),
          },
        ],
        isError: true,
      };
    }

    let tasks: Array<{
      id: string;
      name: string;
      status?: string;
      dueDate?: string;
      priority?: string;
      description?: string;
      properties: Record<string, unknown>;
      vectorScore?: string;
    }> = [];

    if (parsed.operation === 'search') {
      // Use local search for semantic task queries
      const searchResult = await localSearch(
        client,
        parsed.query!,
        userId,
        {
          nodeTypes: ['Entity'], // Tasks are stored as Entity nodes
          limit: parsed.limit,
          includeContext: false, // Tasks don't need graph context
          minScore: 0.6,
          timeRange: parsed.timeRange,
        }
      );

      // Filter to only task entities and apply status filter
      tasks = searchResult.results
        .filter((r) => {
          const entityType = r.entity.properties.entity_type as string | undefined;
          return entityType === 'task';
        })
        .filter((r) => {
          if (parsed.status === 'all') return true;
          const taskStatus = r.entity.properties.status as string | undefined;
          return taskStatus === parsed.status;
        })
        .map((r) => ({
          id: r.entity.id,
          name: r.entity.name,
          status: r.entity.properties.status as string | undefined,
          dueDate: r.entity.properties.due_date as string | undefined,
          priority: r.entity.properties.priority as string | undefined,
          description: r.entity.properties.description as string | undefined,
          properties: r.entity.properties,
          vectorScore: r.vectorScore.toFixed(3),
        }));
    } else {
      // List operation - direct Cypher query
      let cypher = `
        MATCH (n:Entity)
        WHERE n.user_id = $userId
          AND n.entity_type = 'task'
      `;

      // Add status filter if not 'all'
      if (parsed.status !== 'all') {
        cypher += ` AND n.status = $status`;
      }

      // Add temporal filter if time_range provided
      if (parsed.timeRange) {
        const temporal = parseTemporalQuery(parsed.timeRange);
        cypher += `
          AND n.due_date >= datetime() - duration('${temporal.duration}')
          AND n.due_date <= datetime()
        `;
      }

      cypher += `
        RETURN
          n.id AS id,
          n.name AS name,
          n.status AS status,
          n.due_date AS dueDate,
          n.priority AS priority,
          n.description AS description,
          properties(n) AS properties
        ORDER BY n.due_date ASC
        LIMIT $limit
      `;

      const result = await client.query(cypher, {
        userId,
        status: parsed.status,
        limit: parsed.limit,
      });

      if (result.data && result.data.values && result.data.values.length > 0) {
        const fields = result.data.fields;
        const idIndex = fields.indexOf('id');
        const nameIndex = fields.indexOf('name');
        const statusIndex = fields.indexOf('status');
        const dueDateIndex = fields.indexOf('dueDate');
        const priorityIndex = fields.indexOf('priority');
        const descriptionIndex = fields.indexOf('description');
        const propertiesIndex = fields.indexOf('properties');

        tasks = result.data.values.map((row) => ({
          id: row[idIndex] as string,
          name: row[nameIndex] as string,
          status: row[statusIndex] as string | undefined,
          dueDate: row[dueDateIndex] as string | undefined,
          priority: row[priorityIndex] as string | undefined,
          description: row[descriptionIndex] as string | undefined,
          properties: row[propertiesIndex] as Record<string, unknown>,
        }));
      }
    }

    // Format response as MCP content
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              operation: parsed.operation,
              query: parsed.query,
              status: parsed.status,
              timeRange: parsed.timeRange,
              resultCount: tasks.length,
              tasks,
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

    // Handle temporal query errors
    const message = error instanceof Error ? error.message : 'Unknown error';
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

    // Handle other errors
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
