/**
 * Test Mocks for Integration Tests
 * 
 * Provides mock implementations for testing modified files
 */

import { mock } from 'bun:test';
import { MockComposioService, MockOpenAIService, MockRedisCache } from './composio-mock';

// Mock WebSocket for testing WebSocket handler
export function mockWebSocket(id: string) {
  return {
    id: id,
    readyState: 1, // OPEN state
    send: mock((message: string) => {
      console.log(`[MockWebSocket] Sent: ${message.substring(0, 100)}...`);
    }),
    close: mock(() => {
      console.log(`[MockWebSocket] Connection closed: ${id}`);
    }),
    addEventListener: mock(() => {}),
    removeEventListener: mock(() => {})
  };
}

// Mock Brain Service
export const mockBrainService = {
  manager: {
    storeSMSConversation: mock(async (data: any) => {
      console.log(`[MockBrainService] Storing SMS conversation for ${data.phone_number}`);
      return {
        id: 'mock-message-id',
        content: data.content,
        timestamp: new Date().toISOString(),
        channel: 'sms',
        source_identifier: data.phone_number,
        intent: 'mock_intent',
        sentiment: 0.5,
        importance_score: 0.7
      };
    }),
    
    storeChatConversation: mock(async (data: any) => {
      console.log(`[MockBrainService] Storing chat conversation for ${data.chat_id}`);
      return {
        id: 'mock-message-id',
        content: data.content,
        timestamp: new Date().toISOString(),
        channel: 'chat',
        source_identifier: data.chat_id,
        intent: 'mock_intent',
        sentiment: 0.5,
        importance_score: 0.7
      };
    }),
    
    getBrainMemoryContext: mock(async (userId: string, message: string, channel: string, sourceId: string) => {
      console.log(`[MockBrainService] Getting brain memory context for ${channel}:${sourceId}`);
      return {
        working_memory: {
          recent_messages: [],
          time_window_messages: [],
          recently_modified_messages: [],
          active_concepts: ['test-concept'],
          current_intent: 'mock_intent',
          time_window_stats: {
            previous_week_count: 0,
            current_week_count: 1,
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
          memory_strength: 0.6,
          context_channels: [channel],
          memory_age_hours: 24,
          consolidation_score: 0.4,
          working_memory_limit: 7,
          episodic_window_hours: 168,
          semantic_activation_threshold: 0.3
        }
      };
    }),
    
    executeComposioToolWithMemory: mock(async (userId: string, toolCall: any, composio: any, brainContext: any) => {
      console.log(`[MockBrainService] Executing Composio tool with memory: ${toolCall.function?.name}`);
      return {
        success: true,
        result: { mockData: 'test' },
        memoryEnhanced: true,
        memoryInsights: ['Mock insight 1', 'Mock insight 2']
      };
    })
  },
  
  getBrainMemoryContext: mock(async (userId: string, message: string, channel: string, sourceId: string, options?: any) => {
    console.log(`[MockBrainService] Getting brain memory context for ${channel}:${sourceId}`);
    
    // Simulate timeout for testing
    if (options?.timeoutMs && options.timeoutMs < 50) {
      await new Promise(resolve => setTimeout(resolve, options.timeoutMs + 10));
      throw new Error('Timeout');
    }
    
    return {
      working_memory: {
        recent_messages: [
          {
            id: 'mock-msg-1',
            content: 'Previous message',
            timestamp: new Date(Date.now() - 60000).toISOString(),
            channel: channel,
            source_identifier: sourceId,
            intent: 'previous_intent',
            sentiment: 0.3,
            importance_score: 0.5
          }
        ],
        time_window_messages: [],
        recently_modified_messages: [],
        active_concepts: ['calendar', 'meeting'],
        current_intent: 'request',
        time_window_stats: {
          previous_week_count: 2,
          current_week_count: 3,
          next_week_count: 0,
          recently_modified_count: 1
        }
      },
      episodic_memory: {
        conversation_threads: [],
        related_episodes: []
      },
      semantic_memory: {
        activated_concepts: [
          {
            concept: {
              id: 'concept-1',
              name: 'calendar',
              activation_strength: 0.8,
              mention_count: 3,
              semantic_weight: 0.7,
              user_id: userId
            },
            activation_strength: 0.8,
            related_concepts: ['meeting', 'schedule']
          }
        ],
        concept_associations: []
      },
      consolidation_metadata: {
        retrieval_timestamp: new Date().toISOString(),
        memory_strength: 0.75,
        context_channels: [channel],
        memory_age_hours: 1,
        consolidation_score: 0.6,
        working_memory_limit: 7,
        episodic_window_hours: 168,
        semantic_activation_threshold: 0.3,
        sms_optimization: channel === 'sms' ? {
          character_budget: 1500,
          suggested_response_length: 'normal' as const
        } : undefined,
        chat_optimization: channel === 'chat' ? {
          max_message_length: 4000,
          supports_rich_content: true,
          real_time_context: true,
          thread_aware: true
        } : undefined
      }
    };
  })
};

// Mock Composio service (re-export from existing mock)
export const mockComposio = new MockComposioService();

// Mock OpenAI service (re-export from existing mock) 
export const mockOpenAI = new MockOpenAIService();

// Mock Redis cache (re-export from existing mock)
export const mockRedis = new MockRedisCache();

// Mock environment for testing
export function setupMockEnvironment() {
  // Set required environment variables for tests
  if (!process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = 'mock-openai-key';
  }
  if (!process.env.NEO4J_URI) {
    process.env.NEO4J_URI = 'bolt://localhost:7687';
  }
  if (!process.env.NEO4J_USER) {
    process.env.NEO4J_USER = 'neo4j';
  }
  if (!process.env.NEO4J_PASSWORD) {
    process.env.NEO4J_PASSWORD = 'password';
  }
  if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = 'redis://localhost:6379';
  }
  
  console.log('[MockEnv] Environment variables set for testing');
}

// Mock production brain service
export const mockProductionBrainService = {
  manager: mockBrainService.manager,
  getBrainMemoryContext: mockBrainService.getBrainMemoryContext,
  isHealthy: mock(() => true),
  healthStatus: mock(() => ({
    status: 'healthy',
    neo4j: 'connected',
    redis: 'connected',
    lastCheck: new Date().toISOString()
  }))
};

// Export everything for easy importing
export {
  MockComposioService,
  MockOpenAIService, 
  MockRedisCache
}; 