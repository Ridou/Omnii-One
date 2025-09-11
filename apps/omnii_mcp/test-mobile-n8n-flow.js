#!/usr/bin/env node

/**
 * 🧪 Test Mobile App n8n Flow
 * 
 * Simulates exactly what the mobile app will do with DirectN8nChatService
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:8000',
  userId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
};

async function simulateMobileAppFlow() {
  console.log('📱 Simulating Mobile App Direct n8n Flow...');
  console.log('=' .repeat(60));
  
  const testMessages = [
    'What\'s my schedule like today?',
    'Show me my latest emails', 
    'List my tasks'
  ];

  for (const message of testMessages) {
    console.log(`\n💬 User sends: "${message}"`);
    
    try {
      // This is exactly what DirectN8nChatService.sendMessage() does
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat/n8n-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: TEST_CONFIG.userId,
          message: message
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ n8n Response received:');
        console.log('  Type:', data.type);
        console.log('  Category:', data.data?.category);
        console.log('  Message:', data.data?.message?.substring(0, 150) + '...');
        console.log('  Agent:', data.data?.agentType);
        
        // Check if this will render properly in mobile app
        if (data.type === 'n8n_agent_response' && data.data?.category === 'n8n_agent_response') {
          console.log('🎯 ✅ Will render with N8nAgentComponents in mobile app');
        } else {
          console.log('❌ May not render properly in mobile app');
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Request failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('─'.repeat(60));
  }
  
  console.log('\n🎉 Mobile app simulation complete!');
  console.log('✅ Enable with: EXPO_PUBLIC_USE_DIRECT_N8N=true');
}

simulateMobileAppFlow().catch(console.error);
