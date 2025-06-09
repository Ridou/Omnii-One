import {
  // Task schemas
  TaskDataSchema,
  TaskListSchema,
  TaskListDataSchema,
  TaskListsDataSchema,
  TaskListWithTasksSchema,
  CompleteTaskOverviewSchema,
  LegacyTaskDataSchema,
} from './schemas/task';
import {
  // Email schemas
  EmailDataSchema,
  EmailListDataSchema,
  SingleEmailDataSchema,
} from './schemas/email';
import {
  // Calendar schemas
  CalendarDataSchema,
  CalendarListDataSchema,
} from './schemas/calendar';
import {
  // Contact schemas
  ContactDataSchema,
  ContactListDataSchema,
  SingleContactDataSchema,
} from './schemas/contact';
import {
  // XP schemas
  XPUpdateSchema,
  XPProgressSchema,
  LevelProgressionSchema,
  XPRealtimeUpdateSchema,
} from './schemas/xp';
import {
  // Achievement schemas
  AchievementDataSchema,
  AchievementProgressResultSchema,
  AchievementStatsSchema,
} from './schemas/achievement';
import {
  // General schemas
  GeneralDataSchema,
} from './schemas/general';
import type {
  TaskData,
  TaskList,
  TaskListData,
  TaskListsData,
  TaskListWithTasks,
  CompleteTaskOverview,
  LegacyTaskData,
  EmailData,
  EmailListData,
  SingleEmailData,
  CalendarData,
  CalendarListData,
  ContactData,
  ContactListData,
  SingleContactData,
  XPUpdate,
  XPProgress,
  LevelProgression,
  XPRealtimeUpdate,
  AchievementData,
  AchievementProgressResult,
  AchievementStats,
  GeneralData,
} from './types';

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

// ✅ GENERAL TYPE GUARDS: Static general data detection
export function isGeneralData(data: any): data is GeneralData {
  return GeneralDataSchema.safeParse(data).success;
}

// ✅ XP SYSTEM TYPE GUARDS: Static XP data detection
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

// ✅ ACHIEVEMENT SYSTEM TYPE GUARDS: Static achievement data detection
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

// ✅ VALIDATION FUNCTIONS: Safe parsing with error handling
export function validateXPUpdate(data: any): XPUpdate {
  console.log('[XPValidation] 🔍 Validating XPUpdate with Zod...');
  
  try {
    const validated = XPUpdateSchema.parse(data);
    console.log('[XPValidation] ✅ XPUpdate validation successful');
    
    return validated;
  } catch (error) {
    console.error('[XPValidation] ❌ XPUpdate validation failed:', error);
    throw error;
  }
}

export function validateAchievementData(data: any): AchievementData {
  console.log('[AchievementValidation] 🔍 Validating AchievementData with Zod...');
  
  try {
    const validated = AchievementDataSchema.parse(data);
    console.log('[AchievementValidation] ✅ AchievementData validation successful');
    
    return validated;
  } catch (error) {
    console.error('[AchievementValidation] ❌ AchievementData validation failed:', error);
    throw error;
  }
}

export function validateAchievementProgressResult(data: any): AchievementProgressResult {
  console.log('[AchievementValidation] 🔍 Validating AchievementProgressResult with Zod...');
  
  try {
    const validated = AchievementProgressResultSchema.parse(data);
    console.log('[AchievementValidation] ✅ AchievementProgressResult validation successful');
    
    return validated;
  } catch (error) {
    console.error('[AchievementValidation] ❌ AchievementProgressResult validation failed:', error);
    throw error;
  }
}

export function validateAchievementStats(data: any): AchievementStats {
  console.log('[AchievementValidation] 🔍 Validating AchievementStats with Zod...');
  
  try {
    const validated = AchievementStatsSchema.parse(data);
    console.log('[AchievementValidation] ✅ AchievementStats validation successful');
    
    return validated;
  } catch (error) {
    console.error('[AchievementValidation] ❌ AchievementStats validation failed:', error);
    throw error;
  }
} 