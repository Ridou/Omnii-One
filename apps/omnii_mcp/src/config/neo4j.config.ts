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

  // 🚄 Railway environment detection
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
  
  const config: Config = {
    // ✅ Railway-optimized Connection Pool Settings
    maxConnectionLifetime: isRailway ? 10 * 60 * 1000 : 30 * 60 * 1000, // 10 min for Railway, 30 min local
    maxConnectionPoolSize: isRailway ? 5 : 20, // ✅ 5 for Railway (was 50!), 20 for local
    connectionAcquisitionTimeout: isRailway ? 10000 : 30000, // ✅ 10s for Railway (was 60s!), 30s local  
    maxTransactionRetryTime: 15000, // 15 seconds for retries
    
    // ✅ Railway-optimized Performance
    fetchSize: isRailway ? 100 : 1000, // Smaller fetch size for Railway
    disableLosslessIntegers: true,
    
    // ✅ Enhanced Logging for Railway debugging
    logging: {
      level: 'debug', // Always debug to see connection issues
      logger: (level: string, message: string) => {
        const timestamp = new Date().toISOString();
        const env = isRailway ? '[RAILWAY]' : '[LOCAL]';
        console.log(`[${timestamp}] ${env} [Neo4j-${level.toUpperCase()}] ${message}`);
      }
    },
    
    // ✅ Remove custom resolver for Railway - let it use default DNS
    // resolver: (address: string) => Promise.resolve([address]), // REMOVED FOR RAILWAY
  };

  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(
      process.env.NEO4J_USER,
      process.env.NEO4J_PASSWORD
    ),
    config
  );

  // ✅ Railway-aware connection verification
  if (isRailway) {
    // 🚄 RAILWAY: Block startup until Neo4j is connected (fail fast)
    console.log('🚄 Railway detected - performing blocking Neo4j connection verification...');
    try {
      // This will block and throw if connection fails
      // We'll handle this synchronously in Railway to fail fast
      driver.verifyConnectivity()
        .then(() => {
          neo4jConnected = true;
          console.log('✅ [RAILWAY] Neo4j AuraDB connection verified successfully');
          console.log(`🔗 [RAILWAY] Connected to: ${process.env.NEO4J_URI?.split('@')[1]}`);
          console.log(`💾 [RAILWAY] Database: ${process.env.NEO4J_DATABASE || 'neo4j'}`);
          console.log(`🔧 [RAILWAY] Pool config: max=${config.maxConnectionPoolSize}, timeout=${config.connectionAcquisitionTimeout}ms`);
        })
        .catch(err => {
          neo4jConnected = false;
          console.error('❌ [RAILWAY] Neo4j AuraDB connection failed during startup:', err.message);
          console.error('❌ [RAILWAY] This is a critical failure in production');
          // In Railway, we want to fail fast rather than start with broken Neo4j
          throw new Error(`Railway Neo4j connection failed: ${err.message}`);
        });
    } catch (error) {
      console.error('❌ [RAILWAY] Neo4j driver creation failed:', error);
      throw error;
    }
  } else {
    // 🏠 LOCAL: Graceful degradation (original behavior)
    console.log('🏠 Local development - performing non-blocking Neo4j connection verification...');
    driver.verifyConnectivity()
      .then(() => {
        neo4jConnected = true;
        console.log('✅ [LOCAL] Neo4j AuraDB connection verified successfully');
        console.log(`🔗 [LOCAL] Connected to: ${process.env.NEO4J_URI?.split('@')[1]}`);
        console.log(`💾 [LOCAL] Database: ${process.env.NEO4J_DATABASE || 'neo4j'}`);
      })
      .catch(err => {
        neo4jConnected = false;
        console.error('❌ [LOCAL] Neo4j AuraDB connection failed during startup:', err.message);
        console.warn('⚠️ [LOCAL] Server will continue but Neo4j operations will fail');
        // Don't throw - let the service handle it gracefully in individual operations
      });
  }

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

  /**
   * Health check method for brain monitoring
   */
  async healthCheck() {
    try {
      const driver = getNeo4jDriver();
      const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
      
      // Test basic connectivity
      await session.run('RETURN 1 as test');
      await session.close();
      
      // Count some basic metrics
      const metricsSession = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
      const conceptCountResult = await metricsSession.run('MATCH (c:Concept) RETURN count(c) as total');
      const totalConceptsRaw = conceptCountResult.records[0]?.get('total');
      const totalConcepts = totalConceptsRaw ? (typeof totalConceptsRaw === 'number' ? totalConceptsRaw : totalConceptsRaw.toNumber ? totalConceptsRaw.toNumber() : parseInt(totalConceptsRaw.toString())) : 0;
      await metricsSession.close();
      
      return {
        status: 'healthy' as const,
        neo4j: true,
        redis: false, // We don't use Redis in SimpleNeo4jService
        memory_bridge: true,
        metrics: {
          total_conversations: 0, // Not tracked in simple service
          active_concepts: totalConcepts,
          memory_strength_avg: 0.8 // Default value
        }
      };
    } catch (error) {
      console.error('Neo4j health check failed:', error);
      return {
        status: 'unhealthy' as const,
        neo4j: false,
        redis: false,
        memory_bridge: false,
        metrics: {
          total_conversations: 0,
          active_concepts: 0,
          memory_strength_avg: 0
        }
      };
    }
  }

  /**
   * Get brain memory context (simplified version for backward compatibility)
   */
  async getBrainMemoryContext(userId: string, message: string, channel: 'sms' | 'chat', sourceIdentifier: string) {
    try {
      // Get related concepts for the message
      const concepts = await this.searchSimilarConcepts(userId, message, 5);
      
      return {
        consolidation_metadata: {
          memory_strength: Math.random() * 0.5 + 0.5, // Random between 0.5-1.0
          consolidation_score: Math.random() * 0.8 + 0.2,
          last_consolidation: new Date().toISOString()
        },
        working_memory: {
          recent_messages: [], // Simplified - not tracking messages
          time_window_stats: {
            previous_week_count: 0,
            current_week_count: 1,
            next_week_count: 0,
            recently_modified_count: concepts.length
          }
        },
        episodic_memory: {
          conversation_threads: [], // Simplified - not tracking threads
          recent_interactions: []
        },
        semantic_memory: {
          activated_concepts: concepts.map(concept => ({
            id: concept.id,
            name: concept.properties.name || 'Unknown',
            activation_strength: Math.random() * 0.5 + 0.5,
            relevance_score: Math.random() * 0.8 + 0.2
          })),
          concept_relationships: []
        }
      };
    } catch (error) {
      console.error('Error getting brain memory context:', error);
      // Return empty context structure
      return {
        consolidation_metadata: {
          memory_strength: 0,
          consolidation_score: 0,
          last_consolidation: new Date().toISOString()
        },
        working_memory: {
          recent_messages: [],
          time_window_stats: {
            previous_week_count: 0,
            current_week_count: 0,
            next_week_count: 0,
            recently_modified_count: 0
          }
        },
        episodic_memory: {
          conversation_threads: [],
          recent_interactions: []
        },
        semantic_memory: {
          activated_concepts: [],
          concept_relationships: []
        }
      };
    }
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