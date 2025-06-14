import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

// ===== REDIRECT URL CONFIGURATION =====
// This file manages all OAuth redirect URLs for different environments and platforms
//
// IMPORTANT: OAuth Flow Explanation
// 1. Google OAuth → Supabase Auth Server (auth.omnii.net/auth/v1/callback)
// 2. Supabase Auth Server → Your App (omnii.net/auth/callback) 
// 3. Your App → Final Destination (omnii.net/tasks)
//
// The URLs in this file are for step 2-3 (Supabase → Your App → Final Destination)

// Environment types
export enum OAuthEnvironment {
  PRODUCTION = 'production',
  STAGING = 'staging', 
  LOCAL = 'local',
  MOBILE = 'mobile',
  UNKNOWN = 'unknown'
}

// Platform types  
export enum OAuthPlatform {
  WEB = 'web',
  MOBILE = 'mobile',
  IOS = 'ios',
  ANDROID = 'android'
}

// Host configuration constants
export const OAUTH_HOSTS = {
  PRODUCTION: 'omnii.net',
  STAGING: 'omnii.net', 
  LOCAL: 'localhost',
  MOBILE_SCHEME: 'omnii-mobile'
} as const;

// OAuth callback paths (what Supabase expects)
export const OAUTH_CALLBACK_PATHS = {
  WEB: '/auth/callback',
  MOBILE: 'auth/callback'
} as const;

// Final destination paths (where users go after OAuth completes)
export const OAUTH_DESTINATION_PATHS = {
  WEB: '/tasks',
  MOBILE: '/' // Mobile will handle routing internally
} as const;

// Complete redirect URL configurations
export const OAUTH_REDIRECT_URLS = {
  // Production URLs
  PRODUCTION_WEB: `https://${OAUTH_HOSTS.PRODUCTION}${OAUTH_CALLBACK_PATHS.WEB}`,
  
  // Staging URLs  
  STAGING_WEB: `https://${OAUTH_HOSTS.STAGING}${OAUTH_CALLBACK_PATHS.WEB}`,
  
  // Local development URLs
  LOCAL_WEB_DEFAULT: `http://${OAUTH_HOSTS.LOCAL}:3000${OAUTH_CALLBACK_PATHS.WEB}`,
  LOCAL_WEB_EXPO: `http://${OAUTH_HOSTS.LOCAL}:8081${OAUTH_CALLBACK_PATHS.WEB}`,
  
  // Mobile URLs
  MOBILE_DEFAULT: `${OAUTH_HOSTS.MOBILE_SCHEME}://${OAUTH_CALLBACK_PATHS.MOBILE}`,
} as const;

// All allowed redirect URLs for Supabase configuration
export const ALL_ALLOWED_REDIRECT_URLS = [
  OAUTH_REDIRECT_URLS.PRODUCTION_WEB,
  OAUTH_REDIRECT_URLS.STAGING_WEB, 
  OAUTH_REDIRECT_URLS.LOCAL_WEB_DEFAULT,
  OAUTH_REDIRECT_URLS.LOCAL_WEB_EXPO,
  OAUTH_REDIRECT_URLS.MOBILE_DEFAULT,
] as const;

// Environment detection interface
export interface EnvironmentConfig {
  environment: OAuthEnvironment;
  platform: OAuthPlatform;
  hostname?: string;
  port?: string;
  oauthRedirectUrl: string;
  finalDestinationUrl: string;
  isSecure: boolean;
}

// Detect current environment and return configuration
export const detectEnvironment = (): EnvironmentConfig => {
  // Mobile platforms (React Native)
  if (Platform.OS === "ios") {
    
    const mobileRedirectUrl = makeRedirectUri({
      scheme: OAUTH_HOSTS.MOBILE_SCHEME,
      path: OAUTH_CALLBACK_PATHS.MOBILE,
    });
    
    return {
      environment: OAuthEnvironment.MOBILE,
      platform: OAuthPlatform.IOS,
      hostname: Platform.OS,
      oauthRedirectUrl: mobileRedirectUrl,
      finalDestinationUrl: mobileRedirectUrl, // Mobile handles internal routing
      isSecure: true // Deep links are considered secure
    };
  }

  // Web platforms  
  if (Platform.OS === 'web' && typeof (globalThis as any).window !== 'undefined' && (globalThis as any).window.location) {
    const { hostname, port, protocol } = (globalThis as any).window.location;
    const isSecure = protocol === 'https:';
    
    // Production environment
    if (hostname === OAUTH_HOSTS.PRODUCTION) {
      return {
        environment: OAuthEnvironment.PRODUCTION,
        platform: OAuthPlatform.WEB,
        hostname,
        oauthRedirectUrl: OAUTH_REDIRECT_URLS.PRODUCTION_WEB,
        finalDestinationUrl: `https://${hostname}${OAUTH_DESTINATION_PATHS.WEB}`,
        isSecure: true
      };
    }
    
    // Staging environment
    if (hostname === OAUTH_HOSTS.STAGING) {
      return {
        environment: OAuthEnvironment.STAGING,
        platform: OAuthPlatform.WEB,
        hostname,
        oauthRedirectUrl: OAUTH_REDIRECT_URLS.STAGING_WEB,
        finalDestinationUrl: `https://${hostname}${OAUTH_DESTINATION_PATHS.WEB}`,
        isSecure: true
      };
    }
    
    // Local development environment
    if (hostname === OAUTH_HOSTS.LOCAL || hostname === '127.0.0.1') {
      const portSuffix = port ? `:${port}` : '';
      const oauthRedirectUrl = `${protocol}//${hostname}${portSuffix}${OAUTH_CALLBACK_PATHS.WEB}`;
      const finalDestinationUrl = `${protocol}//${hostname}${portSuffix}${OAUTH_DESTINATION_PATHS.WEB}`;
      
      return {
        environment: OAuthEnvironment.LOCAL,
        platform: OAuthPlatform.WEB,
        hostname,
        port,
        oauthRedirectUrl,
        finalDestinationUrl,
        isSecure
      };
    }
    
    // Ngrok or other tunnel services
    if (hostname.includes('ngrok') || hostname.includes('tunnels')) {
      const oauthRedirectUrl = `${protocol}//${hostname}${OAUTH_CALLBACK_PATHS.WEB}`;
      const finalDestinationUrl = `${protocol}//${hostname}${OAUTH_DESTINATION_PATHS.WEB}`;
      
      return {
        environment: OAuthEnvironment.LOCAL, // Treat tunnels as local dev
        platform: OAuthPlatform.WEB,
        hostname,
        oauthRedirectUrl,
        finalDestinationUrl,
        isSecure
      };
    }
    
    // Unknown web environment - fallback to production
    return {
      environment: OAuthEnvironment.UNKNOWN,
      platform: OAuthPlatform.WEB,
      hostname,
      oauthRedirectUrl: OAUTH_REDIRECT_URLS.PRODUCTION_WEB,
      finalDestinationUrl: `https://${OAUTH_HOSTS.PRODUCTION}${OAUTH_DESTINATION_PATHS.WEB}`,
      isSecure: true
    };
  }

  // Final fallback - assume mobile if no window object
  const fallbackMobileUrl = OAUTH_REDIRECT_URLS.MOBILE_DEFAULT;
  
  return {
    environment: OAuthEnvironment.MOBILE,
    platform: OAuthPlatform.MOBILE,
    oauthRedirectUrl: fallbackMobileUrl,
    finalDestinationUrl: fallbackMobileUrl,
    isSecure: true
  };
};

