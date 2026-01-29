/**
 * File Ingestion Module
 *
 * Exports for file upload, parsing, chunking, and processing.
 */

// Types
export * from './types';

// Validators
export { validateFile, calculateFileHash, MAX_FILE_SIZE } from './validators/file-validator';

// Parsers
export { parseFile, parsePDF, parseDOCX, parseText, parseMarkdown, parseCode } from './parsers';

// Chunking
export { chunkDocument, chunkWithConfig, estimateChunkCount } from './chunking';

// Quality scoring
export { scoreExtraction, formatQualityAssessment, isQualityAcceptable, REVIEW_THRESHOLD } from './quality-scorer';

// Graph operations
export {
  createDocumentWithChunks,
  checkDuplicateDocument,
  getDocumentById,
  getDocumentsNeedingReview,
  updateDocumentReviewStatus,
} from './graph-operations';

// Worker
export { processFileJob } from './file-worker';
