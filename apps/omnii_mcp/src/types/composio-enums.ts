/**
 * Composio Integration Enums
 *
 * Centralized enums for Composio SDK integration
 */

/**
 * Supported Composio Apps
 */
export enum ComposioApp {
  GOOGLE_CALENDAR = "googlecalendar",
  GOOGLE_TASKS = "googletasks",
  GOOGLE_CONTACTS = "googlesuper",
  GMAIL = "gmail",
  SLACK = "slack",
  NOTION = "notion",
  GITHUB = "github",
}

/**
 * Unified Google Service Types
 */
export enum GoogleServiceType {
  CALENDAR = "CALENDAR",
  CONTACTS = "CONTACTS",
  TASKS = "TASKS",
  EMAIL = "EMAIL",
}

/**
 * Google Calendar Actions
 */
export enum GoogleCalendarAction {
  LIST_EVENTS = "GOOGLECALENDAR_LIST_EVENTS",
  FIND_EVENT = "GOOGLECALENDAR_FIND_EVENT",
  CREATE_EVENT = "GOOGLECALENDAR_CREATE_EVENT",
  UPDATE_EVENT = "GOOGLECALENDAR_UPDATE_EVENT",
  DELETE_EVENT = "GOOGLECALENDAR_DELETE_EVENT",
  LIST_CALENDARS = "GOOGLECALENDAR_LIST_CALENDARS",
  GET_CALENDAR = "GOOGLECALENDAR_GET_CALENDAR",
  CREATE_CALENDAR = "GOOGLECALENDAR_CREATE_CALENDAR",
  PATCH_CALENDAR = "GOOGLECALENDAR_PATCH_CALENDAR",
  DELETE_CALENDAR = "GOOGLECALENDAR_DELETE_CALENDAR",
  FIND_FREE_SLOTS = "GOOGLECALENDAR_FIND_FREE_SLOTS",
  QUICK_ADD = "GOOGLECALENDAR_QUICK_ADD",
  REMOVE_ATTENDEE = "GOOGLECALENDAR_REMOVE_ATTENDEE",
  SYNC_EVENTS = "GOOGLECALENDAR_SYNC_EVENTS",
  GET_CURRENT_DATE_TIME = "GOOGLECALENDAR_GET_CURRENT_DATE_TIME"
}

/**
 * Google Contacts Actions
 */
export enum GoogleContactsAction {
  LIST_CONTACTS = "GOOGLEPEOPLE_LIST_PEOPLE",//"GMAIL_GET_PEOPLE",
  SEARCH_CONTACTS =  "GOOGLESUPER_SEARCH_PEOPLE", // "GMAIL_SEARCH_PEOPLE",
  CREATE_CONTACT = "GOOGLE_CREATE_CONTACT",
}

/**
 * Google Tasks Actions
 */
export enum GoogleTasksAction {
  LIST_TASK_LISTS = "GOOGLETASKS_LIST_TASK_LISTS",
  GET_TASK_LIST = "GOOGLETASKS_GET_TASK_LIST",
  CREATE_TASK_LIST = "GOOGLETASKS_CREATE_TASK_LIST",
  UPDATE_TASK_LIST = "GOOGLETASKS_UPDATE_TASK_LIST",
  DELETE_TASK_LIST = "GOOGLETASKS_DELETE_TASK_LIST",
  LIST_TASKS = "GOOGLETASKS_LIST_TASKS",
  GET_TASK = "GOOGLETASKS_GET_TASK",
  INSERT_TASK = "GOOGLETASKS_INSERT_TASK",
  UPDATE_TASK = "GOOGLETASKS_UPDATE_TASK",
  DELETE_TASK = "GOOGLETASKS_DELETE_TASK",
  CLEAR_COMPLETED = "GOOGLETASKS_CLEAR_COMPLETED",
  MOVE_TASK = "GOOGLETASKS_MOVE_TASK"
}

/**
 * Gmail Actions
 */
