// Zod validation schemas for UnifiedToolResponse
// Install with: npm install zod

import { z } from 'zod';

// ✅ PHASE 1: ZOD STATIC VALIDATION FOUNDATION

// ✅ SERVICE TYPE ENUM: Build discriminated union off of enum
export enum ServiceType {
  EMAIL = 'email',
  CALENDAR = 'calendar', 
  CONTACT = 'contact',
  TASK = 'task',
  GENERAL = 'general'
}

// Core action schema
export const UnifiedActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['primary', 'secondary', 'destructive']),
  icon: z.string().optional(),
  command: z.string().optional(),
});

// Email data schemas
export const EmailDataSchema = z.object({
  id: z.string().optional(),
  subject: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  body: z.string(),
  messageText: z.string().optional(),
  preview: z.string().optional(),
  sender: z.string().optional(),
  date: z.string().optional(),
  threadId: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
    downloadUrl: z.string().optional(),
  })).optional(),
  isRead: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  messageId: z.string().optional(),
  messageTimestamp: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

export const EmailListDataSchema = z.object({
  emails: z.array(EmailDataSchema),
  totalCount: z.number(),
  unreadCount: z.number(),
  query: z.string().optional(),
  hasMore: z.boolean().optional(),
});

export const SingleEmailDataSchema = z.object({
  email: EmailDataSchema,
});

// Calendar data schemas  
export const CalendarDataSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  attendees: z.array(z.object({
    email: z.string(),
    name: z.string().optional(),
    status: z.enum(['accepted', 'declined', 'pending']).optional(),
  })),
  location: z.string().optional(),
  description: z.string().optional(),
  meetingLink: z.string().optional(),
  eventId: z.string().optional(),
});

export const CalendarListDataSchema = z.object({
  events: z.array(CalendarDataSchema),
  totalCount: z.number(),
  hasMore: z.boolean().optional(),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

// Contact data schemas
export const ContactDataSchema = z.object({
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  emails: z.array(z.object({
    address: z.string(),
    type: z.enum(['work', 'personal', 'other']),
    verified: z.boolean().optional(),
  })),
  phones: z.array(z.object({
    number: z.string(),
    type: z.enum(['work', 'mobile', 'home', 'other']),
  })),
  company: z.string().optional(),
  title: z.string().optional(),
  photoUrl: z.string().optional(),
  contactId: z.string(),
  etag: z.string().optional(),
});

// ✅ NEW: Contact list data schema for multiple contacts
export const ContactListDataSchema = z.object({
  contacts: z.array(ContactDataSchema),
  totalCount: z.number(),
  hasMore: z.boolean().optional(),
  nextPageToken: z.string().optional(),
});

// ✅ NEW: Single contact wrapper schema
export const SingleContactDataSchema = z.object({
  contact: ContactDataSchema,
});

// ✅ GOOGLE TASKS API SCHEMAS: Proper distinction between task lists and tasks

// Individual task within a task list
export const TaskDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['needsAction', 'completed']).optional(),
  notes: z.string().nullish(), // Can be null or undefined
  due: z.string().nullish(), // ISO date string, can be null
  completed: z.string().nullish(), // ISO date string, can be null
  updated: z.string(),
  parent: z.string().nullish(), // Can be null if no parent task
  position: z.string().nullish(), // Can be null
  selfLink: z.string().optional(),
  etag: z.string().optional(),
  kind: z.string().optional(),
  links: z.array(z.object({
    type: z.string(),
    link: z.string(),
    description: z.string().optional(),
  })).optional(),
});

// Individual task list (container for tasks)
export const TaskListSchema = z.object({
  id: z.string(),
  title: z.string(),
  updated: z.string(),
  selfLink: z.string().optional(),
  etag: z.string().optional(),
  kind: z.string().optional(),
});

// Multiple tasks within a single task list
export const TaskListDataSchema = z.object({
  tasks: z.array(TaskDataSchema),
  totalCount: z.number(),
  completedCount: z.number(),
  hasMore: z.boolean().optional(),
  listTitle: z.string().optional(),
  listId: z.string().optional(),
});

// Multiple task lists (what LIST_TASK_LISTS returns)
export const TaskListsDataSchema = z.object({
  taskLists: z.array(TaskListSchema),
  totalCount: z.number(),
  hasMore: z.boolean().optional(),
});

