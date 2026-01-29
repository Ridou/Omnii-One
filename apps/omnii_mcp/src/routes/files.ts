/**
 * File Upload Routes
 *
 * Handles multipart file uploads with:
 * 1. Magic number validation (security)
 * 2. Supabase Storage upload
 * 3. BullMQ job queuing for async processing
 *
 * Pattern: Upload returns immediately, processing happens in background.
 */

import { Elysia, t } from 'elysia';
import { createClient } from '@supabase/supabase-js';
import { createIngestionQueue } from '../ingestion/jobs/queue';
import { validateFile, calculateFileHash, MAX_FILE_SIZE } from '../ingestion/sources/files/validators/file-validator';
import { checkDuplicateDocument } from '../ingestion/sources/files/graph-operations';
import { createClientForUser } from '../services/neo4j/http-client';
import type { FileProcessingJobData, FileUploadResponse } from '../ingestion/sources/files/types';
import { env } from '../config/env';

// Initialize Supabase client for storage
const supabase = createClient(
  env.OMNII_SUPABASE_URL,
  env.OMNII_SUPABASE_SERVICE_ROLE_KEY!
);

// Storage bucket name
const STORAGE_BUCKET = 'documents';

// Create queue for file processing jobs
const fileQueue = createIngestionQueue('file-processing');

/**
 * File upload routes
 */
export const fileRoutes = new Elysia({ prefix: '/files' })
  /**
   * Upload a file for processing
   *
   * POST /api/files/upload
   * Body: multipart/form-data with 'file' field
   *
   * Returns immediately with processing status.
   * File is processed asynchronously via BullMQ worker.
   */
  .post(
    '/upload',
    async ({ body, set }) => {
      const { file, userId } = body;

      // Read file content
      const buffer = await file.arrayBuffer();
      const fileSize = buffer.byteLength;

      // Step 1: Validate file type using magic numbers (security-critical)
      const validation = await validateFile(buffer, file.name, fileSize);

      if (!validation.valid) {
        set.status = 400;
        return {
          status: 'error',
          fileHash: '',
          message: validation.error || 'File validation failed',
        } satisfies FileUploadResponse;
      }

      // Step 2: Calculate file hash for deduplication
      const fileHash = await calculateFileHash(buffer);

      // Step 3: Check for duplicate (same content already processed)
      try {
        const client = await createClientForUser(userId);
        if (client) {
          const existingDocId = await checkDuplicateDocument(client, fileHash);
          if (existingDocId) {
            return {
              status: 'duplicate',
              fileHash,
              message: 'File already uploaded and processed',
              existingDocumentId: existingDocId,
            } satisfies FileUploadResponse;
          }
        }
      } catch (error) {
        // If Neo4j check fails, continue with upload (dedup is optimization, not requirement)
        console.warn('Deduplication check failed:', error);
      }

      // Step 4: Upload to Supabase Storage
      const storagePath = `${userId}/${fileHash}.${validation.fileType}`;

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: validation.mimeType,
          upsert: false, // Prevent overwrite
        });

      if (storageError) {
        // If file already exists in storage, that's OK (same hash)
        if (!storageError.message?.includes('already exists')) {
          set.status = 500;
          return {
            status: 'error',
            fileHash,
            message: `Storage upload failed: ${storageError.message}`,
          } satisfies FileUploadResponse;
        }
      }

      // Step 5: Queue processing job
      const jobData: FileProcessingJobData = {
        userId,
        storagePath,
        fileType: validation.fileType!,
        originalName: file.name,
        fileHash,
        fileSize,
        mimeType: validation.mimeType!,
      };

      await fileQueue.add('process-file', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        jobId: `file-${fileHash}`, // Deduplicate jobs by hash
      });

      // Step 6: Return immediately
      return {
        status: 'processing',
        fileHash,
        message: 'File uploaded successfully. Processing in background.',
      } satisfies FileUploadResponse;
    },
    {
      body: t.Object({
        file: t.File({
          maxSize: MAX_FILE_SIZE,
        }),
        userId: t.String({ minLength: 1 }),
      }),
    }
  )

  /**
   * Get file processing status
   *
   * GET /api/files/status/:fileHash
   *
   * Returns processing status and document details if complete.
   */
  .get(
    '/status/:fileHash',
    async ({ params, query, set }) => {
      const { fileHash } = params;
      const { userId } = query;

      if (!userId) {
        set.status = 400;
        return { error: 'userId query parameter required' };
      }

      try {
        // Check if document exists in Neo4j (processing complete)
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const existingDocId = await checkDuplicateDocument(client, fileHash);

        if (existingDocId) {
          // Document exists - processing complete
          const { getDocumentById } = await import('../ingestion/sources/files/graph-operations');
          const document = await getDocumentById(client, existingDocId);

          return {
            status: 'complete',
            fileHash,
            documentId: existingDocId,
            document,
          };
        }

        // Check job status in queue
        const job = await fileQueue.getJob(`file-${fileHash}`);

        if (!job) {
          return {
            status: 'not_found',
            fileHash,
            message: 'No file with this hash found in processing queue',
          };
        }

        const state = await job.getState();

        return {
          status: state,
          fileHash,
          progress: job.progress,
          attemptsMade: job.attemptsMade,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to get status',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        fileHash: t.String({ minLength: 64, maxLength: 64 }), // SHA-256 is 64 hex chars
      }),
      query: t.Object({
        userId: t.String({ minLength: 1 }),
      }),
    }
  )

  /**
   * List documents needing review
   *
   * GET /api/files/needs-review
   *
   * Returns documents with low extraction confidence.
   */
  .get(
    '/needs-review',
    async ({ query, set }) => {
      const { userId, limit } = query;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const { getDocumentsNeedingReview } = await import('../ingestion/sources/files/graph-operations');
        const documents = await getDocumentsNeedingReview(client, limit || 20);

        return {
          count: documents.length,
          documents,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to get documents',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 1 }),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )

  /**
   * Mark document as reviewed
   *
   * PATCH /api/files/:documentId/review
   *
   * Updates document review status after manual verification.
   */
  .patch(
    '/:documentId/review',
    async ({ params, body, set }) => {
      const { documentId } = params;
      const { userId, approved, newConfidence } = body;

      try {
        const client = await createClientForUser(userId);
        if (!client) {
          set.status = 400;
          return { error: 'User database not provisioned' };
        }

        const { updateDocumentReviewStatus } = await import('../ingestion/sources/files/graph-operations');

        await updateDocumentReviewStatus(client, documentId, {
          needsReview: !approved,
          extractionConfidence: newConfidence,
        });

        return {
          success: true,
          message: approved
            ? 'Document marked as reviewed and approved'
            : 'Document marked as still needing review',
        };
      } catch (error) {
        set.status = 500;
        return {
          error: 'Failed to update review status',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        documentId: t.String({ minLength: 1 }),
      }),
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        approved: t.Boolean(),
        newConfidence: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
      }),
    }
  );
