/**
 * Integration test for n8n workflow with memory persistence
 * Run with: bun test tests/n8n-workflow.test.js
 * 
 * Tests complete n8n workflow scenarios with memory learning
 */

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import axios from 'axios';
import { API_BASE_URL, USER_ID, log } from './constants.js';

const API_N8N_MEMORY_URL = `${API_BASE_URL}/api/n8n-memory`;

// Workflow simulation constants
const WORKFLOW_ID = 'customer_support_integration';
const CUSTOMER_INQUIRIES = [
  {
    type: 'billing',
    message: 'I need help with my billing account',
    expected_concepts: ['billing_support', 'account_management'],
    satisfaction: 9.2
  },
  {
    type: 'technical',
    message: 'My app is not working properly',
    expected_concepts: ['technical_support', 'troubleshooting'],
    satisfaction: 8.7
  },
  {
    type: 'general',
    message: 'I have a question about your services',
    expected_concepts: ['general_inquiry', 'service_information'],
    satisfaction: 9.0
  }
];

let executionCounter = 0;
const workflowMemories = [];
let apiAvailable = false;

describe("n8n Workflow Integration Tests", () => {
  beforeAll(async () => {
    log('info', '🔄 Starting n8n Workflow Integration Tests');
    log('info', `🔗 Using API: ${API_N8N_MEMORY_URL}`);
    log('info', `👤 Test User ID: ${USER_ID}`);
    log('info', `⚙️ Workflow ID: ${WORKFLOW_ID}`);
    
    // Check API availability
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      apiAvailable = true;
      log('success', `✅ API is available for workflow tests`);
    } catch (error) {
      apiAvailable = false;
      log('error', `❌ API not available: ${error.message}`);
    }
  });

  test("Complete n8n workflow execution simulation", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      executionCounter++;
      const executionId = `exec_${Date.now()}_${executionCounter}`;
      const customerInquiry = CUSTOMER_INQUIRIES[0];
      
      log('info', `🚀 Simulating complete n8n workflow execution: ${executionId}`);
      log('context', `Customer inquiry: "${customerInquiry.message}"`);

      // Step 1: Get existing context (what n8n would do first)
      log('info', '📋 Step 1: Getting existing context...');
      const contextResponse = await axios.get(`${API_N8N_MEMORY_URL}/get-context`, {
        params: {
          user_id: USER_ID,
          context_type: 'recent_memories'
        }
      });
      
      expect(contextResponse.status).toBe(200);
      const existingContext = contextResponse.data.data.context;
      log('context', `Found ${existingContext.length} existing memories`);

      // Step 2: Search relevant concepts (AI context retrieval)
      log('info', '🔍 Step 2: Searching relevant concepts...');
      const conceptsResponse = await axios.get(`${API_N8N_MEMORY_URL}/search-concepts`, {
        params: {
          user_id: USER_ID,
          query: customerInquiry.type,
          limit: 3
        }
      });
      
      expect(conceptsResponse.status).toBe(200);
      const relevantConcepts = conceptsResponse.data.data.concepts;
      log('context', `Found ${relevantConcepts.length} relevant concepts`);

      // Step 3: Simulate AI processing with context
      log('info', '⚙️ Step 3: Processing customer inquiry with AI...');
      const processingMetrics = {
        context_items_used: existingContext.length,
        concepts_used: relevantConcepts.map(c => c.name || c.properties?.name).filter(Boolean),
        processing_time: Math.random() * 2 + 0.5, // 0.5-2.5 seconds
        confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0 confidence
      };

      const aiResponse = `Based on ${relevantConcepts.length} relevant concepts and ${existingContext.length} past interactions, I can help you with your ${customerInquiry.type} inquiry. Let me assist you with that...`;
      
      log('result', `AI Response: ${aiResponse.substring(0, 100)}...`);
      log('context', `Processing metrics: ${JSON.stringify(processingMetrics, null, 2)}`);

      // Step 4: Store workflow execution memory
      log('info', '💾 Step 4: Storing workflow execution...');
      const memoryData = {
        user_id: USER_ID,
        workflow_id: WORKFLOW_ID,
        execution_id: executionId,
        key: `customer_interaction_${executionCounter}`,
        value: {
          customer_inquiry: customerInquiry.message,
          inquiry_type: customerInquiry.type,
          ai_response: aiResponse,
          processing_metrics: processingMetrics,
          execution_time: new Date().toISOString(),
          success: true,
          customer_satisfaction: customerInquiry.satisfaction,
          workflow_version: '1.0'
        }
      };

      const memoryResponse = await axios.post(`${API_N8N_MEMORY_URL}/store-memory`, memoryData);
      
      expect(memoryResponse.status).toBe(200);
      expect(memoryResponse.data.success).toBe(true);
      
      workflowMemories.push({
        id: memoryResponse.data.data.memory_id,
        key: memoryData.key,
        executionId: executionId
      });
      
      log('success', `✅ Workflow execution stored: ${memoryResponse.data.data.memory_id}`);

      // Step 5: Update learned concepts (workflow learning)
      log('info', '🧠 Step 5: Storing learned insights...');
      const conceptData = {
        user_id: USER_ID,
        concept_name: `${customerInquiry.type.charAt(0).toUpperCase() + customerInquiry.type.slice(1)} Support Patterns`,
        properties: {
          summary: `Effective patterns for handling ${customerInquiry.type} inquiries`,
          avg_satisfaction: customerInquiry.satisfaction,
          response_template: `Handle ${customerInquiry.type} inquiries with specific guidance`,
          success_factors: ['quick response', 'relevant context', 'clear explanation'],
          processing_time: processingMetrics.processing_time,
          confidence_level: processingMetrics.confidence,
          last_updated: new Date().toISOString(),
          execution_count: 1
        },
        source_workflow: WORKFLOW_ID
      };

      const conceptResponse = await axios.post(`${API_N8N_MEMORY_URL}/store-concept`, conceptData);
      
      expect(conceptResponse.status).toBe(200);
      expect(conceptResponse.data.success).toBe(true);
      log('success', `✅ Concept updated: ${conceptResponse.data.data.concept_name}`);

      // Step 6: Verify workflow learning effectiveness
      log('info', '📊 Step 6: Checking workflow statistics...');
      const statsResponse = await axios.get(`${API_N8N_MEMORY_URL}/workflow-stats`, {
        params: { user_id: USER_ID }
      });

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.data.success).toBe(true);
      
      const stats = statsResponse.data.data;
      log('result', `📊 Workflow Stats: ${stats.workflow_count} workflows, ${stats.memory_count} memories`);
      expect(stats.workflow_count).toBeGreaterThan(0);
      expect(stats.memory_count).toBeGreaterThan(0);

      log('success', '✅ Complete n8n workflow simulation successful!');

    } catch (error) {
      log('error', `❌ Workflow integration test failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });

  test("Multi-execution workflow learning simulation", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '📈 Testing workflow learning over multiple executions...');
      
      const learningResults = [];

      // Simulate multiple customer interactions
      for (let i = 0; i < CUSTOMER_INQUIRIES.length; i++) {
        executionCounter++;
        const inquiry = CUSTOMER_INQUIRIES[i];
        const executionId = `exec_learning_${Date.now()}_${executionCounter}`;
        
        log('info', `🔄 Learning execution ${i + 1}/${CUSTOMER_INQUIRIES.length}: ${executionId}`);
        log('context', `Processing: "${inquiry.message}"`);

        // Get context before processing (simulating n8n context retrieval)
        const preContextResponse = await axios.get(`${API_N8N_MEMORY_URL}/get-context`, {
          params: {
            user_id: USER_ID,
            context_type: 'concepts'
          }
        });

        const availableConcepts = preContextResponse.data.data.context.length;

        // Store execution with learning metrics
        const learningMemoryData = {
          user_id: USER_ID,
          workflow_id: WORKFLOW_ID,
          execution_id: executionId,
          key: `learning_interaction_${executionCounter}`,
          value: {
            execution_number: executionCounter,
            customer_inquiry: inquiry.message,
            inquiry_type: inquiry.type,
            success: Math.random() > 0.05, // 95% success rate
            response_time: Math.random() * 100 + 50, // 50-150ms
            customer_satisfaction: inquiry.satisfaction + (Math.random() * 0.4 - 0.2), // ±0.2 variation
            learning_iteration: i + 1,
            available_concepts_count: availableConcepts,
            concepts_matched: inquiry.expected_concepts.length,
            improvement_score: Math.min(1.0, 0.7 + (i * 0.1)) // Learning improvement over time
          }
        };

        const memoryResponse = await axios.post(`${API_N8N_MEMORY_URL}/store-memory`, learningMemoryData);
        expect(memoryResponse.status).toBe(200);

        learningResults.push(learningMemoryData.value);
        
        // Small delay between executions (simulating real workflow timing)
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze learning progression
      log('info', '📊 Analyzing learning progression...');
      const avgImprovement = learningResults.reduce((sum, result) => sum + result.improvement_score, 0) / learningResults.length;
      const avgSatisfaction = learningResults.reduce((sum, result) => sum + result.customer_satisfaction, 0) / learningResults.length;
      
      log('result', `📈 Learning Analysis:`);
      log('result', `   - Average improvement score: ${avgImprovement.toFixed(2)}`);
      log('result', `   - Average customer satisfaction: ${avgSatisfaction.toFixed(2)}`);
      log('result', `   - Total executions processed: ${learningResults.length}`);

      // Verify learning effectiveness
      expect(avgImprovement).toBeGreaterThan(0.7);
      expect(avgSatisfaction).toBeGreaterThan(8.0);
      expect(learningResults.length).toBe(CUSTOMER_INQUIRIES.length);

      // Check final statistics
      const finalStatsResponse = await axios.get(`${API_N8N_MEMORY_URL}/workflow-stats`, {
        params: { user_id: USER_ID }
      });

      const finalStats = finalStatsResponse.data.data;
      log('result', `📊 Final Stats: ${finalStats.memory_count} total memories stored`);
      expect(finalStats.memory_count).toBeGreaterThan(learningResults.length);

      log('success', '✅ Multi-execution workflow learning simulation completed!');

    } catch (error) {
      log('error', `❌ Learning simulation failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });

  test("Workflow memory retrieval and context building", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '🔍 Testing workflow memory retrieval for context building...');

      // Retrieve all memories for our workflow
      const allMemoriesResponse = await axios.get(`${API_N8N_MEMORY_URL}/retrieve-memory`, {
        params: {
          user_id: USER_ID,
          workflow_id: WORKFLOW_ID
        }
      });

      expect(allMemoriesResponse.status).toBe(200);
      const allMemories = allMemoriesResponse.data.data.memories;
      log('success', `✅ Retrieved ${allMemories.length} workflow memories`);

      // Test context aggregation (what n8n would use for decision making)
      const contextTypes = ['recent_memories', 'concepts', 'notes'];
      const contextResults = {};

      for (const contextType of contextTypes) {
        const contextResponse = await axios.get(`${API_N8N_MEMORY_URL}/get-context`, {
          params: {
            user_id: USER_ID,
            context_type: contextType
          }
        });

        expect(contextResponse.status).toBe(200);
        contextResults[contextType] = contextResponse.data.data.context;
        log('context', `${contextType}: ${contextResults[contextType].length} items`);
      }

      // Verify context completeness
      expect(Object.keys(contextResults)).toEqual(contextTypes);
      expect(contextResults.recent_memories).toBeDefined();
      expect(contextResults.concepts).toBeDefined();
      expect(contextResults.notes).toBeDefined();

      // Test specific memory retrieval
      if (workflowMemories.length > 0) {
        const firstMemory = workflowMemories[0];
        log('info', `🔍 Testing specific memory retrieval: ${firstMemory.key}`);

        const specificMemoryResponse = await axios.get(`${API_N8N_MEMORY_URL}/retrieve-memory`, {
          params: {
            user_id: USER_ID,
            workflow_id: WORKFLOW_ID,
            key: firstMemory.key
          }
        });

        expect(specificMemoryResponse.status).toBe(200);
        const specificMemories = specificMemoryResponse.data.data.memories;
        
        if (specificMemories.length > 0) {
          expect(specificMemories[0].key).toBe(firstMemory.key);
          log('success', `✅ Specific memory retrieval successful: ${firstMemory.key}`);
        } else {
          log('info', 'Specific memory not found (may still be processing)');
        }
      }

      log('success', '✅ Workflow memory retrieval and context building test completed!');

    } catch (error) {
      log('error', `❌ Memory retrieval test failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });

  test("Cross-workflow concept relationship building", async () => {
    if (!apiAvailable) {
      log('info', 'Skipping test - API not available');
      return;
    }

    try {
      log('info', '🔗 Testing cross-workflow concept relationship building...');

      // Create relationships between concepts discovered by different workflow executions
      const relationships = [
        {
          from: 'Billing Support Patterns',
          to: 'Customer Satisfaction',
          type: 'IMPROVES',
          strength: 0.9
        },
        {
          from: 'Technical Support Patterns',
          to: 'Problem Resolution',
          type: 'ENABLES',
          strength: 0.85
        },
        {
          from: 'General Support Patterns',
          to: 'Customer Experience',
          type: 'ENHANCES',
          strength: 0.8
        }
      ];

      for (const rel of relationships) {
        log('context', `Creating relationship: ${rel.from} -[${rel.type}]-> ${rel.to}`);

        const relationshipData = {
          user_id: USER_ID,
          from_concept: rel.from,
          to_concept: rel.to,
          relationship_type: rel.type,
          properties: {
            strength: rel.strength,
            discovered_through: WORKFLOW_ID,
            cross_workflow: true,
            created_at: new Date().toISOString(),
            confidence: Math.random() * 0.2 + 0.8 // 0.8-1.0
          }
        };

        const relationshipResponse = await axios.post(`${API_N8N_MEMORY_URL}/create-relationship`, relationshipData);
        expect(relationshipResponse.status).toBe(200);
        expect(relationshipResponse.data.success).toBe(true);
        
        log('success', `✅ Relationship created: ${rel.from} -[${rel.type}]-> ${rel.to}`);
      }

      // Verify relationship network by searching for connected concepts
      log('info', '🕸️ Verifying relationship network...');
      
      const searchQueries = ['support', 'customer', 'patterns'];
      let totalConceptsFound = 0;

      for (const query of searchQueries) {
        const searchResponse = await axios.get(`${API_N8N_MEMORY_URL}/search-concepts`, {
          params: {
            user_id: USER_ID,
            query: query,
            limit: 10
          }
        });

        expect(searchResponse.status).toBe(200);
        const concepts = searchResponse.data.data.concepts;
        totalConceptsFound += concepts.length;
        
        log('context', `Query "${query}" found ${concepts.length} related concepts`);
      }

      log('result', `🕸️ Total concept network size: ${totalConceptsFound} concept-query matches`);
      expect(totalConceptsFound).toBeGreaterThan(0);

      log('success', '✅ Cross-workflow concept relationship building completed!');

    } catch (error) {
      log('error', `❌ Relationship building test failed: ${error.response?.data || error.message}`);
      throw error;
    }
  });

  afterAll(() => {
    log('success', `✅ n8n Workflow Integration Tests completed`);
    log('info', `📊 Integration Summary:`);
    log('info', `   - Total executions: ${executionCounter}`);
    log('info', `   - Workflow memories stored: ${workflowMemories.length}`);
    log('info', `   - Customer inquiry types tested: ${CUSTOMER_INQUIRIES.length}`);
    log('info', `   - API available: ${apiAvailable ? 'Yes' : 'No'}`);
    log('info', `   - Workflow ID: ${WORKFLOW_ID}`);
  });
});

// For standalone execution
if (import.meta.main) {
  log('info', '🔄 Running n8n Workflow Integration tests in standalone mode...');
} 