// Get OAuth redirect URL (what Supabase needs)
export const getOAuthRedirectUrl = (): string => {
  const config = detectEnvironment();
  
  if (__DEV__) {
  }
  
  return config.oauthRedirectUrl;
};

// Get final destination URL (where to redirect after OAuth)
export const getFinalDestinationUrl = (): string => {
  const config = detectEnvironment();
  return config.finalDestinationUrl;
};

// Check if current environment is mobile
export const isMobileEnvironment = (): boolean => {
  const config = detectEnvironment();
  return config.environment === OAuthEnvironment.MOBILE;
};

// Check if current environment is production
export const isProductionEnvironment = (): boolean => {
  const config = detectEnvironment();
  return config.environment === OAuthEnvironment.PRODUCTION;
};

// Get environment configuration for debugging
export const getEnvironmentConfig = (): EnvironmentConfig => {
  return detectEnvironment();
};

// Validate that a URL is in the allowed redirect URLs list
export const isAllowedRedirectUrl = (url: string): boolean => {
  return ALL_ALLOWED_REDIRECT_URLS.includes(url as any);
};

// Get all redirect URLs for Supabase dashboard configuration
export const getSupabaseRedirectUrlsForConfig = (): string[] => {
  return [...ALL_ALLOWED_REDIRECT_URLS];
};

// Helper to log configuration instructions
export const logSupabaseSetupInstructions = (): void => {
  
  ALL_ALLOWED_REDIRECT_URLS.forEach((url, index) => {
  });
  
};

// Get the Google OAuth callback URL (what you register with Google)
export const getGoogleOAuthCallbackUrl = (): string => {
  const config = detectEnvironment();
  
  // Always use auth.omnii.net for both production and staging
  // as per the requirement to use auth.omnii.net instead of auth.omnii.net
  if (config.environment === OAuthEnvironment.LOCAL) {
    // For local development, you might use a different Supabase instance
    return 'https://auth.omnii.net/auth/v1/callback';
  }
  
  return 'https://auth.omnii.net/auth/v1/callback';
};

// Handle post-OAuth navigation (redirect to final destination)
export const handlePostOAuthNavigation = async (): Promise<void> => {
  const config = detectEnvironment();
  
  
  // For mobile platforms, navigation is handled by the app's routing system
  if (config.environment === OAuthEnvironment.MOBILE) {
    return;
  }
  
  // For web platforms, redirect to the final destination
  if (typeof (globalThis as any).window !== 'undefined' && (globalThis as any).window.location) {
    const currentUrl = (globalThis as any).window.location.href;
    const targetUrl = config.finalDestinationUrl;
    
    // Only redirect if we're not already at the target (check for both clean URL and hash route)
    if (!currentUrl.includes(OAUTH_DESTINATION_PATHS.WEB) && !currentUrl.includes('/(tabs)/tasks')) {
      (globalThis as any).window.location.href = targetUrl;
    } else {
    }
  }
};

// Get setup instructions for developers
export const getSetupInstructions = (): {
  supabaseRedirectUrls: string[];
  environmentConfig: EnvironmentConfig;
  instructions: string[];
} => {
  const config = detectEnvironment();
  
  return {
    supabaseRedirectUrls: getSupabaseRedirectUrlsForConfig(),
    environmentConfig: config,
    instructions: [
      '1. Add all redirect URLs to Supabase Dashboard → Authentication → URL Configuration',
      '2. Ensure Google OAuth client is configured for your environment',
      '3. For web: OAuth redirects to /auth/callback, then navigates to /tasks',
      '4. For mobile: OAuth redirects to deep link, app handles internal routing',
      '5. Test OAuth flow in each environment (local, staging, production, mobile)'
    ]
  };
}; 