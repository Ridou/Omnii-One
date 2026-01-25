import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side client with service role (for admin operations)
export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.OMNII_SUPABASE_URL;
  const serviceKey = process.env.OMNII_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing OMNII_SUPABASE_URL or OMNII_SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Client-side client with anon key (for user operations)
export function createSupabaseClient(): SupabaseClient {
  const url = process.env.OMNII_SUPABASE_URL;
  const anonKey = process.env.OMNII_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing OMNII_SUPABASE_URL or OMNII_SUPABASE_ANON_KEY');
  }

  return createClient(url, anonKey);
}

// Re-export types
export type { SupabaseClient, User, Session } from '@supabase/supabase-js';
