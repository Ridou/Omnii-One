/**
 * Entity Quality Gate
 *
 * Classifies extracted entities into quality tiers and
 * manages the review workflow for uncertain extractions.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type {
  EnhancedEntity,
  QualityClassification,
  EntityType,
  ExtractionSource,
} from './types';
import {
  classifyQuality,
  shouldAutoAccept,
  needsReview,
  getTypeThreshold,
} from './entity-confidence';
import { nanoid } from 'nanoid';

/**
 * Quality gate thresholds (can be user-configured)
 */
export interface QualityGateConfig {
  autoAcceptThreshold: number;
  reviewThreshold: number;
  rejectThreshold: number;
}

const DEFAULT_GATE_CONFIG: QualityGateConfig = {
  autoAcceptThreshold: 0.85,
  reviewThreshold: 0.6,
  rejectThreshold: 0.3,
};

/**
 * Review queue item
 */
export interface ReviewQueueItem {
  id: string;
  entity: EnhancedEntity;
  sourceContent: string;
  sourceType: string;
  sourceId: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  feedback?: string;
}

/**
 * Gate decision result
 */
export interface GateDecision {
  entity: EnhancedEntity;
  action: 'accept' | 'review' | 'reject';
  reason: string;
}

/**
 * Apply quality gate to entity
 */
export function applyQualityGate(
  entity: EnhancedEntity,
  config: QualityGateConfig = DEFAULT_GATE_CONFIG
): GateDecision {
  const typeThreshold = getTypeThreshold(entity.type);

  // Check if should be rejected
  if (entity.confidence < config.rejectThreshold) {
    return {
      entity,
      action: 'reject',
      reason: `Confidence ${entity.confidence.toFixed(2)} below reject threshold ${config.rejectThreshold}`,
    };
  }

  // Check type-specific threshold
  if (entity.confidence < typeThreshold * 0.6) {
    return {
      entity,
      action: 'reject',
      reason: `Confidence ${entity.confidence.toFixed(2)} below type threshold for ${entity.type}`,
    };
  }

  // Check if should be auto-accepted
  if (shouldAutoAccept(entity.confidence, entity.type, config.autoAcceptThreshold)) {
    return {
      entity,
      action: 'accept',
      reason: `High confidence ${entity.confidence.toFixed(2)} - auto-accepted`,
    };
  }

  // Otherwise, needs review
  return {
    entity,
    action: 'review',
    reason: `Medium confidence ${entity.confidence.toFixed(2)} - needs review`,
  };
}

/**
 * Apply quality gate to multiple entities
 */
export function applyQualityGateBatch(
  entities: EnhancedEntity[],
  config: QualityGateConfig = DEFAULT_GATE_CONFIG
): {
  accepted: GateDecision[];
  review: GateDecision[];
  rejected: GateDecision[];
} {
  const accepted: GateDecision[] = [];
  const review: GateDecision[] = [];
  const rejected: GateDecision[] = [];

  for (const entity of entities) {
    const decision = applyQualityGate(entity, config);

    switch (decision.action) {
      case 'accept':
        accepted.push(decision);
        break;
      case 'review':
        review.push(decision);
        break;
      case 'reject':
        rejected.push(decision);
        break;
    }
  }

  return { accepted, review, rejected };
}

/**
 * Add entity to review queue
 */
export async function addToReviewQueue(
  client: Neo4jHTTPClient,
  entity: EnhancedEntity,
  context: {
    sourceContent: string;
    sourceType: string;
    sourceId: string;
  }
): Promise<ReviewQueueItem> {
  const item: ReviewQueueItem = {
    id: nanoid(),
    entity,
    sourceContent: context.sourceContent.slice(0, 500), // Truncate for storage
    sourceType: context.sourceType,
    sourceId: context.sourceId,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  // Store in Neo4j as ReviewItem node
  const query = `
    CREATE (r:ReviewItem {
      id: $id,
      entityName: $entityName,
      entityType: $entityType,
      confidence: $confidence,
      sourceContent: $sourceContent,
      sourceType: $sourceType,
      sourceId: $sourceId,
      status: $status,
      createdAt: datetime($createdAt)
    })
    RETURN r
  `;

  await client.query(query, {
    id: item.id,
    entityName: entity.name,
    entityType: entity.type,
    confidence: entity.confidence,
    sourceContent: item.sourceContent,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    status: item.status,
    createdAt: item.createdAt,
  });

  return item;
}

/**
 * Get pending review items
 */
export async function getPendingReviews(
  client: Neo4jHTTPClient,
  limit = 50
): Promise<ReviewQueueItem[]> {
  const query = `
    MATCH (r:ReviewItem)
    WHERE r.status = 'pending'
    RETURN r
    ORDER BY r.createdAt DESC
    LIMIT $limit
  `;

  const result = await client.query(query, { limit });

  return result.records.map((record) => {
    const node = record.get('r') as { properties: Record<string, unknown> } | null;
    const r = node?.properties ?? {};
    return {
      id: r.id as string,
      entity: {
        name: r.entityName as string,
        type: r.entityType as EntityType,
        confidence: r.confidence as number,
      } as EnhancedEntity,
      sourceContent: r.sourceContent as string,
      sourceType: r.sourceType as ExtractionSource,
      sourceId: r.sourceId as string,
      createdAt: String(r.createdAt),
      status: r.status as 'pending' | 'approved' | 'rejected',
    };
  });
}

/**
 * Approve a review item and create the entity
 */
export async function approveReviewItem(
  client: Neo4jHTTPClient,
  itemId: string,
  reviewedBy?: string
): Promise<void> {
  const query = `
    MATCH (r:ReviewItem {id: $itemId})
    SET r.status = 'approved',
        r.reviewedAt = datetime(),
        r.reviewedBy = $reviewedBy
    RETURN r
  `;

  await client.query(query, { itemId, reviewedBy: reviewedBy ?? 'user' });
}

/**
 * Reject a review item
 */
export async function rejectReviewItem(
  client: Neo4jHTTPClient,
  itemId: string,
  feedback: string,
  reviewedBy?: string
): Promise<void> {
  const query = `
    MATCH (r:ReviewItem {id: $itemId})
    SET r.status = 'rejected',
        r.reviewedAt = datetime(),
        r.reviewedBy = $reviewedBy,
        r.feedback = $feedback
    RETURN r
  `;

  await client.query(query, {
    itemId,
    reviewedBy: reviewedBy ?? 'user',
    feedback,
  });
}

/**
 * Get quality statistics
 */
export async function getQualityStats(
  client: Neo4jHTTPClient
): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  averageConfidence: number;
}> {
  const query = `
    MATCH (r:ReviewItem)
    RETURN
      count(r) as total,
      sum(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending,
      sum(CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END) as approved,
      sum(CASE WHEN r.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      avg(r.confidence) as avgConfidence
  `;

  const result = await client.query(query, {});

  if (result.records.length === 0) {
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      averageConfidence: 0,
    };
  }

  const record = result.records[0];
  return {
    total: record.get('total') as number,
    pending: record.get('pending') as number,
    approved: record.get('approved') as number,
    rejected: record.get('rejected') as number,
    averageConfidence: record.get('avgConfidence') as number,
  };
}
