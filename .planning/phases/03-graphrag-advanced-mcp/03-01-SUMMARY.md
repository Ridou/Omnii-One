---
phase: 03-graphrag-advanced-mcp
plan: 01
subsystem: database
tags: [neo4j, temporal-queries, graph-database, cypher, datetime]

# Dependency graph
requires:
  - phase: 02-mcp-graph-integration
    provides: Neo4j HTTP client, graph schema (nodes, constraints), vector search
provides:
  - Temporal query utilities for time-based graph filtering
  - Duration mapping for natural language time expressions
  - Temporal indexes on created_at and start_time fields
affects: [03-02, 03-03, 03-04, 03-05, 03-06, phase-04-data-sources]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Natural language time query parsing to ISO 8601 durations
    - Neo4j datetime arithmetic with duration() function
    - Temporal filtering with user_id multi-tenancy

key-files:
  created:
    - apps/omnii_mcp/src/services/graphrag/temporal-context.ts
  modified:
    - apps/omnii_mcp/src/services/graphrag/index.ts
    - apps/omnii_mcp/src/graph/schema/constraints.ts
    - apps/omnii_mcp/scripts/setup-user-schema.ts

key-decisions:
  - "Use Neo4j datetime() (timezone-aware) not localdatetime() for UTC storage"
  - "Temporal indexes improve query performance from O(n) scan to O(log n) lookup"
  - "parseTemporalQuery validates time ranges and throws descriptive errors"

patterns-established:
  - "TEMPORAL_DURATIONS constant pattern: natural language → ISO 8601"
  - "Duration-based filtering: datetime() - duration($duration) for time ranges"
  - "Age calculation: duration.between(created_at, datetime()) for recency"

# Metrics
duration: 4min
completed: 2026-01-25
---

# Phase 03 Plan 01: Temporal Context Awareness Summary

**Natural language time queries ("last week", "this month") filter graph nodes by timestamp using Neo4j datetime arithmetic with temporal indexes for O(log n) performance**

## Performance

- **Duration:** 3min 50s
- **Started:** 2026-01-25T17:59:22Z
- **Completed:** 2026-01-25T18:03:12Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- TEMPORAL_DURATIONS mapping supports 8 natural language time expressions
- queryTemporalNodes filters any node type by created_at within time range
- queryTemporalEvents specialized query for Event nodes with related entities/contacts
- Temporal indexes on created_at (Entity, Contact, Concept) and start_time (Event)
- All Cypher queries use parameterized syntax (no injection risk)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create temporal context service** - `941410b` (feat)
2. **Task 2: Add temporal indexes for query performance** - `c7ae48d` (feat)
3. **Fix: Add temporal-context export to graphrag barrel** - `ee71be2` (fix)

## Files Created/Modified
- `apps/omnii_mcp/src/services/graphrag/temporal-context.ts` - Temporal query utilities with duration mapping, parseTemporalQuery validation, queryTemporalNodes and queryTemporalEvents functions
- `apps/omnii_mcp/src/services/graphrag/index.ts` - GraphRAG barrel export including temporal-context
- `apps/omnii_mcp/src/graph/schema/constraints.ts` - Added createTemporalIndex function with 4 indexes (created_at on Entity/Contact/Concept, start_time on Event)
- `apps/omnii_mcp/scripts/setup-user-schema.ts` - Integrated createTemporalIndex into schema setup flow with temporalIndexes result tracking

## Decisions Made
- **Neo4j datetime() vs localdatetime():** Using datetime() (timezone-aware) for UTC storage ensures consistent temporal filtering across timezones
- **Temporal index strategy:** Created 4 indexes (Entity.created_at, Event.start_time, Contact.created_at, Concept.created_at) to optimize temporal queries from O(n) scan to O(log n) index lookup
- **Error handling:** parseTemporalQuery throws descriptive errors with valid options when time range not recognized (better UX than silent failure)
- **Age calculation:** Results include age field showing duration.between(created_at, datetime()) to provide recency context for AI assistants

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Restored temporal-context export to barrel**
- **Found during:** Task 2 verification
- **Issue:** apps/omnii_mcp/src/services/graphrag/index.ts was modified by another agent/planner to export dual-channel and local-search, overwriting the temporal-context export from Task 1
- **Fix:** Added `export * from './temporal-context';` back to index.ts barrel export
- **Files modified:** apps/omnii_mcp/src/services/graphrag/index.ts
- **Verification:** grep confirmed all three exports present (dual-channel, local-search, temporal-context)
- **Committed in:** ee71be2 (fix commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix necessary to ensure temporal-context utilities are accessible via graphrag barrel export. No scope creep.

## Issues Encountered
None - plan executed smoothly with one minor export collision resolved automatically.

## User Setup Required
None - no external service configuration required. Temporal indexes are created automatically during user database provisioning via setupUserSchema script.

## Next Phase Readiness
- Temporal context service ready for integration with dual-channel retrieval (Plan 03-02)
- Time-based filtering available for MCP tools to query recent entities/events
- Temporal indexes ensure performant queries even with large graph datasets
- No blockers for subsequent GraphRAG plans

---
*Phase: 03-graphrag-advanced-mcp*
*Completed: 2026-01-25*
