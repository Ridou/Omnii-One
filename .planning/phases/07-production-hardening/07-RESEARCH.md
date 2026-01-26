# Phase 7: Production Hardening - Research

**Researched:** 2026-01-25
**Domain:** Mobile notifications, observability, performance monitoring, data portability, version history
**Confidence:** MEDIUM

## Summary

Phase 7 focuses on production-readiness: push notifications for mobile, adaptive sync based on network conditions, error tracking with Sentry, performance monitoring with OpenTelemetry, GDPR-compliant data export, and version history for AI-generated changes. Research reveals established solutions for each domain.

Push notifications use Expo's built-in `expo-notifications` package with Expo Push Notification service. Error tracking uses `@sentry/react-native` for mobile and `@sentry/bun` for backend. Performance monitoring leverages OpenTelemetry with Elysia's official plugin (`@elysiajs/opentelemetry`). Adaptive sync builds on PowerSync's existing retry mechanisms with network detection via `@react-native-community/netinfo`. Data export follows GDPR Article 20 requirements using JSON/CSV/Markdown formats. Version history requires implementing a temporal versioning pattern in Neo4j using entity-state separation.

The main challenges are: (1) PowerSync doesn't have built-in adaptive sync frequency - must implement custom logic using NetInfo, (2) Neo4j temporal versioning requires custom schema design since there's no built-in support, and (3) coordinating Sentry across mobile and backend requires shared DSN configuration and source map uploads.

