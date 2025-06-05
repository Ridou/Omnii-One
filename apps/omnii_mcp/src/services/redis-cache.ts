import { createClient, RedisClientType } from "redis";
import * as dotenv from "dotenv";

dotenv.config();

class RedisCache {
  private client: RedisClientType | null = null;
  private TTL = 60 * 60; // 1 hour cache TTL by default
  private isConnected = false;
  private isRedisAvailable = true;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    // Check if Redis should be disabled
    if (process.env.DISABLE_REDIS === 'true') {
      console.log('⚠️  Redis caching disabled via DISABLE_REDIS environment variable');
      this.isRedisAvailable = false;
      return;
    }

    // Use public Railway Redis URL for both local and production
    const redisUrl = process.env.REDIS_URL || "redis://default:udnAmLnQiUKdYkNFYIlrOpJmKzTtYlpm@redis-production-7aec.up.railway.app:6379";

    try {
      this.client = createClient({
        url: redisUrl,
      });

      this.client.on("error", (err: Error) => {
        console.error("Redis Error:", err);
        this.isConnected = false;
        this.isRedisAvailable = false;
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        this.isRedisAvailable = true;
      });

      // Don't connect immediately - do it lazily when first needed
      // This prevents blocking the application startup
    } catch (err) {
      console.warn("⚠️  Redis client creation failed - caching disabled");
      this.isRedisAvailable = false;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isRedisAvailable || !this.client) return;
    
    if (this.isConnected) return;
    
    // If connection is already in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    // Start connection
    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  private async connect(): Promise<void> {
    if (!this.isRedisAvailable || !this.client) return;

    try {
      await this.client.connect();
      console.log(`✅ Redis connected successfully on ${process.env.REDIS_URL || 'redis-production-7aec.up.railway.app:6379'}`);
      this.isConnected = true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn("⚠️  Redis connection failed - caching disabled:", errorMessage);
      console.warn("   Application will continue without Redis caching");
      this.isConnected = false;
      this.isRedisAvailable = false;
    } finally {
      this.connectionPromise = null;
    }
  }

  async get(key: string): Promise<any> {
    try {
      await this.ensureConnection();
      
      if (!this.isRedisAvailable || !this.isConnected || !this.client) {
        return null; // Cache miss - fallback to direct database query
      }

      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Redis get error:", err);
      return null; // Cache miss - fallback to direct database query
    }
  }

  async set(key: string, value: any, ttl = this.TTL): Promise<void> {
    try {
      await this.ensureConnection();
      
      if (!this.isRedisAvailable || !this.isConnected || !this.client) {
        return; // Skip caching if Redis is not available
      }

      await this.client.set(key, JSON.stringify(value), { EX: ttl });
    } catch (err) {
      console.error("Redis set error:", err);
      // Don't throw - just skip caching
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.ensureConnection();
      
      if (!this.isRedisAvailable || !this.isConnected || !this.client) {
        return; // Skip if Redis is not available
      }

      await this.client.del(key);
    } catch (err) {
      console.error("Redis del error:", err);
      // Don't throw - just skip cache deletion
    }
  }

  getCacheKey(userId: string, queryType: string, query: string): string {
    return `${userId}:${queryType}:${query}`;
  }

  // Helper method to check if Redis is available
  isAvailable(): boolean {
    return this.isRedisAvailable && this.isConnected;
  }
}

export const redisCache = new RedisCache();
