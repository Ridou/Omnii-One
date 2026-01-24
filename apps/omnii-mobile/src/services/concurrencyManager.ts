/**
 * Concurrency Manager Service
 * 
 * Prevents multiple simultaneous cache refreshes and implements cache-first
 * request handling to avoid concurrent API calls for the same resource.
 */

interface PendingRequest<T = any> {
  promise: Promise<T>;
  timestamp: number;
  resourceKey: string;
}

interface CacheFirstStrategy<T = any> {
  checkCache: () => Promise<{ found: boolean; data?: T }> | { found: boolean; data?: T };
  checkAPI: () => Promise<{ data: T }>;
  setCacheData: (data: T) => Promise<void> | void;
  resourceKey: string;
}

class ConcurrencyManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private cacheLocks = new Set<string>();
  private requestCounts = new Map<string, number>();
  
  /**
   * Prevent multiple simultaneous cache refreshes for the same resource
   */
  async preventConcurrentRefresh<T>(
    resourceKey: string,
    refreshFunction: () => Promise<T>,
    timeoutMs = 30000
  ): Promise<T> {
    // Check if there's already a pending request for this resource
    const existing = this.pendingRequests.get(resourceKey);
    
    if (existing) {
      // Return the existing promise instead of starting a new request
      console.log(`[ConcurrencyManager] Deduplicating request for ${resourceKey}`);
      return existing.promise as Promise<T>;
    }

    // Start new request and track it
    console.log(`[ConcurrencyManager] Starting new request for ${resourceKey}`);
    const promise = this.executeWithTimeout(refreshFunction, timeoutMs);
    
    this.pendingRequests.set(resourceKey, {
      promise,
      timestamp: Date.now(),
      resourceKey
    });

    // Track request count for metrics
    const currentCount = this.requestCounts.get(resourceKey) || 0;
    this.requestCounts.set(resourceKey, currentCount + 1);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up the pending request when done
      this.pendingRequests.delete(resourceKey);
    }
  }

  /**
   * Implement cache-first request strategy with concurrency prevention
   */
  async cacheFirstRequest<T>(strategy: CacheFirstStrategy<T>): Promise<T> {
    const { resourceKey, checkCache, checkAPI, setCacheData } = strategy;
    
    // Check if cache refresh is already in progress
    if (this.cacheLocks.has(resourceKey)) {
      console.log(`[ConcurrencyManager] Cache refresh in progress for ${resourceKey}, waiting...`);
      // Wait for the existing refresh to complete
      await this.waitForCacheLock(resourceKey);
    }

    // Step 1: Check cache first
    const cacheResult = await Promise.resolve(checkCache());
    
    if (cacheResult.found && cacheResult.data) {
      console.log(`[ConcurrencyManager] Cache hit for ${resourceKey}`);
      return cacheResult.data;
    }

    // Step 2: Cache miss - prevent concurrent API calls
    return this.preventConcurrentRefresh(resourceKey, async () => {
      console.log(`[ConcurrencyManager] Cache miss for ${resourceKey}, fetching from API`);
      
      // Acquire cache lock
      this.cacheLocks.add(resourceKey);
      
      try {
        const apiResult = await checkAPI();
        
        // Update cache with fresh data
        await Promise.resolve(setCacheData(apiResult.data));
        
        return apiResult.data;
      } finally {
        // Release cache lock
        this.cacheLocks.delete(resourceKey);
      }
    });
  }

  /**
   * Execute function with timeout protection
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>, 
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Wait for cache lock to be released
   */
  private async waitForCacheLock(resourceKey: string, maxWaitMs = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (this.cacheLocks.has(resourceKey)) {
      if (Date.now() - startTime > maxWaitMs) {
        console.warn(`[ConcurrencyManager] Cache lock timeout for ${resourceKey}`);
        break;
      }
      
      // Wait 50ms before checking again
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Check if a resource has pending requests
   */
  hasPendingRequest(resourceKey: string): boolean {
    return this.pendingRequests.has(resourceKey);
  }

  /**
   * Check if a resource cache is locked
   */
  isCacheLocked(resourceKey: string): boolean {
    return this.cacheLocks.has(resourceKey);
  }

  /**
   * Get request count for a resource (for metrics)
   */
  getRequestCount(resourceKey: string): number {
    return this.requestCounts.get(resourceKey) || 0;
  }

  /**
   * Get all pending requests (for debugging)
   */
  getPendingRequests(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  /**
   * Get all locked caches (for debugging)
   */
  getLockedCaches(): string[] {
    return Array.from(this.cacheLocks);
  }

  /**
   * Clear all pending requests and locks (useful for testing)
   */
  reset(): void {
    this.pendingRequests.clear();
    this.cacheLocks.clear();
    this.requestCounts.clear();
  }

  /**
   * Get comprehensive concurrency stats
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      lockedCaches: this.cacheLocks.size,
      totalRequests: Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0),
      requestsByResource: Object.fromEntries(this.requestCounts),
      activePendingKeys: Array.from(this.pendingRequests.keys()),
      activeLockedKeys: Array.from(this.cacheLocks)
    };
  }

  /**
   * Create a cache-first strategy helper
   */
  createCacheFirstStrategy<T>(
    resourceKey: string,
    checkCache: () => Promise<{ found: boolean; data?: T }> | { found: boolean; data?: T },
    checkAPI: () => Promise<{ data: T }>,
    setCacheData: (data: T) => Promise<void> | void
  ): CacheFirstStrategy<T> {
    return {
      resourceKey,
      checkCache,
      checkAPI,
      setCacheData
    };
  }
}

// Global singleton instance
export const concurrencyManager = new ConcurrencyManager();

// Export types for use in components
export type { PendingRequest, CacheFirstStrategy }; 