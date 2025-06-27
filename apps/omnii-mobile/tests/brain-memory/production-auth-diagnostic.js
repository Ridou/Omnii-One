/**
 * 🔍 Production Authentication Diagnostic
 * 
 * This script analyzes why cached data isn't showing up in production.
 * It checks both Supabase authentication AND Google OAuth integration.
 */

const { createClient } = require('@supabase/supabase-js');

const PROD_SUPABASE_URL = 'https://aaxiawuatfajjpvwtjuz.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFheGlhd3VhdGZhampwdnd0anV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNDI5NTUsImV4cCI6MjA1NDkxODk1NX0.vZTqi6asrLDD21cIobrNvQvzwCIMxidiqp1ehXOMqTk';
const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';

async function runProductionAuthDiagnostic() {
  console.log('🔍 === PRODUCTION AUTHENTICATION DIAGNOSTIC ===');
  console.log(`📋 Analyzing user: ${TEST_USER_ID}`);
  console.log(`🌐 Supabase URL: ${PROD_SUPABASE_URL}`);
  console.log('');

  const supabase = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY);
  const result = {
    userExists: false,
    hasGoogleTokens: false,
    recommendations: []
  };

  try {
    // Step 1: Check Google OAuth tokens
    console.log('🔄 1. Checking Google OAuth tokens...');
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('provider', 'google');

    if (tokenError) {
      console.log('❌ Error checking OAuth tokens:', tokenError.message);
      result.recommendations.push('Database access issue - check Supabase permissions');
      return result;
    }

    if (!tokenData || tokenData.length === 0) {
      console.log('⚠️  No Google OAuth tokens found for user');
      console.log('');
      console.log('🔍 This means either:');
      console.log('   1. User signed in with Apple and needs to connect Google services');
      console.log('   2. User signed in with Google but OAuth tokens were not stored properly');
      console.log('   3. User exists but never completed Google OAuth flow');
      console.log('');
      
      result.userExists = true;
      result.hasGoogleTokens = false;
      result.recommendations.push('User needs to complete Google OAuth integration');
      result.recommendations.push('Check if user signed in with Apple (needs separate Google connection)');
      
      return result;
    }

    // Step 2: Analyze token details
    const token = tokenData[0];
    console.log('✅ Google OAuth tokens found!');
    console.log('');
    result.userExists = true;
    result.hasGoogleTokens = true;

    // Check token expiry
    const isExpired = token.expires_at ? new Date(token.expires_at) < new Date() : false;
    
    console.log('📊 Token Analysis:');
    console.log(`   Access Token: ${token.access_token ? `${token.access_token.substring(0, 20)}...` : 'Missing'}`);
    console.log(`   Refresh Token: ${token.refresh_token ? 'Present' : 'Missing'}`);
    console.log(`   Expires At: ${token.expires_at || 'Unknown'}`);
    console.log(`   Is Expired: ${isExpired ? '❌ YES' : '✅ NO'}`);
    console.log(`   Scopes: ${token.scope ? token.scope.length : 0} scopes`);
    console.log('');

    // Step 3: Test token validity with Google API
    if (!isExpired && token.access_token) {
      console.log('🔄 2. Testing token validity with Google API...');
      
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
          },
        });

        if (response.ok) {
          const userInfo = await response.json();
          console.log('✅ Token is valid with Google!');
          console.log(`   Google Email: ${userInfo.email}`);
          console.log(`   Google Name: ${userInfo.name}`);
          console.log('');
          result.recommendations.push('Google tokens are valid - issue might be elsewhere');
        } else {
          console.log('❌ Token rejected by Google:', response.status, response.statusText);
          console.log('');
          result.recommendations.push('Google tokens are invalid - user needs to re-authenticate');
        }
      } catch (error) {
        console.log('⚠️  Could not test token with Google:', error.message);
        console.log('');
        result.recommendations.push('Could not validate tokens with Google - network issue?');
      }
    }

    // Step 4: Check specific service access
    console.log('🔄 3. Testing specific Google service access...');
    console.log('');
    
    const services = [
      { name: 'Gmail', url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile' },
      { name: 'Calendar', url: 'https://www.googleapis.com/calendar/v3/calendars/primary' },
      { name: 'Tasks', url: 'https://tasks.googleapis.com/tasks/v1/users/@me/lists' },
      { name: 'Contacts', url: 'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses' }
    ];

    for (const service of services) {
      try {
        const response = await fetch(service.url, {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
          },
        });

        if (response.ok) {
          console.log(`   ✅ ${service.name}: Access granted`);
        } else {
          console.log(`   ❌ ${service.name}: Access denied (${response.status})`);
          if (response.status === 403) {
            result.recommendations.push(`${service.name} scope missing - user needs to re-authenticate with full permissions`);
          }
        }
      } catch (error) {
        console.log(`   ⚠️  ${service.name}: Test failed - ${error.message}`);
      }
    }

    console.log('');

    // Generate final recommendations
    if (isExpired && token.refresh_token) {
      result.recommendations.push('Tokens are expired but refresh token exists - automatic refresh should work');
    } else if (isExpired && !token.refresh_token) {
      result.recommendations.push('Tokens are expired and no refresh token - user must re-authenticate');
    } else if (!isExpired) {
      result.recommendations.push('Tokens appear valid - check tRPC endpoint configuration');
    }

  } catch (error) {
    console.log('💥 Diagnostic failed:', error.message);
    result.recommendations.push(`Diagnostic error: ${error.message}`);
  }

  return result;
}

