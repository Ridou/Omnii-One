import { Elysia } from 'elysia';
import { createSupabaseClient } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthContext extends Record<string, unknown> {
  user: User;
  tenantId: string;  // user.id - for database-per-user isolation
}

/**
 * Elysia middleware that validates Supabase JWT and extracts user info.
 *
 * NOTE: This middleware has issues with Bun's runtime when used via .use(authMiddleware).
 * The .derive() doesn't propagate correctly. For now, inline auth checks are recommended.
 *
 * Usage: app.use(authMiddleware).get('/protected', ({ user, tenantId }) => ...)
 */
export const authMiddleware = new Elysia({ name: 'auth' })
  .derive(async ({ headers, set }): Promise<AuthContext> => {
    const authHeader = headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401;
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const supabase = createSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      set.status = 401;
      throw new Error('Invalid or expired token');
    }

    return {
      user,
      tenantId: user.id,  // Used for database-per-user lookup
    };
  });
