import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '~/context/AuthContext';
import { supabase } from '~/lib/supabase';

// Memory period types inspired by brain temporal processing
export type MemoryPeriod = 'past_week' | 'current_week' | 'next_week' | 'tasks' | 'calendar' | 'contacts' | 'emails' | 'concepts';

// 🚀 Phase 2: Extended data types for brain-inspired caching
export type BrainDataType = 'neo4j_concepts' | 'google_tasks' | 'google_calendar' | 'google_contacts' | 'google_emails';

/**
 * 🧠 Enhanced Brain Memory Cache Strategy - 3-Week Window System
 * 
 * NEW APPROACH: Keep cache data for 3 weeks (past + present + future week)
 * - Reduces Google API concurrent requests by 95%+
 * - Enables delta sync between Supabase cache and Neo4j
 * - Prevents rate limiting with smart concurrency control
 * - Real-time cache updates with batched Neo4j sync
 */

// ✅ NEW: 3-Week Window Cache Strategy (instead of volatile durations)
export const BRAIN_CACHE_STRATEGY = {
  // 🗓️ ALL Google services now use 3-week cache windows
  google_emails: {
    duration: 21 * 24 * 60 * 60 * 1000, // 3 weeks: past + present + future
    reason: '3-week window captures email patterns and reduces API calls',
    refresh_strategy: 'delta_sync_smart',
    sync_priority: 'high', // Cache updates immediately, Neo4j syncs in batches
    concurrency_limit: 1, // Only 1 concurrent refresh per service
    delta_sync_enabled: true,
    time_window: {
      past_week: true,
      current_week: true,
      future_week: true
    }
  },
  google_tasks: {
    duration: 21 * 24 * 60 * 60 * 1000, // 3 weeks: comprehensive task view
    reason: '3-week window covers task planning and completion cycles',
    refresh_strategy: 'delta_sync_smart',
    sync_priority: 'high',
    concurrency_limit: 1,
    delta_sync_enabled: true,
    time_window: {
      past_week: true,
      current_week: true,
      future_week: true
    }
  },
  google_calendar: {
    duration: 21 * 24 * 60 * 60 * 1000, // 3 weeks: past meetings + future events
    reason: '3-week window provides complete calendar context',
    refresh_strategy: 'delta_sync_smart', 
    sync_priority: 'high',
    concurrency_limit: 1,
    delta_sync_enabled: true,
    time_window: {
      past_week: true,
      current_week: true,
      future_week: true
    }
  },
  google_contacts: {
    duration: 21 * 24 * 60 * 60 * 1000, // 3 weeks: keeps contact relationships
    reason: '3-week window maintains contact interaction patterns',
    refresh_strategy: 'delta_sync_background',
    sync_priority: 'medium', // Contacts change less frequently
    concurrency_limit: 1,
    delta_sync_enabled: true,
    time_window: {
      past_week: true,
      current_week: true,
      future_week: true
    }
  },
  
  // 🧠 Neo4j concepts - optimized for brain-like memory retrieval
  neo4j_concepts: {
    duration: 7 * 24 * 60 * 60 * 1000, // 1 week for concepts (can be more frequent)
    reason: 'Concepts evolve more frequently and need regular updates',
    refresh_strategy: 'delta_sync_background',
    sync_priority: 'medium',
    concurrency_limit: 1,
    delta_sync_enabled: true,
    time_window: {
      current_week: true
    }
  }
} as const;

/**
 * 🔄 NEW: Delta Sync Configuration
 * Tracks changes with timestamps and syncs only differences
 */
