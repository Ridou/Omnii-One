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
      console.log('⚠️ No provider token available for storage');
      return;
    }

    console.log('💾 Storing OAuth tokens for user:', session.user.email);

    // Extract scope from user metadata
    const scopeString = session.user.user_metadata?.scope || '';
    const scopeArray = scopeString ? scopeString.split(' ').filter(Boolean) : [];

    // Calculate expires_at
    let expiresAt: string | null = null;
    if (session.expires_at) {
      expiresAt = new Date(session.expires_at * 1000).toISOString();
    }

    console.log('📋 Token details:', {
      provider: 'google',
      user_id: session.user.id,
      has_access_token: !!session.provider_token,
      has_refresh_token: !!session.provider_refresh_token,
      expires_at: expiresAt,
      scope_count: scopeArray.length
    });

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
      console.error('❌ Error storing OAuth tokens:', error);
      return;
    }

    console.log('✅ OAuth tokens stored successfully with ID:', data);
  } catch (error) {
    console.error('💥 Failed to store OAuth tokens:', error);
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
      console.error('❌ Error retrieving OAuth tokens:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('💥 Failed to retrieve OAuth tokens:', error);
    throw error;
  }
};

/**
 * Clear OAuth tokens (for logout)
 */
export const clearOAuthTokens = async (userId?: string): Promise<void> => {
  try {
    if (!userId) return;

    console.log('🧹 Clearing OAuth tokens for user:', userId);

    const { error } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error clearing OAuth tokens:', error);
      return;
    }

    console.log('✅ OAuth tokens cleared successfully');
  } catch (error) {
    console.error('💥 Failed to clear OAuth tokens:', error);
  }
}; 