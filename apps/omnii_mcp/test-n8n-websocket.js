#!/usr/bin/env node

/**
 * n8n WebSocket Integration Test
 * 
 * Tests the complete WebSocket flow with n8n agent integration
 * Simulates mobile app WebSocket connection and message flow
 */

const WebSocket = require('ws');

const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
const WEBSOCKET_URL = 'ws://localhost:8000/ws';

async function testWebSocketN8nIntegration() {
  console.log('🔌 Testing WebSocket n8n Integration...');
  console.log(`📡 WebSocket URL: ${WEBSOCKET_URL}`);
  console.log(`👤 Test User: ${TEST_USER_ID}`);
  console.log('');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WEBSOCKET_URL);
    let testResults = [];
    let currentTest = 0;

    const tests = [
      {
        name: 'Simple Local Operation',
        message: 'List my emails from today',
        expectedRouting: 'local',
        timeout: 5000,
      },
      {
        name: 'Web Research (n8n)',
        message: 'Research the latest AI developments in 2024',
        expectedRouting: 'n8n',
        timeout: 30000,
      },
      {
        name: 'YouTube Search (n8n)',
        message: 'Find YouTube videos about React performance optimization',
        expectedRouting: 'n8n',
        timeout: 20000,
      },
      {
        name: 'Complex Workflow (n8n)',
        message: 'Research TypeScript 5.0 features and send a summary to my team',
        expectedRouting: 'n8n',
        timeout: 45000,
      },
    ];

    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      runNextTest();
    });

    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        console.log(`📨 Received response:`, JSON.stringify(response, null, 2));
        
        // Analyze response to determine if it came from n8n or local system
        const isN8nResponse = (
          response.data?.metadata?.agent ||
          response.data?.category?.includes('n8n') ||
          response.data?.category?.includes('web_research') ||
          response.data?.category?.includes('youtube_search') ||
          response.data?.metadata?.responseType === 'n8n_agent'
        );

        const currentTestConfig = tests[currentTest - 1];
        if (currentTestConfig) {
          const result = {
            testName: currentTestConfig.name,
            expectedRouting: currentTestConfig.expectedRouting,
            actualRouting: isN8nResponse ? 'n8n' : 'local',
            success: response.status === 'success',
            agent: response.data?.metadata?.agent || 'local',
            category: response.data?.category || 'general',
            message: response.data?.message || response.data?.content,
          };

          testResults.push(result);
          
          console.log(`   🎯 Routing: ${result.actualRouting} (expected: ${result.expectedRouting})`);
          console.log(`   🤖 Agent: ${result.agent}`);
          console.log(`   📂 Category: ${result.category}`);
          console.log(`   ${result.success ? '✅' : '❌'} ${result.success ? 'Success' : 'Failed'}`);
          console.log('');
        }

        // Run next test
        setTimeout(runNextTest, 2000);
        
      } catch (error) {
        console.error('❌ Error parsing WebSocket response:', error);
        runNextTest();
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
      
      // Print test summary
      printTestSummary();
      resolve(testResults);
    });

    function runNextTest() {
      if (currentTest >= tests.length) {
        ws.close();
        return;
      }

      const test = tests[currentTest];
      currentTest++;

      console.log(`🧪 Test ${currentTest}/${tests.length}: ${test.name}`);
      console.log(`   Message: "${test.message}"`);

      const wsMessage = {
        type: 'command',
        payload: {
          commandType: 'text_command',
          message: test.message,
          userId: TEST_USER_ID,
          userTimezone: 'America/Los_Angeles',
        },
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(wsMessage));

      // Set timeout for test
      setTimeout(() => {
        if (currentTest <= tests.length) {
          console.log(`   ⏰ Test ${currentTest} timed out after ${test.timeout}ms`);
          testResults.push({
            testName: test.name,
            expectedRouting: test.expectedRouting,
            actualRouting: 'timeout',
            success: false,
            agent: 'timeout',
            category: 'timeout',
            message: 'Test timed out',
          });
          runNextTest();
        }
      }, test.timeout);
    }

    function printTestSummary() {
      console.log('📊 WebSocket n8n Integration Test Summary');
      console.log('==========================================');
      
      let passed = 0;
      let failed = 0;
      let correctRouting = 0;

      testResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.testName}`);
        console.log(`   Routing: ${result.actualRouting} (expected: ${result.expectedRouting})`);
        console.log(`   Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
        console.log(`   Agent: ${result.agent}`);
        
        if (result.success) passed++;
        else failed++;
        
        if (result.actualRouting === result.expectedRouting) correctRouting++;
        
        console.log('');
      });

      console.log(`📈 Results:`);
      console.log(`   ✅ Passed: ${passed}/${testResults.length}`);
      console.log(`   ❌ Failed: ${failed}/${testResults.length}`);
      console.log(`   🎯 Correct Routing: ${correctRouting}/${testResults.length}`);
      console.log(`   📊 Success Rate: ${Math.round((passed / testResults.length) * 100)}%`);
      console.log(`   🎯 Routing Accuracy: ${Math.round((correctRouting / testResults.length) * 100)}%`);
      
      if (passed === testResults.length && correctRouting === testResults.length) {
        console.log('🎉 All tests passed with correct routing! Integration is working perfectly.');
      } else if (passed > 0) {
        console.log('⚠️ Partial success. Some tests passed but routing may need adjustment.');
      } else {
        console.log('❌ All tests failed. Check WebSocket server and n8n service status.');
      }
    }

    // Start testing after connection
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('❌ WebSocket failed to connect within 5 seconds');
        reject(new Error('WebSocket connection timeout'));
      }
    }, 5000);
  });
}

async function quickWebSocketTest() {
  console.log('⚡ Running quick WebSocket test...');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WEBSOCKET_URL);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      
      const testMessage = {
        type: 'command',
        payload: {
          commandType: 'text_command',
          message: 'What is 2+2?',
          userId: TEST_USER_ID,
          userTimezone: 'America/Los_Angeles',
        },
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(testMessage));
    });

    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        console.log('✅ Received response:', response.data?.message || response.data?.content);
        ws.close();
        resolve(response);
      } catch (error) {
        console.error('❌ Error parsing response:', error);
        reject(error);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        reject(new Error('Quick test timeout'));
      }
    }, 10000);
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';

  console.log('🔌 WebSocket n8n Integration Test');
  console.log('==================================');
  console.log('');

  try {
    switch (command) {
      case 'quick':
        await quickWebSocketTest();
        break;
        
      case 'full':
      default:
        await testWebSocketN8nIntegration();
        break;
    }
    
    console.log('🎉 WebSocket test completed successfully!');
  } catch (error) {
    console.error('💥 WebSocket test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testWebSocketN8nIntegration,
  quickWebSocketTest,
};
