import { Elysia, t } from 'elysia';
import { neo4jServiceClient } from '../services/neo4j-client';

// Define schemas (simple, no authentication)
const SearchQuery = t.Object({
  user_id: t.String(),
  q: t.String(),
  limit: t.Optional(t.Numeric())
});

const ListQuery = t.Object({
  user_id: t.String(),
  limit: t.Optional(t.Numeric()),
  filter: t.Optional(t.String())
});

const ErrorResponse = t.Object({
  error: t.String(),
  details: t.Optional(t.String())
});

// ✅ FIXED: Simple routes without authentication (restored to working state)
export default (app: Elysia) =>
  app.group('/neo4j', (app) =>
    app
      // Search similar concepts
      .get(
        '/concepts/search',
        async ({ query, set }) => {
          try {
            const results = await neo4jServiceClient.searchSimilarConcepts(
              query.user_id,
              query.q,
              query.limit ? Number(query.limit) : 5
            );
            return { data: results };
          } catch (error) {
            console.error('[Neo4j] Error searching concepts:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          query: SearchQuery,
          response: {
            200: t.Object({
              data: t.Array(t.Any())
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Search similar concepts',
            description: 'Search for concepts similar to the provided query',
            tags: ['Neo4j']
          }
        }
      )
      
      // List concepts
      .get(
        '/concepts',
        async ({ query, set }) => {
          try {
            const concepts = await neo4jServiceClient.listNodes(
              query.user_id,
              'Concept',
              query.limit ? Number(query.limit) : 100,
              query.filter
            );
            return { data: concepts };
          } catch (error) {
            console.error('[Neo4j] Error listing concepts:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          query: ListQuery,
          response: {
            200: t.Object({
              data: t.Array(t.Any())
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'List concepts',
            description: 'List all concepts with optional filtering',
            tags: ['Neo4j']
          }
        }
      )
      
      // Add more Neo4j routes here...
  );
