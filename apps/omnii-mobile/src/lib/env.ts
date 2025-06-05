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
      'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_APP_VERSION',
      'EXPO_PUBLIC_ENVIRONMENT',
    ] as const,
    
    // Required for server-side operations (Supabase Edge Functions)
    server: [
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_MONTHLY_PRICE_ID',
      'STRIPE_YEARLY_PRICE_ID',
    ] as const,
  },
  
  optional: {
    // Optional for client-side
    client: [
      'EXPO_PUBLIC_BACKEND_BASE_URL',
    ] as const,
    
    // Optional for server-side
    server: [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'RESEND_API_KEY',
      'SENDGRID_API_KEY',
      'SENTRY_DSN',
      'MIXPANEL_PROJECT_TOKEN',
      'POSTHOG_API_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'GOOGLE_CLIENT_SECRET',
      'APPLE_CLIENT_SECRET',
      'DISCORD_CLIENT_SECRET',
    ] as const,
  },
} as const;

/**
 * Environment variable groups for easier management
 */
export const ENV_GROUPS = {
  CORE: ['NODE_ENV', 'EXPO_PUBLIC_ENVIRONMENT'],
  SUPABASE: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  STRIPE: ['EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  OAUTH: ['GOOGLE_CLIENT_ID', 'APPLE_CLIENT_ID', 'DISCORD_CLIENT_ID'],
  AI: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
  ANALYTICS: ['SENTRY_DSN', 'MIXPANEL_PROJECT_TOKEN', 'POSTHOG_API_KEY'],
  FEATURE_FLAGS: ['ENABLE_BETA_FEATURES', 'ENABLE_DEBUG_MODE', 'ENABLE_ANALYTICS'],
} as const;

/**
 * Validates required environment variables with graceful handling for different platforms
 */
const validateEnvironmentVariables = (context: 'client' | 'server' = 'client') => {
  // Add this try-catch wrapper for Vercel builds
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
    // ✅ ADDED: Catch any validation errors during Vercel build
    console.warn('⚠️ Environment validation failed during build:', error);
    if (context === 'server') {
      // Only throw for server context
      throw error;
    }
    // For client context, just warn and continue
    console.warn('🌐 Continuing with environment validation bypass for web build');
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
      version: extra.appVersion || '1.0.0',
      environment: (extra.environment as 'development' | 'staging' | 'production') || 'development',
      backendBaseUrl: (() => {
        let baseUrl = extra.backendApiUrl;
        // Strip /api suffix if present to get the true base URL
        if (baseUrl && baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.replace(/\/api$/, '');
        }
        return baseUrl;
      })(),
      enableBetaFeatures: process.env.ENABLE_BETA_FEATURES === 'true',
      enableDebugMode: process.env.ENABLE_DEBUG_MODE === 'true' || __DEV__,
      enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
      enablePushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
    },
    
    supabase: {
      url: extra.supabaseUrl || '',
      anonKey: extra.supabaseAnonKey || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Server-side only
      jwtSecret: process.env.SUPABASE_JWT_SECRET, // Server-side only
    },
    
    stripe: {
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY, // Server-side only
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // Server-side only
      pricing: {
        monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
        yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID,
      },
    },
    
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID || '',
        clientSecret: process.env.APPLE_CLIENT_SECRET,
      },
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID || '',
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
      },
    },
    
    ai: {
      openai: process.env.OPENAI_API_KEY ? {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4-turbo-preview',
      } : undefined,
      anthropic: process.env.ANTHROPIC_API_KEY ? {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-sonnet-20240229',
      } : undefined,
    },
    
    email: {
      resend: process.env.RESEND_API_KEY ? {
        apiKey: process.env.RESEND_API_KEY,
      } : undefined,
      sendgrid: process.env.SENDGRID_API_KEY ? {
        apiKey: process.env.SENDGRID_API_KEY,
      } : undefined,
    },
    
    analytics: {
      enabled: process.env.ENABLE_ANALYTICS === 'true',
      sentry: process.env.SENTRY_DSN ? {
        dsn: process.env.SENTRY_DSN,
      } : undefined,
      mixpanel: process.env.MIXPANEL_PROJECT_TOKEN ? {
        projectToken: process.env.MIXPANEL_PROJECT_TOKEN,
      } : undefined,
      posthog: process.env.POSTHOG_API_KEY ? {
        apiKey: process.env.POSTHOG_API_KEY,
      } : undefined,
    },
    
    database: {
      url: process.env.DATABASE_URL,
      redis: process.env.REDIS_URL ? {
        url: process.env.REDIS_URL,
      } : undefined,
    },
    
    storage: {
      aws: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucket: process.env.AWS_S3_BUCKET || 'omnii-uploads',
        region: process.env.AWS_REGION || 'us-east-1',
      } : undefined,
    },
    
    security: {
      jwtSecret: process.env.JWT_SECRET,
      encryptionKey: process.env.ENCRYPTION_KEY,
    },
    
    development: {
      ngrokUrl: process.env.NGROK_URL,
      mockExternalApis: process.env.MOCK_EXTERNAL_APIS === 'true',
      testDatabaseUrl: process.env.TEST_DATABASE_URL,
    },
  };
};

