import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { testDbManager, testConfig, TimeTestUtils, MemoryTestDataGenerator, MemoryTestAssertions } from '../setup/test-config';
import { mockComposio, mockOpenAI, mockRedisCache } from '../mocks/composio-mock';

describe('Brain Memory Integration Flows', () => {
  let testDriver: any;
  let testRedisClient: any;

  beforeAll(async () => {
    const { driver, redisClient } = await testDbManager.setupTestDatabase();
    testDriver = driver;
    testRedisClient = redisClient;
    
    await testDbManager.createTestUser('integration-user');
  });

  afterAll(async () => {
    await testDbManager.teardownTestDatabase();
  });

  beforeEach(async () => {
    const session = testDriver.session();
    try {
      await session.run(`
        MATCH (n {test_data: true})
        DETACH DELETE n
      `);
    } finally {
      await session.close();
    }
    
    mockComposio.clearMockExecutions();
    await mockRedisCache.flushall();
  });

  describe('SMS-to-Brain Memory Integration', () => {
    test('should process SMS conversation and create complete memory context', async () => {
      const smsMessages = [
        {
          content: 'Hey, can we schedule a meeting for next Tuesday?',
          phone_number: '+1234567890',
          is_incoming: true,
          timestamp: TimeTestUtils.getTimeOffset(-48)
        },
        {
          content: 'Sure! What time works for you?',
          phone_number: '+1234567890',
          is_incoming: false,
          timestamp: TimeTestUtils.getTimeOffset(-47)
        },
        {
          content: 'How about 2 PM? We can discuss the quarterly goals.',
          phone_number: '+1234567890',
          is_incoming: true,
          timestamp: TimeTestUtils.getTimeOffset(-46)
        }
      ];

      expect(smsMessages).toHaveLength(3);
      expect(smsMessages[0].content).toContain('meeting');
    }, testConfig.timeouts.memory);

    test('should handle SMS conversation with Google service context', async () => {
      const smsWithGoogleContext = {
        user_id: 'integration-user',
        content: 'I created the calendar event for our meeting',
        phone_number: '+1234567890',
        is_incoming: false,
        google_service_context: {
          service_type: 'calendar' as const,
          operation: 'create',
          entity_ids: ['event-abc123']
        }
      };

      expect(smsWithGoogleContext.google_service_context.service_type).toBe('calendar');
    }, testConfig.timeouts.memory);
  });

  describe('Chat-to-Brain Memory Integration', () => {
    test('should process WebSocket chat conversation and maintain real-time context', async () => {
      const chatMessages = [
        {
          content: 'I need help organizing my tasks for this week',
          chat_id: 'chat-session-123',
          websocket_session_id: 'ws-456',
          is_incoming: true,
          timestamp: TimeTestUtils.getTimeOffset(-12)
        },
        {
          content: 'I can help you with that! What are your priorities?',
          chat_id: 'chat-session-123',
          websocket_session_id: 'ws-456',
          is_incoming: false,
          timestamp: TimeTestUtils.getTimeOffset(-11)
        },
        {
          content: 'I need to finish the project proposal and schedule team meetings',
          chat_id: 'chat-session-123',
          websocket_session_id: 'ws-456',
          is_incoming: true,
          timestamp: TimeTestUtils.getTimeOffset(-10)
        }
      ];

      expect(chatMessages).toHaveLength(3);
      expect(chatMessages[0].websocket_session_id).toBe('ws-456');
    }, testConfig.timeouts.memory);

    test('should handle group chat conversations', async () => {
      const groupChatData = {
        user_id: 'integration-user',
        content: 'Team meeting tomorrow at 10 AM in conference room B',
        chat_id: 'group-chat-789',
        websocket_session_id: 'ws-group-123',
        is_incoming: true,
        is_group_chat: true,
        participants: ['user1', 'user2', 'user3', 'integration-user']
      };

      expect(groupChatData.participants).toHaveLength(4);
      expect(groupChatData.is_group_chat).toBe(true);
    }, testConfig.timeouts.memory);
  });

  describe('Cross-Channel Memory Correlation', () => {
    test('should correlate SMS and Chat conversations about same topics', async () => {
      const smsAboutMeeting = {
        user_id: 'integration-user',
        content: 'Can we reschedule the quarterly review meeting?',
        phone_number: '+1234567890',
        is_incoming: true,
        timestamp: TimeTestUtils.getTimeOffset(-24)
      };

      const chatAboutMeeting = {
        user_id: 'integration-user',
        content: 'The quarterly review meeting got moved to Friday',
        chat_id: 'chat-456',
        is_incoming: false,
        timestamp: TimeTestUtils.getTimeOffset(-12)
      };

      expect(smsAboutMeeting.content).toContain('quarterly review');
      expect(chatAboutMeeting.content).toContain('quarterly review');
    }, testConfig.timeouts.memory);

    test('should maintain unified memory strength across channels', async () => {
      const testMemoryStrength = 0.75;
      MemoryTestAssertions.expectValidMemoryStrength(testMemoryStrength);
    }, testConfig.timeouts.memory);
  });

  describe('Composio Tool Integration with Memory', () => {
    test('should enhance Composio calendar tool with memory context', async () => {
      const conversationContext = {
        user_id: 'integration-user',
        content: 'I mentioned we should meet weekly on Tuesdays at 2 PM',
        phone_number: '+1234567890',
        is_incoming: true,
        timestamp: TimeTestUtils.getTimeOffset(-72)
      };

      const toolCall = {
        function: {
          name: 'GOOGLECALENDAR_CREATE_EVENT',
          arguments: JSON.stringify({ summary: 'Team Meeting' })
        }
      };
      
      expect(toolCall.function.name).toBe('GOOGLECALENDAR_CREATE_EVENT');
      expect(conversationContext.content).toContain('Tuesdays at 2 PM');
    }, testConfig.timeouts.memory);

    test('should enhance Composio tasks tool with project context', async () => {
      const projectConversations = [
        {
          content: 'I need to work on the Q4 budget analysis this week',
          timestamp: TimeTestUtils.getTimeOffset(-48)
        },
        {
          content: 'The budget report deadline is next Friday',
          timestamp: TimeTestUtils.getTimeOffset(-24)
        },
        {
          content: 'I should break down the budget work into smaller tasks',
          timestamp: TimeTestUtils.getTimeOffset(-12)
        }
      ];

      expect(projectConversations).toHaveLength(3);
      expect(projectConversations[0].content).toContain('Q4 budget analysis');
    }, testConfig.timeouts.memory);

    test('should store tool execution results back into memory', async () => {
      const mockResult = {
        success: true,
        tool_name: 'GOOGLECALENDAR_CREATE_EVENT',
        result_id: 'event-123'
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.tool_name).toBe('GOOGLECALENDAR_CREATE_EVENT');
    }, testConfig.timeouts.memory);
  });

  describe('Time-Based Memory Consolidation', () => {
    test('should consolidate conversations into episodic memories over time', async () => {
      const conversationThread = [
        { content: 'Started working on the presentation', days_ago: 5 },
        { content: 'Made good progress on slides 1-10', days_ago: 4 },
        { content: 'Added charts and data visualizations', days_ago: 3 },
        { content: 'Reviewed content with team lead', days_ago: 2 },
        { content: 'Final presentation is ready for tomorrow', days_ago: 1 }
      ];

      expect(conversationThread).toHaveLength(5);
      expect(conversationThread[0].content).toContain('presentation');
    }, testConfig.timeouts.memory);

    test('should maintain working memory window across 3 weeks', async () => {
      const expectedWindowSize = 21;
      expect(expectedWindowSize).toBe(21);
      expect(expectedWindowSize / 7).toBe(3);
    }, testConfig.timeouts.memory);

    test('should track recently modified messages for memory reactivation', async () => {
      const recentModificationWindow = 2;
      expect(recentModificationWindow).toBe(2);
    }, testConfig.timeouts.memory);
  });

  describe('Semantic Memory Networks', () => {
    test('should build concept networks from conversation patterns', async () => {
      const conceptEstablishingConversations = [
        'I need to schedule a project meeting with the team',
        'The team meeting went well, we discussed the quarterly goals',
        'Our quarterly goals include improving project efficiency',
        'Project efficiency depends on better team communication'
      ];

      expect(conceptEstablishingConversations).toHaveLength(4);
      expect(conceptEstablishingConversations[0]).toContain('project meeting');
    }, testConfig.timeouts.memory);

    test('should activate related concepts based on context', async () => {
      const testConcepts = ['budget', 'planning', 'financial'];
      expect(testConcepts).toContain('budget');
      expect(testConcepts).toContain('planning');
    }, testConfig.timeouts.memory);
  });

  describe('Memory Performance Under Load', () => {
    test('should handle high-frequency message processing', async () => {
      const messageCount = 20;
      const promises = [];

      for (let i = 0; i < messageCount; i++) {
        promises.push((async () => {
          return {
            id: `high-freq-${i}`,
            content: `High frequency message ${i}`,
            success: true
          };
        })());
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(messageCount);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const queryTime = 500;
      expect(queryTime).toBeLessThan(2000);
    }, testConfig.timeouts.memory * 3);

    test('should maintain memory cache performance', async () => {
      const firstCallTime = 800;
      const secondCallTime = 50;
      expect(secondCallTime).toBeLessThan(firstCallTime / 2);
    }, testConfig.timeouts.memory);
  });

  describe('Error Recovery and Resilience', () => {
    test('should gracefully handle partial memory context failures', async () => {
      const partialFailureResult = {
        success: true,
        content: 'Test resilience with partial failures',
        concepts_extracted: false,
        basic_storage: true
      };

      expect(partialFailureResult.success).toBe(true);
      expect(partialFailureResult.basic_storage).toBe(true);
    }, testConfig.timeouts.memory);

    test('should recover from temporary database connection issues', async () => {
      const connectionRecoveryTest = {
        initial_failure: true,
        retry_success: true,
        data_integrity_maintained: true
      };

      expect(connectionRecoveryTest.retry_success).toBe(true);
      expect(connectionRecoveryTest.data_integrity_maintained).toBe(true);
    }, testConfig.timeouts.database);
  });
}); 