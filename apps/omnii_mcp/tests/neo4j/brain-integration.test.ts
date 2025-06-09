import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { BrainConversationManager } from '../../src/services/brain-conversation-manager';
import { v4 as uuidv4 } from 'uuid';

describe('BrainConversationManager Integration Test', () => {
  let manager: BrainConversationManager;
  const testUserId = `test-user-${Date.now()}`;

  beforeEach(() => {
    // Initialize with production credentials 
    manager = new BrainConversationManager();
  });

  test('should initialize BrainConversationManager successfully', () => {
    expect(manager).toBeDefined();
    expect(manager.storeSMSConversation).toBeFunction();
    expect(manager.storeChatConversation).toBeFunction();
    expect(manager.getBrainMemoryContext).toBeFunction();
    expect(manager.executeComposioToolWithMemory).toBeFunction();
  });

  test('should store SMS conversation with brain properties', async () => {
    const testMessage = {
      user_id: testUserId,
      content: 'Schedule a meeting for tomorrow at 2 PM',
      phone_number: '+1234567890',
      is_incoming: true,
      local_datetime: new Date().toISOString()
    };

    try {
      const result = await manager.storeSMSConversation(testMessage);
      
      // Validate enhanced ChatMessage structure
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.content).toBe(testMessage.content);
      expect(result.channel).toBe('sms');
      expect(result.source_identifier).toBe(testMessage.phone_number);
      expect(result.timestamp).toBeDefined();
      
      // Brain-like properties
      expect(result.intent).toBeDefined();
      expect(typeof result.sentiment).toBe('number');
      expect(typeof result.importance_score).toBe('number');
      expect(result.importance_score).toBeGreaterThanOrEqual(0);
      expect(result.importance_score).toBeLessThanOrEqual(1);
      
      // SMS metadata
      expect(result.sms_metadata).toBeDefined();
      expect(result.sms_metadata.phone_number).toBe(testMessage.phone_number);
      expect(result.sms_metadata.is_incoming).toBe(true);
      
      console.log('🧠 SMS Conversation stored successfully:', {
        id: result.id,
        intent: result.intent,
        sentiment: result.sentiment,
        importance: result.importance_score
      });
      
    } catch (error) {
      console.error('❌ SMS storage failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout for Neo4j operations

  test('should store chat conversation with brain properties', async () => {
    const testMessage = {
      user_id: testUserId,
      content: 'Can you help me organize my tasks?',
      chat_id: 'chat-123',
      is_incoming: true,
      websocket_session_id: 'ws-session-456'
    };

    try {
      const result = await manager.storeChatConversation(testMessage);
      
      // Validate enhanced ChatMessage structure
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.content).toBe(testMessage.content);
      expect(result.channel).toBe('chat');
      expect(result.source_identifier).toBe(testMessage.chat_id);
      
      // Brain-like properties
      expect(result.intent).toBeDefined();
      expect(typeof result.sentiment).toBe('number');
      expect(typeof result.importance_score).toBe('number');
      
      // Chat metadata
      expect(result.chat_metadata).toBeDefined();
      expect(result.chat_metadata.chat_id).toBe(testMessage.chat_id);
      expect(result.chat_metadata.websocket_session_id).toBe(testMessage.websocket_session_id);
      
      console.log('🧠 Chat Conversation stored successfully:', {
        id: result.id,
        intent: result.intent,
        sentiment: result.sentiment,
        importance: result.importance_score
      });
      
    } catch (error) {
      console.error('❌ Chat storage failed:', error);
      throw error;
    }
  }, 30000);

  test('should retrieve brain memory context', async () => {
    try {
      const context = await manager.getBrainMemoryContext(
        testUserId,
        'What meetings do I have this week?',
        'sms',
        '+1234567890'
      );
      
      // Validate brain memory context structure
      expect(context).toBeDefined();
      expect(context.working_memory).toBeDefined();
      expect(context.episodic_memory).toBeDefined();
      expect(context.semantic_memory).toBeDefined();
      expect(context.consolidation_metadata).toBeDefined();
      
      // Working memory structure
      expect(Array.isArray(context.working_memory.recent_messages)).toBe(true);
      expect(Array.isArray(context.working_memory.time_window_messages)).toBe(true);
      expect(Array.isArray(context.working_memory.recently_modified_messages)).toBe(true);
      expect(context.working_memory.time_window_stats).toBeDefined();
      
      // Memory strength bounds
      expect(context.consolidation_metadata.memory_strength).toBeGreaterThanOrEqual(0);
      expect(context.consolidation_metadata.memory_strength).toBeLessThanOrEqual(1);
      
      console.log('🧠 Brain Memory Context retrieved successfully:', {
        working_memory_size: context.working_memory.recent_messages.length,
        episodic_threads: context.episodic_memory.conversation_threads.length,
        semantic_concepts: context.semantic_memory.activated_concepts.length,
        memory_strength: context.consolidation_metadata.memory_strength
      });
      
    } catch (error) {
      console.error('❌ Memory context retrieval failed:', error);
      throw error;
    }
  }, 30000);

  test('should analyze content with brain-like processing', async () => {
    // Test various message types to see brain analysis
    const testMessages = [
      'Schedule a meeting for tomorrow',
      'Can you help me find my contacts?',
      'Send an email to the team',
      'I love this new feature!',
      'Create a task to review the proposal'
    ];

    for (const content of testMessages) {
      try {
        const result = await manager.storeSMSConversation({
          user_id: testUserId,
          content,
          phone_number: '+1234567890',
          is_incoming: true
        });

        console.log(`🧠 Brain Analysis for "${content}":`, {
          intent: result.intent,
          sentiment: result.sentiment.toFixed(2),
          importance: result.importance_score.toFixed(2)
        });

        expect(result.intent).toBeDefined();
        expect(typeof result.sentiment).toBe('number');
        expect(typeof result.importance_score).toBe('number');
        
      } catch (error) {
        console.error(`❌ Analysis failed for "${content}":`, error);
        throw error;
      }
    }
  }, 60000); // Longer timeout for multiple operations

  afterEach(async () => {
    // Cleanup: close manager connections
    if (manager) {
      try {
        await manager.close();
      } catch (error) {
        console.warn('Warning: Error closing manager:', error);
      }
    }
  });
}); 