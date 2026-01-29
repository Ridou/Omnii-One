/**
 * MCP Tools: Analytics Insights
 *
 * Tools for accessing analytics patterns and actionable insights.
 */

import { z } from 'zod';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import { getRecentInsights, getInsightStats } from '../../services/analytics';
import type { MCPToolResponse } from './search-nodes';
import { logAuditEvent, AuditEventType } from '../../services/audit';

/**
 * Zod schema for get insights input
 */
export const GetInsightsInputSchema = z.object({
  userId: z.string().min(1).describe('The user ID'),
  category: z
    .enum(['productivity', 'collaboration', 'patterns', 'trends'])
    .optional()
    .describe('Filter insights by category'),
  limit: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(5)
    .describe('Maximum number of insights to return'),
});

/**
 * MCP tool definition for get insights
 */
export const getInsightsToolDefinition = {
  name: 'omnii_get_insights',
  description:
    'Get actionable analytics insights about user productivity, collaboration patterns, ' +
    'and trends. These are data-driven observations with recommendations.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID',
      },
      category: {
        type: 'string',
        enum: ['productivity', 'collaboration', 'patterns', 'trends'],
        description: 'Filter insights by category',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of insights to return (1-20, default: 5)',
      },
    },
    required: ['userId'],
  },
};

/**
 * Handle get insights tool invocation
 */
export async function handleGetInsights(
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
    const parsed = GetInsightsInputSchema.parse(input);

    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId,
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'insights', name: 'omnii_get_insights' },
      severity: 'info',
      metadata: {
        category: parsed.category,
        limit: parsed.limit,
      },
    });

    const insights = await getRecentInsights(client, (parsed.limit ?? 5) * 2);

    // Filter by category if specified
    const filtered = parsed.category
      ? insights.filter((i) => i.category === parsed.category)
      : insights;

    const limited = filtered.slice(0, parsed.limit ?? 5);

    if (limited.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'No insights available yet. Insights are generated as you use the system.',
              insights: [],
            }),
          },
        ],
      };
    }

    // Format for AI consumption
    const formatted = limited.map((i) => ({
      id: i.id,
      category: i.category,
      insight: i.description,
      confidence:
        i.confidence > 0.8 ? 'high' : i.confidence > 0.6 ? 'medium' : 'moderate',
      recommendation: i.recommendation,
      detectedAt: i.detectedAt,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: formatted.length,
              insights: formatted,
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
      resource: { type: 'insights', name: 'omnii_get_insights' },
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
 * Zod schema for get analytics summary input
 */
export const GetAnalyticsSummaryInputSchema = z.object({
  userId: z.string().min(1).describe('The user ID'),
  timeRange: z
    .enum(['week', 'month'])
    .optional()
    .default('week')
    .describe('Time range for the summary'),
});

/**
 * MCP tool definition for get analytics summary
 */
export const getAnalyticsSummaryToolDefinition = {
  name: 'omnii_get_analytics_summary',
  description:
    'Get a summary of user activity and productivity metrics for a time period, ' +
    'including meetings, tasks completed, and top insights.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID',
      },
      timeRange: {
        type: 'string',
        enum: ['week', 'month'],
        description: 'Time range for the summary (default: week)',
      },
    },
    required: ['userId'],
  },
};

/**
 * Handle get analytics summary tool invocation
 */
export async function handleGetAnalyticsSummary(
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
    const parsed = GetAnalyticsSummaryInputSchema.parse(input);

    logAuditEvent({
      event: AuditEventType.GRAPH_DATA_ACCESSED,
      userId,
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'analytics_summary', name: 'omnii_get_analytics_summary' },
      severity: 'info',
      metadata: {
        timeRange: parsed.timeRange,
      },
    });

    const lookbackDays = parsed.timeRange === 'month' ? 30 : 7;

    // Get activity metrics
    const metricsQuery = `
      MATCH (e:Event)
      WHERE e.startTime > datetime() - duration({days: $days})
      AND e.startTime < datetime()
      WITH count(e) as meetings
      OPTIONAL MATCH (t:Task)
      WHERE t.completedAt > datetime() - duration({days: $days})
      WITH meetings, count(t) as tasksCompleted
      OPTIONAL MATCH (n:Note)
      WHERE n.createdAt > datetime() - duration({days: $days})
      WITH meetings, tasksCompleted, count(n) as notesCreated
      OPTIONAL MATCH (d:Document)
      WHERE d.createdAt > datetime() - duration({days: $days})
      RETURN meetings, tasksCompleted, notesCreated, count(d) as documentsUploaded
    `;

    const metricsResult = await client.query(metricsQuery, { days: lookbackDays });

    // Get top insights
    const insights = await getRecentInsights(client, 3, lookbackDays);

    // Get stats
    const stats = await getInsightStats(client);

    // Parse metrics from result
    let meetings = 0;
    let tasksCompleted = 0;
    let notesCreated = 0;
    let documentsUploaded = 0;

    if (metricsResult.records.length > 0) {
      const metrics = metricsResult.records[0];
      meetings = (metrics.get('meetings') as number) ?? 0;
      tasksCompleted = (metrics.get('tasksCompleted') as number) ?? 0;
      notesCreated = (metrics.get('notesCreated') as number) ?? 0;
      documentsUploaded = (metrics.get('documentsUploaded') as number) ?? 0;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              timeRange: `Last ${parsed.timeRange ?? 'week'}`,
              activity: {
                meetings,
                tasksCompleted,
                notesCreated,
                documentsUploaded,
              },
              topInsights: insights.map((i) => ({
                insight: i.description,
                recommendation: i.recommendation,
              })),
              insightStats: {
                totalInsights: stats.total,
                activeInsights: stats.active,
              },
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
      resource: { type: 'analytics_summary', name: 'omnii_get_analytics_summary' },
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
