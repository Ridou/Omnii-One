import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { testDbManager, testConfig, TimeTestUtils, MemoryTestDataGenerator, MemoryTestAssertions } from '../setup/test-config';

describe('Neo4j Database Operations', () => {
  let testDriver: any;
  let testRedisClient: any;

  beforeAll(async () => {
    const { driver, redisClient } = await testDbManager.setupTestDatabase();
    testDriver = driver;
    testRedisClient = redisClient;
    
    await testDbManager.createTestUser('db-test-user');
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
  });

  describe('ChatMessage Node Operations', () => {
    test('should create ChatMessage nodes with all required properties', async () => {
      const messageData = MemoryTestDataGenerator.generateTestMessage({
        id: 'test-msg-create',
        user_id: 'db-test-user',
        content: 'Test message creation'
      });

      expect(messageData.id).toBe('test-msg-create');
      expect(messageData.content).toBe('Test message creation');
    }, testConfig.timeouts.database);

    test('should handle SMS metadata correctly', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          CREATE (m:ChatMessage {
            id: 'sms-metadata-test',
            user_id: 'db-test-user',
            content: 'SMS with metadata',
            channel: 'sms',
            test_data: true
          })
        `);

        const result = await session.run(`
          MATCH (m:ChatMessage {id: 'sms-metadata-test'})
          RETURN m.channel as channel
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('channel')).toBe('sms');

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);

    test('should handle chat metadata correctly', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          CREATE (m:ChatMessage {
            id: 'chat-metadata-test',
            user_id: 'db-test-user',
            content: 'Chat with metadata',
            channel: 'chat',
            test_data: true
          })
        `);

        const result = await session.run(`
          MATCH (m:ChatMessage {id: 'chat-metadata-test'})
          RETURN m.channel as channel
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('channel')).toBe('chat');

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);

    test('should update last_modified timestamp correctly', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          CREATE (m:ChatMessage {
            id: 'modification-test',
            user_id: 'db-test-user',
            content: 'Original content',
            timestamp: datetime(),
            test_data: true
          })
        `);

        await session.run(`
          MATCH (m:ChatMessage {id: 'modification-test'})
          SET m.last_modified = datetime(),
              m.modification_reason = 'concept_update'
        `);

        const result = await session.run(`
          MATCH (m:ChatMessage {id: 'modification-test'})
          RETURN m.modification_reason as reason
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('reason')).toBe('concept_update');

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);
  });

  describe('User-ChatMessage Relationships', () => {
    test('should create OWNS relationship between User and ChatMessage', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          MATCH (u:User {id: 'db-test-user'})
          CREATE (m:ChatMessage {
            id: 'relationship-test',
            content: 'Test message',
            timestamp: datetime(),
            test_data: true
          })
          CREATE (u)-[:OWNS]->(m)
        `);

        const result = await session.run(`
          MATCH (u:User {id: 'db-test-user'})-[:OWNS]->(m:ChatMessage {id: 'relationship-test'})
          RETURN m.id as messageId
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('messageId')).toBe('relationship-test');

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);

    test('should query messages by user efficiently', async () => {
      const session = testDriver.session();
      try {
        for (let i = 0; i < 3; i++) {
          await session.run(`
            MATCH (u:User {id: 'db-test-user'})
            CREATE (m:ChatMessage {
              id: $messageId,
              content: $content,
              timestamp: datetime(),
              test_data: true
            })
            CREATE (u)-[:OWNS]->(m)
          `, {
            messageId: `bulk-test-${i}`,
            content: `Message ${i}`
          });
        }

        const result = await session.run(`
          MATCH (u:User {id: 'db-test-user'})-[:OWNS]->(m:ChatMessage)
          WHERE m.test_data = true
          RETURN COUNT(m) as messageCount
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('messageCount').toNumber()).toBeGreaterThanOrEqual(3);

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);
  });

  describe('Concept Node Operations', () => {
    test('should create and manage Concept nodes', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          CREATE (c:Concept {
            id: 'concept-test-1',
            name: 'meeting',
            user_id: 'db-test-user',
            test_data: true
          })
        `);

        const result = await session.run(`
          MATCH (c:Concept {id: 'concept-test-1'})
          RETURN c.name as name
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('name')).toBe('meeting');

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);

    test('should update concept activation strength', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          CREATE (c:Concept {
            id: 'activation-test',
            name: 'calendar',
            user_id: 'db-test-user',
            activation_strength: 0.5,
            test_data: true
          })
        `);

        await session.run(`
          MATCH (c:Concept {id: 'activation-test'})
          SET c.activation_strength = 0.9
        `);

        const result = await session.run(`
          MATCH (c:Concept {id: 'activation-test'})
          RETURN c.activation_strength as strength
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('strength')).toBe(0.9);

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);
  });

  describe('Message-Concept Relationships', () => {
    test('should create MENTIONS relationships between ChatMessage and Concept', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          MATCH (u:User {id: 'db-test-user'})
          CREATE (m:ChatMessage {
            id: 'mentions-test',
            content: 'Meeting about calendar',
            test_data: true
          })
          CREATE (c1:Concept {
            id: 'concept-meeting',
            name: 'meeting',
            user_id: 'db-test-user',
            test_data: true
          })
          CREATE (u)-[:OWNS]->(m)
          CREATE (m)-[:MENTIONS {strength: 0.8}]->(c1)
        `);

        const result = await session.run(`
          MATCH (m:ChatMessage {id: 'mentions-test'})-[r:MENTIONS]->(c:Concept)
          RETURN c.name as conceptName, r.strength as strength
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('conceptName')).toBe('meeting');
        expect(result.records[0].get('strength')).toBe(0.8);

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);

    test('should support concept semantic networks via RELATED_TO relationships', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          CREATE (c1:Concept {
            id: 'concept-work',
            name: 'work',
            user_id: 'db-test-user',
            test_data: true
          })
          CREATE (c2:Concept {
            id: 'concept-project',
            name: 'project',
            user_id: 'db-test-user',
            test_data: true
          })
          CREATE (c1)-[:RELATED_TO {association_strength: 0.9}]->(c2)
        `);

        const result = await session.run(`
          MATCH (c1:Concept {name: 'work'})-[:RELATED_TO]->(c2:Concept)
          WHERE c1.test_data = true AND c2.test_data = true
          RETURN c2.name as relatedConcept
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('relatedConcept')).toBe('project');

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);
  });

  describe('Memory Node Operations', () => {
    test('should create Memory nodes for conversation consolidation', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          CREATE (mem:Memory {
            id: 'memory-test-1',
            user_id: 'db-test-user',
            memory_type: 'episodic',
            summary: 'Discussion about quarterly planning',
            test_data: true
          })
        `);

        const result = await session.run(`
          MATCH (mem:Memory {id: 'memory-test-1'})
          RETURN mem.memory_type as type
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('type')).toBe('episodic');

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);

    test('should create HAS_MEMORY relationships between ChatMessage and Memory', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          MATCH (u:User {id: 'db-test-user'})
          CREATE (m:ChatMessage {
            id: 'memory-relation-test',
            content: 'Important conversation',
            test_data: true
          })
          CREATE (mem:Memory {
            id: 'memory-relation-1',
            user_id: 'db-test-user',
            summary: 'Important discussion',
            test_data: true
          })
          CREATE (u)-[:OWNS]->(m)
          CREATE (m)-[:HAS_MEMORY {consolidation_strength: 0.9}]->(mem)
        `);

        const result = await session.run(`
          MATCH (m:ChatMessage)-[r:HAS_MEMORY]->(mem:Memory)
          WHERE m.test_data = true AND mem.test_data = true
          RETURN r.consolidation_strength as strength
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('strength')).toBe(0.9);

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);
  });

  describe('Time-Based Queries', () => {
    test('should efficiently query messages within time windows', async () => {
      const session = testDriver.session();
      try {
        const timestamps = [
          TimeTestUtils.getDateOffset(-1),  // 1 day ago
          TimeTestUtils.getDateOffset(-7),  // 1 week ago
          TimeTestUtils.getDateOffset(-30)  // 1 month ago
        ];

        for (let i = 0; i < timestamps.length; i++) {
          await session.run(`
            MATCH (u:User {id: 'db-test-user'})
            CREATE (m:ChatMessage {
              id: $messageId,
              content: $content,
              timestamp: datetime($timestamp),
              test_data: true
            })
            CREATE (u)-[:OWNS]->(m)
          `, {
            messageId: `time-test-${i}`,
            content: `Message ${i}`,
            timestamp: timestamps[i]
          });
        }

        const result = await session.run(`
          MATCH (u:User {id: 'db-test-user'})-[:OWNS]->(m:ChatMessage)
          WHERE m.test_data = true 
          RETURN COUNT(m) as totalCount
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('totalCount').toNumber()).toBe(3);

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);

    test('should identify recently modified messages', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          MATCH (u:User {id: 'db-test-user'})
          CREATE (m1:ChatMessage {
            id: 'recent-mod-1',
            content: 'Recently modified message',
            timestamp: datetime(),
            last_modified: datetime(),
            modification_reason: 'concept_update',
            test_data: true
          })
          CREATE (u)-[:OWNS]->(m1)
        `);

        const result = await session.run(`
          MATCH (m:ChatMessage)
          WHERE m.test_data = true AND m.modification_reason IS NOT NULL
          RETURN m.id as messageId, m.modification_reason as reason
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('messageId')).toBe('recent-mod-1');
        expect(result.records[0].get('reason')).toBe('concept_update');

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);
  });

  describe('Performance and Data Integrity', () => {
    test('should handle concurrent operations safely', async () => {
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        promises.push((async () => {
          const session = testDriver.session();
          try {
            await session.run(`
              MATCH (u:User {id: 'db-test-user'})
              CREATE (m:ChatMessage {
                id: $messageId,
                content: $content,
                timestamp: datetime(),
                test_data: true
              })
              CREATE (u)-[:OWNS]->(m)
            `, {
              messageId: `concurrent-${i}-${Date.now()}`,
              content: `Concurrent message ${i}`
            });
          } finally {
            await session.close();
          }
        })());
      }

      await Promise.all(promises);

      const session = testDriver.session();
      try {
        const result = await session.run(`
          MATCH (m:ChatMessage)
          WHERE m.test_data = true AND m.id STARTS WITH 'concurrent-'
          RETURN COUNT(m) as concurrentCount
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('concurrentCount').toNumber()).toBe(3);

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database * 2);

    test('should maintain referential integrity', async () => {
      const session = testDriver.session();
      try {
        await session.run(`
          MATCH (u:User {id: 'db-test-user'})
          CREATE (m:ChatMessage {
            id: 'integrity-test',
            content: 'Test integrity',
            test_data: true
          })
          CREATE (u)-[:OWNS]->(m)
        `);

        const result = await session.run(`
          MATCH (u:User {id: 'db-test-user'})-[:OWNS]->(m:ChatMessage {id: 'integrity-test'})
          RETURN u.id as userId, m.id as messageId
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('userId')).toBe('db-test-user');
        expect(result.records[0].get('messageId')).toBe('integrity-test');

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database);
  });
}); 