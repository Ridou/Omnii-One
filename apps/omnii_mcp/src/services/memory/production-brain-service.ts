import { Redis } from 'ioredis';
import { BrainConversationManager } from '../brain-conversation-manager';
import { getNeo4jDriver, closeNeo4jDriver } from '../../config/neo4j.config';
import { config } from '../../config/env.validation';
import { BrainMemoryContext } from '../../types/brain-memory-schemas';

export class ProductionBrainService {
  private conversationManager: BrainConversationManager;
  private redis: Redis;
  private consolidationInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize with production Neo4j driver
    this.conversationManager = new BrainConversationManager();
    
    // Initialize Redis for caching
    this.redis = new Redis(process.env.REDIS_URL!, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 60000,
      commandTimeout: 5000
    });

    // Start background consolidation if enabled
    if (config.MEMORY_BRIDGE_ENABLED) {
      this.startMemoryConsolidation();
    }

    console.log('🧠 ProductionBrainService initialized');
    console.log(`🔄 Memory consolidation: ${config.MEMORY_BRIDGE_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    console.log(`⏱️ Consolidation interval: ${config.MEMORY_CONSOLIDATION_INTERVAL}s`);
  }

  // Expose conversationManager for direct access
  get manager(): BrainConversationManager {
    return this.conversationManager;
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
      console.log(`[ProductionBrain] ⚡ Memory retrieved in ${retrievalTime}ms`);
      
      // Performance monitoring
      if (retrievalTime > timeoutMs * 0.8) {
        console.warn(`[ProductionBrain] ⚠️ Slow memory retrieval: ${retrievalTime}ms (threshold: ${timeoutMs}ms)`);
      }

      return memoryContext;

    } catch (error) {
      const retrievalTime = Date.now() - startTime;
      console.error(`[ProductionBrain] ❌ Memory retrieval failed after ${retrievalTime}ms:`, error);

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
    console.log(`[ProductionBrain] 🔄 Using fallback memory context`);
    
    // Try Redis cache first
    const cacheKey = `fallback_memory:${userId}:${channel}:${sourceIdentifier}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      console.log(`[ProductionBrain] 📦 Using cached fallback memory`);
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
    console.log(`[ProductionBrain] 🔄 Starting memory consolidation (interval: ${config.MEMORY_CONSOLIDATION_INTERVAL}s)`);
    
    this.consolidationInterval = setInterval(async () => {
      try {
        console.log(`[ProductionBrain] 🧠 Running memory consolidation cycle`);
        
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

        console.log(`[ProductionBrain] ✅ Memory consolidation cycle completed`);
        
      } catch (error) {
        console.error(`[ProductionBrain] ❌ Memory consolidation failed:`, error);
      }
    }, config.MEMORY_CONSOLIDATION_INTERVAL * 1000);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log(`[ProductionBrain] 🔌 Shutting down brain service...`);
    
    // Stop consolidation
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
      this.consolidationInterval = null;
    }

    // Close connections
    await this.redis.quit();
    await closeNeo4jDriver();
    
    console.log(`[ProductionBrain] ✅ Brain service shutdown complete`);
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
      console.error(`[ProductionBrain] ❌ Health check failed:`, error);
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
}

// Export singleton instance
export const productionBrainService = new ProductionBrainService(); 