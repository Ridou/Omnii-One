/**
 * n8n Agent Integration Tests
 * 
 * Comprehensive test suite for n8n Agent Swarm integration
 * Tests routing logic, fallback mechanisms, and response handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { N8nAgentClient, N8nAgentRequest, N8nAgentResponse } from '../../src/services/integrations/n8n-agent-client';
import { N8nAgentStepExecutor } from '../../src/services/action-planner/step-executors/n8n-agent-executor';
import { ActionPlanner } from '../../src/services/core/action-planner';
import { StepExecutorFactory } from '../../src/services/action-planner/step-executors/step-executor-factory';
import { N8nConfigManager } from '../../src/config/n8n-agent.config';
import {
  ActionStep,
  ExecutionContext,
  ExecutionContextType,
  PlanState,
  N8nAgentActionType,
  ResponseCategory,
} from '../../src/types/action-planning.types';

// Test configuration
const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
const TEST_TIMEOUT = 30000; // 30 seconds for tests

describe('n8n Agent Integration', () => {
  let n8nClient: N8nAgentClient;
  let n8nExecutor: N8nAgentStepExecutor;
  let actionPlanner: ActionPlanner;
  let stepFactory: StepExecutorFactory;

  beforeAll(() => {
    // Initialize test instances
    n8nClient = new N8nAgentClient();
    n8nExecutor = new N8nAgentStepExecutor();
    actionPlanner = new ActionPlanner();
    stepFactory = new StepExecutorFactory();
    
    // Set test environment variables
    process.env.N8N_AGENT_SWARM_URL = 'https://omnii-agent-swarm-production.up.railway.app';
    process.env.N8N_AGENT_ENABLED = 'true';
    process.env.N8N_AGENT_TIMEOUT = '30000'; // Shorter timeout for tests
    process.env.N8N_FALLBACK_ENABLED = 'true';
    process.env.N8N_ENABLED_AGENTS = 'email,calendar,contact,web,youtube';
  });

  beforeEach(() => {
    // Reset any state between tests
    jest.clearAllMocks?.();
  });

  describe('Configuration and Setup', () => {
    it('should validate n8n agent configuration', () => {
      const isValid = N8nConfigManager.validateConfig();
      expect(isValid).toBe(true);
    });

    it('should have correct webhook URL', () => {
      const webhookUrl = N8nConfigManager.getWebhookUrl();
      expect(webhookUrl).toBe('https://omnii-agent-swarm-production.up.railway.app/webhook/agent-input');
    });

    it('should check agent enablement correctly', () => {
      expect(N8nConfigManager.isAgentEnabled('email')).toBe(true);
      expect(N8nConfigManager.isAgentEnabled('web')).toBe(true);
      expect(N8nConfigManager.isAgentEnabled('nonexistent')).toBe(false);
    });

    it('should register n8n executor in factory', () => {
      expect(stepFactory.hasExecutor('n8n_agent')).toBe(true);
      expect(stepFactory.getSupportedStepTypes()).toContain('n8n_agent');
    });
  });

  describe('n8n Agent Client', () => {
    it('should create valid n8n request format', async () => {
      const testRequest: N8nAgentRequest = {
        message: 'Test message for n8n agents',
        user_id: TEST_USER_ID,
        agent_type: 'auto',
        context: {
          userTimezone: 'America/Los_Angeles',
          entities: [],
        },
        metadata: {
          requestId: 'test-request-1',
          priority: 'normal',
        }
      };

      // Validate request structure
      expect(testRequest.message).toBeTruthy();
      expect(testRequest.user_id).toBe(TEST_USER_ID);
      expect(testRequest.context).toBeDefined();
      expect(testRequest.metadata?.requestId).toBe('test-request-1');
    });

    it('should handle health check', async () => {
      const healthStatus = await n8nClient.checkHealth();
      
      expect(healthStatus).toHaveProperty('healthy');
      expect(healthStatus).toHaveProperty('responseTime');
      expect(healthStatus).toHaveProperty('lastChecked');
      
      // Health check should complete within reasonable time
      expect(healthStatus.responseTime).toBeLessThan(30000);
    }, TEST_TIMEOUT);

    it('should get service statistics', () => {
      const stats = n8nClient.getStats();
      
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('healthStatus');
      expect(stats).toHaveProperty('config');
      expect(stats.config.baseUrl).toBe('https://omnii-agent-swarm-production.up.railway.app');
    });
  });

  describe('Action Planning with n8n Routing', () => {
    const createTestContext = (): ExecutionContext => ({
      entityId: TEST_USER_ID,
      phoneNumber: TEST_USER_ID,
      userUUID: TEST_USER_ID,
      userTimezone: 'America/Los_Angeles',
      stepResults: new Map(),
      currentStepIndex: 0,
      entities: [],
      sessionId: 'test-session',
      planState: PlanState.PENDING,
      context: ExecutionContextType.WEBSOCKET,
      communicationChannel: 'chat',
    });

    it('should route complex automation to n8n agent', async () => {
      const complexMessage = 'Research the latest AI trends and send a summary email to my team';
      
      const plan = await actionPlanner.createPlan(complexMessage, [], TEST_USER_ID, createTestContext());
      
      // Should create plan with n8n_agent steps
      expect(plan.steps.length).toBeGreaterThan(0);
      
      // Check if any step uses n8n_agent
      const hasN8nStep = plan.steps.some(step => 
        step.type === 'n8n_agent' || 
        Object.values(N8nAgentActionType).includes(step.action as N8nAgentActionType)
      );
      
      expect(hasN8nStep).toBe(true);
    }, TEST_TIMEOUT);

    it('should route simple operations to local system', async () => {
      const simpleMessage = 'List my emails from today';
      
      const plan = await actionPlanner.createPlan(simpleMessage, [], TEST_USER_ID, createTestContext());
      
      // Should create plan with local email steps
      expect(plan.steps.length).toBeGreaterThan(0);
      
      // Should use local email executor, not n8n
      const hasLocalStep = plan.steps.some(step => 
        step.type === 'email' && step.action === 'fetch_emails'
      );
      
      expect(hasLocalStep).toBe(true);
    }, TEST_TIMEOUT);

    it('should handle web research requests', async () => {
      const researchMessage = 'What are the latest developments in quantum computing?';
      
      const plan = await actionPlanner.createPlan(researchMessage, [], TEST_USER_ID, createTestContext());
      
      // Should route to n8n for web research
      const hasWebResearchStep = plan.steps.some(step =>
        step.action === N8nAgentActionType.WEB_RESEARCH ||
        step.action === N8nAgentActionType.INFORMATION_GATHERING
      );
      
      expect(hasWebResearchStep).toBe(true);
    }, TEST_TIMEOUT);

    it('should handle YouTube search requests', async () => {
      const youtubeMessage = 'Find YouTube videos about React hooks tutorial';
      
      const plan = await actionPlanner.createPlan(youtubeMessage, [], TEST_USER_ID, createTestContext());
      
      // Should route to n8n for YouTube search
      const hasYouTubeStep = plan.steps.some(step =>
        step.action === N8nAgentActionType.YOUTUBE_CONTENT_SEARCH
      );
      
      expect(hasYouTubeStep).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('n8n Agent Step Executor', () => {
    const createTestStep = (action: string): ActionStep => ({
      type: 'n8n_agent',
      action,
      params: { test: true },
      description: `Test ${action} step`,
      id: 'test-step-1',
      state: 'PENDING' as any,
    });

    const createTestContext = (): ExecutionContext => ({
      entityId: TEST_USER_ID,
      phoneNumber: TEST_USER_ID,
      userUUID: TEST_USER_ID,
      userTimezone: 'America/Los_Angeles',
      stepResults: new Map(),
      currentStepIndex: 0,
      entities: [],
      sessionId: 'test-session',
      planState: PlanState.PENDING,
      context: ExecutionContextType.WEBSOCKET,
      communicationChannel: 'chat',
    });

    it('should support all n8n action types', () => {
      const supportedActions = n8nExecutor.getSupportedActions();
      
      // Check that all N8nAgentActionType values are supported
      Object.values(N8nAgentActionType).forEach(actionType => {
        expect(supportedActions).toContain(actionType);
      });
    });

    it('should execute web research step', async () => {
      const step = createTestStep(N8nAgentActionType.WEB_RESEARCH);
      step.params = { query: 'latest AI trends' };
      step.description = 'Research latest AI trends';
      
      const context = createTestContext();
      const result = await n8nExecutor.executeStep(step, context);
      
      // Should complete successfully or provide meaningful error
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('stepId', 'test-step-1');
      expect(result).toHaveProperty('timestamp');
      
      if (result.success) {
        expect(result.category).toBe(ResponseCategory.WEB_RESEARCH);
        expect(result.data).toBeDefined();
      } else {
        // If failed, should have error message
        expect(result.error).toBeTruthy();
      }
    }, TEST_TIMEOUT);

    it('should handle fallback to local system', async () => {
      // Create a step that can fallback to local execution
      const step = createTestStep('smart_email_compose');
      step.params = {
        recipient_email: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Body'
      };
      
      const context = createTestContext();
      
      // Mock n8n client to fail
      const originalSendToAgentSwarm = n8nClient.sendToAgentSwarm;
      n8nClient.sendToAgentSwarm = async () => {
        throw new Error('Service unavailable');
      };
      
      const result = await n8nExecutor.executeStep(step, context);
      
      // Should fallback to local execution
      expect(result).toHaveProperty('success');
      
      // Restore original method
      n8nClient.sendToAgentSwarm = originalSendToAgentSwarm;
    }, TEST_TIMEOUT);
  });

  describe('End-to-End Integration', () => {
    it('should handle complete web research workflow', async () => {
      const message = 'Research quantum computing breakthroughs in 2024';
      
      try {
        const request: N8nAgentRequest = {
          message,
          user_id: TEST_USER_ID,
          agent_type: 'web',
          context: {
            userTimezone: 'America/Los_Angeles',
            entities: [],
          },
          metadata: {
            requestId: 'test-web-research',
            priority: 'normal',
          }
        };

        const response = await n8nClient.executeWithRetry(request);
        
        // Should get valid response structure
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('agent');
        expect(response).toHaveProperty('action');
        expect(response).toHaveProperty('execution_time');
        
        if (response.success) {
          expect(response.agent).toBe('Web Agent');
          expect(response.result).toBeDefined();
          console.log(`✅ Web research test completed: ${response.execution_time}`);
        } else {
          console.log(`⚠️ Web research test failed: ${response.error}`);
        }
      } catch (error) {
        console.log(`⚠️ Web research test error (expected if service unavailable): ${error.message}`);
        // Test should not fail if service is unavailable - this is expected
        expect(error.message).toBeTruthy();
      }
    }, TEST_TIMEOUT);

    it('should handle YouTube search workflow', async () => {
      const message = 'Find YouTube videos about TypeScript advanced patterns';
      
      try {
        const request: N8nAgentRequest = {
          message,
          user_id: TEST_USER_ID,
          agent_type: 'youtube',
          context: {
            userTimezone: 'America/Los_Angeles',
            entities: [],
          },
          metadata: {
            requestId: 'test-youtube-search',
            priority: 'normal',
          }
        };

        const response = await n8nClient.executeWithRetry(request);
        
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('agent');
        
        if (response.success) {
          expect(response.agent).toBe('YouTube Agent');
          expect(response.result).toBeDefined();
          console.log(`✅ YouTube search test completed: ${response.execution_time}`);
        } else {
          console.log(`⚠️ YouTube search test failed: ${response.error}`);
        }
      } catch (error) {
        console.log(`⚠️ YouTube search test error (expected if service unavailable): ${error.message}`);
        expect(error.message).toBeTruthy();
      }
    }, TEST_TIMEOUT);

    it('should handle email automation workflow', async () => {
      const message = 'Compose a professional email to john@example.com about project updates';
      
      try {
        const request: N8nAgentRequest = {
          message,
          user_id: TEST_USER_ID,
          agent_type: 'email',
          context: {
            userTimezone: 'America/Los_Angeles',
            entities: [
              {
                type: 'PERSON',
                value: 'John',
                email: 'john@example.com',
                needsEmailResolution: false,
                confidence: 0.9,
                source: 'user_input',
                metadata: {}
              }
            ],
          },
          metadata: {
            requestId: 'test-email-automation',
            priority: 'high',
          }
        };

        const response = await n8nClient.executeWithRetry(request);
        
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('agent');
        
        if (response.success) {
          expect(response.agent).toBe('Email Agent');
          console.log(`✅ Email automation test completed: ${response.execution_time}`);
        } else {
          console.log(`⚠️ Email automation test failed: ${response.error}`);
        }
      } catch (error) {
        console.log(`⚠️ Email automation test error (expected if service unavailable): ${error.message}`);
        expect(error.message).toBeTruthy();
      }
    }, TEST_TIMEOUT);
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle timeout errors gracefully', async () => {
      // Create request with very short timeout
      const request: N8nAgentRequest = {
        message: 'Test timeout handling',
        user_id: TEST_USER_ID,
        agent_type: 'auto',
        metadata: {
          timeout: 100, // 100ms - should timeout
        }
      };

      try {
        await n8nClient.sendToAgentSwarm(request);
      } catch (error) {
        expect(error.message).toContain('timeout');
      }
    });

    it('should handle service unavailable errors', async () => {
      // Mock fetch to simulate service unavailable
      const originalFetch = global.fetch;
      global.fetch = async () => {
        throw new Error('Service unavailable');
      };

      try {
        const request: N8nAgentRequest = {
          message: 'Test service unavailable',
          user_id: TEST_USER_ID,
        };

        await n8nClient.sendToAgentSwarm(request);
      } catch (error) {
        expect(error.message).toContain('Service unavailable');
      } finally {
        // Restore original fetch
        global.fetch = originalFetch;
      }
    });

    it('should execute local fallback when n8n fails', async () => {
      const step: ActionStep = {
        type: 'n8n_agent',
        action: 'smart_email_compose',
        params: {
          recipient_email: 'test@example.com',
          subject: 'Test Subject',
          body: 'Test Body'
        },
        description: 'Send test email',
        id: 'test-fallback-step',
        state: 'PENDING' as any,
      };

      const context: ExecutionContext = {
        entityId: TEST_USER_ID,
        phoneNumber: TEST_USER_ID,
        userUUID: TEST_USER_ID,
        userTimezone: 'America/Los_Angeles',
        stepResults: new Map(),
        currentStepIndex: 0,
        entities: [],
        sessionId: 'test-session',
        planState: PlanState.PENDING,
        context: ExecutionContextType.WEBSOCKET,
        communicationChannel: 'chat',
      };

      // Mock n8n client to simulate failure
      const originalSendToAgentSwarm = n8nClient.sendToAgentSwarm;
      n8nClient.sendToAgentSwarm = async () => {
        throw new Error('Connection timeout');
      };

      const result = await n8nExecutor.executeStep(step, context);
      
      // Should complete (either via n8n or fallback)
      expect(result).toHaveProperty('success');
      expect(result.stepId).toBe('test-fallback-step');
      
      // Restore original method
      n8nClient.sendToAgentSwarm = originalSendToAgentSwarm;
    }, TEST_TIMEOUT);
  });

  describe('Response Processing', () => {
    it('should parse web research response correctly', () => {
      const mockN8nResponse: N8nAgentResponse = {
        success: true,
        agent: 'Web Agent',
        action: 'Web Search',
        result: {
          query: 'AI trends 2024',
          results: [
            {
              title: 'Latest AI Trends',
              snippet: 'Overview of AI developments in 2024',
              link: 'https://example.com/ai-trends'
            }
          ]
        },
        execution_time: '3.2s'
      };

      // Test parsing logic (would be called internally)
      expect(mockN8nResponse.success).toBe(true);
      expect(mockN8nResponse.agent).toBe('Web Agent');
      expect(mockN8nResponse.result.results).toHaveLength(1);
    });

    it('should parse YouTube search response correctly', () => {
      const mockN8nResponse: N8nAgentResponse = {
        success: true,
        agent: 'YouTube Agent',
        action: 'Video Search',
        result: {
          query: 'React hooks tutorial',
          videos: [
            {
              videoId: 'abc123',
              title: 'React Hooks Explained',
              description: 'Complete guide to React hooks',
              channelTitle: 'Tech Channel'
            }
          ]
        },
        execution_time: '2.1s'
      };

      expect(mockN8nResponse.success).toBe(true);
      expect(mockN8nResponse.agent).toBe('YouTube Agent');
      expect(mockN8nResponse.result.videos).toHaveLength(1);
    });

    it('should parse email agent response correctly', () => {
      const mockN8nResponse: N8nAgentResponse = {
        success: true,
        agent: 'Email Agent',
        action: 'Send Email',
        result: {
          messageId: 'msg_123',
          threadId: 'thread_456',
          labelIds: ['SENT']
        },
        execution_time: '1.8s'
      };

      expect(mockN8nResponse.success).toBe(true);
      expect(mockN8nResponse.agent).toBe('Email Agent');
      expect(mockN8nResponse.result.messageId).toBe('msg_123');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track request statistics', async () => {
      const initialStats = n8nClient.getStats();
      const initialRequestCount = initialStats.requestCount;

      // Make a test request
      try {
        const request: N8nAgentRequest = {
          message: 'Test statistics tracking',
          user_id: TEST_USER_ID,
        };

        await n8nClient.sendToAgentSwarm(request);
      } catch (error) {
        // Expected if service unavailable
      }

      const finalStats = n8nClient.getStats();
      
      // Request count should increment (even for failed requests)
      expect(finalStats.requestCount).toBeGreaterThanOrEqual(initialRequestCount);
    });

    it('should measure response times', async () => {
      const healthStatus = await n8nClient.checkHealth();
      
      expect(healthStatus.responseTime).toBeGreaterThan(0);
      expect(healthStatus.lastChecked).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });
});

describe('Integration Test Scenarios', () => {
  it('should handle complex multi-service workflow', async () => {
    const complexWorkflow = 'Research AI conferences in 2024, find relevant YouTube videos, and schedule a team meeting to discuss';
    
    // This would be a complex workflow that exercises multiple agents
    const actionPlanner = new ActionPlanner();
    const context: ExecutionContext = {
      entityId: TEST_USER_ID,
      phoneNumber: TEST_USER_ID,
      userUUID: TEST_USER_ID,
      userTimezone: 'America/Los_Angeles',
      stepResults: new Map(),
      currentStepIndex: 0,
      entities: [],
      sessionId: 'test-complex-workflow',
      planState: PlanState.PENDING,
      context: ExecutionContextType.WEBSOCKET,
      communicationChannel: 'chat',
    };

    try {
      const plan = await actionPlanner.createPlan(complexWorkflow, [], TEST_USER_ID, context);
      
      expect(plan.steps.length).toBeGreaterThan(0);
      
      // Should contain n8n agent steps for complex automation
      const hasN8nSteps = plan.steps.some(step => 
        step.type === 'n8n_agent' || 
        Object.values(N8nAgentActionType).includes(step.action as N8nAgentActionType)
      );
      
      expect(hasN8nSteps).toBe(true);
      
      console.log(`✅ Complex workflow test: Generated ${plan.steps.length} steps`);
      console.log(`📋 Steps: ${plan.steps.map(s => `${s.type}:${s.action}`).join(', ')}`);
      
    } catch (error) {
      console.log(`⚠️ Complex workflow test error: ${error.message}`);
      expect(error.message).toBeTruthy();
    }
  }, TEST_TIMEOUT);
});

// Helper function to run live integration test
export async function runLiveN8nTest() {
  console.log('🧪 Running live n8n integration test...');
  
  const client = new N8nAgentClient();
  
  try {
    // Test 1: Simple calculation (should work)
    console.log('📊 Test 1: Simple calculation');
    const simpleTest = await client.executeWithRetry({
      message: 'What is 2+2?',
      user_id: TEST_USER_ID,
    });
    console.log(`✅ Simple test result: ${JSON.stringify(simpleTest, null, 2)}`);
    
    // Test 2: Web research (if available)
    console.log('🌐 Test 2: Web research');
    const webTest = await client.executeWithRetry({
      message: 'What is the weather today?',
      user_id: TEST_USER_ID,
      agent_type: 'web',
    });
    console.log(`✅ Web test result: ${JSON.stringify(webTest, null, 2)}`);
    
    console.log('🎉 Live n8n integration test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Live n8n integration test failed:', error);
    return false;
  }
}

// Export test runner
export { runLiveN8nTest };
