import type { z } from "zod/v4";

import type {
  // Achievement schemas
  AchievementDataSchema,
  AchievementProgressResultSchema,
  AchievementStatsSchema,
} from "./schemas/achievement";
import type {
  // Calendar schemas
  CalendarDataSchema,
  CalendarListDataSchema,
} from "./schemas/calendar";
import type {
  // Contact schemas
  ContactDataSchema,
  ContactListDataSchema,
  SingleContactDataSchema,
} from "./schemas/contact";
import type {
  // Email schemas
  EmailDataSchema,
  EmailListDataSchema,
  SingleEmailDataSchema,
} from "./schemas/email";
import {
  // RDF schemas
  RDFDataSchema,
  RDFBridgeDataSchema,
  RDFQueryDataSchema,
  RDFAnalysisDataSchema,
  RDFHealthDataSchema,
  RDFQueryListDataSchema,
  RDFAnalysisListDataSchema,
  RDFInputSchema,
  RDFProcessingSchema,
  BrainMemoryIntegrationSchema,
  ConceptInsightSchema,
  SemanticConnectionSchema,
  TemporalPatternSchema,
  StructuredActionSchema,
  HumanInputSchema,
  AIReasoningSchema,
  // RDF action type constants
  RDF_ACTION_TYPES,
  RDF_ACTION_TYPE_VALUES,
  type RDFActionType,
} from "./schemas/rdf";
import {
  // Brain Memory schemas
  EnhancedChatMessageSchema,
  EnhancedMemorySchema,
  EnhancedConceptSchema,
  EnhancedTagSchema,
  BrainMemoryContextSchema,
  EnhancedRelationshipSchema,
  TimeWindowSchema,
  MemoryStrengthCalculationSchema,
  ComposioMemoryEnhancementSchema,
} from "./schemas/brain-memory";
import {
  // General schemas
  GeneralDataSchema,
  UIDataSchema,
  UIMetadataSchema,
} from "./schemas/general";
import type {
  CompleteTaskOverviewSchema,
  LegacyTaskDataSchema,
  TaskDataSchema,
  TaskListDataSchema,
  TaskListSchema,
  TaskListsDataSchema,
  TaskListWithTasksSchema,
  TasksCompleteOverviewResponseSchema,
  TasksTestResponseSchema,
  UnifiedActionSchema,
} from "./schemas/task";
import type {
  // Unified response schema
  UnifiedToolResponseSchema,
} from "./schemas/unified-response";
import type {
  LevelProgressionSchema,
  XPProgressSchema,
  XPRealtimeUpdateSchema,
  // XP schemas
  XPUpdateSchema,
} from "./schemas/xp";
import {
  // Task schemas
  ServiceType,
} from "./schemas/task";

// ✅ TASK TYPES: Zod-inferred for type safety
export type TaskData = z.infer<typeof TaskDataSchema>;
export type TaskList = z.infer<typeof TaskListSchema>;
export type TaskListData = z.infer<typeof TaskListDataSchema>;
export type TaskListsData = z.infer<typeof TaskListsDataSchema>;
export type TaskListWithTasks = z.infer<typeof TaskListWithTasksSchema>;
export type CompleteTaskOverview = z.infer<typeof CompleteTaskOverviewSchema>;
export type LegacyTaskData = z.infer<typeof LegacyTaskDataSchema>;

// ✅ tRPC TASK RESPONSE TYPES: Zod-inferred for type safety
export type TasksCompleteOverviewResponse = z.infer<
  typeof TasksCompleteOverviewResponseSchema
>;
export type TasksTestResponse = z.infer<typeof TasksTestResponseSchema>;

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

// ✅ RDF TYPES: Zod-inferred for type safety
export type RDFData = z.infer<typeof RDFDataSchema>;
export type RDFBridgeData = z.infer<typeof RDFBridgeDataSchema>;
export type RDFQueryData = z.infer<typeof RDFQueryDataSchema>;
export type RDFAnalysisData = z.infer<typeof RDFAnalysisDataSchema>;
export type RDFHealthData = z.infer<typeof RDFHealthDataSchema>;
export type RDFQueryListData = z.infer<typeof RDFQueryListDataSchema>;
export type RDFAnalysisListData = z.infer<typeof RDFAnalysisListDataSchema>;
export type RDFInput = z.infer<typeof RDFInputSchema>;
export type RDFProcessing = z.infer<typeof RDFProcessingSchema>;
export type BrainMemoryIntegration = z.infer<typeof BrainMemoryIntegrationSchema>;
export type ConceptInsight = z.infer<typeof ConceptInsightSchema>;
export type SemanticConnection = z.infer<typeof SemanticConnectionSchema>;
export type TemporalPattern = z.infer<typeof TemporalPatternSchema>;
export type StructuredAction = z.infer<typeof StructuredActionSchema>;
export type HumanInput = z.infer<typeof HumanInputSchema>;
export type AIReasoning = z.infer<typeof AIReasoningSchema>;

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

// ✅ BRAIN MEMORY TYPES: Zod-inferred for type safety
export type EnhancedChatMessage = z.infer<typeof EnhancedChatMessageSchema>;
export type EnhancedMemory = z.infer<typeof EnhancedMemorySchema>;
export type EnhancedConcept = z.infer<typeof EnhancedConceptSchema>;
export type EnhancedTag = z.infer<typeof EnhancedTagSchema>;
export type BrainMemoryContext = z.infer<typeof BrainMemoryContextSchema>;
export type EnhancedRelationship = z.infer<typeof EnhancedRelationshipSchema>;
export type TimeWindow = z.infer<typeof TimeWindowSchema>;
export type MemoryStrengthCalculation = z.infer<typeof MemoryStrengthCalculationSchema>;
export type ComposioMemoryEnhancement = z.infer<typeof ComposioMemoryEnhancementSchema>;

// ✅ UNIFIED RESPONSE TYPE
export type UnifiedToolResponse = z.infer<typeof UnifiedToolResponseSchema>;

// ✅ SHARED TYPES
export type UnifiedAction = z.infer<typeof UnifiedActionSchema>;
export { ServiceType };

// ✅ RDF ACTION TYPE CONSTANTS - Available throughout the codebase
export { RDF_ACTION_TYPES, RDF_ACTION_TYPE_VALUES };
export type { RDFActionType };

// ✅ UNIFIED RESPONSE BUILDER
export { UnifiedResponseBuilder } from "./schemas/unified-response";
