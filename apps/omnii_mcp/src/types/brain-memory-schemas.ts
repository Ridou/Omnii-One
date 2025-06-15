// ✅ UNIFIED APPROACH: Import from @omnii/validators (Single Source of Truth)
// 
// This file now serves as a re-export of the unified brain memory schemas
// instead of defining its own local schemas. This ensures consistency
// across all services and eliminates schema conflicts.

export {
  // Schemas
  EnhancedChatMessageSchema,
  EnhancedMemorySchema,
  EnhancedConceptSchema,
  EnhancedTagSchema,
  BrainMemoryContextSchema,
  EnhancedRelationshipSchema,
  TimeWindowSchema,
  MemoryStrengthCalculationSchema,
  ComposioMemoryEnhancementSchema,
  
  // Constants
  BRAIN_MEMORY_CONSTANTS,
  
  // Validation functions
  isValidBrainMemoryContext,
  validateBrainMemoryContext,
  safeParseEnhancedChatMessage,
    
  // Types
  type EnhancedChatMessage,
  type EnhancedMemory,
  type EnhancedConcept,
  type EnhancedTag,
  type BrainMemoryContext,
  type EnhancedRelationship,
  type TimeWindow,
  type MemoryStrengthCalculation,
  type ComposioMemoryEnhancement
} from '@omnii/validators';

// ✅ Note: BrainMemoryContextSchema is already exported in the main export block above 