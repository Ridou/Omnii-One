import { beforeAll, afterAll, beforeEach, afterEach, expect } from 'bun:test';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { createClient } from 'redis';

// Global test configuration  
export const testConfig = {
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'test-password'
  },
  redis: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    db: 15 // Test database
  },
  timeouts: {
    database: 5000,
    api: 3000,
    memory: 2000
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'test-key'
  }
};

// Test database setup and teardown
export class TestDatabaseManager {
  private driver: Driver;
  private redisClient: any;

  async setupTestDatabase(): Promise<{ driver: Driver; redisClient: any }> {
    console.log('🧪 Setting up test databases...');
    
    // Initialize test Neo4j instance
    this.driver = neo4j.driver(
      testConfig.neo4j.uri,
      neo4j.auth.basic(testConfig.neo4j.user, testConfig.neo4j.password)
    );

    // Initialize test Redis instance
    this.redisClient = createClient({
      url: `redis://${testConfig.redis.host}:${testConfig.redis.port}/${testConfig.redis.db}`
    });

    await this.redisClient.connect();

    // Clear existing test data
    await this.clearTestData();
    
    // Setup test schema and constraints
    await this.setupTestSchema();

    console.log('✅ Test databases initialized');
    return { driver: this.driver, redisClient: this.redisClient };
  }

  async teardownTestDatabase(): Promise<void> {
    console.log('🧹 Cleaning up test databases...');
    
    // Clear test data
    await this.clearTestData();
    
    // Close connections
    if (this.driver) {
      await this.driver.close();
    }
    
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }

    console.log('✅ Test databases cleaned up');
  }

  private async clearTestData(): Promise<void> {
    if (!this.driver) return;

    const session = this.driver.session();
    try {
      // Clear all test data (be careful - only for test DB!)
      await session.run(`
        MATCH (n)
        WHERE n.test_data = true OR labels(n) = ['TestNode']
        DETACH DELETE n
      `);

      // Clear Redis test data
      if (this.redisClient) {
        await this.redisClient.flushDb();
      }
    } finally {
      await session.close();
    }
  }

  private async setupTestSchema(): Promise<void> {
    if (!this.driver) return;

    const session = this.driver.session();
    try {
      // Create test constraints and indexes
      await session.run(`
        CREATE CONSTRAINT test_user_id IF NOT EXISTS
        FOR (u:User) REQUIRE u.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT test_chatmessage_id IF NOT EXISTS  
        FOR (m:ChatMessage) REQUIRE m.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT test_concept_id IF NOT EXISTS
        FOR (c:Concept) REQUIRE c.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT test_memory_id IF NOT EXISTS
        FOR (m:Memory) REQUIRE m.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT test_tag_id IF NOT EXISTS
        FOR (t:Tag) REQUIRE t.id IS UNIQUE
      `);

      // Create indexes for time-based queries
      await session.run(`
        CREATE INDEX test_chatmessage_timestamp IF NOT EXISTS
        FOR (m:ChatMessage) ON (m.timestamp)
      `);

      await session.run(`
        CREATE INDEX test_chatmessage_last_modified IF NOT EXISTS
        FOR (m:ChatMessage) ON (m.last_modified)
      `);

      await session.run(`
        CREATE INDEX test_concept_last_mentioned IF NOT EXISTS
        FOR (c:Concept) ON (c.last_mentioned)
      `);

    } finally {
      await session.close();
    }
  }

  async createTestUser(userId: string = 'test-user'): Promise<string> {
    const session = this.driver.session();
    try {
      await session.run(`
        CREATE (u:User {
          id: $userId,
          test_data: true,
          created_at: datetime()
        })
      `, { userId });
      return userId;
    } finally {
      await session.close();
    }
  }

  async getTestSession(): Promise<Session> {
    return this.driver.session();
  }
}

// Global test manager instance
export const testDbManager = new TestDatabaseManager();

// Test utilities for time manipulation
export class TimeTestUtils {
  static getCurrentTestTime(): string {
    return new Date().toISOString();
  }

  static getTimeOffset(hours: number): string {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  }

  static getDateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  static getWeekOffset(weeks: number): string {
    const date = new Date();
    date.setDate(date.getDate() + (weeks * 7));
    return date.toISOString();
  }
}

// Memory test data generators
export class MemoryTestDataGenerator {
  static generateTestMessage(overrides: any = {}) {
    return {
      id: `test-msg-${Date.now()}-${Math.random()}`,
      user_id: 'test-user',
      content: 'Test message content',
      channel: 'sms',
      source_identifier: '+1234567890',
      is_incoming: true,
      timestamp: TimeTestUtils.getCurrentTestTime(),
      test_data: true,
      ...overrides
    };
  }

