---
phase: 00-monorepo-consolidation-preparation
plan: 02
subsystem: planning
tags: [divergence-analysis, merge-strategy, react-native, expo, turborepo, monorepo]

# Dependency graph
requires:
  - phase: 00-monorepo-consolidation-preparation
    plan: 01
    provides: Turborepo operational with omnii migrated and 1910 packages installed
provides:
  - Complete divergence analysis across three codebases (omnii, omnii-mobile, omnii-mcp)
  - Concrete merge strategy with source of truth decisions for all domains
  - Version reconciliation plan (React 19, React Native 0.79.3, Expo SDK 53)
  - Environment variable namespace migration plan
  - Migration execution roadmap for Plans 03-05
affects:
  - 00-03 (MCP migration - uses divergence findings and merge strategy)
  - 00-04 (Mobile migration - uses version reconciliation and testing strategy)
  - 00-05 (Final consolidation - uses archival plan)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Divergence analysis before migration to prevent complexity spike"
    - "Source of truth selection based on code maturity, architecture, and development activity"
    - "pnpm overrides for strict version resolution across workspace"

key-files:
  created:
    - .planning/phases/00-monorepo-consolidation-preparation/00-DIVERGENCE.md
    - .planning/phases/00-monorepo-consolidation-preparation/00-MERGE-STRATEGY.md
  modified: []

key-decisions:
  - "Monorepo is source of truth for all domains (mobile architecture, MCP backend, graph schema)"
  - "Migration order: MCP first (low risk, backend-only), then Mobile (high risk, needs testing)"
  - "React 19 and React Native 0.79.3 for entire workspace via pnpm overrides"
  - "Environment variable namespacing: MCP_* for MCP-specific, keep EXPO_PUBLIC_* as-is"
  - "Archive standalone repos with v1.0.0-pre-monorepo tag, preserve git history"

patterns-established:
  - "Comprehensive divergence analysis documents: version matrices, dependency comparisons, environment audits"
  - "Merge strategy with concrete decisions: no TBD items, all decisions actionable"
  - "Risk assessment with likelihood/impact/mitigation for each migration risk"

# Metrics
duration: 6min
completed: 2026-01-24
---

# Phase 00 Plan 02: Divergence Analysis & Merge Strategy Summary

**Comprehensive divergence analysis (685 lines) and actionable merge strategy (789 lines) for three-codebase consolidation with zero TBD decisions**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-24T21:43:57Z
- **Completed:** 2026-01-24T21:50:22Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- Analyzed version divergence across React Native (0.76.9 → 0.79.3), React (18 → 19), and Expo SDK (52 → 53) with breaking change assessment
- Determined monorepo MCP has 2x more code (28,531 lines vs 13,754 lines) with superior architecture (structured services vs flat files)
- Documented all 60+ environment variables across three codebases with collision analysis
- Created concrete merge strategy with source of truth decisions for all domains
- Defined migration execution plan (MCP first 1-2h, Mobile second 4-6h, total 6-9h)

## Task Commits

Each task was committed atomically:

1. **Task 1: Deep divergence analysis** - `a37977b` (docs)
2. **Task 2: Create merge strategy document** - `c60a7cd` (docs)

## Files Created/Modified

- `.planning/phases/00-monorepo-consolidation-preparation/00-DIVERGENCE.md` (685 lines) - Complete divergence analysis with version matrices, dependency comparisons, environment audits, unique feature inventory, git history analysis
- `.planning/phases/00-monorepo-consolidation-preparation/00-MERGE-STRATEGY.md` (789 lines) - Merge strategy with source of truth decisions, migration order, version reconciliation, environment namespacing, risk assessment, testing strategy, timeline

## Decisions Made

**Source of Truth (All Monorepo):**
- Mobile architecture: Monorepo has Expo 53, React 19, RN 0.79.3, workspace integration, tRPC/React Query
- MCP backend: Monorepo has 2x code, RDF/n8n features, structured architecture, workspace dependencies
- Graph schema: Monorepo is single active source with most recent development

**Migration Strategy:**
- Execute MCP migration first (low risk, backend-only, 1-2 hours)
- Execute Mobile migration second (high risk, needs device testing, 4-6 hours)
- Use pnpm overrides for strict version resolution (React 19, RN 0.79.3, Expo 53)
- Namespace MCP environment variables with MCP_* prefix
- Archive standalone repos with v1.0.0-pre-monorepo tag

**Risk Mitigation:**
- React Native 0.76 → 0.79: Strict pnpm resolutions + physical device testing
- React 18 → 19: Comprehensive UI testing + gradual migration
- Expo SDK 52 → 53: Follow Expo upgrade guide + test all modules
- expo-router 4 → 5: Review routing changes + test navigation flows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - analysis proceeded smoothly with all three codebases accessible.

## Next Phase Readiness

**Ready for Plan 03 (MCP Migration):**
- Divergence analysis confirms monorepo MCP is superset of standalone
- No unique features to preserve in standalone MCP
- Clear diff and cherry-pick workflow documented
- Test suite validation plan defined (30+ test scripts)

**Ready for Plan 04 (Mobile Migration):**
- Version upgrade path documented (Expo 52→53, React 18→19, RN 0.76→0.79)
- Breaking changes identified for React 19 and expo-router v5
- Comprehensive testing checklist created (iOS/Android/Web)
- Device testing requirements specified

**No Blockers:**
- All required information gathered
- All decisions documented
- Migration order established with rationale
- Success criteria defined for each plan

**Critical Findings:**
1. Monorepo is significantly more advanced (8 months active development vs stale standalone repos)
2. Standalone mobile has NO unique features (note: plan mentioned gamification, but none found in codebase)
3. Standalone MCP is strict subset of monorepo MCP (all features exist in monorepo + RDF/n8n extras)
4. Version conflicts are HIGH RISK but manageable with strict resolutions and testing

**Environment Variable Migration:**
- 21 mobile vars (all namespaced correctly)
- 39 MCP vars (need 3 renames: BASE_URL→MCP_BASE_URL, PUBLIC_URL→MCP_PUBLIC_URL, PORT→MCP_PORT)
- No critical collisions detected
- .env.example template ready for root monorepo

**Timeline Confidence:**
- MCP migration: HIGH (1-2 hours, backend-only, clear subset)
- Mobile migration: MEDIUM (4-6 hours, depends on React 19 testing results)
- Overall Phase 0: 6-9 hours total execution time

---
*Phase: 00-monorepo-consolidation-preparation*
*Completed: 2026-01-24*
