import type {
  AchievementData,
  AchievementProgressResult,
  AchievementStats,
  CalendarData,
  CalendarListData,
  CompleteTaskOverview,
  ContactData,
  ContactListData,
  EmailData,
  EmailListData,
  GeneralData,
  LegacyTaskData,
  LevelProgression,
  SingleContactData,
  SingleEmailData,
  TaskData,
  TaskList,
  TaskListData,
  TaskListsData,
  TaskListWithTasks,
  XPProgress,
  XPRealtimeUpdate,
  XPUpdate,
} from "./types";
import {
  // Achievement schemas
  AchievementDataSchema,
  AchievementProgressResultSchema,
  AchievementStatsSchema,
} from "./schemas/achievement";
import {
  // Calendar schemas
  CalendarDataSchema,
  CalendarListDataSchema,
} from "./schemas/calendar";
import {
  // Contact schemas
  ContactDataSchema,
  ContactListDataSchema,
  SingleContactDataSchema,
} from "./schemas/contact";
import {
  // Email schemas
  EmailDataSchema,
  EmailListDataSchema,
  SingleEmailDataSchema,
} from "./schemas/email";
import {
  // General schemas
  GeneralDataSchema,
} from "./schemas/general";
import {
  LegacyTaskDataSchema,
  // Task schemas
  TaskDataSchema,
  TaskListSchema,
} from "./schemas/task";
import {
  LevelProgressionSchema,
  XPProgressSchema,
  XPRealtimeUpdateSchema,
  // XP schemas
  XPUpdateSchema,
} from "./schemas/xp";

// ✅ TASK-SPECIFIC TYPE GUARDS: Static task data detection
export function isTaskListsData(data: unknown): data is TaskListsData {
  return (
    typeof data === "object" &&
    data !== null &&
    "kind" in data &&
    (data as Record<string, unknown>).kind === "tasks#taskLists"
  );
}

export function isTaskListData(data: unknown): data is TaskListData {
  return (
    typeof data === "object" &&
    data !== null &&
    "kind" in data &&
    (data as Record<string, unknown>).kind === "tasks#tasks"
  );
}

export function isTaskData(data: unknown): data is TaskData {
  return TaskDataSchema.safeParse(data).success;
}

export function isTaskList(data: unknown): data is TaskList {
  return TaskListSchema.safeParse(data).success;
}

export function isLegacyTaskData(data: unknown): data is LegacyTaskData {
  return LegacyTaskDataSchema.safeParse(data).success;
}

export function isTaskListWithTasks(data: unknown): data is TaskListWithTasks {
  return (
    typeof data === "object" &&
    data !== null &&
    "tasks" in data &&
    Array.isArray((data as Record<string, unknown>).tasks) &&
    "taskCount" in data &&
    typeof (data as Record<string, unknown>).taskCount === "number"
  );
}

export function isCompleteTaskOverview(
  data: unknown,
): data is CompleteTaskOverview {
  return (
    typeof data === "object" &&
    data !== null &&
    "taskLists" in data &&
    Array.isArray((data as Record<string, unknown>).taskLists) &&
    "totalTasks" in data &&
    typeof (data as Record<string, unknown>).totalTasks === "number"
  );
}

// ✅ EMAIL-SPECIFIC TYPE GUARDS: Static email data detection
export function isEmailListData(data: unknown): data is EmailListData {
  return EmailListDataSchema.safeParse(data).success;
}

export function isEmailData(data: unknown): data is EmailData {
  return EmailDataSchema.safeParse(data).success;
}

export function isSingleEmailData(data: unknown): data is SingleEmailData {
  return SingleEmailDataSchema.safeParse(data).success;
}

// ✅ CALENDAR-SPECIFIC TYPE GUARDS: Static calendar data detection
export function isCalendarData(data: unknown): data is CalendarData {
  return CalendarDataSchema.safeParse(data).success;
}

export function isCalendarListData(data: unknown): data is CalendarListData {
  return CalendarListDataSchema.safeParse(data).success;
}

// ✅ CONTACT-SPECIFIC TYPE GUARDS: Static contact data detection
export function isContactData(data: unknown): data is ContactData {
  return ContactDataSchema.safeParse(data).success;
}

