/**
 * Analytics Services Module
 *
 * Pattern detection and actionable insights generation.
 */

// Types
export type {
  PatternDefinition,
  PatternMatch,
  AggregationResult,
} from './types';

// Pattern Definitions
export {
  PATTERN_DEFINITIONS,
  getPatternDefinition,
  getPatternsByCategory,
  dayOfWeekName,
  formatHour,
} from './pattern-definitions';

// Pattern Engine
export {
  detectPatterns,
  detectSinglePattern,
} from './pattern-engine';

// Insight Storage
export {
  storeInsight,
  storeInsights,
  getInsightsByCategory,
  getRecentInsights,
  getInsightById,
  dismissInsight,
  markInsightViewed,
  cleanupOldInsights,
  getInsightStats,
} from './insight-storage';
