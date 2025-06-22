import { z } from 'zod';

const Neo4jEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().default('8001'),
  
  // Neo4j connection (supports both Railway template and external AuraDB)
  NEO4J_URI: z.string().min(1, 'Neo4j URI required (neo4j:// or neo4j+s://)'),
  NEO4J_USER: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string().min(8, 'Neo4j password required (min 8 chars)'),
  NEO4J_DATABASE: z.string().default('neo4j'),
  
  // Railway template specific (optional)
  DB_PASSWORD: z.string().optional(), // Railway template uses this name
  NODE_CSV_URLS: z.string().optional(),
  RELATION_CSV_URLS: z.string().optional(),
  
  // Railway detection
  RAILWAY_ENVIRONMENT: z.string().optional(),
  RAILWAY_PROJECT_ID: z.string().optional(),
});

export type Neo4jEnv = z.infer<typeof Neo4jEnvSchema>;

export const validateEnvironment = (): Neo4jEnv => {
  try {
    const config = Neo4jEnvSchema.parse(process.env);
    
    // Use Railway DB_PASSWORD if NEO4J_PASSWORD is not set
    if (!config.NEO4J_PASSWORD && config.DB_PASSWORD) {
      config.NEO4J_PASSWORD = config.DB_PASSWORD;
    }
    
    const isRailway = config.RAILWAY_ENVIRONMENT || config.RAILWAY_PROJECT_ID;
    const isRailwayTemplate = config.NEO4J_URI.includes('railway.internal');
    const isExternalAuraDB = config.NEO4J_URI.includes('databases.neo4j.io');
    
    console.log('✅ Neo4j environment validated');
    console.log(`🚀 Service Port: ${config.PORT}`);
    console.log(`🔗 Neo4j URI: ${config.NEO4J_URI}`);
    console.log(`📊 Database: ${config.NEO4J_DATABASE}`);
    console.log(`🎯 Environment: ${config.NODE_ENV}`);
    console.log(`🔧 Railway Environment: ${isRailway ? 'YES' : 'NO'}`);
    
    if (isRailwayTemplate) {
      console.log('✅ Using Railway template (internal networking)');
    } else if (isExternalAuraDB) {
      console.log('✅ Using external AuraDB (secure connection)');
    } else {
      console.log('⚠️  Using other Neo4j instance');
    }
    
    // Warn if configuration seems mismatched
    if (isRailway && isExternalAuraDB) {
      console.warn('⚠️  WARNING: Running on Railway but using external AuraDB');
      console.warn('🔧 Consider switching to Railway template for better performance');
    }
    
    return config;
  } catch (error) {
    console.error('❌ Neo4j environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`   ${err.path.join('.')}: ${err.message}`);
      });
    }
    console.error('\n🔧 Required Neo4j environment variables:');
    console.error('   NEO4J_URI (connection string)');
    console.error('   NEO4J_PASSWORD (or DB_PASSWORD for Railway template)');
    console.error('   PORT (default: 8001)');
    throw new Error('Invalid Neo4j environment configuration');
  }
}; 