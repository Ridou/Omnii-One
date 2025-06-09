import { Elysia } from 'elysia';
import { trpc } from '@elysiajs/trpc';
import { initTRPC } from '@trpc/server';
import neo4jRoutes from './neo4j';
import smsRoutes from './sms';

// Create a minimal inline tRPC router for testing
const t = initTRPC.create();
const minimalRouter = t.router({
  hello: t.procedure.query(() => {
    return { message: "Hello from minimal tRPC router!" };
  }),
  tasks: t.router({
    getCompleteOverview: t.procedure.query(() => {
      return {
        success: true,
        data: {
          taskLists: [],
          totalLists: 0,
          totalTasks: 0,
          totalCompleted: 0,
          totalPending: 0,
          totalOverdue: 0,
          lastSyncTime: new Date().toISOString(),
          syncSuccess: true,
        },
        message: "Minimal router response - tRPC is working!",
      };
    }),
  }),
});

// Create a new Elysia instance for API routes
export default (app: Elysia) => {
  const api = new Elysia({ prefix: '/api' });
  
  // Add tRPC support with minimal router
  api.use(
    trpc(minimalRouter, {
      endpoint: '/trpc'
    })
  );
  
  // Register other routes
  api.use(neo4jRoutes);
  api.use(smsRoutes);
  
  // Mount the API routes under /api
  return app.use(api);
};
