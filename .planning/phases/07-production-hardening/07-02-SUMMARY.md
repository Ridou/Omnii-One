---
phase: 07-production-hardening
plan: 02
subsystem: mobile-observability
status: complete
tags: [sentry, expo-notifications, error-tracking, push-notifications, mobile]

dependencies:
  requires:
    - "Phase 0: Monorepo setup with mobile app"
    - "Phase 1-6: Mobile app foundation"
  provides:
    - "Sentry error tracking for mobile app"
    - "Expo push notification infrastructure"
    - "Meeting reminder notification capability"
    - "Workflow completion notification capability"
  affects:
    - "Future mobile error monitoring"
    - "Future user notification features"

tech-stack:
  added:
    - "@sentry/react-native ^7.10.0"
    - "expo-notifications ~0.31.4"
    - "expo-device ~7.1.4"
  patterns:
    - "Sentry mobile SDK initialization"
    - "Expo Push Token registration"
    - "Android notification channels"
    - "Foreground notification handling"
    - "Notification tap navigation"

key-files:
  created:
    - "apps/omnii-mobile/src/lib/sentry.ts"
    - "apps/omnii-mobile/src/services/notifications/channels.ts"
    - "apps/omnii-mobile/src/services/notifications/push-registration.ts"
    - "apps/omnii-mobile/src/services/notifications/notification-handlers.ts"
    - "apps/omnii-mobile/src/services/notifications/index.ts"
  modified:
    - "apps/omnii-mobile/package.json"
    - "apps/omnii-mobile/app.config.js"

decisions:
  - id: "SENTRY-MOBILE-ENV"
    what: "Disable Sentry in development by default"
    why: "Avoid noise from development errors; enable with EXPO_PUBLIC_SENTRY_DEBUG env var"
    alternatives: "Always enabled (creates noise), always disabled (harder to test)"
    impact: "Requires explicit flag to test Sentry integration in development"

  - id: "PUSH-DEVICE-ONLY"
    what: "Push notifications only work on physical devices"
    why: "Expo Push service requires actual device hardware"
    alternatives: "Mock push in simulator (doesn't test real flow)"
    impact: "Testing requires physical device or wait until deployed"

  - id: "ANDROID-CHANNELS"
    what: "Use separate channels for reminders (high) and workflows (default)"
    why: "Android requires channels for notification categories; different importance levels"
    alternatives: "Single channel (less user control), more channels (complexity)"
    impact: "Users can control notification preferences per category"

metrics:
  duration: "3min 16s"
  tasks: 3
  commits: 3
  files-created: 5
  files-modified: 2
  completed: "2026-01-26"
---

# Phase 7 Plan 02: Mobile Observability & Notifications Summary

## One-liner

Sentry error tracking with screenshot capture and Expo push notifications for meeting reminders and workflow completions.

## What Was Built

### 1. Sentry Mobile Error Tracking
- **lib/sentry.ts**: Initialization with environment-based configuration
- **Features**: Screenshot capture, view hierarchy, 20% sample rate in production
- **Development mode**: Disabled by default unless `EXPO_PUBLIC_SENTRY_DEBUG` set
- **Expo plugin**: Configured in app.config.js for build integration

### 2. Push Notification Infrastructure
- **Push token registration**: `registerForPushNotifications()` with permission handling
- **Device detection**: Requires physical device (not simulator/emulator)
- **Token refresh**: Listener for Expo Push Token rotation
- **Foreground behavior**: Configured to show banner, play sound, set badge

### 3. Android Notification Channels
- **Reminders channel**: High importance for meeting alerts
  - Vibration pattern, indigo light color
  - Default sound
- **Workflows channel**: Default importance for workflow updates
  - Emerald light color
  - Default sound

### 4. Notification Handlers
- **Meeting reminders**: `scheduleMeetingReminder()` with configurable minutes
  - Validates trigger time isn't in past
  - Navigates to timeline on tap
- **Workflow completions**: `notifyWorkflowComplete()` for immediate notifications
  - Success/failure differentiation
  - Navigates to home on tap
- **Response handling**: Setup listeners for notification received and tap events

### 5. Expo Config Updates
- Added `expo-notifications` plugin
- Added `@sentry/react-native/expo` plugin with org/project config
- Added `POST_NOTIFICATIONS` Android permission

## Decisions Made

### SENTRY-MOBILE-ENV: Development Mode Disabled
**Decision**: Disable Sentry in development unless `EXPO_PUBLIC_SENTRY_DEBUG` set

**Context**: Development generates many expected errors (hot reload, experiments, debugging)

**Rationale**:
- Production errors are what matter for monitoring
- Development errors create noise in Sentry dashboard
- Explicit flag allows Sentry testing when needed