**Primary recommendation:** Use established libraries for each domain (expo-notifications, @sentry/*, @elysiajs/opentelemetry, @react-native-community/netinfo), implement custom adaptive sync controller using NetInfo events, add temporal versioning schema to Neo4j with entity-state separation pattern, and build GDPR-compliant export endpoints.

## Standard Stack

The established libraries/tools for production hardening:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-notifications | ^0.30.x | Push notifications | Official Expo SDK, handles FCM/APNs, Expo Push service |
| @sentry/react-native | ^7.8.0 | Mobile error tracking | Industry standard, Expo integration, source maps |
| @sentry/bun | ^8.x | Backend error tracking | Official Bun SDK, first-class support |
| @elysiajs/opentelemetry | ^1.x | Performance tracing | Official Elysia plugin, auto-instrumentation |
| @react-native-community/netinfo | ^11.x | Network detection | Community standard, detailed connection info |
| pino | ^10.3.0 | Performance logging | Already in use (Phase 6), extend for metrics |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-device | ^7.x | Device detection | Required for push notification setup |
| expo-constants | ^17.x | Project configuration | Push token projectId |
| @opentelemetry/sdk-node | ^1.x | OTel SDK | Core telemetry infrastructure |
| @opentelemetry/exporter-prometheus | ^0.x | Prometheus metrics | If using Prometheus for monitoring |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sentry | Bugsnag, Datadog | Sentry has better React Native support and free tier |
| OpenTelemetry | Datadog APM | OTel is vendor-neutral, Elysia has official plugin |
| NetInfo | expo-network | NetInfo more detailed, community-maintained |
| Pino metrics | OpenTelemetry Metrics | Pino simpler for basic performance logs, OTel for full observability |

**Installation:**
```bash
# Mobile dependencies
cd apps/omnii-mobile
npx expo install expo-notifications expo-device
bun add @sentry/react-native @react-native-community/netinfo

# Backend dependencies
cd apps/omnii_mcp
bun add @sentry/bun @elysiajs/opentelemetry @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-proto
```

## Architecture Patterns

### Recommended Project Structure
```
apps/omnii-mobile/src/
├── services/
│   ├── notifications/
│   │   ├── push-registration.ts      # Token registration, permissions
│   │   ├── notification-handlers.ts  # Received/response handlers
│   │   └── channels.ts               # Android notification channels
│   └── sync/
│       ├── adaptive-controller.ts    # Network-aware sync frequency
│       └── network-monitor.ts        # NetInfo integration
├── lib/
│   └── sentry.ts                     # Sentry initialization

apps/omnii_mcp/src/
├── services/
│   ├── observability/
│   │   ├── sentry.ts                 # Sentry backend init
│   │   ├── telemetry.ts              # OpenTelemetry setup
│   │   └── metrics.ts                # Custom metrics definitions
│   └── export/
│       ├── data-exporter.ts          # Core export logic
│       ├── formatters/
│       │   ├── json.ts               # JSON formatter
│       │   ├── csv.ts                # CSV formatter
│       │   └── markdown.ts           # Markdown formatter
│       └── index.ts
├── graph/
│   └── versioning/
│       ├── temporal-schema.ts        # Version history schema
│       ├── version-operations.ts     # Create version, rollback
│       └── index.ts
└── routes/
    ├── export.ts                     # Data export endpoints
    └── version-history.ts            # Version/rollback endpoints
```

### Pattern 1: Push Notification Setup (Expo)
**What:** Register device, request permissions, handle notifications
**When to use:** Mobile app initialization
**Example:**
```typescript
// Source: https://docs.expo.dev/push-notifications/push-notifications-setup/
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure notification handler (foreground behavior)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  // Android: Set up notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Meeting Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync('workflows', {
      name: 'Workflow Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token.data;
}
```

### Pattern 2: Adaptive Sync with Network Detection
**What:** Adjust sync frequency based on network type and quality
**When to use:** Mobile sync controller
**Example:**
```typescript
// Source: https://github.com/react-native-netinfo/react-native-netinfo
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type SyncFrequency = 'realtime' | 'frequent' | 'conservative' | 'paused';

interface AdaptiveSyncConfig {
  realtimeInterval: number;      // WiFi, good connection: 0 (stream)
  frequentInterval: number;      // Cellular, good: 30s
  conservativeInterval: number;  // Cellular, poor: 300s (5 min)
}

const DEFAULT_CONFIG: AdaptiveSyncConfig = {
  realtimeInterval: 0,
  frequentInterval: 30000,
  conservativeInterval: 300000,
};

export class AdaptiveSyncController {
  private currentFrequency: SyncFrequency = 'paused';
  private unsubscribe: (() => void) | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private config: AdaptiveSyncConfig;
  private onSync: () => Promise<void>;

  constructor(onSync: () => Promise<void>, config = DEFAULT_CONFIG) {
    this.onSync = onSync;
    this.config = config;
  }

  start(): void {
    this.unsubscribe = NetInfo.addEventListener(this.handleNetworkChange);
    // Get initial state
    NetInfo.fetch().then(this.handleNetworkChange);
  }

  stop(): void {
    this.unsubscribe?.();
    this.clearSyncTimer();
  }

  private handleNetworkChange = (state: NetInfoState): void => {
    const newFrequency = this.determineFrequency(state);

    if (newFrequency !== this.currentFrequency) {
      console.log(`[AdaptiveSync] Changing frequency: ${this.currentFrequency} -> ${newFrequency}`);
      this.currentFrequency = newFrequency;
      this.adjustSyncBehavior();
    }
  };

  private determineFrequency(state: NetInfoState): SyncFrequency {
    if (!state.isConnected || !state.isInternetReachable) {
      return 'paused';
    }

    const details = state.details as any;

    // WiFi: real-time streaming
    if (state.type === 'wifi') {
      return 'realtime';
    }

    // Cellular: check connection quality
    if (state.type === 'cellular') {
      const generation = details?.cellularGeneration;
      // 4G/5G: frequent polling
      if (generation === '4g' || generation === '5g') {
        return 'frequent';
      }
      // 3G or worse: conservative
      return 'conservative';
    }

    return 'frequent'; // Default for other connection types
  }

  private adjustSyncBehavior(): void {
    this.clearSyncTimer();

    switch (this.currentFrequency) {
      case 'realtime':
        // Use PowerSync streaming (no timer needed)
        this.onSync();
        break;
      case 'frequent':
        this.startPolling(this.config.frequentInterval);
        break;
      case 'conservative':
        this.startPolling(this.config.conservativeInterval);
        break;
      case 'paused':
        // Don't sync, wait for reconnection
        break;
    }
  }

  private startPolling(interval: number): void {
    this.syncTimer = setInterval(() => {
      this.onSync().catch(console.error);
    }, interval);
  }

  private clearSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}
```

### Pattern 3: Sentry Backend Initialization (Bun)
**What:** Configure Sentry for backend error tracking
**When to use:** Application startup (before Elysia)
**Example:**
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/bun/
// File: src/services/observability/sentry.ts
import * as Sentry from '@sentry/bun';

export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    console.warn('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Enable PII capture for better debugging
    sendDefaultPii: true,

    // Enable Sentry logging
    enableLogs: true,

    // Ignore common non-errors
    ignoreErrors: [
      'AbortError',
      'NetworkError',
      'TimeoutError',
    ],

    // Before send hook for PII scrubbing
    beforeSend(event) {
      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(bc => {
          if (bc.data?.password) bc.data.password = '[REDACTED]';
          if (bc.data?.token) bc.data.token = '[REDACTED]';
          return bc;
        });
      }
      return event;
    },
  });
}

// Capture exceptions with context
export function captureError(error: Error, context?: Record<string, any>): void {
  Sentry.withScope(scope => {
    if (context?.userId) scope.setUser({ id: context.userId });
    if (context?.tags) Object.entries(context.tags).forEach(([k, v]) => scope.setTag(k, v));
    if (context?.extra) Object.entries(context.extra).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(error);
  });
}
```

### Pattern 4: OpenTelemetry with Elysia
**What:** Add distributed tracing and performance metrics
**When to use:** Backend observability
**Example:**
```typescript
// Source: https://elysiajs.com/plugins/opentelemetry
import { Elysia } from 'elysia';
import { opentelemetry } from '@elysiajs/opentelemetry';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

// Custom metrics for Phase 7 requirements
interface PerformanceMetrics {
  apiLatency: (route: string, duration: number) => void;
  graphQueryDuration: (queryType: string, duration: number) => void;
  syncDuration: (source: string, duration: number) => void;
}

export function createObservableApp(): Elysia {
  const app = new Elysia()
    .use(
      opentelemetry({
        serviceName: 'omnii-mcp',
        spanProcessors: [
          new BatchSpanProcessor(
            new OTLPTraceExporter({
              url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
            })
          ),
        ],
      })
    )
    // Add timing middleware for API latency tracking
    .onRequest(({ request, store }) => {
      (store as any).requestStart = performance.now();
    })
    .onAfterResponse(({ request, store, set }) => {
      const duration = performance.now() - (store as any).requestStart;
      const route = new URL(request.url).pathname;

      // Log to Pino for metrics aggregation
      performanceLogger.info({
        metric: 'api_latency',
        route,
        duration,
        status: set.status,
      });
    });

  return app;
}

// Graph query performance wrapper
export async function timedGraphQuery<T>(
  queryType: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await operation();
  } finally {
    const duration = performance.now() - start;
    performanceLogger.info({
      metric: 'graph_query_duration',
      queryType,
      duration,
    });
  }
}
```

### Pattern 5: Neo4j Temporal Versioning (Entity-State Separation)
**What:** Track history of all node changes with rollback capability
**When to use:** AI-generated changes that users might want to revert
**Example:**
```typescript
// Source: https://medium.com/neo4j/keeping-track-of-graph-changes-using-temporal-versioning
// https://neo4j.com/docs/getting-started/data-modeling/versioning/

// Schema: Entity nodes hold identity, State nodes hold mutable data
// (:Entity)-[:HAS_STATE]->(:State)-[:PREVIOUS]->(:State)

interface VersionedNode {
  entityId: string;
  stateId: string;
  version: number;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: 'user' | 'ai_assistant' | 'system';
  changeDescription?: string;
}

export class VersionedGraphOperations {
  constructor(private httpClient: Neo4jHttpClient) {}

  /**
   * Create a new version of a node.
   * Preserves full history chain.
   */
  async createVersion(
    entityId: string,
    data: Record<string, unknown>,
    createdBy: 'user' | 'ai_assistant' | 'system',
    changeDescription?: string
  ): Promise<VersionedNode> {
    const stateId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get current version number
    const currentVersion = await this.getCurrentVersion(entityId);
    const newVersion = currentVersion + 1;

    const query = `
      MATCH (e:Entity {id: $entityId})
      OPTIONAL MATCH (e)-[r:HAS_STATE]->(currentState:State)
      WHERE r.current = true

      // Create new state
      CREATE (newState:State {
        id: $stateId,
        version: $newVersion,
        data: $data,
        createdAt: $now,
        createdBy: $createdBy,
        changeDescription: $changeDescription
      })

      // Link to entity
      CREATE (e)-[:HAS_STATE {current: true}]->(newState)

      // Update old current state if exists
      FOREACH (_ IN CASE WHEN currentState IS NOT NULL THEN [1] ELSE [] END |
        SET r.current = false
        CREATE (newState)-[:PREVIOUS]->(currentState)
      )

      RETURN newState
    `;

    const result = await this.httpClient.query(query, {
      entityId,
      stateId,
      newVersion,
      data: JSON.stringify(data),
      now,
      createdBy,
      changeDescription,
    });

    return {
      entityId,
      stateId,
      version: newVersion,
      data,
      createdAt: now,
      createdBy,
      changeDescription,
    };
  }

  /**
   * Get version history for an entity.
   */
  async getVersionHistory(entityId: string, limit = 10): Promise<VersionedNode[]> {
    const query = `
      MATCH (e:Entity {id: $entityId})-[:HAS_STATE]->(state:State)
      OPTIONAL MATCH (state)-[:PREVIOUS*0..]->(olderState:State)
      RETURN state
      ORDER BY state.version DESC
      LIMIT $limit
    `;

    const result = await this.httpClient.query(query, { entityId, limit });
    return result.map(this.mapToVersionedNode);
  }

  /**
   * Rollback to a specific version.
   * Creates a new version with the old data (preserves history).
   */
  async rollbackToVersion(
    entityId: string,
    targetVersion: number
  ): Promise<VersionedNode> {
    // Get the target version's data
    const targetState = await this.getVersion(entityId, targetVersion);

    if (!targetState) {
      throw new Error(`Version ${targetVersion} not found for entity ${entityId}`);
    }

    // Create new version with old data
    return this.createVersion(
      entityId,
      targetState.data,
      'user',
      `Rollback to version ${targetVersion}`
    );
  }
}
```

### Pattern 6: GDPR Data Export
**What:** Export user data in JSON, CSV, or Markdown formats
**When to use:** User data portability requests
**Example:**
```typescript
// Source: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-data-portability/

