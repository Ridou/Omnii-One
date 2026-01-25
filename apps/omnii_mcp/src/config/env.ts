import { z } from 'zod';

export const envSchema = z.object({
  // === Shared Infrastructure (OMNII_* namespace) ===
  // Supabase
  OMNII_SUPABASE_URL: z.string().url().describe('Supabase project URL'),
  OMNII_SUPABASE_ANON_KEY: z.string().min(1).describe('Supabase anon key'),
  OMNII_SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().describe('Supabase service role (server only)'),

  // Neo4j Aura (for provisioning API)
  OMNII_NEO4J_AURA_API_TOKEN: z.string().min(1).optional().describe('Neo4j Aura API token for provisioning'),
  OMNII_NEO4J_AURA_TENANT_ID: z.string().min(1).optional().describe('Neo4j Aura tenant ID'),

  // OpenAI
  OMNII_OPENAI_API_KEY: z.string().startsWith('sk-').describe('OpenAI API key'),

  // Redis
  OMNII_REDIS_URL: z.string().url().optional().describe('Redis connection URL'),

  // === MCP App-Specific (MCP_* namespace) ===
  MCP_BASE_URL: z.string().url().default('http://localhost:8000'),
  MCP_PORT: z.coerce.number().default(8000),

  // === Legacy Neo4j (for existing dev databases, will be per-user in production) ===
  NEO4J_URI: z.string().startsWith('neo4j+s://').optional().describe('Legacy Neo4j URI'),
  NEO4J_USER: z.string().min(1).optional(),
  NEO4J_PASSWORD: z.string().min(1).optional(),
  NEO4J_DATABASE: z.string().default('neo4j'),

  // === n8n Integration ===
  N8N_AGENT_SWARM_URL: z.string().url().optional(),
  N8N_AGENT_ENABLED: z.coerce.boolean().default(false),
  N8N_AGENT_TIMEOUT: z.coerce.number().default(60000),

  // === Third-party APIs ===
  COMPOSIO_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),

  // === Environment ===
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // === Testing ===
  INGESTION_TEST_MODE: z.coerce.boolean().default(false).describe('Enable test mode to bypass OAuth'),
  ADMIN_KEY: z.string().min(1).optional().describe('Admin API key for protected endpoints'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.join('.');
    return `  - ${path}: ${issue.message}`;
  });
  return `Environment validation failed:\n${issues.join('\n')}\n\nCheck .env.example for required variables.`;
}

let _env: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error(formatValidationError(result.error));
    process.exit(1);
  }

  _env = result.data;
  console.log('Environment validated successfully');
  return _env;
}

// Validate immediately on import (fail-fast)
export const env = getEnv();
