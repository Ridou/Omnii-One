---
phase: 02-graph-core-mcp-server
plan: 05
subsystem: mcp-server
tags: [auth, rate-limiting, json-rpc, supabase-jwt, elysia]
dependency-graph:
  requires: [02-03, 02-04]
  provides: [mcp-endpoint-complete, auth-middleware, rate-limiting]
  affects: [03-graphrag]
tech-stack:
  added: [elysia-rate-limit@4.0.0]
  patterns: [token-bucket-rate-limit, jwt-bearer-auth, json-rpc-2.0]
key-files:
  created:
    - apps/omnii_mcp/src/middleware/rate-limit.ts
  modified:
    - apps/omnii_mcp/src/mcp/transport.ts
    - apps/omnii_mcp/src/routes/index.ts
    - apps/omnii_mcp/package.json
    - pnpm-workspace.yaml
decisions:
  - id: DEC-0205-01
    decision: Token bucket rate limiting at 100 req/min per user
    rationale: Prevents abuse while allowing normal AI assistant usage patterns
  - id: DEC-0205-02
    decision: Per-user rate limiting via JWT sub claim extraction
    rationale: Ensures fair usage across users; fallback to IP for unauthenticated requests
  - id: DEC-0205-03
    decision: MCP routes mounted at /mcp (not under /api)
    rationale: MCP protocol clients expect /mcp endpoint directly, not /api/mcp
metrics:
  duration: 6min
  completed: 2026-01-25
---

# Phase 2 Plan 05: Auth, Rate Limiting & Route Integration Summary

**One-liner:** Wired MCP server with Supabase JWT auth, token bucket rate limiting (100 req/min), and integrated routes into main Elysia app.

## What Was Built

### Task 1: Rate Limiting Middleware
- Installed `elysia-rate-limit@4.0.0` package
- Added `elysia` to pnpm catalog for workspace consistency
- Created `/apps/omnii_mcp/src/middleware/rate-limit.ts`:
  - Token bucket algorithm: 100 requests per 60 seconds
  - Per-user limiting via JWT `sub` claim extraction
  - Fallback to IP-based limiting for unauthenticated requests
  - JSON-RPC formatted error response (-32000)

### Task 2: Complete MCP Transport
- Replaced placeholder transport with full implementation
- Added Supabase JWT authentication:
  - `authenticateRequest()` validates Bearer tokens via `supabase.auth.getUser()`
  - Returns `AuthContext` with `userId` and `tenantId` (same for database-per-user)
- Implemented JSON-RPC 2.0 protocol handling:
  - `initialize` - Returns server info and capabilities
  - `notifications/initialized` - Handled (204 No Content)
  - `tools/list` - Returns TOOL_DEFINITIONS array
  - `tools/call` - Routes to tool handlers with user-isolated Neo4j client
- Proper HTTP status codes:
  - 400 for invalid JSON-RPC requests
  - 401 for authentication failures
  - 204 for notifications
  - 429 for rate limit exceeded

### Task 3: Route Integration
- Imported `createMCPRoutes` in `routes/index.ts`
- Mounted at root `/mcp` (not under `/api` prefix)
- MCP clients can now access:
  - `GET /mcp/health` - Health check (no auth required)
  - `POST /mcp/` - JSON-RPC handler (auth required)

## Technical Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| DEC-0205-01 | 100 req/min rate limit | Balances protection against abuse with normal AI usage patterns |
| DEC-0205-02 | Per-user limiting via JWT sub | Fair usage per user; IP fallback for unauthenticated |
| DEC-0205-03 | /mcp not /api/mcp | MCP protocol specification expects /mcp endpoint |

## Deviations from Plan

### Catalog Update Required

**Found during:** Task 1
**Issue:** pnpm install failed with "No catalog entry 'elysia' was found" because elysia-rate-limit has elysia as peer dependency
**Fix:** Added `elysia: ^1.3.4` to pnpm-workspace.yaml catalog
**Files modified:** pnpm-workspace.yaml
**Commit:** 857793e

This was a [Rule 3 - Blocking] deviation - couldn't complete installation without catalog update.

## Commits

| Hash | Description |
|------|-------------|
| 857793e | feat(02-05): implement rate limiting middleware |
| 193de85 | feat(02-05): complete MCP transport with auth and tool routing |
| 9c197d4 | feat(02-05): integrate MCP routes into main Elysia app |

## Verification Results

```
Server: omnii-graph-server
Tools: 3
Rate limiter: function
elysia-rate-limit: 4.0.0
```

## Success Criteria Met

- [x] elysia-rate-limit installed
- [x] Rate limiting at 100 req/min per user
- [x] MCP handles initialize, tools/list, tools/call
- [x] Auth via Supabase JWT
- [x] Tool calls use createClientForUser for isolation
- [x] Routes integrated into main app

## Phase 2 Progress

With this plan complete, Phase 2 now has 5/7 plans done:
- [x] 02-01: Graph Schema Design
- [x] 02-02: Embedding Service
- [x] 02-03: MCP Server Core
- [x] 02-04: MCP Tools for Graph Queries
- [x] 02-05: Auth, Rate Limiting & Route Integration
- [ ] 02-06: Connection Management (Wave 5)
- [ ] 02-07: Testing & Validation (Wave 6)

## Next Phase Readiness

**For 02-06 (Connection Management):**
- All MCP infrastructure is now complete
- Ready to add connection pooling and lifecycle management

**For 02-07 (Testing & Validation):**
- Full MCP endpoint is functional
- Ready for end-to-end testing with MCP clients
