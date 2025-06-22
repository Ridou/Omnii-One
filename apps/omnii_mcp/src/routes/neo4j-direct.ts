import { Elysia, t } from 'elysia';
import { neo4jDirectService } from '../services/neo4j';

// Simple request/response schemas for direct Neo4j access
const DirectSearchQuery = t.Object({
  user_id: t.String(),
  q: t.String(),
  limit: t.Optional(t.Numeric())
});

const DirectListQuery = t.Object({
  user_id: t.String(),
  limit: t.Optional(t.Numeric()),
  offset: t.Optional(t.Numeric())
});

const DirectConceptQuery = t.Object({
  user_id: t.String(),
  concept_id: t.String()
});

// ✅ DIRECT Neo4j routes - bypass existing API structure
export default (app: Elysia) =>
  app.group('/neo4j-direct', (app) =>
    app
      // Health check for direct service
      .get(
        '/health',
        async ({ set }) => {
          try {
            const health = await neo4jDirectService.healthCheck();
            console.log(`[Neo4j-Direct] Health check: ${health.connected ? 'CONNECTED' : 'DISCONNECTED'} - ${health.totalConcepts} concepts`);
            return {
              status: 'ok',
              service: 'neo4j-direct',
              ...health
            };
          } catch (error) {
            console.error('[Neo4j-Direct] Health check failed:', error);
            set.status = 500;
            return { 
              status: 'error',
              service: 'neo4j-direct',
              connected: false,
              error: error instanceof Error ? error.message : 'Health check failed'
            };
          }
        },
        {
          detail: {
            summary: 'Direct Neo4j health check',
            description: 'Check direct Neo4j connection status and get concept count',
            tags: ['Neo4j-Direct']
          }
        }
      )

      // Search concepts directly - no API route overhead
      .get(
        '/search',
        async ({ query, set }) => {
          try {
            console.log(`[Neo4j-Direct] Search request: "${query.q}" for user: ${query.user_id}`);
            
            const result = await neo4jDirectService.searchConcepts(
              query.user_id,
              query.q,
              query.limit ? Number(query.limit) : 20
            );
            
            console.log(`[Neo4j-Direct] Search result: ${result.concepts.length} concepts found in ${result.executionTime}ms`);
            
            return {
              success: true,
              data: result.concepts,
              meta: {
                totalFound: result.totalFound,
                searchTerm: result.searchTerm,
                executionTime: result.executionTime,
                service: 'neo4j-direct'
              }
            };
          } catch (error) {
            console.error('[Neo4j-Direct] Search failed:', error);
            set.status = 500;
            return { 
              success: false,
              error: 'Search failed',
              details: error instanceof Error ? error.message : 'Unknown error',
              service: 'neo4j-direct'
            };
          }
        },
        {
          query: DirectSearchQuery,
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(t.Any()),
              meta: t.Object({
                totalFound: t.Number(),
                searchTerm: t.String(),
                executionTime: t.Number(),
                service: t.String()
              })
            }),
            500: t.Object({
              success: t.Boolean(),
              error: t.String(),
              details: t.Optional(t.String()),
              service: t.String()
            })
          },
          detail: {
            summary: 'Search concepts directly',
            description: 'Direct search through Neo4j concepts without API route overhead',
            tags: ['Neo4j-Direct']
          }
        }
      )

      // List concepts directly - no API route overhead
      .get(
        '/list',
        async ({ query, set }) => {
          try {
            console.log(`[Neo4j-Direct] List request: ${query.limit || 100} concepts for user: ${query.user_id}`);
            
            const result = await neo4jDirectService.listConcepts(
              query.user_id,
              query.limit ? Number(query.limit) : 100,
              query.offset ? Number(query.offset) : 0
            );
            
            console.log(`[Neo4j-Direct] List result: ${result.concepts.length} concepts found in ${result.executionTime}ms`);
            
            return {
              success: true,
              data: result.concepts,
              meta: {
                totalFound: result.totalFound,
                executionTime: result.executionTime,
                service: 'neo4j-direct',
                limit: query.limit ? Number(query.limit) : 100,
                offset: query.offset ? Number(query.offset) : 0
              }
            };
          } catch (error) {
            console.error('[Neo4j-Direct] List failed:', error);
            set.status = 500;
            return { 
              success: false,
              error: 'List failed',
              details: error instanceof Error ? error.message : 'Unknown error',
              service: 'neo4j-direct'
            };
          }
        },
        {
          query: DirectListQuery,
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(t.Any()),
              meta: t.Object({
                totalFound: t.Number(),
                executionTime: t.Number(),
                service: t.String(),
                limit: t.Number(),
                offset: t.Number()
              })
            }),
            500: t.Object({
              success: t.Boolean(),
              error: t.String(),
              details: t.Optional(t.String()),
              service: t.String()
            })
          },
          detail: {
            summary: 'List concepts directly',
            description: 'Direct list of Neo4j concepts without API route overhead',
            tags: ['Neo4j-Direct']
          }
        }
      )

      // Get concept by ID directly
      .get(
        '/concept/:concept_id',
        async ({ params, query, set }) => {
          try {
            console.log(`[Neo4j-Direct] Get concept: ${params.concept_id} for user: ${query.user_id}`);
            
            const concept = await neo4jDirectService.getConceptById(
              params.concept_id,
              query.user_id
            );
            
            if (!concept) {
              set.status = 404;
              return {
                success: false,
                error: 'Concept not found',
                service: 'neo4j-direct'
              };
            }
            
            console.log(`[Neo4j-Direct] Found concept: ${concept.properties.name || concept.id}`);
            
            return {
              success: true,
              data: concept,
              service: 'neo4j-direct'
            };
          } catch (error) {
            console.error('[Neo4j-Direct] Get concept failed:', error);
            set.status = 500;
            return { 
              success: false,
              error: 'Get concept failed',
              details: error instanceof Error ? error.message : 'Unknown error',
              service: 'neo4j-direct'
            };
          }
        },
        {
          query: t.Object({
            user_id: t.String()
          }),
          params: t.Object({
            concept_id: t.String()
          }),
          detail: {
            summary: 'Get concept by ID directly',
            description: 'Get a specific concept directly from Neo4j',
            tags: ['Neo4j-Direct']
          }
        }
      )

      // Get concept count for user
      .get(
        '/count',
        async ({ query, set }) => {
          try {
            console.log(`[Neo4j-Direct] Count request for user: ${query.user_id}`);
            
            const count = await neo4jDirectService.getConceptCount(query.user_id);
            
            console.log(`[Neo4j-Direct] User has ${count} concepts`);
            
            return {
              success: true,
              data: {
                count,
                user_id: query.user_id
              },
              service: 'neo4j-direct'
            };
          } catch (error) {
            console.error('[Neo4j-Direct] Count failed:', error);
            set.status = 500;
            return { 
              success: false,
              error: 'Count failed',
              details: error instanceof Error ? error.message : 'Unknown error',
              service: 'neo4j-direct'
            };
          }
        },
        {
          query: t.Object({
            user_id: t.String()
          }),
          detail: {
            summary: 'Get concept count directly',
            description: 'Get total concept count for user directly from Neo4j',
            tags: ['Neo4j-Direct']
          }
        }
      )
  ); 