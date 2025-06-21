import neo4j, { Driver, Config, Session } from 'neo4j-driver';

let driverInstance: Driver | null = null;
let isConnected: boolean = false;

export const createNeo4jDriver = (): Driver => {
  // Railway template environment variables (support both formats)
  const uri = process.env.NEO4J_URI; 
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || process.env.DB_PASSWORD; // Railway uses DB_PASSWORD
  const database = process.env.NEO4J_DATABASE || 'neo4j';

  if (!uri || !password) {
    console.error('❌ Neo4j configuration missing:');
    console.error(`   NEO4J_URI: ${uri ? 'SET' : 'MISSING'}`);
    console.error(`   NEO4J_PASSWORD or DB_PASSWORD: ${password ? 'SET' : 'MISSING'}`);
    throw new Error('Neo4j configuration incomplete');
  }

  // Detect connection type
  const isRailwayTemplate = uri.includes('railway.internal');
  const isExternalAuraDB = uri.includes('databases.neo4j.io');
  const connectionType = isRailwayTemplate ? 'Railway Template' : 
                        isExternalAuraDB ? 'External AuraDB' : 'Other';

  // Optimized config based on connection type
  const config: Config = {
    maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
    maxConnectionPoolSize: isRailwayTemplate ? 20 : 10, // Railway internal can be generous
    connectionAcquisitionTimeout: isRailwayTemplate ? 8000 : 30000, // Railway internal is faster
    maxTransactionRetryTime: 15000, // 15 seconds
    fetchSize: 1000,
    disableLosslessIntegers: true,
    logging: {
      level: 'info',
      logger: (level, message) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [Neo4j-${connectionType}-${level.toUpperCase()}] ${message}`);
      }
    }
  };

  console.log(`🚀 Connecting to Neo4j: ${connectionType}`);
  console.log(`🔗 URI: ${uri}`);
  console.log(`📊 Database: ${database}`);
  console.log(`👤 User: ${user}`);
  
  if (isRailwayTemplate) {
    console.log('🎯 Using Railway template with internal networking');
  } else if (isExternalAuraDB) {
    console.log('🌐 Using external AuraDB with secure connection');
  }
  
  return neo4j.driver(uri, neo4j.auth.basic(user, password), config);
};

export const initializeNeo4j = async (): Promise<void> => {
  try {
    driverInstance = createNeo4jDriver();
    
    // Verify Neo4j connection
    const session = driverInstance.session();
    await session.run('RETURN 1 as health_check');
    await session.close();
    
    isConnected = true;
    console.log('✅ Neo4j connection verified successfully!');
    console.log('🎯 Ready to serve graph operations');
  } catch (error) {
    isConnected = false;
    console.error('❌ Neo4j connection failed:', error);
    console.error('🔧 Check Neo4j service is running and credentials are correct');
    throw error;
  }
};

export const getNeo4jDriver = (): Driver => {
  if (!driverInstance) {
    throw new Error('Neo4j driver not initialized');
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