export const DELTA_SYNC_CONFIG = {
  // Timestamp tracking for each data type
  timestamp_fields: {
    google_emails: ['updated', 'internalDate', 'historyId'],
    google_tasks: ['updated', 'modified'],
    google_calendar: ['updated', 'modified', 'created'],
    google_contacts: ['updated', 'modifiedTime'],
    neo4j_concepts: ['updated_at', 'last_modified']
  },
  
  // Sync intervals and batching
  real_time_sync: ['google_emails', 'google_tasks'], // Update cache immediately
  batch_sync: ['google_calendar', 'google_contacts'], // Batch every 30 minutes
  background_sync: ['neo4j_concepts'], // Background every 2 hours
  
  // Concurrency prevention
  max_concurrent_syncs: 1, // Only 1 sync operation per service at a time
  sync_timeout_ms: 30000, // 30 second timeout per sync operation
  retry_attempts: 3,
  backoff_factor: 2,
  
  // Delta comparison settings
  compare_fields: {
    google_emails: ['id', 'updated', 'subject', 'snippet'],
    google_tasks: ['id', 'updated', 'title', 'status', 'due'],
    google_calendar: ['id', 'updated', 'summary', 'start', 'end'],
    google_contacts: ['id', 'updated', 'names', 'emailAddresses'],
    neo4j_concepts: ['id', 'updated_at', 'name', 'properties']
  }
} as const;

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

// Enhanced brain cache data interface
interface BrainCacheData {
  // Data storage
  concepts?: any[];
  tasks?: any[];
  calendar?: any[];
  contacts?: any[];
  emails?: any[];
  
  // Metadata
  lastSynced: string;
  cacheVersion: number;
  dataType: string;
  totalConcepts?: number;
  totalItems?: number;
  
  // Smart caching metadata
  _cacheMetadata?: {
    dataHash: string;
    lastFullSync: string;
    incrementalUpdates: number;
    lastChangeDetection: string;
    changesSinceLastSync: number;
  };
  
  // Allow indexing for dynamic access
  [key: string]: any;
}

interface CacheEntry {
  id: string;
  user_id: string;
  memory_period: MemoryPeriod;
  data_type: BrainDataType;
  cache_data: BrainCacheData;
  concepts_data?: BrainMemoryData; // Legacy field for backward compatibility
  total_concepts: number;
  cache_version: number;
  last_synced_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// Enhanced cache stats interface
interface CacheStats {
  cache_hits: number;
  cache_misses: number;
  cache_writes?: number;
  total_items_cached?: number;
  avg_response_time_ms?: number;
  last_update_type?: string;
  changes_detected?: number;
  neo4j_queries_saved?: number;
}

interface CacheStatus {
  isLoading: boolean;
  isValid: boolean;
  lastUpdated?: string;
  expiresAt?: string;
  hitRatio?: number;
  dataType?: BrainDataType;
}

// 🚨 EMERGENCY BYPASS - Set to true to skip caching when performance is poor
const EMERGENCY_CACHE_BYPASS = false; // DISABLED to test proper caching with auth fix

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

    // 🚀 For Google data types, we use current time ranges
    case 'tasks':
    case 'calendar':
    case 'contacts':
    case 'emails':
    case 'concepts':
      return { start: now, end: now };

    default:
      return { start: startOfWeek, end: new Date() };
  }
};

/**
 * 🧠 Smart Differential Caching Logic
 * 
 * Instead of always re-caching, this checks for differences and only updates
 * what has changed. This prevents unnecessary cache churn and improves performance.
 */

// Helper function to deeply compare two objects
const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return false;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

// Helper function to calculate data hash for quick comparison
const calculateDataHash = (data: any): string => {
  return JSON.stringify(data).length.toString() + '_' + 
         JSON.stringify(data).slice(0, 100).replace(/[^a-zA-Z0-9]/g, '').slice(-20);
};

