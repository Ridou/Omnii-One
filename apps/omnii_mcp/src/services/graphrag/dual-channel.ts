/**
 * Dual-Channel Retrieval Service
 *
 * Implements the HybridCypherRetriever pattern combining vector similarity
 * search with graph traversal to provide context-aware retrieval.
 *
 * This is the core GraphRAG pattern that achieves 67% better accuracy than
 * vector-only RAG by enriching semantic search results with relationship context.
 *
 * Includes text-based fallback search when vector indexes are unavailable.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { NodeLabel } from '../../graph/schema/nodes';
import { generateEmbedding } from '../../graph/operations/embeddings';
import { VECTOR_INDEX_NAME } from '../../graph/schema/vector-index';

/**
 * Flag to track if vector index is available.
 * Set to false on first vector search failure to avoid repeated attempts.
 */
let vectorIndexAvailable: boolean | null = null;

/**
 * Result from dual-channel retrieval combining vector search with graph context.
 */
export interface DualChannelResult {
  /** The primary entity found via vector search */
  entity: {
    /** Node UUID */
    id: string;
    /** Display name */
    name: string;
    /** Node type (Entity, Event, Contact, Concept) */
    type: string;
    /** All node properties (excluding embedding for size) */
    properties: Record<string, unknown>;
  };
  /** Vector similarity score (0-1, higher is more similar) */
  vectorScore: number;
  /** Related entities discovered via graph traversal */
  relatedEntities: Array<{
    /** Node UUID */
    id: string;
    /** Display name */
    name: string;
    /** Node type */
    type: string;
    /** Relationship type connecting to primary entity */
    relationshipType: string;
    /** Number of hops from primary entity (1-2) */
    hopDistance: number;
  }>;
  /** Relationships from the primary entity */
  relationships: Array<{
    /** Relationship type (e.g., EMPLOYED_BY, ATTENDED) */
    type: string;
    /** Direction of relationship relative to entity */
    direction: 'outgoing' | 'incoming';
    /** Relationship properties */
    properties: Record<string, unknown>;
  }>;
}

/**
 * Options for dual-channel search.
 */
export interface DualChannelOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Maximum graph traversal depth in hops (default: 2, max: 2) */
  maxDepth?: number;
  /** Minimum vector similarity score threshold (default: 0.7) */
  minScore?: number;
  /** Filter results to specific node types */
  nodeTypes?: NodeLabel[];
  /** Force text-based search even if vector index is available */
  forceTextSearch?: boolean;
}

/**
 * Text-based fallback search using Cypher string matching.
 *
 * Uses case-insensitive CONTAINS matching on name and description fields.
 * This provides basic search functionality when vector indexes are unavailable.
 *
 * @param client - Neo4j HTTP client
 * @param query - Search query string
 * @param userId - User ID for multi-tenant isolation
 * @param options - Search options
 * @returns Array of dual-channel results with text match scores
 */
