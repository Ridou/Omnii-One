/**
 * Relationship Inference Patterns
 *
 * Defines patterns for discovering relationships across different
 * data sources (email, calendar, tasks, notes, files).
 */

import type { ExtractionSource, EntityType } from './types';

/**
 * Pattern types for cross-source inference
 */
export type InferencePatternType =
  | 'EMAIL_MEETING_ATTENDEE'
  | 'TASK_MEETING_FOLLOWUP'
  | 'NOTE_CONTACT_MENTION'
  | 'FILE_PROJECT_CONTEXT'
  | 'TEMPORAL_SEQUENCE'
  | 'EMAIL_THREAD_PARTICIPANTS'
  | 'SHARED_COLLABORATORS';

/**
 * Inference pattern definition
 */
export interface InferencePattern {
  type: InferencePatternType;
  name: string;
  description: string;
  /** Source types this pattern connects */
  sourceTypes: [ExtractionSource, ExtractionSource];
  /** Entity types this pattern applies to */
  entityTypes: [EntityType, EntityType];
  /** Relationship type to create */
  relationshipType: string;
  /** Base confidence for this pattern */
  baseConfidence: number;
  /** Priority for pattern matching (higher = checked first) */
  priority: number;
  /** Maximum time window for temporal patterns (hours) */
  temporalWindowHours?: number;
}

/**
 * Pattern definitions
 */
export const INFERENCE_PATTERNS: InferencePattern[] = [
  {
    type: 'EMAIL_MEETING_ATTENDEE',
    name: 'Email Sender Attended Meeting',
    description: 'Person who sent/received email also attended a related meeting',
    sourceTypes: ['email', 'calendar'],
    entityTypes: ['Person', 'Event'],
    relationshipType: 'ATTENDED',
    baseConfidence: 0.85,
    priority: 100,
    temporalWindowHours: 168, // 1 week
  },
  {
    type: 'TASK_MEETING_FOLLOWUP',
    name: 'Task Created After Meeting',
    description: 'Task created within 24h of meeting is likely a follow-up',
    sourceTypes: ['task', 'calendar'],
    entityTypes: ['Event', 'Event'],
    relationshipType: 'FOLLOWED_BY',
    baseConfidence: 0.75,
    priority: 90,
    temporalWindowHours: 24,
  },
  {
    type: 'NOTE_CONTACT_MENTION',
    name: 'Note Mentions Contact',
    description: 'Wiki-link in note references a known contact',
    sourceTypes: ['note', 'contact'],
    entityTypes: ['Person', 'Person'],
    relationshipType: 'REFERENCES',
    baseConfidence: 0.9,
    priority: 95,
  },
  {
    type: 'FILE_PROJECT_CONTEXT',
    name: 'File Related to Project',
    description: 'Document content or metadata relates to project',
    sourceTypes: ['file', 'note'],
    entityTypes: ['Concept', 'Project'],
    relationshipType: 'BELONGS_TO',
    baseConfidence: 0.7,
    priority: 70,
  },
  {
    type: 'TEMPORAL_SEQUENCE',
    name: 'Events in Temporal Sequence',
    description: 'Events occurring within time window are related',
    sourceTypes: ['calendar', 'calendar'],
    entityTypes: ['Event', 'Event'],
    relationshipType: 'RELATED_TO',
    baseConfidence: 0.6,
    priority: 50,
    temporalWindowHours: 4,
  },
  {
    type: 'EMAIL_THREAD_PARTICIPANTS',
    name: 'Email Thread Collaboration',
    description: 'People on same email thread likely collaborate',
    sourceTypes: ['email', 'email'],
    entityTypes: ['Person', 'Person'],
    relationshipType: 'COLLABORATES_WITH',
    baseConfidence: 0.8,
    priority: 85,
  },
  {
    type: 'SHARED_COLLABORATORS',
    name: 'Shared Meeting Attendees',
    description: 'People who attended same meetings likely collaborate',
    sourceTypes: ['calendar', 'calendar'],
    entityTypes: ['Person', 'Person'],
    relationshipType: 'COLLABORATES_WITH',
    baseConfidence: 0.75,
    priority: 80,
  },
];

/**
 * Get pattern by type
 */
export function getPattern(type: InferencePatternType): InferencePattern | undefined {
  return INFERENCE_PATTERNS.find((p) => p.type === type);
}

/**
 * Get patterns applicable to given source types
 */
export function getPatternsForSources(
  source1: ExtractionSource,
  source2: ExtractionSource
): InferencePattern[] {
  return INFERENCE_PATTERNS.filter(
    (p) =>
      (p.sourceTypes[0] === source1 && p.sourceTypes[1] === source2) ||
      (p.sourceTypes[0] === source2 && p.sourceTypes[1] === source1)
  ).sort((a, b) => b.priority - a.priority);
}

/**
 * Get patterns applicable to given entity types
 */
export function getPatternsForEntityTypes(
  type1: EntityType,
  type2: EntityType
): InferencePattern[] {
  return INFERENCE_PATTERNS.filter(
    (p) =>
      (p.entityTypes[0] === type1 && p.entityTypes[1] === type2) ||
      (p.entityTypes[0] === type2 && p.entityTypes[1] === type1)
  ).sort((a, b) => b.priority - a.priority);
}

/**
 * Calculate adjusted confidence for pattern match
 */
export function calculatePatternConfidence(
  pattern: InferencePattern,
  factors: {
    entityConfidence1: number;
    entityConfidence2: number;
    temporalProximityHours?: number;
    additionalEvidence?: number;
  }
): number {
  let confidence = pattern.baseConfidence;

  // Factor in entity confidences
  const avgEntityConfidence =
    (factors.entityConfidence1 + factors.entityConfidence2) / 2;
  confidence *= avgEntityConfidence;

  // Boost for temporal proximity
  if (
    pattern.temporalWindowHours &&
    factors.temporalProximityHours !== undefined
  ) {
    const proximityRatio =
      1 - factors.temporalProximityHours / pattern.temporalWindowHours;
    if (proximityRatio > 0) {
      confidence *= 1 + proximityRatio * 0.2; // Up to 20% boost
    }
  }

  // Boost for additional evidence
  if (factors.additionalEvidence) {
    confidence *= 1 + Math.min(factors.additionalEvidence, 3) * 0.1; // Up to 30% boost
  }

  return Math.min(confidence, 1.0);
}
