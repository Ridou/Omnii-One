#!/usr/bin/env node

/**
 * Test WebSocket Chat Connection
 * Simple test to verify WebSocket is working
 */

const WebSocket = require('ws');

// Configuration
const USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
const WS_URL = `ws://localhost:8000/ws?userId=${USER_ID}`;

console.log('🔌 Testing WebSocket Connection');
console.log('==============================');
console.log(`URL: ${WS_URL}`);
console.log('');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('');
  console.log('📤 Sending test message...');
  
  const message = {
    type: 'command',
    payload: {
      commandType: 'text_command',
      message: "What's my schedule like today?",
      userId: USER_ID,
      userTimezone: 'America/Los_Angeles'
    },
    timestamp: Date.now()
  };
  
  ws.send(JSON.stringify(message));
});

ws.on('message', (data) => {
  try {
    const response = JSON.parse(data.toString());
    console.log('📨 Received response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('📨 Raw response:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('');
  console.log('🔌 WebSocket disconnected');
});

// Close after 10 seconds
setTimeout(() => {
  console.log('');
  console.log('⏰ Test complete, closing connection...');
  ws.close();
}, 10000);
