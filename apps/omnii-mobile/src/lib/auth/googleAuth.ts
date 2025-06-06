import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '~/lib/supabase';
import { getOmniiScopes, getOmniiScopesString } from './scopes';
import { storeOAuthTokens } from './tokenStorage';
import Constants from 'expo-constants';
import * as AuthRequest from 'expo-auth-session/build/AuthRequest';
import { 
  getOAuthRedirectUrl, 
  getFinalDestinationUrl,
  getEnvironmentConfig,
  logSupabaseSetupInstructions,
  getSupabaseRedirectUrlsForConfig,
  handlePostOAuthNavigation,
  isMobileEnvironment
} from './redirectConfig';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs for different platforms
const GOOGLE_WEB_CLIENT_ID =
  Constants.expoConfig?.extra?.googleWebClientId ||
  '31768914670-v6qqf961ersh1m2ahtlekff552ovis66.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  Constants.expoConfig?.extra?.googleIosClientId ||
  '904371950268-abund19lqsma5d4rhfkkv212e5j7hv5e.apps.googleusercontent.com';

// Get the appropriate client ID based on platform
const getGoogleClientId = (): string => {
  if (Platform.OS === 'ios') {
    return GOOGLE_IOS_CLIENT_ID;
  }
  return GOOGLE_WEB_CLIENT_ID;
};

// Log configuration in development
if (__DEV__) {
  const currentClientId = getGoogleClientId();
  const isUsingIOS = currentClientId === GOOGLE_IOS_CLIENT_ID;
  const isUsingWeb = currentClientId === GOOGLE_WEB_CLIENT_ID;
  const scopes = getOmniiScopes();

  console.log('🔧 Google OAuth Configuration:');
  console.log('- Platform:', Platform.OS);
  console.log(
    '- Web Client ID:',
    GOOGLE_WEB_CLIENT_ID ? '✅ Set' : '❌ Missing'
  );
  console.log(
    '- iOS Client ID:',
    GOOGLE_IOS_CLIENT_ID ? '✅ Set' : '❌ Missing'
  );
  console.log(`- Using Client ID: ${currentClientId.substring(0, 20)}...`);
  console.log(
    `- Client Type: ${
      isUsingIOS
        ? '📱 iOS Native Client'
        : isUsingWeb
        ? '🌐 Web Client'
        : '❓ Unknown'
    }`
  );
  console.log(
    `- Expected for ${Platform.OS}: ${
      Platform.OS === 'ios' ? '📱 iOS Client' : '🌐 Web Client'
    }`
  );
  console.log(`- OAuth Scopes: ${scopes.length} scopes configured`);
  console.log('- Services: Gmail, Drive, Calendar, Contacts, Sheets, Tasks');
  
  // Log redirect URL configuration
  logSupabaseSetupInstructions();
}

// Get the correct redirect URI following Supabase + Expo pattern
export const getRedirectUri = (): string => {
  return getOAuthRedirectUrl();
};

// OAuth configuration for custom development build
const getOAuthConfig = () => ({
  clientId: getGoogleClientId(),
  redirectUri: getRedirectUri(),
  scopes: getOmniiScopes(),
});

