import type { EnvironmentConfig } from '~/types/env';
import Constants from 'expo-constants';

/**
 * Environment Variable Validation Schema
 * Defines required and optional environment variables by context
 */
export const ENV_VALIDATION = {
  required: {
    // Required for React Native client
    client: [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_BACKEND_BASE_URL',
      'EXPO_PUBLIC_APP_VERSION',
      'EXPO_PUBLIC_ENVIRONMENT',
      'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    ] as const,
    
    // Required for server-side operations (if needed)
    server: [
      'GOOGLE_CLIENT_SECRET',
      'CORS_ORIGINS',
    ] as const,
  },
} as const;

/**
 * Environment variable groups for easier management
 */
export const ENV_GROUPS = {
  CORE: ['NODE_ENV', 'EXPO_PUBLIC_ENVIRONMENT'],
  SUPABASE: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'],
  STRIPE: ['EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
  OAUTH: ['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  CORS: ['CORS_ORIGINS'],
} as const;

/**
 * Utility to check if we're running on web platform
 */
const isWeb = () => {
  try {
    return typeof globalThis !== 'undefined' && 'window' in globalThis;
  } catch {
    return false;
  }
};

/**
 * Validates required environment variables with graceful handling for different platforms
 */
const validateEnvironmentVariables = (context: 'client' | 'server' = 'client') => {
  try {
    const requiredVars = ENV_VALIDATION.required[context];
    const missing: string[] = [];

    for (const envVar of requiredVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    if (missing.length > 0) {
      const errorMessage = `Missing required environment variables for ${context}: ${missing.join(', ')}`;
      
      // Different handling based on context and platform
      if (context === 'server') {
        // Server-side should always fail hard if missing required vars
        console.error(errorMessage);
        if (process.env.NODE_ENV === 'production') {
          throw new Error(errorMessage);
        }
        console.warn('⚠️ Missing server environment variables in development mode');
      } else {
        // Client-side handling - more graceful for web deployments
        console.warn(`⚠️ ${errorMessage}`);
        
        if (isWeb()) {
          // For web, just log warning and continue - env vars might be loaded differently
          console.warn('🌐 Web deployment detected - continuing with available environment variables');
          console.warn('📝 Some features may have limited functionality until environment variables are properly configured');
          console.warn('🔧 Check your deployment environment variables configuration');
        } else {
          // For mobile, be more strict in production but still don't throw
          if (process.env.NODE_ENV === 'production') {
            console.error('📱 Mobile production build missing critical environment variables');
            console.error('🚨 This may cause runtime errors - please configure missing variables');
          } else {
            console.warn('📱 Mobile development build - missing environment variables');
          }
        }
      }
    }
  } catch (error) {
    console.error('Error validating environment variables:', error);
  }
};

/**
 * Type-safe environment configuration with improved fallbacks
 * Validates and organizes environment variables with proper fallbacks
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  // Validate client-side requirements (now with graceful handling)
  validateEnvironmentVariables('client');

  const extra = Constants.expoConfig?.extra || {};
  
  return {
    app: {
      version: process.env.EXPO_PUBLIC_APP_VERSION || extra.appVersion || '1.0.0',
      environment: (process.env.EXPO_PUBLIC_ENVIRONMENT as 'development' | 'staging' | 'production') || 
                   (extra.environment as 'development' | 'staging' | 'production') || 'development',
      backendBaseUrl: process.env.EXPO_PUBLIC_BACKEND_BASE_URL || extra.backendBaseUrl || '',
    },
    
    supabase: {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '',
      anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '',
    },
    
    stripe: {
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    },
    
    oauth: {
      google: {
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Server-side only
      },
    },
    
    cors: {
      origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    },
  };
};

// ✅ REPLACE WITH LAZY GETTER
let _env: EnvironmentConfig | null = null;

export const getEnv = (): EnvironmentConfig => {
  if (!_env) {
    _env = getEnvironmentConfig();
  }
  return _env;
};

// ✅ ADD GETTER FOR COMPATIBILITY  
export const env = new Proxy({} as EnvironmentConfig, {
  get(target, prop) {
    return getEnv()[prop as keyof EnvironmentConfig];
  }
});

/**
 * Utility to check if we're in development mode
 */
export const isDevelopment = () => env.app.environment === 'development';

/**
 * Utility to check if we're in production mode
 */
export const isProduction = () => env.app.environment === 'production';

/**
 * Utility to get Stripe configuration
 */
export const getStripeConfig = () => {
  const envConfig = getEnv();
  return {
    publishableKey: envConfig.stripe.publishableKey,
  };
};

/**
 * Utility to get Supabase configuration
 */
export const getSupabaseConfig = () => {
  const envConfig = getEnv();
  return {
    url: envConfig.supabase.url,
    anonKey: envConfig.supabase.anonKey,
  };
};

/**
 * Utility to get Google OAuth configuration
 */
export const getGoogleOAuthConfig = () => {
  const envConfig = getEnv();
  return {
    webClientId: envConfig.oauth.google.webClientId,
    // Client secret is server-side only
    ...(envConfig.oauth.google.clientSecret && { 
      clientSecret: envConfig.oauth.google.clientSecret 
    }),
  };
};

/**
 * Utility to get API URL from backend base URL
 */
export const getApiUrl = () => {
  const baseUrl = env.app.backendBaseUrl;
  return baseUrl ? `${baseUrl}/api` : '';
};

/**
 * Utility to get WebSocket URL from backend base URL
 */
export const getWebSocketUrl = () => {
  const baseUrl = env.app.backendBaseUrl;
  if (!baseUrl) return '';
  
  // Check if we're in React Native (not web)
  const isReactNative = !isWeb();
  
  // For React Native development, replace localhost with accessible IP
  if (isReactNative && baseUrl.includes('localhost')) {
    console.log('🔧 [getWebSocketUrl] Detected React Native development mode');
    console.log('🔧 [getWebSocketUrl] Original baseUrl:', baseUrl);
    
    // Try to get the Metro bundler host (where Expo is running from)
    const hostUri = Constants.expoConfig?.hostUri;
    
    if (hostUri) {
      // Extract the IP from the host URI
      const ipMatch = hostUri.match(/([^:]+)/);
      if (ipMatch) {
        const expoIP = ipMatch[1];
        // Extract port from original baseUrl
        const portMatch = baseUrl.match(/:(\d+)/);
        const port = portMatch ? portMatch[1] : '8000';
        const wsUrl = `ws://${expoIP}:${port}/ws`;
        console.log('🔧 [getWebSocketUrl] Using Expo host IP:', expoIP);
        console.log('🔧 [getWebSocketUrl] WebSocket URL:', wsUrl);
        return wsUrl;
      }
    }
    
    // Fallback: use the machine's IP we found
    const localIP = '10.201.235.37';
    const portMatch = baseUrl.match(/:(\d+)/);
    const port = portMatch ? portMatch[1] : '8000';
    const fallbackUrl = `ws://${localIP}:${port}/ws`;
    console.log('🔧 [getWebSocketUrl] Using fallback IP:', localIP);
    console.log('🔧 [getWebSocketUrl] Fallback WebSocket URL:', fallbackUrl);
    return fallbackUrl;
  }
  
  // For production or web, convert HTTP(S) to WS(S) and add /ws path
  let wsUrl = baseUrl.replace(/^https?:/, baseUrl.startsWith('https:') ? 'wss:' : 'ws:');
  if (!wsUrl.endsWith('/ws')) {
    wsUrl += '/ws';
  }
  console.log('🔧 [getWebSocketUrl] Production/Web WebSocket URL:', wsUrl);
  return wsUrl;
};

/**
 * Utility to log environment configuration (without secrets)
 */
export const logEnvironmentInfo = () => {
  if (isDevelopment()) {
    console.log('🔧 OMNII Environment Configuration:', {
      version: env.app.version,
      environment: env.app.environment,
      backend: {
        baseUrl: env.app.backendBaseUrl,
        apiUrl: getApiUrl(),
        websocketUrl: getWebSocketUrl(),
      },
      services: {
        supabase: !!env.supabase.url,
        stripe: !!env.stripe.publishableKey,
        google: !!env.oauth.google.webClientId,
      },
      cors: {
        origins: env.cors.origins,
      },
    });
  }
}; 