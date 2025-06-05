import { Elysia, t } from 'elysia';
import { neo4jService } from '../services/neo4j-service';

// Define schemas
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

// Create routes
export default (app: Elysia) =>
  app.group('/neo4j', (app) =>
    app
      // Search similar concepts
      .get(
        '/concepts/search',
        async ({ query }) => {
          const results = await neo4jService.searchSimilarConcepts(
            query.user_id,
            query.q,
            query.limit ? Number(query.limit) : 5
          );
          return { data: results };
        },
        {
          query: SearchQuery,
          response: {
            200: t.Object({
              data: t.Array(t.Any())
            }),
            400: ErrorResponse,
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
        async ({ query }) => {
          const concepts = await neo4jService.listNodes(
            query.user_id,
            'Concept',
            query.limit ? Number(query.limit) : 100,
            query.filter
          );
          return { data: concepts };
        },
        {
          query: ListQuery,
          response: {
            200: t.Object({
              data: t.Array(t.Any())
            }),
            400: ErrorResponse,
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
