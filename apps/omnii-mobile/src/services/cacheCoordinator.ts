/**
 * 🚦 Cache Coordinator Service
 * 
 * Centralized service to prevent cache stampedes and rate limiting issues.
 * Coordinates cache refreshes across all Google services to prevent concurrent API calls.
 */

interface RefreshConfig {
  maxConcurrent: number;
  retryDelay: number;
  maxRetries: number;
  backoffMultiplier: number;
}

interface RateLimitTracker {
  count: number;
  resetTime: number;
  lastError?: string;
}

// ✅ Default configuration for fallback
const DEFAULT_REFRESH_CONFIG: RefreshConfig = {
  maxConcurrent: 1,
  retryDelay: 60000, // 1 minute
  maxRetries: 2,
  backoffMultiplier: 2
};

const REFRESH_STRATEGIES: Record<string, RefreshConfig> = {
  rate_limited_eager: {
    maxConcurrent: 1,
    retryDelay: 30000, // 30 seconds
    maxRetries: 3,
    backoffMultiplier: 2
  },
  rate_limited_smart: {
    maxConcurrent: 1,
    retryDelay: 60000, // 1 minute
    maxRetries: 2,
    backoffMultiplier: 2
  },
  rate_limited_lazy: {
    maxConcurrent: 1,
    retryDelay: 300000, // 5 minutes
    maxRetries: 1,
    backoffMultiplier: 3
  },
  rate_limited_background: {
    maxConcurrent: 1,
    retryDelay: 600000, // 10 minutes
    maxRetries: 1,
    backoffMultiplier: 5
  },
  smart_update: {
    maxConcurrent: 2,
    retryDelay: 120000, // 2 minutes
    maxRetries: 2,
    backoffMultiplier: 2
  }
};

export class CacheCoordinator {
  private refreshQueue = new Map<string, Promise<any>>();
  private rateLimitTracker = new Map<string, RateLimitTracker>();
  private backoffDelays = new Map<string, number>();
  private lastRefreshTime = new Map<string, number>();
  private serviceStrategies = new Map<string, string>(); // Track which strategy each service is using

  /**
   * ✅ Safe cache refresh - prevents cache stampede and handles rate limiting
   */
  async safeRefreshCache<T>(
    serviceType: string,
    refreshStrategy: string,
    refreshFn: () => Promise<T>
  ): Promise<T> {
    const cacheKey = `${serviceType}_refresh`;
    // ✅ Ensure config is never undefined with proper fallback
    const config: RefreshConfig = REFRESH_STRATEGIES[refreshStrategy] || DEFAULT_REFRESH_CONFIG;
    
    // Track which strategy this service is using
    this.serviceStrategies.set(serviceType, refreshStrategy);
    
    // Check if refresh already in progress
    if (this.refreshQueue.has(cacheKey)) {
      console.log(`[CacheCoordinator] 🔄 Refresh already in progress for ${serviceType}`);
      return this.refreshQueue.get(cacheKey);
    }
    
    // Check minimum interval between refreshes  
    const lastRefresh = this.lastRefreshTime.get(serviceType) || 0;
    const minInterval = Math.max(config.retryDelay / 2, 30000); // At least 30s between refreshes
    const timeSinceLastRefresh = Date.now() - lastRefresh;
    
    if (timeSinceLastRefresh < minInterval) {
      const waitTime = minInterval - timeSinceLastRefresh;
      console.log(`[CacheCoordinator] ⏸️ Rate limiting ${serviceType}, waiting ${waitTime}ms`);
      throw new Error(`Rate limited: ${serviceType}, retry in ${waitTime}ms`);
    }
    
    // Check if currently rate limited
    if (await this.isRateLimited(serviceType, config)) {
      const delay = this.getBackoffDelay(serviceType, config);
      console.log(`[CacheCoordinator] 🚦 Rate limited for ${serviceType}, backing off ${delay}ms`);
      throw new Error(`Rate limited: ${serviceType}, retry in ${delay}ms`);
    }
    
    // Execute refresh with tracking
    const refreshPromise = this.executeWithRateTracking(serviceType, config, refreshFn);
    this.refreshQueue.set(cacheKey, refreshPromise);
    
    try {
      const result = await refreshPromise;
      this.clearBackoff(serviceType);
      this.lastRefreshTime.set(serviceType, Date.now());
      return result;
    } catch (error) {
      this.handleRefreshError(serviceType, config, error);
      throw error;
    } finally {
      this.refreshQueue.delete(cacheKey);
    }
  }

