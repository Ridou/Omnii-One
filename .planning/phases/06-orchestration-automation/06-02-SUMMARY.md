---
phase: 06-orchestration-automation
plan: 02
subsystem: api
tags: [supabase, idempotency, workflow, exactly-once, background-jobs]

# Dependency graph
requires:
  - phase: 04-google-ingestion
    provides: BullMQ job queue infrastructure, Supabase patterns
provides:
  - ExecutionTracker service for idempotent workflow execution
  - workflow_executions Supabase table
  - Exactly-once semantics for n8n workflow triggers
affects: [06-03, 06-04, 06-05, 06-06, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotency via user-provided keys"
    - "Status state machine: pending -> running -> completed/failed"
    - "Failed execution retry via record deletion"

key-files:
  created:
    - apps/omnii_mcp/src/services/workflows/execution-tracker.ts
    - apps/omnii_mcp/supabase/migrations/20260125_workflow_executions.sql
  modified:
    - apps/omnii_mcp/src/services/workflows/index.ts

key-decisions:
  - "TEXT primary key for idempotency key allows caller-controlled uniqueness"
  - "Failed executions deleted on retry to avoid unique constraint conflicts"
  - "Running executions reject duplicate requests rather than queue"
  - "Pending state for orphaned records allows recovery"

patterns-established:
  - "ExecutionTracker singleton: getExecutionTracker() for consistent access"
  - "executeIdempotent pattern: check existing -> handle state -> execute -> mark result"
  - "Service role Supabase client for backend operations bypassing RLS"

# Metrics
duration: 2min
completed: 2026-01-26
---

# Phase 06 Plan 02: Execution Tracker Summary

**Idempotent workflow execution tracking via ExecutionTracker service with Supabase persistence and exactly-once semantics**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-26T01:00:20Z
- **Completed:** 2026-01-26T01:02:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created workflow_executions Supabase migration with RLS policies and indexes
- Built ExecutionTracker service with idempotent execution pattern
- Implemented exactly-once semantics via status state machine
- Added query methods for recent executions and status filtering

## Task Commits

Each task was committed atomically:

1. **Task 1: Create workflow_executions Supabase migration** - `bfcebe8` (feat)
2. **Task 2: Create ExecutionTracker service** - `b1f0474` (feat)

## Files Created/Modified

- `apps/omnii_mcp/supabase/migrations/20260125_workflow_executions.sql` - Supabase table for execution tracking
- `apps/omnii_mcp/src/services/workflows/execution-tracker.ts` - ExecutionTracker service with idempotent execution
- `apps/omnii_mcp/src/services/workflows/index.ts` - Updated barrel export

## Decisions Made

- **TEXT primary key:** Allows caller-controlled idempotency keys (e.g., `send-email-${requestId}`) for flexible deduplication
- **Failed retry strategy:** Delete failed record and create fresh rather than update - cleaner state machine
- **Running rejection:** Duplicate requests during execution throw error rather than queue - prevents resource exhaustion
- **Orphaned pending recovery:** If record stuck in pending (e.g., server crash), next request marks it running and continues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Migration must be applied manually to Supabase:**

1. Copy `apps/omnii_mcp/supabase/migrations/20260125_workflow_executions.sql`
2. Apply via Supabase Dashboard SQL Editor or Supabase CLI:
   ```bash
   supabase db push
   ```
3. Verify table exists:
   ```sql
   SELECT * FROM workflow_executions LIMIT 1;
   ```

## Next Phase Readiness

- ExecutionTracker ready for n8n integration (Plan 06-03)
- Idempotency keys can be generated from workflow trigger context
- Query methods support MCP tool status responses

---
*Phase: 06-orchestration-automation*
*Completed: 2026-01-26*
