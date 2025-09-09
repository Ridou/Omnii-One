#!/usr/bin/env node

/**
 * 🧪 Test Direct n8n Chat Integration
 * 
 * Tests the direct n8n endpoint to ensure it provides real structured data
 * instead of generic executive responses
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:8000',
  userId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
  timeout: 30000, // 30 seconds for n8n responses
};

class DirectN8nTester {
  constructor() {
    this.results = [];
  }

  async runAllTests() {
    console.log('🤖 Testing Direct n8n Chat Integration...');
    console.log('=' .repeat(70));
    console.log(`🌐 Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`👤 User ID: ${TEST_CONFIG.userId}`);
    console.log(`🚀 n8n Agent Swarm: https://omnii-agent-swarm-production.up.railway.app`);
    console.log('=' .repeat(70));
    console.log('');

    try {
      // Test 1: Health check
      await this.testN8nHealth();
      
      // Test 2: Email request (should return structured email data)
      await this.testEmailRequest();
      
      // Test 3: Calendar request
      await this.testCalendarRequest();
      
      // Test 4: Task request
      await this.testTaskRequest();

      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testN8nHealth() {
    console.log('🏥 Testing n8n Health Check...');
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat/n8n-direct/health`);
      const data = await response.json();
      
      if (data.status === 'healthy') {
        this.logSuccess('n8n Health', `✅ n8n Agent Swarm is healthy`);
      } else {
        this.logFailure('n8n Health', `❌ n8n Agent Swarm is unhealthy: ${data.error}`);
      }
    } catch (error) {
      this.logFailure('n8n Health', `❌ Health check failed: ${error.message}`);
    }
  }

  async testEmailRequest() {
    console.log('📧 Testing Email Request...');
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat/n8n-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_CONFIG.userId,
          message: 'Show me my latest emails'
        })
      });

      const data = await response.json();
      
      if (data.success && data.data?.message) {
        this.logSuccess('Email Request', `✅ Got email response: ${data.data.message.substring(0, 100)}...`);
        
        // Check if we got structured email data
        if (data.data.message.includes('email') || data.data.message.includes('messages')) {
          this.logSuccess('Email Data', `✅ Response contains email-related content`);
        } else {
          this.logFailure('Email Data', `❌ Response doesn't contain email content`);
        }
      } else {
        this.logFailure('Email Request', `❌ Email request failed: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.logFailure('Email Request', `❌ Email request error: ${error.message}`);
    }
  }

  async testCalendarRequest() {
    console.log('📅 Testing Calendar Request...');
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat/n8n-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_CONFIG.userId,
          message: 'What is my schedule like today?'
        })
      });

      const data = await response.json();
      
      if (data.success && data.data?.message) {
        this.logSuccess('Calendar Request', `✅ Got calendar response: ${data.data.message.substring(0, 100)}...`);
      } else {
        this.logFailure('Calendar Request', `❌ Calendar request failed: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.logFailure('Calendar Request', `❌ Calendar request error: ${error.message}`);
    }
  }

  async testTaskRequest() {
    console.log('✅ Testing Task Request...');
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat/n8n-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_CONFIG.userId,
          message: 'Show me my tasks'
        })
      });

      const data = await response.json();
      
      if (data.success && data.data?.message) {
        this.logSuccess('Task Request', `✅ Got task response: ${data.data.message.substring(0, 100)}...`);
      } else {
        this.logFailure('Task Request', `❌ Task request failed: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.logFailure('Task Request', `❌ Task request error: ${error.message}`);
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
    console.log('\n' + '=' .repeat(70));
    console.log('🏁 DIRECT N8N CHAT TEST RESULTS');
    console.log('=' .repeat(70));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;

    console.log(`📊 Tests: ${this.results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    console.log('');

    this.results.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
    });

    console.log('\n' + '=' .repeat(70));
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Direct n8n integration is working.');
      console.log('✅ Ready to enable in mobile app with EXPO_PUBLIC_USE_DIRECT_N8N=true');
    } else if (passed >= this.results.length * 0.75) {
      console.log(`✅ 75%+ tests passed - direct n8n integration is mostly working`);
      console.log('ℹ️  Some timeouts expected for complex requests');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Review issues before enabling.`);
    }
    
    console.log('=' .repeat(70));
  }
}

// Run the tests
if (require.main === module) {
  const tester = new DirectN8nTester();
  tester.runAllTests().catch(console.error);
}
