import neo4j, { Driver, Config, Session } from 'neo4j-driver';
import type { Record as Neo4jRecord } from 'neo4j-driver';
import { redisCache } from '../services/caching/redis-cache';
import { Redis } from 'ioredis';
import { BrainConversationManager } from '../services/core/brain-conversation-manager';
import { config } from './env.validation';
import type { BrainMemoryContext } from '../types/brain-memory-schemas';

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

  // Connection health check (non-blocking)
  driver.verifyConnectivity()
    .then(() => {
      neo4jConnected = true;
      console.log('✅ Neo4j AuraDB connection verified successfully');
      console.log(`🔗 Connected to: ${process.env.NEO4J_URI?.split('@')[1]}`);
      console.log(`💾 Database: ${process.env.NEO4J_DATABASE}`);
    })
    .catch(err => {
      neo4jConnected = false;
      console.error('❌ Neo4j AuraDB connection failed:', err);
      console.warn('⚠️ Server will continue in degraded mode without AI memory');
      // DO NOT THROW - Allow server to continue without Neo4j
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
    console.log('🔌 Neo4j driver closed gracefully');
  }
};

// Production-ready Neo4j Service with brain memory, Redis, and health monitoring
export class Neo4jService {
  private conversationManager: BrainConversationManager;
  private redis: Redis;
  private consolidationInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize with production Neo4j driver (always initialize these properties)
    this.conversationManager = new BrainConversationManager();
    
