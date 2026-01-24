#!/usr/bin/env node

/**
 * Test script to verify RDF flow from tRPC API to Python service
 */

const API_URL = 'http://localhost:8000';

async function testRDFFlow() {
  console.log('🧪 Testing RDF Flow\n');
  
  // First, test if the tRPC API is accessible
  console.log('1️⃣ Testing tRPC API accessibility...');
  try {
    const healthResponse = await fetch(`${API_URL}/api/trpc/rdf.health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      }
    });
    console.log(`   Status: ${healthResponse.status}`);
    if (!healthResponse.ok) {
      console.log(`   ❌ API returned error: ${healthResponse.statusText}`);
    } else {
      console.log(`   ✅ API is accessible`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to reach API: ${error.message}`);
  }
  
  console.log('\n2️⃣ Testing direct MCP service...');
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
  }
  
  console.log('\n3️⃣ Testing concept extraction through MCP...');
  try {
    const extractResponse = await fetch('http://localhost:8000/api/rdf/extract-concepts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: 'Test concept extraction' })
    });
    console.log(`   Status: ${extractResponse.status}`);
    const extractData = await extractResponse.json();
    console.log(`   Response:`, JSON.stringify(extractData, null, 2));
  } catch (error) {
    console.log(`   ❌ Failed to extract concepts: ${error.message}`);
  }
  
  console.log('\n4️⃣ Testing your local Python service (if running)...');
  try {
    const localResponse = await fetch('http://localhost:8001/health', {
      method: 'GET'
    });
    console.log(`   Status: ${localResponse.status}`);
    console.log(`   ✅ Local Python service is running!`);
  } catch (error) {
    console.log(`   ❌ Local Python service not accessible: ${error.message}`);
    console.log(`   💡 Make sure to run: cd apps/omnii-rdf && ./start-local.sh`);
  }
  
  console.log('\n📝 Summary:');
  console.log('- Your tRPC API is at: https://api.omnii.net');
  console.log('- Your MCP service is at: https://omniimcp-production.up.railway.app');
  console.log('- The MCP service is trying to reach Python RDF at: http://omnii-rdf-python-production.railway.internal:8000');
  console.log('- Your local Python service should run on: http://localhost:8001');
  console.log('\n💡 To connect them, use ngrok to expose your local Python service and set RDF_PYTHON_SERVICE_OVERRIDE_URL in Railway');
}

testRDFFlow().catch(console.error);