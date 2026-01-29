---
phase: 08-file-ingestion-pipeline
plan: 04
subsystem: database
tags: [neo4j, graph-db, embeddings, openai, vector-search, deduplication]

# Dependency graph
requires:
  - phase: 08-01
    provides: Schema definitions for Document and Chunk nodes
  - phase: 08-03
    provides: Semantic chunking and quality scoring infrastructure
  - phase: 03
    provides: Neo4j HTTP client and embeddings generation
provides:
  - Neo4j graph operations for Document and Chunk nodes
  - Deduplication via fileHash constraint
  - Embeddings generation integration for chunks
  - Review queue for low-confidence extractions
affects: [08-05-upload-endpoint, mcp-document-search, document-ingestion-workers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Hash-based document deduplication
    - Batch embedding generation for chunks
    - Sequential chunk linking via NEXT_CHUNK relationships

key-files:
  created:
    - apps/omnii_mcp/src/ingestion/sources/files/graph-operations.ts
  modified:
    - apps/omnii_mcp/src/graph/schema/constraints.ts

key-decisions:
  - "Use fileHash uniqueness constraint for deduplication"
  - "Generate embeddings for all chunks in single batch call"
  - "Create NEXT_CHUNK relationships for sequential chunk traversal"
  - "Store quality metrics (extractionConfidence, needsReview) on Document node"

patterns-established:
  - "Document creation with transactional chunk creation and embedding generation"
  - "Review queue pattern for low-confidence extractions (needsReview flag)"
  - "Chunk naming convention: 'Chunk N' where N is position + 1"

# Metrics
duration: 2min
completed: 2026-01-29
---

# Phase 8 Plan 04: Graph Operations for Documents Summary

**Neo4j CRUD operations for Documents and Chunks with batch embedding generation, hash-based deduplication, and sequential chunk linking**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-29T21:47:11Z
- **Completed:** 2026-01-29T21:48:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Document and Chunk uniqueness constraints added to schema
- Complete CRUD operations for document ingestion with chunk creation
- Batch embedding generation integrated for efficient vector creation
- Deduplication checking via fileHash constraint
- Review queue implementation for low-confidence extractions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Document constraints to schema** - `a1b72b9` (feat)
2. **Task 2: Create graph operations for Documents and Chunks** - `d78ce5b` (feat)

## Files Created/Modified
- `apps/omnii_mcp/src/graph/schema/constraints.ts` - Added Document (id, fileHash) and Chunk (id) uniqueness constraints
- `apps/omnii_mcp/src/ingestion/sources/files/graph-operations.ts` - Document/Chunk CRUD operations with embeddings

## Decisions Made

1. **Hash-based deduplication**: Use fileHash uniqueness constraint to prevent duplicate document ingestion at database level
2. **Batch embedding generation**: Generate embeddings for all chunks in single API call for efficiency
3. **Sequential chunk linking**: Create NEXT_CHUNK relationships between consecutive chunks for document traversal
4. **Quality tracking**: Store extractionConfidence and needsReview flags on Document node for review queue

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 8 Plan 05 (Upload Endpoint):
- Graph operations complete and tested via build verification
- Document deduplication ready via fileHash constraint
- Chunk creation with embeddings ready for file processing pipeline
- Review queue accessible via getDocumentsNeedingReview()

No blockers or concerns.

---
*Phase: 08-file-ingestion-pipeline*
*Completed: 2026-01-29*