/**
 * Server-side environment validation
 * Use this in Supabase Edge Functions to validate server requirements
 */
export const validateServerEnvironment = () => {
  validateEnvironmentVariables('server');
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
export const isDevelopment = env.app.environment === 'development';

/**
 * Utility to check if we're in production mode
 */
export const isProduction = env.app.environment === 'production';

/**
 * Utility to get the appropriate API URL based on environment
 */
export const getApiUrl = (path = '') => {
  const envConfig = getEnv();
  const extra = Constants.expoConfig?.extra || {};
  
  // Use backendApiUrl if provided, otherwise fallback to localhost
  const baseUrl = extra.backendApiUrl;
  
  // Ensure proper path joining - API endpoints are at /api
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/api${cleanPath}`;
};

/**
 * Utility to get the WebSocket URL based on environment
 */
export const getWebSocketUrl = () => {
  const envConfig = getEnv();
  const extra = Constants.expoConfig?.extra || {};
  
  // Build WebSocket URL from base backend URL (not API URL)
  let baseUrl = extra.backendApiUrl;
  
  // Strip /api suffix if present, since WebSocket is at root level
  if (baseUrl && baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.replace(/\/api$/, '');
  }
  
  // Convert http(s) to ws(s) and add /ws path directly to base URL
  return baseUrl.replace(/^http/, 'ws') + '/ws';
};

/**
 * Utility to get the backend base URL
 */
export const getBackendBaseUrl = () => {
  const envConfig = getEnv();
  const extra = Constants.expoConfig?.extra || {};
  let baseUrl = extra.backendApiUrl;
  
  // Strip /api suffix if present to get the true base URL
  if (baseUrl && baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.replace(/\/api$/, '');
  }
  
  return baseUrl;
};

/**
 * Utility to construct full backend URLs for different endpoints
 */
export const getBackendUrls = () => {
  const baseUrl = getBackendBaseUrl();
  
  return {
    base: baseUrl,
    api: getApiUrl(),
    websocket: getWebSocketUrl(),
    health: `${baseUrl}/health`,
    swagger: `${baseUrl}/swagger`,
  };
};

/**
 * Utility to get Stripe configuration based on environment
 */
export const getStripeConfig = () => {
  const envConfig = getEnv();
  return {
    publishableKey: envConfig.stripe.publishableKey,
    // Note: Secret keys are only available server-side
    ...(envConfig.stripe.secretKey && { secretKey: envConfig.stripe.secretKey }),
    ...(envConfig.stripe.webhookSecret && { webhookSecret: envConfig.stripe.webhookSecret }),
    pricing: envConfig.stripe.pricing,
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
    // Note: Service role key is only available server-side
    ...(envConfig.supabase.serviceRoleKey && { serviceRoleKey: envConfig.supabase.serviceRoleKey }),
  };
};

/**
 * Utility to check if feature flags are enabled
 */
export const isFeatureEnabled = (feature: keyof typeof env.app) => {
  return env.app[feature] === true;
};

/**
 * Utility to log environment configuration (without secrets)
 */
export const logEnvironmentInfo = () => {
  if (isDevelopment) {
    console.log('🔧 OMNII Environment Configuration:', {
      version: env.app.version,
      environment: env.app.environment,
      backend: {
        baseUrl: env.app.backendBaseUrl,
        apiUrl: getApiUrl(),
        websocketUrl: getWebSocketUrl(),
      },
      features: {
        betaFeatures: env.app.enableBetaFeatures,
        debugMode: env.app.enableDebugMode,
        analytics: env.app.enableAnalytics,
        pushNotifications: env.app.enablePushNotifications,
      },
      services: {
        supabase: !!env.supabase.url,
        stripe: !!env.stripe.publishableKey,
        openai: !!env.ai.openai,
        anthropic: !!env.ai.anthropic,
        analytics: env.analytics.enabled,
      },
    });
  }
}; 