#!/usr/bin/env node

/**
 * Single Message Test
 * Tests one message and shows detailed routing logs
 */

const WebSocket = require('ws');

const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
const WEBSOCKET_URL = 'ws://localhost:8000/ws';

async function testSingleMessage() {
  console.log('🎯 Testing Single Message with n8n Routing...');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WEBSOCKET_URL);
    let responseCount = 0;
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      console.log('📤 Sending research message...');
      
      // Send a message that should definitely route to n8n
      const message = {
        type: 'command',
        payload: {
          commandType: 'text_command',
          message: 'research artificial intelligence trends and developments',
          userId: TEST_USER_ID,
          userTimezone: 'America/Los_Angeles',
        },
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(message));
      console.log('📤 Message sent, waiting for responses...');
    });

    ws.on('message', (data) => {
      try {
        responseCount++;
        const response = JSON.parse(data.toString());
        
        console.log(`📨 Response ${responseCount}:`);
        console.log('   Raw response:', JSON.stringify(response, null, 2));
        console.log('');
        
        // Keep connection open for follow-up messages
        if (responseCount >= 3) {
          console.log('📊 Received multiple responses, closing connection');
          ws.close();
        }
        
      } catch (error) {
        console.error('❌ Error parsing response:', error);
        console.log('Raw data:', data.toString());
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket closed');
      console.log(`📊 Total responses received: ${responseCount}`);
      resolve(responseCount);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('⏰ Timeout after 30 seconds, closing connection');
        ws.close();
      }
    }, 30000);
  });
}

testSingleMessage().then(() => {
  console.log('✅ Test completed');
}).catch((error) => {
  console.error('❌ Test failed:', error);
});
