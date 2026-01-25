# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** AI always has the right context when querying user's personal data
**Current focus:** Phase 1 - Foundation Infrastructure

## Current Position

Phase: 1 of 7 (Foundation Infrastructure)
Plan: 2 of 5 (Plan 01-02 complete)
Status: In progress
Last activity: 2026-01-25 - Completed 01-02-PLAN.md (Environment Configuration)

Progress: [█████████░] 40% (2/5 plans in phase 1)

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 4min
- Total execution time: 30min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 0 | 5/5 | 24min | 5min |
| Phase 1 | 2/5 | 6min | 3min |

**Recent Trend:**
- Last plan: 01-02 (3min)
- Previous: 01-01 (3min)
- Trend: Consistent (5→3→3→3min)

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

**From Phase 1 Plan 02 (01-02):**
- Singleton pattern for env config: Validate once on import (fail-fast), cache result in module-level variable, export as const
- Support both OMNII_* and legacy names: Legacy variable names optional during transition, new code uses OMNII_* namespace
- Early env import in app.ts: Env validation runs before other services initialize for fail-fast behavior
- Remove dotenv dependency: Bun loads .env natively, no dotenv package needed

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

Last session: 2026-01-25 04:05:15Z
Stopped at: Completed 01-02-PLAN.md (Environment Configuration) - 2 tasks committed, SUMMARY created
Resume file: None

**Phase 1 Status:** In progress (2/5 plans complete)
