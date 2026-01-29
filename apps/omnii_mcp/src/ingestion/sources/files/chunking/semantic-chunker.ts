/**
 * Semantic Chunking Module
 *
 * Splits documents into semantically coherent chunks for RAG retrieval.
 * Uses LangChain's RecursiveCharacterTextSplitter which preserves
 * semantic boundaries (paragraphs -> sentences -> words).
 *
 * Key parameters from research:
 * - 400-512 tokens per chunk (optimal for retrieval)
 * - 10-20% overlap (prevents context loss at boundaries)
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { CHUNK_CONFIGS, type SupportedFileType, type ChunkConfig } from '../types';

/**
 * Chunk document text using semantic splitting.
 *
 * Uses RecursiveCharacterTextSplitter which tries to split on:
 * 1. Double newlines (paragraph breaks)
 * 2. Single newlines
 * 3. Periods followed by space (sentence boundaries)
 * 4. Spaces (word boundaries)
 * 5. Characters (last resort)
 *
 * This preserves semantic coherence better than fixed-size chunking.
 *
 * @param text - Document text to chunk
 * @param fileType - File type for config selection
 * @returns Array of text chunks
 */
export async function chunkDocument(
  text: string,
  fileType: SupportedFileType
): Promise<string[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const config = CHUNK_CONFIGS[fileType] || CHUNK_CONFIGS.txt;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    separators: config.separators,
  });

  const chunks = await splitter.splitText(text);

  // Filter out very short chunks (less than 20 chars - likely noise)
  return chunks.filter((chunk) => chunk.trim().length >= 20);
}

/**
 * Chunk document with custom configuration.
 *
 * @param text - Document text to chunk
 * @param config - Custom chunk configuration
 * @returns Array of text chunks
 */
export async function chunkWithConfig(
  text: string,
  config: ChunkConfig
): Promise<string[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    separators: config.separators,
  });

  const chunks = await splitter.splitText(text);

  return chunks.filter((chunk) => chunk.trim().length >= 20);
}

/**
 * Estimate number of chunks for a given text.
 *
 * Useful for progress indication before processing.
 *
 * @param text - Document text
 * @param fileType - File type for config selection
 * @returns Estimated chunk count
 */
export function estimateChunkCount(text: string, fileType: SupportedFileType): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  const config = CHUNK_CONFIGS[fileType] || CHUNK_CONFIGS.txt;
  const effectiveSize = config.chunkSize - config.chunkOverlap;

  return Math.ceil(text.length / effectiveSize);
}
