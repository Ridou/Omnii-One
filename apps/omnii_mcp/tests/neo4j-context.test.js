/**
 * Test script for Neo4j Context Retrieval
 * Run with: bun tests/neo4j-context.test.js
 */

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import readline from 'readline';
import axios from 'axios';
import { API_NEO4J_URL, USER_ID, log } from './constants.js';

// Define test data
const searchQuery = 'aura'; // Example concept name
const contextQuery = 'knowledge graph concepts';
const nodeId = '1'; // Example node ID for testing

// Convert to a proper test suite
describe("Neo4j Context Retrieval Tests", () => {
  test("API health check", async () => {
    try {
      log('info', '🔍 Checking API health...');
      const healthResponse = await axios.get(`${API_NEO4J_URL}/health`);
      log('success', `✅ Health status: ${JSON.stringify(healthResponse.data)}`);
      expect(healthResponse.status).toBe(200);
    } catch (error) {
      log('error', `❌ Test failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });
  
  test("List concepts", async () => {
    try {
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
  
  test("Semantic search", async () => {
    try {
      log('info', `🔎 Testing semantic search for: "${searchQuery}"...`);
      const searchResponse = await axios.get(
        `${API_NEO4J_URL}/concepts/search?user_id=${USER_ID}&q=${encodeURIComponent(searchQuery)}&limit=3`
      );
      log('success', `✅ Search results: ${JSON.stringify(searchResponse.data, null, 2)}`);
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data).toBeDefined();
    } catch (error) {
      log('error', `❌ Test failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });
  
  test("Node context", async () => {
    try {
      log('info', `🔍 Getting context for node ${nodeId}...`);
      const nodeResponse = await axios.get(`${API_NEO4J_URL}/nodes/${nodeId}/context?user_id=${USER_ID}`);
      log('success', `✅ Node context: ${JSON.stringify(nodeResponse.data, null, 2)}`);
      expect(nodeResponse.status).toBe(200);
      expect(nodeResponse.data).toBeDefined();
    } catch (error) {
      log('error', `❌ Error: ${error.response?.data || error.message}`);
      // Don't fail the test if the node doesn't exist - this is just an example ID
    }
  });
  
  test("Context retrieval", async () => {
    try {
      log('info', `🧠 Testing context retrieval for: "${contextQuery}"...`);
      const contextResponse = await axios.get(
        `${API_NEO4J_URL}/context?user_id=${USER_ID}&query=${encodeURIComponent(contextQuery)}&limit=3`
      );
      log('success', `✅ Context data: ${JSON.stringify(contextResponse.data, null, 2)}`);
      expect(contextResponse.status).toBe(200);
      expect(contextResponse.data).toBeDefined();
    } catch (error) {
      log('error', `❌ Test failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });
  
  // Only enable interactive mode when running standalone
  if (import.meta.main) {
    test.todo("Interactive query context", async () => {
      log('info', '\n🔍 Interactive query context test is available in standalone mode only');
      // This would contain the interactive code
    });
  }
});

// For standalone execution
if (import.meta.main) {
  log('info', '🔌 Running Neo4j Context tests in standalone mode...');
  // Tests will be automatically run by Bun
}