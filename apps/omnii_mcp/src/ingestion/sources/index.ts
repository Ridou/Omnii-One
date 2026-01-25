/**
 * Ingestion Sources
 *
 * Per-source data ingestion services.
 */

// Calendar
export {
  CalendarIngestionService,
  getCalendarIngestionService,
  ingestCalendarEvents,
  type CalendarSyncResult,
} from "./google-calendar";

// Tasks
export {
  TasksIngestionService,
  getTasksIngestionService,
  ingestTasks,
  type TasksSyncResult,
} from "./google-tasks";

// Gmail
export {
  GmailIngestionService,
  getGmailIngestionService,
  ingestGmail,
  type GmailSyncResult,
} from "./google-gmail";

// Contacts
export {
  ContactsIngestionService,
  getContactsIngestionService,
  ingestContacts,
  type ContactsSyncResult,
} from "./google-contacts";