// Create session from URL (following Supabase documentation)
const createSessionFromUrl = async (url: string) => {
  console.log('🔍 Parsing OAuth callback URL:', url);
  const { params, errorCode } = QueryParams.getQueryParams(url);

  console.log('📋 Extracted params:', params);
  console.log('❌ Error code:', errorCode);

  if (errorCode) {
    console.error('❌ OAuth error code:', errorCode);
    throw new Error(errorCode);
  }

  const { access_token, refresh_token, code, scope } = params;

  // Log any scope information from the callback
  if (scope) {
    console.log('🎯 Granted scopes from callback:', scope);
  }

  // If we have access_token, use setSession
  if (access_token) {
    console.log('🔑 Setting session with access token...');
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('❌ Error setting session:', error);
      throw error;
    }

    console.log('✅ Session set successfully:', data.session?.user?.email);

    // Log session details including any provider token info
    if (data.session?.provider_token) {
      console.log('🔐 Provider token available for API calls');
    }

    // Try to get user metadata which might contain scope info
    if (data.session?.user?.user_metadata) {
      console.log(
        '👤 User metadata:',
        JSON.stringify(data.session.user.user_metadata, null, 2)
      );
    }

    // 🆕 Store OAuth tokens (non-blocking side effect)
    if (data.session) {
      storeOAuthTokens(data.session).catch((error) => {
        console.error('⚠️ Token storage failed (non-critical):', error);
      });
    }

    return data.session;
  }

  // If we have authorization code, exchange it for session
  if (code) {
    console.log('🔄 Exchanging authorization code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('❌ Error exchanging code for session:', error);
      throw error;
    }

    console.log('✅ Code exchange successful:', data.session?.user?.email);

    // Log session details including any provider token info
    if (data.session?.provider_token) {
      console.log('🔐 Provider token available for API calls');
    }

    // Try to get user metadata which might contain scope info
    if (data.session?.user?.user_metadata) {
      console.log(
        '👤 User metadata:',
        JSON.stringify(data.session.user.user_metadata, null, 2)
      );
    }

    // Log the full session object to see what scope info is available
    console.log(
      '📄 Full session data:',
      JSON.stringify(
        {
          access_token: data.session?.access_token ? 'present' : 'missing',
          refresh_token: data.session?.refresh_token ? 'present' : 'missing',
          provider_token: data.session?.provider_token ? 'present' : 'missing',
          provider_refresh_token: data.session?.provider_refresh_token
            ? 'present'
            : 'missing',
          user_id: data.session?.user?.id,
          email: data.session?.user?.email,
        },
        null,
        2
      )
    );

    // 🆕 Store OAuth tokens (non-blocking side effect)
    if (data.session) {
      storeOAuthTokens(data.session).catch((error) => {
        console.error('⚠️ Token storage failed (non-critical):', error);
      });
    }

    return data.session;
  }

  console.log('⚠️ No access token or authorization code found in URL params');
  return;
};

// Helper function to pre-build OAuth URL for immediate use
const buildGoogleOAuthUrl = (redirectUri: string): string => {
  const clientId = getGoogleClientId();
  const scopes = getOmniiScopesString();
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state: 'google-oauth', // Simple state for security
  });

  return `https://accounts.google.com/oauth/authorize?${params.toString()}`;
};

// Alternative immediate OAuth approach for popup blocker prevention
export const signInWithGoogleImmediate = async (): Promise<void> => {
  try {
    console.log('🚀 Starting immediate Google OAuth flow...');
    
    const redirectTo = getRedirectUri();
    const oauthUrl = buildGoogleOAuthUrl(redirectTo);
    
    console.log('🌐 Opening immediate Google OAuth...');
    console.log('🔗 Redirect URI:', redirectTo);
    
    // Open immediately without any delays
    const res = await WebBrowser.openAuthSessionAsync(
      oauthUrl,
      redirectTo,
      {
        showInRecents: false,
        ...(Platform.OS === 'ios' && {
          preferEphemeralSession: true,
        }),
        ...(Platform.OS === 'android' && {
          showTitle: false,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
        }),
      }
    );

    if (res.type === 'success') {
      const { url } = res;
      console.log('✅ Immediate OAuth success, creating session from URL');
      
      // For direct OAuth, we need to handle the code differently
      // This would require implementing the OAuth code exchange manually
      // For now, fall back to Supabase flow
      console.log('🔄 Falling back to Supabase session creation...');
      const session = await createSessionFromUrl(url);
      console.log('🎉 Session created successfully!', session?.user?.email);
    } else if (res.type === 'cancel') {
      throw new Error('Authentication was cancelled');
    } else if (res.type === 'dismiss') {
      throw new Error('Authentication was dismissed');
    } else if (res.type === 'locked') {
      throw new Error('Authentication blocked by browser. Please enable popups and try again.');
    } else {
      throw new Error(`Authentication failed: ${res.type}`);
    }
  } catch (error) {
    console.error('💥 Immediate Google OAuth Error:', error);
    throw error;
  }
};

