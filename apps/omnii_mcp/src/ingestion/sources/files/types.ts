/**
 * File Ingestion Type Definitions
 *
 * Types for file parsing, chunking, and quality scoring.
 */

import type { DocumentNode, ChunkNode } from '../../../graph/schema/nodes';

/**
 * Supported file types for ingestion
 */
export type SupportedFileType = 'pdf' | 'docx' | 'txt' | 'md' | 'code';

/**
 * MIME types we accept (verified via magic numbers, not extension)
 */
export const SUPPORTED_MIME_TYPES: Record<string, SupportedFileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  // Code files detected as text/plain, but we check extension for code-specific handling
};

/**
 * File extensions for code files (when MIME is text/plain)
 */
export const CODE_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs',
  '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.cs',
  '.php', '.sh', '.bash', '.zsh', '.yaml', '.yml', '.json',
  '.html', '.css', '.scss', '.sql', '.graphql',
];

/**
 * Result from parsing a file
 */
export interface ParseResult {
  /** Extracted text content */
  text: string;
  /** Parser-specific metadata */
  metadata: {
    /** Total pages (PDF only) */
    totalPages?: number;
    /** Parser warnings */
    warnings?: string[];
    /** File format */
    format: string;
  };
  /** Initial confidence from parser (0-1) */
  confidence: number;
}

/**
 * Configuration for chunking strategy
 */
export interface ChunkConfig {
  /** Maximum characters per chunk */
  chunkSize: number;
  /** Overlap between adjacent chunks */
  chunkOverlap: number;
  /** Separators for splitting (ordered by priority) */
  separators: string[];
}

/**
 * Recommended chunk configs by file type
 */
export const CHUNK_CONFIGS: Record<SupportedFileType, ChunkConfig> = {
  pdf: { chunkSize: 512, chunkOverlap: 100, separators: ['\n\n', '\n', '. ', ' ', ''] },
  docx: { chunkSize: 512, chunkOverlap: 100, separators: ['\n\n', '\n', '. ', ' ', ''] },
  txt: { chunkSize: 400, chunkOverlap: 80, separators: ['\n\n', '\n', '. ', ' ', ''] },
  md: { chunkSize: 512, chunkOverlap: 100, separators: ['\n\n', '\n', '. ', ' ', ''] },
  code: { chunkSize: 800, chunkOverlap: 200, separators: ['\n\nfunction ', '\n\nclass ', '\n\n', '\n'] },
};

/**
 * Quality metrics for extraction validation
 */
export interface QualityMetrics {
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Estimated text completeness (0-1) */
  completeness: number;
  /** Warning messages */
  warnings: string[];
  /** Whether extraction needs human review (confidence < 0.8) */
  needsReview: boolean;
}

/**
 * File processing job data for BullMQ
 */
export interface FileProcessingJobData {
  /** User ID who uploaded the file */
  userId: string;
  /** Path in Supabase Storage */
  storagePath: string;
  /** Detected file type */
  fileType: SupportedFileType;
  /** Original filename */
  originalName: string;
  /** SHA-256 hash for deduplication */
  fileHash: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type */
  mimeType: string;
}

/**
 * Result from file processing worker
 */
export interface FileProcessingResult {
  /** Processing succeeded */
  success: boolean;
  /** Document node ID created */
  documentId?: string;
  /** Number of chunks created */
  chunksCreated?: number;
  /** Extraction quality metrics */
  quality?: QualityMetrics;
  /** Error message if failed */
  error?: string;
}

/**
 * File upload response (immediate, before processing)
 */
export interface FileUploadResponse {
  /** Processing status */
  status: 'processing' | 'duplicate' | 'error';
  /** File hash (ID for tracking) */
  fileHash: string;
  /** Message for client */
  message: string;
  /** Existing document ID if duplicate */
  existingDocumentId?: string;
}

// Re-export node types for convenience
export type { DocumentNode, ChunkNode };
