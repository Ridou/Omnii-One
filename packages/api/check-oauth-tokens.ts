#!/usr/bin/env bun

/**
 * 🔍 Check OAuth Tokens in Supabase
 * 
 * This script directly queries the Supabase oauth_tokens table
 * to see what authentication tokens exist for the test user.
 */

import { createClient } from '@supabase/supabase-js';

async function checkOAuthTokens() {
  console.log('🔍 Checking OAuth tokens in Supabase\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const testUserId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';

  try {
    console.log('📊 === SUPABASE OAUTH_TOKENS TABLE ===\n');

    // Get all OAuth tokens for our test user
    const { data: tokens, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying OAuth tokens:', error);
      return;
    }

    console.log(`✅ Found ${tokens?.length || 0} OAuth tokens for user ${testUserId}:\n`);

    for (const token of tokens || []) {
      console.log(`🔑 === ${token.provider.toUpperCase()} TOKEN ===`);
      console.log(`   - Provider: ${token.provider}`);
      console.log(`   - Scopes: ${token.scopes || 'Not specified'}`);
      console.log(`   - Created: ${token.created_at}`);
      console.log(`   - Expires: ${token.expires_at}`);
      console.log(`   - Has Access Token: ${!!token.access_token}`);
      console.log(`   - Has Refresh Token: ${!!token.refresh_token}`);
      
      // Check if token is expired
      if (token.expires_at) {
        const expiresAt = new Date(token.expires_at);
        const now = new Date();
        const isExpired = expiresAt < now;
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const minutesUntilExpiry = Math.round(timeUntilExpiry / (1000 * 60));
        
        console.log(`   - Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
        if (!isExpired) {
          console.log(`   - Time until expiry: ${minutesUntilExpiry} minutes`);
        } else {
          console.log(`   - Expired: ${Math.abs(minutesUntilExpiry)} minutes ago`);
        }
      }
      
      // Sample the token (first/last 10 characters for security)
      if (token.access_token) {
        const sampleToken = token.access_token.substring(0, 10) + '...' + token.access_token.substring(token.access_token.length - 10);
        console.log(`   - Access Token Sample: ${sampleToken}`);
      }
      
      console.log('');
    }

    if (!tokens || tokens.length === 0) {
      console.log('❌ === NO OAUTH TOKENS FOUND ===');
      console.log('🔧 This explains why Gmail API returns 0 emails!');
      console.log('');
      console.log('📝 To fix this, you need to:');
      console.log('1. Complete Google OAuth flow on the mobile app');
      console.log('2. Or manually insert OAuth tokens into the oauth_tokens table');
      console.log('3. Or use a different test user who has completed OAuth');
      console.log('');
    } else {
      // Check specifically for Google tokens
      const googleTokens = tokens.filter(t => t.provider === 'google');
      
      if (googleTokens.length === 0) {
        console.log('❌ === NO GOOGLE OAUTH TOKENS FOUND ===');
        console.log('🔧 This explains why Gmail API returns 0 emails!');
        console.log('   - Found OAuth tokens for other providers, but not Google');
        console.log('   - Gmail, Calendar, Tasks, and Contacts all require Google OAuth');
      } else {
        console.log(`✅ Found ${googleTokens.length} Google OAuth tokens`);
        
        // Check if any are expired
        const expiredTokens = googleTokens.filter(t => {
          if (!t.expires_at) return false;
          return new Date(t.expires_at) < new Date();
        });
        
        if (expiredTokens.length > 0) {
          console.log('⚠️ === SOME GOOGLE TOKENS ARE EXPIRED ===');
          console.log('🔧 The Gmail API should attempt to refresh these automatically');
          console.log('   - If refresh fails, this explains the 0 emails issue');
        }
      }
    }

    console.log('\n🎯 === RECOMMENDATIONS ===');
    console.log('1. If no Google tokens → Complete OAuth flow in mobile app');
    console.log('2. If tokens expired → Check if refresh_token is valid');
    console.log('3. If tokens exist but Gmail returns 0 emails → Check Gmail API scopes');
    console.log('4. Try manually testing Gmail API with curl using the access token');

  } catch (error) {
    console.error('❌ Failed to check OAuth tokens:', error);
  }
}

// Run check if this file is executed directly
if (import.meta.main) {
  void checkOAuthTokens();
}

export { checkOAuthTokens }; 