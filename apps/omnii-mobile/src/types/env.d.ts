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
      
      // Backend Configuration
      /** Backend base URL for the application */
      EXPO_PUBLIC_BACKEND_BASE_URL: string;
      
      // App Configuration
      /** Current app version */
      EXPO_PUBLIC_APP_VERSION: string;
      /** Current deployment environment */
      EXPO_PUBLIC_ENVIRONMENT: 'development' | 'staging' | 'production';
      
      // Stripe Configuration
      /** Stripe publishable key (starts with pk_) */
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
      
      // Google OAuth Configuration
      /** Google OAuth web client ID */
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: string;

      // MCP Backend Configuration
      /** MCP backend server URL */
      EXPO_PUBLIC_MCP_BASE_URL?: string;

      // PowerSync Configuration
      /** PowerSync cloud URL (optional, for PowerSync Cloud) */
      EXPO_PUBLIC_POWERSYNC_URL?: string;

      // === SERVER-SIDE ONLY ===
      // OAuth Configuration
      /** Google OAuth client secret (server-side only) */
      GOOGLE_CLIENT_SECRET: string;
      
      // CORS Configuration
      /** CORS allowed origins for API requests */
      CORS_ORIGINS: string;
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
  };
  
  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
  };
  
  // Stripe Payment Configuration
  stripe: {
    publishableKey: string;
  };
  
  // OAuth Provider Configuration
  oauth: {
    google: {
      webClientId: string;
      clientSecret?: string; // Server-side only
    };
  };
  
  // CORS Configuration
  cors: {
    origins: string[];
  };

  // MCP Backend Configuration
  mcp: {
    baseUrl: string;
  };

  // PowerSync Configuration
  powerSync: {
    url: string;
  };
}

// This export ensures the file is treated as a module
export {}; 