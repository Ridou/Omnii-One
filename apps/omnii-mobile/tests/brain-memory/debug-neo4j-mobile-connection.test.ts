/**
 * 🐛 Neo4j Mobile Connection Debug Test
 * 
 * This test helps diagnose why the brain memory cache shows empty Neo4j concepts
 * even though the backend has 629 concepts.
 */

import neo4j from 'neo4j-driver';

// Test configuration (same as mobile app)
const NEO4J_CONFIG = {
  uri: 'neo4j+s://d066c29d.databases.neo4j.io:7687',
  username: 'neo4j',
  database: 'neo4j',
  password: process.env.EXPO_PUBLIC_NEO4J_PASSWORD || '_o0JebFPkSb51lSjC7BUqdsvDhD4e5bYGFV1uoVv3QE'
};

const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';

describe('🐛 Neo4j Mobile Connection Debug', () => {
  let driver: any;

  beforeAll(async () => {
    console.log('🔧 Setting up Neo4j driver with mobile app config...');
    
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.username, NEO4J_CONFIG.password),
      {
        maxConnectionLifetime: 30 * 60 * 1000,
        maxConnectionPoolSize: 10,
        connectionAcquisitionTimeout: 15000,
        connectionTimeout: 10000,
        disableLosslessIntegers: true
      }
    );
  });

  afterAll(async () => {
    if (driver) {
      await driver.close();
    }
  });

  test('1. 🔌 Basic Neo4j Connection Test', async () => {
    console.log('\n🔌 Testing basic Neo4j connection...');
    
    const session = driver.session({ database: NEO4J_CONFIG.database });
    
    try {
      const result = await session.run('RETURN 1 as test');
      expect(result.records.length).toBe(1);
      expect(result.records[0].get('test')).toBe(1);
      
      console.log('✅ Basic connection successful');
    } finally {
      await session.close();
    }
  });

  test('2. 📊 Total Concepts Count', async () => {
    console.log('\n📊 Testing total concepts count...');
    
    const session = driver.session({ database: NEO4J_CONFIG.database });
    
    try {
      const result = await session.run('MATCH (c:Concept) RETURN count(c) as total');
      const totalRaw = result.records[0]?.get('total');
      const total = typeof totalRaw === 'number' ? totalRaw : (totalRaw?.toNumber?.() || totalRaw?.low || 0);
      
      console.log(`📊 Total concepts in database: ${total}`);
      expect(total).toBeGreaterThan(0);
      
    } finally {
      await session.close();
    }
  });

  test('3. 👤 User-Specific Concepts Count', async () => {
    console.log(`\n👤 Testing concepts for user: ${TEST_USER_ID}...`);
    
    const session = driver.session({ database: NEO4J_CONFIG.database });
    
    try {
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        RETURN count(c) as userTotal
      `, { userId: TEST_USER_ID });
      
      const userRaw = result.records[0]?.get('userTotal');
      const userTotal = typeof userRaw === 'number' ? userRaw : (userRaw?.toNumber?.() || userRaw?.low || 0);
      
      console.log(`👤 User ${TEST_USER_ID} has ${userTotal} concepts`);
      
      if (userTotal === 0) {
        console.log('❌ User has NO concepts! This explains why cache is empty');
        console.log('🔍 Let\'s check what users actually exist in the database...');
        
        // Get sample user IDs
        const usersResult = await session.run(`
          MATCH (c:Concept)
          WHERE c.user_id IS NOT NULL
          RETURN DISTINCT c.user_id as userId, count(c) as conceptCount
          ORDER BY conceptCount DESC
          LIMIT 10
        `);
        
        console.log('📋 Users with concepts in the database:');
        usersResult.records.forEach((record, index) => {
          const userId = record.get('userId');
          const conceptCount = record.get('conceptCount');
          const count = typeof conceptCount === 'number' ? conceptCount : (conceptCount?.toNumber?.() || conceptCount?.low || 0);
          console.log(`  ${index + 1}. ${userId}: ${count} concepts`);
        });
      }
      
      return userTotal;
      
    } finally {
      await session.close();
    }
  });

  test('4. 🔍 Sample User Concepts', async () => {
    console.log(`\n🔍 Getting sample concepts for user: ${TEST_USER_ID}...`);
    
    const session = driver.session({ database: NEO4J_CONFIG.database });
    
    try {
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        RETURN c, labels(c) as nodeLabels
        LIMIT 5
      `, { userId: TEST_USER_ID });
      
      console.log(`📄 Found ${result.records.length} sample concepts:`);
      
      result.records.forEach((record, index) => {
        const node = record.get('c');
        const labels = record.get('nodeLabels');
        
        console.log(`  ${index + 1}. ID: ${node.identity.toString()}`);
        console.log(`     Labels: ${labels.join(', ')}`);
        console.log(`     Name: ${node.properties.name || 'No name'}`);
        console.log(`     User ID: ${node.properties.user_id || 'No user_id'}`);
        console.log(`     Created: ${node.properties.created_at || 'No created_at'}`);
        console.log('');
      });
      
      if (result.records.length === 0) {
        console.log('❌ No concepts found for this user');
        console.log('🔧 This confirms why the brain memory cache is empty');
      }
      
    } finally {
      await session.close();
    }
  });

  test('5. 🧠 Simulate Brain Memory Cache Query', async () => {
    console.log('\n🧠 Simulating the exact query used by brain memory cache...');
    
    const session = driver.session({ database: NEO4J_CONFIG.database });
    
    try {
      // This is the exact query pattern used by the mobile app hooks
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        WITH c, labels(c) as nodeLabels
        RETURN c, nodeLabels
        ORDER BY 
          CASE WHEN c.last_mentioned IS NOT NULL THEN c.last_mentioned ELSE c.created_at END DESC,
          c.name ASC
        LIMIT 100
      `, { userId: TEST_USER_ID });
      
      const concepts = result.records.map((record) => {
        const node = record.get('c');
        const labels = record.get('nodeLabels');
        
        return {
          id: node.identity.toString(),
          labels: labels,
          properties: node.properties
        };
      });
      
      console.log(`🧠 Brain memory cache query returned ${concepts.length} concepts`);
      
      if (concepts.length === 0) {
        console.log('❌ This confirms the brain memory cache issue!');
        console.log('💡 The mobile app user has no concepts in Neo4j');
        console.log('🔧 Solution: Either create concepts for this user or use a different test user');
      } else {
        console.log('✅ Concepts found! There might be a different issue');
        concepts.slice(0, 3).forEach((concept, index) => {
          console.log(`  ${index + 1}. ${concept.properties.name || 'Unnamed'} (${concept.labels.join(', ')})`);
        });
      }
      
      return concepts;
      
    } finally {
      await session.close();
    }
  });

  test('6. 🔄 Test Brain Memory Cache Storage Format', async () => {
    console.log('\n🔄 Testing brain memory cache format simulation...');
    
    const session = driver.session({ database: NEO4J_CONFIG.database });
    
    try {
      // Get some concepts (any user)
      const result = await session.run(`
        MATCH (c:Concept)
        RETURN c, labels(c) as nodeLabels
        LIMIT 5
      `);
      
      if (result.records.length > 0) {
        console.log('📦 Simulating brain memory cache data structure:');
        
        const concepts = result.records.map((record) => {
          const node = record.get('c');
          const labels = record.get('nodeLabels');
          
          return {
            id: node.identity.toString(),
            name: node.properties.name,
            content: node.properties.content,
            description: node.properties.description,
            labels: labels,
            properties: node.properties,
            relevanceScore: node.properties.relevanceScore
          };
        });
        
        const cacheData = {
          concepts: concepts,
          relationships: [],
          totalConcepts: concepts.length,
          lastSynced: new Date().toISOString(),
          cacheVersion: 1,
          dataType: 'neo4j_concepts'
        };
        
        console.log('🧠 Expected cache structure:');
        console.log(JSON.stringify(cacheData, null, 2));
        
        expect(cacheData.concepts.length).toBeGreaterThan(0);
        expect(cacheData.dataType).toBe('neo4j_concepts');
        
      } else {
        console.log('❌ No concepts found to simulate cache structure');
      }
      
    } finally {
      await session.close();
    }
  });
}); 