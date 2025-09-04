#!/usr/bin/env node

/**
 * n8n Agent Integration Test Script
 * 
 * Simple test script to verify n8n Agent Swarm integration
 * Can be run independently to test the live n8n service
 */

const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
const N8N_WEBHOOK_URL = 'https://omnii-agent-swarm-production.up.railway.app/webhook/agent-input';

async function testN8nAgentSwarm() {
  console.log('🤖 Testing n8n Agent Swarm Integration...');
  console.log(`📡 Endpoint: ${N8N_WEBHOOK_URL}`);
  console.log(`👤 Test User: ${TEST_USER_ID}`);
  console.log('');

  const tests = [
    {
      name: 'Simple Calculation',
      message: 'What is 2+2?',
      agent_type: 'auto',
      expectedAgent: 'Web Agent',
      timeout: 10000,
    },
    {
      name: 'Web Research',
      message: 'What is the weather in San Francisco today?',
      agent_type: 'web',
      expectedAgent: 'Web Agent',
      timeout: 15000,
    },
    {
      name: 'YouTube Search',
      message: 'Find YouTube videos about JavaScript async/await',
      agent_type: 'youtube',
      expectedAgent: 'YouTube Agent',
      timeout: 15000,
    },
    {
      name: 'Email Query',
      message: 'Show me my latest 3 emails',
      agent_type: 'email',
      expectedAgent: 'Email Agent',
      timeout: 20000,
    },
    {
      name: 'Calendar Query',
      message: 'What is on my calendar today?',
      agent_type: 'calendar',
      expectedAgent: 'Calendar Agent',
      timeout: 15000,
    },
    {
      name: 'Complex Workflow',
      message: 'Research the latest TypeScript features and create a summary',
      agent_type: 'auto',
      expectedAgent: 'Web Agent',
      timeout: 30000,
    },
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    console.log(`🧪 Running test: ${test.name}`);
    console.log(`   Message: "${test.message}"`);
    console.log(`   Agent: ${test.agent_type}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'omnii-mcp-test/1.0.0',
        },
        body: JSON.stringify({
          message: test.message,
          user_id: TEST_USER_ID,
          agent_type: test.agent_type,
          context: {
            userTimezone: 'America/Los_Angeles',
            source: 'integration-test',
          },
          metadata: {
            requestId: `test-${Date.now()}`,
            priority: 'normal',
          }
        }),
        signal: AbortSignal.timeout(test.timeout),
      });

      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`   ✅ Success in ${executionTime}ms`);
      console.log(`   🤖 Agent: ${result.agent}`);
      console.log(`   ⚡ Action: ${result.action}`);
      console.log(`   ⏱️ Execution: ${result.execution_time}`);
      
      if (result.agent === test.expectedAgent) {
        console.log(`   🎯 Expected agent matched!`);
      } else {
        console.log(`   ⚠️ Expected ${test.expectedAgent}, got ${result.agent}`);
      }
      
      // Show result preview
      if (result.result && typeof result.result === 'object') {
        if (result.result.results) {
          console.log(`   📊 Found ${result.result.results.length} web results`);
        } else if (result.result.videos) {
          console.log(`   🎥 Found ${result.result.videos.length} videos`);
        } else if (result.result.messageId) {
          console.log(`   📧 Email ID: ${result.result.messageId}`);
        } else if (result.result.eventId) {
          console.log(`   📅 Event ID: ${result.result.eventId}`);
        } else {
          console.log(`   📄 Result: ${JSON.stringify(result.result).substring(0, 100)}...`);
        }
      } else {
        console.log(`   📄 Result: ${result.result}`);
      }
      
      passedTests++;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      
      if (error.name === 'TimeoutError') {
        console.log(`   ⏰ Test timed out after ${test.timeout}ms`);
      } else if (error.message.includes('401') || error.message.includes('403')) {
        console.log(`   🔐 Authentication error - user may need to reconnect Google account`);
      } else if (error.message.includes('429')) {
        console.log(`   🚦 Rate limit exceeded - too many requests`);
      } else {
        console.log(`   🔍 Error details: ${error.stack?.split('\n')[0] || error.message}`);
      }
    }
    
    console.log('');
  }

  // Test Summary
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`   ❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  console.log(`   📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('');

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! n8n Agent Swarm integration is working correctly.');
  } else if (passedTests > 0) {
    console.log('⚠️ Some tests passed. n8n Agent Swarm is partially working.');
    console.log('   This may be expected if some agents are temporarily unavailable.');
  } else {
    console.log('❌ All tests failed. Check n8n Agent Swarm service status.');
    console.log('   Verify the service is running at: https://omnii-agent-swarm-production.up.railway.app');
  }

  return passedTests === totalTests;
}

// Health check function
async function checkN8nHealth() {
  console.log('💚 Checking n8n Agent Swarm health...');
  
  try {
    const response = await fetch(`${N8N_WEBHOOK_URL.replace('/webhook/agent-input', '/healthz')}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      console.log('✅ n8n service is healthy');
      return true;
    } else {
      console.log(`❌ n8n service health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ n8n service health check error: ${error.message}`);
    return false;
  }
}

// Quick test function
async function quickTest() {
  console.log('⚡ Running quick n8n test...');
  
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is 2+2?',
        user_id: TEST_USER_ID,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('✅ Quick test passed!');
    console.log(`🤖 Agent: ${result.agent}`);
    console.log(`⚡ Action: ${result.action}`);
    console.log(`📄 Result: ${result.result}`);
    console.log(`⏱️ Time: ${result.execution_time}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Quick test failed: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';

  console.log('🤖 n8n Agent Swarm Integration Test');
  console.log('=====================================');
  console.log('');

  switch (command) {
    case 'health':
      await checkN8nHealth();
      break;
      
    case 'quick':
      await quickTest();
      break;
      
    case 'full':
    default:
      const healthOk = await checkN8nHealth();
      console.log('');
      
      if (healthOk) {
        await testN8nAgentSwarm();
      } else {
        console.log('⚠️ Skipping full tests due to health check failure');
        console.log('🔧 Try running: node test-n8n-integration.js quick');
      }
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test script error:', error);
    process.exit(1);
  });
}

module.exports = {
  testN8nAgentSwarm,
  checkN8nHealth,
  quickTest,
  runLiveN8nTest: testN8nAgentSwarm,
};
