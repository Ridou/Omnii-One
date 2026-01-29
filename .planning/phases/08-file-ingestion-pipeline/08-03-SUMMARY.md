---
phase: 08-file-ingestion-pipeline
plan: 03
subsystem: file-ingestion
tags: [langchain, textsplitters, semantic-chunking, quality-scoring, confidence-thresholds]

# Dependency graph
requires:
  - phase: 08-02
    provides: File parsers with ParseResult and confidence scoring
  - phase: 08-01
    provides: Type definitions (ChunkConfig, QualityMetrics, CHUNK_CONFIGS)
provides:
  - Semantic text chunking with RecursiveCharacterTextSplitter
  - File-type-specific chunk configurations (400-800 chars, 10-20% overlap)
  - Multi-heuristic extraction quality scoring
  - Human review flagging for low-confidence extractions (<0.8)
affects: [08-04]

# Tech tracking
tech-stack:
  added: ['@langchain/textsplitters']
  patterns: [Semantic chunking, Multi-heuristic quality scoring, Confidence thresholds]

key-files:
  created:
    - apps/omnii_mcp/src/ingestion/sources/files/chunking/semantic-chunker.ts
    - apps/omnii_mcp/src/ingestion/sources/files/chunking/index.ts
    - apps/omnii_mcp/src/ingestion/sources/files/quality-scorer.ts
  modified: []

key-decisions:
  - "RecursiveCharacterTextSplitter for semantic coherence over naive string splitting"
  - "File-type-specific chunk configs: code 800 chars, prose 400-512 chars, 10-20% overlap"
  - "Quality scoring combines text density, encoding checks, parser warnings, length, whitespace"
  - "Review threshold at 0.8 (80% confidence) balances false positives vs. silent failures"
  - "Filter out noise chunks under 20 characters"

patterns-established:
  - "Semantic chunking pattern: Splits on paragraph -> sentence -> word boundaries"
  - "Quality scoring pattern: Multiple independent heuristics with confidence multiplication"
  - "Human-in-the-loop pattern: needsReview flag for quality control queue"

# Metrics
duration: 2min
completed: 2026-01-29
---

# Phase 8 Plan 03: Semantic Chunking and Quality Scoring Summary

**LangChain-based semantic chunking with multi-heuristic quality scoring and human review flagging for low-confidence extractions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-29T20:29:52Z
- **Completed:** 2026-01-29T20:31:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Semantic chunking using LangChain's RecursiveCharacterTextSplitter preserves semantic boundaries
- File-type-specific chunk configurations optimized for RAG retrieval (400-800 chars, 10-20% overlap)
- Multi-heuristic quality scoring combines text density, encoding issues, parser warnings, text length, and whitespace ratio
- Human review flagging for extractions with confidence below 0.8 (80% threshold)
- Noise filtering removes chunks under 20 characters
- Helper functions for custom chunking and chunk count estimation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create semantic chunking module** - `f6ad1e9` (feat)
2. **Task 2: Create extraction quality scorer** - `f88ac3b` (feat)

## Files Created/Modified
- `apps/omnii_mcp/src/ingestion/sources/files/chunking/semantic-chunker.ts` - RecursiveCharacterTextSplitter-based chunking with file-type-specific configs
- `apps/omnii_mcp/src/ingestion/sources/files/chunking/index.ts` - Chunking module exports
- `apps/omnii_mcp/src/ingestion/sources/files/quality-scorer.ts` - Multi-heuristic extraction quality scoring with REVIEW_THRESHOLD=0.8

## Decisions Made
- **Semantic chunking over naive splitting:** RecursiveCharacterTextSplitter tries to split on paragraph breaks (double newlines) first, then sentences (periods + space), then words, preserving semantic coherence. This is critical for RAG retrieval accuracy.
- **File-type-specific chunk sizes:** Code files get larger chunks (800 chars) to preserve function/class context. Prose documents use smaller chunks (400-512 chars) for more granular retrieval. Overlap is 10-20% to prevent context loss at chunk boundaries.
- **Multi-heuristic quality scoring:** Combines 5 independent signals: (1) text density vs. file size, (2) encoding issues (replacement characters), (3) parser warnings, (4) very short text, (5) excessive whitespace. Each factor multiplies confidence, so multiple issues compound.
- **Review threshold at 0.8:** Balances false positives (too many reviews) vs. silent failures (bad extractions slip through). Research shows parsers achieve 50-70% accuracy, so human review is essential for quality control.
- **Noise filtering:** Chunks under 20 characters are likely formatting artifacts or page numbers, filtered out to reduce retrieval noise.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all modules compiled successfully and follow the established patterns.

## User Setup Required

None - chunking and quality scoring work with existing type definitions.

## Next Phase Readiness

Semantic chunking and quality scoring complete. Ready for:
- **08-04:** Upload endpoint and background processing worker to orchestrate validation → parsing → chunking → graph insertion pipeline

**Integration points for 08-04:**
- Import `chunkDocument(text, fileType)` to split parsed text
- Import `scoreExtraction(parsed, fileSize, fileType)` to get quality metrics
- Check `metrics.needsReview` to flag documents for human review queue
- Use `formatQualityAssessment(metrics)` for user-facing quality messages

**Quality control workflow:**
1. Parse file → get ParseResult with initial confidence
2. Score extraction → get QualityMetrics with adjusted confidence and warnings
3. If `needsReview=true`, add to review queue with warnings
4. Otherwise, proceed to chunking and graph insertion

---
*Phase: 08-file-ingestion-pipeline*
*Completed: 2026-01-29*
