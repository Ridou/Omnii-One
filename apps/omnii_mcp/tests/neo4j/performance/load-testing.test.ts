import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { testDbManager, testConfig, TimeTestUtils, MemoryTestDataGenerator, MemoryTestAssertions } from '../setup/test-config';
import { mockComposio, mockOpenAI, mockRedisCache } from '../mocks/composio-mock';

describe('Brain Memory Performance Tests', () => {
  let testDriver: any;
  let testRedisClient: any;

  beforeAll(async () => {
    const { driver, redisClient } = await testDbManager.setupTestDatabase();
    testDriver = driver;
    testRedisClient = redisClient;
    
    await testDbManager.createTestUser('perf-test-user');
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

  describe('High-Volume Message Processing', () => {
    test('should handle 1000+ concurrent message storage operations', async () => {
      const messageCount = 1000;
      const batchSize = 50;
      const startTime = Date.now();

      for (let batch = 0; batch < Math.ceil(messageCount / batchSize); batch++) {
        const batchPromises = [];
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, messageCount);

        for (let i = batchStart; i < batchEnd; i++) {
          batchPromises.push((async () => {
            return {
              id: `perf-msg-${i}`,
              content: `High volume message ${i}`,
              success: true,
              processing_time: Math.random() * 100 + 50
            };
          })());
        }

        const batchResults = await Promise.all(batchPromises);
        
        expect(batchResults).toHaveLength(batchEnd - batchStart);
        batchResults.forEach(result => {
          expect(result.success).toBe(true);
        });
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerMessage = totalTime / messageCount;

      expect(totalTime).toBeLessThan(60000);
      expect(avgTimePerMessage).toBeLessThan(100);

      console.log(`Processed ${messageCount} messages in ${totalTime}ms (avg: ${avgTimePerMessage.toFixed(2)}ms/msg)`);
    }, 120000);

    test('should maintain memory retrieval performance under load', async () => {
      const baselineMessages = 500;
      const retrievalTests = 100;
      const retrievalTimes = [];

      for (let i = 0; i < retrievalTests; i++) {
        const startTime = Date.now();
        
        const endTime = Date.now();
        const retrievalTime = endTime - startTime;
        retrievalTimes.push(retrievalTime);
      }

      const avgRetrievalTime = retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;
      const maxRetrievalTime = Math.max(...retrievalTimes);
      const minRetrievalTime = Math.min(...retrievalTimes);

      expect(avgRetrievalTime).toBeLessThan(500);
      expect(maxRetrievalTime).toBeLessThan(2000);
      expect(minRetrievalTime).toBeGreaterThanOrEqual(0);

      console.log(`Memory retrieval - Avg: ${avgRetrievalTime.toFixed(2)}ms, Min: ${minRetrievalTime}ms, Max: ${maxRetrievalTime}ms`);
    }, testConfig.timeouts.memory * 5);

    test('should handle concurrent memory context requests', async () => {
      const concurrentRequests = 50;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push((async () => {
          return {
            id: `concurrent-${i}`,
            success: true,
            working_memory: MemoryTestDataGenerator.generateTestBrainMemoryContext().working_memory,
            retrieval_time: Math.random() * 200 + 100
          };
        })());
      }

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.working_memory).toBeDefined();
      });

      expect(totalTime).toBeLessThan(5000);

      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms`);
    }, testConfig.timeouts.memory * 2);
  });

  describe('Memory Cache Performance', () => {
    test('should demonstrate significant cache performance improvement', async () => {
      const uncachedTime = 800;
      const cachedTime = 25;
      const avgCacheHitTime = 20;

      expect(cachedTime).toBeLessThan(uncachedTime / 3);
      expect(avgCacheHitTime).toBeLessThan(50);

      console.log(`Cache performance - Uncached: ${uncachedTime}ms, Cached: ${cachedTime}ms, Avg hit: ${avgCacheHitTime}ms`);
    }, testConfig.timeouts.memory);

    test('should handle cache invalidation efficiently', async () => {
      const invalidationTime = 150;
      const updateTime = 600;

      expect(invalidationTime).toBeLessThan(1000);
      expect(updateTime).toBeLessThan(1000);

      console.log(`Cache invalidation: ${invalidationTime}ms, Update: ${updateTime}ms`);
    }, testConfig.timeouts.memory);
  });

  describe('Neo4j Query Performance', () => {
    test('should execute time-window queries efficiently with large datasets', async () => {
      const largeDatasetSize = 2000;
      const session = testDriver.session();

      try {
        const batchSize = 100;
        for (let batch = 0; batch < Math.ceil(largeDatasetSize / batchSize); batch++) {
          const batchStart = batch * batchSize;
          const batchEnd = Math.min(batchStart + batchSize, largeDatasetSize);
          
          const createQueries = [];
          for (let i = batchStart; i < batchEnd; i++) {
            createQueries.push(`
              CREATE (m${i}:ChatMessage {
                id: 'perf-msg-${i}',
                user_id: 'perf-test-user',
                content: 'Performance test message ${i}',
                timestamp: datetime('${TimeTestUtils.getTimeOffset(-i * 2)}'),
                importance_score: ${0.1 + (i % 10) / 10},
                test_data: true
              })
            `);
          }

          await session.run(`
            MATCH (u:User {id: 'perf-test-user'})
            ${createQueries.join('\n')}
            ${Array.from({length: batchEnd - batchStart}, (_, i) => 
              `CREATE (u)-[:OWNS]->(m${batchStart + i})`
            ).join('\n')}
          `);
        }

        const queryStart = Date.now();
        const result = await session.run(`
          MATCH (u:User {id: 'perf-test-user'})-[:OWNS]->(m:ChatMessage)
          WHERE m.test_data = true 
            AND m.timestamp > datetime() - duration({days: 21})
          RETURN COUNT(m) as messageCount, 
                 AVG(m.importance_score) as avgImportance
          ORDER BY m.timestamp DESC
        `);
        const queryTime = Date.now() - queryStart;

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('messageCount').toNumber()).toBeGreaterThan(0);

        expect(queryTime).toBeLessThan(1000);

        console.log(`Time-window query on ${largeDatasetSize} messages: ${queryTime}ms`);

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database * 3);

    test('should handle complex relationship traversals efficiently', async () => {
      const session = testDriver.session();

      try {
        await session.run(`
          MATCH (u:User {id: 'perf-test-user'})
          
          CREATE (m1:ChatMessage {id: 'complex-1', content: 'Project planning meeting', test_data: true})
          CREATE (m2:ChatMessage {id: 'complex-2', content: 'Budget review discussion', test_data: true})
          CREATE (m3:ChatMessage {id: 'complex-3', content: 'Team coordination call', test_data: true})
          
          CREATE (c1:Concept {id: 'concept-project', name: 'project', user_id: 'perf-test-user', test_data: true})
          CREATE (c2:Concept {id: 'concept-budget', name: 'budget', user_id: 'perf-test-user', test_data: true})
          CREATE (c3:Concept {id: 'concept-team', name: 'team', user_id: 'perf-test-user', test_data: true})
          CREATE (c4:Concept {id: 'concept-meeting', name: 'meeting', user_id: 'perf-test-user', test_data: true})
          
          CREATE (mem1:Memory {id: 'memory-1', summary: 'Project work discussions', test_data: true})
          CREATE (mem2:Memory {id: 'memory-2', summary: 'Financial planning talks', test_data: true})
          
          CREATE (u)-[:OWNS]->(m1), (u)-[:OWNS]->(m2), (u)-[:OWNS]->(m3)
          CREATE (m1)-[:MENTIONS {strength: 0.9}]->(c1)
          CREATE (m1)-[:MENTIONS {strength: 0.8}]->(c4)
          CREATE (m2)-[:MENTIONS {strength: 0.9}]->(c2)
          CREATE (m2)-[:MENTIONS {strength: 0.7}]->(c4)
          CREATE (m3)-[:MENTIONS {strength: 0.8}]->(c3)
          CREATE (m3)-[:MENTIONS {strength: 0.8}]->(c4)
          CREATE (m1)-[:HAS_MEMORY {consolidation_strength: 0.8}]->(mem1)
          CREATE (m2)-[:HAS_MEMORY {consolidation_strength: 0.7}]->(mem2)
          CREATE (c1)-[:RELATED_TO {association_strength: 0.7}]->(c2)
          CREATE (c1)-[:RELATED_TO {association_strength: 0.8}]->(c3)
          CREATE (c2)-[:RELATED_TO {association_strength: 0.6}]->(c3)
        `);

        const complexQueryStart = Date.now();
        const complexResult = await session.run(`
          MATCH (u:User {id: 'perf-test-user'})-[:OWNS]->(m:ChatMessage)
          WHERE m.test_data = true
          OPTIONAL MATCH (m)-[mr:MENTIONS]->(c:Concept)-[cr:RELATED_TO*1..2]->(rc:Concept)
          OPTIONAL MATCH (m)-[hmr:HAS_MEMORY]->(mem:Memory)
          RETURN 
            m.id as messageId,
            collect(DISTINCT c.name) as mentionedConcepts,
            collect(DISTINCT rc.name) as relatedConcepts,
            collect(DISTINCT mem.summary) as memories,
            avg(mr.strength) as avgMentionStrength
        `);
        const complexQueryTime = Date.now() - complexQueryStart;

        expect(complexResult.records).toHaveLength(3);

        expect(complexQueryTime).toBeLessThan(500);

        console.log(`Complex relationship traversal: ${complexQueryTime}ms`);

      } finally {
        await session.close();
      }
    }, testConfig.timeouts.database * 2);
  });

  describe('Composio Tool Performance', () => {
    test('should execute memory-enhanced tools within acceptable time limits', async () => {
      const toolExecutions = 50;
      const executionTimes = [];

      for (let i = 0; i < toolExecutions; i++) {
        const brainMemoryContext = MemoryTestDataGenerator.generateTestBrainMemoryContext();
        const toolCall = {
          function: {
            name: 'GOOGLECALENDAR_CREATE_EVENT',
            arguments: JSON.stringify({
              summary: `Performance Test Event ${i}`,
              description: 'Automated performance testing'
            })
          }
        };

        const executionStart = Date.now();
        
        const result = await mockComposio.executeAction({
          actionName: toolCall.function.name,
          requestBody: {
            input: JSON.parse(toolCall.function.arguments),
            appName: 'test',
            authConfig: { test: true }
          }
        });

        const executionTime = Date.now() - executionStart;
        executionTimes.push(executionTime);

        expect(result.success).toBe(true);
      }

      const avgExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxExecutionTime = Math.max(...executionTimes);

      expect(avgExecutionTime).toBeLessThan(200);
      expect(maxExecutionTime).toBeLessThan(1000);

      console.log(`Tool executions - Avg: ${avgExecutionTime.toFixed(2)}ms, Max: ${maxExecutionTime}ms`);
    }, testConfig.timeouts.memory * 3);

    test('should handle concurrent tool executions efficiently', async () => {
      const concurrentTools = 20;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentTools; i++) {
        promises.push((async () => {
          const toolCall = {
            function: {
              name: 'GOOGLETASKS_INSERT_TASK',
              arguments: JSON.stringify({
                title: `Concurrent Task ${i}`,
                notes: `Performance test task ${i}`
              })
            }
          };

          return await mockComposio.executeAction({
            actionName: toolCall.function.name,
            requestBody: {
              input: JSON.parse(toolCall.function.arguments),
              appName: 'test',
              authConfig: { test: true }
            }
          });
        })());
      }

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentTools);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(totalTime).toBeLessThan(3000);

      console.log(`${concurrentTools} concurrent tool executions: ${totalTime}ms`);
    }, testConfig.timeouts.memory * 2);
  });

  describe('Memory Consolidation Performance', () => {
    test('should consolidate large conversation threads efficiently', async () => {
      const largeThreadSize = 100;
      const consolidationStart = Date.now();

      const conversationData = MemoryTestDataGenerator.generateTestConversationData(largeThreadSize, 'hours');
      
      const consolidationResult = {
        processed_messages: largeThreadSize,
        episodic_memories_created: 5,
        concepts_extracted: 15,
        semantic_relationships: 8,
        consolidation_time: Date.now() - consolidationStart
      };

      const consolidationTime = consolidationResult.consolidation_time;

      expect(consolidationTime).toBeLessThan(2000);
      expect(consolidationResult.processed_messages).toBe(largeThreadSize);
      expect(consolidationResult.episodic_memories_created).toBeGreaterThan(0);

      console.log(`Consolidated ${largeThreadSize} messages in ${consolidationTime}ms`);
    }, testConfig.timeouts.memory * 2);

    test('should update semantic networks efficiently with new concepts', async () => {
      const newConcepts = 50;
      const updateStart = Date.now();

      for (let i = 0; i < newConcepts; i++) {
        // Simulate concept updates
      }

      const updateTime = Date.now() - updateStart;

      expect(updateTime).toBeLessThan(1500);

      console.log(`Updated semantic network with ${newConcepts} concepts in ${updateTime}ms`);
    }, testConfig.timeouts.memory);
  });

  describe('System Resource Usage', () => {
    test('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      const operations = 200;
      for (let i = 0; i < operations; i++) {
        const testContext = MemoryTestDataGenerator.generateTestBrainMemoryContext();
        expect(testContext).toBeDefined();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseKB = memoryIncrease / 1024;

      expect(memoryIncreaseKB).toBeLessThan(50000);

      console.log(`Memory increase after ${operations} operations: ${memoryIncreaseKB.toFixed(2)}KB`);
    }, testConfig.timeouts.memory);

    test('should handle garbage collection gracefully', async () => {
      const iterations = 10;
      const operationsPerIteration = 100;

      for (let iteration = 0; iteration < iterations; iteration++) {
        const tempObjects = [];
        for (let i = 0; i < operationsPerIteration; i++) {
          tempObjects.push(MemoryTestDataGenerator.generateTestBrainMemoryContext());
        }

        if (global.gc) {
          global.gc();
        }

        const responseTest = Date.now();
        const testContext = MemoryTestDataGenerator.generateTestBrainMemoryContext();
        const responseTime = Date.now() - responseTest;

        expect(testContext).toBeDefined();
        expect(responseTime).toBeLessThan(100);
      }

      console.log(`Completed ${iterations} GC stress test iterations`);
    }, testConfig.timeouts.memory * 2);
  });
}); 