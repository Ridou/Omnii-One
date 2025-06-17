#!/usr/bin/env bun

import { API_BASE_URL, USER_ID, log } from './tests/constants.js';

const RDF_BASE_URL = `${API_BASE_URL}/api/rdf`;

console.log('🔍 RDF Extraction Debug Tool');
console.log('============================\n');

async function debugExtraction() {
  // Test 1: Check what the extract-concepts endpoint actually returns
  console.log('1️⃣ Testing extract-concepts endpoint structure...');
  
  const testText = "I need to email John Smith about the meeting with Sarah Johnson tomorrow at 3pm in the conference room";
  
  try {
    const response = await fetch(`${RDF_BASE_URL}/extract-concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: testText })
    });
    
    const data = await response.json();
    
    console.log('\n📥 Raw Response:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n📊 Response Analysis:');
    console.log(`- Status Code: ${response.status}`);
    console.log(`- Success: ${data.success}`);
    console.log(`- Has concepts array: ${Array.isArray(data.concepts)}`);
    console.log(`- Concepts count: ${data.concepts?.length || 0}`);
    console.log(`- Has sentiment: ${!!data.sentiment}`);
    console.log(`- Has intent: ${!!data.intent}`);
    
    if (data.concepts && data.concepts.length === 0) {
      console.log('\n⚠️  No concepts extracted. Possible issues:');
      console.log('- Python RDF service might not be processing correctly');
      console.log('- The extractors configuration might be wrong');
      console.log('- The text analysis might be failing');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  // Test 2: Check what the process endpoint returns
  console.log('\n\n2️⃣ Testing process endpoint with contact extraction...');
  
  const contactRequest = {
    text: "Tell Mike Davis about the project deadline",
    domain: 'contact_communication',
    task: 'message_analysis',
    extractors: ['contact_names', 'communication_intent', 'context_clues']
  };
  
  try {
    const response = await fetch(`${RDF_BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactRequest)
    });
    
    const data = await response.json();
    
    console.log('\n📥 Raw Response:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n📊 Response Analysis:');
    console.log(`- Has contact_extraction: ${!!data.contact_extraction}`);
    console.log(`- Has intent_analysis: ${!!data.intent_analysis}`);
    console.log(`- Has context_analysis: ${!!data.context_analysis}`);
    
    if (data.contact_extraction) {
      console.log(`- Primary contact: ${data.contact_extraction.primary_contact || 'none'}`);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  // Test 3: Check Python service directly
  console.log('\n\n3️⃣ Checking Python RDF service directly...');
  
  // Try both ports - 8001 (new) and 5174 (old)
  const pythonPorts = [8001, 5174];
  let pythonServiceFound = false;
  
  for (const port of pythonPorts) {
    try {
      console.log(`\n🎯 Trying Python service on port ${port}...`);
      const pythonResponse = await fetch(`http://localhost:${port}/health`);
      
      if (pythonResponse.ok) {
        const pythonData = await pythonResponse.json();
        console.log(`✅ Python service is running on port ${port}:`);
        console.log(JSON.stringify(pythonData, null, 2));
        pythonServiceFound = true;
        
        // Try a direct request to Python service
        console.log('\n🐍 Testing direct Python extraction...');
        
        const directResponse = await fetch(`http://localhost:${port}/api/rdf/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: "Contact John Smith about the meeting",
            domain: 'concept_extraction',
            task: 'extract_concepts',
            extractors: ['concepts', 'sentiment', 'intent']
          })
        });
        
        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log('\n📥 Direct Python Response:');
          console.log(JSON.stringify(directData, null, 2));
        } else {
          console.log(`❌ Direct extraction failed: ${directResponse.status} ${directResponse.statusText}`);
        }
        
        break; // Found working port
      }
    } catch (error) {
      console.log(`⚠️  Cannot reach Python service on port ${port}`);
    }
  }
  
  if (!pythonServiceFound) {
    console.log('\n❌ Python service not found on any port');
    console.log('   Please start the Python service with:');
    console.log('   cd apps/python-rdf && ./start-local.sh');
  }
  
  // Test 4: Check RDF client configuration
  console.log('\n\n4️⃣ Checking RDF client configuration...');
  
  try {
    const statusResponse = await fetch(`${RDF_BASE_URL}/status`);
    const statusData = await statusResponse.json();
    
    console.log('RDF Service Status:');
    console.log(JSON.stringify(statusData, null, 2));
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

// Run the debug
debugExtraction().catch(console.error);