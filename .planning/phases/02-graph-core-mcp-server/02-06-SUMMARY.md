---
phase: 02-graph-core-mcp-server
plan: 06
subsystem: mcp-server
tags: [schema-setup, provisioning, constraints, vector-index, neo4j]
dependency-graph:
  requires: [02-01, 02-02, 02-05]
  provides: [auto-schema-setup, schema-cli-script, schema-health-check]
  affects: [02-07, 03-graphrag]
tech-stack:
  added: []
  patterns: [background-job-fire-and-forget, admin-endpoint-protection]
key-files:
  created:
    - apps/omnii_mcp/scripts/setup-user-schema.ts
  modified:
    - apps/omnii_mcp/src/services/neo4j/provisioning.ts
    - apps/omnii_mcp/src/routes/webhooks/auth.ts
    - apps/omnii_mcp/src/mcp/transport.ts
    - apps/omnii_mcp/package.json
    - apps/omnii_mcp/tsconfig.json
decisions:
  - id: DEC-0206-01
    decision: Schema setup runs as fire-and-forget background job
    rationale: Don't block or fail provisioning on schema setup issues
  - id: DEC-0206-02
    decision: Admin endpoint for manual schema setup with ADMIN_KEY auth
    rationale: Allows operators to re-run schema setup if automatic fails
metrics:
  duration: 4min
  completed: 2026-01-25
---

# Phase 2 Plan 06: Schema Setup Integration Summary

**One-liner:** Wired automatic schema setup (constraints + vector index) into user database provisioning flow with CLI script and health check debugging.

## What Was Built

### Task 1: Schema Setup Module
- Created `/apps/omnii_mcp/scripts/setup-user-schema.ts`:
  - `setupUserSchema(userId)` function for programmatic use
  - CLI runner: `bun scripts/setup-user-schema.ts <userId>`
  - Creates all constraints (uniqueness + existence)
  - Creates vector index for Entity embeddings
  - Returns detailed result with success/error tracking
  - Uses IF NOT EXISTS - safe to run multiple times
- Added `setup-schema` script to package.json
- Added scripts directory to tsconfig.json includes

### Task 2: Provisioning Integration
- Updated `/apps/omnii_mcp/src/services/neo4j/provisioning.ts`:
  - Triggers `setupUserSchema()` when database status becomes 'ready'
  - Runs in background (fire-and-forget) - doesn't block provisioning
  - Errors logged but never fail the provisioning flow
- Updated `/apps/omnii_mcp/src/routes/webhooks/auth.ts`:
  - Added `POST /webhooks/auth/setup-schema/:userId` admin endpoint
  - Protected by `x-admin-key` header matching `ADMIN_KEY` env var
  - Returns detailed schema setup result for debugging

### Task 3: Health Check Enhancement
- Updated `/apps/omnii_mcp/src/mcp/transport.ts`:
  - `GET /mcp/health?userId=<uuid>` now returns schema status
  - Reports constraint count and vector index details
  - Useful for debugging user database setup issues

## Technical Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| DEC-0206-01 | Fire-and-forget schema setup | Provisioning must succeed even if schema setup has issues |
| DEC-0206-02 | ADMIN_KEY protected manual endpoint | Allows operators to retry schema setup without full re-provisioning |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Description |
|------|-------------|
| b1081ab | feat(02-06): add schema setup module and CLI script |
| 6938182 | feat(02-06): wire schema setup into provisioning flow |
| e6bc086 | feat(02-06): add schema status to MCP health check |

## Verification Results

```
Schema setup module loaded: function
setupUserSchema imported in auth.ts: lines 3, 74
setupUserSchema imported in provisioning.ts: lines 3, 135
checkConstraints/checkVectorIndex in transport.ts: lines 15-16, 176-177
```

## Success Criteria Met

- [x] setupUserSchema function works
- [x] Auth webhook triggers schema setup on ready
- [x] Errors logged but don't fail provisioning
- [x] Manual setup endpoint exists (`/webhooks/auth/setup-schema/:userId`)
- [x] Health check can report schema status

## User Database Lifecycle

With this plan complete, the full user database lifecycle is:

1. **Signup** - Supabase auth.users INSERT webhook fires
2. **Provision** - Neo4j Aura API creates free-tier instance
3. **Poll** - Background polling waits for 'running' status
4. **Ready** - Status updated to 'ready' in Supabase
5. **Schema** - setupUserSchema creates constraints + vector index
6. **Query** - MCP tools can now use database for graph operations

## Phase 2 Progress

With this plan complete, Phase 2 now has 6/7 plans done:
- [x] 02-01: Graph Schema Design
- [x] 02-02: Embedding Service
- [x] 02-03: MCP Server Core
- [x] 02-04: MCP Tools for Graph Queries
- [x] 02-05: Auth, Rate Limiting & Route Integration
- [x] 02-06: Schema Setup Integration
- [ ] 02-07: Testing & Validation (Wave 6)

## Next Phase Readiness

**For 02-07 (Testing & Validation):**
- Full MCP server is now functional end-to-end
- Schema is automatically applied to new user databases
- Ready for comprehensive integration testing
