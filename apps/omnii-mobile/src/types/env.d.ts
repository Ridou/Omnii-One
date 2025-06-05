/**
 * Environment Variables Type Declarations for OMNII
 * This file provides type safety and documentation for all environment variables
 * while keeping actual secrets in .env (which is git-ignored)
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // === NODE/EXPO CORE ===
      /** Node environment mode */
      NODE_ENV: 'development' | 'production' | 'test';
      
      // === EXPO PUBLIC VARIABLES (Accessible in React Native) ===
      // Supabase Configuration
      /** Supabase project URL */
      EXPO_PUBLIC_SUPABASE_URL: string;
      /** Supabase anonymous/public key */
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      
      // Stripe Public Configuration
      /** Stripe publishable key (starts with pk_) */
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
      
      // App Configuration
      /** Current app version */
      EXPO_PUBLIC_APP_VERSION: string;
      /** Backend base URL for the application (includes API and WebSocket) */
      EXPO_PUBLIC_BACKEND_BASE_URL: string;
      /** Current deployment environment */
      EXPO_PUBLIC_ENVIRONMENT: 'development' | 'staging' | 'production';
      
      // === SERVER-SIDE ONLY (Supabase Edge Functions & Backend) ===
      // Supabase Server Configuration
      /** Supabase service role key (server-side only) */
      SUPABASE_SERVICE_ROLE_KEY: string;
      /** JWT secret for token verification */
      SUPABASE_JWT_SECRET: string;
      
      // Stripe Secret Configuration
      /** Stripe secret key (starts with sk_) */
      STRIPE_SECRET_KEY: string;
      /** Stripe webhook secret for signature verification */
      STRIPE_WEBHOOK_SECRET: string;
      /** Stripe price ID for monthly subscription */
      STRIPE_MONTHLY_PRICE_ID: string;
      /** Stripe price ID for yearly subscription */
      STRIPE_YEARLY_PRICE_ID: string;
      
      // OAuth Provider Configuration
      /** Google OAuth client ID */
      GOOGLE_CLIENT_ID: string;
      /** Google OAuth client secret */
      GOOGLE_CLIENT_SECRET: string;
      /** Apple OAuth client ID */
      APPLE_CLIENT_ID: string;
      /** Apple OAuth client secret */
      APPLE_CLIENT_SECRET: string;
      /** Discord OAuth client ID */
      DISCORD_CLIENT_ID: string;
      /** Discord OAuth client secret */
      DISCORD_CLIENT_SECRET: string;
      
      // AI Service Configuration
      /** OpenAI API key for AI features */
      OPENAI_API_KEY: string;
      /** Anthropic API key for Claude integration */
      ANTHROPIC_API_KEY: string;
      
      // Email Service Configuration
      /** Resend API key for transactional emails */
      RESEND_API_KEY: string;
      /** SendGrid API key (alternative email service) */
      SENDGRID_API_KEY: string;
      
      // Analytics & Monitoring
      /** Sentry DSN for error tracking */
      SENTRY_DSN: string;
      /** Mixpanel project token for analytics */
      MIXPANEL_PROJECT_TOKEN: string;
      /** PostHog API key for product analytics */
      POSTHOG_API_KEY: string;
      
      // Database Configuration
      /** Primary database connection string */
      DATABASE_URL: string;
      /** Redis connection string for caching */
      REDIS_URL: string;
      
      // File Storage (AWS S3)
      /** AWS access key ID */
      AWS_ACCESS_KEY_ID: string;
      /** AWS secret access key */
      AWS_SECRET_ACCESS_KEY: string;
      /** S3 bucket name for file storage */
      AWS_S3_BUCKET: string;
      /** AWS region */
      AWS_REGION: string;
      
      // Security Configuration
      /** JWT secret for application tokens */
      JWT_SECRET: string;
      /** Encryption key for sensitive data */
      ENCRYPTION_KEY: string;
      
      // Feature Flags
      /** Enable beta features in the app */
      ENABLE_BETA_FEATURES: 'true' | 'false';
      /** Enable debug mode with additional logging */
      ENABLE_DEBUG_MODE: 'true' | 'false';
      /** Enable analytics tracking */
      ENABLE_ANALYTICS: 'true' | 'false';
      /** Enable push notifications */
      ENABLE_PUSH_NOTIFICATIONS: 'true' | 'false';
      
      // Development & Testing
      /** Ngrok tunnel URL for development */
      NGROK_URL: string;
      /** Test database URL */
      TEST_DATABASE_URL: string;
      /** Mock external APIs in development */
      MOCK_EXTERNAL_APIS: 'true' | 'false';
    }
  }
}

/**
 * Typed Environment Configuration Interface
 * Provides organized and validated access to environment variables
 */
export interface EnvironmentConfig {
  // Application Configuration
  app: {
    version: string;
    environment: 'development' | 'staging' | 'production';
    backendBaseUrl: string;
    enableBetaFeatures: boolean;
    enableDebugMode: boolean;
    enableAnalytics: boolean;
    enablePushNotifications: boolean;
  };
  
  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string; // Server-side only
    jwtSecret?: string; // Server-side only
  };
  
  // Stripe Payment Configuration
  stripe: {
    publishableKey: string;
    secretKey?: string; // Server-side only
    webhookSecret?: string; // Server-side only
    pricing: {
      monthlyPriceId?: string; // Server-side only
      yearlyPriceId?: string; // Server-side only
    };
  };
  
  // OAuth Provider Configuration
  oauth: {
    google: {
      clientId: string;
      clientSecret?: string; // Server-side only
    };
    apple: {
      clientId: string;
      clientSecret?: string; // Server-side only
    };
    discord: {
      clientId: string;
      clientSecret?: string; // Server-side only
    };
  };
  
  // AI Services Configuration
  ai: {
    openai?: {
      apiKey: string; // Server-side only
      model?: string;
    };
    anthropic?: {
      apiKey: string; // Server-side only
      model?: string;
    };
  };
  
  // Email Services Configuration
  email: {
    resend?: {
      apiKey: string; // Server-side only
    };
    sendgrid?: {
      apiKey: string; // Server-side only
    };
  };
  
  // Analytics Configuration
  analytics: {
    enabled: boolean;
    sentry?: {
      dsn: string;
    };
    mixpanel?: {
      projectToken: string;
    };
    posthog?: {
      apiKey: string;
    };
  };
  
  // Database Configuration
  database: {
    url?: string; // Server-side only
    redis?: {
      url: string; // Server-side only
    };
  };
  
  // File Storage Configuration
  storage: {
    aws?: {
      accessKeyId: string; // Server-side only
      secretAccessKey: string; // Server-side only
      bucket: string;
      region: string;
    };
  };
  
  // Security Configuration
  security: {
    jwtSecret?: string; // Server-side only
    encryptionKey?: string; // Server-side only
  };
  
  // Development Configuration
  development: {
    ngrokUrl?: string;
    mockExternalApis: boolean;
    testDatabaseUrl?: string;
  };
} 