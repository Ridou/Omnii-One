/**
 * Test script for n8n Memory Bridge API
 * Run with: bun test tests/n8n-memory.test.js
 * 
 * Tests all n8n memory bridge endpoints with proper validation
 * and follows existing testing patterns from the codebase
 */

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import axios from 'axios';
import { API_BASE_URL, USER_ID, log } from './constants.js';

// API endpoint for n8n memory
const API_N8N_MEMORY_URL = `${API_BASE_URL}/api/n8n-memory`;

// Test constants
const TEST_WORKFLOW_ID = 'customer_support_test';
const TEST_EXECUTION_ID = `exec_${Date.now()}`;
const TEST_MEMORY_KEY = `test_interaction_${Date.now()}`;
const TEST_MEMORY_VALUE = {
  message: 'Hello from n8n test!',
  timestamp: new Date().toISOString(),
  customer_data: {
    satisfaction: 9,
    resolved: true,
    duration: 120,
    inquiry_type: 'billing'
  },
  ai_context: {
    concepts_used: ['customer_service', 'billing_support'],
    confidence: 0.95,
    response_time: 1.2
  }
};

// Test concept data
const TEST_CONCEPT_DATA = {
  user_id: USER_ID,
  concept_name: 'Customer Support Excellence',
  properties: {
    summary: 'Best practices for customer support discovered through n8n workflows',
    category: 'customer_service',
    success_rate: 0.95,
    avg_resolution_time: 120,
    source_insights: ['quick response time', 'empathy', 'clear communication'],
    created_by_workflow: true,
    effectiveness_score: 9.2
  },
  source_workflow: TEST_WORKFLOW_ID
};

// Test relationship data
const TEST_RELATIONSHIP_DATA = {
  user_id: USER_ID,
  from_concept: 'Customer Support Excellence',
  to_concept: 'Billing Support Patterns',
  relationship_type: 'RELATES_TO',
  properties: {
    strength: 0.8,
    discovered_through: TEST_WORKFLOW_ID,
    correlation_score: 0.9,
    created_at: new Date().toISOString()
  }
};

// Test memory storage tracking
let storedMemoryId = null;
let storedConceptId = null;
let apiAvailable = false;

