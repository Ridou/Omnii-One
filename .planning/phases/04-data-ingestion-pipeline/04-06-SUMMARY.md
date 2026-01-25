---
phase: 04-data-ingestion-pipeline
plan: 06
subsystem: ingestion
tags: [bullmq, redis, cron, background-jobs, rate-limiting]

# Dependency graph
requires:
  - phase: 04-05
    provides: CalendarIngestionService for processing calendar sync
  - phase: 04-01
    provides: BullMQ queue factory and Redis connection
provides:
  - BullMQ sync job scheduler with cron-based scheduling
  - Rate-limited workers for processing sync jobs
  - Automatic jitter to prevent thundering herd
  - Graceful shutdown integration in app.ts
affects: [04-07, 04-08, phase-5]

# Tech tracking
tech-stack:
  added: []
  patterns: [cron-based job scheduling, fan-out pattern for user sync, rate limiting for API quotas]

key-files:
  created:
    - apps/omnii_mcp/src/ingestion/jobs/sync-scheduler.ts
    - apps/omnii_mcp/src/ingestion/jobs/workers.ts
    - apps/omnii_mcp/src/ingestion/jobs/index.ts
  modified:
    - apps/omnii_mcp/src/app.ts

key-decisions:
  - "15-minute default cron schedule: Balances freshness with API quota conservation"
  - "0-5 second jitter on all jobs: Prevents thundering herd when many users sync simultaneously"
  - "10 jobs/minute rate limit: Respects Google API quota while maximizing throughput"
  - "Fan-out pattern: Scheduled job enqueues per-user sync jobs with staggered delays"
  - "Optional worker startup: Workers only start when OMNII_REDIS_URL is set (non-blocking for development)"

patterns-established:
  - "Fan-out pattern: Scheduled job with no userId fans out to per-user jobs via enqueueAllUserSyncs"
  - "Graceful shutdown: Workers stop cleanly on SIGTERM via dynamic import in shutdown handler"
  - "Conditional startup: Background services check environment before initializing"

# Metrics
duration: 4min
completed: 2026-01-25
---

# Phase 4 Plan 6: Background Job Scheduling Summary

**BullMQ background job scheduling with 15-min cron, jitter, rate limiting, and graceful shutdown**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-25T20:45:53Z
- **Completed:** 2026-01-25T20:50:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Job scheduler with configurable cron pattern (default: every 15 minutes)
- Jitter (0-5 seconds) on all jobs prevents thundering herd
- Rate limiter (10 jobs/minute) respects Google API quota
- Workers process jobs with concurrency limit (default: 3)
- Optional worker startup when Redis available
- Graceful shutdown stops workers cleanly on SIGTERM

## Task Commits

Each task was committed atomically:

1. **Task 1: Create job scheduler for calendar sync** - `ab23dda` (feat)
2. **Task 2: Create BullMQ workers for processing sync jobs** - `50ffddb` (feat)
3. **Task 3: Create jobs barrel export and wire into app startup** - `2bdb84e` (feat)

## Files Created/Modified

- `apps/omnii_mcp/src/ingestion/jobs/sync-scheduler.ts` - Cron-based job scheduler with jitter and fan-out
- `apps/omnii_mcp/src/ingestion/jobs/workers.ts` - BullMQ workers with rate limiting and error handling
- `apps/omnii_mcp/src/ingestion/jobs/index.ts` - Barrel export for jobs module
- `apps/omnii_mcp/src/app.ts` - Optional worker startup and graceful shutdown

## Decisions Made

1. **15-minute default cron schedule** - Balances data freshness with API quota conservation
2. **0-5 second jitter** - Randomized delay prevents all users syncing at exactly the same time
3. **10 jobs/minute rate limit** - Google Calendar API has quota limits; this ensures compliance
4. **Fan-out pattern** - Scheduled job has no userId, fans out to per-user jobs with staggered delays
5. **Optional worker startup** - Checks `OMNII_REDIS_URL` before starting; app works without Redis

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript compilation errors in queue.ts (ioredis type compatibility) are pre-existing from Plan 04-01, not from this plan's code. Bun bundler verification confirms code is valid.

## User Setup Required

None - no new external service configuration required. Uses existing Redis connection from Plan 04-01.

## Next Phase Readiness

- Background sync infrastructure complete
- Ready for Plan 04-07 (Gmail/Tasks/Contacts sources) or Plan 04-08 (testing)
- Workers will automatically sync connected users every 15 minutes when Redis available

---
*Phase: 04-data-ingestion-pipeline*
*Completed: 2026-01-25*