type ExportFormat = 'json' | 'csv' | 'markdown';

interface ExportOptions {
  userId: string;
  format: ExportFormat;
  includeRelationships?: boolean;
  nodeTypes?: string[];
}

export class DataExporter {
  constructor(private graphClient: Neo4jHttpClient) {}

  async exportUserData(options: ExportOptions): Promise<string> {
    const { userId, format, includeRelationships = true, nodeTypes } = options;

    // Fetch all user data from graph
    const data = await this.fetchUserData(userId, nodeTypes, includeRelationships);

    switch (format) {
      case 'json':
        return this.formatAsJson(data);
      case 'csv':
        return this.formatAsCsv(data);
      case 'markdown':
        return this.formatAsMarkdown(data);
    }
  }

  private async fetchUserData(
    userId: string,
    nodeTypes?: string[],
    includeRelationships: boolean
  ): Promise<ExportData> {
    const types = nodeTypes?.length
      ? nodeTypes.map(t => `n:${t}`).join(' OR ')
      : 'n:Concept OR n:Entity OR n:Event OR n:Contact';

    const query = `
      MATCH (n)
      WHERE n.userId = $userId AND (${types})
      ${includeRelationships ? 'OPTIONAL MATCH (n)-[r]-(m)' : ''}
      RETURN n, ${includeRelationships ? 'collect(DISTINCT {type: type(r), target: m.id}) as relationships' : '[] as relationships'}
    `;

    return this.graphClient.query(query, { userId });
  }

