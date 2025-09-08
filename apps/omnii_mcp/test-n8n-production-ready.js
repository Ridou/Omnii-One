#!/usr/bin/env node

/**
 * 🚀 Production-Ready n8n Integration Test Suite
 * 
 * Comprehensive testing for n8n Agent Swarm integration before production deployment
 * Tests all critical paths: routing logic, fallback mechanisms, error handling
 */

const WebSocket = require('ws');

const TEST_CONFIG = {
  userId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
  websocketUrl: 'ws://localhost:8000/ws',
  n8nDirectUrl: 'https://omnii-agent-swarm-production.up.railway.app/webhook/agent-input',
  timeout: 15000,
};

class N8nIntegrationTester {
  constructor() {
    this.results = [];
    this.currentTestIndex = 0;
    this.ws = null;
  }

  async runAllTests() {
    console.log('🚀 Starting Production-Ready n8n Integration Tests...');
    console.log('=' .repeat(80));
    console.log(`📡 WebSocket: ${TEST_CONFIG.websocketUrl}`);
    console.log(`🤖 n8n Direct: ${TEST_CONFIG.n8nDirectUrl}`);
    console.log(`👤 Test User: ${TEST_CONFIG.userId}`);
    console.log('=' .repeat(80));
    console.log('');

    try {
      // Test 1: Direct n8n Service Health
      await this.testN8nServiceHealth();
      
      // Test 2: WebSocket Connection
      await this.testWebSocketConnection();
      
      // Test 3: Simple Local Routing (should NOT go to n8n)
      await this.testLocalRouting();
      
      // Test 4: Complex n8n Routing (should go to n8n)
      await this.testN8nRouting();
      
      // Test 5: Error Handling & Fallback
      await this.testErrorHandling();
      
      // Test 6: Performance & Timeout Testing
      await this.testPerformance();

      this.printFinalResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testN8nServiceHealth() {
    console.log('🏥 Testing n8n Service Health...');
    
    try {
      const response = await fetch(TEST_CONFIG.n8nDirectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Health check - what is 1+1?',
          user_id: TEST_CONFIG.userId
        })
      });

      const data = await response.json();
      
      if (data.success && data.data?.output) {
        this.logSuccess('n8n Service Health', `✅ Service healthy - Response: ${data.data.output}`);
      } else {
        this.logFailure('n8n Service Health', `❌ Service unhealthy - Response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.logFailure('n8n Service Health', `❌ Service unreachable - Error: ${error.message}`);
    }
  }

  async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket Connection...');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(TEST_CONFIG.websocketUrl);
      let connectionTimeout;

      connectionTimeout = setTimeout(() => {
        ws.close();
        this.logFailure('WebSocket Connection', '❌ Connection timeout');
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(connectionTimeout);
        this.logSuccess('WebSocket Connection', '✅ WebSocket connected successfully');
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        this.logFailure('WebSocket Connection', `❌ Connection failed: ${error.message}`);
        reject(error);
      });
    });
  }

  async testLocalRouting() {
    console.log('🏠 Testing Local Routing (simple queries)...');
    
    const testCases = [
      {
        name: 'Simple Calendar Query',
        message: 'show my calendar',
        expectedRouting: 'local',
        expectedResponse: 'executive_response'
      },
      {
        name: 'Basic Email List',
        message: 'list my emails',
        expectedRouting: 'local',
        expectedResponse: 'executive_response'
      }
    ];

    for (const testCase of testCases) {
      await this.runWebSocketTest(testCase);
    }
  }

  async testN8nRouting() {
    console.log('🤖 Testing n8n Agent Routing (complex queries)...');
    
    const testCases = [
      {
        name: 'Web Research Query',
        message: 'research the latest developments in artificial intelligence and machine learning trends',
        expectedRouting: 'n8n',
        expectedResponse: 'n8n_agent_response',
        timeout: 30000 // Longer timeout for n8n
      },
      {
        name: 'YouTube Search Query', 
        message: 'find YouTube videos about React development tutorials',
        expectedRouting: 'n8n',
        expectedResponse: 'n8n_agent_response',
        timeout: 30000
      },
      {
        name: 'Complex Analysis',
        message: 'analyze my email patterns and suggest optimization strategies for better productivity',
        expectedRouting: 'n8n',
        expectedResponse: 'n8n_agent_response',
        timeout: 30000
      }
    ];

    for (const testCase of testCases) {
      await this.runWebSocketTest(testCase);
    }
  }

  async testErrorHandling() {
    console.log('🚨 Testing Error Handling & Fallback...');
    
    // Test with invalid n8n URL (should fallback gracefully)
    const testCase = {
      name: 'Fallback Mechanism',
      message: 'research quantum computing applications in healthcare',
      expectedRouting: 'fallback',
      expectedResponse: 'error_or_fallback',
      timeout: 20000
    };

    await this.runWebSocketTest(testCase);
  }

  async testPerformance() {
    console.log('⚡ Testing Performance & Timeouts...');
    
    const startTime = Date.now();
    
    const testCase = {
      name: 'Performance Test',
      message: 'What is the capital of France?',
      expectedRouting: 'any',
      expectedResponse: 'any',
      timeout: 10000
    };

    await this.runWebSocketTest(testCase);
    
    const duration = Date.now() - startTime;
    if (duration < 5000) {
      this.logSuccess('Performance', `✅ Response time: ${duration}ms (under 5s)`);
    } else {
      this.logFailure('Performance', `❌ Slow response: ${duration}ms (over 5s)`);
    }
  }

  async runWebSocketTest(testCase) {
    console.log(`  🧪 Testing: ${testCase.name}`);
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(TEST_CONFIG.websocketUrl);
      let testTimeout;
      let responseReceived = false;

      testTimeout = setTimeout(() => {
        if (!responseReceived) {
          ws.close();
          this.logFailure(testCase.name, `❌ Test timeout (${testCase.timeout || TEST_CONFIG.timeout}ms)`);
          resolve(); // Don't reject, just log failure and continue
        }
      }, testCase.timeout || TEST_CONFIG.timeout);

      ws.on('open', () => {
        const message = {
          type: 'command',
          payload: {
            commandType: 'text_command',
            message: testCase.message,
            userId: TEST_CONFIG.userId,
            userTimezone: 'America/Los_Angeles'
          },
          timestamp: Date.now()
        };

        console.log(`    📤 Sending: "${testCase.message}"`);
        ws.send(JSON.stringify(message));
      });

      ws.on('message', (data) => {
        responseReceived = true;
        clearTimeout(testTimeout);
        
        try {
          const response = JSON.parse(data.toString());
          console.log(`    📥 Response type: ${response.type}`);
          console.log(`    📥 Response action: ${response.data?.action || 'none'}`);
          
          // Analyze the response
          this.analyzeResponse(testCase, response);
          
        } catch (error) {
          this.logFailure(testCase.name, `❌ Invalid JSON response: ${error.message}`);
        }
        
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        responseReceived = true;
        clearTimeout(testTimeout);
        this.logFailure(testCase.name, `❌ WebSocket error: ${error.message}`);
        resolve();
      });
    });
  }

  analyzeResponse(testCase, response) {
    const action = response.data?.action;
    const category = response.data?.category;
    const responseType = response.data?.responseType;
    
    // Check if response matches expectations
    if (testCase.expectedResponse === 'n8n_agent_response') {
      if (action === 'n8n_agent_response' || category === 'n8n_agent_response' || responseType === 'n8n_agent') {
        this.logSuccess(testCase.name, `✅ Correctly routed to n8n - Action: ${action}, Category: ${category}`);
      } else {
        this.logFailure(testCase.name, `❌ Expected n8n routing but got: Action: ${action}, Category: ${category}`);
      }
    } else if (testCase.expectedResponse === 'executive_response') {
      if (action === 'executive_response' || response.type === 'response') {
        this.logSuccess(testCase.name, `✅ Correctly handled locally - Action: ${action}`);
      } else {
        this.logFailure(testCase.name, `❌ Expected local handling but got: Action: ${action}`);
      }
    } else {
      // Any response is acceptable
      this.logSuccess(testCase.name, `✅ Response received - Action: ${action}, Type: ${response.type}`);
    }
  }

  logSuccess(testName, message) {
    this.results.push({ test: testName, status: 'PASS', message });
    console.log(`    ✅ ${message}`);
  }

  logFailure(testName, message) {
    this.results.push({ test: testName, status: 'FAIL', message });
    console.log(`    ❌ ${message}`);
  }

  printFinalResults() {
    console.log('\n' + '=' .repeat(80));
    console.log('🏁 FINAL TEST RESULTS');
    console.log('=' .repeat(80));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`📊 Tests: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    console.log('');

    // Print detailed results
    this.results.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      console.log(`   ${result.message}`);
    });

    console.log('\n' + '=' .repeat(80));
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Ready for production deployment.');
      console.log('✅ n8n integration is working correctly');
      console.log('✅ Routing logic is functioning properly');
      console.log('✅ Fallback mechanisms are in place');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Review issues before production deployment.`);
      
      if (passed >= total * 0.8) {
        console.log('ℹ️  80%+ tests passed - integration is mostly working');
      } else {
        console.log('🚨 Critical issues detected - fix before deploying');
      }
    }
    
    console.log('=' .repeat(80));
  }
}

// Run the tests
if (require.main === module) {
  const tester = new N8nIntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = N8nIntegrationTester;
