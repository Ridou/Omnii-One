---
phase: 01-foundation-infrastructure
plan: 03
subsystem: auth
tags: [supabase, jwt, elysia, auth, neo4j, multi-tenancy]

# Dependency graph
requires:
  - phase: 01-02
    provides: OMNII_* environment variable namespace
provides:
  - Supabase Auth client factories (createSupabaseClient, createSupabaseAdmin)
  - Elysia auth middleware for JWT validation
  - user_databases schema for per-user Neo4j connection tracking
  - Auth routes (/auth/health, /auth/me) in MCP app
affects: [database-provisioning, multi-tenancy, user-onboarding, mobile-auth]

# Tech tracking
tech-stack:
  added: [@supabase/supabase-js]
  patterns:
    - Supabase JWT validation in Elysia middleware
    - database-per-user isolation via tenantId
    - OMNII_SUPABASE_* environment variables for auth config

key-files:
  created:
    - packages/auth/src/supabase.ts
    - packages/auth/src/middleware.ts
    - apps/omnii_mcp/src/routes/auth.ts
  modified:
    - packages/auth/src/index.ts
    - packages/auth/package.json
    - packages/db/src/schema.ts
    - apps/omnii_mcp/src/routes/index.ts

key-decisions:
  - "Standardized on Supabase Auth across entire stack (removed better-auth)"
  - "Auth middleware extracts tenantId from JWT for database-per-user isolation"
  - "user_databases table tracks Neo4j Aura instance details per user"

patterns-established:
  - "Supabase client factories: createSupabaseClient (anon key) vs createSupabaseAdmin (service role)"
  - "Elysia middleware pattern: authMiddleware.derive() for JWT validation"
  - "tenantId = user.id pattern for database isolation"

# Metrics
duration: 3min
completed: 2026-01-25
---

# Phase 01 Plan 03: Standardize Supabase Auth Summary

**Supabase Auth with JWT validation middleware and user_databases schema for per-user Neo4j isolation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-25T04:12:52Z
- **Completed:** 2026-01-25T04:16:25Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Removed better-auth completely, standardized on Supabase Auth
- Created Elysia auth middleware for JWT validation with tenantId extraction
- Added user_databases schema for tracking per-user Neo4j Aura instances
- Wired auth routes into MCP app (/auth/health, /auth/me)

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace better-auth with Supabase client** - `bce61ad` (feat)
2. **Task 2: Create Elysia auth middleware and user_databases schema** - `5011719` (feat)

## Files Created/Modified
- `packages/auth/src/supabase.ts` - Supabase client factories (admin with service role, client with anon key)
- `packages/auth/src/middleware.ts` - Elysia middleware for Supabase JWT validation and user/tenantId extraction
- `packages/auth/src/index.ts` - Re-exports Supabase client and middleware
- `packages/auth/package.json` - Removed better-auth, added @supabase/supabase-js and elysia
- `packages/db/src/schema.ts` - Added UserDatabase table for per-user Neo4j connection tracking
- `apps/omnii_mcp/src/routes/auth.ts` - Auth routes with health check and protected /me endpoint
- `apps/omnii_mcp/src/routes/index.ts` - Wired auth routes into main API
- `pnpm-lock.yaml` - Updated dependencies

## Decisions Made

**1. Supabase Auth standardization**
- Removed better-auth entirely from packages/auth
- Standardized on Supabase Auth for consistency with mobile app
- Rationale: FOUND-03 requirement specifies Supabase, eliminates dual-auth confusion

**2. tenantId pattern for database isolation**
- Auth middleware extracts `tenantId = user.id` from JWT
- Used for database-per-user Neo4j lookups
- Rationale: Enables multi-tenancy with complete data isolation per user

**3. user_databases schema design**
- Tracks Neo4j URI, credentials, Aura instance ID per user
- Status field for provisioning workflow (pending/ready/failed)
- Rationale: Centralized tracking for database provisioning webhook integration

**4. AuthContext extends Record<string, unknown>**
- Fixed TypeScript error with Elysia's derive return type
- Rationale: Elysia middleware requires index signature compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added elysia dependency to packages/auth**
- **Found during:** Task 2 (middleware creation)
- **Issue:** packages/auth/package.json didn't include elysia dependency, causing import failures
- **Fix:** Added `"elysia": "catalog:"` to dependencies
- **Files modified:** packages/auth/package.json
- **Verification:** TypeScript compilation succeeds
- **Committed in:** 5011719 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed AuthContext TypeScript compatibility**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** AuthContext interface didn't satisfy Elysia's derive return type requirement
- **Fix:** Made AuthContext extend `Record<string, unknown>`
- **Files modified:** packages/auth/src/middleware.ts
- **Verification:** `pnpm exec tsc --noEmit` passes
- **Committed in:** 5011719 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for TypeScript compilation and runtime correctness. No scope creep.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration.** See plan frontmatter `user_setup` section for:
- Supabase environment variables (OMNII_SUPABASE_URL, OMNII_SUPABASE_ANON_KEY, OMNII_SUPABASE_SERVICE_ROLE_KEY)
- Google OAuth provider configuration in Supabase Dashboard
- Google Cloud Console OAuth credentials

Note: User setup handled by orchestrator, not part of automated execution.

## Next Phase Readiness

**Ready for:**
- Database provisioning webhooks (can use authMiddleware to validate user)
- Per-user Neo4j database creation (user_databases table ready)
- Mobile app authentication (Supabase Auth client available)

**Blockers/Concerns:**
None - auth foundation complete.

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-01-25*
