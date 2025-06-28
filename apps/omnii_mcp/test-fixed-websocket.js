const WebSocket = require('ws');

console.log('🧪 Testing WebSocket with double-wrapping fix...');

const ws = new WebSocket('ws://localhost:8000/ws?userId=cd9bdc60-35af-4bb6-b87e-1932e96fb354');

ws.on('open', function open() {
  console.log('✅ WebSocket connected');
  
  // Send a message that should trigger the original error
  // (trying to send email to non-existent contact)
  console.log('📤 Sending test message...');
  ws.send(JSON.stringify({
    type: 'command',
    payload: {
      command: 'send_message',
      message: 'Send an email to richard santin about the project',
      userId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
      timestamp: Date.now()
    }
  }));
});

ws.on('message', function message(data) {
  console.log('📨 Response received:');
  const response = JSON.parse(data.toString());
  console.log('  - Type:', response.type);
  console.log('  - Success:', response.success);
  console.log('  - Has data:', !!response.data);
  console.log('  - Has data.ui:', !!response.data?.ui);
  console.log('  - Has data.structured:', !!response.data?.structured);
  
  if (response.data?.structured?.rdf_enhancement) {
    console.log('  ✅ RDF enhancement present');
  }
  
  if (response.type) {
    console.log('  ✅ UnifiedToolResponse format detected');
  } else {
    console.log('  ❌ Legacy format (missing type field)');
  }
  
  console.log('🔚 Test completed - closing connection');
  ws.close();
});

ws.on('error', function error(err) {
  console.log('❌ Error:', err.message);
});

ws.on('close', function close() {
  console.log('🔚 Connection closed');
  process.exit(0);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
  process.exit(0);
}, 15000);
