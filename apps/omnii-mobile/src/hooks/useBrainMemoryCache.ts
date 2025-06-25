import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '~/context/AuthContext';
import { supabase } from '~/lib/supabase';

// Memory period types inspired by brain temporal processing
export type MemoryPeriod = 'past_week' | 'current_week' | 'next_week';

// Brain memory cache data structure
interface BrainMemoryConcept {
  id: string;
  name?: string;
  content?: string;
  description?: string;
  labels: string[];
  properties: Record<string, any>;
  relevanceScore?: number;
}

interface BrainMemoryData {
  concepts: BrainMemoryConcept[];
  relationships: any[];
  totalConcepts: number;
  lastSynced: string;
  cacheVersion: number;
}

interface CacheEntry {
  id: string;
  user_id: string;
  memory_period: MemoryPeriod;
  concepts_data: BrainMemoryData;
  total_concepts: number;
  cache_version: number;
  last_synced_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface CacheStats {
  cache_hits: number;
  cache_misses: number;
  neo4j_queries_saved: number;
  avg_response_time_ms: number;
}

interface CacheStatus {
  isLoading: boolean;
  isValid: boolean;
  lastUpdated?: string;
  expiresAt?: string;
  hitRatio?: number;
}

// Helper function to calculate memory period date ranges
const getMemoryPeriodDates = (period: MemoryPeriod) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);

  switch (period) {
    case 'past_week':
      const pastWeekStart = new Date(startOfWeek);
      pastWeekStart.setDate(startOfWeek.getDate() - 7);
      const pastWeekEnd = new Date(startOfWeek);
      pastWeekEnd.setSeconds(-1); // End of previous week
      return { start: pastWeekStart, end: pastWeekEnd };

    case 'current_week':
      const currentWeekEnd = new Date(startOfWeek);
      currentWeekEnd.setDate(startOfWeek.getDate() + 6);
      currentWeekEnd.setHours(23, 59, 59, 999);
      return { start: startOfWeek, end: currentWeekEnd };

    case 'next_week':
      const nextWeekStart = new Date(startOfWeek);
      nextWeekStart.setDate(startOfWeek.getDate() + 7);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      nextWeekEnd.setHours(23, 59, 59, 999);
      return { start: nextWeekStart, end: nextWeekEnd };

    default:
      return { start: startOfWeek, end: new Date() };
  }
};