// Enhanced Supabase OAuth flow with fallback to immediate approach
export const signInWithGoogle = async (): Promise<void> => {
  try {
    console.log(
      '🚀 Starting Supabase Google OAuth flow (Custom Development Build)...'
    );

    // Check if Google OAuth is properly configured
    const clientId = getGoogleClientId();
    if (!clientId || clientId.length === 0) {
      throw new Error(
        'Google OAuth is not configured. Please add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to your environment variables.'
      );
    }

    // Get and log the scopes we're requesting
    const requestedScopes = getOmniiScopes();
    console.log('📋 Requesting OAuth Scopes:');
    console.log(`   Total: ${requestedScopes.length} scopes`);
    console.log('   Services: Gmail, Drive, Calendar, Contacts, Sheets, Tasks');
    console.log('   Scopes:', requestedScopes.join(', '));

    // Log which client type is being used
    const isUsingIOS = clientId === GOOGLE_IOS_CLIENT_ID;
    const isUsingWeb = clientId === GOOGLE_WEB_CLIENT_ID;
    const clientType = isUsingIOS
      ? '📱 iOS Native Client'
      : isUsingWeb
      ? '🌐 Web Client'
      : '❓ Unknown';

    console.log('✅ Google Client ID configured');
    console.log(`🎯 Using: ${clientType}`);
    console.log(
      `📋 Client ID: ${clientId.substring(0, 12)}...${clientId.substring(
        clientId.length - 8
      )}`
    );
    console.log('📍 Using Supabase OAuth with skipBrowserRedirect');

    const redirectTo = getRedirectUri();
    console.log('🔗 Redirect URI:', redirectTo);

    // Use Supabase OAuth with skipBrowserRedirect and custom scopes
    const scopeString = getOmniiScopesString();
    console.log('🎯 Using providerScopes for Google OAuth:', scopeString);

    // Log Supabase configuration
    console.log('🔍 Supabase instance URL:', (supabase as any).supabaseUrl || 'Not accessible');
    console.log('🔍 Supabase auth config:', JSON.stringify((supabase.auth as any).config || {}, null, 2));
    
    // Start Supabase OAuth request
    const startTime = Date.now();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: scopeString,
      },
    });
    
    const requestTime = Date.now() - startTime;
    console.log(`⏱️ Supabase OAuth URL request took ${requestTime}ms`);

    if (error) {
      console.error('❌ Supabase OAuth initiation failed:', error);
      
      // If Supabase fails and the delay was too long, try immediate approach
      if (requestTime > 1000) {
        console.log('🔄 Request took too long, trying immediate OAuth...');
        return await signInWithGoogleImmediate();
      }
      
      throw error;
    }

    if (!data?.url) {
      throw new Error('No OAuth URL received from Supabase');
    }

    console.log('🌐 Opening Google OAuth in WebBrowser...');
    console.log('🔗 OAuth URL:', data.url);

    if (isUsingWeb) {
      console.log(
        'ℹ️  Note: Web client may show Supabase domain in consent screen'
      );
      console.log(
        '💡 To fix branding: Update OAuth Consent Screen in Google Cloud Console'
      );
    } else if (isUsingIOS) {
      console.log(
        'ℹ️  Note: iOS client should show app name from OAuth Consent Screen'
      );
      console.log(
        '💡 If showing wrong name: Update Application name in Google Cloud Console'
      );
    }

    // Open auth session in WebBrowser (following Supabase docs)
    // Use immediate opening to prevent popup blockers
    const res = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo,
      {
        // Add options to improve mobile compatibility
        showInRecents: false,
        ...(Platform.OS === 'ios' && {
          // iOS specific options
          preferEphemeralSession: true,
        }),
        ...(Platform.OS === 'android' && {
          // Android specific options
          showTitle: false,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
        }),
      }
    );

    console.log('📊 OAuth Session Result:', {
      type: res.type,
      url: res.type === 'success' ? 'Present' : 'N/A',
    });

    if (res.type === 'success') {
      const { url } = res;
      console.log('✅ OAuth success, creating session from URL');
      console.log('🔗 Callback URL length:', url.length);
      console.log('🔗 Callback URL preview:', url.substring(0, 100) + '...');
      
      const session = await createSessionFromUrl(url);
      console.log('🎉 Session created successfully!', session?.user?.email);

      // The auth context will automatically update via the auth state listener
      // No need to manually redirect here
    } else if (res.type === 'cancel') {
      console.log('🚫 OAuth cancelled by user');
      throw new Error('Authentication was cancelled');
    } else if (res.type === 'dismiss') {
      console.log('🚫 OAuth dismissed by user');
      throw new Error('Authentication was dismissed');
    } else if (res.type === 'locked') {
      console.log('🔒 OAuth locked - popup blocker or security restriction');
      throw new Error('Authentication blocked by browser. Please enable popups and try again.');
    } else {
      console.log('❌ OAuth failed with type:', res.type);
      throw new Error(`Authentication failed: ${res.type}`);
    }
  } catch (error) {
    console.error('💥 Google OAuth Error:', error);
    
    // Provide more specific error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('popup') || error.message.includes('blocked')) {
        throw new Error('Login popup was blocked. Please enable popups for this site and try again.');
      } else if (error.message.includes('cancelled') || error.message.includes('dismissed')) {
        throw new Error('Login was cancelled. Please try again.');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
    }
    
    throw error;
  }
};

