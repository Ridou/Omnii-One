// Main exports for all unified schemas
export * from './schemas/task';
export * from './schemas/email';
export * from './schemas/calendar';
export * from './schemas/contact';
export * from './schemas/rdf';
export * from './schemas/xp';
export * from './schemas/achievement';
export * from './schemas/general';
export * from './schemas/unified-response';
export * from './guards';

// Export brain-memory schemas and functions (but not conflicting types)
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
  validateChatMessageWithUserId,
  validateMemoryWithUserId,
  validateConceptWithUserId,
  validateTagWithUserId,
  isValidBrainMemoryContext,
  validateBrainMemoryContext,
  safeParseEnhancedChatMessage,
} from './schemas/brain-memory';

// Export all types (including brain-memory types)
export * from './types';

// Re-export commonly used utilities
export { UnifiedResponseBuilder } from './schemas/unified-response';
