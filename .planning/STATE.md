# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** AI always has the right context when querying user's personal data
**Current focus:** Phase 0 - Monorepo Consolidation Preparation

## Current Position

Phase: 0 of 7 (Monorepo Consolidation Preparation)
Plan: 4 of 5 (Plan 00-04 complete)
Status: In progress
Last activity: 2026-01-24 - Completed 00-04-PLAN.md (Environment Variable Reconciliation)

Progress: [████░░░░░░] 80% (4/5 plans in phase 0)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 5min
- Total execution time: 21min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 0 | 4/5 | 21min | 5min |

**Recent Trend:**
- Last plan: 00-04 (5min)
- Previous: 00-03 (4min)
- Trend: Consistent velocity (6→6→4→5min)

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

**From Roadmap:**
- 8-phase structure derived from requirement boundaries, research flags Phase 0 as critical for avoiding monorepo complexity spike
- Neo4j-Bun compatibility needs resolution in Phase 1, GraphRAG dual-channel is key capability, use proven sync engines for mobile

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 0 critical decisions:**
- ~~Monorepo tool selection (Turborepo vs. Nx)~~ - RESOLVED: Using Turborepo from omnii (already working)
- ~~Codebase "source of truth" per domain~~ - RESOLVED: Monorepo for all domains (see Plan 00-02 decisions)
- ~~MCP merge strategy~~ - RESOLVED: Skip merge, workspace is canonical (see Plan 00-03 decisions)
- Python RDF service lacks package.json (sherif warning - not blocking, but should be addressed)
- Runtime validation needed: omnii-mcp app startup tested (✅ initializes), full runtime needs env vars

**Phase 1 critical decisions:**
- Neo4j-Bun compatibility mitigation strategy - HTTP proxy vs. alternative database (research flag)
- Embedding model selection - OpenAI vs. local models for offline use

**Phase 3 research needed:**
- GraphRAG implementation patterns with LangChain + Neo4j (emerging patterns)

**Phase 4 scope discipline:**
- Must resist adding multiple data sources simultaneously - start with Google Calendar only, validate improvement before expanding

**Phase 5 research needed:**
- CRDT library selection (Automerge vs. Yjs vs. Replicache) for conflict-free sync
- Mobile background sync optimization for battery impact

## Session Continuity

Last session: 2026-01-24 21:59:30Z
Stopped at: Completed 00-04-PLAN.md (Environment Variable Reconciliation) - 2 tasks committed, SUMMARY created
Resume file: None
