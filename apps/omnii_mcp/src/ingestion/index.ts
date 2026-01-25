/**
 * Data Ingestion Module
 *
 * Infrastructure for ingesting external data sources into the knowledge graph.
 * - Composio client for Google OAuth and API calls
 * - BullMQ queue for background job processing
 * - Sync state for incremental sync tracking
 * - Validators for data quality gates
 */

// Infrastructure
export { getComposioClient, type ComposioClient } from "./composio-client";
export { getRedisConnection, createIngestionQueue } from "./jobs/queue";

// Sync State
export {
  SyncStateService,
  getSyncStateService,
  type SyncSource,
  type SyncStatus,
  type SyncState,
  type SyncStateUpdate,
} from "./sync-state";

// Validators
export {
  CalendarEventSchema,
  GoogleTaskSchema,
  GoogleTaskListSchema,
  GmailMessageSchema,
  GoogleContactSchema,
  validateIngestionData,
  type CalendarEvent,
  type GoogleTask,
  type GoogleTaskList,
  type GmailMessage,
  type GoogleContact,
} from "./validators";
