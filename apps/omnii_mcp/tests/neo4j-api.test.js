/**
 * Test script for the Neo4j REST API
 * Run with: bun tests/neo4j-api.test.js
 */

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import readline from 'readline';
import axios from 'axios';
import { API_NEO4J_URL, USER_ID, log } from './constants.js';

// Convert to proper Bun test suite
describe("Neo4j API Tests", () => {
  beforeAll(() => {
    log('info', '🔌 Starting Neo4j API Tests');
  });

  test("API health check", async () => {
    try {
      // Test health endpoint
      log('info', '🔍 Checking API health...');
      const healthResponse = await axios.get(`${API_NEO4J_URL}/health`);
      log('success', `✅ Health status: ${JSON.stringify(healthResponse.data)}`);
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.data).toBeDefined();
    } catch (error) {
      log('error', `❌ Test failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });

  test("List concepts", async () => {
    try {
      // Test list concepts
      log('info', '📋 Testing list concepts...');
      const conceptsResponse = await axios.get(`${API_NEO4J_URL}/concepts?user_id=${USER_ID}&limit=5`);
      log('success', `✅ Received concepts: ${JSON.stringify(conceptsResponse.data, null, 2)}`);
      expect(conceptsResponse.status).toBe(200);
      expect(conceptsResponse.data).toBeDefined();
    } catch (error) {
      log('error', `❌ Test failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });
  
  test("Search concepts", async () => {
    try {
      log('info', '🔍 Searching for concepts with query "test"...');
      const searchResponse = await axios.get(`${API_NEO4J_URL}/concepts/search?user_id=${USER_ID}&q=test`);
      log('success', `✅ Search results: ${JSON.stringify(searchResponse.data, null, 2)}`);
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data).toBeDefined();
    } catch (error) {
      log('error', `❌ Test failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });
  
  // Only run interactive test in standalone mode
  if (import.meta.main) {
    test.todo("Interactive node context query", async () => {
      // Create readline interface for interactive testing
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      log('info', '\n🔍 Enter a node ID to get its context (or "exit" to quit):');
      
      return new Promise((resolve) => {
        rl.on('line', async (input) => {
          if (input.toLowerCase() === 'exit') {
            rl.close();
            log('success', '👋 Test completed');
            resolve();
            return;
          }
          
          try {
            log('info', `🔍 Getting context for node ${input}...`);
            const nodeResponse = await axios.get(`${API_NEO4J_URL}/nodes/${input}/context?user_id=${USER_ID}`);
            log('success', `✅ Node context: ${JSON.stringify(nodeResponse.data, null, 2)}`);
          } catch (error) {
            log('error', `❌ Error: ${error.response?.data || error.message}`);
          }
          
          log('info', '\n🔍 Enter another node ID (or "exit" to quit):');
        });
      });
    });
  }
  
  afterAll(() => {
    log('success', '✅ Neo4j API Tests completed');
  });
});

// For standalone execution
if (import.meta.main) {
  log('info', '🔌 Running Neo4j API tests in standalone mode...');
  // Tests will be automatically run by Bun
}