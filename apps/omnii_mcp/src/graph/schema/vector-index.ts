/**
 * Vector Index Configuration
 *
 * Defines constants and functions for managing the Neo4j vector index
 * used for semantic similarity search on Entity nodes.
 *
 * Uses HNSW algorithm with cosine similarity for OpenAI ada-002 embeddings.
 */

import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';

/**
 * Name of the vector index for entity embeddings.
 * Used in all vector search operations.
 */
export const VECTOR_INDEX_NAME = 'entity_embeddings';

/**
 * Dimensions for OpenAI text-embedding-ada-002 model.
 * All embeddings must be exactly this length.
 */
export const VECTOR_DIMENSIONS = 1536;

/**
 * Similarity function for vector comparisons.
 * Cosine similarity is best for normalized embeddings like ada-002.
 */
export const VECTOR_SIMILARITY = 'cosine';

/**
 * Vector index status information returned by checkVectorIndex.
 */
export interface VectorIndexStatus {
  name: string;
  state: string;
  populationPercent: number;
  entityCount: number;
  type: string;
}

/**
 * Create the vector index for semantic search on Entity nodes.
 *
 * The index uses:
 * - HNSW algorithm for fast approximate nearest neighbor search
 * - Cosine similarity for comparing normalized embeddings
 * - 1536 dimensions for OpenAI ada-002 compatibility
 * - Quantization enabled for better memory efficiency
 *
 * @param client - Neo4j HTTP client for the user's database
 * @returns true if index was created, false if it already exists
 */
export async function createVectorIndex(client: Neo4jHTTPClient): Promise<boolean> {
  try {
    const cypher = `
      CREATE VECTOR INDEX ${VECTOR_INDEX_NAME} IF NOT EXISTS
      FOR (n:Entity)
      ON n.embedding
      OPTIONS {
        indexConfig: {
          \`vector.dimensions\`: ${VECTOR_DIMENSIONS},
          \`vector.similarity_function\`: '${VECTOR_SIMILARITY}',
          \`vector.quantization.enabled\`: true
        }
      }
    `;

    await client.query(cypher);

    // Check if index was actually created (vs already existed)
    const status = await checkVectorIndex(client);
    return status !== null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create vector index: ${message}`);
  }
}

/**
 * Check the status of the vector index.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @returns Index status if exists, null if not found
 */
export async function checkVectorIndex(client: Neo4jHTTPClient): Promise<VectorIndexStatus | null> {
  try {
    const cypher = `
      SHOW INDEXES
      YIELD name, state, populationPercent, entityCount, type
      WHERE name = $indexName
      RETURN name, state, populationPercent, entityCount, type
    `;

    const result = await client.query(cypher, { indexName: VECTOR_INDEX_NAME });

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return null;
    }

    const fields = result.data.fields;
    const values = result.data.values[0];

    // Map fields to values
    const nameIndex = fields.indexOf('name');
    const stateIndex = fields.indexOf('state');
    const populationIndex = fields.indexOf('populationPercent');
    const entityCountIndex = fields.indexOf('entityCount');
    const typeIndex = fields.indexOf('type');

    return {
      name: values[nameIndex] as string,
      state: values[stateIndex] as string,
      populationPercent: values[populationIndex] as number,
      entityCount: values[entityCountIndex] as number,
      type: values[typeIndex] as string,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to check vector index: ${message}`);
  }
}

/**
 * Drop the vector index if it exists.
 * Useful for testing and reset scenarios.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @returns true if index was dropped, false if it didn't exist
 */
export async function dropVectorIndex(client: Neo4jHTTPClient): Promise<boolean> {
  try {
    // First check if index exists
    const status = await checkVectorIndex(client);
    if (!status) {
      return false;
    }

    const cypher = `DROP INDEX ${VECTOR_INDEX_NAME} IF EXISTS`;
    await client.query(cypher);

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to drop vector index: ${message}`);
  }
}
