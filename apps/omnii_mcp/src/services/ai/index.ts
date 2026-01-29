/**
 * AI Services Module
 *
 * Enhanced AI intelligence features including entity extraction,
 * relationship inference, meeting briefings, and analytics.
 */

// Types
export type {
  ExtractionSource,
  EntityType,
  QualityClassification,
  ConfidenceFactors,
  EnhancedEntity,
  ExtractionResult,
  ExtractionConfig,
  RelationshipSuggestion,
  MeetingBriefing,
  AttendeeContext,
  DocumentSummary,
  EventSummary,
  EmailSummary,
  ActionItem,
  AnalyticsInsight,
  PatternType,
  AnalyticsSummary,
} from './types';

// Entity Confidence
export {
  getSourceWeight,
  calculateTemporalBoost,
  calculateRelationshipBoost,
  calculateAmbiguityPenalty,
  getTypeThreshold,
  calibrateConfidence,
  buildConfidenceFactors,
  classifyQuality,
  shouldAutoAccept,
  needsReview,
  shouldReject,
} from './entity-confidence';

// Entity Extractor
export {
  extractEntities,
  extractEntitiesBatch,
  reextractWithConfig,
} from './entity-extractor';

// Entity Quality Gate
export type {
  QualityGateConfig,
  ReviewQueueItem,
  GateDecision,
} from './entity-quality-gate';

export {
  applyQualityGate,
  applyQualityGateBatch,
  addToReviewQueue,
  getPendingReviews,
  approveReviewItem,
  rejectReviewItem,
  getQualityStats,
} from './entity-quality-gate';

// Inference Patterns
export type { InferencePatternType, InferencePattern } from './inference-patterns';
export {
  INFERENCE_PATTERNS,
  getPattern,
  getPatternsForSources,
  getPatternsForEntityTypes,
  calculatePatternConfidence,
} from './inference-patterns';

// Cross-Source Matcher
export {
  matchAcrossSources,
  inferRelationship,
  discoverCrossSourceRelationships,
  validateInference,
} from './cross-source-matcher';

// Relationship Suggestions
export {
  formatForApproval,
  rankSuggestions,
  filterByConfidence,
  storeSuggestion,
  getPendingSuggestions,
  approveSuggestion,
  rejectSuggestion,
  getSuggestionStats,
} from './relationship-suggestions';

// Attendee Context
export {
  buildAttendeeContext,
  buildAttendeesContext,
  getTopCollaborators,
} from './attendee-context';

// Document Relevance
export {
  findRelevantDocuments,
  getDocumentKeyPoints,
} from './document-relevance';

// Meeting Briefing
export { generateBriefing } from './meeting-briefing';

// Heads-Up Scheduler
export type { HeadsUpJobData, HeadsUpPreferences } from './heads-up-scheduler';
export {
  createHeadsUpQueue,
  shouldScheduleHeadsUp,
  scheduleHeadsUp,
  rescheduleHeadsUp,
  cancelHeadsUp,
  getPendingHeadsUps,
  getHeadsUpPreferences,
  saveHeadsUpPreferences,
} from './heads-up-scheduler';

// Heads-Up Delivery
export type { DeliveryResult, InAppNotification } from './heads-up-delivery';
export {
  deliverBriefing,
  getUnreadNotifications,
  markNotificationRead,
  cleanupExpiredNotifications,
} from './heads-up-delivery';
