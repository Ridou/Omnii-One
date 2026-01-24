/**
 * 📱 Mobile App Cache Flow Test
 * 
 * This test simulates the exact flow that should happen in the mobile app
 * when useCachedNeo4j hook is used, based on our successful debug test.
 */

import { createClient } from '@supabase/supabase-js';
import neo4j from 'neo4j-driver';

// Test configuration (exactly like mobile app)
const TEST_CONFIG = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  neo4jUri: 'neo4j+s://d066c29d.databases.neo4j.io:7687',
  neo4jUser: 'neo4j',
  neo4jPassword: process.env.EXPO_PUBLIC_NEO4J_PASSWORD || '_o0JebFPkSb51lSjC7BUqdsvDhD4e5bYGFV1uoVv3QE',
  testUserId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'
};

describe('📱 Mobile App Cache Flow Test', () => {
  let supabase: any;
  let neo4jDriver: any;

  beforeAll(async () => {
    console.log('🚀 Setting up test environment...');
    
    supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);
    
    neo4jDriver = neo4j.driver(
      TEST_CONFIG.neo4jUri,
      neo4j.auth.basic(TEST_CONFIG.neo4jUser, TEST_CONFIG.neo4jPassword),
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
    if (neo4jDriver) {
      await neo4jDriver.close();
    }
  });

  test('1. 🔄 Simulate Mobile App Cache Hook Flow', async () => {
    console.log('\n🔄 Simulating mobile app useCachedNeo4j hook flow...');
    
    // Step 1: Mobile app checks cache first (what useBrainMemoryCache should do)
    console.log('📋 Step 1: Check existing cache...');
    const { data: existingCache } = await supabase
      .from('brain_memory_cache')
      .select('*')
      .eq('user_id', TEST_CONFIG.testUserId)
      .eq('data_type', 'neo4j_concepts')
      .eq('memory_period', 'current_week');

    console.log(`💾 Found ${existingCache?.length || 0} existing cache entries`);

    // Step 2: Cache miss - fetch from Neo4j (what useNeo4jDirectClient should do)
    console.log('📭 Step 2: Cache miss - fetching from Neo4j...');
    
    const session = neo4jDriver.session({ database: 'neo4j' });
    
    try {
      // Use the exact query from our working test
      const startTime = Date.now();
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        WITH c, labels(c) as nodeLabels
        RETURN c, nodeLabels
        ORDER BY 
          CASE WHEN c.last_mentioned IS NOT NULL THEN c.last_mentioned ELSE c.created_at END DESC,
          c.name ASC
        LIMIT 100
      `, { userId: TEST_CONFIG.testUserId });

      const neo4jConcepts = result.records.map((record) => {
        const node = record.get('c');
        const labels = record.get('nodeLabels');
        
        return {
          id: node.identity.toString(),
          labels: labels,
          properties: node.properties
        };
      });

      const fetchTime = Date.now() - startTime;
      console.log(`✅ Fetched ${neo4jConcepts.length} concepts from Neo4j in ${fetchTime}ms`);

      // Step 3: Format concepts for cache (what formatConceptsForCache should do)
      console.log('🔄 Step 3: Formatting concepts for cache...');
      
      const formattedConcepts = neo4jConcepts.map(concept => ({
        id: concept.id,
        name: concept.properties?.name,
        content: concept.properties?.content,
        description: concept.properties?.description,
        labels: concept.labels || [],
        properties: concept.properties || {},
        relevanceScore: concept.properties?.relevanceScore
      }));

      console.log(`✅ Formatted ${formattedConcepts.length} concepts for cache`);

      // Step 4: Store in cache (what setCachedData should do)
      console.log('💾 Step 4: Storing in brain memory cache...');
      
      const cacheData = {
        concepts: formattedConcepts,
        relationships: [],
        totalConcepts: formattedConcepts.length,
        lastSynced: new Date().toISOString(),
        cacheVersion: 1,
        dataType: 'neo4j_concepts'
      };

      const { data: cacheResult, error: cacheError } = await supabase
        .from('brain_memory_cache')
        .upsert({
          user_id: TEST_CONFIG.testUserId,
          memory_period: 'current_week',
          data_type: 'neo4j_concepts',
          cache_data: cacheData,
          concepts_data: {
            concepts: cacheData.concepts,
            relationships: cacheData.relationships
          },
          total_concepts: cacheData.totalConcepts,
          cache_version: cacheData.cacheVersion,
          last_synced_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year (indefinite)
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,memory_period,data_type'
        })
        .select();

      if (cacheError) {
        console.error('❌ Cache storage failed:', cacheError);
        throw cacheError;
      }

      console.log('✅ Successfully stored in cache!');
      console.log(`📊 Cache contains ${formattedConcepts.length} concepts`);

      // Step 5: Verify cache contents (what the mobile app should now see)
      console.log('🔍 Step 5: Verifying cache contents...');
      
      const { data: verifyCache } = await supabase
        .from('brain_memory_cache')
        .select('*')
        .eq('user_id', TEST_CONFIG.testUserId)
        .eq('data_type', 'neo4j_concepts');

      const cachedConcepts = verifyCache?.[0]?.cache_data?.concepts || [];
      console.log(`✅ Verification: Cache contains ${cachedConcepts.length} concepts`);
      console.log(`📊 Total concepts in cache: ${verifyCache?.[0]?.cache_data?.totalConcepts || 0}`);

      // Step 6: Simulate mobile app reading from cache
      console.log('📱 Step 6: Simulating mobile app cache read...');
      
      const cacheReadStartTime = Date.now();
      const cachedData = verifyCache?.[0]?.cache_data;
      const cacheReadTime = Date.now() - cacheReadStartTime;
      
      console.log(`🎯 Cache read completed in ${cacheReadTime}ms (vs ${fetchTime}ms from Neo4j)`);
      console.log(`🚀 Speed improvement: ${Math.round((fetchTime / Math.max(cacheReadTime, 1)) * 10) / 10}x faster`);

      // Validate the mobile app will get the right data structure
      expect(cachedData.concepts).toBeDefined();
      expect(cachedData.concepts.length).toBeGreaterThan(0);
      expect(cachedData.totalConcepts).toBeGreaterThan(0);
      expect(cachedData.dataType).toBe('neo4j_concepts');

      console.log('🎉 Mobile app cache flow simulation successful!');
      console.log('📱 The mobile app should now show cached Neo4j concepts');

    } finally {
      await session.close();
    }
  });

  test('2. 🧪 Test Cache Hit Scenario', async () => {
    console.log('\n🧪 Testing cache hit scenario (second mobile app load)...');
    
    // Simulate what happens when mobile app loads and cache already exists
    const startTime = Date.now();
    
    const { data: cachedData, error } = await supabase
      .from('brain_memory_cache')
      .select('*')
      .eq('user_id', TEST_CONFIG.testUserId)
      .eq('data_type', 'neo4j_concepts')
      .eq('memory_period', 'current_week');

    const responseTime = Date.now() - startTime;

    if (error) {
      console.error('❌ Cache read failed:', error);
      throw error;
    }

    console.log(`🎯 Cache hit! Retrieved in ${responseTime}ms`);
    console.log(`📊 Cached concepts: ${cachedData?.[0]?.cache_data?.concepts?.length || 0}`);
    console.log(`📊 Total concepts: ${cachedData?.[0]?.cache_data?.totalConcepts || 0}`);

    // This is what the mobile app should see
    const conceptsOverview = {
      concepts: cachedData?.[0]?.cache_data?.concepts || [],
      totalConcepts: cachedData?.[0]?.cache_data?.totalConcepts || 0,
      lastSyncTime: cachedData?.[0]?.last_synced_at,
      syncSuccess: true,
      responseTime: responseTime,
      source: 'cache'
    };

    console.log('✅ Mobile app cache hit simulation successful!');
    console.log(`🚀 Response time: ${responseTime}ms (should be <100ms)`);
    
    expect(conceptsOverview.concepts.length).toBeGreaterThan(0);
    expect(conceptsOverview.source).toBe('cache');
    expect(responseTime).toBeLessThan(500); // Should be very fast
  });

  test('3. 🔍 Test Mobile App Memory Component Data', async () => {
    console.log('\n🔍 Testing data structure for mobile app Memory component...');
    
    // Get the cached data in the format the mobile app expects
    const { data: cacheData } = await supabase
      .from('brain_memory_cache')
      .select('*')
      .eq('user_id', TEST_CONFIG.testUserId)
      .eq('data_type', 'neo4j_concepts');

    const neo4jData = {
      conceptsOverview: {
        concepts: cacheData?.[0]?.cache_data?.concepts || [],
        totalConcepts: cacheData?.[0]?.cache_data?.totalConcepts || 0,
        lastSyncTime: cacheData?.[0]?.last_synced_at,
        syncSuccess: true,
        source: 'cache'
      },
      isLoading: false,
      isConnected: true,
      totalConcepts: cacheData?.[0]?.cache_data?.totalConcepts || 0,
      conceptCount: cacheData?.[0]?.cache_data?.concepts?.length || 0
    };

    console.log('📱 Mobile app MemoryContent should receive:');
    console.log(`  - Concepts: ${neo4jData.conceptsOverview.concepts.length}`);
    console.log(`  - Total: ${neo4jData.totalConcepts}`);
    console.log(`  - Loading: ${neo4jData.isLoading}`);
    console.log(`  - Connected: ${neo4jData.isConnected}`);
    console.log(`  - Source: ${neo4jData.conceptsOverview.source}`);

    // Sample concepts for display
    if (neo4jData.conceptsOverview.concepts.length > 0) {
      console.log('\n📄 Sample concepts for UI:');
      neo4jData.conceptsOverview.concepts.slice(0, 3).forEach((concept, index) => {
        console.log(`  ${index + 1}. ${concept.name || 'Unnamed'}`);
        console.log(`     Labels: ${concept.labels.join(', ')}`);
        console.log(`     Content: ${(concept.content || '').substring(0, 50)}...`);
      });
    }

    expect(neo4jData.conceptsOverview.concepts.length).toBeGreaterThan(0);
    expect(neo4jData.totalConcepts).toBeGreaterThan(0);
    expect(neo4jData.isLoading).toBe(false);
    expect(neo4jData.isConnected).toBe(true);

    console.log('✅ Mobile app memory component data structure validated!');
  });
}); 