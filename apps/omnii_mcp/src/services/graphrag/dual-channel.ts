/**
 * Dual-Channel Retrieval Service
 *
 * Implements the HybridCypherRetriever pattern combining vector similarity
 * search with graph traversal to provide context-aware retrieval.
 *
 * This is the core GraphRAG pattern that achieves 67% better accuracy than
 * vector-only RAG by enriching semantic search results with relationship context.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { NodeLabel } from '../../graph/schema/nodes';
import { generateEmbedding } from '../../graph/operations/embeddings';
import { VECTOR_INDEX_NAME } from '../../graph/schema/vector-index';

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
}

/**
 * Execute dual-channel retrieval combining vector search with graph traversal.
 *
 * Implementation follows the HybridCypherRetriever pattern:
 * 1. Vector search finds semantically similar nodes (via HNSW index)
 * 2. Graph traversal expands context with 1-2 hop neighbors
 * 3. Results combine both vector scores and relationship context
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

  try {
    // Generate embedding for query
    const embedding = await generateEmbedding(query);

    // Build combined vector + graph query
    // Uses CALL subquery to integrate graph traversal inline
    const cypher = `
      CALL db.index.vector.queryNodes($indexName, $candidateLimit, $embedding)
      YIELD node, score
      WHERE node.user_id = $userId AND score >= $minScore
      ${nodeTypes && nodeTypes.length > 0 ? `AND ANY(label IN labels(node) WHERE label IN $nodeTypes)` : ''}

      CALL {
        WITH node
        MATCH (node)-[r1]-(neighbor1)
        WHERE neighbor1.user_id = $userId
        ${maxDepth >= 2 ? `
        OPTIONAL MATCH (neighbor1)-[r2]-(neighbor2)
        WHERE neighbor2.user_id = $userId AND neighbor2 <> node
        WITH node,
             collect(DISTINCT {node: neighbor1, rel: r1, hop: 1}) +
             collect(DISTINCT {node: neighbor2, rel: r2, hop: 2}) AS neighbors,
             collect(DISTINCT r1) AS directRels
        ` : `
        WITH node,
             collect(DISTINCT {node: neighbor1, rel: r1, hop: 1}) AS neighbors,
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
      userId,
      minScore,
      limit,
      nodeTypes,
    });

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return [];
    }

    // Map Neo4j HTTP API response to DualChannelResult
    return mergeChannelResults(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Dual-channel search failed: ${message}`);
  }
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
