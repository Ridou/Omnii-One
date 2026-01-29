/**
 * File Processing Worker
 *
 * Processes queued file jobs through the full ingestion pipeline:
 * 1. Download file from Supabase Storage
 * 2. Parse file to extract text
 * 3. Score extraction quality
 * 4. Chunk text for RAG
 * 5. Create Document and Chunk nodes in Neo4j
 *
 * Each step updates job progress for status tracking.
 */

import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { createClientForUser } from '../../../services/neo4j/http-client';
import { parseFile } from './parsers';
import { chunkDocument } from './chunking';
import { scoreExtraction } from './quality-scorer';
import { createDocumentWithChunks, checkDuplicateDocument } from './graph-operations';
import type { FileProcessingJobData, FileProcessingResult } from './types';
import { env } from '../../../config/env';

// Initialize Supabase client
const supabase = createClient(
  env.OMNII_SUPABASE_URL,
  env.OMNII_SUPABASE_SERVICE_KEY
);

const STORAGE_BUCKET = 'documents';

/**
 * Process a file job from the queue.
 *
 * @param job - BullMQ job with file processing data
 * @returns Processing result with document ID and quality metrics
 */
export async function processFileJob(
  job: Job<FileProcessingJobData>
): Promise<FileProcessingResult> {
  const {
    userId,
    storagePath,
    fileType,
    originalName,
    fileHash,
    fileSize,
    mimeType,
  } = job.data;

  console.log(`[FileWorker] Processing file: ${originalName} (${fileType})`);

  try {
    // Progress: 0% - Starting
    await job.updateProgress(0);

    // Step 1: Get Neo4j client for user
    const client = await createClientForUser(userId);
    if (!client) {
      throw new Error('User database not provisioned');
    }

    // Step 2: Check for duplicate (in case of retry)
    const existingDocId = await checkDuplicateDocument(client, fileHash);
    if (existingDocId) {
      console.log(`[FileWorker] Duplicate detected, document already exists: ${existingDocId}`);
      return {
        success: true,
        documentId: existingDocId,
        chunksCreated: 0,
        error: 'Duplicate - document already processed',
      };
    }

    // Progress: 10% - Downloading file
    await job.updateProgress(10);

    // Step 3: Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }

    const buffer = await fileData.arrayBuffer();

    // Progress: 20% - Parsing file
    await job.updateProgress(20);

    // Step 4: Parse file to extract text
    console.log(`[FileWorker] Parsing ${fileType} file...`);
    const parsed = await parseFile(buffer, fileType);

    if (!parsed.text || parsed.text.trim().length === 0) {
      throw new Error('Parsing produced no text content');
    }

    console.log(`[FileWorker] Extracted ${parsed.text.length} characters, parser confidence: ${parsed.confidence}`);

    // Progress: 40% - Scoring quality
    await job.updateProgress(40);

    // Step 5: Score extraction quality
    const quality = scoreExtraction(parsed, fileSize, fileType);
    console.log(`[FileWorker] Quality score: ${(quality.confidence * 100).toFixed(0)}%, needsReview: ${quality.needsReview}`);

    if (quality.warnings.length > 0) {
      console.log(`[FileWorker] Warnings: ${quality.warnings.join(', ')}`);
    }

    // Progress: 50% - Chunking text
    await job.updateProgress(50);

    // Step 6: Chunk text for RAG
    console.log(`[FileWorker] Chunking text...`);
    const chunks = await chunkDocument(parsed.text, fileType);
    console.log(`[FileWorker] Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error('Chunking produced no chunks (text may be too short)');
    }

    // Progress: 60% - Creating graph nodes
    await job.updateProgress(60);

    // Step 7: Create Document and Chunk nodes in Neo4j
    console.log(`[FileWorker] Creating graph nodes...`);
    const result = await createDocumentWithChunks(client, {
      originalName,
      fileType,
      mimeType,
      fileHash,
      storagePath,
      size: fileSize,
      extractedText: parsed.text,
      chunks,
      quality,
    });

    // Progress: 100% - Complete
    await job.updateProgress(100);

    console.log(`[FileWorker] Complete! Document: ${result.documentId}, Chunks: ${result.chunksCreated}`);

    return {
      success: true,
      documentId: result.documentId,
      chunksCreated: result.chunksCreated,
      quality,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[FileWorker] Failed to process ${originalName}:`, message);

    return {
      success: false,
      error: message,
    };
  }
}
