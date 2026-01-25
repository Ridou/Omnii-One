---
phase: 04-data-ingestion-pipeline
plan: 02
subsystem: api
tags: [zod, validation, google-api, calendar, gmail, tasks, contacts]

# Dependency graph
requires:
  - phase: 02-mcp-infrastructure
    provides: Graph schema node types for data storage
provides:
  - Zod validation schemas for Google Calendar events
  - Zod validation schemas for Google Tasks
  - Zod validation schemas for Gmail messages
  - Zod validation schemas for Google Contacts
  - validateIngestionData helper for typed validation with errors
affects: [04-03, 04-04, 04-05, 04-06, 04-07, 04-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod schema validation at ingestion boundary"
    - "Quality gates with business rules (end > start, name or email)"
    - "validateIngestionData helper for uniform error handling"

key-files:
  created:
    - apps/omnii_mcp/src/ingestion/validators/schemas.ts
    - apps/omnii_mcp/src/ingestion/validators/index.ts
  modified: []

key-decisions:
  - "Two-level Gmail part nesting with z.any() for deeper levels - balances validation strictness with API flexibility"
  - "Business rule validation via Zod refine() - end time after start, contact identifiability"

patterns-established:
  - "Zod quality gates: validate structure + business rules before graph insertion"
  - "validateIngestionData returns discriminated union for typed error handling"

# Metrics
duration: 3min
completed: 2026-01-25
---

# Phase 04 Plan 02: Ingestion Validation Schemas Summary

**Zod validation schemas for Google Calendar, Tasks, Gmail, and Contacts with quality gate business rules**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-25T20:25:35Z
- **Completed:** 2026-01-25T20:28:25Z
- **Tasks:** 3
- **Files created:** 2

## Accomplishments
- CalendarEventSchema validates structure and enforces end > start business rule
- GoogleTaskSchema/GoogleTaskListSchema for task ingestion validation
- GmailMessageSchema validates snippet or payload content requirement
- GoogleContactSchema enforces identifiability (name or email required)
- validateIngestionData helper provides uniform typed validation with descriptive errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Calendar event validation schema** - `119b17d` (feat)
2. **Task 2: Add Tasks, Gmail, and Contacts schemas** - `28de1c5` (feat)
3. **Task 3: Create validators barrel export** - `5c47889` (feat)

## Files Created/Modified
- `apps/omnii_mcp/src/ingestion/validators/schemas.ts` - Zod schemas for all 4 Google service types with business rules
- `apps/omnii_mcp/src/ingestion/validators/index.ts` - Barrel export for validators module

## Decisions Made
- **Two-level Gmail part nesting:** Gmail messages can have deeply nested multipart structures. Used explicit z.object() for first two levels with z.any() for deeper nesting to balance validation strictness with API flexibility (recursive z.lazy() caused TypeScript issues).
- **Business rules via refine():** Used Zod's refine() method for cross-field validation (end time > start time, contact must have name or email) to enforce data quality at ingestion boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed recursive GmailPartSchema TypeScript error**
- **Found during:** Task 2 (Gmail schema implementation)
- **Issue:** z.lazy() with recursive ZodType annotation caused TypeScript type mismatch error
- **Fix:** Simplified to explicit two-level nesting with z.any() for deeper levels
- **Files modified:** apps/omnii_mcp/src/ingestion/validators/schemas.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 28de1c5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor implementation adjustment for TypeScript compatibility. No scope change.

## Issues Encountered
None - schemas validated correctly with sample data after TypeScript fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Validation schemas ready for use in ingestion pipelines (04-03 through 04-08)
- All schemas export from validators/index.ts for clean imports
- validateIngestionData helper ready for uniform error handling

---
*Phase: 04-data-ingestion-pipeline*
*Completed: 2026-01-25*