export enum GmailAction {
  SEND_EMAIL = "GMAIL_SEND_EMAIL",
  CREATE_DRAFT = "GMAIL_CREATE_EMAIL_DRAFT",
  FETCH_EMAILS = "GMAIL_FETCH_EMAILS",
  ADD_LABEL = "GMAIL_ADD_LABEL_TO_EMAIL",
  CREATE_LABEL = "GMAIL_CREATE_LABEL",
  DELETE_DRAFT = "GMAIL_DELETE_DRAFT",
  DELETE_MESSAGE = "GMAIL_DELETE_MESSAGE",
  FETCH_MESSAGE_BY_ID = "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
  FETCH_MESSAGE_BY_THREAD = "GMAIL_FETCH_MESSAGE_BY_THREAD_ID",
  GET_ATTACHMENT = "GMAIL_GET_ATTACHMENT",
  GET_PROFILE = "GMAIL_GET_PROFILE",
  LIST_DRAFTS = "GMAIL_LIST_DRAFTS",
  LIST_LABELS = "GMAIL_LIST_LABELS",
  LIST_THREADS = "GMAIL_LIST_THREADS",
  MODIFY_THREAD_LABELS = "GMAIL_MODIFY_THREAD_LABELS",
  MOVE_TO_TRASH = "GMAIL_MOVE_TO_TRASH",
  REMOVE_LABEL = "GMAIL_REMOVE_LABEL",
  REPLY_TO_THREAD = "GMAIL_REPLY_TO_THREAD",
  GET_EMAIL = "GMAIL_GET_EMAIL",
  REPLY_TO_EMAIL = "GMAIL_REPLY_TO_EMAIL",
  FORWARD_EMAIL = "GMAIL_FORWARD_EMAIL",
  DELETE_EMAIL = "GMAIL_DELETE_EMAIL",
  MARK_AS_READ = "GMAIL_MARK_AS_READ",
  MARK_AS_UNREAD = "GMAIL_MARK_AS_UNREAD",
  UPDATE_LABEL = "GMAIL_UPDATE_LABEL",
  DELETE_LABEL = "GMAIL_DELETE_LABEL"
}

/**
 * Google Service Action Configuration
 */
export interface GoogleServiceAction {
  action: string;
  description: string;
}

/**
 * Google Service Configuration
 */
export interface GoogleServiceConfig {
  type: GoogleServiceType;
  integrationId: string;
  appName: string;
  serviceName: string;
  actions: Record<string, GoogleServiceAction>;
  useCustomAuthOnly: boolean; // Bypass Composio connections, use custom OAuth tokens from Supabase
}

/**
 * Unified Google Service Configurations
 */