  /**
   * ✅ Execute refresh with rate limit tracking
   */
  private async executeWithRateTracking<T>(
    serviceType: string,
    config: RefreshConfig,
    refreshFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      console.log(`[CacheCoordinator] 🚀 Starting refresh for ${serviceType}`);
      const result = await refreshFn();
      
      // Track successful API call
      this.trackApiCall(serviceType, true);
      
      const duration = Date.now() - startTime;
      console.log(`[CacheCoordinator] ✅ ${serviceType} refresh completed in ${duration}ms`);
      return result;
      
    } catch (error: any) {
      // Track failed API call
      this.trackApiCall(serviceType, false, error);
      
      // Check if this is a rate limit error
      if (this.isRateLimitError(error)) {
        console.log(`[CacheCoordinator] 🚦 Rate limit detected for ${serviceType}:`, error.message);
        this.setRateLimited(serviceType, config);
      }
      
      throw error;
    }
  }

  /**
   * ✅ Check if service is currently rate limited
   */
  private async isRateLimited(serviceType: string, config: RefreshConfig): Promise<boolean> {
    const tracker = this.rateLimitTracker.get(serviceType);
    if (!tracker) return false;
    
    const now = Date.now();
    if (now > tracker.resetTime) {
      this.rateLimitTracker.delete(serviceType);
      return false;
    }
    
    return tracker.count >= config.maxRetries;
  }

  /**
   * ✅ Track API call success/failure
   */
  private trackApiCall(serviceType: string, success: boolean, error?: any): void {
    const now = Date.now();
    const resetWindow = 5 * 60 * 1000; // 5 minute window
    
    let tracker = this.rateLimitTracker.get(serviceType);
    if (!tracker || now > tracker.resetTime) {
      tracker = {
        count: 0,
        resetTime: now + resetWindow
      };
    }
    
    if (!success) {
      tracker.count++;
      tracker.lastError = error?.message || 'Unknown error';
    }
    
    this.rateLimitTracker.set(serviceType, tracker);
  }

  /**
   * ✅ Set service as rate limited
   */
  private setRateLimited(serviceType: string, config: RefreshConfig): void {
    const now = Date.now();
    const lockDuration = this.getBackoffDelay(serviceType, config);
    
    this.rateLimitTracker.set(serviceType, {
      count: config.maxRetries,
      resetTime: now + lockDuration,
      lastError: 'Rate limit exceeded'
    });
  }

  /**
   * ✅ Get exponential backoff delay
   */
  private getBackoffDelay(serviceType: string, config: RefreshConfig): number {
    const currentDelay = this.backoffDelays.get(serviceType) || config.retryDelay;
    const maxDelay = config.retryDelay * 10; // Max 10x base delay
    const nextDelay = Math.min(currentDelay * config.backoffMultiplier, maxDelay);
    
    this.backoffDelays.set(serviceType, nextDelay);
    return currentDelay;
  }

  /**
   * ✅ Clear backoff for service
   */
  private clearBackoff(serviceType: string): void {
    this.backoffDelays.delete(serviceType);
  }

  /**
   * ✅ Handle refresh error
   */
  private handleRefreshError(serviceType: string, config: RefreshConfig, error: any): void {
    console.error(`[CacheCoordinator] ❌ ${serviceType} refresh failed:`, error.message);
    
    if (this.isRateLimitError(error)) {
      const delay = this.getBackoffDelay(serviceType, config);
      console.log(`[CacheCoordinator] 🔒 ${serviceType} locked for ${delay}ms due to rate limiting`);
    }
  }

  /**
   * ✅ Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;
    
    return (
      errorCode === 429 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('concurrent requests')
    );
  }

  /**
   * ✅ Get current rate limit status for service
   */
  getServiceStatus(serviceType: string, refreshStrategy?: string): {
    isRateLimited: boolean;
    nextRetryTime?: number;
    errorCount: number;
    lastError?: string;
  } {
    const tracker = this.rateLimitTracker.get(serviceType);
    const now = Date.now();
    
    if (!tracker || now > tracker.resetTime) {
      return {
        isRateLimited: false,
        errorCount: 0
      };
    }
    
    // ✅ Use strategy-specific maxRetries instead of hardcoded value
    const strategyName = refreshStrategy || this.serviceStrategies.get(serviceType);
    const config = strategyName ? (REFRESH_STRATEGIES[strategyName] || DEFAULT_REFRESH_CONFIG) : DEFAULT_REFRESH_CONFIG;
    const maxRetries = config.maxRetries;
    
    return {
      isRateLimited: tracker.count >= maxRetries, // Use strategy-specific maxRetries
      nextRetryTime: tracker.resetTime,
      errorCount: tracker.count,
      lastError: tracker.lastError
    };
  }

  /**
   * ✅ Force clear rate limits for service (for testing/manual recovery)
   */
  clearRateLimit(serviceType: string): void {
    this.rateLimitTracker.delete(serviceType);
    this.backoffDelays.delete(serviceType);
    this.lastRefreshTime.delete(serviceType);
    this.serviceStrategies.delete(serviceType);
    console.log(`[CacheCoordinator] 🔓 Cleared rate limits for ${serviceType}`);
  }

  /**
   * ✅ Get overall coordinator status
   */
  getStatus(): {
    activeRefreshes: string[];
    rateLimitedServices: string[];
    totalTrackedServices: number;
  } {
    const activeRefreshes = Array.from(this.refreshQueue.keys()).map(key => 
      key.replace('_refresh', '')
    );
    
    // ✅ Use strategy-specific maxRetries for each service instead of hardcoded value
    const rateLimitedServices = Array.from(this.rateLimitTracker.entries())
      .filter(([serviceType, tracker]) => {
        if (Date.now() > tracker.resetTime) return false;
        
        // Get the strategy-specific maxRetries for this service
        const strategyName = this.serviceStrategies.get(serviceType);
        const config = strategyName ? (REFRESH_STRATEGIES[strategyName] || DEFAULT_REFRESH_CONFIG) : DEFAULT_REFRESH_CONFIG;
        const maxRetries = config.maxRetries;
        
        return tracker.count >= maxRetries;
      })
      .map(([service]) => service);
    
    return {
      activeRefreshes,
      rateLimitedServices,
      totalTrackedServices: this.rateLimitTracker.size
    };
  }

  /**
   * ✅ Get strategy configuration for a service
   */
  getServiceStrategy(serviceType: string): { strategyName?: string; config?: RefreshConfig } {
    const strategyName = this.serviceStrategies.get(serviceType);
    const config = strategyName ? (REFRESH_STRATEGIES[strategyName] || DEFAULT_REFRESH_CONFIG) : undefined;
    
    return {
      strategyName,
      config
    };
  }
}

// ✅ Singleton instance
export const cacheCoordinator = new CacheCoordinator(); 