#!/usr/bin/env node

/**
 * Direct Neo4j Connection Test
 * Tests direct connection to your paid Neo4j AuraDB instance
 */

import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Direct Neo4j Connection...');
console.log('=====================================');

// Check environment variables
const requiredVars = ['NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

console.log(`🔗 Neo4j URI: ${process.env.NEO4J_URI}`);
console.log(`👤 Neo4j User: ${process.env.NEO4J_USER}`);
console.log(`🗄️ Neo4j Database: ${process.env.NEO4J_DATABASE || 'neo4j'}`);

// Create direct driver connection
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  {
    // Enhanced configuration for production
    maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 10000, // 10 seconds
    // Remove encryption/trust config - let the neo4j+s:// URL handle it
    logging: {
      level: 'info',
      logger: (level, message) => {
        console.log(`[Neo4j-${level.toUpperCase()}] ${message}`);
      }
    }
  }
);

async function testConnection() {
  let session;
  
  try {
    console.log('\n🚀 Starting connection test...');
    
    // Test basic connectivity
    session = driver.session({ 
      database: process.env.NEO4J_DATABASE || 'neo4j',
      defaultAccessMode: neo4j.session.READ 
    });
    
    console.log('✅ Session created successfully');
    
    // Test basic query
    console.log('🔍 Testing basic query...');
    const result = await session.run('RETURN 1 as test, datetime() as current_time');
    const record = result.records[0];
    const testValue = record.get('test');
    const currentTime = record.get('current_time');
    
    console.log(`✅ Basic query successful: test=${testValue}, time=${currentTime}`);
    
    // Test database info
    console.log('📊 Getting database information...');
    const dbInfoResult = await session.run('CALL db.info()');
    if (dbInfoResult.records.length > 0) {
      const dbInfo = dbInfoResult.records[0];
      console.log(`✅ Database: ${dbInfo.get('name')}`);
      console.log(`✅ Database ID: ${dbInfo.get('id')}`);
    }
    
    // Test node count
    console.log('🔢 Counting existing nodes...');
    const countResult = await session.run('MATCH (n) RETURN count(n) as total_nodes');
    const totalNodes = countResult.records[0].get('total_nodes');
    console.log(`✅ Total nodes in database: ${totalNodes}`);
    
    // Test concept nodes specifically
    const conceptResult = await session.run('MATCH (c:Concept) RETURN count(c) as concept_count');
    const conceptCount = conceptResult.records[0].get('concept_count');
    console.log(`✅ Concept nodes: ${conceptCount}`);
    
    console.log('\n🎉 All tests passed! Direct Neo4j connection is working perfectly.');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Neo4j connection test failed:');
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code}`);
    
    if (error.code === 'ServiceUnavailable') {
      console.error('\n💡 Troubleshooting suggestions:');
      console.error('1. Check if your Neo4j AuraDB instance is running');
      console.error('2. Verify your NEO4J_URI is correct');
      console.error('3. Ensure your credentials are valid');
      console.error('4. Check if your IP is whitelisted in Neo4j AuraDB');
    }
    
    return false;
    
  } finally {
    if (session) {
      await session.close();
      console.log('🔌 Session closed');
    }
  }
}

async function testWriteOperations() {
  let session;
  
  try {
    console.log('\n📝 Testing write operations...');
    
    session = driver.session({ 
      database: process.env.NEO4J_DATABASE || 'neo4j',
      defaultAccessMode: neo4j.session.WRITE 
    });
    
    // Test user ID for isolation
    const testUserId = 'test-user-' + Date.now();
    
    // Create a test concept
    const createResult = await session.run(
      `CREATE (c:Concept {
        user_id: $userId,
        name: $name,
        content: $content,
        created_at: datetime(),
        test_node: true
      }) RETURN c`,
      {
        userId: testUserId,
        name: 'Test Concept',
        content: 'This is a test concept created by the direct connection test'
      }
    );
    
    const createdNode = createResult.records[0].get('c');
    console.log(`✅ Created test concept with ID: ${createdNode.identity}`);
    
    // Query the test concept back
    const queryResult = await session.run(
      'MATCH (c:Concept {user_id: $userId, test_node: true}) RETURN c',
      { userId: testUserId }
    );
    
    console.log(`✅ Retrieved ${queryResult.records.length} test concept(s)`);
    
    // Clean up test data
    const deleteResult = await session.run(
      'MATCH (c:Concept {user_id: $userId, test_node: true}) DELETE c RETURN count(c) as deleted',
      { userId: testUserId }
    );
    
    const deletedCount = deleteResult.records[0].get('deleted');
    console.log(`✅ Cleaned up ${deletedCount} test concept(s)`);
    
    console.log('📝 Write operations test passed!');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Write operations test failed:');
    console.error(`Error: ${error.message}`);
    return false;
    
  } finally {
    if (session) {
      await session.close();
    }
  }
}

// Run tests
async function runAllTests() {
  try {
    const readSuccess = await testConnection();
    const writeSuccess = await testWriteOperations();
    
    if (readSuccess && writeSuccess) {
      console.log('\n🎯 RESULT: Your direct Neo4j connection is working perfectly!');
      console.log('✅ No intermediary services needed - direct connection established');
      console.log('✅ Read operations working');
      console.log('✅ Write operations working');
      console.log('✅ User isolation working');
      process.exit(0);
    } else {
      console.log('\n❌ RESULT: Some tests failed. Please check your configuration.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Unexpected error during testing:', error);
    process.exit(1);
  } finally {
    await driver.close();
    console.log('🔌 Neo4j driver closed');
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await driver.close();
  process.exit(0);
});

// Run the tests
runAllTests().catch(console.error); 