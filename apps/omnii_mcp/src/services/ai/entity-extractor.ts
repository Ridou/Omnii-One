/**
 * Enhanced Entity Extractor
 *
 * Wraps LLM entity extraction with confidence calibration,
 * graph disambiguation, and quality classification.
 */

import { createHash } from 'crypto';
import type { Neo4jHTTPClient } from '../neo4j/http-client';
import {
  buildConfidenceFactors,
  calibrateConfidence,
  classifyQuality,
  shouldAutoAccept,
  needsReview,
  shouldReject,
} from './entity-confidence';
import type {
  EnhancedEntity,
  ExtractionResult,
  ExtractionConfig,
  EntityType,
  ExtractionSource,
} from './types';

// Import from existing relationship discovery
import { extractEntities as llmExtractEntities } from '../graphrag/relationship-discovery';

/**
 * Default extraction configuration
 */
const DEFAULT_CONFIG: Required<ExtractionConfig> = {
  minConfidence: 0.3,
  autoAcceptThreshold: 0.85,
  reviewThreshold: 0.6,
  source: 'note',
  includeTypes: ['Person', 'Organization', 'Location', 'Date', 'Event', 'Concept', 'Project'],
  maxEntities: 50,
};

/**
 * Hash content for deduplication
 */
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Map entity type strings to our EntityType
 */
function normalizeEntityType(type: string): EntityType {
  const typeMap: Record<string, EntityType> = {
    person: 'Person',
    organization: 'Organization',
    org: 'Organization',
    company: 'Organization',
    location: 'Location',
    place: 'Location',
    date: 'Date',
    time: 'Date',
    datetime: 'Date',
    event: 'Event',
    meeting: 'Event',
    concept: 'Concept',
    topic: 'Concept',
    project: 'Project',
  };

  const normalized = typeMap[type.toLowerCase()];
  return normalized ?? 'Concept';
}

/**
 * Find matching entities in the graph for disambiguation
 */
async function findGraphMatches(
  client: Neo4jHTTPClient,
  name: string,
  type: EntityType
): Promise<{ id: string; name: string; connectionCount: number }[]> {
  const query = `
    MATCH (n)
    WHERE toLower(n.name) CONTAINS toLower($name)
      AND (labels(n)[0] = $type OR $type = 'Any')
    OPTIONAL MATCH (n)-[r]-()
    WITH n, count(r) as connections
    RETURN n.id as id, n.name as name, connections
    ORDER BY connections DESC
    LIMIT 5
  `;

  try {
    const result = await client.query(query, { name, type });
    return result.records.map((r) => ({
      id: r.get('id') as string,
      name: r.get('name') as string,
      connectionCount: r.get('connections') as number,
    }));
  } catch {
    return [];
  }
}

/**
 * Get connection count for a matched entity
 */
async function getConnectionCount(
  client: Neo4jHTTPClient,
  nodeId: string
): Promise<number> {
  const query = `
    MATCH (n {id: $nodeId})-[r]-()
    RETURN count(r) as connections
  `;

  try {
    const result = await client.query(query, { nodeId });
    if (result.records.length > 0) {
      return result.records[0].get('connections') as number;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Extract entities with enhanced confidence calibration
 */
export async function extractEntities(
  client: Neo4jHTTPClient,
  content: string,
  config: ExtractionConfig
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const contentHash = hashContent(content);

  // Call existing LLM extraction
  const llmResult = await llmExtractEntities(content);
  const rawEntities = llmResult.entities;

  const enhancedEntities: EnhancedEntity[] = [];
  const contentTimestamp = new Date(); // Assume current content

  for (const raw of rawEntities) {
    const entityType = normalizeEntityType(raw.type);

    // Skip if type not in filter
    if (!mergedConfig.includeTypes.includes(entityType)) {
      continue;
    }

    // Find potential matches in graph
    const matches = await findGraphMatches(client, raw.name, entityType);
    const matchCount = matches.length;
    const bestMatch = matches[0];

    // Get connection count for disambiguation
    let connectionCount = 0;
    if (bestMatch) {
      connectionCount = bestMatch.connectionCount;
    }

    // Build confidence factors
    const factors = buildConfidenceFactors({
      baseConfidence: raw.confidence ?? 0.7,
      source: mergedConfig.source,
      contentTimestamp,
      connectionCount,
      matchCount,
    });

    // Calculate calibrated confidence
    const calibratedConfidence = calibrateConfidence(factors);

    // Skip if below minimum threshold
    if (shouldReject(calibratedConfidence, entityType, mergedConfig.minConfidence)) {
      continue;
    }

    // Build enhanced entity
    const enhanced: EnhancedEntity = {
      id: bestMatch?.id,
      name: raw.name,
      type: entityType,
      confidence: calibratedConfidence,
      confidenceFactors: factors,
      quality: classifyQuality(
        calibratedConfidence,
        mergedConfig.autoAcceptThreshold,
        mergedConfig.reviewThreshold
      ),
      source: mergedConfig.source,
      existsInGraph: !!bestMatch,
      matchedNodeId: bestMatch?.id,
      sourceText: raw.name,
      metadata: {
        rawConfidence: raw.confidence,
        matchCount,
      },
    };

    enhancedEntities.push(enhanced);

    // Respect max entities limit
    if (enhancedEntities.length >= mergedConfig.maxEntities) {
      break;
    }
  }

  // Sort by confidence (highest first)
  enhancedEntities.sort((a, b) => b.confidence - a.confidence);

  // Classify entities
  const autoAccepted = enhancedEntities.filter((e) =>
    shouldAutoAccept(e.confidence, e.type, mergedConfig.autoAcceptThreshold)
  );
  const needsReviewList = enhancedEntities.filter((e) =>
    needsReview(
      e.confidence,
      e.type,
      mergedConfig.reviewThreshold,
      mergedConfig.autoAcceptThreshold
    )
  );

  return {
    entities: enhancedEntities,
    contentHash,
    extractedAt: new Date().toISOString(),
    processingTimeMs: Date.now() - startTime,
    needsReview: needsReviewList,
    autoAccepted,
  };
}

/**
 * Extract entities from multiple content blocks (batch)
 */
export async function extractEntitiesBatch(
  client: Neo4jHTTPClient,
  contents: { content: string; source: ExtractionSource }[],
  config?: Partial<ExtractionConfig>
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];

  for (const { content, source } of contents) {
    const result = await extractEntities(client, content, {
      ...config,
      source,
    });
    results.push(result);
  }

  return results;
}

/**
 * Re-extract entities with updated configuration
 */
export async function reextractWithConfig(
  client: Neo4jHTTPClient,
  content: string,
  newConfig: ExtractionConfig
): Promise<ExtractionResult> {
  return extractEntities(client, content, newConfig);
}
