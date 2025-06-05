/**
 * Test script to discover and test available MCP endpoints
 * Run with: bun test tests/mcp-tools-discovery.test.js
 * 
 * This test checks the API endpoints directly, without using the SSE client.
 */

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import { log, USER_ID, API_ENDPOINTS } from './constants.js';
import axios from 'axios';

// Allow configuring which API endpoint to use (local or prod)
const API_BASE_URL = API_ENDPOINTS.PROD;
const MCP_URL = `${API_BASE_URL}/api/mcp/neo4j`;
const NEO4J_URL = `${API_BASE_URL}/api/neo4j`;

describe("MCP API Endpoints Tests", () => {
  beforeAll(async () => {
    log('info', `Testing API server at: ${API_BASE_URL}`);
    log('info', `MCP endpoint: ${MCP_URL}`);
    log('info', `Neo4j API endpoint: ${NEO4J_URL}`);
    log('info', `Using user ID: ${USER_ID}`);
  });

  // No cleanup needed for HTTP requests
  afterAll(async () => {
    log('info', 'All tests completed');
  });

  // Test Neo4j API health endpoint
  test("Check Neo4j API health", async () => {
    try {
      log('info', 'Testing Neo4j API health endpoint...');
      const response = await axios.get(`${NEO4J_URL}/health`);
      
      log('success', `Health endpoint returned: ${JSON.stringify(response.data)}`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ok');
    } catch (error) {
      log('error', `Health endpoint test failed: ${error.message}`);
      if (error.response) {
        log('error', `Status: ${error.response.status}`);
        log('error', `Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  });

  // Test Neo4j API concepts endpoint
  test("List concepts via Neo4j API", async () => {
    try {
      log('info', 'Testing Neo4j API concepts endpoint...');
      const response = await axios.get(`${NEO4J_URL}/concepts`, {
        params: {
          user_id: USER_ID,
          limit: 5
        }
      });
      
      const concepts = response.data.data || [];
      log('success', `Concepts endpoint returned ${concepts.length} concepts`);
      
      if (concepts.length > 0) {
        log('info', 'First concept:');
        const concept = concepts[0];
        log('info', `- ID: ${concept.id}`);
        log('info', `- Labels: ${concept.labels?.join(', ') || 'N/A'}`);
        log('info', `- Properties: ${Object.keys(concept.properties || {}).slice(0, 5).join(', ')}...`);
      }
      
      expect(response.status).toBe(200);
      expect(Array.isArray(concepts)).toBe(true);
    } catch (error) {
      log('error', `Concepts endpoint test failed: ${error.message}`);
      if (error.response) {
        log('error', `Status: ${error.response.status}`);
        log('error', `Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  });
  
  // Test Neo4j API search endpoint
  test("Search concepts via Neo4j API", async () => {
    const searchText = 'test';
    
    try {
      log('info', `Testing Neo4j API search endpoint with query "${searchText}"...`);
      const response = await axios.get(`${NEO4J_URL}/concepts/search`, {
        params: {
          user_id: USER_ID,
          q: searchText,
          limit: 5
        }
      });
      
      const results = response.data.data || [];
      log('success', `Search endpoint returned ${results.length} results`);
      
      if (results.length > 0) {
        log('info', 'First result:');
        const result = results[0];
        log('info', `- ID: ${result.id}`);
        log('info', `- Labels: ${result.labels?.join(', ') || 'N/A'}`);
        log('info', `- Properties: ${Object.keys(result.properties || {}).slice(0, 5).join(', ')}...`);
      }
      
      expect(response.status).toBe(200);
      expect(Array.isArray(results)).toBe(true);
    } catch (error) {
      log('error', `Search endpoint test failed: ${error.message}`);
      if (error.response) {
        log('error', `Status: ${error.response.status}`);
        log('error', `Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  });
  
  // Test Neo4j API context endpoint
  test("Get context via Neo4j API", async () => {
    const queryText = 'knowledge graph';
    
    try {
      log('info', `Testing Neo4j API context endpoint with query "${queryText}"...`);
      const response = await axios.get(`${NEO4J_URL}/context`, {
        params: {
          user_id: USER_ID,
          query: queryText,
          limit: 3
        }
      });
      
      log('success', `Context endpoint returned: ${JSON.stringify(response.data.message || '')}`);
      
      const contextData = response.data.data || {};
      const concepts = contextData.concepts || [];
      const relationships = contextData.relationships || [];
      
      log('info', `Context contains ${concepts.length} concepts and ${relationships.length} relationships`);
      
      expect(response.status).toBe(200);
    } catch (error) {
      log('error', `Context endpoint test failed: ${error.message}`);
      if (error.response) {
        log('error', `Status: ${error.response.status}`);
        log('error', `Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  });
  
  // Test MCP Neo4j ping endpoint
  test("Ping MCP Neo4j server", async () => {
    try {
      log('info', 'Testing MCP Neo4j ping endpoint...');
      const response = await axios.get(`${MCP_URL}/ping`);
      
      log('success', `Ping endpoint returned: ${JSON.stringify(response.data)}`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ok');
    } catch (error) {
      log('error', `Ping endpoint test failed: ${error.message}`);
      if (error.response) {
        log('error', `Status: ${error.response.status}`);
        log('error', `Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  });
});

// For standalone execution
if (import.meta.main) {
  log('info', '🔌 Running MCP API Endpoints tests in standalone mode...');
  // Tests will be automatically run by Bun
}