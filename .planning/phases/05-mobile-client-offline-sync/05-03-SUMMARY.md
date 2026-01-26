---
phase: 05-mobile-client-offline-sync
plan: 03
subsystem: mobile-sync
tags: [powersync, react-context, sync, offline-first]

dependency_graph:
  requires: ["05-01", "05-02"]
  provides: ["powersync-connector", "sync-context", "sync-hooks"]
  affects: ["05-future-ui", "mobile-offline-features"]

tech_stack:
  added: []
  patterns: ["backend-connector", "react-context", "singleton-factory", "auth-integration"]

key_files:
  created:
    - apps/omnii-mobile/src/lib/powersync/connector.ts
    - apps/omnii-mobile/src/context/SyncContext.tsx
  modified:
    - apps/omnii-mobile/src/app/_layout.tsx

decisions:
  - id: "connector-singleton"
    choice: "Singleton pattern for OmniiConnector"
    reason: "Single connector instance shared across app, reset on logout"
  - id: "powersync-context-value"
    choice: "Pass database directly to PowerSyncContext.Provider"
    reason: "PowerSyncContext expects AbstractPowerSyncDatabase, not {db} object"
  - id: "http-polling-sync"
    choice: "Custom HTTP polling via fetchChanges instead of WebSocket"
    reason: "Backend uses HTTP endpoints, not PowerSync Cloud WebSocket streaming"

metrics:
  duration: "3min"
  completed: "2026-01-26"
---

# Phase 05 Plan 03: PowerSync Connector & Context Summary

**One-liner:** OmniiConnector authenticates via Supabase JWT and syncs with MCP backend HTTP endpoints; SyncContext manages PowerSync lifecycle with auth-aware initialization.

## What Was Built

### 1. OmniiConnector (apps/omnii-mobile/src/lib/powersync/connector.ts)

PowerSync backend connector implementing `PowerSyncBackendConnector` interface:

- **fetchCredentials()**: Gets Supabase JWT from session for authentication
- **uploadData()**: Batches local changes by table and POSTs to `/api/powersync/upload`
- **fetchChanges()**: Custom HTTP polling implementation for `/api/powersync/sync`
- **Singleton pattern**: `getConnector()` returns shared instance, `resetConnector()` clears on logout

Key implementation detail: Uses HTTP polling instead of WebSocket streaming because backend exposes REST endpoints, not PowerSync Cloud.

### 2. SyncContext (apps/omnii-mobile/src/context/SyncContext.tsx)

React context managing PowerSync lifecycle:

- **Auth-aware initialization**: Initializes PowerSync database when user authenticates
- **Cleanup on logout**: Calls `resetPowerSync()` and `resetConnector()` when user logs out
- **Status tracking**: Exposes `SyncStatus` enum (offline, connecting, syncing, synced, error)
- **Actions**: `triggerSync()`, `disconnect()`, `clearAndReconnect()` for manual control
- **PowerSync integration**: Wraps children with `PowerSyncContext.Provider` when database ready

### 3. App Layout Integration (apps/omnii-mobile/src/app/_layout.tsx)

Provider hierarchy updated:
```
AuthProvider
  SyncProvider      <-- NEW
    XPProvider
      ProfileProvider
        ThemeProvider
          ThemedStack
```

SyncProvider placed inside AuthProvider (uses `useAuth` hook) and outside other providers so sync state is available app-wide.

## Verification

| Check | Status |
|-------|--------|
| OmniiConnector implements fetchCredentials | PASS |
| OmniiConnector implements uploadData | PASS |
| SyncProvider manages PowerSync lifecycle | PASS |
| useSyncState() returns state and actions | PASS |
| SyncProvider in _layout.tsx provider hierarchy | PASS |
| TypeScript compiles without errors (plan files) | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PowerSyncContext.Provider value type**
- **Found during:** Task 2 verification
- **Issue:** Plan template used `value={{ db }}` but PowerSyncContext expects `AbstractPowerSyncDatabase` directly
- **Fix:** Changed to `value={db}` (database instance directly, not wrapped in object)
- **Files modified:** SyncContext.tsx

## Technical Notes

### Sync Flow

1. User authenticates via Supabase Auth
2. AuthContext updates `user` state
3. SyncContext's useEffect triggers
4. SyncProvider calls `getPowerSync()` and `database.init()`
5. Connector's `fetchCredentials()` called for Supabase JWT
6. `database.connect(connector)` establishes sync connection
7. Status listener updates React state on sync events

### Offline-First Architecture

- PowerSync creates local SQLite database (`omnii-powersync.db`)
- Local writes happen immediately (optimistic updates)
- Connector batches and uploads changes in background
- `triggerSync()` allows manual pull from backend

## Success Criteria Met

- [x] OmniiConnector uses Supabase JWT for authentication
- [x] SyncProvider initializes PowerSync when user logs in
- [x] SyncProvider cleans up when user logs out
- [x] useSyncState() available in any component
- [x] triggerSync() manually fetches and applies changes
- [x] App layout has SyncProvider after AuthProvider

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 42bbdaa | feat | Create PowerSync backend connector |
| be0250b | feat | Create SyncContext for app-wide sync state |
| ab625c1 | feat | Wire SyncProvider into app layout |

## Next Phase Readiness

Phase 5 complete after this plan. Ready for:
- UI components using `useSyncState()` for sync indicators
- Offline-first features using PowerSync queries
- Background sync optimization (battery impact consideration)
