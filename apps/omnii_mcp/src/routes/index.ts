import { Elysia } from 'elysia';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import neo4jRoutes from './neo4j';
import smsRoutes from './sms';
import { appRouter, createTRPCContext } from '@omnii/api';


// Create a new Elysia instance for API routes
export default (app: Elysia) => {
  const api = new Elysia({ prefix: '/api' });
  
  // Add tRPC support using direct fetchRequestHandler (workaround for tRPC v11 + Elysia compatibility)
  api.all('/trpc/*', async ({ request }) => {
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      router: appRouter,
      req: request,
      createContext: async ({ req }) => {
        // Create a minimal auth object for the context
        // This should be replaced with your actual auth implementation
        const mockAuth = {
          api: {
            getSession: async () => null, // No session for now
          }
        };
        
        return await createTRPCContext({
          headers: req.headers,
          auth: mockAuth as any,
        });
      },
    }); 
  });
  
  // Register other routes
  api.use(neo4jRoutes);
  api.use(smsRoutes);
  
  // Mount the API routes under /api
  return app.use(api);
};
