#!/usr/bin/env bun

/**
 * 🔄 Refresh OAuth Token Script
 * 
 * This script manually refreshes the OAuth token for the test user
 * and tests if Gmail API access works after refresh.
 */

import { createClient } from '@supabase/supabase-js';

async function refreshTestToken() {
  console.log('🔄 Refreshing OAuth token for test user\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const testUserId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';

  try {
    console.log('1️⃣ Getting current token...');
    const { data: currentToken, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', testUserId)
      .eq('provider', 'google')
      .single();

    if (error || !currentToken) {
      console.error('❌ No token found:', error);
      return;
    }

    console.log('✅ Current token found');
    console.log(`   - Has refresh token: ${!!currentToken.refresh_token}`);
    console.log(`   - Expires at: ${currentToken.expires_at}`);
    console.log(`   - Access token sample: ${currentToken.access_token.substring(0, 20)}...`);

    if (!currentToken.refresh_token) {
      console.error('❌ No refresh token available - need to re-authenticate');
      return;
    }

    console.log('\n2️⃣ Testing current token with Gmail API...');
    const testCurrentResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1',
      {
        headers: {
          'Authorization': `Bearer ${currentToken.access_token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (testCurrentResponse.ok) {
      console.log('✅ Current token works! No refresh needed.');
      const data = await testCurrentResponse.json();
      console.log(`   - Gmail API response: ${JSON.stringify(data, null, 2)}`);
      return;
    } else {
      console.log('❌ Current token failed, attempting refresh...');
      const errorData = await testCurrentResponse.text();
      console.log(`   - Error: ${testCurrentResponse.status} ${errorData}`);
    }

    console.log('\n3️⃣ Refreshing token...');
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: currentToken.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.text();
      console.error(`❌ Token refresh failed: ${refreshResponse.status} ${errorData}`);
      return;
    }

    const refreshData = await refreshResponse.json();
    console.log('✅ Token refresh successful!');
    console.log(`   - New access token: ${refreshData.access_token.substring(0, 20)}...`);
    console.log(`   - Expires in: ${refreshData.expires_in} seconds`);

    // Update token in database
    const expiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();
    
    console.log('\n4️⃣ Updating token in database...');
    const { error: updateError } = await supabase
      .from('oauth_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || currentToken.refresh_token,
        expires_at: expiresAt,
      })
      .eq('user_id', testUserId)
      .eq('provider', 'google');

    if (updateError) {
      console.error('❌ Failed to update token in database:', updateError);
      return;
    }

    console.log('✅ Token updated in database');

    console.log('\n5️⃣ Testing new token with Gmail API...');
    const testNewResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5',
      {
        headers: {
          'Authorization': `Bearer ${refreshData.access_token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (testNewResponse.ok) {
      const data = await testNewResponse.json();
      console.log('🎉 NEW TOKEN WORKS!');
      console.log(`   - Found ${data.messages?.length || 0} messages`);
      console.log(`   - Result size estimate: ${data.resultSizeEstimate || 0}`);
      
      if (data.messages && data.messages.length > 0) {
        console.log('   - Sample message IDs:');
        data.messages.slice(0, 3).forEach((msg: any, i: number) => {
          console.log(`     ${i + 1}. ${msg.id}`);
        });
      }
    } else {
      const errorData = await testNewResponse.text();
      console.error(`❌ New token still doesn't work: ${testNewResponse.status} ${errorData}`);
    }

  } catch (error) {
    console.error('❌ Failed to refresh token:', error);
  }
}

// Run refresh if this file is executed directly
if (import.meta.main) {
  void refreshTestToken();
}

export { refreshTestToken }; 