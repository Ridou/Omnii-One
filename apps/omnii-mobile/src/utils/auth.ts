// apps/omnii-mobile/src/utils/auth.ts
// Legacy auth utilities - now using Supabase

import { supabase } from '~/lib/supabase';

// Debug helper to check auth status
export const debugAuthStatus = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Auth Debug] Error getting session:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    console.warn('[Auth Debug] Exception:', error);
    return null;
  }
};

// Get current user ID (for compatibility)
export const getCurrentUserId = async (): Promise<string | null> => {
  const session = await debugAuthStatus();
  return session?.user?.id ?? null;
};
