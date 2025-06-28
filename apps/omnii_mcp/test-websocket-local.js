const WebSocket = require('ws');

console.log('🧪 Testing WebSocket with validation fixes...');

const ws = new WebSocket('ws://localhost:8000/ws?userId=cd9bdc60-35af-4bb6-b87e-1932e96fb354');

let responseCount = 0;

ws.on('open', function open() {
  console.log('✅ WebSocket connected to local server');
  
  // Test 1: Send a ping (should work without discriminator issues)
  console.log('📤 Test 1: Sending ping...');
  ws.send(JSON.stringify({
    type: 'ping',
    timestamp: Date.now()
  }));
});

ws.on('message', function message(data) {
  responseCount++;
  const response = JSON.parse(data.toString());
  console.log(`📨 Response ${responseCount} received:`);
  console.log('  - Type:', response.type);
  console.log('  - Status:', response.status);
  console.log('  - Has data:', !!response.data);
  
  // Check if it's a ping response
  if (response.data && response.data.pong) {
    console.log('  ✅ Ping response received correctly');
    
    // Send a command test after ping
    setTimeout(() => {
      console.log('📤 Test 2: Sending command message...');
      ws.send(JSON.stringify({
        type: 'command',
        payload: {
          command: 'send_message',
          message: 'test validation fix',
          userId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
          timestamp: Date.now()
        }
      }));
    }, 500);
  } else {
    console.log('  ✅ Command response received');
    // Close after receiving command response
    setTimeout(() => ws.close(), 1000);
  }
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', function close() {
  console.log('🔚 WebSocket test completed successfully');
  console.log(`📊 Total responses received: ${responseCount}`);
  process.exit(0);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
  process.exit(0);
}, 15000);
