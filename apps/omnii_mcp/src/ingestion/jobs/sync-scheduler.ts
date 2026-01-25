/**
 * Sync Job Scheduler
 *
 * Uses BullMQ Job Schedulers API (v5.16.0+) for cron-based sync scheduling.
 * Adds jitter to prevent thundering herd on Google APIs.
 */

import { Queue } from "bullmq";
import { createIngestionQueue, getRedisConnection } from "./queue";
import { getSyncStateService, type SyncSource } from "../sync-state";

/**
 * Job data structure for sync jobs
 */
export interface SyncJobData {
  source: SyncSource;
  userId?: string; // If set, sync only this user. If null, sync all users.
  extractEntities?: boolean; // Whether to extract entities during sync (default: true)
}

// Queue instance
let syncQueue: Queue<SyncJobData> | null = null;

// Track scheduled jobs for cleanup
const scheduledJobs = new Set<string>();

/**
 * Get or create the sync queue
 */
function getSyncQueue(): Queue<SyncJobData> {
  if (!syncQueue) {
    syncQueue = createIngestionQueue("data-sync") as Queue<SyncJobData>;
  }
  return syncQueue;
}

/**
 * Add a sync job to the queue with jitter
 *
 * @param source - Which service to sync
 * @param userId - Optional user ID (null = all users)
 * @param delayMs - Optional delay in milliseconds
 */
export async function enqueueSyncJob(
  source: SyncSource,
  userId?: string,
  delayMs?: number
): Promise<string> {
  const queue = getSyncQueue();

  // Add jitter to prevent thundering herd (0-5 seconds)
  const jitter = Math.floor(Math.random() * 5000);
  const totalDelay = (delayMs || 0) + jitter;

  const job = await queue.add(
    `sync-${source}`,
    { source, userId },
    {
      delay: totalDelay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000, // Start with 1 second
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    }
  );

  console.log(
    `Enqueued sync job ${job.id} for ${source}${userId ? ` (user: ${userId})` : ""} with ${totalDelay}ms delay`
  );

  return job.id ?? "";
}

/**
 * Schedule recurring sync jobs using BullMQ repeatable jobs
 *
 * Note: BullMQ 5.16.0+ has Job Schedulers API, but we use repeatable jobs
 * for broader compatibility. Upgrade to Job Schedulers when BullMQ 6.x is stable.
 */
export async function startSyncScheduler(
  cronPattern: string = "*/15 * * * *" // Every 15 minutes by default
): Promise<void> {
  const queue = getSyncQueue();

  // Remove any existing repeatable jobs for clean restart
  const existingJobs = await queue.getRepeatableJobs();
  for (const job of existingJobs) {
    if (job.name.startsWith("scheduled-sync-")) {
      await queue.removeRepeatableByKey(job.key);
      console.log(`Removed existing scheduled job: ${job.name}`);
    }
  }

  // Schedule calendar sync
  await queue.add(
    "scheduled-sync-calendar",
    { source: "google_calendar" as SyncSource },
    {
      repeat: {
        pattern: cronPattern,
      },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  scheduledJobs.add("scheduled-sync-calendar");
  console.log(`Scheduled calendar sync with pattern: ${cronPattern}`);

  // Future: Add other sources here
  // scheduledJobs.add("scheduled-sync-tasks");
  // scheduledJobs.add("scheduled-sync-gmail");
  // scheduledJobs.add("scheduled-sync-contacts");
}

/**
 * Stop the sync scheduler and remove repeatable jobs
 */
export async function stopSyncScheduler(): Promise<void> {
  const queue = getSyncQueue();

  const jobs = await queue.getRepeatableJobs();
  for (const job of jobs) {
    if (scheduledJobs.has(job.name)) {
      await queue.removeRepeatableByKey(job.key);
      scheduledJobs.delete(job.name);
      console.log(`Stopped scheduled job: ${job.name}`);
    }
  }
}

/**
 * Get status of scheduled jobs
 */
export async function getSchedulerStatus(): Promise<{
  scheduled: string[];
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}> {
  const queue = getSyncQueue();
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return {
    scheduled: Array.from(scheduledJobs),
    queue: { waiting, active, completed, failed },
  };
}

/**
 * Enqueue sync for all users with connected accounts
 *
 * Called by the scheduled job worker to fan out to per-user sync jobs.
 */
export async function enqueueAllUserSyncs(source: SyncSource): Promise<number> {
  const syncStateService = getSyncStateService();

  // Get users that need sync (haven't synced in last 15 minutes)
  const userIds = await syncStateService.getUsersNeedingSync(source, 15);

  // Enqueue sync job for each user with staggered delays
  for (let i = 0; i < userIds.length; i++) {
    // Stagger jobs: first user immediately, then 1s apart + jitter
    const baseDelay = i * 1000;
    await enqueueSyncJob(source, userIds[i], baseDelay);
  }

  console.log(`Enqueued ${userIds.length} user sync jobs for ${source}`);
  return userIds.length;
}
