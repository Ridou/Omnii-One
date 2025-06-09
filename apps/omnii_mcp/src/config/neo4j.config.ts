import neo4j, { Driver, Config } from 'neo4j-driver';

export const createNeo4jDriver = (): Driver => {
  const config: Config = {
    // Production Connection Pool Settings
    maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
    maxConnectionPoolSize: 50, // Handle high concurrency
    connectionAcquisitionTimeout: 60000, // 60 seconds
    maxTransactionRetryTime: 30000, // 30 seconds for retries
    
    // Performance Optimizations
    fetchSize: 1000, // Fetch more records per round trip
    disableLosslessIntegers: true, // Use JavaScript numbers for integers
    
    // Logging Configuration
    logging: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      logger: (level: string, message: string) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [Neo4j-${level.toUpperCase()}] ${message}`);
      }
    },
    
    // Resolver for DNS resolution
    resolver: (address: string) => Promise.resolve([address]),
  };

    const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(
      process.env.NEO4J_USER!,
      process.env.NEO4J_PASSWORD!
    ),
    config
  );

  // Connection health check
  driver.verifyConnectivity()
    .then(() => {
      console.log('✅ Neo4j AuraDB connection verified successfully');
      console.log(`🔗 Connected to: ${process.env.NEO4J_URI?.split('@')[1]}`);
      console.log(`💾 Database: ${process.env.NEO4J_DATABASE}`);
    })
    .catch(err => {
      console.error('❌ Neo4j AuraDB connection failed:', err);
      throw new Error(`Neo4j connection failed: ${err.message}`);
    });

  return driver;
};

// Singleton driver instance
let driverInstance: Driver | null = null;

export const getNeo4jDriver = (): Driver => {
  if (!driverInstance) {
    driverInstance = createNeo4jDriver();
  }
  return driverInstance;
};

// Graceful shutdown
export const closeNeo4jDriver = async (): Promise<void> => {
  if (driverInstance) {
    await driverInstance.close();
    driverInstance = null;
    console.log('🔌 Neo4j driver closed gracefully');
  }
}; 