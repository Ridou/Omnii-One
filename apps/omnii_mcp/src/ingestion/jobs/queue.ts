/**
 * BullMQ Queue Factory
 *
 * Provides Redis connection and queue factory for ingestion jobs.
 * BullMQ handles background job processing with automatic retries
 * using exponential backoff for rate limiting.
 */

import { Queue } from "bullmq";
import Redis from "ioredis";

let _redis: Redis | null = null;

/**
 * Get the shared Redis connection for BullMQ.
 * Creates the connection on first use (lazy initialization).
 *
 * @returns Redis connection instance
 */
export function getRedisConnection(): Redis {
  if (!_redis) {
    const redisUrl = process.env.OMNII_REDIS_URL || "redis://localhost:6379";
    _redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ compatibility
    });
  }
  return _redis;
}

/**
 * Create a named BullMQ queue for ingestion jobs.
 *
 * Default job options:
 * - 3 retry attempts with exponential backoff (1s, 2s, 4s)
 * - Keeps last 100 completed jobs for inspection
 * - Keeps last 500 failed jobs for debugging
 *
 * @param name - Queue name (e.g., "calendar-sync", "contacts-import")
 * @returns BullMQ Queue instance
 */
export function createIngestionQueue(name: string): Queue {
  return new Queue(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs for debugging
    },
  });
}
