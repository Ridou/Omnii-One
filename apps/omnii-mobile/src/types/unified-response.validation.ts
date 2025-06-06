// Mobile app copy of Zod validation schemas for UnifiedToolResponse
import { z } from 'zod';

// ✅ SERVICE TYPE ENUM: Build discriminated union off of enum
export enum ServiceType {
  EMAIL = 'email',
  CALENDAR = 'calendar', 
  CONTACT = 'contact',
  TASK = 'task',
  GENERAL = 'general'
}

// ✅ XP SYSTEM SCHEMAS: Centralized XP data validation
export const XPUpdateSchema = z.object({
  xp_awarded: z.number().int().nonnegative(),
  new_level: z.number().int().positive(),
  level_up: z.boolean(),
  milestone_unlocks: z.array(z.string()).optional(),
  // Optional fields for extended validation
  reason: z.string().optional(),
  category: z.string().optional(),
  timestamp: z.string().optional(),
});

export const XPProgressSchema = z.object({
  current_level: z.number().int().positive(),
  total_xp: z.number().int().nonnegative(),
  xp_to_next_level: z.number().int().nonnegative(),
  xp_in_current_level: z.number().int().nonnegative(),
  xp_needed_for_level: z.number().int().positive(),
  progress_percentage: z.number().min(0).max(100),
  completed: z.boolean(),
  next_level_xp: z.number().int().positive().optional(),
});

export const LevelProgressionSchema = z.object({
  id: z.string(),
  user_id: z.string().uuid(),
  from_level: z.number().int().positive(),
  to_level: z.number().int().positive(),
  xp_at_level_up: z.number().int().nonnegative(),
  milestone_unlocks: z.array(z.string()).optional(),
  celebration_shown: z.boolean(),
  unlock_animations_played: z.array(z.string()),
  achieved_at: z.string(),
});

export const XPRealtimeUpdateSchema = z.object({
  type: z.enum(['xp_awarded', 'level_up', 'milestone_unlocked']),
  payload: z.union([XPUpdateSchema, LevelProgressionSchema]),
  timestamp: z.string(),
});

// ✅ ACHIEVEMENT SYSTEM SCHEMAS: Centralized achievement data validation
export const AchievementDataSchema = z.object({
  achievement_id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  difficulty: z.string(),
  xp_reward: z.number(),
  icon: z.string(),
  max_progress: z.number(),
  current_progress: z.number(),
  completed: z.boolean(),
  completed_at: z.string().nullable(),
  can_unlock: z.boolean(),
  progress_percentage: z.number()
});

export const AchievementProgressResultSchema = z.object({
  progress_updated: z.boolean(),
  new_progress: z.number(),
  achievement_unlocked: z.boolean(),
  xp_awarded: z.number(),
  level_up: z.boolean(),
  new_level: z.number()
});

export const AchievementStatsSchema = z.object({
  total_achievements: z.number(),
  completed_achievements: z.number(),
  completion_percentage: z.number(),
  total_xp_from_achievements: z.number(),
  current_streak: z.number(),
  longest_streak: z.number(),
  recent_unlocks: z.array(z.object({
    achievement_id: z.string(),
    title: z.string(),
    xp_awarded: z.number(),
    unlocked_at: z.string()
  }))
});

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
});

export const EmailListDataSchema = z.object({
  emails: z.array(EmailDataSchema),
  totalCount: z.number(),
  unreadCount: z.number(),
  query: z.string().optional(),
  hasMore: z.boolean().optional(),
});

// ✅ GOOGLE TASKS API SCHEMAS: Proper distinction between task lists and tasks

// Individual task within a task list
export const TaskDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['needsAction', 'completed']).optional(),
  notes: z.string().nullish(),
  due: z.string().nullish(),
  completed: z.string().nullish(),
  updated: z.string(),
  parent: z.string().nullish(),
  position: z.string().nullish(),
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

// ✅ Enhanced task schemas for parallel fetching
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

// Complete task overview with all lists and tasks
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
  })),
  phones: z.array(z.object({
    number: z.string(),
    type: z.enum(['work', 'mobile', 'home', 'other']),
  })),
  company: z.string().optional(),
  title: z.string().optional(),
  photoUrl: z.string().optional(),
  contactId: z.string().optional(),
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

