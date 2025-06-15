// ✅ UNIFIED APPROACH: Import from validators source (Single Source of Truth)
// 
// This file imports runtime values from validators and re-exports types as inferred types
// to avoid runtime import issues with TypeScript types.

import { z } from 'zod/v4';

// Import schemas and functions from validators source (runtime values only)
export {
  EnhancedChatMessageSchema,
  EnhancedMemorySchema,
  EnhancedConceptSchema,
  EnhancedTagSchema,
  BrainMemoryContextSchema,
  EnhancedRelationshipSchema,
  TimeWindowSchema,
  MemoryStrengthCalculationSchema,
  ComposioMemoryEnhancementSchema,
  BRAIN_MEMORY_CONSTANTS,
  isValidBrainMemoryContext,
  validateBrainMemoryContext,
  safeParseEnhancedChatMessage,
} from '@omnii/validators';

// Import the schemas to infer types from them (avoiding runtime type imports)
import {
  EnhancedChatMessageSchema,
  EnhancedMemorySchema,
  EnhancedConceptSchema,
  EnhancedTagSchema,
  BrainMemoryContextSchema,
  EnhancedRelationshipSchema,
  TimeWindowSchema,
  MemoryStrengthCalculationSchema,
  ComposioMemoryEnhancementSchema,
} from '@omnii/validators';

// Define types locally by inferring from schemas (this avoids runtime import issues)
export type EnhancedChatMessage = z.infer<typeof EnhancedChatMessageSchema>;
export type EnhancedMemory = z.infer<typeof EnhancedMemorySchema>;
export type EnhancedConcept = z.infer<typeof EnhancedConceptSchema>;
export type EnhancedTag = z.infer<typeof EnhancedTagSchema>;
export type BrainMemoryContext = z.infer<typeof BrainMemoryContextSchema>;
export type EnhancedRelationship = z.infer<typeof EnhancedRelationshipSchema>;
export type TimeWindow = z.infer<typeof TimeWindowSchema>;
export type MemoryStrengthCalculation = z.infer<typeof MemoryStrengthCalculationSchema>;
export type ComposioMemoryEnhancement = z.infer<typeof ComposioMemoryEnhancementSchema>;

// ✅ Note: BrainMemoryContextSchema is already exported in the main export block above 