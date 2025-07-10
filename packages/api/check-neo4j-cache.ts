#!/usr/bin/env bun

/**
 * 🔍 Neo4j Cache & Connection Checker
 * 
 * This script checks:
 * 1. What's in the Neo4j concepts cache
 * 2. Tests Neo4j connection via tRPC endpoints
 * 3. Verifies the mobile app should see concepts
 */

import { BrainCacheService } from './src/services/brain-cache.service';

async function checkNeo4jCache() {
  console.log('🔍 Starting Neo4j Cache & Connection Check\n');

  const testUserId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'; // Same as mobile app

  try {
    const cacheService = new BrainCacheService();

    // Check what's in Neo4j concepts cache
    console.log('1️⃣ Checking Neo4j concepts cache...');
    const cachedConcepts = await cacheService.getCachedData(testUserId, 'neo4j_concepts');
    
    if (cachedConcepts) {
      console.log('✅ Found Neo4j concepts cache:');
      const conceptsData = cachedConcepts.data as any;
      console.log(`   - Cache age: ${new Date().getTime() - new Date(cachedConcepts.metadata.lastSynced).getTime()}ms`);
      console.log(`   - Expires at: ${cachedConcepts.metadata.expiresAt}`);
      console.log(`   - Is expired: ${cacheService.isExpired(cachedConcepts)}`);
      
      // Analyze cache structure
      if (conceptsData?.concepts) {
        console.log(`   - Concepts array: ${conceptsData.concepts.length} items`);
        if (conceptsData.concepts.length > 0) {
          console.log(`   - First concept: ${JSON.stringify(conceptsData.concepts[0], null, 2)}`);
        }
      } else {
        console.log(`   - Cache structure: ${Object.keys(conceptsData || {}).join(', ')}`);
        console.log(`   - Full cache data: ${JSON.stringify(conceptsData, null, 2)}`);
      }
    } else {
      console.log('📭 No Neo4j concepts cache found');
    }

    console.log('\n2️⃣ Testing Neo4j API endpoints...');
    
    // Test the direct Neo4j API endpoints that mobile app uses
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': testUserId,
    };

    try {
      console.log(`🔗 Testing ${baseUrl}/api/neo4j/concepts...`);
      const conceptsResponse = await fetch(`${baseUrl}/api/neo4j/concepts?user_id=${testUserId}&limit=10`, {
        method: 'GET',
        headers,
      });
      
      console.log(`📡 Response status: ${conceptsResponse.status}`);
      
      if (conceptsResponse.ok) {
        const conceptsData = await conceptsResponse.json();
        console.log(`✅ Concepts API working: ${JSON.stringify(conceptsData, null, 2)}`);
      } else {
        const errorText = await conceptsResponse.text();
        console.log(`❌ Concepts API failed: ${errorText}`);
      }
    } catch (apiError) {
      console.log(`❌ Concepts API connection failed: ${apiError}`);
    }

    try {
      console.log(`🔗 Testing ${baseUrl}/api/neo4j/concepts/search...`);
      const searchResponse = await fetch(`${baseUrl}/api/neo4j/concepts/search?user_id=${testUserId}&q=test`, {
        method: 'GET',
        headers,
      });
      
      console.log(`📡 Search response status: ${searchResponse.status}`);
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log(`✅ Search API working: ${JSON.stringify(searchData, null, 2)}`);
      } else {
        const errorText = await searchResponse.text();
        console.log(`❌ Search API failed: ${errorText}`);
      }
    } catch (apiError) {
      console.log(`❌ Search API connection failed: ${apiError}`);
    }

    console.log('\n3️⃣ Testing tRPC Neo4j endpoints...');
    
    // Test tRPC endpoints (what mobile app actually uses)
    try {
      console.log(`🔗 Testing tRPC neo4j.listNodes...`);
      const tRPCResponse = await fetch(`${baseUrl}/api/trpc/neo4j.listNodes?input=${encodeURIComponent(JSON.stringify({ nodeType: 'Concept', limit: 10 }))}`, {
        method: 'GET',
        headers,
      });
      
      console.log(`📡 tRPC response status: ${tRPCResponse.status}`);
      
      if (tRPCResponse.ok) {
        const tRPCData = await tRPCResponse.json();
        console.log(`✅ tRPC Neo4j working: ${JSON.stringify(tRPCData, null, 2)}`);
      } else {
        const errorText = await tRPCResponse.text();
        console.log(`❌ tRPC Neo4j failed: ${errorText}`);
      }
    } catch (tRPCError) {
      console.log(`❌ tRPC Neo4j connection failed: ${tRPCError}`);
    }

    console.log('\n📊 Final analysis...');
    const stats = await cacheService.getCacheStats(testUserId);
    console.log(`- Total cache entries: ${stats.totalCacheEntries}`);
    console.log(`- Data types: ${stats.dataTypes.join(', ')}`);
    
    console.log('\n🎯 Diagnosis:');
    if (cachedConcepts && !cacheService.isExpired(cachedConcepts)) {
      console.log('✅ Neo4j cache exists and is valid');
      const conceptsData = cachedConcepts.data as any;
      if (conceptsData?.concepts?.length > 0) {
        console.log('✅ Cache contains concepts - mobile app should show them');
        console.log('🔍 Issue likely: Mobile app using wrong hook or cache key');
      } else {
        console.log('⚠️ Cache exists but contains no concepts');
        console.log('🔍 Issue likely: Neo4j database is empty or connection failed');
      }
    } else {
      console.log('⚠️ No valid Neo4j cache - mobile app needs to fetch fresh data');
      console.log('🔍 Issue likely: Neo4j API endpoints not working or authentication failed');
    }

  } catch (error) {
    console.error('❌ Neo4j check failed:', error);
  }
}

// Run check if this file is executed directly
if (import.meta.main) {
  void checkNeo4jCache();
}

export { checkNeo4jCache }; 