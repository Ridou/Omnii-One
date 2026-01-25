---
phase: 04-data-ingestion-pipeline
plan: 01
subsystem: infra
tags: [bullmq, redis, composio, ioredis, background-jobs, oauth]

# Dependency graph
requires:
  - phase: 03-graphrag-advanced-mcp
    provides: MCP server infrastructure and tool system
provides:
  - Composio client singleton for Google OAuth abstraction
  - BullMQ queue factory for background job processing
  - Redis connection management for job queues
  - Barrel export aggregating ingestion infrastructure
affects: [04-02, 04-03, 04-04, data-ingestion, sync-workers]

# Tech tracking
tech-stack:
  added: [bullmq, exponential-backoff]
  patterns: [singleton-pattern, lazy-initialization, queue-factory]

key-files:
  created:
    - apps/omnii_mcp/src/ingestion/composio-client.ts
    - apps/omnii_mcp/src/ingestion/jobs/queue.ts
    - apps/omnii_mcp/src/ingestion/index.ts
  modified:
    - apps/omnii_mcp/package.json

key-decisions:
  - "BullMQ default retry: 3 attempts with exponential backoff (1s, 2s, 4s)"
  - "Redis connection lazy initialization for on-demand usage"
  - "Job retention: 100 completed, 500 failed for debugging"

patterns-established:
  - "Singleton pattern: Lazy initialization with null check for shared instances"
  - "Queue factory pattern: createIngestionQueue(name) returns configured Queue"
  - "Barrel export pattern: index.ts re-exports all public API"

# Metrics
duration: 3min
completed: 2026-01-25
---

# Phase 4 Plan 01: Ingestion Infrastructure Summary

**BullMQ job queue with exponential backoff and Composio OAuth client singleton for background data ingestion**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-25T20:25:27Z
- **Completed:** 2026-01-25T20:27:59Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Installed bullmq and exponential-backoff dependencies
- Created Composio client singleton with lazy initialization and COMPOSIO_API_KEY env validation
- Created BullMQ queue factory with Redis connection and sensible defaults (3 retries, exponential backoff)
- Created barrel export aggregating all ingestion infrastructure

## Task Commits

Each task was committed atomically:

1. **Task 1: Install BullMQ and exponential-backoff dependencies** - `671f5e3` (chore)
2. **Task 2: Create Composio client singleton** - `4d685aa` (feat)
3. **Task 3: Create BullMQ queue factory with Redis connection** - `4053b68` (feat)

## Files Created/Modified
- `apps/omnii_mcp/package.json` - Added bullmq ^5.67.1 and exponential-backoff ^3.1.3
- `apps/omnii_mcp/src/ingestion/composio-client.ts` - Singleton Composio client with getComposioClient() and ComposioClient type
- `apps/omnii_mcp/src/ingestion/jobs/queue.ts` - BullMQ queue factory with getRedisConnection() and createIngestionQueue()
- `apps/omnii_mcp/src/ingestion/index.ts` - Barrel export for ingestion module

## Decisions Made
- **BullMQ default job options:** 3 retry attempts with exponential backoff (1s, 2s, 4s) based on research patterns
- **Job retention policy:** Keep last 100 completed jobs for inspection, 500 failed jobs for debugging
- **Redis connection sharing:** Single shared Redis instance via getRedisConnection() with maxRetriesPerRequest: null for BullMQ compatibility
- **Lazy initialization:** Both Composio client and Redis connection created on first use, not at module load

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed as specified.

## User Setup Required

**External services require manual configuration:**
- **COMPOSIO_API_KEY:** Required for Google OAuth abstraction (Composio Dashboard -> Settings -> API Keys)
- **OMNII_REDIS_URL:** Optional, defaults to redis://localhost:6379 for local development

## Next Phase Readiness
- Ingestion infrastructure ready for Phase 4 Plan 02 (calendar sync workers)
- Queue factory can create named queues for calendar-sync, contacts-import, etc.
- Composio client singleton available for OAuth-protected Google API calls
- No blockers identified

---
*Phase: 04-data-ingestion-pipeline*
*Completed: 2026-01-25*