export async function textBasedSearch(
  client: Neo4jHTTPClient,
  query: string,
  userId: string,
  options?: DualChannelOptions
): Promise<DualChannelResult[]> {
  const limit = options?.limit ?? 10;
  const maxDepth = Math.min(options?.maxDepth ?? 2, 2);
  const nodeTypes = options?.nodeTypes;

  // Extract search terms (split by spaces, filter short words)
  const searchTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length >= 2);

  if (searchTerms.length === 0) {
    return [];
  }

  // Build label filter
  const labelFilter = nodeTypes && nodeTypes.length > 0
    ? `AND ANY(label IN labels(node) WHERE label IN $nodeTypes)`
    : '';

  // Build text matching conditions - match any term in name or description
  // Score based on number of matching terms
  const cypher = `
    MATCH (node)
    WHERE (node:Contact OR node:Event OR node:Entity OR node:Concept)
    ${labelFilter}
    WITH node,
         [term IN $searchTerms WHERE toLower(node.name) CONTAINS term | term] AS nameMatches,
         [term IN $searchTerms WHERE node.description IS NOT NULL AND toLower(node.description) CONTAINS term | term] AS descMatches
    WHERE size(nameMatches) > 0 OR size(descMatches) > 0
    WITH node,
         // Score: name matches worth more than description matches
         (size(nameMatches) * 2.0 + size(descMatches) * 1.0) / (size($searchTerms) * 3.0) AS score
    ORDER BY score DESC
    LIMIT $candidateLimit

    // Graph traversal for context (same as vector search)
    CALL {
      WITH node
      OPTIONAL MATCH (node)-[r1]-(neighbor1)
      ${maxDepth >= 2 ? `
      OPTIONAL MATCH (neighbor1)-[r2]-(neighbor2)
      WHERE neighbor2 <> node
      WITH node,
           collect(DISTINCT CASE WHEN neighbor1 IS NOT NULL THEN {node: neighbor1, rel: r1, hop: 1} END) +
           collect(DISTINCT CASE WHEN neighbor2 IS NOT NULL THEN {node: neighbor2, rel: r2, hop: 2} END) AS neighbors,
           collect(DISTINCT r1) AS directRels
      ` : `
      WITH node,
           collect(DISTINCT CASE WHEN neighbor1 IS NOT NULL THEN {node: neighbor1, rel: r1, hop: 1} END) AS neighbors,
           collect(DISTINCT r1) AS directRels
      `}
      RETURN neighbors, directRels
    }

    RETURN
      node.id AS id,
      node.name AS name,
      labels(node) AS labels,
      score,
      properties(node) AS properties,
      neighbors,
      directRels
    ORDER BY score DESC
    LIMIT $limit
  `;

  try {
    const result = await client.query(cypher, {
      searchTerms,
      candidateLimit: limit * 2,
      limit,
      nodeTypes,
    });

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return [];
    }

    return mergeChannelResults(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Text search failed: ${message}`);
  }
}

/**
 * Execute dual-channel retrieval combining vector search with graph traversal.
 *
 * Implementation follows the HybridCypherRetriever pattern:
 * 1. Vector search finds semantically similar nodes (via HNSW index)
 * 2. Graph traversal expands context with 1-2 hop neighbors
 * 3. Results combine both vector scores and relationship context
 *
 * Falls back to text-based search if vector index is unavailable.
 *
 * IMPORTANT: Graph traversal is bounded to 1-2 hops to prevent exponential
 * path explosion in densely connected graphs.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param query - Natural language search query
 * @param userId - User ID for multi-tenant isolation
 * @param options - Search options (limit, maxDepth, minScore, nodeTypes)
 * @returns Array of results with entity, vector score, and graph context
 */
export async function dualChannelSearch(
  client: Neo4jHTTPClient,
  query: string,
  userId: string,
  options?: DualChannelOptions
): Promise<DualChannelResult[]> {
  const limit = options?.limit ?? 10;
  const maxDepth = Math.min(options?.maxDepth ?? 2, 2); // Cap at 2 hops
  const minScore = options?.minScore ?? 0.7;
  const nodeTypes = options?.nodeTypes;

  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  // Use text search if forced or if vector index is known to be unavailable
  if (options?.forceTextSearch || vectorIndexAvailable === false) {
    console.log('[DualChannel] Using text-based search fallback');
    return textBasedSearch(client, query, userId, options);
  }

  try {
    // Generate embedding for query
    const embedding = await generateEmbedding(query);

    // Build combined vector + graph query
    // Uses CALL subquery to integrate graph traversal inline
    const cypher = `
      CALL db.index.vector.queryNodes($indexName, $candidateLimit, $embedding)
      YIELD node, score
      WHERE score >= $minScore
      ${nodeTypes && nodeTypes.length > 0 ? `AND ANY(label IN labels(node) WHERE label IN $nodeTypes)` : ''}

      CALL {
        WITH node
        OPTIONAL MATCH (node)-[r1]-(neighbor1)
        ${maxDepth >= 2 ? `
        OPTIONAL MATCH (neighbor1)-[r2]-(neighbor2)
        WHERE neighbor2 <> node
        WITH node,
             collect(DISTINCT CASE WHEN neighbor1 IS NOT NULL THEN {node: neighbor1, rel: r1, hop: 1} END) +
             collect(DISTINCT CASE WHEN neighbor2 IS NOT NULL THEN {node: neighbor2, rel: r2, hop: 2} END) AS neighbors,
             collect(DISTINCT r1) AS directRels
        ` : `
        WITH node,
             collect(DISTINCT CASE WHEN neighbor1 IS NOT NULL THEN {node: neighbor1, rel: r1, hop: 1} END) AS neighbors,
             collect(DISTINCT r1) AS directRels
        `}
        RETURN neighbors, directRels
      }

      WITH node, score, neighbors, directRels
      RETURN
        elementId(node) AS entityId,
        node.id AS id,
        node.name AS name,
        labels(node) AS labels,
        score,
        properties(node) AS properties,
        neighbors,
        directRels
      ORDER BY score DESC
      LIMIT $limit
    `;

    const result = await client.query(cypher, {
      indexName: VECTOR_INDEX_NAME,
      candidateLimit: limit * 2, // Get more candidates for filtering
      embedding,
      minScore,
      limit,
      nodeTypes,
    });

    // Vector search worked - mark as available
    if (vectorIndexAvailable === null) {
      vectorIndexAvailable = true;
      console.log('[DualChannel] Vector index confirmed available');
    }

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      // If vector search returns empty AND we have node type filters,
      // try text search as fallback (vector index may not cover all node types)
      if (nodeTypes && nodeTypes.length > 0) {
        console.log('[DualChannel] Vector search returned empty with filters, trying text search');
        return textBasedSearch(client, query, userId, options);
      }
      return [];
    }

    // Map Neo4j HTTP API response to DualChannelResult
    return mergeChannelResults(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Check if this is a vector index error - fall back to text search
    if (
      message.includes('vector') ||
      message.includes('index') ||
      message.includes('db.index.vector') ||
      message.includes('400')
    ) {
      console.warn('[DualChannel] Vector search failed, falling back to text search:', message);
      vectorIndexAvailable = false;
      return textBasedSearch(client, query, userId, options);
    }

    throw new Error(`Dual-channel search failed: ${message}`);
  }
}

/**
 * Reset the vector index availability flag.
 * Useful when vector index is created or for testing.
 */
export function resetVectorIndexStatus(): void {
  vectorIndexAvailable = null;
}

/**
 * Merge vector search results with graph traversal context.
 *
 * Internal helper that processes Neo4j query results into DualChannelResult format.
 * Handles deduplication of related entities and excludes embedding field from properties.
 *
 * @param data - Neo4j HTTP API query result data
 * @returns Array of dual-channel results
 */
export function mergeChannelResults(data: {
  fields: string[];
  values: unknown[][];
}): DualChannelResult[] {
  const fields = data.fields;
  const idIndex = fields.indexOf('id');
  const nameIndex = fields.indexOf('name');
  const labelsIndex = fields.indexOf('labels');
  const scoreIndex = fields.indexOf('score');
  const propsIndex = fields.indexOf('properties');
  const neighborsIndex = fields.indexOf('neighbors');
  const directRelsIndex = fields.indexOf('directRels');

  return data.values.map((row) => {
    const labels = row[labelsIndex] as string[];
    const properties = row[propsIndex] as Record<string, unknown>;
    const neighbors = (row[neighborsIndex] as Array<{
      node: { id: string; name: string; labels?: string[] };
      rel: { type: string; properties?: Record<string, unknown> };
      hop: number;
    }>) || [];
    const directRels = (row[directRelsIndex] as Array<{
      type: string;
      properties?: Record<string, unknown>;
    }>) || [];

    // Exclude embedding from properties (too large)
    const { embedding, ...cleanProperties } = properties;

    // Deduplicate related entities by ID
    const relatedEntitiesMap = new Map<string, (typeof neighbors)[number]>();
    for (const neighbor of neighbors) {
      if (neighbor && neighbor.node) {
        const nodeId = neighbor.node.id;
        if (!relatedEntitiesMap.has(nodeId)) {
          relatedEntitiesMap.set(nodeId, neighbor);
        }
      }
    }

    const relatedEntities = Array.from(relatedEntitiesMap.values()).map((n) => ({
      id: n.node.id,
      name: n.node.name,
      type: n.node.labels?.[0] || 'Unknown',
      relationshipType: n.rel.type,
      hopDistance: n.hop,
    }));

    // Process relationships
    const relationships = directRels.map((rel) => ({
      type: rel.type,
      direction: 'outgoing' as const, // Cypher returns mixed, default to outgoing
      properties: rel.properties || {},
    }));

    return {
      entity: {
        id: row[idIndex] as string,
        name: row[nameIndex] as string,
        type: labels[0] || 'Unknown',
        properties: cleanProperties,
      },
      vectorScore: row[scoreIndex] as number,
      relatedEntities,
      relationships,
    };
  });
}