export function isContactListData(data: unknown): data is ContactListData {
  return ContactListDataSchema.safeParse(data).success;
}

export function isSingleContactData(data: unknown): data is SingleContactData {
  return SingleContactDataSchema.safeParse(data).success;
}

// ✅ GENERAL TYPE GUARDS: Static general data detection
export function isGeneralData(data: unknown): data is GeneralData {
  return GeneralDataSchema.safeParse(data).success;
}

// ✅ XP SYSTEM TYPE GUARDS: Static XP data detection
export function isValidXPUpdate(data: unknown): data is XPUpdate {
  const result = XPUpdateSchema.safeParse(data);
  if (result.success) {
    console.log("[XPValidation] ✅ Valid XPUpdate detected");
    return true;
  }
  console.log("[XPValidation] ❌ Invalid XPUpdate:", result.error.message);
  return false;
}

export function isValidXPProgress(data: unknown): data is XPProgress {
  return XPProgressSchema.safeParse(data).success;
}

export function isValidLevelProgression(
  data: unknown,
): data is LevelProgression {
  return LevelProgressionSchema.safeParse(data).success;
}

export function isValidXPRealtimeUpdate(
  data: unknown,
): data is XPRealtimeUpdate {
  return XPRealtimeUpdateSchema.safeParse(data).success;
}

// ✅ ACHIEVEMENT SYSTEM TYPE GUARDS: Static achievement data detection
export function isValidAchievementData(data: unknown): data is AchievementData {
  const result = AchievementDataSchema.safeParse(data);
  if (result.success) {
    console.log("[AchievementValidation] ✅ Valid AchievementData detected");
    return true;
  }
  console.log(
    "[AchievementValidation] ❌ Invalid AchievementData:",
    result.error.message,
  );
  return false;
}

export function isValidAchievementProgressResult(
  data: unknown,
): data is AchievementProgressResult {
  return AchievementProgressResultSchema.safeParse(data).success;
}

export function isValidAchievementStats(
  data: unknown,
): data is AchievementStats {
  return AchievementStatsSchema.safeParse(data).success;
}

// ✅ VALIDATION FUNCTIONS: Safe parsing with error handling
export function validateXPUpdate(data: unknown): XPUpdate {
  console.log("[XPValidation] 🔍 Validating XPUpdate with Zod...");

  try {
    const validated = XPUpdateSchema.parse(data);
    console.log("[XPValidation] ✅ XPUpdate validation successful");

    return validated;
  } catch (error) {
    console.error("[XPValidation] ❌ XPUpdate validation failed:", error);
    throw error;
  }
}

export function validateAchievementData(data: unknown): AchievementData {
  console.log(
    "[AchievementValidation] 🔍 Validating AchievementData with Zod...",
  );

  try {
    const validated = AchievementDataSchema.parse(data);
    console.log(
      "[AchievementValidation] ✅ AchievementData validation successful",
    );

    return validated;
  } catch (error) {
    console.error(
      "[AchievementValidation] ❌ AchievementData validation failed:",
      error,
    );
    throw error;
  }
}

export function validateAchievementProgressResult(
  data: unknown,
): AchievementProgressResult {
  console.log(
    "[AchievementValidation] 🔍 Validating AchievementProgressResult with Zod...",
  );

  try {
    const validated = AchievementProgressResultSchema.parse(data);
    console.log(
      "[AchievementValidation] ✅ AchievementProgressResult validation successful",
    );

    return validated;
  } catch (error) {
    console.error(
      "[AchievementValidation] ❌ AchievementProgressResult validation failed:",
      error,
    );
    throw error;
  }
}

export function validateAchievementStats(data: unknown): AchievementStats {
  console.log(
    "[AchievementValidation] 🔍 Validating AchievementStats with Zod...",
  );

  try {
    const validated = AchievementStatsSchema.parse(data);
    console.log(
      "[AchievementValidation] ✅ AchievementStats validation successful",
    );

    return validated;
  } catch (error) {
    console.error(
      "[AchievementValidation] ❌ AchievementStats validation failed:",
      error,
    );
    throw error;
  }
}
