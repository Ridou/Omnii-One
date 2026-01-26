---
phase: 07
plan: 01
subsystem: backend-observability
completed: 2026-01-25
duration: 4min

tags:
  - sentry
  - opentelemetry
  - metrics
  - monitoring
  - error-tracking
  - performance

requires:
  - phase: 06
    plan: all
    reason: Backend runtime and routes must exist to add observability

provides:
  - Error tracking with Sentry SDK for Bun runtime
  - Distributed tracing with OpenTelemetry + Elysia plugin
  - API latency metrics logged for all HTTP requests
  - Typed metric interfaces for graph queries and sync operations
  - Production-ready PII scrubbing in error breadcrumbs

affects:
  - phase: 07
    plan: "02+"
    impact: All future production hardening can leverage observability infrastructure

tech-stack:
  added:
    - "@sentry/bun ^10.36.0"
    - "@elysiajs/opentelemetry ^1.4.10"
    - "@opentelemetry/sdk-node ^0.211.0"
    - "@opentelemetry/exporter-trace-otlp-proto ^0.211.0"
  updated:
    - "elysia: ^1.3.5 → ^1.4.22"
  patterns:
    - "Sentry initialization before app creation (capture all errors)"
    - "Elysia lifecycle hooks for request/response timing"
    - "Pino-based structured metrics logging"
    - "Environment-aware initialization (skip if no DSN/endpoint)"

key-files:
  created:
    - apps/omnii_mcp/src/services/observability/sentry.ts
    - apps/omnii_mcp/src/services/observability/telemetry.ts
    - apps/omnii_mcp/src/services/observability/metrics.ts
    - apps/omnii_mcp/src/services/observability/index.ts
  modified:
    - apps/omnii_mcp/package.json
    - apps/omnii_mcp/src/app.ts

decisions:
  - id: PROD-01
    choice: Use @sentry/bun instead of @sentry/node
    rationale: Official Bun SDK with native integration and better performance
    alternatives: ["@sentry/node with polyfills"]

  - id: PROD-02
    choice: Use Elysia OpenTelemetry plugin instead of manual instrumentation
    rationale: Official plugin handles trace context propagation automatically
    alternatives: ["Manual OpenTelemetry SDK setup", "Custom middleware"]

  - id: PROD-03
    choice: Use Pino for metrics logging (reuse existing infrastructure)
    rationale: Already in Phase 6 audit logging, structured JSON, high performance
    alternatives: ["Dedicated metrics library like prom-client", "StatsD"]

  - id: PROD-04
    choice: Initialize Sentry before Elysia app creation
    rationale: Captures errors from app initialization and all middleware
    alternatives: ["Initialize after app creation (misses early errors)"]

  - id: PROD-05
    choice: Scrub PII in Sentry beforeSend hook
    rationale: Prevent passwords, tokens, authorization headers from reaching Sentry
    alternatives: ["Rely on Sentry data scrubbers (less control)"]
---

# Phase 07 Plan 01: Backend Error Tracking & Performance Monitoring Summary

**One-liner:** Sentry error tracking with PII scrubbing, OpenTelemetry distributed tracing, and Pino-based API latency metrics for production observability.

## What Was Built

### Observability Infrastructure
1. **Sentry Error Tracking** (`sentry.ts`)
   - Official @sentry/bun SDK initialization
   - Environment-aware (development vs production sample rates)
   - PII scrubbing in beforeSend hook (passwords, tokens, authorization)
   - Context-aware error capture (userId, tags, extra metadata)
   - Graceful degradation when no DSN configured

2. **OpenTelemetry Distributed Tracing** (`telemetry.ts`)
   - Elysia OpenTelemetry plugin integration
   - OTLP trace exporter with batch processing
   - Automatic span creation for all HTTP requests
   - Noop exporter fallback in development
   - Service name: "omnii-mcp"

3. **Performance Metrics Logging** (`metrics.ts`)
   - Pino-based structured logging (reuses Phase 6 infrastructure)
   - Type-safe metric interfaces:
     - `ApiLatencyMetric`: route, method, duration, status
     - `GraphQueryMetric`: queryType, duration, resultCount
     - `SyncMetric`: source, userId, duration, itemsSynced
   - `logMetric()` for one-off metrics
   - `timedOperation()` helper for wrapping async operations

4. **Application Integration** (`app.ts`)
   - `initSentry()` called before Elysia app creation
   - `createTelemetryPlugin()` added to Elysia middleware chain
   - Request timing via `onRequest` hook (stores start time)
   - Response timing via `onAfterResponse` hook (logs api_latency)
   - All HTTP requests now tracked for latency

## Technical Implementation

### Initialization Order
```typescript
// 1. Init Sentry (captures all subsequent errors)
initSentry();

// 2. Create Elysia app
const app = new Elysia()
  // 3. Add OpenTelemetry (distributed tracing)
  .use(createTelemetryPlugin())
  // 4. Start timing on request
  .onRequest(({ store }) => {
    (store as any).requestStart = performance.now();
  })
  // 5. Log metrics on response
  .onAfterResponse(({ request, store, set }) => {
    logMetric({ metric: 'api_latency', ... });
  });
```

