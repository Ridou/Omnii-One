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

  // Configuration validation removed for production
  
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
  const { params, errorCode } = QueryParams.getQueryParams(url);


  if (errorCode) {
    throw new Error(errorCode);
  }

  const { access_token, refresh_token, code, scope } = params;

  // Log any scope information from the callback
  if (scope) {
  }

  // If we have access_token, use setSession
  if (access_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      throw error;
    }


    // Log session details including any provider token info
    if (data.session?.provider_token) {
    }

    // Try to get user metadata which might contain scope info
    if (data.session?.user?.user_metadata) {
      // User metadata logging removed for production
    }

    // 🆕 Store OAuth tokens (non-blocking side effect)
    if (data.session) {
      storeOAuthTokens(data.session).catch((error) => {
      });
    }

    return data.session;
  }

  // If we have authorization code, exchange it for session
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }


    // Log session details including any provider token info
    if (data.session?.provider_token) {
    }

    // Try to get user metadata which might contain scope info
    if (data.session?.user?.user_metadata) {
      // User metadata logging removed for production
    }

    // Log the full session object to see what scope info is available
    // Session data logging removed for production

    // 🆕 Store OAuth tokens (non-blocking side effect)
    if (data.session) {
      storeOAuthTokens(data.session).catch((error) => {
      });
    }

    return data.session;
  }

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
    
    const redirectTo = getRedirectUri();
    const oauthUrl = buildGoogleOAuthUrl(redirectTo);
    
    
    // Open immediately without any delays
    const res = await WebBrowser.openAuthSessionAsync(
      oauthUrl,
      redirectTo,
      {
        showInRecents: false,
        ...(Platform.OS === 'ios' && {
          preferEphemeralSession: true,
        }),
      }
    );

    if (res.type === 'success') {
      const { url } = res;
      
      // For direct OAuth, we need to handle the code differently
      // This would require implementing the OAuth code exchange manually
      // For now, fall back to Supabase flow
      const session = await createSessionFromUrl(url);
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
    throw error;
  }
};

// Enhanced Supabase OAuth flow with fallback to immediate approach
export const signInWithGoogle = async (): Promise<void> => {
  try {
    // OAuth flow start logged for debugging

    // Check if Google OAuth is properly configured
    const clientId = getGoogleClientId();
    if (!clientId || clientId.length === 0) {
      throw new Error(
        'Google OAuth is not configured. Please add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to your environment variables.'
      );
    }

    // Get and log the scopes we're requesting
    const requestedScopes = getOmniiScopes();

    // Log which client type is being used
    const isUsingIOS = clientId === GOOGLE_IOS_CLIENT_ID;
    const isUsingWeb = clientId === GOOGLE_WEB_CLIENT_ID;
    const clientType = isUsingIOS
      ? '📱 iOS Native Client'
      : isUsingWeb
      ? '🌐 Web Client'
      : '❓ Unknown';

    // Client ID logging removed for production

    const redirectTo = getRedirectUri();

    // Use Supabase OAuth with skipBrowserRedirect and custom scopes
    const scopeString = getOmniiScopesString();

    // Log Supabase configuration
    
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

    if (error) {
      
      // If Supabase fails and the delay was too long, try immediate approach
      if (requestTime > 1000) {
        return await signInWithGoogleImmediate();
      }
      
      throw error;
    }

    if (!data?.url) {
      throw new Error('No OAuth URL received from Supabase');
    }


    if (isUsingWeb) {
      // Web client branding notes logged for debugging
    } else if (isUsingIOS) {
      // iOS client branding notes logged for debugging
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
      }
    );

    // Auth session result logged for debugging

    if (res.type === 'success') {
      const { url } = res;
      
      const session = await createSessionFromUrl(url);

      // The auth context will automatically update via the auth state listener
      // No need to manually redirect here
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
    
    const clientId = getGoogleClientId();
    const redirectTo = getRedirectUri();
    
    
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
      throw error;
    }

    
    if (data?.url) {
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      
      if (res.type === 'success') {
        await createSessionFromUrl(res.url);
      } else {
      }
    }
  } catch (error) {
    throw error;
  }
};

// Test function to check what scopes we actually have access to
export const testGrantedScopes = async (): Promise<void> => {
  try {

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.provider_token) {
      return;
    }


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
        const gmailData = await gmailResponse.json();
      } else {
      }
    } catch (error) {
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
        const driveData = await driveResponse.json();
      } else {
      }
    } catch (error) {
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
        const calendarData = await calendarResponse.json();
      } else {
      }
    } catch (error) {
    }

  } catch (error) {
  }
};
