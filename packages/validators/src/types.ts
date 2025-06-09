import { z } from "zod/v4";

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
  UIDataSchema,
  UIMetadataSchema,
} from "./schemas/general";
import {
  CompleteTaskOverviewSchema,
  LegacyTaskDataSchema,
  // Task schemas
  ServiceType,
  TaskDataSchema,
  TaskListDataSchema,
  TaskListSchema,
  TaskListsDataSchema,
  TaskListWithTasksSchema,
  UnifiedActionSchema,
} from "./schemas/task";
import {
  // Unified response schema
  UnifiedToolResponseSchema,
} from "./schemas/unified-response";
import {
  LevelProgressionSchema,
  XPProgressSchema,
  XPRealtimeUpdateSchema,
  // XP schemas
  XPUpdateSchema,
} from "./schemas/xp";

// ✅ TASK TYPES: Zod-inferred for type safety
export type TaskData = z.infer<typeof TaskDataSchema>;
export type TaskList = z.infer<typeof TaskListSchema>;
export type TaskListData = z.infer<typeof TaskListDataSchema>;
export type TaskListsData = z.infer<typeof TaskListsDataSchema>;
export type TaskListWithTasks = z.infer<typeof TaskListWithTasksSchema>;
export type CompleteTaskOverview = z.infer<typeof CompleteTaskOverviewSchema>;
export type LegacyTaskData = z.infer<typeof LegacyTaskDataSchema>;

// ✅ EMAIL TYPES: Zod-inferred for type safety
export type EmailData = z.infer<typeof EmailDataSchema>;
export type EmailListData = z.infer<typeof EmailListDataSchema>;
export type SingleEmailData = z.infer<typeof SingleEmailDataSchema>;

// ✅ CALENDAR TYPES: Zod-inferred for type safety
export type CalendarData = z.infer<typeof CalendarDataSchema>;
export type CalendarListData = z.infer<typeof CalendarListDataSchema>;

// ✅ CONTACT TYPES: Zod-inferred for type safety
export type ContactData = z.infer<typeof ContactDataSchema>;
export type ContactListData = z.infer<typeof ContactListDataSchema>;
export type SingleContactData = z.infer<typeof SingleContactDataSchema>;

// ✅ XP SYSTEM TYPES: Zod-inferred for type safety
export type XPUpdate = z.infer<typeof XPUpdateSchema>;
export type XPProgress = z.infer<typeof XPProgressSchema>;
export type LevelProgression = z.infer<typeof LevelProgressionSchema>;
export type XPRealtimeUpdate = z.infer<typeof XPRealtimeUpdateSchema>;

// ✅ ACHIEVEMENT SYSTEM TYPES: Zod-inferred for type safety
export type AchievementData = z.infer<typeof AchievementDataSchema>;
export type AchievementProgressResult = z.infer<
  typeof AchievementProgressResultSchema
>;
export type AchievementStats = z.infer<typeof AchievementStatsSchema>;

// ✅ GENERAL TYPES: Zod-inferred for type safety
export type GeneralData = z.infer<typeof GeneralDataSchema>;
export type UIMetadata = z.infer<typeof UIMetadataSchema>;
export type UIData = z.infer<typeof UIDataSchema>;

// ✅ UNIFIED RESPONSE TYPE
export type UnifiedToolResponse = z.infer<typeof UnifiedToolResponseSchema>;

// ✅ SHARED TYPES
export type UnifiedAction = z.infer<typeof UnifiedActionSchema>;
export { ServiceType };