// ✅ NEW: Combined task list with its tasks (for parallel fetching)
export const TaskListWithTasksSchema = z.object({
  // Task list metadata (extends TaskListSchema)
  id: z.string(),
  title: z.string(),
  updated: z.string(),
  selfLink: z.string().optional(),
  etag: z.string().optional(),
  kind: z.string().optional(),
  
  // Tasks within this list
  tasks: z.array(TaskDataSchema),
  taskCount: z.number(),
  completedCount: z.number(),
  pendingCount: z.number(),
  overdueCount: z.number(),
  
  // Fetching metadata
  lastFetched: z.string(),
  fetchSuccess: z.boolean(),
  fetchError: z.string().optional(),
});

// ✅ NEW: Complete task overview with all lists and tasks
export const CompleteTaskOverviewSchema = z.object({
  taskLists: z.array(TaskListWithTasksSchema),
  totalLists: z.number(),
  totalTasks: z.number(),
  totalCompleted: z.number(),
  totalPending: z.number(),
  totalOverdue: z.number(),
  lastSyncTime: z.string(),
  syncSuccess: z.boolean(),
  partialFailures: z.array(z.object({
    listId: z.string(),
    listTitle: z.string(),
    error: z.string(),
  })).optional(),
});

// ✅ LEGACY SCHEMA: Keep for backwards compatibility
export const LegacyTaskDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['completed', 'pending', 'in_progress']),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  list: z.string(),
  listId: z.string().optional(),
  taskId: z.string().optional(),
  completedDate: z.string().optional(),
});

// General data schemas
export const GeneralDataSchema = z.object({
  content: z.string(),
  summary: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  references: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
    type: z.string(),
  })).optional(),
});

// UI metadata schema
export const UIMetadataSchema = z.object({
  category: z.string(),
  confidence: z.number(),
  timestamp: z.string(),
  source: z.string().optional(),
});

// UI data schema
export const UIDataSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  content: z.string(),
  icon: z.string(),
  actions: z.array(UnifiedActionSchema),
  metadata: UIMetadataSchema,
});

