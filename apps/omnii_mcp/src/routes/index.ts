import { Elysia } from 'elysia';
import neo4jRoutes from './neo4j';
import smsRoutes from './sms';

// Create a new Elysia instance for API routes
export default (app: Elysia) => {
  const api = new Elysia({ prefix: '/api' });
  
  // Register routes
  api.use(neo4jRoutes);
  api.use(smsRoutes);
  
  // Mount the API routes under /api
  return app.use(api);
};
