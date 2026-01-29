/**
 * Semantic Search Operations
 *
 * Provides vector similarity search and graph traversal operations
 * for the Omnii knowledge graph.
 *
 * Uses Neo4j's db.index.vector.queryNodes procedure for efficient
 * approximate nearest neighbor search on entity embeddings.
 *
 * Includes text-based fallback when vector indexes are unavailable.
 */

import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import type { NodeLabel } from '../schema/nodes';
import { VECTOR_INDEX_NAME } from '../schema/vector-index';
import { generateEmbedding } from './embeddings';

/**
 * Flag to track if vector index is available.
 * Set to false on first vector search failure to avoid repeated attempts.
 */
let vectorSearchAvailable: boolean | null = null;

/**
 * Result from a semantic search operation.
 */
export interface SearchResult {
  /** Unique identifier of the node */
  id: string;
  /** Display name of the node */
  name: string;
  /** Node labels (e.g., ['Entity', 'Person']) */
  labels: string[];
  /** Similarity score (0-1, higher is more similar) */
  score: number;
  /** All properties of the node */
  properties: Record<string, unknown>;
}

/**
 * Options for search operations.
 */
export interface SearchOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Filter results to specific node types */
  nodeTypes?: NodeLabel[];
  /** Minimum similarity score threshold (default: 0.7) */
  minScore?: number;
}

/**
 * Result from a related nodes traversal.
 */
export interface RelatedNodeResult {
  /** Unique identifier of the related node */
  id: string;
  /** Display name of the related node */
  name: string;
  /** Node labels */
  labels: string[];
  /** Properties of the related node */
  properties: Record<string, unknown>;
  /** Relationship path from the source node */
  relationshipPath: {
    types: string[];
    depth: number;
  };
}

/**
 * Options for related nodes traversal.
 */
export interface RelatedNodesOptions {
  /** Maximum traversal depth (default: 2) */
  maxDepth?: number;
  /** Maximum number of results (default: 20) */
  limit?: number;
}

/**
 * Search for nodes by embedding vector similarity.
 *
 * Uses Neo4j's db.index.vector.queryNodes procedure for efficient
 * approximate nearest neighbor search using the HNSW index.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param embedding - Query embedding vector (1536 dimensions)
 * @param options - Search options (limit, nodeTypes, minScore)
 * @returns Array of search results sorted by similarity score descending
 */
