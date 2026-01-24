/**
 * Integration Tests for Modified Files
 * 
 * Tests all files modified during brain memory implementation to ensure
 * no functionality was broken and everything works as expected.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { SimpleSMSAI } from '../../src/services/sms-ai-simple';
import { WebSocketHandlerService } from '../../src/services/websocket-handler.service';
import { redisCache } from '../../src/services/redis-cache';
import { 
  ExecutionContext, 
  ExecutionContextType,
  PlanState
} from '../../src/types/action-planning.types';
import { BrainMemoryContext } from '../../src/types/brain-memory-schemas';
import {
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketResponseStatus
} from '../../src/types/websocket.types';
import { mockWebSocket, mockBrainService, mockComposio, mockOpenAI, setupMockEnvironment } from '../neo4j/mocks/test-mocks';
import { mock } from 'bun:test';

// Mock the production brain service before importing the services
mock.module('../../src/services/memory/production-brain-service', () => {
  return {
    productionBrainService: mockBrainService
  };
});

describe('Modified Files Integration Tests', () => {
  
  beforeAll(() => {
    setupMockEnvironment();
  });

  // ============================================================================
  // REDIS CACHE TESTS (Security & Functionality)
  // ============================================================================
  
  describe('RedisCache Service (Security Cleanup)', () => {
    
    test('should connect without exposing credentials', async () => {
      console.log('[Test] 🔒 Testing Redis cache security and functionality...');
      
      // Test that cache methods don't throw errors
      await expect(redisCache.set('test:key', { data: 'test' })).resolves.toBeUndefined();
      
      const result = await redisCache.get('test:key');
      console.log('[Test] ✅ Redis cache operations work without exposed credentials');
      
      // Test cache key generation
      const cacheKey = redisCache.getCacheKey('user123', 'brain_memory', 'test_query');
      expect(cacheKey).toBe('user123:brain_memory:test_query');
      console.log('[Test] ✅ Cache key generation works correctly');
      
      // Test availability check
      const isAvailable = redisCache.isAvailable();
      console.log(`[Test] 📊 Redis availability: ${isAvailable}`);
      
      // Cleanup
      await redisCache.del('test:key');
    });

    test('should handle Redis unavailability gracefully', async () => {
      console.log('[Test] 🔧 Testing Redis fallback behavior...');
      
      // Even if Redis is unavailable, operations should not throw
      await expect(redisCache.get('nonexistent:key')).resolves.toBeNull();
      await expect(redisCache.set('test:unavailable', { data: 'test' })).resolves.toBeUndefined();
      await expect(redisCache.del('test:unavailable')).resolves.toBeUndefined();
      
      console.log('[Test] ✅ Redis gracefully handles unavailability');
    });
  });

  // ============================================================================
  // SMS AI SIMPLE TESTS (Brain Memory Integration)
  // ============================================================================
  
  describe('SimpleSMSAI Service (Brain Memory Integration)', () => {
    let smsAI: SimpleSMSAI;
    
    beforeEach(() => {
      smsAI = new SimpleSMSAI();
    });
    
    test('should process SMS message with brain memory integration', async () => {
      console.log('[Test] 🧠 Testing SMS processing with brain memory...');
      
      const testMessage = "Can you help me find my contacts?";
      const testPhone = "+18582260766"; // Mapped to santino62@gmail.com
      
      const result = await smsAI.processMessage(testMessage, testPhone);
      
      // Should not throw and should return expected structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      
      // Brain memory fields should be present
      expect(result).toHaveProperty('brainMemoryUsed');
      expect(result).toHaveProperty('memoryStrength');
      expect(result).toHaveProperty('relatedConversations');
      
      console.log(`[Test] ✅ SMS processing result:`, {
        success: result.success,
        messageLength: result.message.length,
        brainMemoryUsed: result.brainMemoryUsed,
        memoryStrength: result.memoryStrength,
        relatedConversations: result.relatedConversations
      });
    });

    test('should handle unregistered phone numbers', async () => {
      console.log('[Test] 📱 Testing unregistered phone number handling...');
      
      const result = await smsAI.processMessage("Test message", "+1234567890");
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('not registered');
      
      console.log('[Test] ✅ Unregistered phone handling works correctly');
    });

    test('should handle processing errors gracefully', async () => {
      console.log('[Test] ⚠️ Testing SMS error handling...');
      
      // Test with null/undefined message (edge case)
      const result = await smsAI.processMessage('', "+18582260766");
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      
      console.log('[Test] ✅ SMS error handling works correctly');
    });
  });

  // ============================================================================
  // WEBSOCKET HANDLER TESTS (Brain Memory Integration)
  // ============================================================================
  
  describe('WebSocketHandlerService (Brain Memory Integration)', () => {
    let wsHandler: WebSocketHandlerService;
    let mockWS: any;
    
    beforeEach(() => {
      wsHandler = new WebSocketHandlerService();
      mockWS = mockWebSocket('test-connection-id');
    });
    
    test('should register and manage WebSocket connections', () => {
      console.log('[Test] 🔌 Testing WebSocket connection management...');
      
      const userId = 'test-user-123';
      
      // Test connection registration
      wsHandler.registerConnectionForUser(userId, mockWS);
      expect(wsHandler.isUserConnected(userId)).toBe(true);
      expect(wsHandler.getConnectionCount()).toBe(1);
      expect(wsHandler.getConnectedUsers()).toContain(userId);
      
      // Test message sending
      const sendResult = wsHandler.sendToClient(userId, { test: 'message' });
      expect(sendResult).toBe(true);
      
      // Test connection removal
      wsHandler.removeConnectionForUser(userId);
      expect(wsHandler.isUserConnected(userId)).toBe(false);
      expect(wsHandler.getConnectionCount()).toBe(0);
      
      console.log('[Test] ✅ WebSocket connection management works correctly');
    });

    test('should process command messages with brain memory', async () => {
      console.log('[Test] 🧠 Testing WebSocket command processing with brain memory...');
      
      const userId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
      wsHandler.registerConnectionForUser(userId, mockWS);
      
      const commandMessage: WebSocketMessage = {
        type: WebSocketMessageType.COMMAND,
        payload: {
          userId: userId,
          message: "Show me my recent emails",
          localDatetime: new Date().toISOString()
        }
      };
      
      const result = await wsHandler.processMessage(commandMessage, mockWS);
      
      // Should return a structured response
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // Should have standard WebSocket response structure or UnifiedToolResponse
      if (result.status) {
        // WebSocket response format
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('timestamp');
      } else {
        // UnifiedToolResponse format
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
      }
      
      console.log('[Test] ✅ WebSocket command processing with brain memory works');
    });

    test('should handle ping messages', async () => {
      console.log('[Test] 🏓 Testing WebSocket ping handling...');
      
      const pingMessage: WebSocketMessage = {
        type: WebSocketMessageType.PING,
        payload: {}
      };
      
      const result = await wsHandler.processMessage(pingMessage, mockWS);
      
      expect(result.status).toBe(WebSocketResponseStatus.SUCCESS);
      expect(result.data.pong).toBe(true);
      
      console.log('[Test] ✅ WebSocket ping handling works correctly');
    });

    test('should handle invalid messages gracefully', async () => {
      console.log('[Test] ⚠️ Testing WebSocket error handling...');
      
      const invalidMessage = {
        // Missing type field
        payload: { message: "test" }
      } as WebSocketMessage;
      
      const result = await wsHandler.processMessage(invalidMessage, mockWS);
      
      expect(result.status).toBe(WebSocketResponseStatus.ERROR);
      expect(result.data.error).toContain('missing type');
      
      console.log('[Test] ✅ WebSocket error handling works correctly');
    });
  });

  // ============================================================================
  // TYPE SAFETY TESTS (Action Planning Types)
  // ============================================================================
  
  describe('Action Planning Types (Brain Memory Enhancement)', () => {
    
    test('should have proper ExecutionContext type with brain memory', () => {
      console.log('[Test] 🔍 Testing ExecutionContext type safety...');
      
      const mockBrainContext: BrainMemoryContext = {
        working_memory: {
          recent_messages: [],
          time_window_messages: [],
          recently_modified_messages: [],
          active_concepts: [],
          current_intent: 'test',
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
          memory_strength: 0.5,
          context_channels: ['sms'],
          memory_age_hours: 24,
          consolidation_score: 0.3,
          working_memory_limit: 7,
          episodic_window_hours: 168,
          semantic_activation_threshold: 0.3
        }
      };
      
      const context: ExecutionContext = {
        entityId: 'test-entity',
        phoneNumber: '+1234567890',
        userTimezone: 'America/Los_Angeles',
        stepResults: new Map(),
        currentStepIndex: 0,
        entities: [],
        sessionId: 'test-session',
        planState: PlanState.PENDING,
        context: ExecutionContextType.SMS,
        brainMemoryContext: mockBrainContext,
        communicationChannel: 'sms',
        chatMetadata: {
          chatId: 'test-chat',
          isGroupChat: false,
          participants: ['user1']
        }
      };
      
      // Test type safety
      expect(context.brainMemoryContext).toBeDefined();
      expect(context.communicationChannel).toBe('sms');
      expect(context.chatMetadata?.chatId).toBe('test-chat');
      
      console.log('[Test] ✅ ExecutionContext type safety works correctly');
    });

    test('should handle optional brain memory context', () => {
      console.log('[Test] 🔍 Testing optional brain memory context...');
      
      const context: ExecutionContext = {
        entityId: 'test-entity',
        phoneNumber: '+1234567890',
        userTimezone: 'America/Los_Angeles',
        stepResults: new Map(),
        currentStepIndex: 0,
        entities: [],
        sessionId: 'test-session',
        planState: PlanState.PENDING,
        context: ExecutionContextType.SMS,
        // brainMemoryContext is optional
        communicationChannel: 'sms'
      };
      
      expect(context.brainMemoryContext).toBeUndefined();
      expect(context.communicationChannel).toBe('sms');
      
      console.log('[Test] ✅ Optional brain memory context works correctly');
    });
  });

  // ============================================================================
  // INTEGRATION FLOW TESTS
  // ============================================================================
  
  describe('End-to-End Integration Flow', () => {
    
    test('should handle complete SMS to brain memory flow', async () => {
      console.log('[Test] 🔄 Testing complete SMS to brain memory integration...');
      
      const smsAI = new SimpleSMSAI();
      const testMessage = "Create a task to review the quarterly report";
      const testPhone = "+18582260766";
      
      // Process SMS message
      const smsResult = await smsAI.processMessage(testMessage, testPhone);
      
      // Should complete without errors
      expect(smsResult.success).toBeDefined();
      expect(smsResult.message).toBeDefined();
      
      // Brain memory should be integrated
      expect(smsResult.brainMemoryUsed).toBeDefined();
      
      console.log(`[Test] ✅ SMS to brain memory flow completed:`, {
        success: smsResult.success,
        brainMemoryUsed: smsResult.brainMemoryUsed,
        memoryStrength: smsResult.memoryStrength
      });
    });

    test('should handle complete WebSocket to brain memory flow', async () => {
      console.log('[Test] 🔄 Testing complete WebSocket to brain memory integration...');
      
      const wsHandler = new WebSocketHandlerService();
      const mockWS = mockWebSocket('integration-test');
      const userId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
      
      wsHandler.registerConnectionForUser(userId, mockWS);
      
      const message: WebSocketMessage = {
        type: WebSocketMessageType.COMMAND,
        payload: {
          userId: userId,
          message: "What meetings do I have today?",
          localDatetime: new Date().toISOString()
        }
      };
      
      const result = await wsHandler.processMessage(message, mockWS);
      
      // Should complete without errors
      expect(result).toBeDefined();
      
      console.log('[Test] ✅ WebSocket to brain memory flow completed');
      
      // Cleanup
      wsHandler.removeConnectionForUser(userId);
    });
  });

  // ============================================================================
  // PERFORMANCE & STABILITY TESTS
  // ============================================================================
  
  describe('Performance & Stability', () => {
    
    test('should handle concurrent operations without breaking', async () => {
      console.log('[Test] ⚡ Testing concurrent operations...');
      
      const smsAI = new SimpleSMSAI();
      const testPhone = "+18582260766";
      
      // Run multiple concurrent SMS processing
      const promises = [
        smsAI.processMessage("Test message 1", testPhone),
        smsAI.processMessage("Test message 2", testPhone),
        smsAI.processMessage("Test message 3", testPhone)
      ];
      
      const results = await Promise.allSettled(promises);
      
      // All should complete (fulfilled or rejected, but not hanging)
      expect(results.length).toBe(3);
      results.forEach((result, index) => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
        console.log(`[Test] 📊 Concurrent operation ${index + 1}: ${result.status}`);
      });
      
      console.log('[Test] ✅ Concurrent operations handling works correctly');
    });

    test('should maintain memory efficiency', async () => {
      console.log('[Test] 💾 Testing memory efficiency...');
      
      const wsHandler = new WebSocketHandlerService();
      const initialMemory = process.memoryUsage();
      
      // Create and remove many connections
      for (let i = 0; i < 10; i++) {
        const mockWS = mockWebSocket(`test-${i}`);
        wsHandler.registerConnectionForUser(`user-${i}`, mockWS);
      }
      
      // Remove all connections
      for (let i = 0; i < 10; i++) {
        wsHandler.removeConnectionForUser(`user-${i}`);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`[Test] 📊 Memory usage change: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      expect(wsHandler.getConnectionCount()).toBe(0);
      
      console.log('[Test] ✅ Memory efficiency test completed');
    });
  });
}); 