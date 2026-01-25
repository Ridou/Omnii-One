/**
 * Ingestion Workers
 *
 * BullMQ workers that process sync jobs from the queue.
 * Handles per-user sync with rate limiting and error recovery.
 */

import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./queue";
import { enqueueAllUserSyncs, type SyncJobData } from "./sync-scheduler";
import { ingestCalendarEvents, type CalendarSyncResult } from "../sources/google-calendar";
import { getSyncStateService } from "../sync-state";

// Worker instances for cleanup
let syncWorker: Worker<SyncJobData> | null = null;

/**
 * Process a sync job
 */
async function processSyncJob(job: Job<SyncJobData>): Promise<{
  success: boolean;
  usersProcessed?: number;
  result?: CalendarSyncResult;
}> {
  const { source, userId } = job.data;

  console.log(`Processing sync job ${job.id}: source=${source}, userId=${userId || "all"}`);

  // If no userId, this is a scheduled job - fan out to all users
  if (!userId) {
    const usersEnqueued = await enqueueAllUserSyncs(source);
    return { success: true, usersProcessed: usersEnqueued };
  }

  // Process single user sync
  try {
    // Get user's Neo4j client
    // Dynamic import to avoid circular dependencies
    const { createClientForUser } = await import("../../services/neo4j/http-client");
    const client = await createClientForUser(userId);

    if (!client) {
      console.warn(`User ${userId} has no Neo4j database, skipping sync`);
      return { success: true }; // Not an error, just skip
    }

    // Run the appropriate sync based on source
    let result: CalendarSyncResult;

    switch (source) {
      case "google_calendar":
        result = await ingestCalendarEvents(userId, client);
        break;

      // Future sources will be added here
      // case "google_tasks":
      //   result = await ingestTasks(userId, client);
      //   break;
      // case "google_gmail":
      //   result = await ingestGmail(userId, client);
      //   break;
      // case "google_contacts":
      //   result = await ingestContacts(userId, client);
      //   break;

      default:
        throw new Error(`Unsupported sync source: ${source}`);
    }

    console.log(
      `Sync complete for user ${userId}: ${result.eventsCreated} events, ${result.contactsCreated} contacts`
    );

    return { success: result.success, result };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Sync failed for user ${userId}:`, errorMessage);

    // Mark sync as failed
    const syncStateService = getSyncStateService();
    await syncStateService.markSyncFailed(userId, source, errorMessage);

    // Re-throw to trigger BullMQ retry
    throw error;
  }
}

/**
 * Start the ingestion workers
 *
 * @param concurrency - Number of concurrent jobs (default: 3)
 */
export async function startIngestionWorkers(concurrency: number = 3): Promise<void> {
  if (syncWorker) {
    console.warn("Ingestion workers already running");
    return;
  }

  const connection = getRedisConnection();

  syncWorker = new Worker<SyncJobData>(
    "data-sync",
    processSyncJob,
    {
      connection,
      concurrency,
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 60000, // Per minute (respects Google API quota)
      },
    }
  );

  // Event handlers for monitoring
  syncWorker.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed:`, JSON.stringify(result).slice(0, 200));
  });

  syncWorker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
  });

  syncWorker.on("error", (error) => {
    console.error("Worker error:", error);
  });

  syncWorker.on("stalled", (jobId) => {
    console.warn(`Job ${jobId} stalled`);
  });

  console.log(`Ingestion worker started with concurrency ${concurrency}`);
}

/**
 * Stop the ingestion workers gracefully
 */
export async function stopIngestionWorkers(): Promise<void> {
  if (syncWorker) {
    await syncWorker.close();
    syncWorker = null;
    console.log("Ingestion worker stopped");
  }
}

/**
 * Get worker status
 */
export function getWorkerStatus(): {
  running: boolean;
  concurrency?: number;
} {
  if (!syncWorker) {
    return { running: false };
  }

  return {
    running: true,
    concurrency: syncWorker.opts.concurrency,
  };
}