### API Latency Tracking
Every HTTP request automatically logs:
```json
{
  "metric": "api_latency",
  "route": "/api/neo4j/query",
  "method": "POST",
  "duration": 234.56,
  "status": 200,
  "service": "omnii-mcp",
  "environment": "production",
  "timestamp": "2026-01-25T12:00:00.000Z"
}
```

### Error Capture Example
```typescript
import { captureError } from './services/observability';

try {
  await riskyOperation();
} catch (error) {
  captureError(error as Error, {
    userId: req.userId,
    tags: { operation: 'sync', source: 'calendar' },
    extra: { itemCount: 42, syncDuration: 1234 }
  });
  throw error;
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Elysia peer dependency mismatch**
- **Found during:** Task 1 (dependency installation)
- **Issue:** @elysiajs/opentelemetry ^1.4.10 requires elysia >= 1.4.0, but package.json had ^1.3.5
- **Fix:** Updated elysia to ^1.4.22
- **Files modified:** apps/omnii_mcp/package.json, pnpm-lock.yaml
- **Commit:** a692fa7 (included in Task 1 commit)
- **Impact:** Resolves peer dependency warning, ensures compatibility

## Requirements Satisfied

### Production Hardening (PROD)
- **PROD-REQ-01:** Error tracking configured ✓
  - Sentry SDK integrated with Bun runtime
  - All errors captured with context (userId, tags, extra)
  - PII scrubbing prevents sensitive data leakage

- **PROD-REQ-02:** Performance monitoring enabled ✓
  - API latency tracked for all HTTP requests
  - Structured metrics logged via Pino
  - timedOperation() helper for graph queries and sync operations
  - OpenTelemetry spans capture distributed traces

## Testing & Verification

### Performed Checks
1. ✅ Dependencies installed: All 4 packages present in package.json
2. ✅ TypeScript imports: Observability services import successfully
3. ✅ Sentry initialization: Logs "[Sentry] No DSN configured, skipping initialization"
4. ✅ OpenTelemetry plugin: Logs "[OpenTelemetry] No OTLP endpoint configured, using noop exporter"
5. ✅ Graceful degradation: Both services work without credentials (development mode)

### Manual Testing Required
To fully verify in production:
1. Set `SENTRY_DSN` environment variable → Verify errors appear in Sentry dashboard
2. Set `OTEL_EXPORTER_OTLP_ENDPOINT` → Verify traces appear in collector (Jaeger/Grafana)
3. Make HTTP request → Check logs for `api_latency` metric
4. Trigger error in route → Verify error captured in Sentry with context

## Metrics

**Tasks completed:** 3/3
- Task 1: Install observability dependencies (a692fa7)
- Task 2: Create observability services (7048614)
- Task 3: Wire observability into application startup (a53fd92)

**Duration:** 4 minutes
**Files created:** 4
**Files modified:** 2
**Lines added:** ~200
**Dependencies added:** 4

## Known Limitations

1. **Sentry requires SENTRY_DSN to capture errors**
   - Development mode: Gracefully skips initialization
   - Production deployment: Must set SENTRY_DSN env var

2. **OpenTelemetry requires OTEL_EXPORTER_OTLP_ENDPOINT for traces**
   - Development mode: Uses noop exporter (no traces sent)
   - Production: Must configure collector endpoint

3. **API latency metrics logged to stdout**
   - Current: Pino logs to stdout (structured JSON)
   - Future: Could aggregate to time-series DB (Prometheus, InfluxDB)

4. **Graph query and sync metrics not yet integrated**
   - Interfaces defined in metrics.ts
   - Integration requires updating ingestion workers (Phase 07 Plan 02+)

## Next Phase Readiness

**Blockers:** None

**Recommendations:**
1. Set up Sentry project and add SENTRY_DSN to production env
2. Set up OpenTelemetry collector (Jaeger/Grafana Cloud/Honeycomb)
3. Add logMetric() calls to ingestion workers for sync_duration tracking
4. Add timedOperation() wraps to Neo4j service for graph_query_duration
5. Consider adding custom Sentry tags for:
   - MCP tool calls (tool name, success/failure)
   - Background job failures (source, error type)
   - WebSocket connection errors

**Ready for:**
- 07-02: Rate limiting and API security (can track rate limit hits via metrics)
- 07-03: Health checks and graceful shutdown (can report health metrics)
- 07-04: Production deployment configuration (observability is key)

## Documentation Updates Needed

None - observability is infrastructure, not user-facing.

Internal docs could benefit from:
- Runbook: "How to investigate production errors using Sentry"
- Runbook: "How to analyze API latency using logs"
- Guide: "Adding custom metrics to new features"

---

**Status:** ✅ Complete
**Verified by:** Automated checks + manual import verification
**Production ready:** Yes (with SENTRY_DSN and OTEL_EXPORTER_OTLP_ENDPOINT configured)
