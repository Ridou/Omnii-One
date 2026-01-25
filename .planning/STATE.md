# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** AI always has the right context when querying user's personal data
**Current focus:** Phase 2 - Graph Core & MCP Server

## Current Position

Phase: 2 of 7 (Graph Core & MCP Server)
Plan: 2 of 7 (Vector Search and Embeddings)
Status: In progress
Last activity: 2026-01-25 - Completed 02-02-PLAN.md (Vector Search and Embeddings)

Progress: [███░░░░░░░] 29% Phase 2 (2/7 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 4min
- Total execution time: 45min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 0 | 5/5 | 24min | 5min |
| Phase 1 | 4/5 | 14min | 4min |
| Phase 2 | 2/7 | 7min | 4min |

**Recent Trend:**
- Last plan: 02-02 (3min)
- Previous: 02-01 (4min)
- Trend: Stabilizing around 3-7min (6→6→4→5→3→7→3→4→4→3min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

**From Phase 0 Plan 01 (00-01):**
- Git history preservation: Use `git merge --allow-unrelated-histories` (NOT squash) to preserve complete omnii commit history for git blame and bisect
- pnpm hoisting: Added shamefully-hoist=true and auto-install-peers=true for React Native Metro bundler compatibility
- Merge conflict resolution: Combined planning-specific .gitignore entries with omnii patterns; used Omnii One GSD-aware CLAUDE.md

**From Phase 0 Plan 02 (00-02):**
- Source of truth: Monorepo for all domains (mobile architecture, MCP backend, graph schema) - monorepo has newer versions, better architecture, 8 months active development
- Migration order: MCP first (low risk, 1-2h), Mobile second (high risk, 4-6h) - MCP is subset of monorepo, mobile needs React 19 testing
- Version strategy: React 19 and React Native 0.79.3 for entire workspace via pnpm overrides
- Environment namespacing: MCP_* for MCP-specific vars, keep EXPO_PUBLIC_* as-is
- Standalone repo archival: Tag v1.0.0-pre-monorepo, update README, preserve git history

**From Phase 0 Plan 03 (00-03):**
- Skip git merge of standalone omnii-mcp: No unique features, 7-8 months stale, would introduce 24 package conflicts with zero benefit
- Workspace MCP is canonical: 28+ unique features (RDF, n8n, brain monitoring), 107% more code, modular architecture vs flat
- Standalone archival strategy: No code porting needed - all 24 standalone files superseded by better workspace implementations

**From Phase 0 Plan 04 (00-04):**
- OMNII_* namespace for shared infrastructure: Prevents conflicts with third-party libraries, makes project vars greppable, future-proof pattern (OMNII_SUPABASE_URL, OMNII_NEO4J_URI, etc.)
- MCP_* namespace for MCP-specific vars: Enables multiple MCP apps with different BASE_URL/PORT without collision
- Keep EXPO_PUBLIC_* as-is: React Native Metro bundler hardcoded to look for this prefix, don't fight the framework
- Turborepo cache invalidation: globalEnv for all tasks, task env for specific tasks, globalDependencies for .env files
- Environment loading order: System env → Root .env → App .env → App .env.local (gitignored overrides)

**From Phase 0 Plan 05 (00-05):**
- Version enforcement via pnpm catalog + overrides: pnpm-workspace.yaml catalog defines versions, resolutions + pnpm.overrides enforce them across all dependencies
- Exact version pinning for build tools: turbo and @turbo/gen pinned to 2.5.4 (prevents version drift in CI/CD)
- Accept catalog: references in syncpack: Not actual mismatches - pnpm catalogs work correctly, syncpack just doesn't understand them
- Python RDF package.json documented as known issue: Python service uses requirements.txt/Poetry, adding package.json would be artificial

**From Phase 1 Plan 01 (01-01):**
- Neo4j HTTP Query API over TCP driver: HTTP Query API v2 avoids 60-second timeouts from neo4j-driver TCP incompatibility with Bun runtime
- Keep neo4j-driver for legacy compatibility: Neo4jDirectService still uses driver, removing would break that service
- HTTP API response format mapping: HTTP v2 returns { fields, values } arrays instead of Record objects, requires mapping in service methods
- Preserve neo4jService public API: Routes use existing method signatures (listNodes, searchSimilarConcepts, healthCheck), zero changes required

**From Phase 1 Plan 03 (01-03):**
- Supabase Auth standardization: Removed better-auth entirely, standardized on Supabase Auth for consistency with mobile app (FOUND-03 requirement)
- tenantId pattern: Auth middleware extracts tenantId = user.id from JWT for database-per-user Neo4j lookups
- user_databases schema: Tracks Neo4j URI, credentials, Aura instance ID per user with status field for provisioning workflow
- AuthContext interface: Extends Record<string, unknown> for Elysia middleware derive return type compatibility

**From Phase 1 Plan 04 (01-04):**
- Neo4j Aura API for database provisioning: Free-db tier for development, automatic provisioning on user signup via webhook
- Background polling pattern for readiness: 5s intervals, 5min timeout, updates user_databases.status when instance is 'running'
- URI conversion for HTTP API: Convert neo4j+s:// to https:// for HTTP Query API v2 compatibility
- createClientForUser factory pattern: Per-user database isolation via client factory that looks up credentials from Supabase

**From Phase 2 Plan 01 (02-01):**
- Four node labels (Concept, Entity, Event, Contact): Covers core knowledge graph use cases for personal context
- 1536-dimension embedding field for OpenAI ada-002: Standard embedding size for vector similarity search
- Parameterized Cypher queries: All CRUD operations use parameters to prevent injection

**From Phase 2 Plan 02 (02-02):**
- HNSW algorithm with cosine similarity: Best balance of speed and accuracy for embedding search
- Exponential backoff for rate limits: 1s/2s/4s retry pattern respects OpenAI API limits
- searchByText as primary interface: Natural language queries converted to embeddings for vector search
- db.index.vector.queryNodes procedure: Neo4j native vector search for HNSW index

**From Roadmap:**
- 8-phase structure derived from requirement boundaries, research flags Phase 0 as critical for avoiding monorepo complexity spike
- Neo4j-Bun compatibility needs resolution in Phase 1, GraphRAG dual-channel is key capability, use proven sync engines for mobile

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 0 - COMPLETE:**
- ~~Monorepo tool selection (Turborepo vs. Nx)~~ - RESOLVED: Using Turborepo from omnii (already working)
- ~~Codebase "source of truth" per domain~~ - RESOLVED: Monorepo for all domains (see Plan 00-02 decisions)
- ~~MCP merge strategy~~ - RESOLVED: Skip merge, workspace is canonical (see Plan 00-03 decisions)
- ~~Runtime validation needed~~ - RESOLVED: omnii-mcp app startup confirmed (✅ initializes, env var failure expected)
- Python RDF service lacks package.json (sherif warning - documented as known non-blocking issue)

**Phase 1 - COMPLETE:**
- ~~Neo4j-Bun compatibility mitigation strategy~~ - RESOLVED: Using HTTP Query API v2 instead of TCP driver (Plan 01-01)
- ~~Auth standardization (better-auth vs Supabase)~~ - RESOLVED: Standardized on Supabase Auth, better-auth removed (Plan 01-03)

**Phase 2 - IN PROGRESS:**
- ~~Embedding model selection~~ - RESOLVED: Using OpenAI ada-002 for server-side embeddings (Plan 02-02)

**Phase 3 research needed:**
- GraphRAG implementation patterns with LangChain + Neo4j (emerging patterns)

**Phase 4 scope discipline:**
- Must resist adding multiple data sources simultaneously - start with Google Calendar only, validate improvement before expanding

**Phase 5 research needed:**
- CRDT library selection (Automerge vs. Yjs vs. Replicache) for conflict-free sync
- Mobile background sync optimization for battery impact

## Session Continuity

Last session: 2026-01-25T10:00:00Z
Stopped at: Completed 02-02-PLAN.md (Vector Search and Embeddings) - 3 tasks committed, SUMMARY created
Resume file: None

**Phase 2 Status:** In progress (2/7 plans complete)
