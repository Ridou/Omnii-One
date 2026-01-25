/**
 * Ingestion Sources
 *
 * Per-source data ingestion services.
 * Each service handles fetching, validating, and inserting data from one Google service.
 */

export {
  CalendarIngestionService,
  getCalendarIngestionService,
  ingestCalendarEvents,
  type CalendarSyncResult,
} from "./google-calendar";
