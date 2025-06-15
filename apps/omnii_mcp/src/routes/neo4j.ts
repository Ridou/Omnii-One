import { Elysia, t } from 'elysia';
import { neo4jService } from '../config/neo4j.config';

// Authentication middleware to validate user access
const authenticateUser = async (request: Request, userId: string): Promise<boolean> => {
  // Get authenticated user ID from headers (set by tRPC auth or other auth middleware)
  const authUserId = request.headers.get('x-user-id');
  const authHeader = request.headers.get('Authorization');
  
  console.log(`[Neo4j Auth] 🔒 Validating access: requested=${userId}, authenticated=${authUserId}`);
  
  // For development/testing, allow specific test user
  if (userId === 'test-user-123' && process.env.NODE_ENV === 'development') {
    console.log(`[Neo4j Auth] ✅ Development test user allowed`);
    return true;
  }
  
  // Require authentication headers
  if (!authUserId || !authHeader) {
    console.log(`[Neo4j Auth] ❌ Missing authentication headers`);
    return false;
  }
  
  // Verify the user can only access their own data
  if (authUserId !== userId) {
    console.log(`[Neo4j Auth] ❌ User ${authUserId} attempting to access data for ${userId}`);
    return false;
  }
  
  console.log(`[Neo4j Auth] ✅ User ${userId} authenticated successfully`);
  return true;
};

// Define schemas with authentication
const AuthenticatedSearchQuery = t.Object({
  user_id: t.String(),
  q: t.String(),
  limit: t.Optional(t.Numeric())
});

const AuthenticatedListQuery = t.Object({
  user_id: t.String(),
  limit: t.Optional(t.Numeric()),
  filter: t.Optional(t.String())
});

const ErrorResponse = t.Object({
  error: t.String(),
  details: t.Optional(t.String())
});

// Create routes with authentication
export default (app: Elysia) =>
  app.group('/neo4j', (app) =>
    app
      // Search similar concepts - with authentication
      .get(
        '/concepts/search',
        async ({ query, request, set }) => {
          // 🔒 PRIVACY PROTECTION: Verify user can access their own data
          const isAuthenticated = await authenticateUser(request, query.user_id);
          if (!isAuthenticated) {
            set.status = 403;
            return { 
              error: 'Forbidden: Access denied',
              details: 'You can only access your own data'
            };
          }
          
          const results = await neo4jService.searchSimilarConcepts(
            query.user_id,
            query.q,
            query.limit ? Number(query.limit) : 5
          );
          return { data: results };
        },
        {
          query: AuthenticatedSearchQuery,
          response: {
            200: t.Object({
              data: t.Array(t.Any())
            }),
            400: ErrorResponse,
            403: ErrorResponse,
            500: ErrorResponse
          },
          detail: {
            summary: 'Search similar concepts (authenticated)',
            description: 'Search for concepts similar to the provided query - requires authentication',
            tags: ['Neo4j', 'Authentication']
          }
        }
      )
      
      // List concepts - with authentication
      .get(
        '/concepts',
        async ({ query, request, set }) => {
          // 🔒 PRIVACY PROTECTION: Verify user can access their own data
          const isAuthenticated = await authenticateUser(request, query.user_id);
          if (!isAuthenticated) {
            set.status = 403;
            return { 
              error: 'Forbidden: Access denied',
              details: 'You can only access your own data'
            };
          }
          
          const concepts = await neo4jService.listNodes(
            query.user_id,
            'Concept',
            query.limit ? Number(query.limit) : 100,
            query.filter
          );
          return { data: concepts };
        },
        {
          query: AuthenticatedListQuery,
          response: {
            200: t.Object({
              data: t.Array(t.Any())
            }),
            400: ErrorResponse,
            403: ErrorResponse,
            500: ErrorResponse
          },
          detail: {
            summary: 'List concepts (authenticated)',
            description: 'List all concepts with optional filtering - requires authentication',
            tags: ['Neo4j', 'Authentication']
          }
        }
      )
      
      // Add more Neo4j routes here...
  );