export const GOOGLE_SERVICES: Record<GoogleServiceType, GoogleServiceConfig> = {
  [GoogleServiceType.CALENDAR]: {
    type: GoogleServiceType.CALENDAR,
    integrationId: "6bdc82b8-303c-4142-a0a0-2d09c9d50d8c",
    appName: ComposioApp.GOOGLE_CALENDAR,
    serviceName: "Google Calendar",
    useCustomAuthOnly: true,
    actions: {
      LIST_EVENTS: {
        action: GoogleCalendarAction.LIST_EVENTS,
        description: "List calendar events within a time range. Use time_min and time_max parameters. Default to showing last week + this week. Include userId for authentication."
      },
      GET_EVENT: {
        action: GoogleCalendarAction.FIND_EVENT,
        description: "Get details of a specific calendar event. Requires event_id parameter. Include userId for authentication."
      },
      CREATE_EVENT: {
        action: GoogleCalendarAction.CREATE_EVENT,
        description: "Create a new calendar event. Requires summary (title), start_datetime, and event_duration_minutes. Use ISO format dates like '2024-01-15T14:00:00Z'. Include userId for authentication."
      },
      UPDATE_EVENT: {
        action: GoogleCalendarAction.UPDATE_EVENT,
        description: "Update an existing calendar event. Requires event_id and the fields to update (summary, start_datetime, etc). Include userId for authentication."
      },
      DELETE_EVENT: {
        action: GoogleCalendarAction.DELETE_EVENT,
        description: "Delete a calendar event. Requires event_id parameter. Include userId for authentication."
      },
      LIST_CALENDARS: {
        action: GoogleCalendarAction.LIST_CALENDARS,
        description: "List all available calendars (personal, shared, etc). Include userId for authentication."
      },
      GET_CALENDAR: {
        action: GoogleCalendarAction.GET_CALENDAR,
        description: "Get details of a specific calendar. Requires calendar_id parameter. Include userId for authentication."
      },
      CREATE_CALENDAR: {
        action: GoogleCalendarAction.CREATE_CALENDAR,
        description: "Create a new calendar. Requires summary (name) parameter. Include userId for authentication."
      },
      UPDATE_CALENDAR: {
        action: GoogleCalendarAction.PATCH_CALENDAR,
        description: "Update calendar settings. Requires calendar_id and fields to update. Include userId for authentication."
      },
      DELETE_CALENDAR: {
        action: GoogleCalendarAction.DELETE_CALENDAR,
        description: "Delete a calendar. Requires calendar_id parameter. Include userId for authentication."
      },
      GET_FREE_BUSY: {
        action: GoogleCalendarAction.FIND_FREE_SLOTS,
        description: "Find available time slots in the calendar. Requires time_min, time_max, and timezone parameters. Useful for scheduling. Include userId for authentication."
      },
      QUICK_ADD: {
        action: GoogleCalendarAction.QUICK_ADD,
        description: "Quickly add an event using natural language. Requires text parameter. Include userId for authentication."
      },
      REMOVE_ATTENDEE: {
        action: GoogleCalendarAction.REMOVE_ATTENDEE,
        description: "Remove an attendee from an event. Requires event_id and attendee_email. Include userId for authentication."
      },
      SYNC_EVENTS: {
        action: GoogleCalendarAction.SYNC_EVENTS,
        description: "Synchronize calendar events with external sources. Include userId for authentication."
      },
      GET_CURRENT_DATE_TIME: {
        action: GoogleCalendarAction.GET_CURRENT_DATE_TIME,
        description: "Get the current date and time for context-aware calendar operations. Useful for relative time calculations."
      }
    },
  },
  [GoogleServiceType.CONTACTS]: {
    type: GoogleServiceType.CONTACTS,
    integrationId: "6bdc82b8-303c-4142-a0a0-2d09c9d50d8c",
    appName: ComposioApp.GOOGLE_CONTACTS,
    serviceName: "Google Contacts",
    useCustomAuthOnly: true,
    actions: {
      LIST_CONTACTS: {
        action: GoogleContactsAction.LIST_CONTACTS,
        description: "List all contacts. Include userId for authentication."
      },
      SEARCH_CONTACTS: {
        action: GoogleContactsAction.SEARCH_CONTACTS,
        description: "Search contacts by name, email, or phone. Include userId for authentication."
      },
      CREATE_CONTACT: {
        action: GoogleContactsAction.CREATE_CONTACT,
        description: "Create a new contact. Requires name and email. Include userId for authentication."
      }
    },
  },
  [GoogleServiceType.TASKS]: {
    type: GoogleServiceType.TASKS,
    integrationId: "6bdc82b8-303c-4142-a0a0-2d09c9d50d8c",
    appName: ComposioApp.GOOGLE_TASKS,
    serviceName: "Google Tasks",
    useCustomAuthOnly: true,
    actions: {
      LIST_TASK_LISTS: {
        action: GoogleTasksAction.LIST_TASK_LISTS,
        description: "List all task lists. Include userId for authentication."
      },
      GET_TASK_LIST: {
        action: GoogleTasksAction.GET_TASK_LIST,
        description: "Get details of a specific task list. Requires task_list_id. Include userId for authentication."
      },
      CREATE_TASK_LIST: {
        action: GoogleTasksAction.CREATE_TASK_LIST,
        description: "Create a new task list. Requires title. Include userId for authentication."
      },
      UPDATE_TASK_LIST: {
        action: GoogleTasksAction.UPDATE_TASK_LIST,
        description: "Update a task list. Requires task_list_id and fields to update. Include userId for authentication."
      },
      DELETE_TASK_LIST: {
        action: GoogleTasksAction.DELETE_TASK_LIST,
        description: "Delete a task list. Requires task_list_id. Include userId for authentication."
      },
      LIST_TASKS: {
        action: GoogleTasksAction.LIST_TASKS,
        description: "List tasks in a task list. Requires task_list_id. Include userId for authentication."
      },
      GET_TASK: {
        action: GoogleTasksAction.GET_TASK,
        description: "Get details of a specific task. Requires task_list_id and task_id. Include userId for authentication."
      },
      INSERT_TASK: {
        action: GoogleTasksAction.INSERT_TASK,
        description: "Create a new task. Requires task_list_id and title. Include userId for authentication."
      },
      UPDATE_TASK: {
        action: GoogleTasksAction.UPDATE_TASK,
        description: "Update a task. Requires task_list_id, task_id, and fields to update. Include userId for authentication."
      },
      DELETE_TASK: {
        action: GoogleTasksAction.DELETE_TASK,
        description: "Delete a task. Requires task_list_id and task_id. Include userId for authentication."
      },
      CLEAR_COMPLETED: {
        action: GoogleTasksAction.CLEAR_COMPLETED,
        description: "Clear all completed tasks in a list. Requires task_list_id. Include userId for authentication."
      },
      MOVE_TASK: {
        action: GoogleTasksAction.MOVE_TASK,
        description: "Move a task to a different position. Requires task_list_id, task_id, and new position. Include userId for authentication."
      }
    },
  },
  [GoogleServiceType.EMAIL]: {
    type: GoogleServiceType.EMAIL,
    integrationId: "6bdc82b8-303c-4142-a0a0-2d09c9d50d8c",
    appName: ComposioApp.GMAIL,
    serviceName: "Gmail",
    useCustomAuthOnly: true,
    actions: {
      SEND_EMAIL: {
        action: GmailAction.SEND_EMAIL,
        description: "Send an email. Requires to, subject, and body. Include userId for authentication."
      },
      CREATE_DRAFT: {
        action: GmailAction.CREATE_DRAFT,
        description: "Create a draft email. Requires to, subject, and body. Include userId for authentication."
      },
      FETCH_EMAILS: {
        action: GmailAction.FETCH_EMAILS,
        description: "Fetch emails from inbox. Optional: max_results, query. Include userId for authentication."
      },
      GET_EMAIL: {
        action: GmailAction.GET_EMAIL,
        description: "Get details of a specific email. Requires message_id. Include userId for authentication."
      },
      REPLY_TO_EMAIL: {
        action: GmailAction.REPLY_TO_EMAIL,
        description: "Reply to an email. Requires message_id and body. Include userId for authentication."
      },
      FORWARD_EMAIL: {
        action: GmailAction.FORWARD_EMAIL,
        description: "Forward an email. Requires message_id and to. Include userId for authentication."
      },
      DELETE_EMAIL: {
        action: GmailAction.DELETE_EMAIL,
        description: "Delete an email. Requires message_id. Include userId for authentication."
      },
      MARK_AS_READ: {
        action: GmailAction.MARK_AS_READ,
        description: "Mark an email as read. Requires message_id. Include userId for authentication."
      },
      MARK_AS_UNREAD: {
        action: GmailAction.MARK_AS_UNREAD,
        description: "Mark an email as unread. Requires message_id. Include userId for authentication."
      },
      ADD_LABEL: {
        action: GmailAction.ADD_LABEL,
        description: "Add a label to an email. Requires message_id and label. Include userId for authentication."
      },
      REMOVE_LABEL: {
        action: GmailAction.REMOVE_LABEL,
        description: "Remove a label from an email. Requires message_id and label. Include userId for authentication."
      },
      LIST_LABELS: {
        action: GmailAction.LIST_LABELS,
        description: "List all available labels. Include userId for authentication."
      },
      CREATE_LABEL: {
        action: GmailAction.CREATE_LABEL,
        description: "Create a new label. Requires name. Include userId for authentication."
      },
      UPDATE_LABEL: {
        action: GmailAction.UPDATE_LABEL,
        description: "Update a label. Requires label_id and fields to update. Include userId for authentication."
      },
      DELETE_LABEL: {
        action: GmailAction.DELETE_LABEL,
        description: "Delete a label. Requires label_id. Include userId for authentication."
      }
    },
  },
};

/**
 * Connection Status States
 */
export enum ConnectionStatus {
  ACTIVE = "active",
  INITIATED = "initiated",
  FAILED = "failed",
  EXPIRED = "expired",
  DISCONNECTED = "disconnected",
}

// Helper functions to access service configurations
export const getGoogleServiceConfig = (type: GoogleServiceType): GoogleServiceConfig => {
  return GOOGLE_SERVICES[type];
};

export const getGoogleServiceAction = (type: GoogleServiceType, action: string): string => {
  return GOOGLE_SERVICES[type].actions[action].action;
};

export const getGoogleServiceActionDescription = (type: GoogleServiceType, action: string): string => {
  return GOOGLE_SERVICES[type].actions[action].description;
};

export const getGoogleServiceIntegrationId = (type: GoogleServiceType): string => {
  return GOOGLE_SERVICES[type].integrationId;
};

export const getGoogleServiceAppName = (type: GoogleServiceType): string => {
  return GOOGLE_SERVICES[type].appName;
};
