// =======================================================================
// RDF CACHE SERVICE
// Simple in-memory cache for RDF operations
// =======================================================================

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

class RDFCacheService {
  private cache = new Map<string, CacheItem>();
  private defaultTtl = 1800000; // 30 minutes

  set(key: string, data: any, ttl?: number): void {
    const cacheItem: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    };
    
    this.cache.set(key, cacheItem);
    console.log(`[RDFCache] Cached item: ${key} (TTL: ${cacheItem.ttl}ms)`);
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      console.log(`[RDFCache] Expired and removed: ${key}`);
      return null;
    }
    
    console.log(`[RDFCache] Cache hit: ${key}`);
    return item.data;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`[RDFCache] Deleted: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[RDFCache] Cleared ${size} items`);
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[RDFCache] Cleaned up ${cleaned} expired items`);
    }
  }

  // Get cache statistics
  getStats(): { size: number; hits: number; misses: number } {
    // Basic stats - could be enhanced with hit/miss tracking
    return {
      size: this.cache.size,
      hits: 0, // Would need tracking
      misses: 0 // Would need tracking
    };
  }
}

// Export singleton instance
export const rdfCache = new RDFCacheService();

// Optional: Set up periodic cleanup
setInterval(() => {
  rdfCache.cleanup();
}, 300000); // Clean every 5 minutes 