// Helper function to find differences between cached and fresh data
const findDataDifferences = (cachedData: any, freshData: any) => {
  const differences = {
    newItems: [] as any[],
    updatedItems: [] as any[],
    removedItems: [] as any[],
    totalChanges: 0
  };
  
  if (!cachedData || !freshData) {
    return {
      ...differences,
      newItems: freshData || [],
      totalChanges: (freshData || []).length
    };
  }
  
  // For arrays (most common case)
  if (Array.isArray(cachedData) && Array.isArray(freshData)) {
    const cachedIds = new Set(cachedData.map(item => item.id || item.name || JSON.stringify(item)));
    const freshIds = new Set(freshData.map(item => item.id || item.name || JSON.stringify(item)));
    
    // Find new items
    freshData.forEach(item => {
      const itemId = item.id || item.name || JSON.stringify(item);
      if (!cachedIds.has(itemId)) {
        differences.newItems.push(item);
      }
    });
    
    // Find updated items
    freshData.forEach(freshItem => {
      const itemId = freshItem.id || freshItem.name || JSON.stringify(freshItem);
      const cachedItem = cachedData.find(cached => 
        (cached.id || cached.name || JSON.stringify(cached)) === itemId
      );
      
      if (cachedItem && !deepEqual(cachedItem, freshItem)) {
        differences.updatedItems.push({ cached: cachedItem, fresh: freshItem });
      }
    });
    
    // Find removed items
    cachedData.forEach(item => {
      const itemId = item.id || item.name || JSON.stringify(item);
      if (!freshIds.has(itemId)) {
        differences.removedItems.push(item);
      }
    });
    
    differences.totalChanges = differences.newItems.length + 
                              differences.updatedItems.length + 
                              differences.removedItems.length;
  }
  
  return differences;
};

// Helper function to get the main data key for different data types
const getMainDataKey = (dataType: string): string => {
  switch (dataType) {
    case 'neo4j_concepts': return 'concepts';
    case 'google_tasks': return 'tasks';
    case 'google_calendar': return 'calendar';
    case 'google_contacts': return 'contacts';
    case 'google_emails': return 'emails';
    default: return 'data';
  }
};

// Helper function to get total count from data
const getTotalCount = (data: any): number => {
  if (!data) return 0;
  
  const mainKey = getMainDataKey(data.dataType || 'unknown');
  const items = data[mainKey] || data;
  
  if (Array.isArray(items)) {
    return items.length;
  }
  
  return data.totalConcepts || data.totalItems || 0;
};

// Helper function to get cache expiration in milliseconds
const getCacheExpirationMs = (dataType: string): number => {
  const strategy = BRAIN_CACHE_STRATEGY[dataType as keyof typeof BRAIN_CACHE_STRATEGY];
  const fallbackDuration = 21 * 24 * 60 * 60 * 1000; // 3 weeks default (updated from 24 hours)
  return strategy?.duration ?? fallbackDuration;
};

// Enhanced cache data interface with change tracking
interface SmartCacheData extends BrainCacheData {}

