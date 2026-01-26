---
phase: 05-mobile-client-offline-sync
plan: 04
subsystem: mobile-ui
tags: [react-native, sync-ui, status-indicator, offline-first]
dependency_graph:
  requires: ["05-02", "05-03"]
  provides: ["ConnectionStatus", "SyncIndicator", "sync-components-barrel"]
  affects: ["06-xx (future mobile UI plans)"]
tech_stack:
  added: []
  patterns: ["STATUS_CONFIG lookup", "useAnimatedStyle for status animations", "barrel export"]
key_files:
  created:
    - apps/omnii-mobile/src/components/sync/ConnectionStatus.tsx
    - apps/omnii-mobile/src/components/sync/SyncIndicator.tsx
    - apps/omnii-mobile/src/components/sync/index.ts
  modified: []
decisions: []
metrics:
  duration: 4min
  completed: 2026-01-26
---

# Phase 5 Plan 4: Connection Status UI Components Summary

Reusable React Native components for displaying PowerSync sync status with lucide-react-native icons and react-native-reanimated animations.

## What Was Built

### Task 1: ConnectionStatus Component (af166f3)
Full-featured sync status display component:

```typescript
// Usage
<ConnectionStatus detailed interactive />
```

Features:
- **5 sync states**: offline, connecting, syncing, synced, error
- **Status icon + label**: WifiOff, Wifi, RefreshCw, Check, AlertCircle
- **Pending changes badge**: Blue pill showing count when offline with changes
- **Last synced time**: Relative format ("Just now", "5m ago", "2h ago")
- **Spinning animation**: RefreshCw icon rotates during sync
- **Interactive**: Tap to trigger manual sync

### Task 2: SyncIndicator Component (dc7c4fd)
Compact dot indicator for headers:

```typescript
// Usage in navigation header
<Stack.Screen
  options={{
    headerRight: () => <SyncIndicator />,
  }}
/>
```

Features:
- **Colored dot**: 8px circle matching status color
- **Pulse animation**: Opacity pulse when syncing/connecting
- **Tap to sync**: Triggers sync when connected
- **Minimal footprint**: Suitable for constrained header space

### Task 3: Barrel Export (02a2656)
Clean imports:

```typescript
import { ConnectionStatus, SyncIndicator } from '~/components/sync';
```

## Implementation Details

### Status Configuration Pattern
Both components use a config object mapping status to visual properties:

```typescript
const STATUS_CONFIG: Record<SyncStatus, {
  icon: typeof Wifi;
  color: string;
  bgColor: string;
  label: string;
}> = {
  offline: { icon: WifiOff, color: '#6b7280', ... },
  syncing: { icon: RefreshCw, color: '#3b82f6', ... },
  // ...
};
```

This pattern makes adding new states trivial.

### Animation Approach
Used react-native-reanimated's `useAnimatedStyle` with `withRepeat` and `withTiming` for:
- **Spin**: 360deg rotation over 1s for syncing icon
- **Pulse**: Opacity 0.3 to 1.0 over 500ms for connecting/syncing dot

### Hook Integration
Both components consume `useSyncState()` from SyncContext:
- `status`: Current SyncStatus
- `isSyncing`: Boolean for animation triggers
- `isConnected`: Enable/disable sync tap
- `triggerSync()`: Manual sync action
- `pendingChanges`: Count for badge
- `lastSyncedAt`: Date for relative time

## File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `ConnectionStatus.tsx` | 232 | Full status display with details |
| `SyncIndicator.tsx` | 104 | Compact header dot |
| `index.ts` | 13 | Barrel export |

## Success Criteria Verification

- [x] ConnectionStatus shows all sync states with appropriate colors/icons
- [x] SyncIndicator provides minimal header-suitable indicator
- [x] Pending changes badge shows count when offline with changes
- [x] Last synced time formatted as relative time
- [x] Components animate during syncing state
- [x] Error state shows error icon and optional message

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| af166f3 | feat | Create full ConnectionStatus component |
| dc7c4fd | feat | Create compact SyncIndicator for headers |
| 02a2656 | feat | Create barrel export for sync components |

## Next Phase Readiness

### Blockers
None.

### Ready For
- Adding SyncIndicator to tab/stack headers
- Using ConnectionStatus in settings/profile screens
- Future offline indicator features
