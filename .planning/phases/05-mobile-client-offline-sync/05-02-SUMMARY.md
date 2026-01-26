---
phase: 05-mobile-client-offline-sync
plan: 02
subsystem: mobile
tags: [powersync, sqlite, react-native, expo, offline-sync]

# Dependency graph
requires:
  - phase: 05-01
    provides: PowerSync Supabase tables migration
provides:
  - PowerSync packages installed in mobile app
  - Schema definitions matching backend sync tables
  - Database factory for PowerSync initialization
  - Metro config for ESM package exports
affects: [05-03, 05-04, 05-05]

# Tech tracking
tech-stack:
  added:
    - "@powersync/react-native@^1.28.1"
    - "@powersync/op-sqlite@^0.7.18"
    - "@powersync/react@^1.8.2"
    - "@op-engineering/op-sqlite@^14.1.4"
  patterns:
    - Singleton database factory pattern
    - Schema mirroring (mobile SQLite matches Supabase PostgreSQL)
    - Type-safe query result interfaces

key-files:
  created:
    - "apps/omnii-mobile/src/lib/powersync/schema.ts"
    - "apps/omnii-mobile/src/lib/powersync/index.ts"
  modified:
    - "apps/omnii-mobile/package.json"
    - "apps/omnii-mobile/metro.config.js"
    - "apps/omnii-mobile/.gitignore"

key-decisions:
  - "@op-engineering/op-sqlite pinned to ^14 for @powersync/op-sqlite peer compatibility"
  - "Column types use PowerSync column helper (column.text) instead of ColumnType enum"
  - "Native directories (ios/, android/) gitignored - regenerated via expo prebuild"

patterns-established:
  - "getPowerSync(): Singleton factory for database instance"
  - "resetPowerSync(): Clean reset for logout/testing"
  - "Schema types exported for type-safe queries (Database, SyncEntity, etc.)"
  - "JSON helper functions for parsing JSONB-as-TEXT fields"

# Metrics
duration: 7min
completed: 2026-01-26
---

# Phase 5 Plan 02: PowerSync Installation & Schema Summary

**PowerSync SDK installed with OP-SQLite backend, schema definitions matching Supabase sync tables, and singleton database factory ready for initialization**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-25T23:58:54Z
- **Completed:** 2026-01-26T00:05:12Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- Installed PowerSync packages with compatible @op-engineering/op-sqlite version
- Created schema matching all 3 backend sync tables (sync_entities, sync_events, sync_relationships)
- Built singleton database factory with reset and status check utilities
- Configured Metro bundler for ESM package exports (required by PowerSync)
- Verified native modules are correctly linked via CocoaPods and Android autolinking

## Task Commits

Each task was committed atomically:

1. **Task 1: Install PowerSync packages** - `a336e9f` (feat)
2. **Task 2: Create PowerSync schema matching backend tables** - `dc7bc69` (feat)
3. **Task 3: Create PowerSync database factory** - `e401e30` (feat)
4. **Task 4: Verify development builds on iOS and Android** - `383d1b3` (chore)

## Files Created/Modified

- `apps/omnii-mobile/package.json` - Added PowerSync dependencies
- `apps/omnii-mobile/src/lib/powersync/schema.ts` - Table definitions, types, helpers
- `apps/omnii-mobile/src/lib/powersync/index.ts` - Database factory, hook re-exports
- `apps/omnii-mobile/metro.config.js` - Added unstable_enablePackageExports
- `apps/omnii-mobile/.gitignore` - Added ios/ and android/ directories

## Decisions Made

1. **@op-engineering/op-sqlite@^14 for peer compatibility:** @powersync/op-sqlite requires ^13 or ^14, but Expo installed v15. Pinned to ^14 to satisfy peer dependency.

2. **Schema uses column helper pattern:** Used `column.text` from @powersync/react-native instead of `new Column({ name, type: ColumnType.TEXT })` - cleaner API.

3. **Native directories gitignored:** ios/ and android/ are generated on demand via `npx expo prebuild` - no need to commit them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed peer dependency version mismatch**
- **Found during:** Task 1 (Install PowerSync packages)
- **Issue:** @powersync/op-sqlite peer dependency requires @op-engineering/op-sqlite ^13 or ^14, but Expo installed v15.2.5
- **Fix:** Re-ran expo install with explicit version: `npx expo install @op-engineering/op-sqlite@^14`
- **Files modified:** apps/omnii-mobile/package.json, pnpm-lock.yaml
- **Verification:** No peer dependency warnings in pnpm install
- **Committed in:** a336e9f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor version adjustment, no scope creep

## Issues Encountered

1. **iOS/Android build blocked by path spaces:** The project path "/Users/santino/Projects/Omnii One" contains a space which breaks React Native build scripts. This is a pre-existing environmental issue unrelated to PowerSync. Native modules are correctly configured:
   - CocoaPods: op-sqlite (14.1.4), powersync-op-sqlite (0.7.18), powersync-sqlite-core (0.4.10)
   - Android: autolinking configured via expo-modules-autolinking

## User Setup Required

None - no external service configuration required for this plan. PowerSync Cloud URL configuration will be handled in Plan 05-03.

## Next Phase Readiness

- PowerSync database factory ready for connector implementation (Plan 05-03)
- Schema matches backend tables exactly
- Metro bundler configured for ESM modules
- React hooks exported for component integration

**Blocker for future:** Project path with spaces prevents native builds. Recommend renaming project directory to "OmniiOne" or similar before running iOS/Android builds.

---
*Phase: 05-mobile-client-offline-sync*
*Completed: 2026-01-26*
