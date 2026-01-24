import { supabase } from '~/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export interface OAuthTokenData {
  provider: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  scope?: string[];
  token_type?: string;
}

/**
 * Store OAuth tokens after successful authentication
 */
export const storeOAuthTokens = async (session: Session): Promise<void> => {
  try {
    if (!session.provider_token || !session.user) {
      return;
    }


    // Extract scope from user metadata
    const scopeString = session.user.user_metadata?.scope || '';
    const scopeArray = scopeString ? scopeString.split(' ').filter(Boolean) : [];

    // Calculate expires_at
    let expiresAt: string | null = null;
    if (session.expires_at) {
      expiresAt = new Date(session.expires_at * 1000).toISOString();
    }

    // Token information logged for debugging

    // Store tokens in database
    const { data, error } = await supabase.rpc('upsert_oauth_token', {
      p_user_id: session.user.id,
      p_provider: 'google',
      p_access_token: session.provider_token,
      p_refresh_token: session.provider_refresh_token || null,
      p_expires_at: expiresAt,
      p_scope: scopeArray.length > 0 ? scopeArray : null,
      p_token_type: 'Bearer'
    });

    if (error) {
      return;
    }

  } catch (error) {
  }
};

/**
 * Get current user's OAuth tokens
 */
export const getMyOAuthTokens = async (provider: string = 'google'): Promise<OAuthTokenData[]> => {
  try {
    const { data, error } = await supabase.rpc('get_my_tokens', {
      p_provider: provider
    });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Clear OAuth tokens (for logout)
 */
export const clearOAuthTokens = async (userId?: string): Promise<void> => {
  try {
    if (!userId) return;


    const { error } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return;
    }

  } catch (error) {
  }
}; 