  static generateTestConversationData(count: number, timeSpread: 'hours' | 'days' | 'weeks' = 'hours') {
    const messages = [];
    for (let i = 0; i < count; i++) {
      const offset = timeSpread === 'hours' ? i : 
                    timeSpread === 'days' ? i * 24 : 
                    i * 24 * 7;
      
      messages.push(this.generateTestMessage({
        id: `test-msg-${i}`,
        content: `Test message ${i}`,
        timestamp: TimeTestUtils.getTimeOffset(-offset)
      }));
    }
    return messages;
  }

  static generateTestBrainMemoryContext() {
    return {
      working_memory: {
        recent_messages: this.generateTestConversationData(5),
        time_window_messages: this.generateTestConversationData(15, 'days'),
        recently_modified_messages: this.generateTestConversationData(3),
        active_concepts: ['concept1', 'concept2', 'concept3'],
        current_intent: 'question',
        time_window_stats: {
          previous_week_count: 5,
          current_week_count: 8,
          next_week_count: 2,
          recently_modified_count: 3
        }
      },
      episodic_memory: {
        conversation_threads: [
          {
            thread_id: 'thread-1',
            messages: this.generateTestConversationData(3),
            semantic_weight: 0.8,
            memory_node_id: 'memory-1'
          }
        ],
        related_episodes: ['memory-1', 'memory-2']
      },
      semantic_memory: {
        activated_concepts: [
          {
            concept: {
              id: 'concept-1',
              name: 'meeting',
              activation_strength: 0.8,
              mention_count: 5,
              last_mentioned: TimeTestUtils.getCurrentTestTime(),
              semantic_weight: 0.7,
              user_id: 'test-user'
            },
            activation_strength: 0.8,
            related_concepts: ['concept-2']
          }
        ],
        concept_associations: [
          {
            from_concept: 'concept-1',
            to_concept: 'concept-2',
            association_strength: 0.6,
            relationship_type: 'RELATED_TO'
          }
        ]
      },
      consolidation_metadata: {
        retrieval_timestamp: TimeTestUtils.getCurrentTestTime(),
        memory_strength: 0.75,
        context_channels: ['sms'],
        memory_age_hours: 24,
        consolidation_score: 0.65,
        working_memory_limit: 7,
        episodic_window_hours: 168,
        semantic_activation_threshold: 0.3
      }
    };
  }
}

// Test assertions helpers
export class MemoryTestAssertions {
  static expectValidChatMessage(message: any) {
    expect(message).toBeDefined();
    expect(message.id).toBeDefined();
    expect(message.content).toBeDefined();
    expect(message.timestamp).toBeDefined();
    expect(message.channel).toBeOneOf(['sms', 'chat', 'websocket']);
  }

  static expectValidBrainMemoryContext(context: any) {
    expect(context).toBeDefined();
    expect(context.working_memory).toBeDefined();
    expect(context.episodic_memory).toBeDefined();
    expect(context.semantic_memory).toBeDefined();
    expect(context.consolidation_metadata).toBeDefined();
    
    // Check working memory structure
    expect(context.working_memory.recent_messages).toBeArray();
    expect(context.working_memory.time_window_messages).toBeArray();
    expect(context.working_memory.recently_modified_messages).toBeArray();
    expect(context.working_memory.time_window_stats).toBeDefined();
    
    // Check memory strength bounds
    expect(context.consolidation_metadata.memory_strength).toBeGreaterThanOrEqual(0);
    expect(context.consolidation_metadata.memory_strength).toBeLessThanOrEqual(1);
  }

  static expectValidMemoryStrength(strength: number) {
    expect(strength).toBeNumber();
    expect(strength).toBeGreaterThanOrEqual(0);
    expect(strength).toBeLessThanOrEqual(1);
  }

  static expectTimeWindowCategorization(messages: any[], expectedCounts: { previous: number; current: number; next: number }) {
    const now = new Date();
    const categories = { previous: 0, current: 0, next: 0 };
    
    messages.forEach(msg => {
      const msgDate = new Date(msg.timestamp);
      const daysDiff = (msgDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < -7) categories.previous++;
      else if (daysDiff >= -7 && daysDiff < 0) categories.current++;
      else categories.next++;
    });
    
    expect(categories.previous).toBe(expectedCounts.previous);
    expect(categories.current).toBe(expectedCounts.current);
    expect(categories.next).toBe(expectedCounts.next);
  }
} 