  private formatAsJson(data: ExportData): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      format: 'GDPR Data Export',
      ...data,
    }, null, 2);
  }

  private formatAsCsv(data: ExportData): string {
    // Flatten nodes into CSV rows
    const headers = ['type', 'id', 'name', 'createdAt', 'properties'];
    const rows = data.nodes.map(node => [
      node.labels.join(','),
      node.id,
      node.name,
      node.createdAt,
      JSON.stringify(node.properties),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private formatAsMarkdown(data: ExportData): string {
    let md = `# Data Export\n\n`;
    md += `**Export Date:** ${new Date().toISOString()}\n\n`;

    // Group by type
    const grouped = this.groupByType(data.nodes);

    for (const [type, nodes] of Object.entries(grouped)) {
      md += `## ${type}s\n\n`;
      for (const node of nodes) {
        md += `### ${node.name}\n`;
        md += `- **ID:** ${node.id}\n`;
        md += `- **Created:** ${node.createdAt}\n`;
        if (node.description) md += `- **Description:** ${node.description}\n`;
        md += '\n';
      }
    }

    return md;
  }
}
```

### Anti-Patterns to Avoid
- **Push notifications on emulators:** Push notifications don't work on emulators/simulators - always test on physical devices
- **Constant background sync:** Drains battery and data - use adaptive sync based on network quality
- **Logging full request/response in Sentry:** PII leakage risk - use beforeSend hook to scrub sensitive data
- **Polling for version history:** Inefficient - use graph traversal with [:PREVIOUS] relationship chain
- **Storing metrics in Neo4j:** Not designed for time-series - use Prometheus/InfluxDB or structured logs
- **Blocking export for large datasets:** Use streaming response with chunked encoding

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push notification delivery | Custom FCM/APNs integration | Expo Push Notification service | Handles token management, delivery tracking, cross-platform |
| Network connectivity detection | Custom ping/fetch checks | @react-native-community/netinfo | Detailed connection info, cellular generation, event subscription |
| Error tracking with sourcemaps | Custom error logging | @sentry/react-native | Source map integration, breadcrumbs, user context |
| API request tracing | Manual span creation | @elysiajs/opentelemetry | Auto-instrumentation, distributed tracing |
| CSV generation | String concatenation | Fast-csv or Papaparse | Handles escaping, quotes, streaming, edge cases |
| Graph versioning | Custom property updates | Entity-State pattern with [:PREVIOUS] chain | Proven pattern, clean rollback, full history |

**Key insight:** Production observability has mature tooling. The cost of maintaining custom solutions far exceeds the integration effort of established libraries. Sentry + OpenTelemetry + Pino provide complete coverage.

## Common Pitfalls

### Pitfall 1: Push Token Expiration
**What goes wrong:** Push tokens can change while app is running, causing silent notification failures
**Why it happens:** FCM/APNs rotate tokens for security; old tokens become invalid
**How to avoid:** Listen for `Notifications.addPushTokenListener()` events, update backend immediately on token change
**Warning signs:** Notifications suddenly stop working for some users, no error in logs

### Pitfall 2: Sentry Source Map Upload Failure
**What goes wrong:** Production errors show minified code instead of source
**Why it happens:** Source maps not uploaded during build, wrong release version
**How to avoid:** Configure `@sentry/react-native/expo` plugin in app.json, set `SENTRY_AUTH_TOKEN` as EAS secret, verify release version matches
**Warning signs:** Stack traces show bundled code like `t.default.call(e,n)` instead of function names

### Pitfall 3: Adaptive Sync Battery Drain
**What goes wrong:** Mobile app drains battery even with adaptive sync
**Why it happens:** Sync timer not cleared on background, NetInfo listener not unsubscribed
**How to avoid:** Use `AppState.addEventListener` to pause sync when backgrounded, properly cleanup in useEffect return
**Warning signs:** Battery usage reports show app as high consumer, user complaints

### Pitfall 4: Version History Storage Explosion
**What goes wrong:** Graph database grows unbounded with version history
**Why it happens:** Every edit creates a new State node, no TTL or compaction
**How to avoid:** Implement version retention policy (e.g., keep last 50 versions or 90 days), periodic cleanup job
**Warning signs:** Database size growth outpacing data growth, query slowdown

### Pitfall 5: Data Export Timeout for Large Datasets
**What goes wrong:** Export request times out for users with lots of data
**Why it happens:** Trying to fetch and format all data in single request
**How to avoid:** Use streaming response with chunked transfer encoding, paginate graph queries, consider background job with download link
**Warning signs:** 504 Gateway Timeout errors, incomplete exports

### Pitfall 6: OpenTelemetry Overhead in Development
**What goes wrong:** Development server becomes slow with full tracing
**Why it happens:** Trace sampling at 100%, exporter trying to connect to non-existent collector
**How to avoid:** Disable OTel in development or use NoopSpanProcessor, configure based on NODE_ENV
**Warning signs:** Dev server startup takes 10+ seconds, console warnings about collector connection

## Code Examples

Verified patterns from official sources:

### Meeting Reminder Notification
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/notifications/
import * as Notifications from 'expo-notifications';

export async function scheduleMeetingReminder(
  meetingId: string,
  title: string,
  startsAt: Date,
  reminderMinutes: number = 10
): Promise<string> {
  const triggerTime = new Date(startsAt.getTime() - reminderMinutes * 60 * 1000);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meeting Reminder',
      body: `${title} starts in ${reminderMinutes} minutes`,
      data: { meetingId, type: 'meeting_reminder' },
      categoryIdentifier: 'meeting_actions', // iOS: actionable
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerTime,
      channelId: 'reminders', // Android channel
    },
  });

  return notificationId;
}

// Cancel if meeting is deleted
export async function cancelMeetingReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
```

### Workflow Completion Notification
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/notifications/
export async function notifyWorkflowComplete(
  workflowName: string,
  success: boolean,
  details?: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: success ? 'Workflow Complete' : 'Workflow Failed',
      body: success
        ? `${workflowName} finished successfully`
        : `${workflowName} encountered an error${details ? `: ${details}` : ''}`,
      data: {
        type: 'workflow_completion',
        workflowName,
        success,
      },
    },
    trigger: null, // Deliver immediately
  });
}
```

### Sentry Mobile Initialization
```typescript
// Source: https://docs.sentry.io/platforms/react-native/manual-setup/expo/
// File: app/_layout.tsx
import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef } from 'expo-router';
import { useEffect } from 'react';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enableAutoSessionTracking: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,

  // Expo Router navigation tracking
  integrations: [
    new Sentry.ReactNavigationInstrumentation(),
  ],
});

