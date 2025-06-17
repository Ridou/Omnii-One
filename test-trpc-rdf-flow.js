#!/usr/bin/env node

/**
 * Test script to verify tRPC RDF flow
 */

async function testTRPCFlow() {
  console.log('🧪 Testing tRPC RDF Flow\n');
  
  // Test the actual tRPC mutation endpoint
  console.log('1️⃣ Testing tRPC analyzeMessage mutation...');
  try {
    const trpcPayload = {
      "0": {
        "json": {
          "text": "Send Eden an email about weekend plans",
          "domain": "contact_communication", 
          "task": "message_analysis",
          "extractors": [
            "contact_names",
            "communication_intent",
            "context_clues",
            "formality_level",
            "urgency_indicators"
          ]
        }
      }
    };
    
    const trpcResponse = await fetch('http://localhost:8000/api/trpc/rdf.analyzeMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trpc-source': 'expo-react'
      },
      body: JSON.stringify(trpcPayload)
    });
    
    console.log(`   Status: ${trpcResponse.status}`);
    const trpcData = await trpcResponse.text();
    console.log(`   Response:`, trpcData);
    
    // Try to parse the tRPC batch response
    try {
      const parsed = JSON.parse(trpcData);
      console.log(`   Parsed response:`, JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(`   Could not parse response as JSON`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to call tRPC: ${error.message}`);
  }
  
  console.log('\n2️⃣ Testing tRPC extractConcepts mutation...');
  try {
    const trpcPayload = {
      "0": {
        "json": {
          "text": "List my recent contacts and tasks"
        }
      }
    };
    
    const trpcResponse = await fetch('http://localhost:8000/api/trpc/rdf.extractConcepts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trpc-source': 'expo-react'
      },
      body: JSON.stringify(trpcPayload)
    });
    
    console.log(`   Status: ${trpcResponse.status}`);
    const trpcData = await trpcResponse.text();
    console.log(`   Response:`, trpcData);
  } catch (error) {
    console.log(`   ❌ Failed to call tRPC: ${error.message}`);
  }
  
  console.log('\n3️⃣ Testing direct MCP RDF endpoints...');
  try {
    const directResponse = await fetch('http://localhost:8000/api/rdf/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: "Send Eden an email about weekend plans",
        domain: "contact_communication",
        task: "message_analysis"
      })
    });
    
    console.log(`   Status: ${directResponse.status}`);
    const directData = await directResponse.json();
    console.log(`   Response:`, JSON.stringify(directData, null, 2));
  } catch (error) {
    console.log(`   ❌ Failed to call direct endpoint: ${error.message}`);
  }
  
  console.log('\n📝 Summary:');
  console.log('- tRPC endpoints are at: http://localhost:8000/api/trpc/*');
  console.log('- Direct RDF endpoints are at: http://localhost:8000/api/rdf/*');
  console.log('- Python RDF service is at: http://localhost:8001/*');
  console.log('\nIf tRPC calls fail with 401, you may need auth headers.');
}

testTRPCFlow().catch(console.error);