#!/usr/bin/env bun

/**
 * 🧹 Clear Test Cache Data Script
 * 
 * This script removes test email data from the brain cache
 * and allows fresh Gmail data to be fetched.
 */

import { BrainCacheService } from './src/services/brain-cache.service';

async function clearTestCache() {
  console.log('🧹 Starting Test Cache Cleanup\n');

  const testUserId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'; // Same as mobile app
  const dataTypes = ['google_emails', 'google_tasks', 'google_calendar', 'google_contacts'];

  try {
    const cacheService = new BrainCacheService();

    // Clear all cached data types for test user
    for (const dataType of dataTypes) {
      console.log(`🗑️ Clearing ${dataType} cache...`);
      
      const cleared = await cacheService.clearCachedData(testUserId, dataType);
      if (cleared) {
        console.log(`✅ ${dataType} cache cleared successfully`);
      } else {
        console.log(`⚠️ ${dataType} cache was already empty or failed to clear`);
      }
    }

    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    for (const dataType of dataTypes) {
      const cachedData = await cacheService.getCachedData(testUserId, dataType);
      if (!cachedData) {
        console.log(`✅ ${dataType} - No cached data found (clean)`);
      } else {
        console.log(`⚠️ ${dataType} - Cache still exists!`);
      }
    }

    // Show cache statistics
    console.log('\n📊 Final cache stats:');
    const stats = await cacheService.getCacheStats(testUserId);
    console.log(`- Total entries: ${stats.totalCacheEntries}`);
    console.log(`- Data types: ${stats.dataTypes.join(', ') || 'none'}`);

    console.log('\n🎉 Test cache cleanup completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Restart mobile app to trigger fresh API calls');
    console.log('2. Check that real Gmail/Tasks data appears instead of test data');
    console.log('3. Verify cache hit rates in logs show real data being cached');

  } catch (error) {
    console.error('❌ Cache cleanup failed:', error);
    
    if (error instanceof Error && error.message.includes('Missing Supabase configuration')) {
      console.log('\n💡 Note: This script requires Supabase environment variables');
      console.log('Make sure .env file exists in packages/api/ with:');
      console.log('- NEXT_PUBLIC_SUPABASE_URL');
      console.log('- SUPABASE_SERVICE_ROLE_KEY');
    }
  }
}

// Run cleanup if this file is executed directly
if (import.meta.main) {
  void clearTestCache();
}

export { clearTestCache }; 