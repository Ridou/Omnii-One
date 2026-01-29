---
phase: 08-file-ingestion-pipeline
plan: 05
subsystem: api
tags: [elysia, supabase-storage, bullmq, multipart-upload, file-validation]

# Dependency graph
requires:
  - phase: 08-03
    provides: File validators with magic number detection
  - phase: 08-04
    provides: Graph operations for document management
  - phase: 04
    provides: BullMQ job queue infrastructure
provides:
  - File upload REST API with multipart form handling
  - Supabase Storage integration for file persistence
  - Async processing job queuing for uploaded files
  - Status endpoints for tracking file processing
  - Review endpoints for human-in-the-loop quality control
affects: [08-06-file-processing-worker, 09-notes-capture, file-ingestion-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Multipart file upload with Elysia t.File validation
    - Upload-then-queue pattern for async processing
    - Deduplication via file hash before storage
    - Job-based status tracking with BullMQ

key-files:
  created:
    - apps/omnii_mcp/src/routes/files.ts
  modified:
    - apps/omnii_mcp/src/routes/index.ts

key-decisions:
  - "Upload endpoint returns immediately after queueing job (async pattern)"
  - "Supabase Storage used for file persistence with user-scoped paths"
  - "File hash used as both deduplication key and job ID"
  - "Review workflow supports manual approval after low-confidence extraction"

patterns-established:
  - "File upload pattern: validate → check duplicate → upload storage → queue job → return immediately"
  - "Status endpoint checks both Neo4j (complete) and BullMQ (in progress)"
  - "Review endpoints support human-in-the-loop quality control workflow"

# Metrics
duration: 1.6min
completed: 2026-01-29
---

# Phase 8 Plan 5: File Upload Routes Summary

**Elysia multipart file upload with magic number validation, Supabase Storage persistence, BullMQ async processing, and human-in-the-loop review workflow**

## Performance

- **Duration:** 1 min 36 sec
- **Started:** 2026-01-29T20:37:20Z
- **Completed:** 2026-01-29T20:38:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- File upload endpoint with multipart form handling and file size limits
- Security-critical validation using magic numbers before storage
- Supabase Storage integration with user-scoped paths
- Duplicate file detection via hash to avoid reprocessing
- Async processing via BullMQ job queue with exponential backoff
- Status endpoint tracking job progress and document completion
- Review endpoints for low-confidence document verification
- Complete human-in-the-loop workflow for quality control

## Task Commits

Each task was committed atomically:

1. **Task 1: Create file upload routes** - `c322d9d` (feat)
2. **Task 2: Register file routes in routes index** - `6d8a10d` (feat)

## Files Created/Modified
- `apps/omnii_mcp/src/routes/files.ts` - File upload REST API with validation, storage, queuing, and review endpoints
- `apps/omnii_mcp/src/routes/index.ts` - Added fileRoutes to API registration

## Decisions Made

**1. Corrected environment variable name**
- Plan specified `OMNII_SUPABASE_SERVICE_KEY` but env schema uses `OMNII_SUPABASE_SERVICE_ROLE_KEY`
- Used correct name from env.ts to match existing config

**2. Upload-then-queue async pattern**
- Upload endpoint returns immediately after queueing job
- Client polls status endpoint for completion
- Pattern enables fast response times and background processing

**3. Deduplication at multiple levels**
- Check Neo4j for existing document before upload
- Use hash-based job IDs to deduplicate queue jobs
- Storage upload with `upsert: false` to prevent overwrites

**4. Review workflow design**
- `needs-review` endpoint filters by `needsReview: true` flag
- Review PATCH endpoint updates both review status and confidence
- Supports human verification of low-confidence extractions

## Deviations from Plan

None - plan executed exactly as written, with one minor correction to environment variable name for consistency with existing env schema.

## Issues Encountered

None - all dependencies (file validators, graph operations, job queue) were complete and worked as expected.

## User Setup Required

**Supabase Storage bucket required.** Before file uploads work:

1. Create bucket in Supabase dashboard:
   - Bucket name: `documents`
   - Public: false (private files)
   - Allowed MIME types: PDF, DOCX, text/plain, text/markdown

2. Enable RLS policies for user-scoped access:
   ```sql
   -- Allow users to upload to their own folder
   CREATE POLICY "Users can upload to own folder"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

   -- Allow users to read from their own folder
   CREATE POLICY "Users can read own files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
   ```

3. Verification:
   ```bash
   # Upload a test file
   curl -X POST http://localhost:8000/api/files/upload \
     -F "file=@test.pdf" \
     -F "userId=test-user-id"

   # Should return: {"status":"processing","fileHash":"...","message":"..."}
   ```

## Next Phase Readiness

**Ready for:**
- Phase 08-06 (File Processing Worker) - implements the background job processing that these routes queue
- Notes ingestion - can reuse file upload infrastructure for note attachments
- UI file upload components - REST API ready for frontend integration

**Blockers:**
- Supabase Storage bucket must be provisioned before file uploads work
- File processing worker (08-06) needed to actually process queued jobs

**Architecture note:**
Upload pattern separates concerns cleanly:
1. Routes handle HTTP, validation, storage, queuing (this plan)
2. Worker handles parsing, chunking, embeddings, graph creation (next plan)

This separation enables:
- Fast upload responses (no processing blocking)
- Independent scaling (more workers = faster processing)
- Retry logic isolated to worker (upload never retries)

---
*Phase: 08-file-ingestion-pipeline*
*Completed: 2026-01-29*
