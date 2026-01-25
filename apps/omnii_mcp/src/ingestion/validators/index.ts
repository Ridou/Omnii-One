/**
 * Ingestion Validators
 *
 * Quality gate schemas for Google service data.
 * Use validateIngestionData() to validate and type data before graph insertion.
 */

export {
  // Calendar
  CalendarEventSchema,
  type CalendarEvent,

  // Tasks
  GoogleTaskSchema,
  GoogleTaskListSchema,
  type GoogleTask,
  type GoogleTaskList,

  // Gmail
  GmailMessageSchema,
  type GmailMessage,

  // Contacts
  GoogleContactSchema,
  type GoogleContact,

  // Helper
  validateIngestionData,
} from "./schemas";
