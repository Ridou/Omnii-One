import { z } from 'zod/v4';

// ✅ SERVICE TYPE ENUM
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

// ✅ Combined task list with its tasks (for parallel fetching)
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

// ✅ Complete task overview with all lists and tasks
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

// ✅ tRPC Response Schemas
export const TasksCompleteOverviewResponseSchema = z.object({
  success: z.boolean(),
  data: CompleteTaskOverviewSchema.optional(),
  error: z.string().optional(),
  message: z.string(),
});

export const TasksTestResponseSchema = z.object({
  success: z.boolean(),
  data: z.string(),
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