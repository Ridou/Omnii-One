import { Elysia } from 'elysia';
import { authMiddleware } from '@omnii/auth';

export const authRoutes = new Elysia({ prefix: '/auth' })
  // Public health check
  .get('/health', () => ({ status: 'ok', provider: 'supabase' }))

  // Protected route example - requires valid JWT
  .use(authMiddleware)
  .get('/me', ({ user, tenantId }) => ({
    id: user.id,
    email: user.email,
    tenantId,
    provider: user.app_metadata?.provider || 'email',
  }));

export default authRoutes;
