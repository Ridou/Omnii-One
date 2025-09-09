#!/usr/bin/env node

/**
 * 🧪 HTTP Chat Implementation Test
 * 
 * Tests the new HTTP + SSE chat system to ensure it works correctly
 * before enabling it in the mobile app
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:8000',
  userId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
  timeout: 10000,
};

class HttpChatTester {
  constructor() {
    this.results = [];
  }

  async runAllTests() {
    console.log('🧪 Testing HTTP Chat Implementation...');
    console.log('=' .repeat(60));
    console.log(`🌐 Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`👤 Test User: ${TEST_CONFIG.userId}`);
    console.log('=' .repeat(60));
    console.log('');

    try {
      // Test 1: Send message endpoint
      await this.testSendMessage();
      
      // Test 2: Chat history endpoint  
      await this.testChatHistory();
      
      // Test 3: Server-Sent Events stream
      await this.testSSEStream();
      
      // Test 4: n8n webhook endpoints
      await this.testN8nWebhooks();

      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testSendMessage() {
    console.log('📤 Testing Send Message Endpoint...');
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_CONFIG.userId,
          message: 'Hello HTTP chat system!',
          sessionId: 'test-session-123'
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        this.logSuccess('Send Message', `✅ Message sent successfully - Session: ${data.sessionId}`);
      } else {
        this.logFailure('Send Message', `❌ Send failed - ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.logFailure('Send Message', `❌ Request failed - ${error.message}`);
    }
  }

  async testChatHistory() {
    console.log('📚 Testing Chat History Endpoint...');
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat/history/${TEST_CONFIG.userId}`);
      const data = await response.json();
      
      if (response.ok && Array.isArray(data.messages)) {
        this.logSuccess('Chat History', `✅ History loaded - ${data.messages.length} messages`);
      } else {
        this.logFailure('Chat History', `❌ History failed - ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.logFailure('Chat History', `❌ Request failed - ${error.message}`);
    }
  }

  async testSSEStream() {
    console.log('📡 Testing Server-Sent Events Stream...');
    
    return new Promise((resolve) => {
      try {
        const eventSource = new EventSource(`${TEST_CONFIG.baseUrl}/api/chat/stream/test-session-123`);
        let messageReceived = false;

        const timeout = setTimeout(() => {
          if (!messageReceived) {
            eventSource.close();
            this.logFailure('SSE Stream', '❌ No SSE messages received within timeout');
          }
          resolve();
        }, 5000);

        eventSource.onopen = () => {
          this.logSuccess('SSE Stream', '✅ SSE connection opened successfully');
        };

        eventSource.onmessage = (event) => {
          messageReceived = true;
          clearTimeout(timeout);
          
          try {
            const data = JSON.parse(event.data);
            this.logSuccess('SSE Stream', `✅ SSE message received - Type: ${data.type}`);
          } catch {
            this.logSuccess('SSE Stream', '✅ SSE message received (raw)');
          }
          
          eventSource.close();
          resolve();
        };

        eventSource.onerror = () => {
          clearTimeout(timeout);
          this.logFailure('SSE Stream', '❌ SSE connection error');
          resolve();
        };

      } catch (error) {
        this.logFailure('SSE Stream', `❌ SSE setup failed - ${error.message}`);
        resolve();
      }
    });
  }

  async testN8nWebhooks() {
    console.log('🤖 Testing n8n Webhook Endpoints...');
    
    try {
      // Test progress webhook
      const progressResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/n8n/progress/test-session-123`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session-123',
          progress: 50,
          message: 'Processing your request...',
          userId: TEST_CONFIG.userId
        })
      });

      if (progressResponse.ok) {
        this.logSuccess('n8n Progress Webhook', '✅ Progress webhook working');
      } else {
        this.logFailure('n8n Progress Webhook', '❌ Progress webhook failed');
      }

      // Test response webhook
      const responseWebhook = await fetch(`${TEST_CONFIG.baseUrl}/api/n8n/response/test-session-123`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session-123',
          userId: TEST_CONFIG.userId,
          response: 'Test response from n8n agent',
          status: 'success',
          agentType: 'web_research'
        })
      });

      if (responseWebhook.ok) {
        this.logSuccess('n8n Response Webhook', '✅ Response webhook working');
      } else {
        this.logFailure('n8n Response Webhook', '❌ Response webhook failed');
      }

    } catch (error) {
      this.logFailure('n8n Webhooks', `❌ Webhook test failed - ${error.message}`);
    }
  }

  logSuccess(testName, message) {
    this.results.push({ test: testName, status: 'PASS', message });
    console.log(`  ${message}`);
  }

  logFailure(testName, message) {
    this.results.push({ test: testName, status: 'FAIL', message });
    console.log(`  ${message}`);
  }

  printResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 HTTP CHAT TEST RESULTS');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;

    console.log(`📊 Tests: ${this.results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    console.log('');

    this.results.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
    });

    console.log('\n' + '=' .repeat(60));
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! HTTP chat system is ready.');
      console.log('✅ Ready to enable HTTP mode in mobile app');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Fix issues before enabling HTTP mode.`);
    }
    
    console.log('=' .repeat(60));
  }
}

// Run the tests
if (require.main === module) {
  // Check if EventSource is available (Node.js doesn't have it by default)
  if (typeof EventSource === 'undefined') {
    global.EventSource = require('eventsource');
  }
  
  const tester = new HttpChatTester();
  tester.runAllTests().catch(console.error);
}
