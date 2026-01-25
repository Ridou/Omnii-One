---
phase: 03-graphrag-advanced-mcp
plan: 03
subsystem: mcp-tools
tags: [mcp, graphrag, temporal-query, dual-channel-retrieval, calendar, contacts, tasks]

# Dependency graph
requires:
  - phase: 03-01
    provides: Temporal context service with natural language time queries
  - phase: 03-02
    provides: Dual-channel retrieval combining vector search and graph traversal
provides:
  - Domain-specific MCP tools (calendar, contacts, tasks) with temporal filtering
  - Temporal filtering for generic search_nodes tool
  - 6 total MCP tools for AI assistants to query personal knowledge graph
affects: [03-04, 03-05, 03-06, 04-google-calendar, integration-workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Domain-specific MCP tools following search-nodes pattern
    - ToolHandler signature extended with optional userId parameter
    - UserID passed from transport auth context to handlers needing GraphRAG services

key-files:
  created:
    - apps/omnii_mcp/src/mcp/tools/calendar-query.ts
    - apps/omnii_mcp/src/mcp/tools/contact-lookup.ts
    - apps/omnii_mcp/src/mcp/tools/task-operations.ts
  modified:
    - apps/omnii_mcp/src/mcp/tools/search-nodes.ts
    - apps/omnii_mcp/src/mcp/tools/index.ts
    - apps/omnii_mcp/src/mcp/transport.ts

key-decisions:
  - "Extended ToolHandler signature with optional userId parameter to support GraphRAG services requiring multi-tenant isolation"
  - "Calendar queries use queryTemporalEvents from temporal-context service with optional semantic filtering via vector search"
  - "Contact lookups use localSearch with dual-channel retrieval for relationship context"
  - "Tasks stored as Entity nodes with entity_type='task' for flexibility (not dedicated Task label)"

patterns-established:
  - "Domain tool pattern: Zod input schema + tool definition + handler function using GraphRAG services"
  - "Handler userId validation: Early return with MCPToolResponse error if userId missing (defensive)"
  - "Temporal filtering: parseTemporalQuery converts natural language to Neo4j duration syntax"

# Metrics
duration: 7min
completed: 2026-01-25
---

# Phase [03] Plan [03]: Domain MCP Tools Summary

**Four domain-specific MCP tools (calendar events, contacts, tasks) with temporal filtering and dual-channel retrieval using GraphRAG services**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-25T18:06:25Z
- **Completed:** 2026-01-25T18:13:29Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments
- Temporal filtering added to generic search_nodes tool via time_range parameter
- omnii_calendar_query tool queries events by time range with optional attendee relationships
- omnii_contact_lookup tool finds contacts with interaction history via dual-channel search
- omnii_task_operations tool supports list/search operations with status and temporal filters
- 6 total MCP tools now available for AI assistants (search_nodes, get_context, list_entities, calendar_query, contact_lookup, task_operations)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add temporal filtering to search_nodes MCP tool** - `b2fd36e` (feat)
2. **Task 2: Create calendar query MCP tool** - `28bb7aa` (feat)
3. **Task 3: Create contact lookup MCP tool** - `0647335` (feat)
4. **Task 4: Create task operations MCP tool and register all new tools** - `b3894f7` (feat)

## Files Created/Modified
- `apps/omnii_mcp/src/mcp/tools/search-nodes.ts` - Added time_range parameter with temporal filtering via parseTemporalQuery
- `apps/omnii_mcp/src/mcp/tools/calendar-query.ts` - Calendar event queries with time ranges and optional semantic search
- `apps/omnii_mcp/src/mcp/tools/contact-lookup.ts` - Contact discovery with relationship context via localSearch
- `apps/omnii_mcp/src/mcp/tools/task-operations.ts` - Task list/search operations with status and temporal filtering
- `apps/omnii_mcp/src/mcp/tools/index.ts` - Registered 3 new domain tools, updated ToolHandler type signature
- `apps/omnii_mcp/src/mcp/transport.ts` - Pass auth.userId to handlers for GraphRAG service multi-tenancy

## Decisions Made

1. **ToolHandler signature extension**: Added optional userId parameter to ToolHandler type. Required for GraphRAG services (localSearch, queryTemporalEvents) that need multi-tenant userId for database isolation. Transport layer passes auth.userId when calling handlers.

2. **Task storage strategy**: Tasks stored as Entity nodes with entity_type='task' property rather than dedicated Task label. Provides flexibility for different entity types while maintaining label-based indexing on Entity.

3. **Calendar query dual-mode**: Calendar tool supports both temporal filtering (via queryTemporalEvents) and optional semantic search (via searchByText). Enables "meetings last week" (temporal-only) or "meetings about project X last week" (temporal + semantic).

4. **Contact interaction context**: Contact lookup tool uses localSearch with includeContext flag to control whether to fetch related events/entities. Provides AI with full interaction history when needed or fast contact-only results when not.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks implemented successfully following established patterns from Phase 2 MCP tools and Phase 3 GraphRAG services.

## User Setup Required

None - no external service configuration required. MCP tools use existing Neo4j and authentication infrastructure.

## Next Phase Readiness

**Ready for Phase 3 continuation:**
- Domain tools provide specialized query interfaces for calendar, contacts, tasks
- Temporal filtering enables time-based queries across all entity types
- Dual-channel retrieval integrated into domain tools for context enrichment
- MCP tool pattern established and repeatable for future domain expansions

**For Phase 4 (Google Calendar integration):**
- calendar_query tool ready to consume synced Google Calendar events
- Event nodes with start_time/end_time fields match expected schema
- Related contacts (attendees) linkable via relationships

**No blockers or concerns.**

---
*Phase: 03-graphrag-advanced-mcp*
*Completed: 2026-01-25*