export const useBrainMemoryCache = (period: MemoryPeriod = 'current_week') => {
  const { user } = useAuth();
  const [cache, setCache] = useState<BrainMemoryData | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isLoading: false,
    isValid: false
  });
  const [stats, setStats] = useState<CacheStats>({
    cache_hits: 0,
    cache_misses: 0,
    neo4j_queries_saved: 0,
    avg_response_time_ms: 0
  });

  // Check if cache exists and is valid for the given period
  const checkCacheValidity = useCallback(async (): Promise<CacheEntry | null> => {
    if (!user?.id) return null;

    try {
      console.log(`[BrainCache] 🔍 Checking cache for period: ${period}`);
      
      const { data, error } = await supabase
        .from('brain_memory_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('memory_period', period)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('[BrainCache] ❌ Error checking cache:', error);
        return null;
      }

      if (!data) {
        console.log('[BrainCache] 📭 No cache entry found for period:', period);
        return null;
      }

      // Check if cache is expired
      const expiresAt = new Date(data.expires_at);
      const isExpired = expiresAt < new Date();

      if (isExpired) {
        console.log('[BrainCache] ⏰ Cache expired for period:', period);
        return null;
      }

      console.log(`[BrainCache] ✅ Valid cache found: ${data.total_concepts} concepts`);
      return data;

    } catch (error) {
      console.error('[BrainCache] ❌ Error in cache validity check:', error);
      return null;
    }
  }, [user?.id, period]);

  // Get cached data (cache hit)
  const getCachedData = useCallback(async (): Promise<BrainMemoryData | null> => {
    const startTime = Date.now();
    setCacheStatus(prev => ({ ...prev, isLoading: true }));

    try {
      const cacheEntry = await checkCacheValidity();
      
      if (cacheEntry) {
        // Cache hit! 🎯
        await updateCacheStats('hit', Date.now() - startTime);
        
        const cacheData = cacheEntry.concepts_data as BrainMemoryData;
        setCache(cacheData);
        setCacheStatus({
          isLoading: false,
          isValid: true,
          lastUpdated: cacheEntry.last_synced_at,
          expiresAt: cacheEntry.expires_at
        });

        console.log(`[BrainCache] 🎯 Cache HIT for ${period}: ${cacheData.concepts.length} concepts in ${Date.now() - startTime}ms`);
        return cacheData;
      } else {
        // Cache miss 📭
        await updateCacheStats('miss', Date.now() - startTime);
        
        setCacheStatus({
          isLoading: false,
          isValid: false
        });

        console.log(`[BrainCache] 📭 Cache MISS for ${period} in ${Date.now() - startTime}ms`);
        return null;
      }
    } catch (error) {
      console.error('[BrainCache] ❌ Error getting cached data:', error);
      setCacheStatus({ isLoading: false, isValid: false });
      return null;
    }
  }, [checkCacheValidity, period]);

  // Store data in cache
  const setCachedData = useCallback(async (data: BrainMemoryData): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      console.log(`[BrainCache] 💾 Storing cache for ${period}: ${data.concepts.length} concepts`);

      const cacheEntry = {
        user_id: user.id,
        memory_period: period,
        concepts_data: data,
        total_concepts: data.concepts.length,
        cache_version: data.cacheVersion || 1,
        last_synced_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      const { error } = await supabase
        .from('brain_memory_cache')
        .upsert(cacheEntry, {
          onConflict: 'user_id,memory_period'
        });

      if (error) {
        console.error('[BrainCache] ❌ Error storing cache:', error);
        return false;
      }

      setCache(data);
      setCacheStatus({
        isLoading: false,
        isValid: true,
        lastUpdated: cacheEntry.last_synced_at,
        expiresAt: cacheEntry.expires_at
      });

      console.log(`[BrainCache] ✅ Cache stored successfully for ${period}`);
      return true;

    } catch (error) {
      console.error('[BrainCache] ❌ Error in setCachedData:', error);
      return false;
    }
  }, [user?.id, period]);

  // Update cache statistics
  const updateCacheStats = useCallback(async (operation: 'hit' | 'miss', responseTime: number) => {
    if (!user?.id) return;

    try {
      // Get current stats
      const { data: currentStats } = await supabase
        .from('brain_memory_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const newStats = {
        user_id: user.id,
        cache_hits: operation === 'hit' ? (currentStats?.cache_hits || 0) + 1 : (currentStats?.cache_hits || 0),
        cache_misses: operation === 'miss' ? (currentStats?.cache_misses || 0) + 1 : (currentStats?.cache_misses || 0),
        neo4j_queries_saved: operation === 'hit' ? (currentStats?.neo4j_queries_saved || 0) + 1 : (currentStats?.neo4j_queries_saved || 0),
        avg_response_time_ms: Math.round(
          ((currentStats?.avg_response_time_ms || 0) + responseTime) / 
          ((currentStats?.cache_hits || 0) + (currentStats?.cache_misses || 0) + 1)
        )
      };

      await supabase
        .from('brain_memory_stats')
        .upsert(newStats, { onConflict: 'user_id' });

      setStats(newStats);

      // Calculate hit ratio
      const totalRequests = newStats.cache_hits + newStats.cache_misses;
      const hitRatio = totalRequests > 0 ? Math.round((newStats.cache_hits / totalRequests) * 100) : 0;

      setCacheStatus(prev => ({ ...prev, hitRatio }));

    } catch (error) {
      console.error('[BrainCache] ❌ Error updating stats:', error);
    }
  }, [user?.id]);

  // Invalidate cache for a specific period
  const invalidateCache = useCallback(async (targetPeriod?: MemoryPeriod): Promise<boolean> => {
    if (!user?.id) return false;

    const periodToInvalidate = targetPeriod || period;

    try {
      console.log(`[BrainCache] 🗑️ Invalidating cache for period: ${periodToInvalidate}`);

      const { error } = await supabase
        .from('brain_memory_cache')
        .delete()
        .eq('user_id', user.id)
        .eq('memory_period', periodToInvalidate);

      if (error) {
        console.error('[BrainCache] ❌ Error invalidating cache:', error);
        return false;
      }

      // Clear local cache if it's the current period
      if (periodToInvalidate === period) {
        setCache(null);
        setCacheStatus({ isLoading: false, isValid: false });
      }

      console.log(`[BrainCache] ✅ Cache invalidated for ${periodToInvalidate}`);
      return true;

    } catch (error) {
      console.error('[BrainCache] ❌ Error in invalidateCache:', error);
      return false;
    }
  }, [user?.id, period]);

  // Get cache statistics
  const getCacheStats = useCallback(async (): Promise<CacheStats | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('brain_memory_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[BrainCache] ❌ Error getting stats:', error);
        return null;
      }

      const statsData = data || {
        cache_hits: 0,
        cache_misses: 0,
        neo4j_queries_saved: 0,
        avg_response_time_ms: 0
      };

      setStats(statsData);
      return statsData;

    } catch (error) {
      console.error('[BrainCache] ❌ Error in getCacheStats:', error);
      return null;
    }
  }, [user?.id]);

  // Initialize cache stats on mount
  useEffect(() => {
    if (user?.id) {
      getCacheStats();
    }
  }, [user?.id, getCacheStats]);

  return {
    // Cache data
    cache,
    cacheStatus,
    stats,
    
    // Cache operations
    getCachedData,
    setCachedData,
    invalidateCache,
    getCacheStats,
    
    // Utility functions
    checkCacheValidity,
    getMemoryPeriodDates: () => getMemoryPeriodDates(period),
    
    // Computed values
    isLoading: cacheStatus.isLoading,
    isValid: cacheStatus.isValid,
    hitRatio: cacheStatus.hitRatio,
    conceptCount: cache?.concepts.length || 0,
    
    // Memory period info
    currentPeriod: period,
    periodDates: getMemoryPeriodDates(period)
  };
}; 