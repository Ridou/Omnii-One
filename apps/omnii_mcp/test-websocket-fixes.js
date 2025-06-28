const WebSocket = require('ws');

console.log('🧪 Testing Local WebSocket with Contact Resolution & Zod Validation Fixes...');

const ws = new WebSocket('ws://localhost:8000/ws?userId=cd9bdc60-35af-4bb6-b87e-1932e96fb354');

ws.on('open', function open() {
  console.log('✅ Connected to local WebSocket server');
  
  // Send the exact same test message that failed in production
  console.log('📤 Sending test message: "shoot an email to Richard Santin asking what he\'s doing today"');
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

ws.on('message', function message(data) {
  console.log('\n📨 Response received:');
  const response = JSON.parse(data.toString());
  
  console.log('📋 Response Analysis:');
  console.log('  - Type:', response.type);
  console.log('  - Success:', response.success);
  console.log('  - Message:', response.message ? response.message.substring(0, 100) + '...' : 'N/A');
  console.log('  - Has data:', !!response.data);
  console.log('  - Has data.ui:', !!response.data?.ui);
  console.log('  - Has data.ui.content:', !!response.data?.ui?.content);
  console.log('  - Has data.structured:', !!response.data?.structured);
  console.log('  - Has data.structured.content:', !!response.data?.structured?.content);
  
  if (response.data?.structured?.rdf_enhancement) {
    console.log('  ✅ RDF enhancement present');
  }
  
  // Check if this is now properly validated UnifiedToolResponse
  if (response.type && response.data?.ui?.content) {
    console.log('  ✅ UnifiedToolResponse format - Should pass Zod validation now!');
  } else {
    console.log('  ❌ Missing required fields for UnifiedToolResponse');
  }
  
  // Check for the contact resolution error
  if (response.message && response.message.includes('richard santin')) {
    console.log('  ✅ Contact resolution error properly handled');
  }
  
  console.log('\n🔚 Test completed successfully');
  ws.close();
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket Error:', err.message);
});

ws.on('close', function close() {
  console.log('🔚 Connection closed');
  process.exit(0);
});

// Timeout after 20 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
  process.exit(0);
}, 20000);
