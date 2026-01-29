/**
 * Cross-Source Matcher
 *
 * Matches entities across different data sources and infers
 * relationships using defined patterns.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { EnhancedEntity, RelationshipSuggestion, ExtractionSource } from './types';
import {
  INFERENCE_PATTERNS,
  getPatternsForSources,
  calculatePatternConfidence,
  type InferencePattern,
} from './inference-patterns';
import { nanoid } from 'nanoid';

/**
 * Entity match result from graph lookup
 */
interface EntityMatch {
  id: string;
  name: string;
  type: string;
  source: ExtractionSource;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Find potential entity matches across sources
 */
export async function matchAcrossSources(
  client: Neo4jHTTPClient,
  entity: EnhancedEntity,
  targetSources: ExtractionSource[]
): Promise<EntityMatch[]> {
  const query = `
    MATCH (n)
    WHERE (
      toLower(n.name) = toLower($name)
      OR toLower(n.name) CONTAINS toLower($name)
      OR toLower($name) CONTAINS toLower(n.name)
    )
    AND n.source IN $targetSources
    RETURN n.id as id, n.name as name, labels(n)[0] as type,
           n.source as source, n.createdAt as createdAt
    LIMIT 10
  `;

  try {
    const result = await client.query(query, {
      name: entity.name,
      targetSources,
    });

    return result.records.map((r) => ({
      id: r.get('id') as string,
      name: r.get('name') as string,
      type: r.get('type') as string,
      source: r.get('source') as ExtractionSource,
      createdAt: r.get('createdAt')?.toString() ?? '',
    }));
  } catch {
    return [];
  }
}

/**
 * Find entities related to a calendar event
 */
async function findEventRelatedEntities(
  client: Neo4jHTTPClient,
  eventId: string
): Promise<EntityMatch[]> {
  const query = `
    MATCH (e:Event {id: $eventId})-[:HAS_ATTENDEE|MENTIONED_IN|RELATED_TO]-(n)
    RETURN n.id as id, n.name as name, labels(n)[0] as type,
           n.source as source, n.createdAt as createdAt
    LIMIT 20
  `;

  try {
    const result = await client.query(query, { eventId });
    return result.records.map((r) => ({
      id: r.get('id') as string,
      name: r.get('name') as string,
      type: r.get('type') as string,
      source: r.get('source') as ExtractionSource,
      createdAt: r.get('createdAt')?.toString() ?? '',
    }));
  } catch {
    return [];
  }
}

/**
 * Check if relationship already exists
 */
async function relationshipExists(
  client: Neo4jHTTPClient,
  sourceId: string,
  targetId: string,
  relationshipType: string
): Promise<boolean> {
  const query = `
    MATCH (s {id: $sourceId})-[r]->(t {id: $targetId})
    WHERE type(r) = $relationshipType
    RETURN count(r) > 0 as exists
  `;

  try {
    const result = await client.query(query, {
      sourceId,
      targetId,
      relationshipType,
    });
    return (result.records[0]?.get('exists') as boolean) ?? false;
  } catch {
    return false;
  }
}

/**
 * Calculate temporal proximity between two timestamps
 */
function calculateTemporalProximity(
  timestamp1: string | Date,
  timestamp2: string | Date
): number {
  const t1 = new Date(timestamp1).getTime();
  const t2 = new Date(timestamp2).getTime();
  const diffMs = Math.abs(t1 - t2);
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Infer relationship from matched entities using patterns
 */
export async function inferRelationship(
  client: Neo4jHTTPClient,
  entity1: EnhancedEntity,
  entity2: EntityMatch,
  pattern: InferencePattern
): Promise<RelationshipSuggestion | null> {
  // Check if relationship already exists
  if (entity1.matchedNodeId) {
    const exists = await relationshipExists(
      client,
      entity1.matchedNodeId,
      entity2.id,
      pattern.relationshipType
    );
    if (exists) return null;
  }

  // Calculate temporal proximity if both have timestamps
  let temporalProximityHours: number | undefined;
  if (entity1.metadata?.createdAt && entity2.createdAt) {
    temporalProximityHours = calculateTemporalProximity(
      entity1.metadata.createdAt as string,
      entity2.createdAt
    );

    // Skip if outside temporal window
    if (
      pattern.temporalWindowHours &&
      temporalProximityHours > pattern.temporalWindowHours
    ) {
      return null;
    }
  }

  // Calculate confidence
  const confidence = calculatePatternConfidence(pattern, {
    entityConfidence1: entity1.confidence,
    entityConfidence2: 0.8, // Graph entities have reasonable confidence
    temporalProximityHours,
  });

  // Create suggestion
  const suggestion: RelationshipSuggestion = {
    id: nanoid(),
    sourceEntity: {
      id: entity1.matchedNodeId ?? entity1.id ?? '',
      name: entity1.name,
      type: entity1.type,
    },
    targetEntity: {
      id: entity2.id,
      name: entity2.name,
      type: entity2.type as any,
    },
    relationshipType: pattern.relationshipType,
    confidence,
    evidence: [
      {
        source: entity1.source,
        snippet: `Found ${entity1.name} in ${entity1.source}`,
        timestamp: new Date().toISOString(),
      },
      {
        source: entity2.source,
        snippet: `Found ${entity2.name} in ${entity2.source}`,
        timestamp: entity2.createdAt,
      },
    ],
    pattern: pattern.type,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  return suggestion;
}

/**
 * Discover cross-source relationships for entities
 */
export async function discoverCrossSourceRelationships(
  client: Neo4jHTTPClient,
  entities: EnhancedEntity[],
  targetSources: ExtractionSource[]
): Promise<RelationshipSuggestion[]> {
  const suggestions: RelationshipSuggestion[] = [];

  for (const entity of entities) {
    // Find matches in target sources
    const matches = await matchAcrossSources(client, entity, targetSources);

    for (const match of matches) {
      // Get applicable patterns
      const patterns = getPatternsForSources(entity.source, match.source);

      for (const pattern of patterns) {
        const suggestion = await inferRelationship(
          client,
          entity,
          match,
          pattern
        );

        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }
  }

  // Sort by confidence (highest first)
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}

/**
 * Validate an inferred relationship with confidence check
 */
export function validateInference(
  suggestion: RelationshipSuggestion,
  minConfidence = 0.5
): { valid: boolean; reason: string } {
  if (suggestion.confidence < minConfidence) {
    return {
      valid: false,
      reason: `Confidence ${suggestion.confidence.toFixed(2)} below threshold ${minConfidence}`,
    };
  }

  if (suggestion.evidence.length < 2) {
    return {
      valid: false,
      reason: 'Insufficient evidence (need at least 2 sources)',
    };
  }

  if (suggestion.sourceEntity.id === suggestion.targetEntity.id) {
    return {
      valid: false,
      reason: 'Cannot create self-referential relationship',
    };
  }

  return {
    valid: true,
    reason: 'Meets all validation criteria',
  };
}
