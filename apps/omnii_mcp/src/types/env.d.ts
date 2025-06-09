/**
 * Environment Variables Type Declarations for OMNII MCP
 * This file provides type safety and documentation for all environment variables
 * while keeping actual secrets in .env (which is git-ignored)
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // === NODE.JS CORE ===
      /** Node environment mode */
      NODE_ENV: 'development' | 'production' | 'test';
      /** Server port number */
      PORT: string;

      // === SUPABASE CONFIGURATION (CRITICAL) ===
      /** Supabase project URL */
      SUPABASE_URL: string;
      /** Supabase anonymous/public key */
      SUPABASE_ANON_KEY: string;

      // === NEO4J DATABASE CONFIGURATION (CRITICAL) ===
      /** Neo4j database connection URI */
      NEO4J_URI: string;
      /** Neo4j database username */
      NEO4J_USER: string;
      /** Neo4j database password */
      NEO4J_PASSWORD: string;
      /** Neo4j database name */
      NEO4J_DATABASE: string;

      // === JWT/OAUTH SECURITY (CRITICAL) ===
      /** JWT secret key for token signing (minimum 32 characters) */
      JWT_SECRET: string;
      /** OAuth encryption key for secure data (minimum 64 characters) */
      OAUTH_ENCRYPTION_KEY: string;
      /** JWT token issuer identifier */
      JWT_ISSUER: string;

      // === AI INTEGRATION ===
      /** OpenAI API key for AI services */
      OPENAI_API_KEY: string;

      // === REDIS CACHE ===
      /** Redis connection URL for caching */
      REDIS_URL: string;

      // === CORS CONFIGURATION ===
      /** Comma-separated list of allowed CORS origins */
      CORS_ORIGINS: string;

      // === GOOGLE OAUTH PROVIDER ===
      /** Google OAuth client ID */
      GOOGLE_CLIENT_ID?: string;
      /** Google OAuth client secret */
      GOOGLE_CLIENT_SECRET?: string;

      // === SLACK OAUTH PROVIDER ===
      /** Slack OAuth client ID */
      SLACK_CLIENT_ID?: string;
      /** Slack OAuth client secret */
      SLACK_CLIENT_SECRET?: string;

      // === NOTION OAUTH PROVIDER ===
      /** Notion OAuth client ID */
      NOTION_CLIENT_ID?: string;
      /** Notion OAuth client secret */
      NOTION_CLIENT_SECRET?: string;

      // === GITHUB OAUTH PROVIDER ===
      /** GitHub OAuth client ID */
      GITHUB_CLIENT_ID?: string;
      /** GitHub OAuth client secret */
      GITHUB_CLIENT_SECRET?: string;

      // === MICROSOFT OAUTH PROVIDER ===
      /** Microsoft OAuth client ID */
      MICROSOFT_CLIENT_ID?: string;
      /** Microsoft OAuth client secret */
      MICROSOFT_CLIENT_SECRET?: string;

      // === TESTING CONFIGURATION ===
      /** Test environment identifier */
      OMNII_TEST_ENV?: string;
      /** OAuth redirect URI for testing */
      TEST_OAUTH_REDIRECT_URI?: string;
    }
  }
}

/**
 * Typed Environment Configuration Interface
 * Provides organized and validated access to environment variables
 */
export interface EnvironmentConfig {
  // Server Configuration
  server: {
    environment: 'development' | 'production' | 'test';
    port: number;
  };

  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
  };

  // Neo4j Database Configuration
  neo4j: {
    uri: string;
    user: string;
    password: string;
    database: string;
  };

  // Security Configuration
  security: {
    jwtSecret: string;
    oauthEncryptionKey: string;
    jwtIssuer: string;
  };

  // AI Services Configuration
  ai: {
    openaiApiKey: string;
  };

  // Cache Configuration
  cache: {
    redisUrl: string;
  };

  // CORS Configuration
  cors: {
    origins: string[];
  };

  // OAuth Providers Configuration
  oauth: {
    google?: {
      clientId: string;
      clientSecret: string;
    };
    slack?: {
      clientId: string;
      clientSecret: string;
    };
    notion?: {
      clientId: string;
      clientSecret: string;
    };
    github?: {
      clientId: string;
      clientSecret: string;
    };
    microsoft?: {
      clientId: string;
      clientSecret: string;
    };
  };

  // Testing Configuration
  testing?: {
    environment: string;
    oauthRedirectUri: string;
  };
}

/**
 * Environment Variable Validation Helper
 * Validates that all required environment variables are present
 */
export function validateEnvironmentVariables(): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
} {
  const required = [
    'NODE_ENV',
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'NEO4J_URI',
    'NEO4J_USER',
    'NEO4J_PASSWORD',
    'NEO4J_DATABASE',
    'JWT_SECRET',
    'OAUTH_ENCRYPTION_KEY',
    'JWT_ISSUER',
    'OPENAI_API_KEY',
    'REDIS_URL',
    'CORS_ORIGINS'
  ];

  const optional = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SLACK_CLIENT_ID',
    'SLACK_CLIENT_SECRET',
    'NOTION_CLIENT_ID',
    'NOTION_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'MICROSOFT_CLIENT_ID',
    'MICROSOFT_CLIENT_SECRET',
    'OMNII_TEST_ENV',
    'TEST_OAUTH_REDIRECT_URI'
  ];

  const missing = required.filter(key => !process.env[key]);
  const warnings = optional.filter(key => !process.env[key]);

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

// This export ensures the file is treated as a module
export {}; 