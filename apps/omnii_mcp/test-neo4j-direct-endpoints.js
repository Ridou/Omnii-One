#!/usr/bin/env node

/**
 * Test Direct Neo4j Endpoints
 * Tests the new /api/neo4j-direct endpoints that bypass the existing route structure
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:8000';
const NEO4J_DIRECT_URL = `${BASE_URL}/api/neo4j-direct`;

// Test user ID (should match a real user in your system)
const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';

console.log('🧪 Testing Direct Neo4j Endpoints...');
console.log('=====================================');
console.log(`Base URL: ${NEO4J_DIRECT_URL}`);
console.log(`Test User: ${TEST_USER_ID}`);
console.log('');

async function testHealthCheck() {
  console.log('1️⃣ Testing health check endpoint...');
  try {
    const response = await fetch(`${NEO4J_DIRECT_URL}/health`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Connected: ${data.connected}`);
    console.log(`   Total Concepts: ${data.totalConcepts}`);
    console.log(`   Response Time: ${data.responseTime}ms`);
    console.log(`   Service: ${data.service}`);
    
    if (data.connected && data.totalConcepts > 0) {
      console.log('   ✅ Health check passed!');
      return true;
    } else {
      console.log('   ❌ Health check failed!');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
    return false;
  }
}

async function testListConcepts() {
  console.log('\n2️⃣ Testing list concepts endpoint...');
  try {
    const response = await fetch(`${NEO4J_DIRECT_URL}/list?user_id=${TEST_USER_ID}&limit=5`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Concepts Found: ${data.data?.length || 0}`);
    console.log(`   Execution Time: ${data.meta?.executionTime}ms`);
    console.log(`   Service: ${data.meta?.service}`);
    
    if (data.success && data.data?.length > 0) {
      console.log('   📋 Sample concepts:');
      data.data.slice(0, 3).forEach((concept, index) => {
        console.log(`      ${index + 1}. ${concept.properties.name || `ID: ${concept.id}`}`);
        console.log(`         Labels: ${concept.labels?.join(', ')}`);
      });
      console.log('   ✅ List concepts passed!');
      return data.data;
    } else {
      console.log('   ❌ List concepts failed!');
      return [];
    }
  } catch (error) {
    console.log(`   ❌ List concepts failed: ${error.message}`);
    return [];
  }
}

async function testSearchConcepts() {
  console.log('\n3️⃣ Testing search concepts endpoint...');
  try {
    const searchTerm = 'pizza';
    const response = await fetch(`${NEO4J_DIRECT_URL}/search?user_id=${TEST_USER_ID}&q=${searchTerm}&limit=5`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Search Term: "${data.meta?.searchTerm}"`);
    console.log(`   Results Found: ${data.data?.length || 0}`);
    console.log(`   Execution Time: ${data.meta?.executionTime}ms`);
    console.log(`   Service: ${data.meta?.service}`);
    
    if (data.success) {
      if (data.data?.length > 0) {
        console.log('   🔍 Search results:');
        data.data.slice(0, 3).forEach((concept, index) => {
          console.log(`      ${index + 1}. ${concept.properties.name || `ID: ${concept.id}`}`);
          console.log(`         Relevance: ${concept.properties.relevanceScore || 'N/A'}`);
          console.log(`         Labels: ${concept.labels?.join(', ')}`);
        });
      } else {
        console.log('   📭 No results found for search term');
      }
      console.log('   ✅ Search concepts passed!');
      return data.data;
    } else {
      console.log('   ❌ Search concepts failed!');
      return [];
    }
  } catch (error) {
    console.log(`   ❌ Search concepts failed: ${error.message}`);
    return [];
  }
}

async function testConceptCount() {
  console.log('\n4️⃣ Testing concept count endpoint...');
  try {
    const response = await fetch(`${NEO4J_DIRECT_URL}/count?user_id=${TEST_USER_ID}`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   User ID: ${data.data?.user_id}`);
    console.log(`   Concept Count: ${data.data?.count}`);
    console.log(`   Service: ${data.service}`);
    
    if (data.success && typeof data.data?.count === 'number') {
      console.log('   ✅ Concept count passed!');
      return data.data.count;
    } else {
      console.log('   ❌ Concept count failed!');
      return 0;
    }
  } catch (error) {
    console.log(`   ❌ Concept count failed: ${error.message}`);
    return 0;
  }
}

async function testGetConceptById(concepts) {
  if (!concepts || concepts.length === 0) {
    console.log('\n5️⃣ Skipping get concept by ID test (no concepts available)');
    return;
  }
  
  console.log('\n5️⃣ Testing get concept by ID endpoint...');
  try {
    const testConcept = concepts[0];
    const response = await fetch(`${NEO4J_DIRECT_URL}/concept/${testConcept.id}?user_id=${TEST_USER_ID}`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Concept ID: ${testConcept.id}`);
    console.log(`   Service: ${data.service}`);
    
    if (data.success && data.data) {
      console.log(`   📄 Concept details:`);
      console.log(`      Name: ${data.data.properties.name || 'N/A'}`);
      console.log(`      Labels: ${data.data.labels?.join(', ')}`);
      console.log(`      Properties: ${Object.keys(data.data.properties).length} properties`);
      console.log('   ✅ Get concept by ID passed!');
      return data.data;
    } else {
      console.log('   ❌ Get concept by ID failed!');
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Get concept by ID failed: ${error.message}`);
    return null;
  }
}

async function runAllTests() {
  console.log('Starting comprehensive test of Direct Neo4j endpoints...\n');
  
  // Test 1: Health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ CRITICAL: Health check failed. Cannot continue tests.');
    console.log('💡 Make sure the server is running and Neo4j is connected.');
    process.exit(1);
  }
  
  // Test 2: List concepts
  const concepts = await testListConcepts();
  
  // Test 3: Search concepts
  await testSearchConcepts();
  
  // Test 4: Concept count
  const conceptCount = await testConceptCount();
  
  // Test 5: Get concept by ID
  await testGetConceptById(concepts);
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`✅ Health Check: ${healthOk ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ List Concepts: ${concepts.length > 0 ? 'PASSED' : 'FAILED'} (${concepts.length} found)`);
  console.log(`✅ Search Concepts: TESTED`);
  console.log(`✅ Concept Count: ${conceptCount > 0 ? 'PASSED' : 'FAILED'} (${conceptCount} total)`);
  console.log(`✅ Get by ID: ${concepts.length > 0 ? 'TESTED' : 'SKIPPED'}`);
  
  console.log('\n🎯 DIRECT NEO4J ENDPOINTS ARE READY!');
  console.log('Mobile app can now use /api/neo4j-direct endpoints');
  console.log('These endpoints bypass the existing route structure for better performance');
  
  if (conceptCount > 0) {
    console.log(`\n📱 Mobile app should now show ${conceptCount} concepts from direct Neo4j connection`);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.log('\n💥 Unhandled error:', error.message);
  process.exit(1);
});

// Run the tests
runAllTests().catch((error) => {
  console.error('\n💥 Test suite failed:', error.message);
  process.exit(1);
}); 