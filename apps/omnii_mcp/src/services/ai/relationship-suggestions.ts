/**
 * Relationship Suggestion Service
 *
 * Generates, ranks, and manages relationship suggestions
 * from cross-source inference.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { RelationshipSuggestion, EntityType } from './types';
import { validateInference } from './cross-source-matcher';
import { nanoid } from 'nanoid';

/**
 * Generate formatted suggestion for user approval
 */
export function formatForApproval(suggestion: RelationshipSuggestion): {
  id: string;
  summary: string;
  details: string;
  confidence: string;
  evidence: string[];
  actions: { approve: string; reject: string };
} {
  const confidenceLabel =
    suggestion.confidence >= 0.8
      ? 'High'
      : suggestion.confidence >= 0.6
        ? 'Medium'
        : 'Low';

  return {
    id: suggestion.id,
    summary: `${suggestion.sourceEntity.name} ${formatRelationship(suggestion.relationshipType)} ${suggestion.targetEntity.name}`,
    details: `Discovered from ${suggestion.pattern.replace(/_/g, ' ').toLowerCase()}`,
    confidence: `${confidenceLabel} (${Math.round(suggestion.confidence * 100)}%)`,
    evidence: suggestion.evidence.map(
      (e) => `[${e.source}] ${e.snippet}`
    ),
    actions: {
      approve: `Create ${suggestion.relationshipType} relationship`,
      reject: 'Dismiss suggestion',
    },
  };
}

/**
 * Format relationship type for display
 */
function formatRelationship(type: string): string {
  const formats: Record<string, string> = {
    ATTENDED: 'attended',
    FOLLOWED_BY: 'was followed by',
    REFERENCES: 'references',
    BELONGS_TO: 'belongs to',
    RELATED_TO: 'is related to',
    COLLABORATES_WITH: 'collaborates with',
    WORKS_AT: 'works at',
    KNOWS: 'knows',
  };
  return formats[type] ?? type.toLowerCase().replace(/_/g, ' ');
}

/**
 * Rank suggestions by relevance
 */
