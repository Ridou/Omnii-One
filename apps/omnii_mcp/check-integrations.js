const { OpenAIToolSet } = require('composio-core');

async function checkIntegrations() {
  try {
    const composio = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY || 'exby0bz32hpz8nmmahu3o',
    });
    
    console.log('🔍 Checking available integrations...');
    const integrations = await composio.integrations.list();
    
    console.log(`\n📋 Found ${integrations.items?.length || 0} total integrations:`);
    integrations.items?.forEach((integration, index) => {
      console.log(`  ${index + 1}. ${integration.name} (ID: ${integration.id})`);
    });
    
    // Check specific Google integrations
    const googleIntegrations = integrations.items?.filter(int => 
      int.name?.toLowerCase().includes('google')
    );
    
    console.log('\n🔍 Google-related integrations:');
    googleIntegrations?.forEach(integration => {
      console.log(`  - ${integration.name} (ID: ${integration.id})`);
    });
    
    // Check what you actually have connections for
    const entityId = "edenchan717@gmail.com";
    console.log(`\n🔗 Checking connections for ${entityId}:`);
    
    const connections = await composio.connectedAccounts.list({
      entityId: entityId,
    });
    
    connections.items?.forEach((conn, index) => {
      console.log(`  ${index + 1}. ${conn.appName} - ${conn.status} (ID: ${conn.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkIntegrations(); 