    // Initialize Redis for caching (with error handling)
    this.redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 60000,
      commandTimeout: 5000
    });

    try {
      // Handle Redis connection errors gracefully
      this.redis.on('error', (err) => {
        console.warn('⚠️ Redis connection error:', err.message);
        console.warn('⚠️ Server will continue without Redis caching');
      });

      // Start background consolidation if enabled and Neo4j is connected
      if (config.MEMORY_BRIDGE_ENABLED && isNeo4jConnected()) {
        this.startMemoryConsolidation();
      }

      const neo4jStatus = isNeo4jConnected() ? 'CONNECTED' : 'DISCONNECTED (degraded mode)';
      console.log(`🧠 Neo4jService initialized - Neo4j: ${neo4jStatus}`);
      console.log(`🔄 Memory consolidation: ${config.MEMORY_BRIDGE_ENABLED && isNeo4jConnected() ? 'ENABLED' : 'DISABLED'}`);
      console.log(`⏱️ Consolidation interval: ${config.MEMORY_CONSOLIDATION_INTERVAL}s`);
      
    } catch (error) {
      console.error('❌ Neo4jService initialization error:', error);
      console.warn('⚠️ Service will continue with minimal functionality');
      // Don't throw - allow service to continue
    }
  }

  // Expose conversationManager for direct access (brain memory functionality)
  get manager(): BrainConversationManager {
    return this.conversationManager;
  }

  private getSession(): Session {
    if (!isNeo4jConnected()) {
      throw new Error('Neo4j is not connected - running in degraded mode');
    }
    const driver = getNeo4jDriver();
    const database = process.env.NEO4J_DATABASE || 'neo4j';
    return driver.session({ database });
  }

  /**
   * Production-ready memory retrieval with timeout and fallback
   */
  async getBrainMemoryContext(
    userId: string,
    currentMessage: string,
    channel: 'sms' | 'chat',
    sourceIdentifier: string,
    options: {
      timeoutMs?: number;
      fallbackToCache?: boolean;
      prioritizeRecent?: boolean;
    } = {}
  ): Promise<BrainMemoryContext> {
    const { 
      timeoutMs = config.CONTEXT_RETRIEVAL_TIMEOUT,
      fallbackToCache = true,
      prioritizeRecent = channel === 'chat'
    } = options;

    const startTime = Date.now();
    
    try {
      // Check Neo4j connectivity first
      if (!isNeo4jConnected()) {
        console.warn(`[Neo4jService] Neo4j not connected - using fallback memory`);
        return await this.getFallbackMemoryContext(userId, channel, sourceIdentifier);
      }

      // Production timeout wrapper
      const memoryPromise = this.conversationManager.getBrainMemoryContext(
        userId,
        currentMessage,
        channel,
        sourceIdentifier,
        {
          workingMemorySize: prioritizeRecent ? 10 : 7,
          includeGoogleServices: true
        }
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Memory retrieval timeout')), timeoutMs);
      });

      const memoryContext = await Promise.race([memoryPromise, timeoutPromise]);
      
      const retrievalTime = Date.now() - startTime;
      console.log(`[Neo4jService] ⚡ Memory retrieved in ${retrievalTime}ms`);
      
      // Performance monitoring
      if (retrievalTime > timeoutMs * 0.8) {
        console.warn(`[Neo4jService] ⚠️ Slow memory retrieval: ${retrievalTime}ms (threshold: ${timeoutMs}ms)`);
      }

      return memoryContext;

    } catch (error) {
      const retrievalTime = Date.now() - startTime;
      console.error(`[Neo4jService] ❌ Memory retrieval failed after ${retrievalTime}ms:`, error);

      if (fallbackToCache) {
        return await this.getFallbackMemoryContext(userId, channel, sourceIdentifier);
      }

      throw error;
    }
  }

  /**
   * Fallback to cached or minimal memory context
   */
  private async getFallbackMemoryContext(
    userId: string,
    channel: 'sms' | 'chat',
    sourceIdentifier: string
  ): Promise<BrainMemoryContext> {
    console.log(`[Neo4jService] 🔄 Using fallback memory context`);
    
    // Try Redis cache first
    const cacheKey = `fallback_memory:${userId}:${channel}:${sourceIdentifier}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      console.log(`[Neo4jService] 📦 Using cached fallback memory`);
      return JSON.parse(cached);
    }

    // Minimal memory context
    const minimal: BrainMemoryContext = {
      working_memory: {
        recent_messages: [],
        time_window_messages: [],
        recently_modified_messages: [],
        active_concepts: [],
        current_intent: undefined,
        time_window_stats: {
          previous_week_count: 0,
          current_week_count: 0,
          next_week_count: 0,
          recently_modified_count: 0
        }
      },
      episodic_memory: {
        conversation_threads: [],
        related_episodes: []
      },
      semantic_memory: {
        activated_concepts: [],
        concept_associations: []
      },
      consolidation_metadata: {
        retrieval_timestamp: new Date().toISOString(),
        memory_strength: 0.1,
        context_channels: [channel],
        memory_age_hours: 0,
        consolidation_score: 0.0,
        working_memory_limit: 7,
        episodic_window_hours: 168,
        semantic_activation_threshold: 0.3
      }
    };

    // Cache the minimal context
    await this.redis.setex(cacheKey, 300, JSON.stringify(minimal)); // 5 minutes cache
    
    return minimal;
  }

  /**
   * Background memory consolidation process
   */
  private startMemoryConsolidation(): void {
    console.log(`[Neo4jService] 🔄 Starting memory consolidation (interval: ${config.MEMORY_CONSOLIDATION_INTERVAL}s)`);
    
    this.consolidationInterval = setInterval(async () => {
      try {
        console.log(`[Neo4jService] 🧠 Running memory consolidation cycle`);
        
        // Consolidate memories older than 24 hours
        await this.conversationManager.consolidateMemories({
          olderThanHours: 24,
          batchSize: config.PATTERN_ANALYSIS_BATCH_SIZE,
          maxProcessingTime: 300000 // 5 minutes max
        });
        
        // Update concept activation strengths
        await this.conversationManager.updateSemanticActivation({
          threshold: config.CONCEPT_DISCOVERY_THRESHOLD,
          batchSize: config.PATTERN_ANALYSIS_BATCH_SIZE
        });

        console.log(`[Neo4jService] ✅ Memory consolidation cycle completed`);
        
      } catch (error) {
        console.error(`[Neo4jService] ❌ Memory consolidation failed:`, error);
      }
    }, config.MEMORY_CONSOLIDATION_INTERVAL * 1000);
  }

  /**
   * Health check for monitoring
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    neo4j: boolean;
    redis: boolean;
    memory_bridge: boolean;
    metrics: {
      total_conversations: number;
      active_concepts: number;
      memory_strength_avg: number;
    };
  }> {
    try {
      // Test Neo4j connection
      const neo4jHealthy = await this.testNeo4jConnection();
      
      // Test Redis connection  
      const redisHealthy = await this.testRedisConnection();
      
      // Get brain metrics
      const metrics = await this.getBrainMetrics();
      
      const status = neo4jHealthy && redisHealthy ? 'healthy' : 
                    (neo4jHealthy || redisHealthy) ? 'degraded' : 'unhealthy';

      return {
        status,
        neo4j: neo4jHealthy,
        redis: redisHealthy,
        memory_bridge: config.MEMORY_BRIDGE_ENABLED,
        metrics
      };
      
    } catch (error) {
      console.error(`[Neo4jService] ❌ Health check failed:`, error);
      return {
        status: 'unhealthy',
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

  private async testNeo4jConnection(): Promise<boolean> {
    try {
      if (!isNeo4jConnected()) {
        return false;
      }
      const driver = getNeo4jDriver();
      await driver.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }

  private async testRedisConnection(): Promise<boolean> {  
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async getBrainMetrics(): Promise<{
    total_conversations: number;
    active_concepts: number;
    memory_strength_avg: number;
  }> {
    // Basic metrics - can be enhanced later
    return {
      total_conversations: 0,
      active_concepts: 0,
      memory_strength_avg: 0
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log(`[Neo4jService] 🔌 Shutting down service...`);
    
    // Stop consolidation
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
      this.consolidationInterval = null;
    }

    // Close connections
    await this.redis.quit();
    await closeNeo4jDriver();
    
    console.log(`[Neo4jService] ✅ Service shutdown complete`);
  }

  // === Original Neo4j service methods ===

  /**
   * List all nodes of a specific type for a user
   */
  async listNodes(userId: string, nodeType: NodeType = 'Concept', limit = 100, filter?: string): Promise<NodeData[]> {
    const cacheKey = redisCache.getCacheKey(userId, `list${nodeType}s`, `${limit}-${filter || ''}`);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for list${nodeType}s`);
      return cachedData;
    }

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
      
      await redisCache.set(cacheKey, nodes);
      return nodes;
    } catch (error) {
      console.error(`Error in listNodes(${nodeType}):`, error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Get context for a specific node, including related nodes of any type
   */
  async getContextForNode(userId: string, nodeId: string): Promise<ContextData> {
    const cacheKey = redisCache.getCacheKey(userId, 'getContextForNode', nodeId);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache hit for getContextForNode');
      return cachedData;
    }

    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (n)
        WHERE id(n) = $nodeId AND n.user_id = $userId
        WITH n, labels(n) as sourceLabels
        MATCH (n)-[r]-(m)
        WHERE m.user_id = $userId
        RETURN n, r, m, sourceLabels, labels(m) as targetLabels
        `,
        { 
          nodeId: Number.parseInt(nodeId), 
          userId 
        }
      );
      
      if (result.records.length === 0) {
        throw new Error(`Node with ID ${nodeId} not found or access denied`);
      }
      
      const nodes: Map<string, NodeData> = new Map();
      const relationships: RelationshipData[] = [];
      
      // First extract the source node (n)
      const firstRecord = result.records[0];
      const sourceNode = firstRecord.get('n');
      const sourceLabels = firstRecord.get('sourceLabels');
      
      // Add source node to nodes map
      nodes.set(sourceNode.identity.toString(), {
        id: sourceNode.identity.toString(),
        labels: sourceLabels,
        properties: sourceNode.properties
      });
      
      // Process all records for relationships and target nodes
      for (const record of result.records) {
        const r = record.get('r');
        const targetNode = record.get('m');
        const targetLabels = record.get('targetLabels');
        const targetId = targetNode.identity.toString();
        
        // Add target node if not already in map
        if (!nodes.has(targetId)) {
          nodes.set(targetId, {
            id: targetId,
            labels: targetLabels,
            properties: targetNode.properties
          });
        }
        
        // Add relationship
        relationships.push({
          type: r.type,
          properties: r.properties,
          source: sourceNode.identity.toString(),
          target: targetId
        });
      }
      
      const contextData: ContextData = { 
        nodes: Array.from(nodes.values()),
        relationships 
      };
      
      await redisCache.set(cacheKey, contextData);
      return contextData;
    } catch (error) {
      console.error('Error in getContextForNode:', error);
      return { nodes: [], relationships: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Search for similar nodes across all available node types
   */
  async searchAllNodeTypes(userId: string, text: string, limit = 5): Promise<NodeData[]> {
    const cacheKey = redisCache.getCacheKey(userId, 'searchAllNodeTypes', `${text}-${limit}`);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache hit for searchAllNodeTypes');
      return cachedData;
    }

    const session = this.getSession();
    try {
      // Sanitize limit parameter
      const sanitizedLimit = neo4j.int(Number.parseInt(String(limit), 10));
      
      const result = await session.run(
        `
        // Match all nodes that belong to this user
        MATCH (n)
        WHERE n.user_id = $userId
        
        // Calculate relevance score based on node type and properties
        WITH n, labels(n) as nodeLabels,
          CASE
            WHEN 'Concept' IN labels(n) THEN
              CASE
                WHEN n.name CONTAINS $text THEN 5
                WHEN n.content CONTAINS $text THEN 3
                WHEN n.description CONTAINS $text THEN 2
                ELSE 0
              END
            WHEN 'Email' IN labels(n) THEN
              CASE
                WHEN n.subject CONTAINS $text THEN 5
                WHEN n.snippet CONTAINS $text THEN 3
                WHEN n.from CONTAINS $text THEN 2
                ELSE 0
              END
            WHEN 'Event' IN labels(n) THEN
              CASE
                WHEN n.title CONTAINS $text THEN 5
                WHEN n.description CONTAINS $text THEN 3
                WHEN n.location CONTAINS $text THEN 2
                ELSE 0
              END
            ELSE 0
          END AS relevance
        
        // Filter out irrelevant nodes
        WHERE relevance > 0
        
        // Return results sorted by relevance
        RETURN n, nodeLabels, relevance
        ORDER BY relevance DESC
        LIMIT $limit
        `,
        { 
          userId, 
          text, 
          limit: sanitizedLimit
        }
      );
      
      const nodes = result.records.map((record: Neo4jRecord) => {
        const node = record.get('n');
        const labels = record.get('nodeLabels');
        const relevance = record.get('relevance');
        
        return {
          id: node.identity.toString(),
          labels: labels,
          properties: { ...node.properties, relevance } // Include relevance score in properties
        };
      });
      
      await redisCache.set(cacheKey, nodes);
      return nodes;
    } catch (error) {
      console.error('Error in searchAllNodeTypes:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Search specifically for concepts - retaining the original function for compatibility
   */
  async searchSimilarConcepts(userId: string, text: string, limit = 5): Promise<NodeData[]> {
    const cacheKey = redisCache.getCacheKey(userId, 'searchSimilarConcepts', `${text}-${limit}`);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache hit for searchSimilarConcepts');
      return cachedData;
    }

    const session = this.getSession();
    try {
      // Sanitize limit parameter
      const sanitizedLimit = neo4j.int(Number.parseInt(String(limit), 10));
      
      // Simple text search without APOC (which may not be available)
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
      
      await redisCache.set(cacheKey, concepts);
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
   * This will search across multiple node types and build a relevant context graph
   */
  async getContextForQuery(userId: string, query: string, limit = 5): Promise<ContextData> {
    const cacheKey = redisCache.getCacheKey(userId, 'getContextForQuery', `${query}-${limit}`);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache hit for getContextForQuery');
      return cachedData;
    }

    // Sanitize limit parameter for Neo4j query
    const sanitizedNumber = Number.parseInt(String(limit), 10);

    // First find relevant nodes across all types
    const relevantNodes = await this.searchAllNodeTypes(userId, query, sanitizedNumber);
    
    // No nodes found
    if (relevantNodes.length === 0) {
      return { nodes: [], relationships: [] };
    }
    
    const nodeIds = relevantNodes.map(n => n.id);
    
    const session = this.getSession();
    try {
      // Get relationships between the found nodes
      const result = await session.run(
        `
        MATCH (n1)-[r]-(n2)
        WHERE id(n1) IN $nodeIds AND id(n2) IN $nodeIds
        AND n1.user_id = $userId AND n2.user_id = $userId
        RETURN r, id(n1) as source, id(n2) as target
        `,
        { 
          nodeIds: nodeIds.map(id => neo4j.int(Number.parseInt(id, 10))), 
          userId 
        }
      );
      
      const relationships = result.records.map(record => {
        const r = record.get('r');
        const source = record.get('source').toString();
        const target = record.get('target').toString();
        
        return {
          type: r.type,
          properties: r.properties,
          source,
          target
        };
      });
      
      const contextData: ContextData = { 
        nodes: relevantNodes,
        relationships
      };
      
      await redisCache.set(cacheKey, contextData);
      return contextData;
    } catch (error) {
      console.error('Error in getContextForQuery:', error);
      return { nodes: relevantNodes, relationships: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Backward compatibility method for getConceptsForContext
   */
  async getConceptsForContext(userId: string, query: string, limit = 3): Promise<{concepts: NodeData[], relationships: RelationshipData[]}> {
    // Sanitize limit parameter
    const sanitizedNumber = Number.parseInt(String(limit), 10);
    
    const contextData = await this.getContextForQuery(userId, query, sanitizedNumber);
    
    // For backward compatibility, filter to only include Concept nodes
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
    await this.shutdown();
  }
}

// Lazy singleton pattern to prevent issues during module load
let neo4jServiceInstance: Neo4jService | null = null;

export const getNeo4jService = (): Neo4jService => {
  if (!neo4jServiceInstance) {
    neo4jServiceInstance = new Neo4jService();
  }
  return neo4jServiceInstance;
};

// Lazy getters to prevent service creation during module load
export const neo4jService = new Proxy({} as Neo4jService, {
  get(target, prop) {
    return getNeo4jService()[prop as keyof Neo4jService];
  }
});

// For backward compatibility with productionBrainService
export const productionBrainService = neo4jService; 