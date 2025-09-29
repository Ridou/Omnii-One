import { z } from 'zod/v4';

const Neo4jConfigSchema = z.object({
  // Neo4j AuraDB Configuration
  NEO4J_URI: z.string().startsWith('neo4j+s://').describe('AuraDB connection URI'),
  NEO4J_USER: z.string().min(1).describe('Neo4j username'),
  NEO4J_PASSWORD: z.string().min(1).describe('Neo4j password'),
  NEO4J_DATABASE: z.string().default('neo4j').describe('Neo4j database name'),
  
  // Brain Memory Configuration
  MEMORY_BRIDGE_ENABLED: z.coerce.boolean().default(true),
  MEMORY_CONSOLIDATION_INTERVAL: z.coerce.number().int().default(86400), // 24 hours
  CONCEPT_DISCOVERY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  TOOL_RECOMMENDATION_LIMIT: z.coerce.number().int().default(5),
  CONTEXT_ENRICHMENT_ENABLED: z.coerce.boolean().default(true),
  PREDICTIVE_CHAINING_ENABLED: z.coerce.boolean().default(true),
  
  // Performance Configuration  
  MEMORY_CACHE_TTL: z.coerce.number().int().default(3600), // 1 hour
  CONTEXT_RETRIEVAL_TIMEOUT: z.coerce.number().int().default(200), // milliseconds
  PATTERN_ANALYSIS_BATCH_SIZE: z.coerce.number().int().default(100),
  
  // Integration Keys
  OPENAI_API_KEY: z.string().startsWith('sk-').describe('OpenAI API key'),
  COMPOSIO_API_KEY: z.string().min(1).describe('Composio API key'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').describe('Anthropic API key'),
  
  // Redis Configuration
  REDIS_URL: z.string().url().describe('Redis connection URL'),
  
  // Production Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().default('8000'),
  BASE_URL: z.string().url().describe('Base application URL'),
  
  // n8n Agent Swarm Configuration
  N8N_AGENT_SWARM_URL: z.string().url().default('https://santino62.app.n8n.cloud').describe('n8n Agent Swarm webhook URL'),
  N8N_AGENT_ENABLED: z.coerce.boolean().default(true).describe('Enable n8n agent integration'),
  N8N_AGENT_TIMEOUT: z.coerce.number().int().min(1000).max(600000).default(600000).describe('n8n agent request timeout in milliseconds'),
  N8N_FALLBACK_ENABLED: z.coerce.boolean().default(true).describe('Enable fallback to local system when n8n unavailable'),
  N8N_ENABLED_AGENTS: z.string().default('email,calendar,contact,web,youtube').describe('Comma-separated list of enabled n8n agents'),
});

export type Neo4jConfig = z.infer<typeof Neo4jConfigSchema>;

export const validateEnvironment = (): Neo4jConfig => {
  try {
    const config = Neo4jConfigSchema.parse(process.env);
    console.log('✅ Environment configuration validated successfully');
    console.log(`🧠 Brain Memory Bridge: ${config.MEMORY_BRIDGE_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔄 Memory Consolidation: ${config.MEMORY_CONSOLIDATION_INTERVAL}s intervals`);
    console.log(`⚡ Context Retrieval Timeout: ${config.CONTEXT_RETRIEVAL_TIMEOUT}ms`);
    return config;
  } catch (error) {
    console.error('❌ Environment configuration validation failed:', error);
    console.error('🔧 Required environment variables:');
    console.error('   - NEO4J_URI (neo4j+s://...)');
    console.error('   - NEO4J_USER');
    console.error('   - NEO4J_PASSWORD');
    console.error('   - OPENAI_API_KEY (sk-...)');
    console.error('   - COMPOSIO_API_KEY');
    console.error('   - ANTHROPIC_API_KEY (sk-ant-...)');
    console.error('   - REDIS_URL');
    console.error('   - BASE_URL');
    throw new Error('Invalid environment configuration');
  }
};

// Export validated config
export const config = validateEnvironment(); 