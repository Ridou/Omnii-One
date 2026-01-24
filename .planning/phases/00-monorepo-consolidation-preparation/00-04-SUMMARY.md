---
phase: 00-monorepo-consolidation-preparation
plan: 04
subsystem: infra
tags: [turborepo, environment-variables, env, dotenv, monorepo, config]

# Dependency graph
requires:
  - phase: 00-monorepo-consolidation-preparation
    plan: 02
    provides: "Divergence analysis with environment variable audit"
provides:
  - "Environment variable reconciliation plan with namespace strategy"
  - "Turborepo configuration with environment awareness (globalEnv, task env)"
  - "Comprehensive .env.example template for all apps"
  - "OMNII_* namespace for shared infrastructure variables"
  - "MCP_* namespace for MCP-specific variables"
  - "Environment loading order documentation"
affects: [00-05-omnii-mcp-migration, 00-06-omnii-mobile-migration, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OMNII_* prefix for shared infrastructure (Supabase, Neo4j, OpenAI, Redis)"
    - "MCP_* prefix for MCP app-specific variables (BASE_URL, PORT, PUBLIC_URL)"
    - "EXPO_PUBLIC_* prefix preserved for React Native Metro bundler compatibility"
    - "N8N_* prefix for n8n agent integration (already namespaced)"
    - "Environment loading order: System env → Root .env → App .env → App .env.local"

key-files:
  created:
    - ".planning/phases/00-monorepo-consolidation-preparation/00-ENV-RECONCILIATION.md"
    - ".env.example"
  modified:
    - "turbo.json"

key-decisions:
  - "OMNII_* namespace for shared infrastructure - prevents conflicts with third-party libraries, makes project vars greppable"
  - "MCP_* namespace for MCP-specific vars - enables multiple MCP apps with different BASE_URL/PORT without collision"
  - "Keep EXPO_PUBLIC_* as-is - React Native Metro bundler hardcoded to look for this prefix, don't fight the framework"
  - "globalEnv includes CI and NODE_ENV - explicit cache keys for build-affecting variables"
  - "Wildcard support in task env - MCP_*, N8N_*, EXPO_PUBLIC_* catch all app-specific vars for cache invalidation"
  - "globalDependencies on .env files - invalidate cache when env templates change (structural changes)"

patterns-established:
  - "Environment variable namespace decision tree: shared infra → OMNII_*, app-specific → APP_*, framework → keep prefix, standard → no prefix"
  - "Root .env for shared defaults, apps/{app}/.env for app defaults, apps/{app}/.env.local for developer overrides (gitignored)"
  - "Turborepo cache invalidation on env changes via globalEnv (affects all) and task env (affects specific tasks)"

# Metrics
duration: 5min
completed: 2026-01-24
---

# Phase 0 Plan 04: Environment Variable Reconciliation Summary

**Environment variable reconciliation with OMNII_* namespace for shared infrastructure, Turborepo cache invalidation on env changes, and comprehensive .env.example documenting 60+ variables**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-24T21:54:08Z
- **Completed:** 2026-01-24T21:59:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Catalogued 60+ unique application variables across all three codebases (monorepo, omnii-mobile, omnii-mcp)
- Identified namespace collisions (BASE_URL, PUBLIC_URL, PORT) and defined resolution strategy
- Established OMNII_* prefix for shared infrastructure variables (Supabase, Neo4j, OpenAI, Redis, etc.)
- Configured Turborepo to invalidate cache when environment variables change (globalEnv, task env, globalDependencies)
- Created comprehensive .env.example with 184 lines documenting all variables, organized by category

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit all environment variables** - `74fdf63` (docs)
2. **Task 2: Update turbo.json with environment awareness** - `59d3502` (feat)

## Files Created/Modified

**Created:**
- `.planning/phases/00-monorepo-consolidation-preparation/00-ENV-RECONCILIATION.md` (735 lines) - Complete environment variable reconciliation plan with inventory tables, collision analysis, namespace strategy, migration mapping, loading order, Turborepo integration, and security best practices
- `.env.example` (184 lines) - Comprehensive environment variable template documenting all shared infrastructure, MCP-specific, mobile-specific, and testing variables

**Modified:**
- `turbo.json` - Added globalEnv with OMNII_* namespaced shared vars, task-level env arrays with wildcard support (MCP_*, N8N_*, EXPO_PUBLIC_*), globalDependencies for .env files, moved NODE_ENV/CI from globalPassThroughEnv to globalEnv for explicit cache keys

## Decisions Made

**Namespace Strategy:**
- **OMNII_* for shared infrastructure:** Used by multiple apps with same values (OMNII_SUPABASE_URL, OMNII_NEO4J_URI, OMNII_OPENAI_API_KEY). Prevents conflicts with third-party libraries, makes project vars greppable, future-proof pattern.
- **MCP_* for MCP-specific:** Variables that differ per MCP app (MCP_BASE_URL, MCP_PORT, MCP_PUBLIC_URL). Enables multiple MCP servers in monorepo without collision.
- **EXPO_PUBLIC_* kept as-is:** React Native Metro bundler hardcoded to look for this prefix - don't fight the framework. Already correct namespace for mobile.
- **N8N_* kept as-is:** Already namespaced correctly for n8n agent integration (10 variables).
- **Standard vars unprefixed:** NODE_ENV, CI, DEBUG are ecosystem standards expected by tooling (Jest, ESLint, Turborepo).

**Turborepo Cache Invalidation:**
- **globalEnv:** Variables that affect ALL tasks (CI, NODE_ENV, OMNII_SUPABASE_URL, OMNII_NEO4J_URI, etc.). Changes invalidate entire cache.
- **Task env:** Variables that only affect specific tasks (build task has OMNII_NEO4J_*, MCP_*, N8N_*, EXPO_PUBLIC_* wildcards). Changes invalidate only that task's cache.
- **globalDependencies:** .env files tracked so cache invalidates when env templates change (structural changes, not just value changes).

**Environment Loading Order:**
1. System environment (OS vars, CI/CD secrets) - highest precedence
2. Root .env (shared defaults)
3. App-level .env (app-specific defaults)
4. App-level .env.local (gitignored developer overrides) - local development precedence

**Security Separation:**
- Server-only secrets: Backend .env, never bundled (OMNII_SUPABASE_SERVICE_ROLE_KEY, OMNII_OPENAI_API_KEY)
- Client-safe public vars: EXPO_PUBLIC_*, bundled into app (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY)
- Critical rule: Never prefix server secrets with EXPO_PUBLIC_ - they'd be bundled into React Native app and exposed to users

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - environment variable extraction and reconciliation proceeded smoothly.

## User Setup Required

None - no external service configuration required. This plan is documentation and Turborepo configuration only.

**Developer action needed (future):**
After MCP/Mobile migration, developers will need to:
1. Copy `.env.example` to `.env`
2. Fill in actual values from 1Password/secrets manager
3. Optionally create `apps/{app}/.env.local` for local overrides (gitignored)

## Next Phase Readiness

**Ready for:**
- **00-05 (omnii-mcp migration):** ENV-RECONCILIATION.md provides migration mapping for all MCP environment variables. Task will grep standalone omnii-mcp for unique vars (ANTHROPIC_API_KEY, LANGSMITH_API_KEY, etc.), determine which are actively used, and migrate with OMNII_* or MCP_* prefix.
- **00-06 (omnii-mobile migration):** EXPO_PUBLIC_* variables already aligned - no namespace changes needed. ENV-RECONCILIATION.md confirms no collisions.
- **All future phases:** .env.example provides template for all required variables. Turborepo will invalidate cache when env vars change.

**Namespace migration (future work):**
After Phase 0 completion, a separate refactoring task will update codebase to use namespaced vars:
- Find/replace: `process.env.SUPABASE_URL` → `process.env.OMNII_SUPABASE_URL`
- Find/replace: `process.env.NEO4J_URI` → `process.env.OMNII_NEO4J_URI`
- Update all apps to use MCP_* prefix for app-specific vars
- Run full test suite to verify no breakage
- Commit: `refactor(env): namespace shared infrastructure vars with OMNII_ prefix`

**Blockers/Concerns:**
None. Environment variable reconciliation complete and ready for migration execution.

**Variable Evaluation Needed (Plan 00-05):**
Standalone omnii-mcp has 11 unique variables not in monorepo (ANTHROPIC_API_KEY, DEBUG_AUTH, GOOGLE_CALENDAR_INTEGRATION_ID, GOOGLE_CREDENTIALS_PATH, JWT_ISSUER, JWT_SECRET, LANGSMITH_API_KEY, MCP_SERVER_URL, OAUTH_ENCRYPTION_KEY, TWILIO_TEST_PHONE_NUMBER, UPSTASH_REDIS_REST_TOKEN/URL). During MCP migration, grep codebase for each to determine if actively used vs. deprecated code.

---
*Phase: 00-monorepo-consolidation-preparation*
*Completed: 2026-01-24*
