/**
 * Ingestion Jobs Module
 *
 * BullMQ-based background job processing for data sync.
 */

export { getRedisConnection, createIngestionQueue } from "./queue";

export {
  enqueueSyncJob,
  startSyncScheduler,
  stopSyncScheduler,
  getSchedulerStatus,
  enqueueAllUserSyncs,
  type SyncJobData,
} from "./sync-scheduler";

export {
  startIngestionWorkers,
  stopIngestionWorkers,
  getWorkerStatus,
} from "./workers";
