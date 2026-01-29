/**
 * Entity Confidence Calibration
 *
 * Calibrates confidence scores for extracted entities based on
 * source type, temporal proximity, and graph relationships.
 */

import type {
  ExtractionSource,
  EntityType,
  ConfidenceFactors,
  QualityClassification,
} from './types';

/**
 * Weight factors by extraction source
 * Higher = more reliable source
 */
const SOURCE_WEIGHTS: Record<ExtractionSource, number> = {
  calendar: 0.95, // Structured data, high reliability
  contact: 0.9, // User-curated data
  email: 0.85, // Semi-structured, sender verified
  task: 0.85, // User-created items
  note: 0.8, // User content, may have typos
  file: 0.75, // Extracted text, OCR errors possible
  manual: 1.0, // User explicitly entered
};

/**
 * Minimum confidence thresholds by entity type
 * Below this, entity is likely noise
 */
const TYPE_THRESHOLDS: Record<EntityType, number> = {
  Person: 0.7, // Names can be ambiguous
  Organization: 0.6, // Common words can match
  Location: 0.65, // Geographic terms are contextual
  Date: 0.9, // Dates should be unambiguous
  Event: 0.7, // Events need clear context
  Concept: 0.5, // Concepts are inherently fuzzy
  Project: 0.6, // Project names vary
};

/**
 * Calculate source weight factor
 */
export function getSourceWeight(source: ExtractionSource): number {
  return SOURCE_WEIGHTS[source] ?? 0.75;
}

/**
 * Calculate temporal proximity boost
 * Recent content gets higher confidence (more relevant)
 *
 * @param contentTimestamp - When the source content was created
 * @param maxBoost - Maximum boost to apply (default 0.15)
 */
export function calculateTemporalBoost(
  contentTimestamp: Date,
  maxBoost = 0.15
): number {
  const now = new Date();
  const ageMs = now.getTime() - contentTimestamp.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  // Recent (< 24h): full boost
  if (ageHours < 24) return maxBoost;

  // This week: 75% boost
  if (ageHours < 168) return maxBoost * 0.75;

  // This month: 50% boost
  if (ageHours < 720) return maxBoost * 0.5;

  // Older: 25% boost
  if (ageHours < 2160) return maxBoost * 0.25;

  // Very old: no boost
  return 0;
}

/**
 * Calculate relationship strength boost from graph
 * More connections = higher confidence the entity is real
 *
 * @param connectionCount - Number of relationships in graph
 * @param maxBoost - Maximum boost to apply (default 0.15)
 */
export function calculateRelationshipBoost(
  connectionCount: number,
  maxBoost = 0.15
): number {
  if (connectionCount === 0) return 0;
  if (connectionCount === 1) return maxBoost * 0.25;
  if (connectionCount <= 3) return maxBoost * 0.5;
  if (connectionCount <= 5) return maxBoost * 0.75;
  return maxBoost; // 6+ connections = full boost
}

/**
 * Calculate ambiguity penalty
 * Applied when multiple entities could match
 *
 * @param matchCount - Number of potential matches in graph
 * @param maxPenalty - Maximum penalty (default -0.2)
 */
export function calculateAmbiguityPenalty(
  matchCount: number,
  maxPenalty = -0.2
): number {
  if (matchCount <= 1) return 0;
  if (matchCount === 2) return maxPenalty * 0.5;
  if (matchCount <= 4) return maxPenalty * 0.75;
  return maxPenalty; // 5+ matches = full penalty
}

/**
 * Get minimum threshold for entity type
 */
export function getTypeThreshold(type: EntityType): number {
  return TYPE_THRESHOLDS[type] ?? 0.5;
}

/**
 * Calculate calibrated confidence score
 *
 * Formula:
 * calibrated = (base * sourceWeight) + temporalBoost + relationshipBoost + ambiguityPenalty
 * Clamped to [0, 1]
 */
export function calibrateConfidence(factors: ConfidenceFactors): number {
  const weighted = factors.baseConfidence * factors.sourceWeight;
  const calibrated =
    weighted +
    factors.temporalBoost +
    factors.relationshipBoost +
    factors.ambiguityPenalty;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, calibrated));
}

/**
 * Build confidence factors for an entity
 */
export function buildConfidenceFactors(params: {
  baseConfidence: number;
  source: ExtractionSource;
  contentTimestamp?: Date;
  connectionCount?: number;
  matchCount?: number;
}): ConfidenceFactors {
  return {
    baseConfidence: params.baseConfidence,
    sourceWeight: getSourceWeight(params.source),
    temporalBoost: params.contentTimestamp
      ? calculateTemporalBoost(params.contentTimestamp)
      : 0,
    relationshipBoost: calculateRelationshipBoost(params.connectionCount ?? 0),
    ambiguityPenalty: calculateAmbiguityPenalty(params.matchCount ?? 0),
  };
}

/**
 * Classify entity quality based on calibrated confidence
 */
export function classifyQuality(
  confidence: number,
  autoAcceptThreshold = 0.85,
  reviewThreshold = 0.6
): QualityClassification {
  if (confidence >= autoAcceptThreshold) return 'high';
  if (confidence >= reviewThreshold) return 'medium';
  return 'low';
}

/**
 * Check if entity should be auto-accepted
 */
export function shouldAutoAccept(
  confidence: number,
  entityType: EntityType,
  threshold = 0.85
): boolean {
  const typeThreshold = getTypeThreshold(entityType);
  return confidence >= threshold && confidence >= typeThreshold;
}

/**
 * Check if entity needs human review
 */
export function needsReview(
  confidence: number,
  entityType: EntityType,
  reviewThreshold = 0.6,
  autoAcceptThreshold = 0.85
): boolean {
  const typeThreshold = getTypeThreshold(entityType);

  // Below type threshold = definitely needs review
  if (confidence < typeThreshold) return true;

  // Between review and auto-accept = needs review
  return confidence >= reviewThreshold && confidence < autoAcceptThreshold;
}

/**
 * Should entity be rejected (too low confidence)
 */
export function shouldReject(
  confidence: number,
  entityType: EntityType,
  minThreshold = 0.3
): boolean {
  const typeThreshold = getTypeThreshold(entityType);
  return confidence < minThreshold || confidence < typeThreshold * 0.5;
}
