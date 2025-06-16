import neo4j, { Driver, Config, Session } from 'neo4j-driver';
import type { Record as Neo4jRecord } from 'neo4j-driver';

// Define supported node types
type NodeType = 'Concept' | 'Email' | 'Event' | string;

// Node data interface
interface NodeData {
  id: string;
  labels: string[];
  properties: { [key: string]: unknown };
}

// Relationship data interface
interface RelationshipData {
  type: string;
  properties: { [key: string]: unknown };
  source: string;
  target: string;
}

// Context interface
interface ContextData {
  nodes: NodeData[];
  relationships: RelationshipData[];
}

export const createNeo4jDriver = (): Driver => {
  // Enhanced environment debugging
  console.log('🔍 === NEO4J ENVIRONMENT DEBUG ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Railway Environment:', process.env.RAILWAY_ENVIRONMENT || 'not set');
  console.log('Working Directory:', process.cwd());
  console.log('Total env vars available:', Object.keys(process.env).length);
  console.log('Neo4j related env vars:', Object.keys(process.env).filter(key => key.includes('NEO4J')));
  console.log('NEO4J_URI:', process.env.NEO4J_URI ? `SET (${process.env.NEO4J_URI.substring(0, 25)}...)` : 'NOT SET');
  console.log('NEO4J_USER:', process.env.NEO4J_USER ? `SET (${process.env.NEO4J_USER})` : 'NOT SET');
  console.log('NEO4J_PASSWORD:', process.env.NEO4J_PASSWORD ? `SET (${process.env.NEO4J_PASSWORD.substring(0, 8)}...)` : 'NOT SET');
  console.log('NEO4J_DATABASE:', process.env.NEO4J_DATABASE || 'neo4j (default)');
  console.log('==================================');

  // Check required environment variables
  if (!process.env.NEO4J_URI) {
    console.error('❌ NEO4J_URI environment variable is required');
    console.error('🔧 Please set: NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io');
    throw new Error('NEO4J_URI environment variable is required');
  }
  if (!process.env.NEO4J_USER) {
    console.error('❌ NEO4J_USER environment variable is required');
    throw new Error('NEO4J_USER environment variable is required');
  }
  if (!process.env.NEO4J_PASSWORD) {
    console.error('❌ NEO4J_PASSWORD environment variable is required');
    throw new Error('NEO4J_PASSWORD environment variable is required');
  }

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
    process.env.NEO4J_URI,
    neo4j.auth.basic(
      process.env.NEO4J_USER,
      process.env.NEO4J_PASSWORD
    ),
    config
  );

  // Connection health check - don't throw on failure to allow server to start
  driver.verifyConnectivity()
    .then(() => {
      neo4jConnected = true;
      console.log('✅ Neo4j AuraDB connection verified successfully');
      console.log(`🔗 Connected to: ${process.env.NEO4J_URI?.split('@')[1]}`);
      console.log(`💾 Database: ${process.env.NEO4J_DATABASE || 'neo4j'}`);
    })
    .catch(err => {
      neo4jConnected = false;
      console.error('❌ Neo4j AuraDB connection failed during startup:', err.message);
      console.warn('⚠️ Server will continue but Neo4j operations will fail');
      // Don't throw - let the service handle it gracefully in individual operations
    });

  return driver;
};

// Singleton driver instance and connectivity status
let driverInstance: Driver | null = null;
let neo4jConnected: boolean = false;

export const getNeo4jDriver = (): Driver => {
  if (!driverInstance) {
    driverInstance = createNeo4jDriver();
  }
  return driverInstance;
};

export const isNeo4jConnected = (): boolean => neo4jConnected;

// Graceful shutdown
export const closeNeo4jDriver = async (): Promise<void> => {
  if (driverInstance) {
    await driverInstance.close();
    driverInstance = null;
    neo4jConnected = false;
    console.log('🔌 Neo4j driver closed gracefully');
  }
};

// Simple Neo4j Service class (replacing the complex one)
class SimpleNeo4jService {
  private getSession(): Session {
    const driver = getNeo4jDriver();
    const database = process.env.NEO4J_DATABASE || 'neo4j';
    return driver.session({ database });
  }