export function rankSuggestions(
  suggestions: RelationshipSuggestion[]
): RelationshipSuggestion[] {
  return suggestions.sort((a, b) => {
    // Primary: confidence
    if (Math.abs(a.confidence - b.confidence) > 0.1) {
      return b.confidence - a.confidence;
    }

    // Secondary: evidence count
    if (a.evidence.length !== b.evidence.length) {
      return b.evidence.length - a.evidence.length;
    }

    // Tertiary: recency
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Filter suggestions by confidence threshold
 */
export function filterByConfidence(
  suggestions: RelationshipSuggestion[],
  minConfidence: number
): RelationshipSuggestion[] {
  return suggestions.filter((s) => s.confidence >= minConfidence);
}

/**
 * Store suggestion in Neo4j
 */
export async function storeSuggestion(
  client: Neo4jHTTPClient,
  suggestion: RelationshipSuggestion
): Promise<void> {
  const query = `
    CREATE (s:RelationshipSuggestion {
      id: $id,
      sourceEntityId: $sourceEntityId,
      sourceEntityName: $sourceEntityName,
      sourceEntityType: $sourceEntityType,
      targetEntityId: $targetEntityId,
      targetEntityName: $targetEntityName,
      targetEntityType: $targetEntityType,
      relationshipType: $relationshipType,
      confidence: $confidence,
      pattern: $pattern,
      status: $status,
      createdAt: datetime($createdAt),
      evidence: $evidence
    })
  `;

  await client.query(query, {
    id: suggestion.id,
    sourceEntityId: suggestion.sourceEntity.id,
    sourceEntityName: suggestion.sourceEntity.name,
    sourceEntityType: suggestion.sourceEntity.type,
    targetEntityId: suggestion.targetEntity.id,
    targetEntityName: suggestion.targetEntity.name,
    targetEntityType: suggestion.targetEntity.type,
    relationshipType: suggestion.relationshipType,
    confidence: suggestion.confidence,
    pattern: suggestion.pattern,
    status: suggestion.status,
    createdAt: suggestion.createdAt,
    evidence: JSON.stringify(suggestion.evidence),
  });
}

/**
 * Get pending suggestions
 */
export async function getPendingSuggestions(
  client: Neo4jHTTPClient,
  limit = 20,
  minConfidence = 0.5
): Promise<RelationshipSuggestion[]> {
  const query = `
    MATCH (s:RelationshipSuggestion)
    WHERE s.status = 'pending'
    AND s.confidence >= $minConfidence
    RETURN s
    ORDER BY s.confidence DESC, s.createdAt DESC
    LIMIT $limit
  `;

  const result = await client.query(query, { limit, minConfidence });

  return result.records.map((r) => {
    const node = r.get('s') as { properties: Record<string, unknown> } | null;
    const s = node?.properties ?? {};
    return {
      id: s.id as string,
      sourceEntity: {
        id: s.sourceEntityId as string,
        name: s.sourceEntityName as string,
        type: s.sourceEntityType as EntityType,
      },
      targetEntity: {
        id: s.targetEntityId as string,
        name: s.targetEntityName as string,
        type: s.targetEntityType as EntityType,
      },
      relationshipType: s.relationshipType as string,
      confidence: s.confidence as number,
      evidence: JSON.parse(s.evidence as string),
      pattern: s.pattern as string,
      status: s.status as 'pending' | 'approved' | 'rejected',
      createdAt: String(s.createdAt),
    };
  });
}

/**
 * Approve suggestion and create relationship
 */
export async function approveSuggestion(
  client: Neo4jHTTPClient,
  suggestionId: string
): Promise<{ success: boolean; relationshipId?: string; error?: string }> {
  // Get suggestion
  const getQuery = `
    MATCH (s:RelationshipSuggestion {id: $suggestionId})
    RETURN s
  `;

  const result = await client.query(getQuery, { suggestionId });

  if (result.records.length === 0) {
    return { success: false, error: 'Suggestion not found' };
  }

  const suggestionNode = result.records[0].get('s') as { properties: Record<string, unknown> } | null;
  const suggestion = suggestionNode?.properties ?? {};

  // Create relationship
  const relationshipId = nanoid();
  const createQuery = `
    MATCH (source {id: $sourceId})
    MATCH (target {id: $targetId})
    CREATE (source)-[r:${suggestion.relationshipType} {
      id: $relationshipId,
      createdAt: datetime(),
      inferredFrom: $suggestionId,
      confidence: $confidence
    }]->(target)
    SET r.source = 'inference'
    RETURN r
  `;

  try {
    await client.query(createQuery, {
      sourceId: suggestion.sourceEntityId,
      targetId: suggestion.targetEntityId,
      relationshipId,
      suggestionId,
      confidence: suggestion.confidence,
    });

    // Update suggestion status
    const updateQuery = `
      MATCH (s:RelationshipSuggestion {id: $suggestionId})
      SET s.status = 'approved',
          s.reviewedAt = datetime()
    `;
    await client.query(updateQuery, { suggestionId });

    return { success: true, relationshipId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create relationship',
    };
  }
}

/**
 * Reject suggestion
 */
export async function rejectSuggestion(
  client: Neo4jHTTPClient,
  suggestionId: string,
  feedback?: string
): Promise<void> {
  const query = `
    MATCH (s:RelationshipSuggestion {id: $suggestionId})
    SET s.status = 'rejected',
        s.reviewedAt = datetime(),
        s.feedback = $feedback
  `;

  await client.query(query, { suggestionId, feedback: feedback ?? '' });
}

/**
 * Get suggestion statistics
 */
export async function getSuggestionStats(
  client: Neo4jHTTPClient
): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  avgConfidence: number;
  byPattern: Record<string, number>;
}> {
  const query = `
    MATCH (s:RelationshipSuggestion)
    RETURN
      count(s) as total,
      sum(CASE WHEN s.status = 'pending' THEN 1 ELSE 0 END) as pending,
      sum(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END) as approved,
      sum(CASE WHEN s.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      avg(s.confidence) as avgConfidence,
      collect(DISTINCT s.pattern) as patterns
  `;

  const result = await client.query(query, {});

  if (result.records.length === 0) {
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      avgConfidence: 0,
      byPattern: {},
    };
  }

  const record = result.records[0];

  // Get counts by pattern
  const patternQuery = `
    MATCH (s:RelationshipSuggestion)
    RETURN s.pattern as pattern, count(s) as count
  `;
  const patternResult = await client.query(patternQuery, {});
  const byPattern: Record<string, number> = {};
  for (const r of patternResult.records) {
    const pattern = r.get('pattern') as string;
    byPattern[pattern] = r.get('count') as number;
  }

  return {
    total: record.get('total') as number,
    pending: record.get('pending') as number,
    approved: record.get('approved') as number,
    rejected: record.get('rejected') as number,
    avgConfidence: record.get('avgConfidence') as number,
    byPattern,
  };
}
