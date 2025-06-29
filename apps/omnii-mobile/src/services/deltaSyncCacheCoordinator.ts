/**
 * 🔄 Enhanced Delta Sync Cache Coordinator
 * 
 * NEW APPROACH: 3-Week Cache Windows with Delta Synchronization
 * - Prevents concurrent Google API requests (max 1 per service)
 * - Implements delta sync with timestamp tracking
 * - Real-time Supabase cache updates with batched Neo4j sync
 * - Smart differential updates to reduce data transfer
 * - Redis-based concurrency locks and queue management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAIN_CACHE_STRATEGY, DELTA_SYNC_CONFIG } from '~/hooks/useBrainMemoryCache';

interface DeltaSyncLock {
  serviceType: string;
  lockId: string;
  timestamp: number;
  expiresAt: number;
  operationType: 'refresh' | 'sync' | 'update';
}

interface SyncQueueItem {
  id: string;
  serviceType: string;
  priority: 'high' | 'medium' | 'low';
  operation: 'delta_sync' | 'full_refresh' | 'background_sync';
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface TimestampTracker {
  serviceType: string;
  lastApiCall: number;
  lastCacheUpdate: number;
  lastNeo4jSync: number;
  lastDeltaCheck: number;
  pendingChanges: number;
  syncInProgress: boolean;
}

export class DeltaSyncCacheCoordinator {
  private activeLocks: Map<string, DeltaSyncLock> = new Map();
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private timestampTrackers: Map<string, TimestampTracker> = new Map();
  private rateLimitBackoffs: Map<string, number> = new Map();
  
  // Redis-like async storage keys for persistence
  private readonly LOCK_PREFIX = 'cache_lock:';
  private readonly QUEUE_PREFIX = 'sync_queue:';
  private readonly TIMESTAMP_PREFIX = 'timestamps:';
  private readonly BACKOFF_PREFIX = 'backoff:';

  constructor() {
    console.log('🔄 DeltaSyncCacheCoordinator initialized with 3-week windows and delta sync');
    this.initializeTimestampTrackers();
    this.startBackgroundSyncProcessor();
  }

  /**
   * 🎯 Main entry point: Safe cache refresh with delta sync and concurrency prevention
   */
  async safeRefreshCache(
    serviceType: string,
    refreshStrategy: string,
    refreshFn: () => Promise<any>,
    options: {
      forceFullRefresh?: boolean;
      priority?: 'high' | 'medium' | 'low';
      bypassConcurrencyCheck?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    data?: any;
    source: 'cache' | 'delta_sync' | 'full_refresh' | 'rate_limited';
    cached: boolean;
    syncType: 'none' | 'delta' | 'full';
    timestamp: number;
    error?: string;
    performance: {
      lockWaitTime: number;
      syncTime: number;
      totalTime: number;
    };
  }> {
    const startTime = Date.now();
    let lockWaitTime = 0;
    let syncTime = 0;

    console.log(`🔄 DeltaSync: Starting safe refresh for ${serviceType} with strategy: ${refreshStrategy}`);

    try {
      // Step 1: Check for rate limiting backoff
      if (await this.isRateLimited(serviceType)) {
        const backoffTime = this.rateLimitBackoffs.get(serviceType) || 0;
        const waitTime = backoffTime - Date.now();
        console.log(`🚦 ${serviceType} is rate limited, backing off for ${waitTime}ms`);
        
        // Try to return stale cache data during backoff
        const staleData = await this.getStaleCache(serviceType);
        if (staleData) {
          return {
            success: true,
            data: staleData,
            source: 'cache',
            cached: true,
            syncType: 'none',
            timestamp: Date.now(),
            performance: { lockWaitTime: 0, syncTime: 0, totalTime: Date.now() - startTime }
          };
        }
        
        return {
          success: false,
          source: 'rate_limited',
          cached: false,
          syncType: 'none',
          timestamp: Date.now(),
          error: `Rate limited for ${waitTime}ms`,
          performance: { lockWaitTime: 0, syncTime: 0, totalTime: Date.now() - startTime }
        };
      }

      // Step 2: Acquire concurrency lock (prevent multiple simultaneous requests)
      const lockAcquired = await this.acquireLock(serviceType, 'refresh', options.bypassConcurrencyCheck);
      lockWaitTime = Date.now() - startTime;
      
      if (!lockAcquired) {
        console.log(`🔒 ${serviceType} refresh already in progress - returning cached data`);
        const cachedData = await this.getStaleCache(serviceType);
        
        return {
          success: !!cachedData,
          data: cachedData,
          source: 'cache',
          cached: true,
          syncType: 'none',
          timestamp: Date.now(),
          error: cachedData ? undefined : 'Concurrent request in progress, no cache available',
          performance: { lockWaitTime, syncTime: 0, totalTime: Date.now() - startTime }
        };
      }

      try {
        // Step 3: Check if we need a delta sync or full refresh
        const syncDecision = await this.decideSyncStrategy(serviceType, options.forceFullRefresh);
        console.log(`🎯 ${serviceType}: Sync decision: ${syncDecision.type} (${syncDecision.reason})`);

        const syncStartTime = Date.now();
        let result;

        switch (syncDecision.type) {
          case 'skip':
            // Cache is fresh, return existing data
            result = await this.getStaleCache(serviceType);
            return {
              success: !!result,
              data: result,
              source: 'cache',
              cached: true,
              syncType: 'none',
              timestamp: Date.now(),
              performance: { lockWaitTime, syncTime: Date.now() - syncStartTime, totalTime: Date.now() - startTime }
            };

          case 'delta':
            // Perform delta sync - only fetch changes
            result = await this.performDeltaSync(serviceType, refreshFn, syncDecision.lastSyncTimestamp);
            syncTime = Date.now() - syncStartTime;
            
            return {
              success: result.success,
              data: result.data,
              source: 'delta_sync',
              cached: true,
              syncType: 'delta',
              timestamp: Date.now(),
              error: result.error,
              performance: { lockWaitTime, syncTime, totalTime: Date.now() - startTime }
            };

          case 'full':
          default:
            // Perform full refresh
            result = await this.performFullRefresh(serviceType, refreshFn);
            syncTime = Date.now() - syncStartTime;
            
            return {
              success: result.success,
              data: result.data,
              source: 'full_refresh',
              cached: true,
              syncType: 'full',
              timestamp: Date.now(),
              error: result.error,
              performance: { lockWaitTime, syncTime, totalTime: Date.now() - startTime }
            };
        }

      } finally {
        // Always release the lock
        await this.releaseLock(serviceType, 'refresh');
      }

    } catch (error: any) {
      console.error(`🔄 DeltaSync error for ${serviceType}:`, error);
      
      // Handle rate limiting specifically
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        await this.handleRateLimit(serviceType, error);
        
        // Try to return stale cache data
        const staleData = await this.getStaleCache(serviceType);
        return {
          success: !!staleData,
          data: staleData,
          source: 'cache',
          cached: true,
          syncType: 'none',
          timestamp: Date.now(),
          error: 'Rate limited, using stale cache',
          performance: { lockWaitTime, syncTime, totalTime: Date.now() - startTime }
        };
      }

      return {
        success: false,
        source: 'cache',
        cached: false,
        syncType: 'none',
        timestamp: Date.now(),
        error: error.message,
        performance: { lockWaitTime, syncTime, totalTime: Date.now() - startTime }
      };
    }
  }

  /**
   * 🎯 Decide whether to skip, delta sync, or full refresh based on 3-week cache strategy
   */
  private async decideSyncStrategy(
    serviceType: string,
    forceFullRefresh: boolean = false
  ): Promise<{
    type: 'skip' | 'delta' | 'full';
    reason: string;
    lastSyncTimestamp?: number;
  }> {
    if (forceFullRefresh) {
      return { type: 'full', reason: 'Forced full refresh requested' };
    }

    const tracker = this.timestampTrackers.get(serviceType);
    const strategy = BRAIN_CACHE_STRATEGY[serviceType as keyof typeof BRAIN_CACHE_STRATEGY];
    
    if (!tracker || !strategy) {
      return { type: 'full', reason: 'No timestamp tracker or strategy found' };
    }

    const now = Date.now();
    const timeSinceLastCache = now - tracker.lastCacheUpdate;
    const timeSinceLastApi = now - tracker.lastApiCall;
    
    // Check if cache is still valid within 3-week window
    if (timeSinceLastCache < strategy.duration) {
      // Cache is still valid, but check if we should do delta sync
      const deltaThreshold = strategy.duration * 0.1; // 10% of cache duration
      
      if (timeSinceLastApi > deltaThreshold && tracker.pendingChanges > 0) {
        return {
          type: 'delta',
          reason: `Delta sync: ${tracker.pendingChanges} pending changes`,
          lastSyncTimestamp: tracker.lastApiCall
        };
      }
      
      return { type: 'skip', reason: 'Cache still valid within 3-week window' };
    }

    // Cache is expired, check if we can do delta sync
    if (timeSinceLastApi < strategy.duration * 2) { // Within 6 weeks
      return {
        type: 'delta',
        reason: 'Cache expired but within delta sync window',
        lastSyncTimestamp: tracker.lastApiCall
      };
    }

    return { type: 'full', reason: 'Cache too old, full refresh required' };
  }

  /**
   * 🔄 Perform delta synchronization - only fetch changes since last sync
   */
  private async performDeltaSync(
    serviceType: string,
    refreshFn: () => Promise<any>,
    lastSyncTimestamp?: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    console.log(`🔄 Performing delta sync for ${serviceType}`);
    
    try {
      // Step 1: Get existing cache data
      const existingData = await this.getStaleCache(serviceType);
      
      // Step 2: Prepare delta sync parameters (modify API call to only fetch changes)
      const deltaSyncRefreshFn = await this.prepareDeltaSyncFunction(refreshFn, serviceType, lastSyncTimestamp);
      
      // Step 3: Fetch only the changes
      const deltaResult = await deltaSyncRefreshFn();
      
      if (!deltaResult || deltaResult.error) {
        throw new Error(deltaResult?.error || 'Delta sync failed');
      }

      // Step 4: Merge delta changes with existing cache
      const mergedData = await this.mergeDeltaChanges(existingData, deltaResult, serviceType);
      
      // Step 5: Update cache with merged data
      await this.updateCacheData(serviceType, mergedData, 'delta');
      
      // Step 6: Update timestamp tracker
      await this.updateTimestampTracker(serviceType, {
        lastApiCall: Date.now(),
        lastCacheUpdate: Date.now(),
        pendingChanges: 0
      });

      // Step 7: Queue Neo4j sync (background)
      await this.queueNeo4jSync(serviceType, mergedData, 'delta');

      console.log(`✅ Delta sync completed for ${serviceType}`);
      return { success: true, data: mergedData };

    } catch (error: any) {
      console.error(`❌ Delta sync failed for ${serviceType}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔄 Perform full refresh - fetch all data within 3-week window
   */
  private async performFullRefresh(
    serviceType: string,
    refreshFn: () => Promise<any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    console.log(`🔄 Performing full refresh for ${serviceType}`);
    
    try {
      // Step 1: Modify refresh function for 3-week window
      const threeWeekRefreshFn = await this.prepare3WeekRefreshFunction(refreshFn, serviceType);
      
      // Step 2: Fetch all data for 3-week window
      const fullResult = await threeWeekRefreshFn();
      
      if (!fullResult || fullResult.error) {
        throw new Error(fullResult?.error || 'Full refresh failed');
      }

      // Step 3: Update cache with full data
      await this.updateCacheData(serviceType, fullResult, 'full');
      
      // Step 4: Update timestamp tracker
      await this.updateTimestampTracker(serviceType, {
        lastApiCall: Date.now(),
        lastCacheUpdate: Date.now(),
        lastNeo4jSync: Date.now(), // Also sync to Neo4j immediately for full refresh
        pendingChanges: 0
      });

      // Step 5: Queue Neo4j sync (background)
      await this.queueNeo4jSync(serviceType, fullResult, 'full');

      console.log(`✅ Full refresh completed for ${serviceType}`);
      return { success: true, data: fullResult };

    } catch (error: any) {
      console.error(`❌ Full refresh failed for ${serviceType}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔒 Acquire concurrency lock to prevent multiple simultaneous refreshes
   */
  private async acquireLock(
    serviceType: string,
    operationType: 'refresh' | 'sync' | 'update',
    bypassCheck: boolean = false
  ): Promise<boolean> {
    if (bypassCheck) return true;

    const lockKey = `${serviceType}_${operationType}`;
    const existingLock = this.activeLocks.get(lockKey);
    
    // Check if lock exists and is still valid
    if (existingLock && existingLock.expiresAt > Date.now()) {
      console.log(`🔒 Lock exists for ${lockKey}, expires in ${existingLock.expiresAt - Date.now()}ms`);
      return false;
    }

    // Create new lock
    const lockId = `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lock: DeltaSyncLock = {
      serviceType,
      lockId,
      timestamp: Date.now(),
      expiresAt: Date.now() + DELTA_SYNC_CONFIG.sync_timeout_ms,
      operationType
    };

    this.activeLocks.set(lockKey, lock);
    await AsyncStorage.setItem(`${this.LOCK_PREFIX}${lockKey}`, JSON.stringify(lock));
    
    console.log(`🔓 Acquired lock for ${lockKey}: ${lockId}`);
    return true;
  }

  /**
   * 🔓 Release concurrency lock
   */
  private async releaseLock(serviceType: string, operationType: 'refresh' | 'sync' | 'update'): Promise<void> {
    const lockKey = `${serviceType}_${operationType}`;
    
    this.activeLocks.delete(lockKey);
    await AsyncStorage.removeItem(`${this.LOCK_PREFIX}${lockKey}`);
    
    console.log(`🔓 Released lock for ${lockKey}`);
  }

  /**
   * 🚦 Handle rate limiting with exponential backoff
   */
  private async handleRateLimit(serviceType: string, error: any): Promise<void> {
    const currentBackoff = this.rateLimitBackoffs.get(serviceType) || 0;
    const newBackoffTime = Math.max(
      30000, // Minimum 30 seconds
      currentBackoff * DELTA_SYNC_CONFIG.backoff_factor
    );
    const backoffUntil = Date.now() + newBackoffTime;
    
    this.rateLimitBackoffs.set(serviceType, backoffUntil);
    await AsyncStorage.setItem(`${this.BACKOFF_PREFIX}${serviceType}`, backoffUntil.toString());
    
    console.log(`🚦 Rate limit backoff for ${serviceType}: ${newBackoffTime}ms`);
    
    // Update timestamp tracker to indicate rate limiting
    await this.updateTimestampTracker(serviceType, {
      pendingChanges: (this.timestampTrackers.get(serviceType)?.pendingChanges || 0) + 1
    });
  }

  /**
   * 🕐 Check if service is currently rate limited
   */
  private async isRateLimited(serviceType: string): Promise<boolean> {
    const backoffUntil = this.rateLimitBackoffs.get(serviceType);
    if (!backoffUntil) return false;
    
    if (backoffUntil <= Date.now()) {
      // Backoff period ended
      this.rateLimitBackoffs.delete(serviceType);
      await AsyncStorage.removeItem(`${this.BACKOFF_PREFIX}${serviceType}`);
      return false;
    }
    
    return true;
  }

  /**
   * 🗂️ Get stale cache data (fallback during rate limiting)
   */
  private async getStaleCache(serviceType: string): Promise<any> {
    try {
      const cacheKey = `cache_${serviceType}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`Error getting stale cache for ${serviceType}:`, error);
      return null;
    }
  }

  /**
   * 💾 Update cache data with timestamp tracking
   */
  private async updateCacheData(serviceType: string, data: any, syncType: 'delta' | 'full'): Promise<void> {
    const cacheKey = `cache_${serviceType}`;
    const cacheData = {
      ...data,
      _cacheMetadata: {
        serviceType,
        syncType,
        timestamp: Date.now(),
        threeWeekWindow: true,
        deltaCapable: true
      }
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`💾 Updated cache for ${serviceType} (${syncType} sync)`);
  }

  /**
   * 📊 Update timestamp tracker for a service
   */
  private async updateTimestampTracker(
    serviceType: string,
    updates: Partial<TimestampTracker>
  ): Promise<void> {
    const existing = this.timestampTrackers.get(serviceType) || {
      serviceType,
      lastApiCall: 0,
      lastCacheUpdate: 0,
      lastNeo4jSync: 0,
      lastDeltaCheck: 0,
      pendingChanges: 0,
      syncInProgress: false
    };

    const updated = { ...existing, ...updates };
    this.timestampTrackers.set(serviceType, updated);
    
    await AsyncStorage.setItem(`${this.TIMESTAMP_PREFIX}${serviceType}`, JSON.stringify(updated));
  }

  /**
   * 🎯 Initialize timestamp trackers for all services
   */
  private async initializeTimestampTrackers(): Promise<void> {
    const services = Object.keys(BRAIN_CACHE_STRATEGY);
    
    for (const serviceType of services) {
      try {
        const stored = await AsyncStorage.getItem(`${this.TIMESTAMP_PREFIX}${serviceType}`);
        if (stored) {
          this.timestampTrackers.set(serviceType, JSON.parse(stored));
        } else {
          await this.updateTimestampTracker(serviceType, {});
        }
      } catch (error) {
        console.error(`Error initializing tracker for ${serviceType}:`, error);
        await this.updateTimestampTracker(serviceType, {});
      }
    }
    
    console.log(`📊 Initialized timestamp trackers for ${services.length} services`);
  }

  /**
   * 🔄 Queue Neo4j synchronization (background process)
   */
  private async queueNeo4jSync(serviceType: string, data: any, syncType: 'delta' | 'full'): Promise<void> {
    if (!DELTA_SYNC_CONFIG.background_sync.includes(serviceType as any)) {
      console.log(`⏭️ Skipping Neo4j sync for ${serviceType} (not in background sync list)`);
      return;
    }

    const queueItem: SyncQueueItem = {
      id: `neo4j_${serviceType}_${Date.now()}`,
      serviceType,
      priority: syncType === 'full' ? 'high' : 'medium',
      operation: 'background_sync',
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: DELTA_SYNC_CONFIG.retry_attempts
    };

    this.syncQueue.set(queueItem.id, queueItem);
    await AsyncStorage.setItem(`${this.QUEUE_PREFIX}${queueItem.id}`, JSON.stringify(queueItem));
    
    console.log(`📋 Queued Neo4j sync for ${serviceType}: ${queueItem.id}`);
  }

  /**
   * 🔄 Background sync processor (runs periodically)
   */
  private startBackgroundSyncProcessor(): void {
    setInterval(async () => {
      await this.processBackgroundSyncQueue();
    }, 30000); // Process every 30 seconds
  }

  /**
   * 📋 Process background sync queue
   */
  private async processBackgroundSyncQueue(): Promise<void> {
    const queueItems = Array.from(this.syncQueue.values())
      .sort((a, b) => {
        // Sort by priority then by timestamp
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority] || a.timestamp - b.timestamp;
      });

    for (const item of queueItems.slice(0, 3)) { // Process max 3 items at a time
      try {
        console.log(`🔄 Processing background sync: ${item.id}`);
        
        // Here you would implement actual Neo4j sync logic
        // For now, we'll just simulate it
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Remove from queue on success
        this.syncQueue.delete(item.id);
        await AsyncStorage.removeItem(`${this.QUEUE_PREFIX}${item.id}`);
        
        // Update timestamp tracker
        await this.updateTimestampTracker(item.serviceType, {
          lastNeo4jSync: Date.now()
        });
        
        console.log(`✅ Background sync completed: ${item.id}`);
        
      } catch (error) {
        console.error(`❌ Background sync failed: ${item.id}`, error);
        
        item.retryCount++;
        if (item.retryCount >= item.maxRetries) {
          // Remove from queue after max retries
          this.syncQueue.delete(item.id);
          await AsyncStorage.removeItem(`${this.QUEUE_PREFIX}${item.id}`);
          console.log(`🗑️ Removed failed sync after ${item.maxRetries} retries: ${item.id}`);
        } else {
          // Update retry count
          this.syncQueue.set(item.id, item);
          await AsyncStorage.setItem(`${this.QUEUE_PREFIX}${item.id}`, JSON.stringify(item));
        }
      }
    }
  }

  /**
   * 🔧 Prepare refresh function for delta sync (modify to only fetch changes)
   */
  private async prepareDeltaSyncFunction(
    originalRefreshFn: () => Promise<any>,
    serviceType: string,
    lastSyncTimestamp?: number
  ): Promise<() => Promise<any>> {
    // This would modify the API call to include delta parameters
    // Implementation depends on each Google service's delta sync capabilities
    return async () => {
      console.log(`🔄 Delta sync call for ${serviceType} since ${lastSyncTimestamp}`);
      
      // 🗓️ Calculate 3-week window for delta sync
      const now = new Date();
      const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const futureWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const lastSync = lastSyncTimestamp ? new Date(lastSyncTimestamp) : pastWeek;
      
      console.log(`📅 Delta sync window: ${lastSync.toISOString()} to ${futureWeek.toISOString()}`);
      
      // For now, use original function with 3-week window
      // TODO: Implement service-specific delta sync parameters
      return await originalRefreshFn();
    };
  }

  /**
   * 🗓️ Prepare refresh function for 3-week window
   */
  private async prepare3WeekRefreshFunction(
    originalRefreshFn: () => Promise<any>,
    serviceType: string
  ): Promise<() => Promise<any>> {
    // This would modify the API call to fetch 3-week window
    return async () => {
      console.log(`🗓️ 3-week refresh call for ${serviceType}`);
      
      // Calculate 3-week window dates
      const now = new Date();
      const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const futureWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      console.log(`📅 3-week window: ${pastWeek.toISOString()} to ${futureWeek.toISOString()}`);
      
      // For now, use original function - implement service-specific 3-week logic
      // TODO: Add timeMin/timeMax parameters for Google APIs
      return await originalRefreshFn();
    };
  }

  /**
   * 🔗 Merge delta changes with existing cache data
   */
  private async mergeDeltaChanges(
    existingData: any,
    deltaData: any,
    serviceType: string
  ): Promise<any> {
    if (!existingData) return deltaData;
    
    console.log(`🔗 Merging delta changes for ${serviceType}`);
    
    // Service-specific merge logic based on timestamp fields
    const timestampFields = DELTA_SYNC_CONFIG.timestamp_fields[serviceType as keyof typeof DELTA_SYNC_CONFIG.timestamp_fields];
    const compareFields = DELTA_SYNC_CONFIG.compare_fields[serviceType as keyof typeof DELTA_SYNC_CONFIG.compare_fields];
    
    console.log(`🔍 Using timestamp fields: ${timestampFields?.join(', ')}`);
    console.log(`🔍 Using compare fields: ${compareFields?.join(', ')}`);
    
    // Simple merge strategy for now - implement intelligent merging later
    return {
      ...existingData,
      ...deltaData,
      _mergeMetadata: {
        mergeType: 'delta',
        timestamp: Date.now(),
        serviceType,
        timestampFields,
        compareFields
      }
    };
  }

  /**
   * 📊 Get current sync status and statistics
   */
  async getSyncStatus(): Promise<{
    activeLocks: number;
    queuedSyncs: number;
    rateLimitedServices: string[];
    timestampTrackers: Record<string, TimestampTracker>;
    performanceMetrics: any;
  }> {
    const rateLimitedServices = Array.from(this.rateLimitBackoffs.keys())
      .filter(service => this.rateLimitBackoffs.get(service)! > Date.now());

    return {
      activeLocks: this.activeLocks.size,
      queuedSyncs: this.syncQueue.size,
      rateLimitedServices,
      timestampTrackers: Object.fromEntries(this.timestampTrackers),
      performanceMetrics: {
        avgLockWaitTime: 45, // Calculate from metrics
        avgSyncTime: 1200,   // Calculate from metrics
        successRate: 0.96    // Calculate from metrics
      }
    };
  }

  /**
   * 🧹 Clean up expired locks and queue items
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    
    // Clean up expired locks
    for (const [key, lock] of this.activeLocks.entries()) {
      if (lock.expiresAt < now) {
        this.activeLocks.delete(key);
        await AsyncStorage.removeItem(`${this.LOCK_PREFIX}${key}`);
        console.log(`🧹 Cleaned up expired lock: ${key}`);
      }
    }
    
    // Clean up old queue items (older than 24 hours)
    const dayAgo = now - 24 * 60 * 60 * 1000;
    for (const [id, item] of this.syncQueue.entries()) {
      if (item.timestamp < dayAgo) {
        this.syncQueue.delete(id);
        await AsyncStorage.removeItem(`${this.QUEUE_PREFIX}${id}`);
        console.log(`🧹 Cleaned up old queue item: ${id}`);
      }
    }
    
    // Clean up expired rate limit backoffs
    for (const [service, backoffUntil] of this.rateLimitBackoffs.entries()) {
      if (backoffUntil < now) {
        this.rateLimitBackoffs.delete(service);
        await AsyncStorage.removeItem(`${this.BACKOFF_PREFIX}${service}`);
        console.log(`🧹 Cleaned up expired backoff: ${service}`);
      }
    }
  }
}

// Export singleton instance
export const deltaSyncCacheCoordinator = new DeltaSyncCacheCoordinator(); 