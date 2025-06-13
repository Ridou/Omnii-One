#!/usr/bin/env bun

// Test script for RDF integration in omnii_mcp
console.log('🧪 Testing RDF Integration in omnii_mcp');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';

async function testRDFEndpoints() {
  console.log('\n🚀 Starting RDF Integration Tests...\n');

  // Test 1: Health Check
  console.log('1️⃣ Testing RDF Health Check...');
  try {
    const response = await fetch(`${BASE_URL}/api/rdf/health`);
    const data = await response.json();
    console.log('✅ Health check:', data.status);
    console.log('   Service:', data.service_info?.name);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }

  // Test 2: Status Check
  console.log('\n2️⃣ Testing RDF Status...');
  try {
    const response = await fetch(`${BASE_URL}/api/rdf/status`);
    const data = await response.json();
    console.log('✅ Status:', data.status);
    console.log('   Integration:', data.integration);
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }

  // Test 3: Concept Extraction
  console.log('\n3️⃣ Testing Concept Extraction...');
  try {
    const response = await fetch(`${BASE_URL}/api/rdf/extract-concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: "I need to book a flight to Italy next month for my vacation"
      })
    });
    const data = await response.json();
    console.log('✅ Concepts extracted:', data.concepts?.length || 0);
    console.log('   Intent:', data.intent);
    console.log('   Sentiment:', data.sentiment?.polarity || 'N/A');
  } catch (error) {
    console.error('❌ Concept extraction failed:', error.message);
  }

  // Test 4: Simple Analysis
  console.log('\n4️⃣ Testing RDF Analysis...');
  try {
    const response = await fetch(`${BASE_URL}/api/rdf/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_message: "Remind me to schedule a meeting with the team tomorrow",
        user_id: "test-user-123",
        channel: "chat"
      })
    });
    const data = await response.json();
    console.log('✅ Analysis completed:', data.success);
    console.log('   Concepts found:', data.analysis?.concepts?.length || 0);
    console.log('   Intent:', data.analysis?.intent?.primary_intent || 'N/A');
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }

  // Test 5: Full Processing Pipeline
  console.log('\n5️⃣ Testing Full RDF Processing Pipeline...');
  try {
    const response = await fetch(`${BASE_URL}/api/rdf/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_message: "I'm excited about my trip to Paris next week! Can you help me find a good restaurant?",
        user_id: "test-user-123",
        channel: "sms",
        metadata: {
          source_identifier: "+1234567890",
          is_incoming: true
        }
      })
    });
    const data = await response.json();
    console.log('✅ Full pipeline completed:', data.success);
    console.log('   Service type:', data.service_type || 'N/A');
    console.log('   Actions generated:', data.data?.structured_actions?.length || 0);
    console.log('   Brain integration:', data.data?.brain_integration?.temporal_reasoning_applied || 'N/A');
  } catch (error) {
    console.error('❌ Full processing failed:', error.message);
  }

  // Test 6: String Input (Simple)
  console.log('\n6️⃣ Testing Simple String Input...');
  try {
    const response = await fetch(`${BASE_URL}/api/rdf/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify("Book me a flight to Tokyo please")
    });
    const data = await response.json();
    console.log('✅ String input processed:', data.success);
    console.log('   Message processed:', data.message || 'N/A');
  } catch (error) {
    console.error('❌ String input failed:', error.message);
  }

  // Test 7: Test Endpoint
  console.log('\n7️⃣ Testing RDF Test Endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/rdf/test`);
    const data = await response.json();
    console.log('✅ Test endpoint accessible');
    console.log('   Available endpoints:', data.endpoints?.length || 0);
    console.log('   Service:', data.service || 'N/A');
  } catch (error) {
    console.error('❌ Test endpoint failed:', error.message);
  }

  console.log('\n🎉 RDF Integration Tests Completed!\n');
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('🚫 Unhandled Rejection:', reason);
  process.exit(1);
});

// Run tests
testRDFEndpoints().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
}); 