import { supabase } from '../../src/lib/supabase';

// Test configuration matching your production setup
const TEST_CONFIG = {
  testUserId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
  expectedMemoryPeriod: 'current_week',
  expectedDataType: 'neo4j_concepts'
};

describe('🔍 Concepts Cache Diagnostic - Production Data Access', () => {
  
  test('1. 📋 Verify Existing Cached Concepts Access', async () => {
    console.log('\n📋 Checking existing cached concepts...');
    
    try {
      // Query exactly what the mobile app should be accessing
      const { data: cacheEntry, error } = await supabase
        .from('brain_memory_cache')
        .select('*')
        .eq('user_id', TEST_CONFIG.testUserId)
        .eq('memory_period', TEST_CONFIG.expectedMemoryPeriod)
        .eq('data_type', TEST_CONFIG.expectedDataType)
        .single();

      if (error) {
        console.error('❌ Cache query failed:', error);
        throw error;
      }

      if (!cacheEntry) {
        console.log('❌ No cache entry found');
        expect(cacheEntry).toBeTruthy();
        return;
      }

      console.log(`✅ Found cache entry:`);
      console.log(`   ID: ${cacheEntry.id}`);
      console.log(`   Memory Period: ${cacheEntry.memory_period}`);
      console.log(`   Data Type: ${cacheEntry.data_type}`);
      console.log(`   Total Concepts: ${cacheEntry.total_concepts}`);
      console.log(`   Created: ${new Date(cacheEntry.created_at).toLocaleString()}`);
      console.log(`   Expires: ${new Date(cacheEntry.expires_at).toLocaleString()}`);
      console.log(`   Is Expired: ${new Date() > new Date(cacheEntry.expires_at) ? 'Yes' : 'No'}`);

      // Check cache data structure
      const cacheData = cacheEntry.cache_data;
      if (cacheData && cacheData.concepts) {
        console.log(`\n🧠 Cached Concepts Analysis:`);
        console.log(`   Total Concepts: ${cacheData.concepts.length}`);
        console.log(`   Cache Data Keys: ${Object.keys(cacheData).join(', ')}`);
        
        // Analyze first few concepts
        const sampleConcepts = cacheData.concepts.slice(0, 3);
        sampleConcepts.forEach((concept: any, index: number) => {
          console.log(`\n   📝 Sample Concept ${index + 1}:`);
          console.log(`      ID: ${concept.id || 'N/A'}`);
          console.log(`      Name: ${concept.name || 'N/A'}`);
          console.log(`      Labels: ${concept.labels ? concept.labels.join(', ') : 'N/A'}`);
          
          if (concept.properties) {
            console.log(`      Properties: ${Object.keys(concept.properties).join(', ')}`);
            console.log(`      Activation Strength: ${concept.properties.activation_strength || 'N/A'}`);
            console.log(`      Mention Count: ${concept.properties.mention_count || 'N/A'}`);
            console.log(`      Keywords: ${concept.properties.keywords || 'N/A'}`);
          }
        });

        // Test search functionality on cached data
        console.log(`\n🔍 Testing Fuzzy Search on Cached Data:`);
        const searchQueries = ['pizza', 'system', 'node'];
        
        searchQueries.forEach(query => {
          const results = cacheData.concepts.filter((concept: any) => {
            const searchText = [
              concept.name,
              concept.properties?.name,
              concept.properties?.keywords,
              concept.properties?.content,
              ...(concept.labels || [])
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchText.includes(query.toLowerCase());
          });
          
          console.log(`   Query "${query}": ${results.length} matches`);
          if (results.length > 0) {
            console.log(`      - ${results[0].name || 'Unknown'}`);
          }
        });

        // Verify the cache is valid for mobile app
        expect(cacheData.concepts).toBeInstanceOf(Array);
        expect(cacheData.concepts.length).toBeGreaterThan(0);
        expect(cacheData.concepts[0]).toHaveProperty('name');
        
        console.log(`\n✅ Cache data is compatible with mobile app!`);
        
      } else {
        console.log('❌ No concepts found in cache data');
        expect(cacheData?.concepts).toBeTruthy();
      }

    } catch (error) {
      console.error('❌ Diagnostic test failed:', error);
      throw error;
    }
  });

  test('2. 🎯 Simulate Mobile App Access Pattern', async () => {
    console.log('\n🎯 Simulating mobile app access...');
    
    // This simulates exactly what useCachedConcepts does
    const startTime = Date.now();
    
    try {
      // Step 1: Check cache validity (what the hook does)
      const { data: cacheEntry, error } = await supabase
        .from('brain_memory_cache')
        .select('*')
        .eq('user_id', TEST_CONFIG.testUserId)
        .eq('memory_period', TEST_CONFIG.expectedMemoryPeriod)
        .eq('data_type', TEST_CONFIG.expectedDataType)
        .single();

      const cacheCheckTime = Date.now() - startTime;
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Cache check failed:', error);
        throw error;
      }

      if (!cacheEntry) {
        console.log('❌ Cache miss - no data found');
        expect(false).toBe(true); // Force failure if no cache
        return;
      }

      // Step 2: Check expiration
      const isExpired = new Date(cacheEntry.expires_at) < new Date();
      if (isExpired) {
        console.log('❌ Cache expired');
        expect(false).toBe(true); // Force failure if expired
        return;
      }

      // Step 3: Extract concepts (what mobile app will see)
      const concepts = cacheEntry.cache_data?.concepts || [];
      const totalTime = Date.now() - startTime;

      console.log(`✅ Mobile App Simulation Results:`);
      console.log(`   Cache Check Time: ${cacheCheckTime}ms`);
      console.log(`   Total Access Time: ${totalTime}ms`);
      console.log(`   Concepts Retrieved: ${concepts.length}`);
      console.log(`   Cache Status: Valid`);
      console.log(`   Expected UI Display: ${Math.min(concepts.length, 4)} concepts shown`);

      // Step 4: Test component data mapping
      const sampleConcept = concepts[0];
      const uiDisplayText = sampleConcept?.name || 
                           sampleConcept?.properties?.name || 
                           'Unknown Concept';
      
      console.log(`\n📱 UI Component Mapping Test:`);
      console.log(`   Display Name: "${uiDisplayText}"`);
      console.log(`   Labels: ${sampleConcept?.labels?.join(', ') || 'N/A'}`);
      console.log(`   Activation Strength: ${sampleConcept?.properties?.activation_strength || 'N/A'}`);
      
      // Verify mobile app will work
      expect(totalTime).toBeLessThan(2000); // Should be fast
      expect(concepts.length).toBeGreaterThan(0);
      expect(uiDisplayText).not.toBe('Unknown Concept');
      
      console.log(`\n🎉 Mobile app should now display ${concepts.length} concepts!`);

    } catch (error) {
      console.error('❌ Mobile app simulation failed:', error);
      throw error;
    }
  });

  test('3. 🔧 Generate Component Test Data', async () => {
    console.log('\n🔧 Generating test data for component validation...');
    
    try {
      const { data: cacheEntry } = await supabase
        .from('brain_memory_cache')
        .select('cache_data')
        .eq('user_id', TEST_CONFIG.testUserId)
        .eq('memory_period', TEST_CONFIG.expectedMemoryPeriod)
        .eq('data_type', TEST_CONFIG.expectedDataType)
        .single();

      if (cacheEntry?.cache_data?.concepts) {
        const concepts = cacheEntry.cache_data.concepts.slice(0, 5);
        
        console.log(`📋 Component Test Data (First 5 Concepts):`);
        concepts.forEach((concept: any, index: number) => {
          console.log(`\n${index + 1}. ${concept.name || 'Unknown'}`);
          console.log(`   Labels: [${concept.labels?.join(', ') || 'Concept'}]`);
          console.log(`   Properties: {`);
          console.log(`     activation_strength: ${concept.properties?.activation_strength || 0.5},`);
          console.log(`     mention_count: ${concept.properties?.mention_count || 0},`);
          console.log(`     keywords: "${concept.properties?.keywords || 'N/A'}"`);
          console.log(`   }`);
        });

        expect(concepts.length).toBeGreaterThan(0);
        console.log(`\n✅ Test data generated for ${concepts.length} concepts`);
        
      } else {
        console.log('❌ No test data available');
        expect(false).toBe(true);
      }

    } catch (error) {
      console.error('❌ Test data generation failed:', error);
      throw error;
    }
  });
});

/**
 * 🎯 Diagnostic Summary
 * 
 * This test validates that the mobile app can access existing cached concepts:
 * 
 * ✅ Cache Entry Access: Verifies current_week/neo4j_concepts cache exists
 * ✅ Data Structure: Confirms concepts array with proper fields
 * ✅ Mobile App Simulation: Tests exact access pattern from useCachedConcepts
 * ✅ Component Compatibility: Validates UI can display the cached data
 * ✅ Performance: Confirms sub-2000ms access times
 * 
 * Expected Result: Mobile app should display cached concepts immediately
 */ 