**Tradeoffs**:
- Requires remembering to set flag for Sentry integration testing
- Benefits: Clean Sentry data, focused on real production issues

### PUSH-DEVICE-ONLY: Physical Device Requirement
**Decision**: Push notifications only work on physical devices, gracefully fail on simulator

**Context**: Expo Push service requires device hardware; simulators can't receive push

**Rationale**:
- Check `Device.isDevice` before registration
- Warn and return null instead of crashing
- Allows app to run in simulator without push

**Tradeoffs**:
- Full push testing requires physical device or deployment
- Benefits: App runs in all environments, clear error messages

### ANDROID-CHANNELS: Separate Categories
**Decision**: Use high importance for reminders, default for workflows

**Context**: Android requires channels; users control notification behavior per channel

**Rationale**:
- Meeting reminders are time-sensitive (high importance)
- Workflow completions are informational (default importance)
- Users can customize per category

**Tradeoffs**:
- More channels = more configuration
- Benefits: Better user control, appropriate urgency levels

## Technical Implementation

### Sentry Initialization Pattern
```typescript
// Environment-based configuration
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  attachScreenshot: true,
  attachViewHierarchy: true,
  enabled: !__DEV__ || !!process.env.EXPO_PUBLIC_SENTRY_DEBUG,
});
```

### Push Token Registration Flow
1. Check if physical device
2. Check existing permissions
3. Request permissions if not granted
4. Setup Android channels (if Android)
5. Get Expo Push Token with project ID
6. Cache token for reuse
7. Setup token refresh listener

### Notification Data Structure
```typescript
interface NotificationData {
  type: 'meeting_reminder' | 'workflow_completion';
  meetingId?: string;
  workflowName?: string;
  success?: boolean;
}
```

## Files Changed

### Created (5 files)
1. **apps/omnii-mobile/src/lib/sentry.ts** - Sentry initialization
2. **apps/omnii-mobile/src/services/notifications/channels.ts** - Android channels
3. **apps/omnii-mobile/src/services/notifications/push-registration.ts** - Token management
4. **apps/omnii-mobile/src/services/notifications/notification-handlers.ts** - Notification logic
5. **apps/omnii-mobile/src/services/notifications/index.ts** - Barrel exports

### Modified (2 files)
1. **apps/omnii-mobile/package.json** - Added 3 dependencies
2. **apps/omnii-mobile/app.config.js** - Added plugins and Android permissions

## Testing & Validation

### TypeScript Compilation
✅ All new files compile without errors
✅ No new TypeScript errors introduced

### Dependencies Verified
✅ @sentry/react-native ^7.10.0 installed
✅ expo-notifications ~0.31.4 installed
✅ expo-device ~7.1.4 installed

### Expo Config Valid
✅ `npx expo config --type introspect` succeeds
✅ Sentry plugin configured
✅ Notifications plugin configured
✅ Android permissions added

### Manual Testing Required (Post-Deployment)
- [ ] Sentry captures errors in production
- [ ] Push token obtained on physical device
- [ ] Meeting reminder scheduled and received
- [ ] Workflow completion notification received
- [ ] Tapping notifications navigates correctly
- [ ] Android notification channels visible in settings

## Deviations from Plan

None - plan executed exactly as written.

## Blockers & Issues

None encountered during execution.

## Next Phase Readiness

### Required for Production
1. **Environment Variables**: Set `EXPO_PUBLIC_SENTRY_DSN` in production
2. **Sentry Project**: Create Sentry project and get DSN
3. **EAS Project**: Ensure EAS project ID exists in app.config.js (already present)
4. **Physical Device**: Full testing requires device or deployed build

### Optional Enhancements
- Add notification scheduling to calendar sync
- Add notification to workflow completion hooks
- Configure custom notification sounds
- Add notification preference settings UI

### Integration Points
- **Plan 07-03**: Real user testing will validate notifications work
- **Plan 07-04**: Production deployment will enable Sentry in production environment
- **Calendar ingestion**: Can hook into meeting reminder scheduling
- **n8n workflows**: Can trigger workflow completion notifications

## Related Requirements

**Satisfied**:
- REQ-ORCH-03 (partial): Push notification infrastructure for user alerts
- Production hardening success criteria 3: Error tracking in mobile app

**Enabled for future**:
- Meeting reminder notifications (when calendar sync integrated)
- Workflow automation notifications (when n8n workflows trigger events)
- Production error monitoring and debugging

---

**Execution**: Completed in 3min 16s
**Status**: Ready for integration and testing
**Commits**:
- 38b871d: chore(07-02): install Sentry and Expo notifications dependencies
- a6d3470: feat(07-02): add Sentry mobile initialization
- 0e95e07: feat(07-02): add push notification services
