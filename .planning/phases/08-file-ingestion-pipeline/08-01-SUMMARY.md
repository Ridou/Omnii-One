---
phase: 08-file-ingestion-pipeline
plan: 01
subsystem: ingestion
tags: [unpdf, mammoth, markdown-it, file-type, langchain, neo4j, graph-schema]

# Dependency graph
requires:
  - phase: 04-google-integrations
    provides: Graph schema foundation and ingestion patterns
provides:
  - Document and Chunk node types in graph schema
  - File parsing libraries (PDF, Word, Markdown, plain text)
  - File ingestion type definitions for parsers and workers
  - Quality scoring and chunking configuration infrastructure
affects: [08-02-file-parsers, 08-03-file-worker, 08-04-mcp-upload, file-search, graphrag]

# Tech tracking
tech-stack:
  added: [unpdf 1.4.0, mammoth 1.8.0, markdown-it 14.1.0, file-type 19.6.0, @langchain/textsplitters, @langchain/core]
  patterns: [graph schema extension pattern, file type detection via magic numbers, chunking strategy by file type]

key-files:
  created:
    - apps/omnii_mcp/src/ingestion/sources/files/types.ts
  modified:
    - apps/omnii_mcp/src/graph/schema/nodes.ts
    - apps/omnii_mcp/package.json

key-decisions:
  - "Use unpdf over pdf-parse for serverless optimization"
  - "MIME detection via magic numbers (file-type) not file extensions for security"
  - "Semantic chunking with @langchain/textsplitters instead of naive splitting"
  - "Quality scoring infrastructure to flag low-confidence extractions for review"

patterns-established:
  - "Node type extension: add to NodeLabel enum, create interface extending BaseNodeProperties, update AnyNode union, add type guard"
  - "File type detection: MIME via magic numbers, code detection via extension after MIME check"
  - "Chunking strategy: file-type-specific configs with semantic separators"

# Metrics
duration: 2m 47s
completed: 2026-01-29
---

# Phase 8 Plan 01: File Ingestion Foundation Summary

**Graph schema extended with Document/Chunk nodes, file parsing libraries installed (unpdf, mammoth, markdown-it), and type-safe ingestion infrastructure ready for parser implementation**

## Performance

- **Duration:** 2m 47s
- **Started:** 2026-01-29T20:19:26Z
- **Completed:** 2026-01-29T20:22:13Z
- **Tasks:** 3/3
- **Files modified:** 3

## Accomplishments
- Installed production-ready file parsing libraries for PDF, Word, Markdown, and text files
- Extended graph schema with DocumentNode (file metadata, quality scoring) and ChunkNode (RAG segments)
- Created comprehensive type definitions for parsing, chunking, quality metrics, and worker job data

## Task Commits

Each task was committed atomically:

1. **Task 1: Install file parsing dependencies** - `e19e9e8` (chore)
2. **Task 2: Extend graph schema with Document and Chunk node types** - `7ae277c` (feat)
3. **Task 3: Create file ingestion type definitions** - `4a67387` (feat)

## Files Created/Modified
- `apps/omnii_mcp/package.json` - Added unpdf, mammoth, markdown-it, file-type, @langchain/textsplitters, @langchain/core
- `apps/omnii_mcp/src/graph/schema/nodes.ts` - Added Document and Chunk labels, DocumentNode/ChunkNode interfaces, type guards
- `apps/omnii_mcp/src/ingestion/sources/files/types.ts` - ParseResult, ChunkConfig, QualityMetrics, FileProcessingJobData, FileProcessingResult, FileUploadResponse interfaces

## Decisions Made

1. **unpdf over pdf-parse** - Serverless-optimized, better for Railway deployment
2. **file-type for MIME detection** - Uses magic numbers instead of extensions (security-critical against spoofed uploads)
3. **@langchain/textsplitters** - Semantic chunking with RecursiveCharacterTextSplitter beats naive string splitting for RAG quality
4. **Quality scoring infrastructure** - extractionConfidence + needsReview flag enables human review of low-confidence extractions (mitigates FILE-05 search quality concerns)
5. **File-type-specific chunk configs** - Code gets larger chunks (800 chars) with function/class separators, prose gets smaller (400-512 chars) with paragraph separators

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all dependencies resolved correctly, TypeScript compilation succeeded on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 08-02 (File Parsers):**
- DocumentNode and ChunkNode types defined and exported
- ParseResult interface ready for parser implementations
- File parsing libraries installed and import-verified
- Type definitions provide complete contracts for next phase

**Ready for 08-03 (File Processing Worker):**
- FileProcessingJobData interface ready for BullMQ job definition
- FileProcessingResult interface ready for worker return values
- ChunkConfig constants ready for chunking logic

**Ready for 08-04 (MCP Upload Tool):**
- FileUploadResponse interface ready for immediate upload responses
- File hash and deduplication types in place

**No blockers or concerns.**

---
*Phase: 08-file-ingestion-pipeline*
*Completed: 2026-01-29*
