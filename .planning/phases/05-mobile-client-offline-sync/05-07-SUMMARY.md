---
phase: "05"
plan: "07"
subsystem: mobile-integrations
tags: [oauth, google, composio, mobile, expo-web-browser]
dependency-graph:
  requires: ["05-06"]
  provides: ["google-connection-hook", "google-connection-manager-ui"]
  affects: ["05-08"]
tech-stack:
  added: []
  patterns: ["expo-web-browser-oauth", "mcp-backend-integration"]
key-files:
  created:
    - apps/omnii-mobile/src/hooks/useGoogleConnection.ts
    - apps/omnii-mobile/src/components/integrations/GoogleConnectionManager.tsx
  modified:
    - apps/omnii-mobile/src/app/(tabs)/profile.tsx
decisions:
  - key: dual-google-integration
    choice: "Added GoogleConnectionManager alongside existing GoogleIntegrationCard"
    reason: "Existing GoogleIntegrationCard uses local Supabase oauth_tokens; new component uses MCP backend Composio OAuth for proper server-side data ingestion"
  - key: expo-linking-import
    choice: "Use expo-linking instead of react-native Linking"
    reason: "Linking.createURL is expo-linking API for creating deep link URLs"
metrics:
  duration: 3min
  completed: 2026-01-26
---

# Phase 5 Plan 07: Google OAuth Connection Management Summary

Hook and UI for managing Google service connections from mobile app via MCP backend Composio OAuth.

## What Was Built

### 1. useGoogleConnection Hook (`apps/omnii-mobile/src/hooks/useGoogleConnection.ts`)
React hook providing state and actions for Google OAuth connection management:
- **Types**: `GoogleService` union type, `ServiceConnection` interface, `GoogleConnectionState` interface
- **State**: `isLoading`, `isConnecting`, `error`, `connections[]`, `overallStatus`
- **Actions**:
  - `connect()` - Initiates OAuth via expo-web-browser, calls `/api/ingestion/connect`
  - `disconnect()` - Disconnects all services via `/api/ingestion/disconnect`
  - `triggerSync(service)` - Manual sync via `/api/ingestion/sync/:service`
  - `refresh()` - Refetch status from `/api/ingestion/status/:userId`
- **Auto-behavior**: Fetches status on mount and when user changes

### 2. GoogleConnectionManager UI (`apps/omnii-mobile/src/components/integrations/GoogleConnectionManager.tsx`)
Visual management component for Google services:
- **SERVICE_CONFIG**: Icon, label, color per service (Calendar, Tasks, Gmail, Contacts)
- **ServiceRow**: Individual service row with icon, status, sync button
- **Header**: Status dot (green/yellow/gray), refresh button
- **Error display**: AlertCircle icon with message
- **Connect button**: Initiates OAuth flow
- **Disconnect button**: Confirmation dialog before removing connection
- **Dark mode**: Full support via useTheme

### 3. Profile Integration (`apps/omnii-mobile/src/app/(tabs)/profile.tsx`)
Added "Connected Services" section to the Connect tab:
- Imported GoogleConnectionManager component
- Section header with dark mode styling
- Placed after existing GoogleIntegrationCard

## Key Implementation Details

### OAuth Flow
1. User taps "Connect Google Account"
2. Hook POSTs to `/api/ingestion/connect` with service + userId + redirectUrl
3. Backend returns Composio OAuth URL
4. expo-web-browser opens OAuth session
5. User authorizes in browser
6. Redirect back to app
7. Hook fetches updated status

### Status Response Mapping
Backend returns:
```json
{
  "userId": "...",
  "connections": [
    { "service": "calendar", "connected": true, "syncStatus": { "lastSync": "...", "itemsSynced": 10 } }
  ]
}
```
Hook maps to `ServiceConnection[]` with fallback for missing services.

### Coexistence with Legacy Integration
The existing `GoogleIntegrationCard` component uses local Supabase `oauth_tokens` table for Google auth. The new `GoogleConnectionManager` uses MCP backend's Composio-based OAuth which stores credentials server-side and enables proper data ingestion workflows.

Both are shown in the profile Connect tab, allowing users to use either approach.

## Verification

- [x] useGoogleConnection fetches status from /api/ingestion/status
- [x] connect() calls /api/ingestion/connect and opens OAuth URL
- [x] disconnect() calls /api/ingestion/disconnect with confirmation dialog
- [x] triggerSync() calls /api/ingestion/sync/:service
- [x] UI shows connection status per service with icons
- [x] Connect button opens OAuth browser session
- [x] Disconnect shows confirmation dialog before disconnecting
- [x] Profile screen displays the connection manager
- [x] TypeScript compiles without errors for all new files

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change Type | Lines |
|------|-------------|-------|
| `apps/omnii-mobile/src/hooks/useGoogleConnection.ts` | Created | 317 |
| `apps/omnii-mobile/src/components/integrations/GoogleConnectionManager.tsx` | Created | 364 |
| `apps/omnii-mobile/src/app/(tabs)/profile.tsx` | Modified | +12/-2 |

## Commits

| Hash | Message |
|------|---------|
| 3066727 | feat(05-07): add useGoogleConnection hook for MCP OAuth |
| 8a7253d | feat(05-07): add GoogleConnectionManager UI component |
| eedb359 | feat(05-07): add GoogleConnectionManager to profile screen |

## Dependencies

### Required By This Plan
- Plan 05-06: MCP API client and hooks (getMcpBaseUrl)
- Plan 04-04: Ingestion routes (/api/ingestion/*)

### Provides For Future Plans
- Plan 05-08: May use connection status for sync triggers
- Any plan needing Google service connection from mobile

## Next Phase Readiness

Ready for Plan 05-08. All Google OAuth connection management UI is in place:
- Users can connect Google account from mobile
- Connection status displays per service
- Manual sync can be triggered
- Disconnect with confirmation

The component will enable users to connect their Google services so data can flow through the MCP backend ingestion pipeline into their Neo4j graph database.
