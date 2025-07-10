/**
 * Performance Monitoring Service
 * 
 * Tracks cache performance, response times, and API call reduction metrics
 * to achieve sub-100ms cache responses and 95%+ API call reduction targets.
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  cacheHit: boolean;
}

interface CacheStats {
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_ratio: number;
  api_reduction_percentage: number;
  average_cache_response_time: number;
  average_api_response_time: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheResponseTimes: number[] = [];
  private apiResponseTimes: number[] = [];

  /**
   * Start a performance timer
   */
  startTimer(): number {
    return Date.now();
  }

  /**
   * End a performance timer and return duration
   */
  endTimer(startTime: number): number {
    return Date.now() - startTime;
  }

  /**
   * Record a performance metric
   */
  recordMetric(operation: string, duration: number, cacheHit = false): PerformanceMetric {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      cacheHit
    };

    this.metrics.push(metric);

    // Track cache vs API response times
    if (cacheHit) {
      this.cacheResponseTimes.push(duration);
      this.recordCacheHit();
    } else {
      this.apiResponseTimes.push(duration);
      this.recordCacheMiss();
    }

    return metric;
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Calculate cache hit ratio
   */
  calculateCacheHitRatio(): number {
    const totalRequests = this.cacheHits + this.cacheMisses;
    if (totalRequests === 0) return 0;
    return this.cacheHits / totalRequests;
  }

  /**
   * Calculate API call reduction percentage
   */
  calculateApiReduction(): number {
    const totalRequests = this.cacheHits + this.cacheMisses;
    if (totalRequests === 0) return 0;
    return this.cacheHits / totalRequests;
  }

  /**
   * Get average response time for cache operations
   */
  getAverageCacheResponseTime(): number {
    if (this.cacheResponseTimes.length === 0) return 0;
    return this.cacheResponseTimes.reduce((sum, time) => sum + time, 0) / this.cacheResponseTimes.length;
  }

  /**
   * Get average response time for API operations
   */
  getAverageApiResponseTime(): number {
    if (this.apiResponseTimes.length === 0) return 0;
    return this.apiResponseTimes.reduce((sum, time) => sum + time, 0) / this.apiResponseTimes.length;
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRatio = this.calculateCacheHitRatio();
    const apiReduction = this.calculateApiReduction();

    return {
      total_requests: totalRequests,
      cache_hits: this.cacheHits,
      cache_misses: this.cacheMisses,
      cache_hit_ratio: cacheHitRatio,
      api_reduction_percentage: apiReduction,
      average_cache_response_time: this.getAverageCacheResponseTime(),
      average_api_response_time: this.getAverageApiResponseTime()
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheResponseTimes = [];
    this.apiResponseTimes = [];
  }

  /**
   * Check if cache response time meets target (sub-100ms)
   */
  meetsCacheResponseTarget(targetMs = 100): boolean {
    const avgCacheTime = this.getAverageCacheResponseTime();
    return avgCacheTime < targetMs;
  }

  /**
   * Check if API reduction meets target (95%+)
   */
  meetsApiReductionTarget(targetPercentage = 0.95): boolean {
    const apiReduction = this.calculateApiReduction();
    return apiReduction >= targetPercentage;
  }

  /**
   * Get performance improvement ratio (how much faster cache is vs API)
   */
  getPerformanceImprovementRatio(): number {
    const avgApiTime = this.getAverageApiResponseTime();
    const avgCacheTime = this.getAverageCacheResponseTime();
    
    if (avgCacheTime === 0) return 0;
    return avgApiTime / avgCacheTime;
  }
}

// Global singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types for use in components
export type { PerformanceMetric, CacheStats }; 