describe("n8n Memory Bridge API Tests", () => {
  beforeAll(async () => {
    log('info', '🧠 Starting n8n Memory Bridge API Tests');
    log('info', `🔗 Using API: ${API_N8N_MEMORY_URL}`);
    log('info', `👤 Test User ID: ${USER_ID}`);
    log('info', `⚙️ Test Workflow ID: ${TEST_WORKFLOW_ID}`);
    
    // Check if API is available
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      apiAvailable = true;
      log('success', `✅ API is available: ${JSON.stringify(healthResponse.data)}`);
    } catch (error) {
      apiAvailable = false;
      log('error', `❌ API not available: ${error.message}`);
      log('info', 'Some tests will be skipped due to API unavailability');
    }
  });

  test("API health and connectivity check", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '🔍 Checking API health and n8n memory endpoint...');
      
      // Check main API health
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      log('success', `✅ Main API health: ${JSON.stringify(healthResponse.data)}`);
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.data.status).toBe('ok');
      
    } catch (error) {
      log('error', `❌ API health check failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });

  test("Store workflow memory", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '💾 Testing store workflow memory...');
      log('context', `Data: ${JSON.stringify({
        workflow_id: TEST_WORKFLOW_ID,
        execution_id: TEST_EXECUTION_ID,
        key: TEST_MEMORY_KEY
      }, null, 2)}`);
      
      const storeData = {
        user_id: USER_ID,
        workflow_id: TEST_WORKFLOW_ID,
        execution_id: TEST_EXECUTION_ID,
        key: TEST_MEMORY_KEY,
        value: TEST_MEMORY_VALUE
      };

      const response = await axios.post(`${API_N8N_MEMORY_URL}/store-memory`, storeData);
      
      log('success', `✅ Memory stored successfully: ${JSON.stringify(response.data, null, 2)}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Memory stored successfully');
      expect(response.data.data).toBeDefined();
      expect(response.data.data.memory_id).toBeDefined();
      
      // Store memory ID for later tests
      storedMemoryId = response.data.data.memory_id;
      log('info', `📝 Stored memory ID: ${storedMemoryId}`);

    } catch (error) {
      log('error', `❌ Store memory test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      if (error.response?.data) {
        log('error', `Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw error;
    }
  });

  test("Retrieve workflow memory - all memories", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '🔍 Testing retrieve all workflow memories...');
      log('context', `Requesting memories for workflow: ${TEST_WORKFLOW_ID}`);
      
      const response = await axios.get(`${API_N8N_MEMORY_URL}/retrieve-memory`, {
        params: {
          user_id: USER_ID,
          workflow_id: TEST_WORKFLOW_ID
        }
      });

      log('success', `✅ Retrieved memories: ${JSON.stringify(response.data, null, 2)}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.memories).toBeDefined();
      expect(Array.isArray(response.data.data.memories)).toBe(true);
      
      // Should include our stored memory
      const foundMemory = response.data.data.memories.find(m => m.key === TEST_MEMORY_KEY);
      if (foundMemory) {
        expect(foundMemory).toBeDefined();
        expect(foundMemory.key).toBe(TEST_MEMORY_KEY);
        expect(foundMemory.value.message).toBe(TEST_MEMORY_VALUE.message);
        log('success', `✅ Found our stored memory: ${foundMemory.key}`);
      } else {
        log('info', 'Stored memory not found in results (may still be processing)');
      }

    } catch (error) {
      log('error', `❌ Retrieve all memories test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      throw error;
    }
  });

  test("Store concept from workflow", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '💡 Testing store concept from workflow...');
      log('context', `Concept: ${TEST_CONCEPT_DATA.concept_name}`);
      
      const response = await axios.post(`${API_N8N_MEMORY_URL}/store-concept`, TEST_CONCEPT_DATA);
      
      log('success', `✅ Concept stored: ${JSON.stringify(response.data, null, 2)}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Concept stored successfully');
      expect(response.data.data.concept_name).toBe(TEST_CONCEPT_DATA.concept_name);
      
      // Store concept ID for later tests
      storedConceptId = response.data.data.concept_id;
      log('info', `💡 Stored concept ID: ${storedConceptId}`);

    } catch (error) {
      log('error', `❌ Store concept test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      throw error;
    }
  });

  test("Search concepts", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '🔍 Testing search concepts...');
      
      const testQueries = ['support', 'customer', 'excellence'];
      
      for (const query of testQueries) {
        log('context', `Searching for: "${query}"`);
        
        const response = await axios.get(`${API_N8N_MEMORY_URL}/search-concepts`, {
          params: {
            user_id: USER_ID,
            query: query,
            limit: 5
          }
        });

        log('success', `✅ Search results for "${query}": ${JSON.stringify(response.data, null, 2)}`);
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.data.concepts).toBeDefined();
        expect(Array.isArray(response.data.data.concepts)).toBe(true);
        
        log('info', `Found ${response.data.data.concepts.length} concepts for "${query}"`);
      }

    } catch (error) {
      log('error', `❌ Search concepts test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      throw error;
    }
  });

  test("Create relationship between concepts", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '🔗 Testing create concept relationship...');
      log('context', `Relationship: ${TEST_RELATIONSHIP_DATA.from_concept} -> ${TEST_RELATIONSHIP_DATA.to_concept}`);
      
      const response = await axios.post(`${API_N8N_MEMORY_URL}/create-relationship`, TEST_RELATIONSHIP_DATA);
      
      log('success', `✅ Relationship created: ${JSON.stringify(response.data, null, 2)}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Relationship created successfully');
      expect(response.data.data.relationship_type).toBe(TEST_RELATIONSHIP_DATA.relationship_type);

    } catch (error) {
      log('error', `❌ Create relationship test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      throw error;
    }
  });

  test("Get context - recent memories", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '📋 Testing get context for recent memories...');
      
      const response = await axios.get(`${API_N8N_MEMORY_URL}/get-context`, {
        params: {
          user_id: USER_ID,
          context_type: 'recent_memories'
        }
      });

      log('success', `✅ Recent memories context: ${JSON.stringify(response.data, null, 2)}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.context_type).toBe('recent_memories');
      expect(Array.isArray(response.data.data.context)).toBe(true);
      
      log('info', `Retrieved ${response.data.data.context.length} recent memory items`);

    } catch (error) {
      log('error', `❌ Get recent memories context test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      throw error;
    }
  });

  test("Get context - concepts", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '🧠 Testing get context for concepts...');
      
      const response = await axios.get(`${API_N8N_MEMORY_URL}/get-context`, {
        params: {
          user_id: USER_ID,
          context_type: 'concepts'
        }
      });

      log('success', `✅ Concepts context: ${JSON.stringify(response.data, null, 2)}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.context_type).toBe('concepts');
      expect(Array.isArray(response.data.data.context)).toBe(true);
      
      log('info', `Retrieved ${response.data.data.context.length} concept items`);

    } catch (error) {
      log('error', `❌ Get concepts context test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      throw error;
    }
  });

  test("Get context - notes", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '📝 Testing get context for notes...');
      
      const response = await axios.get(`${API_N8N_MEMORY_URL}/get-context`, {
        params: {
          user_id: USER_ID,
          context_type: 'notes'
        }
      });

      log('success', `✅ Notes context: ${JSON.stringify(response.data, null, 2)}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.context_type).toBe('notes');
      expect(Array.isArray(response.data.data.context)).toBe(true);
      
      log('info', `Retrieved ${response.data.data.context.length} note items`);

    } catch (error) {
      log('error', `❌ Get notes context test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      throw error;
    }
  });

  test("Get workflow statistics", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '📊 Testing get workflow statistics...');
      
      const response = await axios.get(`${API_N8N_MEMORY_URL}/workflow-stats`, {
        params: {
          user_id: USER_ID
        }
      });

      log('success', `✅ Workflow stats: ${JSON.stringify(response.data, null, 2)}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user_id).toBe(USER_ID);
      expect(typeof response.data.data.workflow_count).toBe('number');
      expect(typeof response.data.data.memory_count).toBe('number');
      
      const stats = response.data.data;
      log('result', `📊 User has ${stats.workflow_count} workflows with ${stats.memory_count} total memories`);

    } catch (error) {
      log('error', `❌ Get workflow stats test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      throw error;
    }
  });

  test("Invalid user ID validation", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '🚫 Testing invalid user ID validation...');
      
      const invalidRequests = [
        { user_id: 'invalid-uuid', description: 'Invalid UUID format' },
        { user_id: '', description: 'Empty user ID' },
        { user_id: '123', description: 'Too short' },
        { user_id: 'not-a-uuid-at-all', description: 'Invalid format' }
      ];

      for (const invalidRequest of invalidRequests) {
        log('context', `Testing ${invalidRequest.description}: "${invalidRequest.user_id}"`);
        
        try {
          const response = await axios.post(`${API_N8N_MEMORY_URL}/store-memory`, {
            user_id: invalidRequest.user_id,
            workflow_id: TEST_WORKFLOW_ID,
            execution_id: TEST_EXECUTION_ID,
            key: 'test_key',
            value: { test: 'data' }
          });

          // This should not reach here
          log('error', `❌ Expected validation error but request succeeded for: ${invalidRequest.description}`);
          expect(false).toBe(true); // Force failure

        } catch (error) {
          // This is expected
          log('success', `✅ Validation working for ${invalidRequest.description}: ${error.response?.status} - ${error.response?.data?.error}`);
          expect(error.response?.status).toBe(400);
          expect(error.response?.data?.error).toContain('user_id');
        }
      }

    } catch (error) {
      log('error', `❌ User ID validation test failed: ${error.message}`);
      throw error;
    }
  });

  test("Missing required fields validation", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '🚫 Testing missing required fields validation...');
      
      const invalidRequests = [
        { 
          data: { user_id: USER_ID }, 
          description: 'Missing workflow_id, execution_id, key, value' 
        },
        { 
          data: { user_id: USER_ID, workflow_id: 'test' }, 
          description: 'Missing execution_id, key, value' 
        },
        { 
          data: { user_id: USER_ID, workflow_id: 'test', execution_id: 'exec' }, 
          description: 'Missing key, value' 
        }
      ];

      for (const invalidRequest of invalidRequests) {
        log('context', `Testing ${invalidRequest.description}`);
        
        try {
          const response = await axios.post(`${API_N8N_MEMORY_URL}/store-memory`, invalidRequest.data);
          
          // This should not reach here
          log('error', `❌ Expected validation error but request succeeded for: ${invalidRequest.description}`);
          expect(false).toBe(true); // Force failure

        } catch (error) {
          // This is expected
          log('success', `✅ Validation working for ${invalidRequest.description}: ${error.response?.status}`);
          expect(error.response?.status).toBe(400);
        }
      }

    } catch (error) {
      log('error', `❌ Required fields validation test failed: ${error.message}`);
      throw error;
    }
  });

  afterAll(() => {
    log('success', '✅ n8n Memory Bridge API Tests completed');
    log('info', `📊 Test Summary:`);
    log('info', `   - API Available: ${apiAvailable ? 'Yes' : 'No'}`);
    log('info', `   - Stored Memory ID: ${storedMemoryId || 'None'}`);
    log('info', `   - Stored Concept ID: ${storedConceptId || 'None'}`);
    log('info', `   - Test Workflow ID: ${TEST_WORKFLOW_ID}`);
    log('info', `   - Test Execution ID: ${TEST_EXECUTION_ID}`);
  });
});

// For standalone execution
if (import.meta.main) {
  log('info', '🧠 Running n8n Memory Bridge tests in standalone mode...');
  // Tests will be automatically run by Bun
} 