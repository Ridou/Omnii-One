#!/usr/bin/env node

/**
 * 🔍 Debug Current Chat System
 * 
 * Simple WebSocket test to understand why chat shortcuts and responses aren't working
 */

const WebSocket = require('ws');

const TEST_CONFIG = {
  websocketUrl: 'ws://localhost:8000/ws',
  userId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
  timeout: 15000,
};

class ChatDebugger {
  constructor() {
    this.messageCount = 0;
  }

  async debugCurrentChat() {
    console.log('🔍 Debugging Current Chat System...');
    console.log('=' .repeat(60));
    console.log(`📡 WebSocket URL: ${TEST_CONFIG.websocketUrl}`);
    console.log(`👤 User ID: ${TEST_CONFIG.userId}`);
    console.log('=' .repeat(60));
    console.log('');

    // Test different types of messages to see what's broken
    const testMessages = [
      {
        name: 'Simple Calendar Request',
        message: 'show my calendar',
        expectedResponse: 'Should get calendar data or executive response'
      },
      {
        name: 'Simple Email Request', 
        message: 'list my emails',
        expectedResponse: 'Should get email list or executive response'
      },
      {
        name: 'Chat Shortcut Test',
        message: 'help',
        expectedResponse: 'Should show available commands'
      }
    ];

    for (const test of testMessages) {
      console.log(`\n🧪 Testing: ${test.name}`);
      console.log(`💬 Message: "${test.message}"`);
      console.log(`🎯 Expected: ${test.expectedResponse}`);
      
      await this.testSingleMessage(test.message);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async testSingleMessage(message) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(TEST_CONFIG.websocketUrl);
      let responseReceived = false;
      let messageTimeout;

      messageTimeout = setTimeout(() => {
        if (!responseReceived) {
          console.log('⏰ TIMEOUT: No response received within 15 seconds');
          ws.close();
          resolve();
        }
      }, TEST_CONFIG.timeout);

      ws.on('open', () => {
        console.log('🔌 WebSocket connected');
        
        const testMessage = {
          type: 'command',
          payload: {
            commandType: 'text_command',
            message: message,
            userId: TEST_CONFIG.userId,
            userTimezone: 'America/Los_Angeles'
          },
          timestamp: Date.now()
        };

        console.log('📤 Sending message:', JSON.stringify(testMessage, null, 2));
        ws.send(JSON.stringify(testMessage));
      });

      ws.on('message', (data) => {
        responseReceived = true;
        clearTimeout(messageTimeout);
        
        try {
          const response = JSON.parse(data.toString());
          console.log('📥 RESPONSE RECEIVED:');
          console.log('  Type:', response.type);
          console.log('  Status:', response.status);
          console.log('  Action:', response.data?.action);
          console.log('  Category:', response.data?.category);
          console.log('  Message preview:', response.data?.message?.substring(0, 100) || 'No message');
          console.log('  Full response:', JSON.stringify(response, null, 2));
          
          // Check if this looks like a proper response
          if (response.type && response.data) {
            console.log('✅ VALID RESPONSE FORMAT');
          } else {
            console.log('❌ INVALID RESPONSE FORMAT');
          }
          
        } catch (error) {
          console.log('❌ INVALID JSON RESPONSE:', data.toString());
        }
        
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        responseReceived = true;
        clearTimeout(messageTimeout);
        console.log('❌ WebSocket error:', error.message);
        resolve();
      });

      ws.on('close', (code, reason) => {
        if (!responseReceived) {
          console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
        }
      });
    });
  }
}

// Check if server is running first
const checkServer = async () => {
  try {
    const response = await fetch('http://localhost:8000/health');
    if (response.ok) {
      console.log('✅ Server is running, starting chat debug...\n');
      
      const chatDebugger = new ChatDebugger();
      await chatDebugger.debugCurrentChat();
    } else {
      console.log('❌ Server is not responding properly');
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start it first with: bun run dev');
    console.log('Error:', error.message);
  }
};

checkServer().catch(console.error);
