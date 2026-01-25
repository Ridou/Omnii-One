/**
 * Embedding Generation Module
 *
 * Provides functions to generate text embeddings using OpenAI's
 * text-embedding-ada-002 model for semantic similarity search.
 *
 * Includes rate limit handling with exponential backoff.
 */

import OpenAI from 'openai';
import { env } from '../../config/env';
import { VECTOR_DIMENSIONS } from '../schema/vector-index';

/**
 * OpenAI client initialized with API key from environment.
 */
const openai = new OpenAI({
  apiKey: env.OMNII_OPENAI_API_KEY,
});

/**
 * Model used for embedding generation.
 * ada-002 produces 1536-dimensional vectors.
 */
const EMBEDDING_MODEL = 'text-embedding-ada-002';

/**
 * Maximum retries for rate limit errors.
 */
const MAX_RETRIES = 3;

/**
 * Base delay in milliseconds for exponential backoff.
 */
const BASE_DELAY_MS = 1000;

/**
 * Sleep for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a rate limit error (status 429).
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return error.status === 429;
  }
  return false;
}

/**
 * Generate a single embedding vector for the given text.
 *
 * Uses OpenAI text-embedding-ada-002 model which produces
 * 1536-dimensional vectors suitable for cosine similarity search.
 *
 * Includes retry logic with exponential backoff for rate limits.
 *
 * @param text - The text to generate an embedding for
 * @returns Array of 1536 floating point numbers
 * @throws Error if embedding generation fails or dimensions don't match
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });

      const embedding = response.data[0].embedding;

      // Validate embedding dimensions
      if (embedding.length !== VECTOR_DIMENSIONS) {
        throw new Error(
          `Embedding dimension mismatch: expected ${VECTOR_DIMENSIONS}, got ${embedding.length}`
        );
      }

      return embedding;
    } catch (error) {
      if (isRateLimitError(error)) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `OpenAI rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(delayMs);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }

      // Non-rate-limit errors are thrown immediately
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate embedding: ${message}`);
    }
  }

  // Exhausted retries
  throw new Error(
    `Failed to generate embedding after ${MAX_RETRIES} retries: ${lastError?.message || 'Rate limit exceeded'}`
  );
}

/**
 * Generate embeddings for multiple texts in a single batch.
 *
 * More efficient than calling generateEmbedding multiple times
 * as it makes a single API call for all texts.
 *
 * Includes retry logic with exponential backoff for rate limits.
 *
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors in the same order as input texts
 * @throws Error if embedding generation fails or dimensions don't match
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Filter out empty texts and track their positions
  const nonEmptyTexts: string[] = [];
  const nonEmptyIndices: number[] = [];

  for (let i = 0; i < texts.length; i++) {
    if (texts[i] && texts[i].trim().length > 0) {
      nonEmptyTexts.push(texts[i]);
      nonEmptyIndices.push(i);
    }
  }

  if (nonEmptyTexts.length === 0) {
    throw new Error('Cannot generate embeddings: all texts are empty');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: nonEmptyTexts,
      });

      // Validate all embeddings have correct dimensions
      const embeddings: number[][] = [];

      for (const item of response.data) {
        if (item.embedding.length !== VECTOR_DIMENSIONS) {
          throw new Error(
            `Embedding dimension mismatch: expected ${VECTOR_DIMENSIONS}, got ${item.embedding.length}`
          );
        }
        embeddings.push(item.embedding);
      }

      // If all texts were non-empty, return directly
      if (nonEmptyTexts.length === texts.length) {
        return embeddings;
      }

      // Otherwise, rebuild result array with empty placeholder for empty inputs
      // (throw error for empty texts as they shouldn't be passed)
      throw new Error(
        'Some input texts were empty. Filter empty texts before calling generateEmbeddings.'
      );
    } catch (error) {
      if (isRateLimitError(error)) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `OpenAI rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(delayMs);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }

      // Non-rate-limit errors are thrown immediately
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate embeddings: ${message}`);
    }
  }

  // Exhausted retries
  throw new Error(
    `Failed to generate embeddings after ${MAX_RETRIES} retries: ${lastError?.message || 'Rate limit exceeded'}`
  );
}