// ✅ DISCRIMINATED UNION: Static type-safe response schema
export const UnifiedToolResponseSchema = z.discriminatedUnion('type', [
  // Email responses
  z.object({
    type: z.literal(ServiceType.EMAIL),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: EmailListDataSchema.or(EmailDataSchema).or(SingleEmailDataSchema).optional(),
      raw: z.any().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),
  
  // Calendar responses
  z.object({
    type: z.literal(ServiceType.CALENDAR),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: CalendarListDataSchema.or(CalendarDataSchema).optional(),
      raw: z.any().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),
  
  // Contact responses
  z.object({
    type: z.literal(ServiceType.CONTACT),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: ContactListDataSchema.or(ContactDataSchema).or(SingleContactDataSchema).optional(),
      raw: z.any().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),
  
  // Task responses
  z.object({
    type: z.literal(ServiceType.TASK),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: TaskListsDataSchema.or(TaskListDataSchema).or(TaskDataSchema).or(TaskListWithTasksSchema).or(CompleteTaskOverviewSchema).optional(),
      raw: z.any().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),
  
  // General responses
  z.object({
    type: z.literal(ServiceType.GENERAL),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: GeneralDataSchema.optional(),
      raw: z.any().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),
]);

// ✅ INFERRED TYPES: Get TypeScript types from Zod schemas
export type UnifiedToolResponse = z.infer<typeof UnifiedToolResponseSchema>;
export type EmailData = z.infer<typeof EmailDataSchema>;
export type EmailListData = z.infer<typeof EmailListDataSchema>;
export type SingleEmailData = z.infer<typeof SingleEmailDataSchema>;
export type CalendarData = z.infer<typeof CalendarDataSchema>;
export type CalendarListData = z.infer<typeof CalendarListDataSchema>;
export type ContactData = z.infer<typeof ContactDataSchema>;
export type TaskData = z.infer<typeof TaskDataSchema>;
export type TaskList = z.infer<typeof TaskListSchema>;
export type TaskListData = z.infer<typeof TaskListDataSchema>;
export type TaskListsData = z.infer<typeof TaskListsDataSchema>;
export type LegacyTaskData = z.infer<typeof LegacyTaskDataSchema>;
export type GeneralData = z.infer<typeof GeneralDataSchema>;
export type UnifiedAction = z.infer<typeof UnifiedActionSchema>;
export type TaskListWithTasks = z.infer<typeof TaskListWithTasksSchema>;
export type CompleteTaskOverview = z.infer<typeof CompleteTaskOverviewSchema>;
export type ContactListData = z.infer<typeof ContactListDataSchema>;
export type SingleContactData = z.infer<typeof SingleContactDataSchema>;

// ✅ STATIC VALIDATION FUNCTIONS: Replace runtime checking
export function isValidUnifiedToolResponse(data: any): data is UnifiedToolResponse {
  const result = UnifiedToolResponseSchema.safeParse(data);
  if (result.success) {
    console.log('[UnifiedValidation] ✅ Valid UnifiedToolResponse detected');
    return true;
  }
  console.log('[UnifiedValidation] ❌ Invalid UnifiedToolResponse:', result.error.message);
  return false;
}

export function validateUnifiedToolResponse(data: any): UnifiedToolResponse {
  console.log('[UnifiedValidation] 🔍 Validating UnifiedToolResponse with Zod...');
  
  try {
    const validated = UnifiedToolResponseSchema.parse(data);
    console.log('[UnifiedValidation] ✅ Validation successful');
    
    // Log email-specific validation details
    if (validated.type === 'email' && validated.data.structured) {
      if ('emails' in validated.data.structured) {
        console.log('[UnifiedValidation] 📧 EmailListData validated:', validated.data.structured.emails.length, 'emails');
      } else {
        console.log('[UnifiedValidation] 📧 EmailData validated');
      }
    }
    
    return validated;
  } catch (error) {
    console.error('[UnifiedValidation] ❌ Validation failed:', error);
    throw error;
  }
}

// ✅ EMAIL-SPECIFIC TYPE GUARDS: Static email data detection
export function isEmailListData(data: any): data is EmailListData {
  return EmailListDataSchema.safeParse(data).success;
}

export function isEmailData(data: any): data is EmailData {
  return EmailDataSchema.safeParse(data).success;
}

export function isSingleEmailData(data: any): data is SingleEmailData {
  return SingleEmailDataSchema.safeParse(data).success;
}

// ✅ TASK-SPECIFIC TYPE GUARDS: Static task data detection
export function isTaskListsData(data: any): data is TaskListsData {
  return data && data.kind === 'tasks#taskLists';
}

export function isTaskListData(data: any): data is TaskListData {
  return data && data.kind === 'tasks#tasks';
}

export function isTaskData(data: any): data is TaskData {
  return TaskDataSchema.safeParse(data).success;
}

export function isTaskList(data: any): data is TaskList {
  return TaskListSchema.safeParse(data).success;
}

export function isLegacyTaskData(data: any): data is LegacyTaskData {
  return LegacyTaskDataSchema.safeParse(data).success;
}

// ✅ NEW: Type guards for enhanced task schemas
export function isTaskListWithTasks(data: any): data is TaskListWithTasks {
  return data && typeof data === 'object' && 
         'tasks' in data && Array.isArray(data.tasks) &&
         'taskCount' in data && typeof data.taskCount === 'number';
}

export function isCompleteTaskOverview(data: any): data is CompleteTaskOverview {
  return data && typeof data === 'object' && 
         'taskLists' in data && Array.isArray(data.taskLists) &&
         'totalTasks' in data && typeof data.totalTasks === 'number';
}

// ✅ CONTACT-SPECIFIC TYPE GUARDS: Static contact data detection
export function isContactData(data: any): data is ContactData {
  return ContactDataSchema.safeParse(data).success;
}

export function isContactListData(data: any): data is ContactListData {
  return ContactListDataSchema.safeParse(data).success;
}

export function isSingleContactData(data: any): data is SingleContactData {
  return SingleContactDataSchema.safeParse(data).success;
}

// ✅ SAFE PARSE HELPER: Non-throwing validation
export function safeParseUnifiedToolResponse(data: any): { 
  success: true; 
  data: UnifiedToolResponse; 
} | { 
  success: false; 
  error: string; 
} {
  const result = UnifiedToolResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { 
      success: false, 
      error: result.error.message 
    };
  }
} 