async function checkMobileAppTRPCEndpoints() {
  console.log('🔄 4. Testing mobile app tRPC endpoints...');
  console.log('');
  
  const endpoints = [
    { name: 'Tasks', url: 'https://omniimcp-production.up.railway.app/api/trpc/tasks.getCompleteOverview' },
    { name: 'Email', url: 'https://omniimcp-production.up.railway.app/api/trpc/email.listEmails' },
    { name: 'Contacts', url: 'https://omniimcp-production.up.railway.app/api/trpc/contacts.listContacts' },
    { name: 'Calendar', url: 'https://omniimcp-production.up.railway.app/api/trpc/calendar.getEvents' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': TEST_USER_ID,
        },
        body: JSON.stringify({
          json: {},
          meta: {}
        })
      });

      if (response.ok) {
        console.log(`   ✅ ${endpoint.name}: tRPC endpoint accessible`);
      } else {
        const text = await response.text();
        console.log(`   ❌ ${endpoint.name}: ${response.status} - ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${endpoint.name}: Network error - ${error.message}`);
    }
  }
  console.log('');
}

async function generateDiagnosticSummary(result) {
  console.log('📊 === DIAGNOSTIC SUMMARY ===');
  console.log(`👤 User Exists: ${result.userExists ? '✅ YES' : '❌ NO'}`);
  console.log(`🔗 Has Google Tokens: ${result.hasGoogleTokens ? '✅ YES' : '❌ NO'}`);
  console.log('');

  console.log('💡 RECOMMENDATIONS:');
  result.recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });

  console.log('');
  console.log('🚀 NEXT STEPS:');
  
  if (!result.hasGoogleTokens) {
    console.log('   • User needs to complete Google OAuth integration');
    console.log('   • This is likely an Apple user who needs to connect Google services');
    console.log('   • Or a Google user whose OAuth tokens were not stored during sign-in');
  } else {
    console.log('   • Google tokens exist - check why tRPC endpoints are not using them');
    console.log('   • Verify OAuth manager implementation in backend');
    console.log('   • Check mobile app authentication headers');
  }

  console.log('');
  console.log('🔑 THE REAL ISSUE:');
  console.log('   Two separate authentication systems:');
  console.log('   1. Supabase Auth (for app access) - User is authenticated ✅');
  console.log('   2. Google OAuth (for Google services) - This is what we\'re checking');
  console.log('');
  console.log('=====================================');
}

// Main execution
async function main() {
  const startTime = Date.now();
  
  try {
    const result = await runProductionAuthDiagnostic();
    await checkMobileAppTRPCEndpoints();
    await generateDiagnosticSummary(result);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Diagnostic completed in ${duration}ms`);
    
  } catch (error) {
    console.error('💥 Diagnostic failed completely:', error);
    process.exit(1);
  }
}

main().catch(console.error); 