function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (navigationRef) {
      Sentry.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  return (
    // ... layout content
  );
}

export default Sentry.wrap(RootLayout);
```

### Performance Metrics Logger
```typescript
// Source: Existing Pino audit logger pattern, extend for metrics
import pino from 'pino';

export const performanceLogger = pino({
  name: 'omnii-metrics',
  level: 'info',
  base: {
    service: 'omnii-mcp',
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Metric types for structured logging
export interface ApiMetric {
  metric: 'api_latency';
  route: string;
  duration: number;
  status: number;
}

export interface GraphQueryMetric {
  metric: 'graph_query_duration';
  queryType: string;
  duration: number;
  resultCount?: number;
}

export interface SyncMetric {
  metric: 'sync_duration';
  source: 'calendar' | 'tasks' | 'gmail' | 'contacts';
  duration: number;
  itemsSynced: number;
}

export function logMetric(metric: ApiMetric | GraphQueryMetric | SyncMetric): void {
  performanceLogger.info(metric);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sentry-expo package | @sentry/react-native with Expo plugin | Expo SDK 50+ (2024) | Unified SDK, better source maps |
| Manual FCM/APNs setup | Expo Push Notification service | 2023 | Simplified cross-platform, handles token management |
| Custom network polling | @react-native-community/netinfo v11 | 2024 | Cellular generation detection, detailed state |
| Winston logging | Pino (5x faster) | 2024-2025 | Performance critical for high-volume metrics |
| Custom graph versioning | Entity-State temporal pattern | 2025 | Proven Neo4j pattern with rollback support |
| Vendor-specific APM | OpenTelemetry | 2024-2025 | Vendor-neutral, growing ecosystem, Elysia plugin |

**Deprecated/outdated:**
- **sentry-expo:** Use `@sentry/react-native` with Expo config plugin for Expo SDK 50+
- **Expo NetworkInfo:** Superseded by `@react-native-community/netinfo` with more detailed info
- **Manual Push token management:** Expo Push handles this automatically
- **Polling-based sync:** Use streaming with PowerSync, poll only as fallback

## Open Questions

Things that couldn't be fully resolved:

1. **PowerSync Adaptive Sync Built-in Support**
   - What we know: PowerSync uses streaming sync, auto-retries on failure
   - What's unclear: Does PowerSync expose hooks for custom sync frequency control? Does it detect network quality internally?
   - Recommendation: Implement adaptive sync layer on top of PowerSync using NetInfo, treat PowerSync as the sync engine

2. **Sentry Bun Performance Overhead**
   - What we know: @sentry/bun is official SDK, supports tracing
   - What's unclear: What's the performance overhead in Bun specifically? Benchmarks not found
   - Recommendation: Configure sampling rate (10% in production), monitor baseline performance before/after

3. **Neo4j Temporal Versioning at Scale**
   - What we know: Entity-State pattern works, [:PREVIOUS] chain for history
   - What's unclear: Query performance with 1000s of versions per entity? Index requirements?
   - Recommendation: Create index on State.version, implement version limit (50-100), test with realistic data volumes

4. **Push Notification Delivery Guarantees**
   - What we know: Expo Push service handles delivery to FCM/APNs
   - What's unclear: What happens if notification fails? Retry behavior? How to track delivery status?
   - Recommendation: Implement notification receipt tracking in backend, use Expo Push receipts API for delivery confirmation

## Sources

### Primary (HIGH confidence)
- [Expo Push Notifications Documentation](https://docs.expo.dev/push-notifications/push-notifications-setup/) - Official setup guide
- [Expo Notifications SDK Reference](https://docs.expo.dev/versions/latest/sdk/notifications/) - Full API reference
- [Sentry for Bun](https://docs.sentry.io/platforms/javascript/guides/bun/) - Official Bun SDK setup
- [Sentry for Expo](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) - React Native Expo integration
- [ElysiaJS OpenTelemetry Plugin](https://elysiajs.com/plugins/opentelemetry) - Official Elysia plugin docs
- [Neo4j Versioning Guide](https://neo4j.com/docs/getting-started/data-modeling/versioning/) - Official versioning patterns

### Secondary (MEDIUM confidence)
- [React Native NetInfo](https://github.com/react-native-netinfo/react-native-netinfo) - Community standard for network detection
- [Neo4j Temporal Versioning (Medium)](https://medium.com/neo4j/keeping-track-of-graph-changes-using-temporal-versioning) - Entity-State pattern deep dive
- [GDPR Data Portability (ICO)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-data-portability/) - UK ICO guidance on Article 20
- [Offline-First Sync Patterns](https://developersvoice.com/blog/mobile/offline-first-sync-patterns/) - Adaptive sync best practices
- [Bun Performance Monitoring (Uptrace)](https://bun.uptrace.dev/guide/performance-monitoring.html) - OpenTelemetry with Bun ORM (Go)

### Tertiary (LOW confidence)
- [OpenTelemetry Bun JS Discussion](https://github.com/oven-sh/bun/discussions/7185) - Community discussion on native OTel support
- [PowerSync Status Page](https://status.powersync.com/) - No specific adaptive sync docs found
- [Audit Logs in AI Systems](https://latitude-blog.ghost.io/blog/audit-logs-in-ai-systems-what-to-track-and-why/) - General guidance for AI audit trails

## Metadata

**Confidence breakdown:**
- Push notifications: HIGH - Official Expo documentation, well-established patterns
- Error tracking (Sentry): HIGH - Official SDKs for both Bun and React Native
- Performance monitoring: MEDIUM - ElysiaJS plugin official, but Bun native OTel limited
- Adaptive sync: MEDIUM - NetInfo well-documented, custom implementation required
- Data export: HIGH - GDPR requirements clear, implementation straightforward
- Version history: MEDIUM - Neo4j pattern documented, custom implementation required

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domains, monitor Expo/Sentry SDK updates)
