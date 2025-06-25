#!/usr/bin/env node
/**
 * Test Direct Neo4j Client Connection
 * This script tests the direct connection from mobile app to Neo4j AuraDB
 * bypassing any server/API routes completely.
 */

import neo4j from 'neo4j-driver';

// Neo4j Configuration (should match your mobile app)
const NEO4J_CONFIG = {
  uri: 'neo4j+s://d066c29d.databases.neo4j.io:7687',
  username: 'neo4j',
  database: 'neo4j',
  password: process.env.NEO4J_PASSWORD || '_o0JebFPkSb51lSjC7BUqdsvDhD4e5bYGFV1uoVv3QE' // Set this!
};

const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';

console.log('🧪 Testing Direct Neo4j Client Connection...');
console.log('=====================================');
console.log(`🔗 Neo4j URI: ${NEO4J_CONFIG.uri}`);
console.log(`👤 Neo4j User: ${NEO4J_CONFIG.username}`);
console.log(`🗄️ Neo4j Database: ${NEO4J_CONFIG.database}`);
console.log(`🆔 Test User ID: ${TEST_USER_ID}`);

async function testDirectConnection() {
  let driver = null;
  
  try {
    console.log('\n🚀 Creating direct Neo4j driver...');
    
    // Create driver with same config as mobile app
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.username, NEO4J_CONFIG.password),
      {
        maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
        maxConnectionPoolSize: 10,
        connectionAcquisitionTimeout: 15000, // 15 seconds
        connectionTimeout: 10000, // 10 seconds
        disableLosslessIntegers: true
        // Note: encryption is handled by neo4j+s:// URI scheme
      }
    );

    console.log('✅ Driver created successfully');
    
    // Test basic connectivity
    console.log('🔍 Testing basic connectivity...');
    const session = driver.session({ database: NEO4J_CONFIG.database });
    const startTime = Date.now();
    
    await session.run('RETURN 1 as test, datetime() as now');
    const connectionTime = Date.now() - startTime;
    
    console.log(`✅ Basic connectivity successful (${connectionTime}ms)`);
    
    // Test concept count
    console.log('📊 Getting total concept count...');
    const countResult = await session.run('MATCH (c:Concept) RETURN count(c) as total');
    const totalConceptsRaw = countResult.records[0]?.get('total');
    const totalConcepts = typeof totalConceptsRaw === 'number' ? totalConceptsRaw : (totalConceptsRaw?.toNumber?.() || 0);
    console.log(`✅ Total concepts in database: ${totalConcepts}`);
    
    // Test user-specific concept count
    console.log(`👤 Getting concepts for user: ${TEST_USER_ID}...`);
    const userCountResult = await session.run(`
      MATCH (c:Concept)
      WHERE c.user_id = $userId
      RETURN count(c) as total
    `, { userId: TEST_USER_ID });
    
    const userConceptsRaw = userCountResult.records[0]?.get('total');
    const userConcepts = typeof userConceptsRaw === 'number' ? userConceptsRaw : (userConceptsRaw?.toNumber?.() || 0);
    console.log(`✅ User concepts found: ${userConcepts}`);
    
    // Test search functionality
    console.log('🔍 Testing search functionality...');
    const searchStartTime = Date.now();
    const searchResult = await session.run(`
      MATCH (c:Concept)
      WHERE c.user_id = $userId
      AND (
        coalesce(toLower(toString(c.name)), '') CONTAINS toLower($searchTerm) OR
        coalesce(toLower(toString(c.content)), '') CONTAINS toLower($searchTerm) OR
        coalesce(toLower(toString(c.description)), '') CONTAINS toLower($searchTerm)
      )
      WITH c, labels(c) as nodeLabels,
           CASE 
             WHEN coalesce(toLower(toString(c.name)), '') = toLower($searchTerm) THEN 10
             WHEN coalesce(toLower(toString(c.name)), '') CONTAINS toLower($searchTerm) THEN 8
             WHEN coalesce(toLower(toString(c.content)), '') CONTAINS toLower($searchTerm) THEN 6
             WHEN coalesce(toLower(toString(c.description)), '') CONTAINS toLower($searchTerm) THEN 4
             ELSE 1
           END as relevanceScore
      RETURN c, nodeLabels, relevanceScore
      ORDER BY relevanceScore DESC, c.name ASC
      LIMIT $limit
    `, {
      userId: TEST_USER_ID,
      searchTerm: 'test',
      limit: neo4j.int(5)
    });
    
    const searchTime = Date.now() - searchStartTime;
    const searchResults = searchResult.records.length;
    console.log(`✅ Search completed: ${searchResults} results for "test" (${searchTime}ms)`);
    
    // Test list functionality
    console.log('📋 Testing list functionality...');
    const listStartTime = Date.now();
    const listResult = await session.run(`
      MATCH (c:Concept)
      WHERE c.user_id = $userId
      WITH c, labels(c) as nodeLabels
      RETURN c, nodeLabels
      ORDER BY 
        CASE WHEN c.last_mentioned IS NOT NULL THEN c.last_mentioned ELSE c.created_at END DESC,
        c.name ASC
      LIMIT $limit
    `, {
      userId: TEST_USER_ID,
      limit: neo4j.int(10)
    });
    
    const listTime = Date.now() - listStartTime;
    const listResults = listResult.records.length;
    console.log(`✅ List completed: ${listResults} concepts listed (${listTime}ms)`);
    
    // Show sample concept if available
    if (listResults > 0) {
      const sampleConcept = listResult.records[0];
      const node = sampleConcept.get('c');
      const labels = sampleConcept.get('nodeLabels');
      console.log(`📄 Sample concept: "${node.properties.name || 'Unnamed'}" (Labels: ${labels.join(', ')})`);
    }
    
    await session.close();
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Direct Neo4j connection is working perfectly');
    console.log('✅ Mobile app can connect directly to AuraDB');
    console.log('✅ No server/API routes needed');
    console.log(`✅ Response times: Connection ${connectionTime}ms, Search ${searchTime}ms, List ${listTime}ms`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check Neo4j password is correct');
    console.error('2. Verify Neo4j AuraDB instance is running');
    console.error('3. Ensure network connectivity to AuraDB');
    console.error('4. Set NEO4J_PASSWORD environment variable');
    console.error('\nExample: NEO4J_PASSWORD=your_password node test-neo4j-direct-client.js');
    
    process.exit(1);
  } finally {
    if (driver) {
      await driver.close();
      console.log('🔌 Driver closed');
    }
  }
}

// Run the test
testDirectConnection()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error:', error);
    process.exit(1);
  }); 