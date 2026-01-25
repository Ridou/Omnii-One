import { Elysia } from 'elysia';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import neo4jRoutes from './neo4j';
import neo4jDirectRoutes from './neo4j-direct';
import smsRoutes from './sms';
import rdfRoutes from './rdf';
import brainRoutes from './brain-monitoring.routes';
import chatHttpRoutes from './chat-http';
import n8nWebhookRoutes from './n8n-webhooks';
import chatDirectN8nRoutes from './chat-direct-n8n';
import authRoutes from './auth';
import { authWebhooks } from './webhooks/auth';
import { graphRoutes } from './graph';
import { openaiRoutes } from './openai';
import { createMCPRoutes } from '../mcp/transport';
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
        // Extract auth headers sent from mobile app
        const authHeader = req.headers.get('Authorization');
        const userIdHeader = req.headers.get('x-user-id');
        
        console.log('[tRPC Context] Auth header present:', !!authHeader);
        console.log('[tRPC Context] User ID header:', userIdHeader);
        
        // Create auth object that matches createTRPCContext expectations
        const auth = {
          api: {
            getSession: async ({ headers }: { headers: Headers }) => {
              // If we have both auth token and user ID, create session
              if (authHeader && userIdHeader) {
                const token = authHeader.replace('Bearer ', '');
                
                console.log('[tRPC Context] Creating session for user:', userIdHeader);
                
                return {
                  user: {
                    id: userIdHeader,
                    email: 'user@example.com', // Could extract from JWT if needed
                    name: 'User'
                  },
                  access_token: token,
                  expires_at: Date.now() + 3600000 // 1 hour from now
                };
              }
              
              console.log('[tRPC Context] No valid auth headers, returning null session');
              return null;
            }
          }
        };
        
        return await createTRPCContext({
          headers: req.headers,
          auth: auth as any,
        });
      },
    }); 
  });
  
  // Register other routes
  api.use(authRoutes);
  api.use(authWebhooks);
  api.use(graphRoutes);
  api.use(openaiRoutes);
  api.use(neo4jRoutes);
  api.use(neo4jDirectRoutes);
  api.use(smsRoutes);
  api.use(rdfRoutes);
  api.use(brainRoutes);
  api.use(chatHttpRoutes);
  api.use(n8nWebhookRoutes);
  api.use(chatDirectN8nRoutes);

  // Mount the API routes under /api
  app.use(api);

  // Mount MCP routes at /mcp (not under /api - MCP clients expect /mcp directly)
  app.use(createMCPRoutes());

  return app;
};
