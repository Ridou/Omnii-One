---
phase: 05-mobile-client-offline-sync
plan: 06
subsystem: mcp-integration
tags: [mcp, api-client, react-hooks, mobile, json-rpc, authentication]

# Dependency graph
requires:
  - phase: 05-01
    provides: PowerSync backend routes (/api/powersync/populate)
  - phase: 05-03
    provides: SyncProvider and auth context
  - phase: 03-03
    provides: MCP tools (calendar, contacts, tasks, search, list, context)
provides:
  - MCP API client for mobile with typed tool wrappers
  - React hooks for MCP tool invocation with loading/error state
  - Environment configuration for MCP backend URL
affects: [05-07, 05-08, mobile-features, offline-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - JSON-RPC 2.0 protocol for MCP tool calls
    - Typed tool wrappers with interface definitions
    - React hooks with loading/error state management
    - Supabase JWT authentication for API calls

key-files:
  created:
    - apps/omnii-mobile/src/lib/api/mcp.ts
    - apps/omnii-mobile/src/hooks/useMcpTools.ts
  modified:
    - apps/omnii-mobile/src/lib/env.ts
    - apps/omnii-mobile/src/types/env.d.ts
    - apps/omnii-mobile/app.config.js

key-decisions:
  - "JSON-RPC 2.0 protocol for MCP tool calls matches backend transport expectations"
  - "Typed interfaces for all tool responses (CalendarEvent, Contact, Task, SearchResult, Entity)"
  - "Generic useMcpTool<T> hook allows extending to new tools without hook changes"
  - "All hooks include reset() function for clearing state on logout/navigation"

patterns-established:
  - "API client pattern: getAuthToken -> apiFetch -> callMcpTool for authenticated calls"
  - "Hook pattern: useState for data/loading/error, useCallback for actions, reset for cleanup"
  - "mcpTools typed wrapper object for IDE autocomplete and type safety"

# Metrics
duration: 3min
completed: 2026-01-26
---

# Phase [05] Plan [06]: MCP API Integration Summary

**MCP API client and React hooks wiring mobile app to backend for real-time graph operations via 7 MCP tools**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-26T00:15:23Z
- **Completed:** 2026-01-26T00:19:08Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Environment configuration extended with MCP_BASE_URL and POWERSYNC_URL
- MCP API client with JSON-RPC 2.0 protocol for tool invocation
- Typed wrappers for all 7 MCP tools (calendarQuery, contactLookup, taskOperations, searchNodes, listEntities, getContext, extractRelationships)
- 9 React hooks for MCP tool invocation with loading/error state management
- Utility functions getMcpConfig, getMcpBaseUrl, validateEnv

## Task Commits

Each task was committed atomically:

1. **Task 1: Update environment config with MCP backend URL** - `89a3ec6` (feat)
2. **Task 2: Create MCP API client** - `8a7dcc3` (feat)
3. **Task 3: Create React hooks for MCP tools** - `3d436c9` (feat)

## Files Created/Modified

**Created:**
- `apps/omnii-mobile/src/lib/api/mcp.ts` - MCP API client with typed tool wrappers, JSON-RPC handling, health check, sync populate
- `apps/omnii-mobile/src/hooks/useMcpTools.ts` - React hooks for all MCP tools with loading/error/reset state

**Modified:**
- `apps/omnii-mobile/src/lib/env.ts` - Added mcp.baseUrl and powerSync.url config sections, getMcpConfig, getMcpBaseUrl, validateEnv utilities
- `apps/omnii-mobile/src/types/env.d.ts` - Extended ProcessEnv and EnvironmentConfig with MCP and PowerSync types
- `apps/omnii-mobile/app.config.js` - Added mcpBaseUrl and powerSyncUrl to extra section

## API Client Details

| Function | Purpose |
|----------|---------|
| `getAuthToken()` | Extract JWT from Supabase session |
| `apiFetch()` | Base fetch with auth headers |
| `callMcpTool()` | JSON-RPC tool invocation |
| `listMcpTools()` | Query available tools |
| `checkMcpHealth()` | Backend health check |
| `populateSyncData()` | Trigger PowerSync population |

## React Hooks

| Hook | Purpose |
|------|---------|
| `useMcpTool<T>()` | Generic hook for any MCP tool |
| `useCalendarQuery()` | Calendar event queries |
| `useContactLookup()` | Contact discovery |
| `useTaskOperations()` | Task list/get/create/complete |
| `useGraphSearch()` | Semantic node search |
| `useEntityList()` | List entities by type |
| `useEntityContext()` | Get entity relationships |
| `useMcpHealth()` | Backend health check |
| `useSyncPopulate()` | Trigger sync population |

## Decisions Made

1. **JSON-RPC 2.0 protocol**: Matches MCP backend transport expectations. Request format: `{ jsonrpc: '2.0', id, method, params }`.

2. **Typed interfaces for responses**: Created CalendarEvent, Contact, Task, SearchResult, Entity, EntityContext interfaces for type safety and IDE autocomplete.

3. **Generic useMcpTool hook**: Allows new tools to be added without creating new hooks. Domain-specific hooks provide better UX for common operations.

4. **Reset functions on all hooks**: Enables cleanup on logout, navigation, or error recovery. All hooks follow consistent `{ data, isLoading, error, [actions], reset }` pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks implemented successfully. Pre-existing TypeScript errors in codebase (250 errors in about.tsx, privacy-policy.tsx, etc.) are unrelated to this plan's changes.

## User Setup Required

To use MCP integration in development:

1. Set `EXPO_PUBLIC_MCP_BASE_URL` in `.env` (defaults to `http://localhost:3001`)
2. Ensure MCP backend is running on the configured URL
3. User must be authenticated via Supabase for API calls to work

## Next Phase Readiness

**Ready for Phase 5 continuation:**
- Mobile can now call MCP tools via hooks (useCalendarQuery, useContactLookup, etc.)
- Environment config supports dev/prod MCP URLs
- PowerSync population can be triggered via useSyncPopulate hook

**For Plan 05-07 (if exists):**
- MCP hooks available for UI integration
- Real-time graph queries complement offline PowerSync data
- Authentication already handled via Supabase session

**No blockers or concerns.**

---
*Phase: 05-mobile-client-offline-sync*
*Completed: 2026-01-26*
