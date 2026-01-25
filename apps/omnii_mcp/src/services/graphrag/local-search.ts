/**
 * Local Search Service
 *
 * Provides entity-centric search using the GraphRAG "local search" pattern.
 * This is the primary search interface for queries about specific entities,
 * events, or concepts in the user's knowledge graph.
 *
 * "Local" refers to entity-centric queries (vs "global" corpus-wide queries).
 * Local search is faster and more cost-effective for targeted questions.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { NodeLabel } from '../../graph/schema/nodes';
import {
  dualChannelSearch,
  type DualChannelResult,
  type DualChannelOptions,
} from './dual-channel';
import { searchByText } from '../../graph/operations/search';

/**
 * Options for local search operations.
 */
export interface LocalSearchOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Maximum graph traversal depth in hops (default: 2) */
  maxDepth?: number;
  /** Minimum vector similarity score threshold (default: 0.7) */
  minScore?: number;
  /** Filter results to specific node types */
  nodeTypes?: NodeLabel[];
  /** Optional temporal filter (e.g., "last week", "this month") */
  timeRange?: string;
  /** Include related entities via graph traversal (default: true) */
  includeContext?: boolean;
}

/**
 * Result from a local search operation.
 */
export interface LocalSearchResult {
  /** Original search query */
  query: string;
  /** Total number of results found */
  totalResults: number;
  /** Array of results with entity and graph context */
  results: DualChannelResult[];
  /** Performance metadata for monitoring */
  searchMetadata: {
    /** Time spent on vector search (ms) */
    vectorSearchTime: number;
    /** Time spent on graph traversal (ms) */
    graphTraversalTime: number;
    /** Total search time (ms) */
    totalTime: number;
  };
}

/**
 * Execute entity-centric local search with optional graph context.
 *
 * This is the primary GraphRAG search interface for targeted queries.
 * Combines vector similarity search with graph traversal to provide
 * semantically relevant results enriched with relationship context.
 *
 * Use cases:
 * - "Find meetings with John Smith last week"
 * - "What projects am I working on?"
 * - "Show contacts at Acme Corp"
 *
 * For corpus-wide questions ("summarize all activity"), use global search
 * (deferred to later phase).
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param query - Natural language search query
 * @param userId - User ID for multi-tenant isolation
 * @param options - Search options (limit, context, temporal filtering)
 * @returns Search results with timing metadata
 */
export async function localSearch(
  client: Neo4jHTTPClient,
  query: string,
  userId: string,
  options?: LocalSearchOptions
): Promise<LocalSearchResult> {
  const startTime = performance.now();

  const includeContext = options?.includeContext ?? true;
  const timeRange = options?.timeRange;

  try {
    let results: DualChannelResult[];
    let vectorSearchTime = 0;
    let graphTraversalTime = 0;

    if (!includeContext) {
      // Vector-only mode (no graph traversal)
      const vectorStart = performance.now();
      const vectorResults = await searchByText(client, query, {
        limit: options?.limit,
        nodeTypes: options?.nodeTypes,
        minScore: options?.minScore,
      });
      vectorSearchTime = performance.now() - vectorStart;

      // Convert to DualChannelResult format (empty related entities/relationships)
      results = vectorResults.map((r) => ({
        entity: {
          id: r.id,
          name: r.name,
          type: r.labels[0] || 'Unknown',
          properties: r.properties,
        },
        vectorScore: r.score,
        relatedEntities: [],
        relationships: [],
      }));
    } else {
      // Full dual-channel retrieval (vector + graph)
      const dualChannelStart = performance.now();

      const dualChannelOptions: DualChannelOptions = {
        limit: options?.limit,
        maxDepth: options?.maxDepth,
        minScore: options?.minScore,
        nodeTypes: options?.nodeTypes,
      };

      results = await dualChannelSearch(client, query, userId, dualChannelOptions);

      const dualChannelEnd = performance.now();
      // For dual-channel, we can't separate vector vs graph time precisely
      // Estimate 30% vector, 70% graph based on typical query profiles
      const totalDualTime = dualChannelEnd - dualChannelStart;
      vectorSearchTime = totalDualTime * 0.3;
      graphTraversalTime = totalDualTime * 0.7;
    }

    // Apply temporal filtering if specified
    if (timeRange && results.length > 0) {
      results = await applyTemporalFilter(client, results, timeRange, userId);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    return {
      query,
      totalResults: results.length,
      results,
      searchMetadata: {
        vectorSearchTime: Math.round(vectorSearchTime),
        graphTraversalTime: Math.round(graphTraversalTime),
        totalTime: Math.round(totalTime),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Local search failed: ${message}`);
  }
}

/**
 * Apply temporal filtering to search results.
 *
 * Filters entities/events based on created_at or start_time timestamps.
 * Uses Neo4j duration arithmetic for time range calculations.
 *
 * @param client - Neo4j HTTP client
 * @param results - Results to filter
 * @param timeRange - Temporal filter (e.g., "last week", "this month")
 * @param userId - User ID for multi-tenant isolation
 * @returns Filtered results
 */
async function applyTemporalFilter(
  client: Neo4jHTTPClient,
  results: DualChannelResult[],
  timeRange: string,
  userId: string
): Promise<DualChannelResult[]> {
  // Map time ranges to Neo4j durations
  const TEMPORAL_DURATIONS: Record<string, string> = {
    'today': 'P0D',
    'yesterday': 'P1D',
    'last week': 'P7D',
    'this week': 'P7D',
    'last month': 'P1M',
    'this month': 'P1M',
    'last year': 'P1Y',
    'this year': 'P1Y',
  };

  const duration = TEMPORAL_DURATIONS[timeRange.toLowerCase()];
  if (!duration) {
    // Invalid time range - return unfiltered results
    console.warn(
      `Invalid time range '${timeRange}'. Valid options: ${Object.keys(TEMPORAL_DURATIONS).join(', ')}`
    );
    return results;
  }

  // Extract entity IDs for temporal filtering query
  const entityIds = results.map((r) => r.entity.id);

  if (entityIds.length === 0) {
    return results;
  }

  try {
    const cypher = `
      UNWIND $entityIds AS entityId
      MATCH (n {id: entityId, user_id: $userId})

      WITH n, datetime() AS now, datetime() - duration($duration) AS startTime

      // Check temporal fields (created_at for most nodes, start_time for Events)
      WHERE (n.created_at >= startTime AND n.created_at <= now)
         OR (n.start_time >= startTime AND n.start_time <= now)

      RETURN n.id AS id
    `;

    const result = await client.query(cypher, {
      entityIds,
      userId,
      duration,
    });

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return [];
    }

    // Extract filtered IDs
    const filteredIds = new Set(
      result.data.values.map((row) => row[result.data.fields.indexOf('id')] as string)
    );

    // Filter original results to only include temporally matched entities
    return results.filter((r) => filteredIds.has(r.entity.id));
  } catch (error) {
    console.error('Temporal filtering failed:', error);
    // Return unfiltered results on error (graceful degradation)
    return results;
  }
}