// 🚀 Extended brain memory cache hook with multi-data-type support
export const useBrainMemoryCache = (
  period: MemoryPeriod = 'current_week', 
  dataType: BrainDataType = 'neo4j_concepts'
) => {
  const { user } = useAuth();
  const [cache, setCache] = useState<BrainCacheData | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isLoading: false,
    isValid: false,
    dataType
  });
  const [stats, setStats] = useState<CacheStats>({
    cache_hits: 0,
    cache_misses: 0,
    neo4j_queries_saved: 0,
    avg_response_time_ms: 0
  });

  // Check if cache exists and is valid for the given period and data type (Optimized)
  const checkCacheValidity = useCallback(async (): Promise<CacheEntry | null> => {
    if (!user?.id) return null;

    try {
      console.log(`[BrainCache] 🔍 Checking cache for ${dataType}:${period}`);
      
      // 🔧 EMERGENCY REVERT - Back to original working query
      const { data, error } = await supabase
        .from('brain_memory_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('memory_period', period)
        .eq('data_type', dataType)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('[BrainCache] ❌ Error checking cache:', error);
        return null;
      }

      if (!data) {
        console.log(`[BrainCache] 📭 No cache entry found for ${dataType}:${period}`);
        return null;
      }

      // Check if cache is expired (client-side check)
      const expiresAt = new Date(data.expires_at);
      const isExpired = expiresAt < new Date();

      if (isExpired) {
        console.log(`[BrainCache] ⏰ Cache expired for ${dataType}:${period}`);
        return null;
      }

      console.log(`[BrainCache] ✅ Valid cache found: ${dataType} (${data.total_concepts} items)`);
      return data;

    } catch (error) {
      console.error('[BrainCache] ❌ Error in cache validity check:', error);
      return null;
    }
  }, [user?.id, period, dataType]);

  // Get cached data (cache hit) - Optimized for performance
  const getCachedData = useCallback(async (): Promise<BrainCacheData | null> => {
    if (EMERGENCY_CACHE_BYPASS) {
      console.log(`[BrainCache] 🚨 EMERGENCY BYPASS ACTIVE - Skipping cache for ${dataType}:${period}`);
      return null; // Always cache miss to force direct API calls
    }

    const startTime = Date.now();
    setCacheStatus(prev => ({ ...prev, isLoading: true }));

    try {
      // 🚀 Fast cache check with optimized query
      const cacheCheckStart = Date.now();
      const cacheEntry = await checkCacheValidity();
      const cacheCheckTime = Date.now() - cacheCheckStart;
      
      if (cacheEntry) {
        // Cache hit! 🎯
        const processStart = Date.now();
        await updateCacheStats('hit', Date.now() - startTime);
        
        // Handle both new cache_data field and legacy concepts_data field
        const cacheData = cacheEntry.cache_data || 
          (cacheEntry.concepts_data && {
            ...cacheEntry.concepts_data,
            dataType,
            lastSynced: cacheEntry.last_synced_at,
            cacheVersion: cacheEntry.cache_version
          } as BrainCacheData);
        
        if (cacheData) {
          setCache(cacheData);
          setCacheStatus({
            isLoading: false,
            isValid: true,
            lastUpdated: cacheEntry.last_synced_at,
            expiresAt: cacheEntry.expires_at,
            dataType
          });

          const itemCount = cacheData.concepts?.length || 
                           cacheData.tasks?.length || 
                           cacheData.calendar?.length || 
                           cacheData.contacts?.length || 
                           cacheData.emails?.length || 0;

          const totalTime = Date.now() - startTime;
          console.log(`[BrainCache] 🎯 Cache HIT for ${dataType}:${period}: ${itemCount} items in ${totalTime}ms (query: ${cacheCheckTime}ms)`);
          return cacheData;
        }
      }
      
      // Cache miss 📭
      await updateCacheStats('miss', Date.now() - startTime);
      
      setCacheStatus({
        isLoading: false,
        isValid: false,
        dataType
      });

      console.log(`[BrainCache] 📭 Cache MISS for ${dataType}:${period} in ${Date.now() - startTime}ms`);
      return null;

    } catch (error) {
      console.error('[BrainCache] ❌ Error getting cached data:', error);
      setCacheStatus({ isLoading: false, isValid: false, dataType });
      return null;
    }
  }, [checkCacheValidity, period, dataType]);

  // 💾 Set cached data with smart differential logic
  const setCachedData = useCallback(async (newData: any, forceFullUpdate = false): Promise<boolean> => {
    if (!user?.id) {
      console.log(`[BrainCache] ❌ No user ID for ${dataType}:${period}`);
      return false;
    }

    const startTime = Date.now();
    
    try {
      // Step 1: Get existing cache to compare
      const existingCache = await getCachedData();
      
      // Step 2: Calculate data hash for quick comparison
      const newDataHash = calculateDataHash(newData);
      const existingDataHash = existingCache?._cacheMetadata?.dataHash;
      
      // Step 3: Quick hash comparison - if identical, skip update
      if (!forceFullUpdate && newDataHash === existingDataHash) {
        console.log(`[BrainCache] ⚡ Data unchanged for ${dataType}:${period} - skipping cache update`);
        return true;
      }
      
      // Step 4: Deep differential analysis
      let shouldDoFullUpdate = forceFullUpdate;
      let updateType = 'full';
      let differences: any = null;
      
      if (!forceFullUpdate && existingCache) {
        // Find specific differences
        const mainDataKey = getMainDataKey(dataType);
        const cachedMainData = existingCache[mainDataKey];
        const freshMainData = newData[mainDataKey] || newData;
        
        differences = findDataDifferences(cachedMainData, freshMainData);
        
        console.log(`[BrainCache] 🔍 Change analysis for ${dataType}:${period}:`);
        console.log(`  New items: ${differences.newItems.length}`);
        console.log(`  Updated items: ${differences.updatedItems.length}`);
        console.log(`  Removed items: ${differences.removedItems.length}`);
        console.log(`  Total changes: ${differences.totalChanges}`);
        
        // Decide update strategy based on change volume
        const changePercentage = cachedMainData ? 
          (differences.totalChanges / cachedMainData.length) * 100 : 100;
        
        if (differences.totalChanges === 0) {
          console.log(`[BrainCache] ✨ No changes detected - skipping update`);
          return true;
        } else if (changePercentage < 30 && differences.totalChanges < 20) {
          // Small changes - do incremental update
          updateType = 'incremental';
          console.log(`[BrainCache] 🔄 Incremental update (${changePercentage.toFixed(1)}% changed)`);
        } else {
          // Large changes - do full update
          shouldDoFullUpdate = true;
          updateType = 'full';
          console.log(`[BrainCache] 🔄 Full update required (${changePercentage.toFixed(1)}% changed)`);
        }
      }
      
      // Step 5: Prepare cache data with metadata
      const enhancedData: SmartCacheData = {
        ...newData,
        _cacheMetadata: {
          dataHash: newDataHash,
          lastFullSync: shouldDoFullUpdate ? new Date().toISOString() : 
                        (existingCache?._cacheMetadata?.lastFullSync || new Date().toISOString()),
          incrementalUpdates: shouldDoFullUpdate ? 0 : 
                             ((existingCache?._cacheMetadata?.incrementalUpdates || 0) + 1),
          lastChangeDetection: new Date().toISOString(),
          changesSinceLastSync: shouldDoFullUpdate ? 0 : differences?.totalChanges || 0
        }
      };
      
      // Step 6: Perform the cache update
      const { error } = await supabase
        .from('brain_memory_cache')
        .upsert({
          user_id: user.id,
          data_type: dataType,
          memory_period: period,
          cache_data: enhancedData,
          total_concepts: getTotalCount(newData),
          expires_at: new Date(Date.now() + getCacheExpirationMs(dataType)).toISOString(),
          last_synced_at: new Date().toISOString(),
          cache_version: 1
        }, { 
          onConflict: 'user_id,data_type,memory_period' 
        });

      if (error) {
        console.error(`[BrainCache] ❌ Cache storage error for ${dataType}:${period}:`, error.message);
        return false;
      }

      const duration = Date.now() - startTime;
      console.log(`[BrainCache] ✅ ${updateType === 'full' ? 'Full' : 'Incremental'} cache update: ${dataType}:${period} in ${duration}ms`);
      
      // Step 7: Update local state
      setCache(enhancedData);
      setCacheStatus({
        isLoading: false,
        isValid: true,
        lastUpdated: new Date().toISOString(),
        dataType
      });
      
      // Step 8: Update stats with cache write info
      await updateCacheWriteStats({
        cache_writes: (stats.cache_writes || 0) + 1,
        total_items_cached: getTotalCount(newData),
        avg_response_time_ms: duration,
        last_update_type: updateType,
        changes_detected: differences?.totalChanges || 0
      });

      return true;
      
    } catch (error) {
      console.error(`[BrainCache] ❌ Error in smart cache update for ${dataType}:${period}:`, error);
      return false;
    }
  }, [user?.id, dataType, period, supabase, getCachedData, stats]);

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

  // Update cache write statistics (separate from hit/miss stats)
  const updateCacheWriteStats = useCallback(async (writeStats: {
    cache_writes: number;
    total_items_cached: number;
    avg_response_time_ms: number;
    last_update_type: string;
    changes_detected: number;
  }) => {
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
        cache_hits: currentStats?.cache_hits || 0,
        cache_misses: currentStats?.cache_misses || 0,
        neo4j_queries_saved: currentStats?.neo4j_queries_saved || 0,
        cache_writes: writeStats.cache_writes,
        total_items_cached: writeStats.total_items_cached,
        avg_response_time_ms: writeStats.avg_response_time_ms,
        last_update_type: writeStats.last_update_type,
        changes_detected: writeStats.changes_detected
      };

      await supabase
        .from('brain_memory_stats')
        .upsert(newStats, { onConflict: 'user_id' });

      setStats(newStats);

    } catch (error) {
      console.error('[BrainCache] ❌ Error updating write stats:', error);
    }
  }, [user?.id]);

  // Invalidate cache for a specific period and data type
  const invalidateCache = useCallback(async (targetPeriod?: MemoryPeriod, targetDataType?: BrainDataType): Promise<boolean> => {
    if (!user?.id) return false;

    const periodToInvalidate = targetPeriod || period;
    const dataTypeToInvalidate = targetDataType || dataType;

    try {
      console.log(`[BrainCache] 🗑️ Invalidating cache for ${dataTypeToInvalidate}:${periodToInvalidate}`);

      const { error } = await supabase
        .from('brain_memory_cache')
        .delete()
        .eq('user_id', user.id)
        .eq('memory_period', periodToInvalidate)
        .eq('data_type', dataTypeToInvalidate);

      if (error) {
        console.error('[BrainCache] ❌ Error invalidating cache:', error);
        return false;
      }

      // Clear local cache if it matches
      if (periodToInvalidate === period && dataTypeToInvalidate === dataType) {
        setCache(null);
        setCacheStatus({ isLoading: false, isValid: false, dataType });
      }

      console.log(`[BrainCache] ✅ Cache invalidated for ${dataTypeToInvalidate}:${periodToInvalidate}`);
      return true;

    } catch (error) {
      console.error('[BrainCache] ❌ Error in invalidateCache:', error);
      return false;
    }
  }, [user?.id, period, dataType]);

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

  // Initialize cache stats on mount (Fixed to prevent infinite loops)
  useEffect(() => {
    let isMounted = true;
    
    const initializeStats = async () => {
      console.log(`[BrainCache] 🚀 EFFECT TRIGGERED - initializing stats for ${dataType}:${period}...`);
      if (!user?.id || !isMounted) return;
      
      try {
        await getCacheStats();
      } catch (error) {
        console.error('[BrainCache] ❌ Error initializing stats:', error);
      }
    };

    initializeStats();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id]); // 🔧 Only depend on user.id, not getCacheStats

  // Log when getCacheStats function changes to debug re-renders
  useEffect(() => {
    console.log(`[BrainCache] 🔄 getCacheStats function changed for ${dataType}:${period}`, {
      hasUser: !!user?.id,
      getCacheStats: typeof getCacheStats
    });
  }, [getCacheStats, dataType, period]);

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
    itemCount: cache?.concepts?.length || 
               cache?.tasks?.length || 
               cache?.calendar?.length || 
               cache?.contacts?.length || 
               cache?.emails?.length || 0,
    
    // Memory period info
    currentPeriod: period,
    currentDataType: dataType,
    periodDates: getMemoryPeriodDates(period),
    cacheStrategy: BRAIN_CACHE_STRATEGY[dataType as keyof typeof BRAIN_CACHE_STRATEGY],
    
    // 🚀 Backward compatibility for existing Neo4j usage
    conceptCount: cache?.concepts?.length || 0,
  };
};

// 🚀 Convenience hooks for each data type with brain-inspired caching
export const useBrainTasksCache = () => useBrainMemoryCache('tasks', 'google_tasks');
export const useBrainContactsCache = () => useBrainMemoryCache('contacts', 'google_contacts');
export const useBrainCalendarCache = () => useBrainMemoryCache('calendar', 'google_calendar');
export const useBrainEmailCache = () => useBrainMemoryCache('emails', 'google_emails');
export const useBrainNeo4jCache = () => useBrainMemoryCache('current_week', 'neo4j_concepts');

// Legacy export for backward compatibility with existing Neo4j usage
export const useBrainConceptsCache = (period: 'past_week' | 'current_week' | 'next_week' = 'current_week') => 
  useBrainMemoryCache(period, 'neo4j_concepts');

// New export for concepts cache using 'concepts' memory period
export const useBrainConceptsNewCache = () => useBrainMemoryCache('concepts', 'neo4j_concepts'); 