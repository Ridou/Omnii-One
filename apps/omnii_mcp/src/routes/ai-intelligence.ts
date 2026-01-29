/**
 * AI Intelligence Routes
 *
 * REST endpoints for AI features: briefings, suggestions, insights.
 */

import { Elysia, t } from 'elysia';
import { createClientForUser } from '../services/neo4j/http-client';
import {
  generateBriefing,
  getPendingSuggestions,
  approveSuggestion,
  rejectSuggestion,
  extractEntities,
} from '../services/ai';
import {
  detectPatterns,
  getRecentInsights,
  dismissInsight,
  getInsightStats,
} from '../services/analytics';

/**
 * AI Intelligence routes
 */
export const aiIntelligenceRoutes = new Elysia({ prefix: '/ai' })
  /**
   * Get meeting briefing
   *
   * GET /api/ai/briefing/:eventId?userId=xxx
   */
  .get(
    '/briefing/:eventId',
    async ({ params, query, set }) => {
      const { eventId } = params;
      const { userId } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const briefing = await generateBriefing(client, eventId);

        if (!briefing) {
          set.status = 404;
          return { error: 'Event not found' };
        }

        return { briefing };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to generate briefing',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        eventId: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        userId: t.String({ minLength: 1 }),
      }),
    }
  )

  /**
   * Get upcoming briefings
   *
   * GET /api/ai/briefings/upcoming?userId=xxx&limit=10
   */
  .get(
    '/briefings/upcoming',
    async ({ query, set }) => {
      const { userId, limit } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        // Get upcoming events
        const eventsQuery = `
          MATCH (e:Event)
          WHERE e.startTime > datetime()
          AND e.startTime < datetime() + duration({days: 7})
          AND e.attendeeCount >= 2
          RETURN e.id as eventId
          ORDER BY e.startTime
          LIMIT $limit
        `;

        const eventsResult = await client.query(eventsQuery, { limit: limit ?? 10 });
        const eventIds = eventsResult.records.map((r) => r.get('eventId') as string);

        // Generate briefings for each
        const briefings = [];
        for (const eventId of eventIds) {
          const briefing = await generateBriefing(client, eventId);
          if (briefing) {
            briefings.push(briefing);
          }
        }

        return {
          count: briefings.length,
          briefings,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to get upcoming briefings',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 1 }),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
      }),
    }
  )

  /**
   * Get pending relationship suggestions
   *
   * GET /api/ai/suggestions?userId=xxx&limit=20&minConfidence=0.5
   */
  .get(
    '/suggestions',
    async ({ query, set }) => {
      const { userId, limit, minConfidence } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const suggestions = await getPendingSuggestions(
          client,
          limit ?? 20,
          minConfidence ?? 0.5
        );

        return {
          count: suggestions.length,
          suggestions,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to get suggestions',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 1 }),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        minConfidence: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
      }),
    }
  )

  /**
   * Approve relationship suggestion
   *
   * POST /api/ai/suggestions/:id/approve
   */
  .post(
    '/suggestions/:id/approve',
    async ({ params, body, set }) => {
      const { id } = params;
      const { userId } = body;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const result = await approveSuggestion(client, id);

        if (!result.success) {
          set.status = 400;
          return { error: result.error };
        }

        return {
          success: true,
          relationshipId: result.relationshipId,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to approve suggestion',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      body: t.Object({
        userId: t.String({ minLength: 1 }),
      }),
    }
  )

  /**
   * Reject relationship suggestion
   *
   * POST /api/ai/suggestions/:id/reject
   */
  .post(
    '/suggestions/:id/reject',
    async ({ params, body, set }) => {
      const { id } = params;
      const { userId, feedback } = body;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        await rejectSuggestion(client, id, feedback);

        return { success: true };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to reject suggestion',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        feedback: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Get analytics insights
   *
   * GET /api/ai/insights?userId=xxx&category=productivity&limit=20
   */
  .get(
    '/insights',
    async ({ query, set }) => {
      const { userId, category, limit } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const insights = await getRecentInsights(client, limit ?? 20);

        // Filter by category if specified
        const filteredInsights = category
          ? insights.filter((i) => i.category === category)
          : insights;

        return {
          count: filteredInsights.length,
          insights: filteredInsights,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to get insights',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 1 }),
        category: t.Optional(
          t.Union([
            t.Literal('productivity'),
            t.Literal('collaboration'),
            t.Literal('patterns'),
            t.Literal('trends'),
          ])
        ),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )

  /**
   * Dismiss insight
   *
   * POST /api/ai/insights/:id/dismiss
   */
  .post(
    '/insights/:id/dismiss',
    async ({ params, body, set }) => {
      const { id } = params;
      const { userId } = body;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        await dismissInsight(client, id);

        return { success: true };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to dismiss insight',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      body: t.Object({
        userId: t.String({ minLength: 1 }),
      }),
    }
  )

  /**
   * Get analytics summary
   *
   * GET /api/ai/analytics/summary?userId=xxx&timeRange=week
   */
  .get(
    '/analytics/summary',
    async ({ query, set }) => {
      const { userId, timeRange } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const lookbackDays = timeRange === 'month' ? 30 : 7;

        // Get insights
        const insights = await getRecentInsights(client, 10, lookbackDays);

        // Get stats
        const stats = await getInsightStats(client);

        // Get basic metrics
        const metricsQuery = `
          MATCH (e:Event)
          WHERE e.startTime > datetime() - duration({days: $days})
          AND e.startTime < datetime()
          WITH count(e) as meetings
          OPTIONAL MATCH (t:Task)
          WHERE t.completedAt > datetime() - duration({days: $days})
          WITH meetings, count(t) as tasksCompleted
          OPTIONAL MATCH (em:Email)
          WHERE em.date > datetime() - duration({days: $days})
          WITH meetings, tasksCompleted, count(em) as emailsSent
          OPTIONAL MATCH (d:Document)
          WHERE d.createdAt > datetime() - duration({days: $days})
          RETURN meetings, tasksCompleted, emailsSent, count(d) as documentsCreated
        `;

        const metricsResult = await client.query(metricsQuery, { days: lookbackDays });
        const metrics = metricsResult.records[0];

        return {
          timeRange: {
            start: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          meetingsCount: (metrics?.get('meetings') as number) ?? 0,
          tasksCompleted: (metrics?.get('tasksCompleted') as number) ?? 0,
          emailsSent: (metrics?.get('emailsSent') as number) ?? 0,
          documentsCreated: (metrics?.get('documentsCreated') as number) ?? 0,
          insights,
          stats,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to get analytics summary',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 1 }),
        timeRange: t.Optional(t.Union([t.Literal('week'), t.Literal('month')])),
      }),
    }
  )

  /**
   * Extract entities from text
   *
   * POST /api/ai/extract-entities
   */
  .post(
    '/extract-entities',
    async ({ body, set }) => {
      const { userId, content, source } = body;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const result = await extractEntities(client, content, {
          source: source ?? 'manual',
        });

        return {
          entities: result.entities,
          processingTimeMs: result.processingTimeMs,
          autoAccepted: result.autoAccepted.length,
          needsReview: result.needsReview.length,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to extract entities',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        content: t.String({ minLength: 1, maxLength: 10000 }),
        source: t.Optional(
          t.Union([
            t.Literal('calendar'),
            t.Literal('contact'),
            t.Literal('email'),
            t.Literal('note'),
            t.Literal('file'),
            t.Literal('task'),
            t.Literal('manual'),
          ])
        ),
      }),
    }
  )

  /**
   * Run pattern detection (admin/manual trigger)
   *
   * POST /api/ai/detect-patterns
   */
  .post(
    '/detect-patterns',
    async ({ body, set }) => {
      const { userId, lookbackDays } = body;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const insights = await detectPatterns(client, {
          lookbackDays: lookbackDays ?? 30,
        });

        return {
          count: insights.length,
          insights,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to detect patterns',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        lookbackDays: t.Optional(t.Number({ minimum: 7, maximum: 90 })),
      }),
    }
  );
