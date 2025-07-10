#!/usr/bin/env bun

/**
 * 🧠 Populate Neo4j Cache Script
 * 
 * This script fetches real concepts from the Neo4j API
 * and stores them in the brain cache so the mobile app shows them.
 */

import { BrainCacheService } from './src/services/brain-cache.service';

async function populateNeo4jCache() {
  console.log('🧠 Starting Neo4j Cache Population\n');

  const testUserId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'; // Same as mobile app
  const dataType = 'neo4j_concepts';

  try {
    const cacheService = new BrainCacheService();

    // Step 1: Clear existing cache
    console.log('1️⃣ Clearing existing Neo4j cache...');
    await cacheService.clearCachedData(testUserId, dataType);
    console.log('✅ Existing cache cleared');

    // Step 2: Fetch real concepts from Neo4j API
    console.log('\n2️⃣ Fetching real concepts from Neo4j API...');
    const baseUrl = 'http://localhost:8000';
    const response = await fetch(`${baseUrl}/api/neo4j/concepts?user_id=${testUserId}&limit=50`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId,
      },
    });

    if (!response.ok) {
      throw new Error(`Neo4j API failed: ${response.status} ${response.statusText}`);
    }

    const apiData = await response.json();
    const concepts = apiData.data || [];
    
    console.log(`✅ Fetched ${concepts.length} concepts from Neo4j API`);
    
    if (concepts.length > 0) {
      console.log(`📋 Sample concepts:`);
      concepts.slice(0, 3).forEach((concept: any, index: number) => {
        console.log(`   ${index + 1}. ${concept.properties?.name || concept.properties?.title || 'Unnamed'}`);
      });
    }

    // Step 3: Transform concepts to cache format
    console.log('\n3️⃣ Transforming concepts for cache...');
    const cachedConcepts = concepts.map((concept: any) => ({
      id: concept.id,
      name: concept.properties?.name || concept.properties?.title,
      text: concept.properties?.content || concept.properties?.text,
      title: concept.properties?.title || concept.properties?.name,
      content: concept.properties?.content || concept.properties?.description,
      description: concept.properties?.description,
      labels: concept.labels || ['Concept'],
      properties: {
        ...concept.properties,
        user_id: concept.properties?.user_id,
        created_at: concept.properties?.created_at,
        last_mentioned: concept.properties?.last_mentioned,
        activation_strength: concept.properties?.activation_strength || 0.5,
        mention_count: concept.properties?.mention_count || 0,
        keywords: concept.properties?.keywords,
        context: concept.properties?.context,
        importance: concept.properties?.importance,
      },
      relevanceScore: concept.properties?.relevance || concept.properties?.importance || 1
    }));

    // Step 4: Create cache data structure
    const cacheData = {
      concepts: cachedConcepts,
      relationships: [],
      totalConcepts: cachedConcepts.length,
      lastSynced: new Date().toISOString(),
      cacheVersion: 1,
      dataType: 'neo4j_concepts' as const,
    };

    console.log(`✅ Transformed ${cachedConcepts.length} concepts for cache storage`);

    // Step 5: Store in brain cache
    console.log('\n4️⃣ Storing concepts in brain cache...');
    const stored = await cacheService.setCachedData(testUserId, dataType, cacheData);
    
    if (stored) {
      console.log('✅ Concepts stored in brain cache successfully');
    } else {
      throw new Error('Failed to store concepts in cache');
    }

    // Step 6: Verify cache storage
    console.log('\n5️⃣ Verifying cache storage...');
    const retrievedCache = await cacheService.getCachedData(testUserId, dataType);
    
    if (retrievedCache && !cacheService.isExpired(retrievedCache)) {
      const cachedData = retrievedCache.data as any;
      console.log('✅ Cache verification successful:');
      console.log(`   - ${cachedData.concepts?.length || 0} concepts cached`);
      console.log(`   - Total count: ${cachedData.totalConcepts}`);
      console.log(`   - Cache expires: ${retrievedCache.metadata.expiresAt}`);
      
      if (cachedData.concepts?.length > 0) {
        console.log(`   - First concept: ${cachedData.concepts[0].name || 'Unnamed'}`);
      }
    } else {
      throw new Error('Cache verification failed - no valid cache found');
    }

    // Step 7: Final statistics
    console.log('\n📊 Cache statistics:');
    const stats = await cacheService.getCacheStats(testUserId);
    console.log(`   - Total cache entries: ${stats.totalCacheEntries}`);
    console.log(`   - Data types: ${stats.dataTypes.join(', ')}`);

    console.log('\n🎉 Neo4j cache population completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Restart mobile app to see the new concepts');
    console.log('2. Brain Memory should now show "Connected" status');
    console.log('3. Should display 10+ concepts in the Brain Concepts section');
    console.log('4. Search functionality should work with real concept data');

  } catch (error) {
    console.error('❌ Neo4j cache population failed:', error);
    
    if (error instanceof Error && error.message.includes('Missing Supabase configuration')) {
      console.log('\n💡 Note: This script requires Supabase environment variables');
    }
  }
}

// Run population if this file is executed directly
if (import.meta.main) {
  void populateNeo4jCache();
}

export { populateNeo4jCache }; 