export async function searchByEmbedding(
  client: Neo4jHTTPClient,
  embedding: number[],
  options?: SearchOptions
): Promise<SearchResult[]> {
  const limit = options?.limit ?? 10;
  const minScore = options?.minScore ?? 0.7;
  const nodeTypes = options?.nodeTypes;

  // Build the base query using db.index.vector.queryNodes
  let cypher: string;

  if (nodeTypes && nodeTypes.length > 0) {
    // Filter by specific node types
    const labelsFilter = nodeTypes.map((t) => `'${t}'`).join(', ');
    cypher = `
      CALL db.index.vector.queryNodes($indexName, $k, $queryVector)
      YIELD node, score
      WHERE score >= $minScore
        AND ANY(label IN labels(node) WHERE label IN [${labelsFilter}])
      RETURN
        node.id AS id,
        node.name AS name,
        labels(node) AS labels,
        score,
        properties(node) AS properties
      ORDER BY score DESC
      LIMIT $limit
    `;
  } else {
    cypher = `
      CALL db.index.vector.queryNodes($indexName, $k, $queryVector)
      YIELD node, score
      WHERE score >= $minScore
      RETURN
        node.id AS id,
        node.name AS name,
        labels(node) AS labels,
        score,
        properties(node) AS properties
      ORDER BY score DESC
      LIMIT $limit
    `;
  }

  try {
    const result = await client.query(cypher, {
      indexName: VECTOR_INDEX_NAME,
      k: limit * 2, // Request more than limit to account for filtering
      queryVector: embedding,
      minScore,
      limit,
    });

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return [];
    }

    const fields = result.data.fields;
    const idIndex = fields.indexOf('id');
    const nameIndex = fields.indexOf('name');
    const labelsIndex = fields.indexOf('labels');
    const scoreIndex = fields.indexOf('score');
    const propsIndex = fields.indexOf('properties');

    return result.data.values.map((row) => ({
      id: row[idIndex] as string,
      name: row[nameIndex] as string,
      labels: row[labelsIndex] as string[],
      score: row[scoreIndex] as number,
      properties: row[propsIndex] as Record<string, unknown>,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Vector search failed: ${message}`);
  }
}

/**
 * Text-based fallback search using Cypher string matching.
 *
 * Uses case-insensitive CONTAINS matching on name and description fields.
 * This provides basic search functionality when vector indexes are unavailable.
 *
 * @param client - Neo4j HTTP client
 * @param query - Search query string
 * @param options - Search options
 * @returns Array of search results with text match scores
 */
export async function textBasedSearch(
  client: Neo4jHTTPClient,
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  const limit = options?.limit ?? 10;
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

  // Text matching with score based on number of matching terms
  const cypher = `
    MATCH (node)
    WHERE (node:Contact OR node:Event OR node:Entity OR node:Concept OR node:Document OR node:Chunk)
    ${labelFilter}
    WITH node,
         [term IN $searchTerms WHERE toLower(node.name) CONTAINS term | term] AS nameMatches,
         [term IN $searchTerms WHERE node.description IS NOT NULL AND toLower(node.description) CONTAINS term | term] AS descMatches,
         [term IN $searchTerms WHERE node.text IS NOT NULL AND toLower(node.text) CONTAINS term | term] AS textMatches
    WHERE size(nameMatches) > 0 OR size(descMatches) > 0 OR size(textMatches) > 0
    WITH node,
         // Score: name matches worth more than description/text matches, normalized 0-1
         (size(nameMatches) * 2.0 + size(descMatches) * 1.0 + size(textMatches) * 1.0) / (size($searchTerms) * 4.0) AS score
    RETURN
      node.id AS id,
      node.name AS name,
      labels(node) AS labels,
      score,
      properties(node) AS properties
    ORDER BY score DESC
    LIMIT $limit
  `;

  try {
    const result = await client.query(cypher, {
      searchTerms,
      limit,
      nodeTypes,
    });

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return [];
    }

    const fields = result.data.fields;
    const idIndex = fields.indexOf('id');
    const nameIndex = fields.indexOf('name');
    const labelsIndex = fields.indexOf('labels');
    const scoreIndex = fields.indexOf('score');
    const propsIndex = fields.indexOf('properties');

    return result.data.values.map((row) => ({
      id: row[idIndex] as string,
      name: row[nameIndex] as string,
      labels: row[labelsIndex] as string[],
      score: row[scoreIndex] as number,
      properties: row[propsIndex] as Record<string, unknown>,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Text search failed: ${message}`);
  }
}

/**
 * Search for nodes by natural language text query.
 *
 * Generates an embedding from the query text and performs
 * a vector similarity search. Falls back to text-based search
 * if vector indexes are unavailable.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param query - Natural language search query
 * @param options - Search options (limit, nodeTypes, minScore)
 * @returns Array of search results sorted by similarity score descending
 */
export async function searchByText(
  client: Neo4jHTTPClient,
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  // If we know vector search is unavailable, use text search directly
  if (vectorSearchAvailable === false) {
    console.log('[Search] Using text-based search (vector index unavailable)');
    return textBasedSearch(client, query, options);
  }

  try {
    // Generate embedding for the search query
    const embedding = await generateEmbedding(query);

    // Perform vector similarity search
    const vectorResults = await searchByEmbedding(client, embedding, options);

    // Mark vector search as available
    if (vectorSearchAvailable === null) {
      vectorSearchAvailable = true;
      console.log('[Search] Vector search confirmed available');
    }

    // Also perform text search to catch nodes without embeddings
    const textResults = await textBasedSearch(client, query, options);

    // Merge and deduplicate results, preferring vector scores when available
    const resultMap = new Map<string, SearchResult>();

    // Add vector results first (they have semantic similarity scores)
    for (const r of vectorResults) {
      resultMap.set(r.id, r);
    }

    // Add text results that aren't already in the map
    for (const r of textResults) {
      if (!resultMap.has(r.id)) {
        resultMap.set(r.id, r);
      }
    }

    // Sort by score descending and limit
    const mergedResults = Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options?.limit ?? 10);

    console.log(`[Search] Merged ${vectorResults.length} vector + ${textResults.length} text = ${mergedResults.length} results`);

    return mergedResults;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Check if this is a vector index error - fall back to text search
    if (
      message.includes('vector') ||
      message.includes('index') ||
      message.includes('db.index.vector') ||
      message.includes('400')
    ) {
      console.warn('[Search] Vector search failed, falling back to text search:', message);
      vectorSearchAvailable = false;
      return textBasedSearch(client, query, options);
    }

    throw new Error(`Text search failed: ${message}`);
  }
}

/**
 * Reset the vector search availability flag.
 * Useful when vector index is created or for testing.
 */
export function resetVectorSearchStatus(): void {
  vectorSearchAvailable = null;
}

/**
 * Find nodes related to a given node through graph traversal.
 *
 * Traverses relationships up to maxDepth hops from the source node
 * to find connected entities. Useful for exploring the knowledge graph
 * context around a specific node.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param nodeId - UUID of the source node to traverse from
 * @param options - Traversal options (maxDepth, limit)
 * @returns Array of related nodes with their relationship paths
 */
export async function findRelatedNodes(
  client: Neo4jHTTPClient,
  nodeId: string,
  options?: RelatedNodesOptions
): Promise<RelatedNodeResult[]> {
  const maxDepth = options?.maxDepth ?? 2;
  const limit = options?.limit ?? 20;

  const cypher = `
    MATCH (source {id: $nodeId})
    MATCH path = (source)-[*1..${maxDepth}]-(related)
    WHERE source <> related
    WITH DISTINCT related, path,
         [r IN relationships(path) | type(r)] AS relTypes,
         length(path) AS depth
    RETURN
      related.id AS id,
      related.name AS name,
      labels(related) AS labels,
      properties(related) AS properties,
      relTypes,
      depth
    ORDER BY depth ASC, related.name ASC
    LIMIT $limit
  `;

  try {
    const result = await client.query(cypher, { nodeId, limit });

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return [];
    }

    const fields = result.data.fields;
    const idIndex = fields.indexOf('id');
    const nameIndex = fields.indexOf('name');
    const labelsIndex = fields.indexOf('labels');
    const propsIndex = fields.indexOf('properties');
    const relTypesIndex = fields.indexOf('relTypes');
    const depthIndex = fields.indexOf('depth');

    return result.data.values.map((row) => ({
      id: row[idIndex] as string,
      name: row[nameIndex] as string,
      labels: row[labelsIndex] as string[],
      properties: row[propsIndex] as Record<string, unknown>,
      relationshipPath: {
        types: row[relTypesIndex] as string[],
        depth: row[depthIndex] as number,
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Related nodes search failed: ${message}`);
  }
}
