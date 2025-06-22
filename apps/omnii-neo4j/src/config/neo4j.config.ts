import neo4j, { Driver, Session } from 'neo4j-driver';
import type { Config } from 'neo4j-driver';

let driverInstance: Driver | null = null;
let isConnected: boolean = false;

export const createNeo4jDriver = (): Driver => {
  // Check required environment variables
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || process.env.DB_PASSWORD;
  const database = process.env.NEO4J_DATABASE || 'neo4j';

  if (!uri) {
    console.error('❌ NEO4J_URI environment variable is required');
    console.error('🔧 Please set: NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io:7687');
    throw new Error('NEO4J_URI environment variable is required');
  }
  if (!password) {
    console.error('❌ NEO4J_PASSWORD environment variable is required');
    throw new Error('NEO4J_PASSWORD environment variable is required');
  }

  // 🚄 Railway environment detection
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
  const isRailwayTemplate = uri.includes('railway.internal');
  const isExternalAuraDB = uri.includes('databases.neo4j.io');
  const connectionType = isRailwayTemplate ? 'Railway Template' : 
                        isExternalAuraDB ? 'External AuraDB' : 'Other';

  // Enhanced config following Neo4j best practices
  const config: Config = {
    // Connection management
    maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
    maxConnectionPoolSize: 20, // Robust connection pool
    connectionAcquisitionTimeout: 30000, // 30 seconds
    maxTransactionRetryTime: 15000, // 15 seconds
    
    // Query optimization
    fetchSize: 1000,
    disableLosslessIntegers: true,
    
    // Enhanced logging for debugging
    logging: {
      level: 'debug',
      logger: (level: string, message: string) => {
        const timestamp = new Date().toISOString();
        const env = isRailway ? '[RAILWAY]' : '[LOCAL]';
        console.log(`[${timestamp}] ${env} [Neo4j-${connectionType}-${level.toUpperCase()}] ${message}`);
      }
    }
  };

  console.log(`🔧 Neo4j Config: Following best practices for ${connectionType}`);
  console.log(`🔧 Environment: ${isRailway ? 'Railway' : 'Local'}`);
  console.log(`🔧 Pool: ${config.maxConnectionPoolSize}, Timeout: ${config.connectionAcquisitionTimeout}ms`);
  
  // 🔍 Environment variables verification for debugging
  console.log(`🔍 Neo4j Environment Variables:`);
  console.log(`   NEO4J_URI: ${uri ? 'SET' : 'MISSING'} ${uri ? `(${uri.substring(0, 30)}...)` : ''}`);
  console.log(`   NEO4J_USER: ${user ? 'SET' : 'MISSING'} (${user})`);
  console.log(`   NEO4J_PASSWORD: ${password ? 'SET' : 'MISSING'} ${password ? `(length: ${password.length})` : ''}`);
  console.log(`   NEO4J_DATABASE: ${database} ${database === 'neo4j' ? '(default)' : '(custom)'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`   RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || 'undefined'}`);

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), config);

  // Connection verification (async, non-blocking)
  const envLabel = isRailway ? 'RAILWAY' : 'LOCAL';
  console.log(`🔗 ${envLabel}: Starting Neo4j connection verification...`);
  
  // Don't block startup - verify connection asynchronously
  (async () => {
    try {
      const session = driver.session({ database });
      await session.run('RETURN 1 as test');
      await session.close();
      
      isConnected = true;
      console.log(`✅ [${envLabel}] Neo4j ${connectionType} connection verified successfully!`);
      console.log(`🔗 [${envLabel}] Connected to: ${uri.split('@')[1] || uri}`);
      console.log(`💾 [${envLabel}] Database: ${database}`);
      console.log(`🎯 [${envLabel}] Ready for graph operations`);
    } catch (err) {
      isConnected = false;
      console.error(`❌ [${envLabel}] Neo4j ${connectionType} connection failed:`, (err as Error).message);
      console.error(`🔧 [${envLabel}] Check credentials and network connectivity`);
      console.error(`🔧 Connection details:`);
      console.error(`🔧   URI: ${uri}`);
      console.error(`🔧   User: ${user}`);
      console.error(`🔧   Database: ${database}`);
      // DON'T THROW - Let microservice continue with degraded functionality
    }
  })();

  return driver;
};

export const initializeNeo4j = async (): Promise<void> => {
  try {
    driverInstance = createNeo4jDriver();
    console.log('✅ Neo4j driver initialized successfully!');
  } catch (error) {
    console.error('❌ Neo4j driver initialization failed:', error);
    throw error;
  }
};

export const getNeo4jDriver = (): Driver => {
  if (!driverInstance) {
    throw new Error('Neo4j driver not initialized - call initializeNeo4j() first');
  }
  return driverInstance;
};

export const isNeo4jConnected = (): boolean => isConnected;

export const createSession = (database?: string): Session => {
  const driver = getNeo4jDriver();
  return driver.session({ 
    database: database || process.env.NEO4J_DATABASE || 'neo4j' 
  });
};

export const closeNeo4jDriver = async (): Promise<void> => {
  if (driverInstance) {
    await driverInstance.close();
    driverInstance = null;
    isConnected = false;
    console.log('🔌 Neo4j driver closed gracefully');
  }
}; 