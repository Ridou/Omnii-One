import { Elysia, t } from 'elysia';
import { productionBrainService } from '../config/neo4j.config';

// Define schemas
const TestMemoryBody = t.Object({
  userId: t.String(),
  message: t.String(),
  channel: t.String(),
  sourceIdentifier: t.String()
});

const ErrorResponse = t.Object({
  error: t.String(),
  message: t.Optional(t.String())
});

// Create routes
export default (app: Elysia) =>
  app.group('/brain', (app) =>
    app
      // Health check endpoint
      .get(
        '/health',
        async () => {
          try {
            const health = await productionBrainService.healthCheck();
            return health;
          } catch (error) {
            return { 
              status: 'unhealthy', 
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          response: {
            200: t.Object({
              status: t.Union([t.Literal('healthy'), t.Literal('degraded'), t.Literal('unhealthy')]),
              neo4j: t.Boolean(),
              redis: t.Boolean(),
              memory_bridge: t.Boolean(),
              metrics: t.Object({
                total_conversations: t.Number(),
                active_concepts: t.Number(),
                memory_strength_avg: t.Number()
              })
            }),
            503: ErrorResponse
          },
          detail: {
            summary: 'Brain service health check',
            description: 'Check the health status of the brain memory service',
            tags: ['Brain Memory']
          }
        }
      )
      
      // Memory metrics endpoint
      .get(
        '/metrics',
        async () => {
          try {
            const metrics = {
              timestamp: new Date().toISOString(),
              memory: {
                consolidation_enabled: process.env.MEMORY_BRIDGE_ENABLED === 'true',
                cache_ttl: process.env.MEMORY_CACHE_TTL,
                context_timeout: process.env.CONTEXT_RETRIEVAL_TIMEOUT
              },
              neo4j: {
                uri: process.env.NEO4J_URI?.split('@')[1],
                database: process.env.NEO4J_DATABASE,
                environment: process.env.NODE_ENV
              }
            };
            
            return metrics;
          } catch (error) {
            return { 
              error: 'Metrics collection failed',
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          response: {
            200: t.Object({
              timestamp: t.String(),
              memory: t.Object({
                consolidation_enabled: t.Boolean(),
                cache_ttl: t.Optional(t.String()),
                context_timeout: t.Optional(t.String())
              }),
              neo4j: t.Object({
                uri: t.Optional(t.String()),
                database: t.Optional(t.String()),
                environment: t.Optional(t.String())
              })
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Brain service metrics',
            description: 'Get brain memory service metrics and configuration',
            tags: ['Brain Memory']
          }
        }
      )
      
      // Memory context test endpoint (for development)
      .post(
        '/test-memory',
        async ({ body, error }) => {
          try {
            const { userId, message, channel, sourceIdentifier } = body;

            const memoryContext = await productionBrainService.getBrainMemoryContext(
              userId,
              message,
              channel as 'sms' | 'chat',
              sourceIdentifier
            );

            const timeWindowStats = memoryContext.working_memory.time_window_stats || {
              previous_week_count: 0,
              current_week_count: 0,
              next_week_count: 0,
              recently_modified_count: 0
            };

            return {
              success: true,
              memory_strength: memoryContext.consolidation_metadata.memory_strength,
              working_memory_count: memoryContext.working_memory.recent_messages.length,
              episodic_memory_count: memoryContext.episodic_memory.conversation_threads.length,
              semantic_concepts_count: memoryContext.semantic_memory.activated_concepts.length,
              time_window_stats: timeWindowStats
            };
          } catch (err) {
            return error(500, { 
              error: 'Memory test failed',
              message: err instanceof Error ? err.message : 'Unknown error'
            });
          }
        },
        {
          body: TestMemoryBody,
          response: {
            200: t.Object({
              success: t.Boolean(),
              memory_strength: t.Number(),
              working_memory_count: t.Number(),
              episodic_memory_count: t.Number(),
              semantic_concepts_count: t.Number(),
              time_window_stats: t.Object({
                previous_week_count: t.Number(),
                current_week_count: t.Number(),
                next_week_count: t.Number(),
                recently_modified_count: t.Number()
              })
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Test brain memory context',
            description: 'Test brain memory context retrieval for development purposes',
            tags: ['Brain Memory']
          }
        }
      )
  ); 