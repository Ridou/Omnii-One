/**
 * AI Services Types
 *
 * Type definitions for enhanced AI intelligence features.
 */

/**
 * Source types for extracted entities
 */
export type ExtractionSource =
  | 'calendar'
  | 'contact'
  | 'email'
  | 'note'
  | 'file'
  | 'task'
  | 'manual';

/**
 * Entity types supported by the extraction system
 */
export type EntityType =
  | 'Person'
  | 'Organization'
  | 'Location'
  | 'Date'
  | 'Event'
  | 'Concept'
  | 'Project';

/**
 * Quality classification for extracted entities
 */
export type QualityClassification = 'high' | 'medium' | 'low';

/**
 * Factors that contribute to confidence scoring
 */
export interface ConfidenceFactors {
  /** Base confidence from LLM extraction (0-1) */
  baseConfidence: number;
  /** Weight based on source type (0-1) */
  sourceWeight: number;
  /** Boost from temporal proximity (0-0.2) */
  temporalBoost: number;
  /** Boost from existing graph relationships (0-0.2) */
  relationshipBoost: number;
  /** Penalty for ambiguous matches (-0.2-0) */
  ambiguityPenalty: number;
}

/**
 * Enhanced entity with calibrated confidence
 */
export interface EnhancedEntity {
  /** Entity identifier (may be new or existing) */
  id?: string;
  /** Entity name */
  name: string;
  /** Entity type */
  type: EntityType;
  /** Calibrated confidence score (0-1) */
  confidence: number;
  /** Breakdown of confidence factors */
  confidenceFactors: ConfidenceFactors;
  /** Quality classification */
  quality: QualityClassification;
  /** Source of extraction */
  source: ExtractionSource;
  /** Whether entity exists in graph */
  existsInGraph: boolean;
  /** Matched graph node ID if exists */
  matchedNodeId?: string;
  /** Original text that was extracted */
  sourceText: string;
  /** Position in source content */
  position?: { start: number; end: number };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of entity extraction
 */
export interface ExtractionResult {
  /** Extracted entities with confidence */
  entities: EnhancedEntity[];
  /** Source content hash for deduplication */
  contentHash: string;
  /** Extraction timestamp */
  extractedAt: string;
  /** Processing duration in ms */
  processingTimeMs: number;
  /** Entities that need review */
  needsReview: EnhancedEntity[];
  /** Entities auto-accepted */
  autoAccepted: EnhancedEntity[];
}

/**
 * Configuration for entity extraction
 */
export interface ExtractionConfig {
  /** Minimum confidence to include (default: 0.3) */
  minConfidence?: number;
  /** Auto-accept threshold (default: 0.85) */
  autoAcceptThreshold?: number;
  /** Review threshold (default: 0.6) */
  reviewThreshold?: number;
  /** Source type for weighting */
  source: ExtractionSource;
  /** Include entity types (default: all) */
  includeTypes?: EntityType[];
  /** Maximum entities to extract */
  maxEntities?: number;
}

/**
 * Relationship suggestion from cross-source inference
 */
export interface RelationshipSuggestion {
  id: string;
  sourceEntity: {
    id: string;
    name: string;
    type: EntityType;
  };
  targetEntity: {
    id: string;
    name: string;
    type: EntityType;
  };
  relationshipType: string;
  confidence: number;
  evidence: {
    source: ExtractionSource;
    snippet: string;
    timestamp: string;
  }[];
  pattern: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

/**
 * Meeting briefing for heads-up context
 */
export interface MeetingBriefing {
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  attendees: AttendeeContext[];
  relatedDocuments: DocumentSummary[];
  previousMeetings: EventSummary[];
  relatedEmails: EmailSummary[];
  suggestedActions: ActionItem[];
  aiSummary: string;
  generatedAt: string;
  expiresAt: string;
}

/**
 * Context about a meeting attendee
 */
export interface AttendeeContext {
  id: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
  recentInteractions: number;
  lastInteractionDate?: string;
  relationshipStrength: number;
  talkingPoints: string[];
}

/**
 * Summary of a related document
 */
export interface DocumentSummary {
  id: string;
  title: string;
  type: string;
  relevanceScore: number;
  keyPoints: string[];
  uploadedAt: string;
}

/**
 * Summary of a previous event
 */
export interface EventSummary {
  id: string;
  title: string;
  date: string;
  attendeeOverlap: number;
  keyOutcomes?: string[];
}

/**
 * Summary of related email thread
 */
export interface EmailSummary {
  threadId: string;
  subject: string;
  participants: string[];
  lastMessageDate: string;
  messageCount: number;
  keyTopics: string[];
}

/**
 * Suggested action item
 */
export interface ActionItem {
  id: string;
  type: 'review_document' | 'prepare_topic' | 'follow_up' | 'rsvp' | 'custom';
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  relatedEntityId?: string;
}

/**
 * Analytics insight
 */
export interface AnalyticsInsight {
  id: string;
  type: PatternType;
  category: 'productivity' | 'collaboration' | 'patterns' | 'trends';
  title: string;
  description: string;
  confidence: number;
  data: Record<string, unknown>;
  recommendation: string;
  detectedAt: string;
  dismissed: boolean;
  viewedAt?: string;
}

/**
 * Pattern types for analytics
 */
export type PatternType =
  | 'meeting_followup_rate'
  | 'email_response_time'
  | 'task_completion_velocity'
  | 'meeting_duration_drift'
  | 'collaboration_clusters'
  | 'productivity_windows'
  | 'communication_patterns';

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  timeRange: { start: string; end: string };
  meetingsCount: number;
  tasksCompleted: number;
  emailsSent: number;
  documentsCreated: number;
  topCollaborators: { name: string; interactions: number }[];
  productivityScore: number;
  insights: AnalyticsInsight[];
  generatedAt: string;
}
