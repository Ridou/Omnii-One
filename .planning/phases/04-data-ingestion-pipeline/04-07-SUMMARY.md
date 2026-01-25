---
phase: 04-data-ingestion-pipeline
plan: 07
subsystem: ingestion
tags: [google-tasks, gmail, google-contacts, composio, bullmq, incremental-sync]

# Dependency graph
requires:
  - phase: 04-06
    provides: Background job scheduling and workers infrastructure
  - phase: 04-05
    provides: Calendar ingestion pattern to follow
provides:
  - Tasks ingestion with updatedMin incremental sync
  - Gmail ingestion with historyId-based sync
  - Contacts ingestion with syncToken sync
  - Manual sync endpoints for all 4 Google services
  - Workers handle all source types
affects: [phase-4-testing, mobile-sync, ai-context-retrieval]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "updatedMin timestamp for Google Tasks incremental sync"
    - "historyId for Gmail message change detection"
    - "syncToken for Google Contacts delta sync"
    - "Unified SyncResult interface for worker output"

key-files:
  created:
    - apps/omnii_mcp/src/ingestion/sources/google-tasks.ts
    - apps/omnii_mcp/src/ingestion/sources/google-gmail.ts
    - apps/omnii_mcp/src/ingestion/sources/google-contacts.ts
  modified:
    - apps/omnii_mcp/src/ingestion/sources/index.ts
    - apps/omnii_mcp/src/ingestion/jobs/workers.ts
    - apps/omnii_mcp/src/routes/ingestion/index.ts

key-decisions:
  - "Tasks stored as Entity nodes with entity_type='task' (consistent with Phase 3 decision)"
  - "Gmail emails stored as Entity nodes with entity_type='email'"
  - "30-day completed task retention (skip older completed tasks)"
  - "500 message limit for initial Gmail sync (prevents quota exhaustion)"
  - "404 error triggers full sync fallback for Gmail historyId expiration"
  - "410 error triggers full sync fallback for Contacts syncToken expiration"

patterns-established:
  - "Per-source incremental sync pattern: updatedMin (Tasks), historyId (Gmail), syncToken (Contacts)"
  - "Discriminated union type assertion for validation errors"
  - "Dynamic imports in workers to avoid circular dependencies"

# Metrics
duration: 5min
completed: 2026-01-25
---

# Phase 4 Plan 07: Tasks, Gmail, Contacts Ingestion Summary

**Three additional Google service ingestion services with source-appropriate incremental sync strategies**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-25T20:51:52Z
- **Completed:** 2026-01-25T20:57:03Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Tasks ingestion using updatedMin timestamp for incremental sync
- Gmail ingestion using historyId with 404/full-sync fallback
- Contacts ingestion using syncToken with 410/full-sync fallback
- Email sender/recipient extraction as Contact nodes
- Manual sync endpoints for all 4 Google services
- Workers updated to handle all source types with unified result interface

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Google Tasks ingestion service** - `2270d3d` (feat)
2. **Task 2: Create Gmail and Contacts ingestion services** - `55138c2` (feat)
3. **Task 3: Update sources index, workers, and routes** - `c8d75d6` (feat)

## Files Created/Modified

- `apps/omnii_mcp/src/ingestion/sources/google-tasks.ts` - Tasks ingestion with updatedMin sync
- `apps/omnii_mcp/src/ingestion/sources/google-gmail.ts` - Gmail ingestion with historyId sync
- `apps/omnii_mcp/src/ingestion/sources/google-contacts.ts` - Contacts ingestion with syncToken
- `apps/omnii_mcp/src/ingestion/sources/index.ts` - Barrel exports for all 4 services
- `apps/omnii_mcp/src/ingestion/jobs/workers.ts` - Switch cases for all sources
- `apps/omnii_mcp/src/routes/ingestion/index.ts` - Manual sync endpoints for tasks/gmail/contacts

## Decisions Made

1. **Tasks storage as Entity nodes** - Consistent with Phase 3 decision to store tasks as Entity nodes with entity_type='task' property for flexibility while maintaining label-based indexing
2. **Gmail emails as Entity nodes** - Same pattern as tasks, stored with entity_type='email' and gmail_message_id for deduplication
3. **30-day completed task retention** - Skip completed tasks older than 30 days to avoid graph bloat with stale data
4. **500 message limit for Gmail initial sync** - Prevents API quota exhaustion during first sync while capturing recent activity
5. **Source-specific incremental sync strategies** - Each Google service uses its native sync mechanism (updatedMin/historyId/syncToken) for efficiency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required. Services use existing Composio OAuth connections.

## Next Phase Readiness

- All 4 Google services (Calendar, Tasks, Gmail, Contacts) now have ingestion services
- Background job scheduling from 04-06 can process all source types
- Ready for Phase 4 Plan 08 (Testing) to validate end-to-end sync
- AI assistants can now query comprehensive personal context (events, tasks, emails, contacts)

---
*Phase: 04-data-ingestion-pipeline*
*Completed: 2026-01-25*
