---
phase: 05-mobile-client-offline-sync
plan: 05
subsystem: mobile-ui
tags: [react-native, powersync, hooks, components, offline-first]
dependency-graph:
  requires: [05-02, 05-03]
  provides: [useGraphData-hooks, EntityList-component, EventTimeline-component]
  affects: [05-06, 05-07]
tech-stack:
  added: []
  patterns: [custom-hooks, reactive-queries, flatlist-virtualization]
key-files:
  created:
    - apps/omnii-mobile/src/hooks/useGraphData.ts
    - apps/omnii-mobile/src/components/graph/EntityList.tsx
    - apps/omnii-mobile/src/components/graph/EventTimeline.tsx
    - apps/omnii-mobile/src/components/graph/index.ts
  modified: []
decisions:
  - key: powersync-usequery-hook
    choice: "Use modern useQuery from @powersync/react instead of deprecated usePowerSyncWatchedQuery"
    rationale: "useQuery returns proper { data, isLoading, error } structure; deprecated hook only returns array"
  - key: explicit-type-annotations
    choice: "Add explicit TypeScript annotations in map callbacks"
    rationale: "Required for strict TypeScript mode with generic query results"
metrics:
  duration: 4min
  completed: 2026-01-26
---

# Phase 5 Plan 05: Unified Data Views Summary

Reactive hooks and components for displaying graph data from local PowerSync SQLite database.

## One-Liner

Custom React hooks (useEntities, useEvents, useRelationships) + EntityList/EventTimeline components for offline-first graph data views.

## What Was Built

### 1. useGraphData Hooks (apps/omnii-mobile/src/hooks/useGraphData.ts)

Five hooks for querying local PowerSync database:

| Hook | Purpose | Parameters |
|------|---------|------------|
| `useEntities` | Query entities with filters | entityType, limit, searchQuery |
| `useEvents` | Query events by date range | startDate, endDate, limit |
| `useRelationships` | Query entity relationships | entityId, relationshipType |
| `useEntity` | Get single entity by ID | entityId |
| `useEntityCounts` | Aggregate counts by type | none |

**Key features:**
- Uses `useQuery` from @powersync/react for reactive updates
- Automatic re-render when PowerSync syncs new data
- Dynamic SQL query building with parameterized queries
- JSON property parsing for JSONB columns

### 2. EntityList Component (apps/omnii-mobile/src/components/graph/EntityList.tsx)

Filterable list view for graph entities:

- **Search bar** - Real-time name filtering
- **Type chips** - Filter by All, Contacts, Tasks, Emails, Concepts
- **Entity cards** - Type-specific icons and colors
- **States** - Loading spinner, error message, empty state

**Visual design:**
- Blue for contacts, purple for emails, green for tasks, yellow for concepts
- Lucide icons (User, Mail, CheckSquare, Lightbulb, Box)
- Chevron navigation indicator

### 3. EventTimeline Component (apps/omnii-mobile/src/components/graph/EventTimeline.tsx)

Chronological event display:

- **Date grouping** - "Today", "Tomorrow", or formatted date headers
- **Time badges** - Start/end times in locale format
- **Event cards** - Title, description, location, attendee count
- **Timeline markers** - Colored dots for date sections

**Default behavior:**
- Shows 2 weeks of upcoming events if no range specified
- Sorts events chronologically within each day
- Groups events by calendar date

### 4. Barrel Export (apps/omnii-mobile/src/components/graph/index.ts)

Clean import path for graph components:
```typescript
import { EntityList, EventTimeline } from '~/components/graph';
```

## Technical Decisions

### PowerSync Hook Selection

**Decision:** Use `useQuery` instead of `usePowerSyncWatchedQuery`

The deprecated `usePowerSyncWatchedQuery` returns only `T[]`, making it impossible to track loading/error states. The modern `useQuery` hook returns:
```typescript
{ data: T[], isLoading: boolean, isFetching: boolean, error: Error | undefined }
```

This enables proper loading indicators and error handling in components.

### Query Building Pattern

Dynamic SQL construction with safe parameter binding:
```typescript
const query = useMemo(() => {
  let sql = 'SELECT * FROM sync_entities';
  const params: (string | number)[] = [];

  if (entityType !== 'all') {
    sql += ' WHERE entity_type = ?';
    params.push(entityType);
  }

  return { sql, params };
}, [entityType]);
```

This pattern prevents SQL injection while allowing flexible filtering.

## Commits

| Commit | Description |
|--------|-------------|
| `07fa35f` | Create useGraphData hooks for querying local PowerSync database |
| `fbfccb3` | Create EntityList component for displaying graph entities |
| `e87d5fa` | Create EventTimeline component and graph barrel export |

## Verification

```bash
cd apps/omnii-mobile && npx tsc --noEmit
# All plan files compile successfully (pre-existing errors unrelated to plan)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed from deprecated to modern PowerSync hook**
- **Found during:** Task 1
- **Issue:** Plan specified `usePowerSyncWatchedQuery` which returns only `T[]`, not `{ data, isLoading, error }`
- **Fix:** Used `useQuery` from @powersync/react which has proper return type
- **Files modified:** apps/omnii-mobile/src/hooks/useGraphData.ts
- **Commit:** 07fa35f

**2. [Rule 1 - Bug] Added type safety for possibly undefined array access**
- **Found during:** Task 3
- **Issue:** TypeScript error "Object is possibly 'undefined'" when accessing `dayEvents[0]`
- **Fix:** Added explicit null check with for-of loop instead of filter+map
- **Files modified:** apps/omnii-mobile/src/components/graph/EventTimeline.tsx
- **Commit:** e87d5fa

## Integration Points

### Usage in screens

```typescript
// In a graph explorer screen
import { EntityList, EventTimeline } from '~/components/graph';
import { useEntities, useEntityCounts } from '~/hooks/useGraphData';

export default function GraphScreen() {
  const { counts } = useEntityCounts();

  return (
    <View>
      <Text>Total: {Object.values(counts).reduce((a, b) => a + b, 0)}</Text>
      <EntityList onEntityPress={(id) => router.push(`/entity/${id}`)} />
    </View>
  );
}
```

### Data flow

```
PowerSync Sync
     |
     v
SQLite Database (sync_entities, sync_events, sync_relationships)
     |
     v
useQuery (reactive subscription)
     |
     v
useGraphData hooks (query building, parsing)
     |
     v
EntityList / EventTimeline components (rendering)
```

## Next Phase Readiness

Plan 05-05 delivers MOBILE-06 requirement (unified data views). Ready for:

- **05-06:** MCP client integration for tool invocation from mobile
- **05-07:** Conflict resolution UI for sync conflicts
- **05-08:** Background sync configuration

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `apps/omnii-mobile/src/hooks/useGraphData.ts` | 232 | PowerSync query hooks |
| `apps/omnii-mobile/src/components/graph/EntityList.tsx` | 282 | Filterable entity list |
| `apps/omnii-mobile/src/components/graph/EventTimeline.tsx` | 306 | Chronological event display |
| `apps/omnii-mobile/src/components/graph/index.ts` | 9 | Barrel export |
