---
phase: 08-file-ingestion-pipeline
plan: 02
subsystem: file-ingestion
tags: [file-type, unpdf, mammoth, markdown-it, magic-numbers, mime-detection]

# Dependency graph
requires:
  - phase: 08-01
    provides: File ingestion type definitions and schema
provides:
  - Magic number MIME detection for secure file validation
  - PDF text extraction with quality confidence scoring
  - DOCX text extraction with warning-based confidence
  - Text/markdown/code file parsing with UTF-8 validation
  - Parser factory routing files to appropriate parsers
affects: [08-03, 08-04]

# Tech tracking
tech-stack:
  added: [file-type, unpdf, mammoth, markdown-it]
  patterns: [Magic number validation, Confidence scoring heuristics, Parser factory pattern]

key-files:
  created:
    - apps/omnii_mcp/src/ingestion/sources/files/validators/file-validator.ts
    - apps/omnii_mcp/src/ingestion/sources/files/parsers/pdf-parser.ts
    - apps/omnii_mcp/src/ingestion/sources/files/parsers/docx-parser.ts
    - apps/omnii_mcp/src/ingestion/sources/files/parsers/text-parser.ts
    - apps/omnii_mcp/src/ingestion/sources/files/parsers/index.ts
  modified: []

key-decisions:
  - "Magic number detection over file extension checking prevents spoofing attacks"
  - "PDF confidence scoring uses chars/page ratio to detect scanned/image PDFs"
  - "DOCX confidence reduced by mammoth extraction warnings"
  - "Text files validated as UTF-8 with null byte and control character checks"

patterns-established:
  - "Parser factory pattern: parseFile() routes to type-specific parsers"
  - "Confidence scoring pattern: All parsers return 0-1 confidence with quality heuristics"
  - "Security-first validation: file-type library reads binary signatures, not extensions"

# Metrics
duration: 2min
completed: 2026-01-29
---

# Phase 8 Plan 02: File Parsers Summary

**Secure file validation with magic number MIME detection and confidence-scored text extraction for PDF, DOCX, text, and code files**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-29T20:24:30Z
- **Completed:** 2026-01-29T20:26:44Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- File validator using file-type library for magic number detection prevents file extension spoofing
- PDF parser with confidence scoring based on chars/page ratio, replacement characters, and whitespace
- Word document parser with confidence scoring based on mammoth extraction warnings
- Text/markdown/code parsers with UTF-8 encoding validation
- Parser factory routing files to appropriate parser by detected type

## Task Commits

Each task was committed atomically:

1. **Task 1: Create file validator with MIME detection** - `4808d76` (feat)
2. **Task 2: Create PDF and Word parsers** - `2b335bd` (feat)
3. **Task 3: Create text/markdown parsers and parser index** - `a0d249e` (feat)

## Files Created/Modified
- `apps/omnii_mcp/src/ingestion/sources/files/validators/file-validator.ts` - Magic number MIME detection, text content validation, SHA-256 hashing
- `apps/omnii_mcp/src/ingestion/sources/files/parsers/pdf-parser.ts` - PDF text extraction using unpdf with quality confidence scoring
- `apps/omnii_mcp/src/ingestion/sources/files/parsers/docx-parser.ts` - DOCX text extraction using mammoth with warning-based confidence
- `apps/omnii_mcp/src/ingestion/sources/files/parsers/text-parser.ts` - Text, markdown, and code file parsing with UTF-8 validation
- `apps/omnii_mcp/src/ingestion/sources/files/parsers/index.ts` - Parser factory routing to type-specific parsers

## Decisions Made
- **Magic number detection:** Use file-type library to detect MIME types from binary signatures rather than trusting file extensions. This prevents file spoofing attacks (e.g., malware.pdf.exe).
- **PDF confidence scoring:** Calculate confidence based on chars/page ratio (low ratio suggests scanned/image PDF needing OCR), replacement character count (encoding issues), and whitespace ratio (layout extraction problems).
- **DOCX confidence scoring:** Reduce confidence based on mammoth extraction warnings, as warnings indicate elements that couldn't be handled.
- **Text validation:** For files without binary signatures, validate as text by checking null byte ratio (<1%) and control character ratio (<5%) before accepting.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all parsers compiled successfully and follow the established patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

File validation and parsing foundation complete. Ready for:
- **08-03:** Chunking strategy implementation using @langchain/textsplitters
- **08-04:** Upload endpoint and background processing worker

**Note:** Confidence scoring provides quality signals for the needsReview flag in plan 08-04. Files with confidence < 0.8 should be flagged for human review.

---
*Phase: 08-file-ingestion-pipeline*
*Completed: 2026-01-29*
