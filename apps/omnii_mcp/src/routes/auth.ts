import { Elysia } from 'elysia';
import { createSupabaseClient } from '@omnii/auth';
import type { User } from '@supabase/supabase-js';

// Define auth context inline since plugin chain isn't working correctly with Bun
interface AuthContext {
  user: User;
  tenantId: string;
}

// Public routes
export const authRoutes = new Elysia({ prefix: '/auth' })
  // Public health check
  .get('/health', () => ({ status: 'ok', provider: 'supabase' }))

  // Protected /me route with inline auth
  .get('/me', async ({ headers, set }) => {
    const authHeader = headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    const supabase = createSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Invalid or expired token' };
    }

    return {
      id: user.id,
      email: user.email,
      tenantId: user.id,
      provider: user.app_metadata?.provider || 'email',
    };
  });

export default authRoutes;