  /**
   * List all nodes of a specific type for a user
   */
  async listNodes(userId: string, nodeType: NodeType = 'Concept', limit = 100, filter?: string): Promise<NodeData[]> {
    const session = this.getSession();
    try {
      let filterQuery = '';
      if (filter) {
        // Adapt filter fields based on node type
        if (nodeType === 'Concept') {
          filterQuery = "AND (n.name CONTAINS $filter OR n.description CONTAINS $filter OR n.content CONTAINS $filter)";
        } else if (nodeType === 'Email') {
          filterQuery = "AND (n.subject CONTAINS $filter OR n.snippet CONTAINS $filter OR n.from CONTAINS $filter)";
        } else if (nodeType === 'Event') {
          filterQuery = "AND (n.title CONTAINS $filter OR n.description CONTAINS $filter OR n.location CONTAINS $filter)";
        } else {
          // Generic filter for other node types
          filterQuery = "AND ANY(key IN keys(n) WHERE n[key] CONTAINS $filter)";
        }
      }
      
      // Sanitize limit parameter
      const sanitizedLimit = neo4j.int(Number.parseInt(String(limit), 10));
      
      const result = await session.run(
        `
        MATCH (n:${nodeType})
        WHERE n.user_id = $userId ${filterQuery}
        RETURN n, labels(n) as labels
        LIMIT $limit
        `,
        { 
          userId, 
          limit: sanitizedLimit,
          filter 
        }
      );
      
      const nodes = result.records.map((record: Neo4jRecord) => {
        const node = record.get('n');
        const labels = record.get('labels');
        return {
          id: node.identity.toString(),
          labels: labels,
          properties: node.properties
        };
      });
      
      return nodes;
    } catch (error) {
      console.error(`Error in listNodes(${nodeType}):`, error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Search specifically for concepts
   */
  async searchSimilarConcepts(userId: string, text: string, limit = 5): Promise<NodeData[]> {
    const session = this.getSession();
    try {
      // Sanitize limit parameter
      const sanitizedLimit = neo4j.int(Number.parseInt(String(limit), 10));
      
      // Simple text search
      const result = await session.run(
        `
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        AND (c.name CONTAINS $text OR c.content CONTAINS $text OR c.description CONTAINS $text)
        WITH c, labels(c) as nodeLabels,
             CASE 
               WHEN c.name CONTAINS $text THEN 3
               WHEN c.content CONTAINS $text THEN 2
               WHEN c.description CONTAINS $text THEN 1
               ELSE 0
             END AS relevance
        WHERE relevance > 0
        RETURN c, nodeLabels, relevance
        ORDER BY relevance DESC
        LIMIT $limit
        `,
        { 
          userId, 
          text, 
          limit: sanitizedLimit
        }
      );
      
      const concepts = result.records.map((record: Neo4jRecord) => {
        const node = record.get('c');
        const labels = record.get('nodeLabels');
        const relevance = record.get('relevance');
        
        return {
          id: node.identity.toString(),
          labels: labels,
          properties: { ...node.properties, relevance }
        };
      });
      
      return concepts;
    } catch (error) {
      console.error('Error in searchSimilarConcepts:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Get comprehensive context for AI based on a query
   */
  async getContextForQuery(userId: string, query: string, limit = 5): Promise<ContextData> {
    // For now, just search concepts and return without relationships
    const concepts = await this.searchSimilarConcepts(userId, query, limit);
    return {
      nodes: concepts,
      relationships: []
    };
  }

  /**
   * Backward compatibility method for getConceptsForContext
   */
  async getConceptsForContext(userId: string, query: string, limit = 3): Promise<{concepts: NodeData[], relationships: RelationshipData[]}> {
    const contextData = await this.getContextForQuery(userId, query, limit);
    
    // Filter to only include Concept nodes
    const concepts = contextData.nodes.filter(node => 
      node.labels.includes('Concept')
    );
    
    return {
      concepts,
      relationships: contextData.relationships
    };
  }

  // Close the driver when the application shuts down
  async close(): Promise<void> {
    await closeNeo4jDriver();
  }
}

// Export simple service instance
export const neo4jService = new SimpleNeo4jService();

// For backward compatibility
export const productionBrainService = neo4jService;
export const getNeo4jService = () => neo4jService; 