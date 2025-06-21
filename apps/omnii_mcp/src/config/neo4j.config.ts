import neo4j, { Driver, Config, Session } from 'neo4j-driver';
import type { Record as Neo4jRecord } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

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

// Simple brain manager interface for chat storage
class SimpleBrainManager {
  private driver: Driver;

  constructor(driver: Driver) {
    this.driver = driver;
  }

  async storeChatConversation(data: {
    user_id: string;
    content: string;
    chat_id: string;
    is_incoming: boolean;
    websocket_session_id?: string;
    thread_id?: string;
    is_group_chat?: boolean;
    participants?: string[];
    reply_to_message_id?: string;
    message_sequence?: number;
    google_service_context?: {
      service_type?: 'calendar' | 'tasks' | 'contacts' | 'email';
      operation?: string;
      entity_ids?: string[];
    };
  }): Promise<any> {
    console.log(`[BrainMemory] 💬 Storing chat conversation for user: ${data.user_id}`);
    
    const session = this.driver.session();
    
    try {
      const messageId = uuidv4();
      
      // Simple storage without complex analysis
      await session.run(`
        CREATE (msg:ChatMessage {
          id: $id,
          content: $content,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          channel: 'chat',
          source_identifier: $chat_id,
          chat_metadata: $chat_metadata
        })
        
        WITH msg
        MATCH (user:User {id: $user_id})
        MERGE (user)-[:OWNS]->(msg)
        
        CREATE (memory:Memory {
          id: $memory_id,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          memory_type: 'episodic',
          consolidation_status: 'fresh',
          episode_type: 'conversation',
          channel: 'chat',
          original_message_id: $id
        })
        
        CREATE (msg)-[:HAS_MEMORY]->(memory)
        
        RETURN msg, memory
      `, {
        id: messageId,
        content: data.content,
        timestamp: new Date().toISOString(),
        user_id: data.user_id,
        chat_id: data.chat_id,
        chat_metadata: JSON.stringify({
          chat_id: data.chat_id,
          websocket_session_id: data.websocket_session_id,
          is_group_chat: data.is_group_chat || false,
          participants: data.participants || []
        }),
        memory_id: uuidv4()
      });

      console.log(`[BrainMemory] ✅ Stored chat conversation: ${messageId}`);
      
      return {
        id: messageId,
        user_id: data.user_id,
        content: data.content,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[BrainMemory] ❌ Failed to store chat conversation:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async storeSMSConversation(data: {
    user_id: string;
    content: string;
    phone_number: string;
    is_incoming: boolean;
    local_datetime?: string;
    google_service_context?: any;
  }): Promise<any> {
    console.log(`[BrainMemory] 💾 Storing SMS conversation for user: ${data.user_id}`);
    
    const session = this.driver.session();
    
    try {
      const messageId = uuidv4();
      
      await session.run(`
        CREATE (msg:ChatMessage {
          id: $id,
          content: $content,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          channel: 'sms',
          source_identifier: $phone_number,
          sms_metadata: $sms_metadata
        })
        
        WITH msg
        MATCH (user:User {id: $user_id})
        MERGE (user)-[:OWNS]->(msg)
        
        CREATE (memory:Memory {
          id: $memory_id,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          memory_type: 'episodic',
          consolidation_status: 'fresh',
          episode_type: 'conversation',
          channel: 'sms',
          original_message_id: $id
        })
        
        CREATE (msg)-[:HAS_MEMORY]->(memory)
        
        RETURN msg, memory
      `, {
        id: messageId,
        content: data.content,
        timestamp: new Date().toISOString(),
        user_id: data.user_id,
        phone_number: data.phone_number,
        sms_metadata: JSON.stringify({
          phone_number: data.phone_number,
          is_incoming: data.is_incoming,
          local_datetime: data.local_datetime
        }),
        memory_id: uuidv4()
      });

      console.log(`[BrainMemory] ✅ Stored SMS conversation: ${messageId}`);
      
      return {
        id: messageId,
        user_id: data.user_id,
        content: data.content,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[BrainMemory] ❌ Failed to store SMS conversation:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }
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
    // ✅ IDENTICAL CONFIG for both local and Railway (no conflicts)
    maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
    maxConnectionPoolSize: 20, // Same for both environments
    connectionAcquisitionTimeout: 30000, // 30 seconds for both
    maxTransactionRetryTime: 15000, // 15 seconds
    
    fetchSize: 1000, // Same for both
    disableLosslessIntegers: true,
    
    // ✅ Enhanced Logging for debugging
    logging: {
      level: 'debug',
      logger: (level: string, message: string) => {
        const timestamp = new Date().toISOString();
        const env = isRailway ? '[RAILWAY]' : '[LOCAL]';
        console.log(`[${timestamp}] ${env} [Neo4j-${level.toUpperCase()}] ${message}`);
      }
    },
    
    // ✅ NO Railway-specific config - let neo4j+s:// handle everything
  };

  console.log(`🔧 Neo4j Config: IDENTICAL for all environments - no conflicts`);
  console.log(`🔧 Environment: ${isRailway ? 'Railway' : 'Local'}`);
  console.log(`🔧 Pool: ${config.maxConnectionPoolSize}, Timeout: ${config.connectionAcquisitionTimeout}ms`);
  
  // 🔍 Environment variables verification for debugging
  console.log(`🔍 Neo4j Environment Variables:`);
  console.log(`   NEO4J_URI: ${process.env.NEO4J_URI ? 'SET' : 'MISSING'} ${process.env.NEO4J_URI ? `(${process.env.NEO4J_URI.substring(0, 20)}...)` : ''}`);
  console.log(`   NEO4J_USER: ${process.env.NEO4J_USER ? 'SET' : 'MISSING'} ${process.env.NEO4J_USER ? `(${process.env.NEO4J_USER})` : ''}`);
  console.log(`   NEO4J_PASSWORD: ${process.env.NEO4J_PASSWORD ? 'SET' : 'MISSING'} ${process.env.NEO4J_PASSWORD ? `(length: ${process.env.NEO4J_PASSWORD.length})` : ''}`);
  console.log(`   NEO4J_DATABASE: ${process.env.NEO4J_DATABASE ? 'SET' : 'MISSING'} ${process.env.NEO4J_DATABASE ? `(${process.env.NEO4J_DATABASE})` : '(default: neo4j)'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`   RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || 'undefined'}`);
  console.log(`   RAILWAY_PROJECT_ID: ${process.env.RAILWAY_PROJECT_ID || 'undefined'}`);

  const driver = neo4j.driver(
    process.env.NEO4J_URI, // Back to original URI
    neo4j.auth.basic(
      process.env.NEO4J_USER,
      process.env.NEO4J_PASSWORD
    ),
    config
  );

  // ✅ Unified connection verification for all environments
  const envLabel = isRailway ? 'RAILWAY' : 'LOCAL';
  console.log(`🔗 ${envLabel}: Starting Neo4j connection verification...`);
  
  // Don't block startup - verify connection asynchronously (modern approach)
  (async () => {
    try {
      const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
      await session.run('RETURN 1 as test');
      await session.close();
      
      neo4jConnected = true;
      console.log(`✅ [${envLabel}] Neo4j AuraDB connection verified successfully!`);
      console.log(`🔗 [${envLabel}] Connected to: ${process.env.NEO4J_URI?.split('@')[1]}`);
      console.log(`💾 [${envLabel}] Database: ${process.env.NEO4J_DATABASE || 'neo4j'}`);
      console.log(`🔧 [${envLabel}] Using IDENTICAL config as local (no conflicts)`);
    } catch (err) {
      neo4jConnected = false;
      console.error(`❌ [${envLabel}] Neo4j AuraDB connection failed:`, (err as Error).message);
      if (isRailway) {
        console.error('❌ [RAILWAY] Using IDENTICAL config as local - if this fails, Railway networking issue');
      }
      console.error(`🔧 [${envLabel}] Environment variables:`);
      console.error(`🔧   NEO4J_URI: ${process.env.NEO4J_URI ? 'SET' : 'MISSING'}`);
      console.error(`🔧   NEO4J_USER: ${process.env.NEO4J_USER ? 'SET' : 'MISSING'}`);
      console.error(`🔧   NEO4J_PASSWORD: ${process.env.NEO4J_PASSWORD ? 'SET (length=' + process.env.NEO4J_PASSWORD.length + ')' : 'MISSING'}`);
      console.error(`🔧   NEO4J_DATABASE: ${process.env.NEO4J_DATABASE || 'neo4j (default)'}`);
      // DON'T THROW - Let server continue with degraded Neo4j functionality
    }
  })();

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

// Create BrainConversationManager instance
const brainConversationManager = new SimpleBrainManager(getNeo4jDriver());

// Enhanced production brain service with manager
export const productionBrainService = {
  ...neo4jService,
  manager: brainConversationManager
};

// For backward compatibility
export const getNeo4jService = () => neo4jService; 