// Helper function to validate OAuth configuration
export const validateOAuthConfig = (): boolean => {
  const clientId = getGoogleClientId();
  const config = getOAuthConfig();
  return !!(clientId && clientId.length > 0 && config.redirectUri);
};

// Simple OAuth test with minimal scopes for debugging
export const testOAuthWithMinimalScopes = async (): Promise<void> => {
  try {
    console.log('🧪 Testing OAuth with minimal scopes...');
    
    const clientId = getGoogleClientId();
    const redirectTo = getRedirectUri();
    
    console.log('🔧 Test Configuration:');
    console.log('- Client ID:', clientId.substring(0, 20) + '...');
    console.log('- Redirect URI:', redirectTo);
    console.log('- Minimal scopes: openid, profile, email');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'openid profile email', // Minimal scopes only
      },
    });

    if (error) {
      console.error('❌ Minimal OAuth test failed:', error);
      throw error;
    }

    console.log('✅ Minimal OAuth URL generated successfully');
    console.log('🔗 Test URL:', data?.url);
    
    if (data?.url) {
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      console.log('📊 Test Result:', res.type);
      
      if (res.type === 'success') {
        console.log('✅ Minimal OAuth test successful!');
        await createSessionFromUrl(res.url);
      } else {
        console.log('❌ Minimal OAuth test failed:', res.type);
      }
    }
  } catch (error) {
    console.error('💥 OAuth test error:', error);
    throw error;
  }
};

// Test function to check what scopes we actually have access to
export const testGrantedScopes = async (): Promise<void> => {
  try {
    console.log('🧪 Testing granted scopes...');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.provider_token) {
      console.log('❌ No provider token available for testing scopes');
      return;
    }

    console.log('🔑 Provider token available, testing API access...');

    // Test Gmail API access
    try {
      const gmailResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        }
      );

      if (gmailResponse.ok) {
        console.log('✅ Gmail API access: GRANTED');
        const gmailData = await gmailResponse.json();
        console.log('📧 Gmail profile:', gmailData.emailAddress);
      } else {
        console.log('❌ Gmail API access: DENIED');
      }
    } catch (error) {
      console.log('❌ Gmail API test failed:', error);
    }

    // Test Drive API access
    try {
      const driveResponse = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=user',
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        }
      );

      if (driveResponse.ok) {
        console.log('✅ Drive API access: GRANTED');
        const driveData = await driveResponse.json();
        console.log('💾 Drive user:', driveData.user?.displayName);
      } else {
        console.log('❌ Drive API access: DENIED');
      }
    } catch (error) {
      console.log('❌ Drive API test failed:', error);
    }

    // Test Calendar API access
    try {
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        }
      );

      if (calendarResponse.ok) {
        console.log('✅ Calendar API access: GRANTED');
        const calendarData = await calendarResponse.json();
        console.log('📅 Calendar count:', calendarData.items?.length || 0);
      } else {
        console.log('❌ Calendar API access: DENIED');
      }
    } catch (error) {
      console.log('❌ Calendar API test failed:', error);
    }

    console.log('🧪 Scope testing complete');
  } catch (error) {
    console.error('💥 Error testing scopes:', error);
  }
};