// ✅ DISCRIMINATED UNION: Build off enum values
export const UnifiedToolResponseSchema = z.discriminatedUnion('type', [
  // Email responses
  z.object({
    type: z.literal(ServiceType.EMAIL),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: EmailListDataSchema.or(EmailDataSchema).optional(),
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
export type UnifiedAction = z.infer<typeof UnifiedActionSchema>;

// ✅ XP SYSTEM TYPES: Zod-inferred for type safety
export type XPUpdate = z.infer<typeof XPUpdateSchema>;
export type XPProgress = z.infer<typeof XPProgressSchema>;
export type LevelProgression = z.infer<typeof LevelProgressionSchema>;
export type XPRealtimeUpdate = z.infer<typeof XPRealtimeUpdateSchema>;

// ✅ ACHIEVEMENT SYSTEM TYPES: Zod-inferred for type safety
export type AchievementData = z.infer<typeof AchievementDataSchema>;
export type AchievementProgressResult = z.infer<typeof AchievementProgressResultSchema>;
export type AchievementStats = z.infer<typeof AchievementStatsSchema>;

// ✅ TASK TYPES: Zod-inferred for type safety with external data
export type TaskData = z.infer<typeof TaskDataSchema>;
export type TaskList = z.infer<typeof TaskListSchema>;
export type TaskListData = z.infer<typeof TaskListDataSchema>;
export type TaskListsData = z.infer<typeof TaskListsDataSchema>;
export type TaskListWithTasks = z.infer<typeof TaskListWithTasksSchema>;
export type CompleteTaskOverview = z.infer<typeof CompleteTaskOverviewSchema>;

// ✅ CALENDAR TYPES: Zod-inferred for type safety
export type CalendarData = z.infer<typeof CalendarDataSchema>;
export type CalendarListData = z.infer<typeof CalendarListDataSchema>;

// ✅ CONTACT TYPES: Zod-inferred for type safety  
export type ContactData = z.infer<typeof ContactDataSchema>;
export type ContactListData = z.infer<typeof ContactListDataSchema>;
export type SingleContactData = z.infer<typeof SingleContactDataSchema>;

// ✅ GENERAL TYPES: Zod-inferred for type safety
export type GeneralData = z.infer<typeof GeneralDataSchema>;

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
    if (validated.type === ServiceType.EMAIL && validated.data.structured) {
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

// ✅ CALENDAR-SPECIFIC TYPE GUARDS: Static calendar data detection
export function isCalendarData(data: any): data is CalendarData {
  return CalendarDataSchema.safeParse(data).success;
}

export function isCalendarListData(data: any): data is CalendarListData {
  return CalendarListDataSchema.safeParse(data).success;
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

// ✅ GENERAL-SPECIFIC TYPE GUARDS: Static general data detection
export function isGeneralData(data: any): data is GeneralData {
  return GeneralDataSchema.safeParse(data).success;
}

// ✅ XP-SPECIFIC TYPE GUARDS: Static XP data detection
export function isValidXPUpdate(data: any): data is XPUpdate {
  const result = XPUpdateSchema.safeParse(data);
  if (result.success) {
    console.log('[XPValidation] ✅ Valid XPUpdate detected');
    return true;
  }
  console.log('[XPValidation] ❌ Invalid XPUpdate:', result.error.message);
  return false;
}

export function isValidXPProgress(data: any): data is XPProgress {
  return XPProgressSchema.safeParse(data).success;
}

export function isValidLevelProgression(data: any): data is LevelProgression {
  return LevelProgressionSchema.safeParse(data).success;
}

export function isValidXPRealtimeUpdate(data: any): data is XPRealtimeUpdate {
  return XPRealtimeUpdateSchema.safeParse(data).success;
}

export function validateXPUpdate(data: any): XPUpdate {
  console.log('[XPValidation] 🔍 Validating XPUpdate with Zod...');
  
  try {
    const validated = XPUpdateSchema.parse(data);
    console.log('[XPValidation] ✅ XP validation successful:', {
      newLevel: validated.new_level,
      xpAwarded: validated.xp_awarded,
      levelUp: validated.level_up,
      milestoneUnlocks: validated.milestone_unlocks
    });
    
    return validated;
  } catch (error) {
    console.error('[XPValidation] ❌ XP validation failed:', error);
    throw error;
  }
}

// ✅ ACHIEVEMENT-SPECIFIC TYPE GUARDS: Static achievement data detection
export function isValidAchievementData(data: any): data is AchievementData {
  const result = AchievementDataSchema.safeParse(data);
  if (result.success) {
    console.log('[AchievementValidation] ✅ Valid AchievementData detected');
    return true;
  }
  console.log('[AchievementValidation] ❌ Invalid AchievementData:', result.error.message);
  return false;
}

export function isValidAchievementProgressResult(data: any): data is AchievementProgressResult {
  return AchievementProgressResultSchema.safeParse(data).success;
}

export function isValidAchievementStats(data: any): data is AchievementStats {
  return AchievementStatsSchema.safeParse(data).success;
}

export function validateAchievementData(data: any): AchievementData {
  console.log('[AchievementValidation] 🔍 Validating AchievementData with Zod...');
  
  try {
    const validated = AchievementDataSchema.parse(data);
    console.log('[AchievementValidation] ✅ Achievement validation successful:', {
      id: validated.achievement_id,
      title: validated.title,
      completed: validated.completed,
      progress: `${validated.current_progress}/${validated.max_progress}`
    });
    
    return validated;
  } catch (error) {
    console.error('[AchievementValidation] ❌ Achievement validation failed:', error);
    throw error;
  }
}

export function validateAchievementProgressResult(data: any): AchievementProgressResult {
  console.log('[AchievementValidation] 🔍 Validating AchievementProgressResult with Zod...');
  
  try {
    const validated = AchievementProgressResultSchema.parse(data);
    console.log('[AchievementValidation] ✅ Achievement progress validation successful:', {
      progressUpdated: validated.progress_updated,
      newProgress: validated.new_progress,
      achievementUnlocked: validated.achievement_unlocked,
      xpAwarded: validated.xp_awarded
    });
    
    return validated;
  } catch (error) {
    console.error('[AchievementValidation] ❌ Achievement progress validation failed:', error);
    throw error;
  }
} 