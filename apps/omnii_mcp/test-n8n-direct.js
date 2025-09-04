#!/usr/bin/env node

/**
 * Direct n8n Integration Test
 * 
 * Tests messages that should definitely route to n8n agents
 * with detailed logging to debug the routing logic
 */

const WebSocket = require('ws');

const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
const WEBSOCKET_URL = 'ws://localhost:8000/ws';

function testDirectN8nRouting() {
  console.log('🎯 Testing Direct n8n Routing...');
  console.log(`📡 WebSocket URL: ${WEBSOCKET_URL}`);
  console.log(`👤 Test User: ${TEST_USER_ID}`);
  console.log('');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WEBSOCKET_URL);
    let responseCount = 0;
    const allResponses = [];

    // Test messages that should DEFINITELY route to n8n
    const testMessages = [
      'Research the latest developments in artificial intelligence and machine learning',
      'Find YouTube videos about advanced React patterns and hooks',
      'What are the current trends in quantum computing research?',
      'Search for information about the latest TypeScript features and create a summary',
    ];

    let currentMessageIndex = 0;

    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      sendNextMessage();
    });

    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        responseCount++;
        allResponses.push(response);
        
        console.log(`📨 Response ${responseCount}:`);
        console.log(`   Type: ${response.type}`);
        console.log(`   Status: ${response.status || 'unknown'}`);
        console.log(`   Data keys: ${response.data ? Object.keys(response.data).join(', ') : 'none'}`);
        
        if (response.data?.message) {
          console.log(`   Message: "${response.data.message.substring(0, 100)}..."`);
        }
        
        if (response.data?.metadata) {
          console.log(`   Metadata keys: ${Object.keys(response.data.metadata).join(', ')}`);
          if (response.data.metadata.agent) {
            console.log(`   🤖 Agent: ${response.data.metadata.agent}`);
          }
          if (response.data.metadata.responseType) {
            console.log(`   📂 Response Type: ${response.data.metadata.responseType}`);
          }
        }
        
        if (response.data?.category) {
          console.log(`   📂 Category: ${response.data.category}`);
        }
        
        // Check if this looks like an n8n response
        const isN8nResponse = (
          response.data?.metadata?.agent ||
          response.data?.category?.includes('n8n') ||
          response.data?.category?.includes('web_research') ||
          response.data?.category?.includes('youtube_search') ||
          response.data?.metadata?.responseType === 'n8n_agent'
        );
        
        console.log(`   🎯 Is n8n Response: ${isN8nResponse ? 'YES' : 'NO'}`);
        console.log('');
        
        // Wait for potential follow-up messages
        setTimeout(() => {
          if (currentMessageIndex < testMessages.length) {
            sendNextMessage();
          } else {
            // All messages sent, wait a bit more for any final responses
            setTimeout(() => {
              ws.close();
            }, 5000);
          }
        }, 3000);
        
      } catch (error) {
        console.error('❌ Error parsing WebSocket response:', error);
        console.log('Raw response:', data.toString());
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
      console.log('');
      
      // Print summary
      console.log('📊 Test Summary:');
      console.log(`   📨 Total responses received: ${responseCount}`);
      console.log(`   📤 Messages sent: ${currentMessageIndex}`);
      
      const n8nResponses = allResponses.filter(r => 
        r.data?.metadata?.agent ||
        r.data?.category?.includes('n8n') ||
        r.data?.category?.includes('web_research') ||
        r.data?.category?.includes('youtube_search')
      );
      
      console.log(`   🤖 n8n responses: ${n8nResponses.length}`);
      console.log(`   💼 Executive responses: ${responseCount - n8nResponses.length}`);
      
      if (n8nResponses.length > 0) {
        console.log('🎉 n8n routing is working! Found agent responses.');
      } else {
        console.log('⚠️ No n8n responses detected. Check routing logic and complexity scoring.');
      }
      
      resolve(allResponses);
    });

    function sendNextMessage() {
      if (currentMessageIndex >= testMessages.length) {
        return;
      }

      const message = testMessages[currentMessageIndex];
      currentMessageIndex++;

      console.log(`📤 Sending message ${currentMessageIndex}/${testMessages.length}:`);
      console.log(`   "${message}"`);
      console.log('');

      const wsMessage = {
        type: 'command',
        payload: {
          commandType: 'text_command',
          message: message,
          userId: TEST_USER_ID,
          userTimezone: 'America/Los_Angeles',
        },
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(wsMessage));
    }

    // Timeout after 60 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('⏰ Test timeout after 60 seconds');
        ws.close();
      }
    }, 60000);
  });
}

// Run the test
testDirectN8nRouting().then((responses) => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
