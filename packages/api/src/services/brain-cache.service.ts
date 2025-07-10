import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

interface CacheMetadata {
  lastSynced: string;
  expiresAt: string;
  cacheVersion: number;
}

interface CachedDataResult {
  data: unknown;
  metadata: CacheMetadata;
}

export class BrainCacheService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get cached data for a user and data type
   */
  async getCachedData(userId: string, dataType: string): Promise<CachedDataResult | null> {
    try {
      console.log(`[BrainCache] 📖 Getting cached data: ${dataType} for user: ${userId}`);
      
      const { data, error } = await this.supabase
        .from('brain_memory_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('data_type', dataType)
        .single();

      if (error ?? !data) {
        console.log(`[BrainCache] 📭 No cache found for ${dataType}: ${error?.message ?? 'not found'}`);
        return null;
      }

      console.log(`[BrainCache] 📖 Cache found for ${dataType}, checking expiration...`);
      
      // Type assertion for Supabase response
      const cacheRow = data as {
        cache_data: unknown;
        last_synced_at: string;
        expires_at: string;
        cache_version: number;
      };
      
      return {
        data: cacheRow.cache_data,  // ← The actual concepts are here
        metadata: {
          lastSynced: cacheRow.last_synced_at,
          expiresAt: cacheRow.expires_at,
          cacheVersion: cacheRow.cache_version ?? 1
        }
      };
    } catch (error) {
      console.error('[BrainCache] ❌ Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Store data in cache with appropriate expiration
   */
  async setCachedData(userId: string, dataType: string, cacheData: any): Promise<boolean> {
    try {
      console.log(`[BrainCache] 💾 Setting cached data: ${dataType} for user: ${userId}`);
      
      const expirationMs = this.getExpirationMs(dataType);
      const expiresAt = new Date(Date.now() + expirationMs).toISOString();
      const now = new Date().toISOString();

      const { error } = await this.supabase
        .from('brain_memory_cache')
        .upsert({
          user_id: userId,
          data_type: dataType,
          memory_period: this.getMemoryPeriod(dataType), // Map to correct memory_period
          cache_data: cacheData,
          expires_at: expiresAt,
          last_synced_at: now,
          cache_version: 1
        }, { 
          onConflict: 'user_id,data_type,memory_period' 
        });

      if (error) {
        console.error('[BrainCache] ❌ Error setting cached data:', error);
        return false;
      }

      console.log(`[BrainCache] ✅ Cache stored for ${dataType}, expires: ${expiresAt}`);
      return true;
    } catch (error) {
      console.error('[BrainCache] ❌ Error in setCachedData:', error);
      return false;
    }
  }

  /**
   * Check if cached data is expired
   */
  isExpired(cachedResult: CachedDataResult): boolean {
    if (!cachedResult.metadata?.expiresAt) {
      return true;
    }
    
    const isExpired = new Date(cachedResult.metadata.expiresAt) < new Date();
    console.log(`[BrainCache] 🕐 Cache expiry check: ${isExpired ? 'EXPIRED' : 'VALID'}`);
    return isExpired;
  }

  /**
   * Map data_type to memory_period based on database constraint
   */
  private getMemoryPeriod(dataType: string): string {
    const memoryPeriodMap = {
      'google_emails': 'emails',
      'google_tasks': 'tasks', 
      'google_calendar': 'calendar',
      'google_contacts': 'contacts',
      'neo4j_concepts': 'current_week'
    };
    
    const period = memoryPeriodMap[dataType as keyof typeof memoryPeriodMap] || 'current_week';
    console.log(`[BrainCache] 🗂️ ${dataType} → memory_period: ${period}`);
    return period;
  }

  /**
   * Get expiration time in milliseconds based on data volatility
   */
  private getExpirationMs(dataType: string): number {
    const expirations = {
      'google_emails': 5 * 60 * 1000,        // 5 minutes (high volatility)
      'google_tasks': 30 * 60 * 1000,        // 30 minutes (medium volatility)
      'google_calendar': 2 * 60 * 60 * 1000, // 2 hours (low volatility)
      'google_contacts': 24 * 60 * 60 * 1000 // 24 hours (very low volatility)
    };
    
    const expiration = expirations[dataType as keyof typeof expirations] || 60 * 60 * 1000; // 1 hour default
    console.log(`[BrainCache] ⏱️ ${dataType} expiration: ${expiration}ms`);
    return expiration;
  }

  /**
   * Clear cached data for a user and data type (for testing/debugging)
   */
  async clearCachedData(userId: string, dataType: string): Promise<boolean> {
    try {
      console.log(`[BrainCache] 🗑️ Clearing cached data: ${dataType} for user: ${userId}`);
      
      const { error } = await this.supabase
        .from('brain_memory_cache')
        .delete()
        .eq('user_id', userId)
        .eq('data_type', dataType);

      if (error) {
        console.error('[BrainCache] ❌ Error clearing cached data:', error);
        return false;
      }

      console.log(`[BrainCache] 🗑️ Cache cleared for ${dataType}`);
      return true;
    } catch (error) {
      console.error('[BrainCache] ❌ Error in clearCachedData:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(userId: string): Promise<{
    totalCacheEntries: number;
    dataTypes: string[];
    oldestEntry: string | null;
    newestEntry: string | null;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('brain_memory_cache')
        .select('data_type, last_synced_at')
        .eq('user_id', userId);

      if (error || !data) {
        return {
          totalCacheEntries: 0,
          dataTypes: [],
          oldestEntry: null,
          newestEntry: null
        };
      }

      const sortedBySyncTime = data.sort((a, b) => 
        new Date(a.last_synced_at).getTime() - new Date(b.last_synced_at).getTime()
      );

      return {
        totalCacheEntries: data.length,
        dataTypes: [...new Set(data.map(d => d.data_type))],
        oldestEntry: sortedBySyncTime[0]?.last_synced_at || null,
        newestEntry: sortedBySyncTime[sortedBySyncTime.length - 1]?.last_synced_at || null
      };
    } catch (error) {
      console.error('[BrainCache] ❌ Error getting cache stats:', error);
      return {
        totalCacheEntries: 0,
        dataTypes: [],
        oldestEntry: null,
        newestEntry: null
      };
    }
  }
} 