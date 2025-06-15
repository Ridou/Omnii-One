#!/usr/bin/env node

/**
 * Test script to verify local RDF flow
 */

async function testLocalRDFFlow() {
  console.log('🧪 Testing Local RDF Flow\n');
  
  console.log('1️⃣ Testing MCP service at localhost:8000...');
  try {
    const mcpResponse = await fetch('http://localhost:8000/api/rdf/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${mcpResponse.status}`);
    const mcpData = await mcpResponse.json();
    console.log(`   Response:`, JSON.stringify(mcpData, null, 2));
  } catch (error) {
    console.log(`   ❌ Failed to reach MCP service: ${error.message}`);
    console.log(`   💡 Make sure to run: cd apps/omnii_mcp && bun dev`);
  }
  
  console.log('\n2️⃣ Testing Python RDF service at localhost:8001...');
  try {
    const pythonResponse = await fetch('http://localhost:8001/health', {
      method: 'GET'
    });
    console.log(`   Status: ${pythonResponse.status}`);
    console.log(`   ✅ Python RDF service is running!`);
  } catch (error) {
    console.log(`   ❌ Python RDF service not accessible: ${error.message}`);
    console.log(`   💡 Make sure to run: cd apps/omnii-rdf && ./start-local.sh`);
  }
  
  console.log('\n3️⃣ Testing message analysis through MCP...');
  try {
    const analyzeResponse = await fetch('http://localhost:8000/api/rdf/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Send Eden an email about weekend plans',
        domain: 'contact_communication',
        task: 'message_analysis',
        extractors: [
          'contact_names',
          'communication_intent',
          'context_clues',
          'formality_level',
          'urgency_indicators'
        ]
      })
    });
    console.log(`   Status: ${analyzeResponse.status}`);
    const analyzeData = await analyzeResponse.json();
    console.log(`   Response:`, JSON.stringify(analyzeData, null, 2));
  } catch (error) {
    console.log(`   ❌ Failed to analyze message: ${error.message}`);
  }
  
  console.log('\n4️⃣ Testing concept extraction through MCP...');
  try {
    const extractResponse = await fetch('http://localhost:8000/api/rdf/extract-concepts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: 'Send Eden an email about weekend plans' })
    });
    console.log(`   Status: ${extractResponse.status}`);
    const extractData = await extractResponse.json();
    console.log(`   Response:`, JSON.stringify(extractData, null, 2));
  } catch (error) {
    console.log(`   ❌ Failed to extract concepts: ${error.message}`);
  }
  
  console.log('\n📝 Summary of local setup:');
  console.log('- React Native app should have EXPO_PUBLIC_BACKEND_BASE_URL=http://localhost:8000');
  console.log('- MCP service should be running on port 8000');
  console.log('- Python RDF service should be running on port 8001');
  console.log('- Flow: React Native → localhost:8000 (MCP) → localhost:8001 (Python)');
}

testLocalRDFFlow().catch(console.error);