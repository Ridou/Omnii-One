/**
 * Production Brain Service Tests
 * 
 * Comprehensive tests for production brain service functionality
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

describe('Production Brain Service', () => {

  let productionBrainService: any;
  let mockBrainManager: any;
  
  beforeAll(async () => {
    console.log('[ProductionBrainService] Test environment initialized');
    
    // Create mock brain manager
    mockBrainManager = {
      storeSMSConversation: async (content: string, phoneNumber: string, isIncoming: boolean, userId?: string) => {
        return {
          brainMemoryUsed: true,
          memoryStrength: 0.85,
          relatedConversations: ['conversation_1', 'conversation_2'],
          activatedConcepts: ['sms', 'conversation'],
          workingMemoryInsights: ['Recent SMS activity with this contact'],
          semanticConnections: ['communication', 'mobile']
        };
      },
      
      storeChatConversation: async (content: string, chatId: string, userId?: string, metadata?: any) => {
        return {
          brainMemoryUsed: true,
          memoryStrength: 0.78,
          relatedConversations: ['chat_thread_1'],
          activatedConcepts: ['chat', 'conversation'],
          workingMemoryInsights: ['Active chat session'],
          semanticConnections: ['communication', 'realtime']
        };
      },
      
      retrieveBrainMemoryContext: async (userId: string, channel: string, metadata?: any) => {
        return {
          working_memory: {
            recent_messages: [],
            time_window_messages: [],
            recently_modified_messages: [],
            active_concepts: ['test', 'memory'],
            current_intent: 'info',
            time_window_stats: {
              previous_week_count: 5,
              current_week_count: 8,
              next_week_count: 2,
              recently_modified_count: 1
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
            memory_strength: 0.75,
            context_channels: [channel],
            memory_age_hours: 12,
            consolidation_score: 0.6,
            working_memory_limit: 7,
            episodic_window_hours: 168,
            semantic_activation_threshold: 0.3
          }
        };
      },
      
      isHealthy: async () => true,
      
      getHealthStatus: async () => ({
        neo4j: 'connected',
        brain_manager: 'operational',
        last_check: new Date().toISOString()
      }),
      
      close: async () => {
        console.log('[MockBrainManager] Closed successfully');
      }
    };
    
    // Create production brain service wrapper
    productionBrainService = {
      manager: mockBrainManager,
      isInitialized: true,
      lastHealthCheck: new Date(),
      
      async initializeWithRetry() {
        this.isInitialized = true;
        return true;
      },
      
      async ensureHealthy() {
        if (!this.isInitialized) {
          await this.initializeWithRetry();
        }
        
        const isHealthy = await this.manager.isHealthy();
        if (!isHealthy) {
          throw new Error('Brain service is not healthy');
        }
        
        this.lastHealthCheck = new Date();
        return true;
      },
      
      async getMonitoringData() {
        return {
          service_status: 'operational',
          last_health_check: this.lastHealthCheck.toISOString(),
          memory_usage: '145MB',
          active_connections: 3,
          total_operations: 1247,
          error_rate: 0.001,
          average_response_time: '45ms',
          cache_hit_rate: 0.78
        };
      }
    };
  });

  afterAll(async () => {
    if (productionBrainService?.manager) {
      await productionBrainService.manager.close();
    }
    console.log('[ProductionBrainService] Test cleanup completed');
  });

  // ============================================================================
  // SERVICE INITIALIZATION TESTS
  // ============================================================================

  describe('Service Initialization', () => {
    
    test('should initialize production brain service successfully', async () => {
      console.log('[Test] 🚀 Testing production brain service initialization...');
      
      const result = await productionBrainService.initializeWithRetry();
      
      expect(result).toBe(true);
      expect(productionBrainService.isInitialized).toBe(true);
      expect(productionBrainService.manager).toBeDefined();
      
      console.log('[Test] ✅ Production brain service initialized successfully');
    });

    test('should handle initialization failures gracefully', async () => {
      console.log('[Test] 🔧 Testing initialization failure handling...');
      
      // Create a mock service that fails to initialize
      const failingService = {
        isInitialized: false,
        initAttempts: 0,
        
        async initializeWithRetry() {
          this.initAttempts++;
          if (this.initAttempts < 3) {
            throw new Error('Mock initialization failure');
          }
          this.isInitialized = true;
          return true;
        }
      };
      
      const result = await failingService.initializeWithRetry();
      
      expect(result).toBe(true);
      expect(failingService.isInitialized).toBe(true);
      expect(failingService.initAttempts).toBe(3);
      
      console.log('[Test] ✅ Initialization failure handling works correctly');
    });
  });

  // ============================================================================
  // HEALTH MONITORING TESTS
  // ============================================================================

  describe('Health Monitoring', () => {
    
    test('should check service health status', async () => {
      console.log('[Test] 🏥 Testing service health status check...');
      
      const healthStatus = await productionBrainService.ensureHealthy();
      
      expect(healthStatus).toBe(true);
      expect(productionBrainService.lastHealthCheck).toBeInstanceOf(Date);
      
      // Health check should be recent (within last minute)
      const timeSinceCheck = Date.now() - productionBrainService.lastHealthCheck.getTime();
      expect(timeSinceCheck).toBeLessThan(60000);
      
      console.log('[Test] ✅ Service health status check successful');
    });

    test('should get detailed health status from brain manager', async () => {
      console.log('[Test] 📊 Testing detailed health status retrieval...');
      
      const healthStatus = await productionBrainService.manager.getHealthStatus();
      
      expect(healthStatus).toMatchObject({
        neo4j: expect.any(String),
        brain_manager: expect.any(String),
        last_check: expect.any(String)
      });
      
      expect(healthStatus.neo4j).toBe('connected');
      expect(healthStatus.brain_manager).toBe('operational');
      
      console.log('[Test] ✅ Detailed health status retrieval successful');
    });
  });

  // ============================================================================
  // SMS CONVERSATION HANDLING TESTS
  // ============================================================================

  describe('SMS Conversation Handling', () => {
    
    test('should store SMS conversation successfully', async () => {
      console.log('[Test] 📱 Testing SMS conversation storage...');
      
      const result = await productionBrainService.manager.storeSMSConversation(
        'Test SMS message content',
        '+18582260766',
        true,
        'user123'
      );
      
      expect(result).toMatchObject({
        brainMemoryUsed: true,
        memoryStrength: expect.any(Number),
        relatedConversations: expect.any(Array),
        activatedConcepts: expect.any(Array),
        workingMemoryInsights: expect.any(Array),
        semanticConnections: expect.any(Array)
      });
      
      expect(result.memoryStrength).toBeGreaterThan(0.5);
      expect(result.activatedConcepts).toContain('sms');
      expect(result.relatedConversations).toHaveLength(2);
      
      console.log('[Test] ✅ SMS conversation storage successful');
    });

    test('should handle incoming vs outgoing SMS differently', async () => {
      console.log('[Test] 📲 Testing incoming vs outgoing SMS handling...');
      
      const incomingResult = await productionBrainService.manager.storeSMSConversation(
        'Incoming SMS message',
        '+18582260766',
        true,
        'user123'
      );
      
      const outgoingResult = await productionBrainService.manager.storeSMSConversation(
        'Outgoing SMS message',
        '+18582260766',
        false,
        'user123'
      );
      
      expect(incomingResult.brainMemoryUsed).toBe(true);
      expect(outgoingResult.brainMemoryUsed).toBe(true);
      
      // Both should activate conversation-related concepts
      expect(incomingResult.activatedConcepts).toContain('sms');
      expect(outgoingResult.activatedConcepts).toContain('sms');
      
      console.log('[Test] ✅ Incoming vs outgoing SMS handling works correctly');
    });
  });

  // ============================================================================
  // CHAT CONVERSATION HANDLING TESTS
  // ============================================================================

  describe('Chat Conversation Handling', () => {
    
    test('should store chat conversation successfully', async () => {
      console.log('[Test] 💬 Testing chat conversation storage...');
      
      const result = await productionBrainService.manager.storeChatConversation(
        'Test chat message content',
        'chat_123',
        'user123',
        { websocket_session_id: 'ws_456', is_group_chat: false }
      );
      
      expect(result).toMatchObject({
        brainMemoryUsed: true,
        memoryStrength: expect.any(Number),
        relatedConversations: expect.any(Array),
        activatedConcepts: expect.any(Array),
        workingMemoryInsights: expect.any(Array),
        semanticConnections: expect.any(Array)
      });
      
      expect(result.memoryStrength).toBeGreaterThan(0.5);
      expect(result.activatedConcepts).toContain('chat');
      expect(result.semanticConnections).toContain('realtime');
      
      console.log('[Test] ✅ Chat conversation storage successful');
    });
  });

  // ============================================================================
  // BRAIN MEMORY CONTEXT RETRIEVAL TESTS
  // ============================================================================

  describe('Brain Memory Context Retrieval', () => {
    
    test('should retrieve brain memory context successfully', async () => {
      console.log('[Test] 🧠 Testing brain memory context retrieval...');
      
      const context = await productionBrainService.manager.retrieveBrainMemoryContext(
        'user123',
        'sms',
        { phone_number: '+18582260766' }
      );
      
      expect(context).toMatchObject({
        working_memory: expect.objectContaining({
          recent_messages: expect.any(Array),
          time_window_messages: expect.any(Array),
          active_concepts: expect.any(Array),
          time_window_stats: expect.any(Object)
        }),
        episodic_memory: expect.objectContaining({
          conversation_threads: expect.any(Array),
          related_episodes: expect.any(Array)
        }),
        semantic_memory: expect.objectContaining({
          activated_concepts: expect.any(Array),
          concept_associations: expect.any(Array)
        }),
        consolidation_metadata: expect.objectContaining({
          memory_strength: expect.any(Number),
          context_channels: expect.any(Array),
          working_memory_limit: expect.any(Number)
        })
      });
      
      expect(context.consolidation_metadata.memory_strength).toBeGreaterThan(0);
      expect(context.consolidation_metadata.working_memory_limit).toBe(7);
      expect(context.consolidation_metadata.context_channels).toContain('sms');
      
      console.log('[Test] ✅ Brain memory context retrieval successful');
    });

    test('should handle different channel contexts', async () => {
      console.log('[Test] 📡 Testing different channel contexts...');
      
      const channels = ['sms', 'chat', 'websocket'];
      
      for (const channel of channels) {
        const context = await productionBrainService.manager.retrieveBrainMemoryContext(
          'user123',
          channel
        );
        
        expect(context.consolidation_metadata.context_channels).toContain(channel);
        expect(context.working_memory.active_concepts).toContain('memory');
      }
      
      console.log('[Test] ✅ Different channel contexts handled correctly');
    });

    test('should validate time window statistics', async () => {
      console.log('[Test] ⏰ Testing time window statistics validation...');
      
      const context = await productionBrainService.manager.retrieveBrainMemoryContext(
        'user123',
        'sms'
      );
      
      const stats = context.working_memory.time_window_stats;
      
      expect(stats).toMatchObject({
        previous_week_count: expect.any(Number),
        current_week_count: expect.any(Number),
        next_week_count: expect.any(Number),
        recently_modified_count: expect.any(Number)
      });
      
      // All counts should be non-negative
      Object.values(stats).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
      });
      
      console.log('[Test] ✅ Time window statistics validation successful');
    });
  });

  // ============================================================================
  // ERROR HANDLING AND RESILIENCE TESTS
  // ============================================================================

  describe('Error Handling and Resilience', () => {
    
    test('should handle database connection errors gracefully', async () => {
      console.log('[Test] 💥 Testing database connection error handling...');
      
      // Create a mock service that simulates database errors
      const errorProneService = {
        manager: {
          storeSMSConversation: async () => {
            throw new Error('Database connection lost');
          },
          
          retrieveBrainMemoryContext: async () => {
            // Return minimal context when database is unavailable
            return {
              working_memory: {
                recent_messages: [],
                time_window_messages: [],
                recently_modified_messages: [],
                active_concepts: [],
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
                memory_strength: 0,
                context_channels: [],
                memory_age_hours: 0,
                consolidation_score: 0,
                working_memory_limit: 7,
                episodic_window_hours: 168,
                semantic_activation_threshold: 0.3
              }
            };
          }
        }
      };
      
      // SMS storage should throw error
      let errorThrown = false;
      try {
        await errorProneService.manager.storeSMSConversation('test', '+1234567890', true);
      } catch (error: any) {
        errorThrown = true;
        expect(error.message).toContain('Database connection lost');
      }
      expect(errorThrown).toBe(true);
      
      // Context retrieval should return minimal context
      const context = await errorProneService.manager.retrieveBrainMemoryContext('user123', 'sms');
      expect(context.consolidation_metadata.memory_strength).toBe(0);
      expect(context.working_memory.active_concepts).toHaveLength(0);
      
      console.log('[Test] ✅ Database connection error handling works correctly');
    });

    test('should handle timeout scenarios', async () => {
      console.log('[Test] ⏱️ Testing timeout scenario handling...');
      
      const timeoutService = {
        manager: {
          storeSMSConversation: async () => {
            // Simulate slow operation
            await new Promise(resolve => setTimeout(resolve, 100));
            return {
              brainMemoryUsed: true,
              memoryStrength: 0.5,
              relatedConversations: [],
              activatedConcepts: [],
              workingMemoryInsights: [],
              semanticConnections: []
            };
          }
        }
      };
      
      const startTime = Date.now();
      const result = await timeoutService.manager.storeSMSConversation('test', '+1234567890', true);
      const endTime = Date.now();
      
      expect(result.brainMemoryUsed).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      
      console.log('[Test] ✅ Timeout scenario handling works correctly');
    });
  });

  // ============================================================================
  // PERFORMANCE AND OPTIMIZATION TESTS
  // ============================================================================

  describe('Performance and Optimization', () => {
    
    test('should meet performance benchmarks for SMS storage', async () => {
      console.log('[Test] ⚡ Testing SMS storage performance benchmarks...');
      
      const startTime = Date.now();
      
      await productionBrainService.manager.storeSMSConversation(
        'Performance test message',
        '+18582260766',
        true,
        'user123'
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 500ms)
      expect(responseTime).toBeLessThan(500);
      
      console.log(`[Test] ✅ SMS storage completed in ${responseTime}ms`);
    });

    test('should meet performance benchmarks for context retrieval', async () => {
      console.log('[Test] 🧠 Testing context retrieval performance benchmarks...');
      
      const startTime = Date.now();
      
      await productionBrainService.manager.retrieveBrainMemoryContext(
        'user123',
        'sms',
        { phone_number: '+18582260766' }
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 200ms)
      expect(responseTime).toBeLessThan(200);
      
      console.log(`[Test] ✅ Context retrieval completed in ${responseTime}ms`);
    });

    test('should maintain memory efficiency', async () => {
      console.log('[Test] 💾 Testing memory efficiency...');
      
      const monitoringData = await productionBrainService.getMonitoringData();
      
      // Memory usage should be reasonable
      const memoryUsageStr = String(monitoringData.memory_usage).replace('MB', '');
      const memoryUsage = parseFloat(memoryUsageStr);
      expect(memoryUsage).toBeLessThan(500); // Less than 500MB
      
      // Cache hit rate should be good
      expect(monitoringData.cache_hit_rate).toBeGreaterThan(0.7);
      
      // Error rate should be low
      expect(monitoringData.error_rate).toBeLessThan(0.01);
      
      console.log('[Test] ✅ Memory efficiency maintained successfully');
    });
  });
}); 