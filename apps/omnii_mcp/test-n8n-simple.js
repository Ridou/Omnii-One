#!/usr/bin/env node

/**
 * Simple n8n Test
 * Test the n8n client directly to isolate issues
 */

async function testN8nClientDirect() {
  console.log('🧪 Testing n8n Client Directly...');
  
  // Import the client
  const { n8nAgentClient } = await import('./src/services/integrations/n8n-agent-client.js');
  
  try {
    console.log('📊 Client stats:', n8nAgentClient.getStats());
    console.log('🌐 Webhook URL:', n8nAgentClient.getWebhookUrl());
    
    // Test simple request
    const request = {
      message: 'What is 2+2?',
      user_id: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
      agent_type: 'auto'
    };
    
    console.log('📤 Sending request:', JSON.stringify(request, null, 2));
    
    const response = await n8nAgentClient.executeWithRetry(request);
    
    console.log('✅ Response received:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔍 Stack:', error.stack);
  }
}

testN8nClientDirect();
