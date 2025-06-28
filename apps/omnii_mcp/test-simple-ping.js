const WebSocket = require('ws');

console.log('🧪 Testing simple ping to local WebSocket...');

const ws = new WebSocket('ws://localhost:8000/ws?userId=cd9bdc60-35af-4bb6-b87e-1932e96fb354');

ws.on('open', function open() {
  console.log('✅ Connected to local WebSocket server');
  
  // Send a simple ping first
  console.log('📤 Sending simple ping...');
  ws.send(JSON.stringify({
    type: 'ping',
    timestamp: Date.now()
  }));
});

ws.on('message', function message(data) {
  console.log('📨 Response received:', data.toString());
  
  // Now try the complex message
  console.log('📤 Now sending complex message...');
  ws.send(JSON.stringify({
    type: 'command',
    payload: {
      command: 'send_message',
      message: 'shoot an email to Richard Santin asking what he\'s doing today',
      userId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
      timestamp: Date.now()
    }
  }));
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket Error:', err.message);
});

ws.on('close', function close() {
  console.log('🔚 Connection closed');
  process.exit(0);
});

// Timeout after 10 seconds  
setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
  process.exit(0);
}, 10000);
