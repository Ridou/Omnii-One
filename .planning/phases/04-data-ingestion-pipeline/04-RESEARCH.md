# Phase 4: Data Ingestion Pipeline - Research

**Researched:** 2026-01-25
**Domain:** Data ingestion, OAuth authentication, Google APIs, background job processing
**Confidence:** HIGH

## Summary

This research covers implementing a data ingestion pipeline for Google services (Calendar, Tasks, Gmail, Contacts) with Composio as the OAuth and API integration layer. The phase emphasizes starting with ONE source (Google Calendar) to validate the pipeline before expanding.

Google APIs provide different synchronization mechanisms: Calendar and Contacts use **sync tokens** for incremental delta updates, Gmail uses **historyId** for history-based sync, and Tasks uses **updatedMin** timestamp filtering. All APIs require exponential backoff with jitter for rate limiting, with quotas applied per-project at 60-second intervals.

Composio abstracts OAuth complexity, handling authentication flows, token refresh, and credential storage with encryption. The integration uses `@composio/core` for Node.js/TypeScript with per-user connections via the AgentAuth system. Background job scheduling should use BullMQ with Redis for reliable, persistent job processing with cron-based scheduling.

**Primary recommendation:** Use Composio for Google OAuth and API calls, implement incremental sync with provider-specific tokens (syncToken for Calendar/Contacts, historyId for Gmail, updatedMin for Tasks), schedule background sync with BullMQ, and apply quality gates at ingestion point with schema validation and business rule checks.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @composio/core | Latest (npm) | Google OAuth + API integration | Abstracts OAuth complexity, handles token refresh, supports 100+ integrations including all Google services |
| bullmq | Latest 5.x | Background job queue with Redis | Active maintenance, reliable persistence, cron scheduling via Job Schedulers API (v5.16.0+), automatic retry on failure |
| exponential-backoff | Latest (npm) | Retry with exponential backoff + jitter | Simple API, configurable max delay, prevents thundering herd problem |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | Latest | Schema validation at ingestion | Validate incoming Google API data before graph insertion |
| redis | Latest | BullMQ backing store | Required for BullMQ job persistence and distributed workers |
| @anthropic-ai/sdk | Latest | Composio Anthropic provider | If using Claude for tool calling (project already has this) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Composio | googleapis + OAuth2Client | Manual OAuth flow, token refresh, credential storage, scope management - weeks of work vs. Composio's built-in handling |
| BullMQ | Agenda, node-cron | Agenda deprecated/unmaintained, node-cron lacks persistence and job tracking |
| exponential-backoff | DIY retry logic | Risk of thundering herd without jitter, edge cases like max delay caps |

**Installation:**
```bash
pnpm add @composio/core bullmq exponential-backoff redis zod
```

## Architecture Patterns

### Recommended Project Structure
```
apps/omnii_mcp/src/
├── ingestion/
│   ├── sources/           # Per-source ingestion logic
│   │   ├── google-calendar.ts
│   │   ├── google-tasks.ts
│   │   ├── google-gmail.ts
│   │   └── google-contacts.ts
│   ├── jobs/              # BullMQ job definitions
│   │   ├── sync-scheduler.ts
│   │   └── process-ingestion.ts
│   ├── validators/        # Zod schemas for quality gates
│   │   └── schemas.ts
│   ├── sync-state.ts      # Sync token/history ID storage
│   └── composio-client.ts # Composio singleton
└── routes/
    └── ingestion/         # OAuth callbacks, manual triggers
        └── index.ts
```

### Pattern 1: Composio Authentication Flow
**What:** Per-user OAuth connection via Composio's AgentAuth system
**When to use:** User connects their Google account for the first time

**Example:**
```typescript
// Source: https://docs.composio.dev/docs/quickstart
import { Composio } from "@composio/core";
import { AnthropicProvider } from "@composio/anthropic";

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
  provider: new AnthropicProvider(),
});

// Initiate OAuth connection
async function connectGoogleAccount(userId: string) {
  const connectionRequest = await composio.connectedAccounts.link(
    userId, // External user ID (matches your system)
    "google_calendar_auth_config_id" // Auth config ID from Composio dashboard
  );

  // Redirect user to OAuth flow
  return connectionRequest.redirectUrl;

  // After user authorizes, poll or wait for connection
  // const connectedAccount = await connectionRequest.waitForConnection();
}
```

### Pattern 2: Incremental Sync with Sync Tokens
**What:** Calendar and Contacts use sync tokens for delta updates
**When to use:** After initial full sync, for all subsequent syncs

**Example:**
```typescript
// Source: https://developers.google.com/workspace/calendar/api/guides/sync
import { backOff } from "exponential-backoff";

interface SyncState {
  userId: string;
  source: 'calendar' | 'contacts';
  syncToken: string | null;
  lastSyncAt: Date;
}

async function syncCalendarEvents(
  userId: string,
  syncState: SyncState
): Promise<{ events: any[], nextSyncToken: string }> {

  const tools = await composio.tools.get(userId, {
    tools: ["GOOGLECALENDAR_LIST_EVENTS"],
  });

  try {
    // Call Google Calendar API with sync token
    const result = await backOff(
      () => composio.tools.execute(
        "GOOGLECALENDAR_LIST_EVENTS",
        {
          calendarId: "primary",
          syncToken: syncState.syncToken, // null for initial sync
          maxResults: 250,
        },
        userId
      ),
      {
        numOfAttempts: 5,
        maxDelay: 30000, // 30 seconds max
        jitter: "full", // Add randomness to prevent thundering herd
      }
    );

    // Extract events and nextSyncToken
    const { items, nextSyncToken, nextPageToken } = result;

    // If pagination required, continue fetching with pageToken
    if (nextPageToken) {
      // Fetch next page with same syncToken but new pageToken
      // ... pagination logic
    }

    return {
      events: items,
      nextSyncToken: nextSyncToken, // Store for next sync
    };
  } catch (error) {
    // Handle 410 Gone - sync token expired
    if (error.response?.status === 410) {
      // Clear sync token, trigger full sync
      return syncCalendarEvents(userId, { ...syncState, syncToken: null });
    }
    throw error;
  }
}
```

### Pattern 3: Gmail History-Based Sync
**What:** Gmail uses historyId for incremental message updates
**When to use:** After initial full sync, for all subsequent Gmail syncs

**Example:**
```typescript
// Source: https://developers.google.com/workspace/gmail/api/guides/sync
interface GmailSyncState {
  userId: string;
  historyId: string | null;
  lastSyncAt: Date;
}

async function syncGmailMessages(
  userId: string,
  syncState: GmailSyncState
): Promise<{ messages: any[], latestHistoryId: string }> {

  if (!syncState.historyId) {
    // Initial full sync: fetch message IDs
    const messages = await backOff(() =>
      composio.tools.execute("GMAIL_LIST_MESSAGES", {
        userId: "me",
        maxResults: 500,
      }, userId)
    );

    // Get full message details in batch
    // Store historyId from most recent message
    const latestHistoryId = messages[0]?.historyId;

    return { messages, latestHistoryId };
  }

  // Incremental sync: fetch history records
  try {
    const history = await backOff(() =>
      composio.tools.execute("GMAIL_LIST_HISTORY", {
        userId: "me",
        startHistoryId: syncState.historyId,
        historyTypes: ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"],
      }, userId)
    );

    return {
      messages: history.history || [],
      latestHistoryId: history.historyId,
    };
  } catch (error) {
    // Handle 404 - historyId outside available range (>1 week old)
    if (error.response?.status === 404) {
      // Fall back to full sync
      return syncGmailMessages(userId, { ...syncState, historyId: null });
    }
    throw error;
  }
}
```

### Pattern 4: Background Job Scheduling with BullMQ
**What:** Cron-based job scheduling for periodic sync
**When to use:** All background data sync operations

**Example:**
```typescript
// Source: https://docs.bullmq.io/guide/job-schedulers
import { Queue, Worker, JobScheduler } from "bullmq";
import Redis from "ioredis";

const connection = new Redis({
  host: process.env.OMNII_REDIS_HOST,
  port: Number(process.env.OMNII_REDIS_PORT),
});

// Create queue for ingestion jobs
const ingestionQueue = new Queue("data-ingestion", { connection });

// Create job scheduler (replaces deprecated repeatable jobs)
const scheduler = new JobScheduler("data-ingestion-scheduler", {
  connection,
});

// Schedule sync job with cron pattern
await scheduler.upsertJobScheduler(
  "google-calendar-sync",
  {
    pattern: "0 */15 * * *", // Every 15 minutes
  },
  {
    name: "sync-google-calendar",
    data: { source: "calendar" },
    opts: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  }
);

// Worker to process jobs
const worker = new Worker(
  "data-ingestion",
  async (job) => {
    const { source } = job.data;

    // Get all users with connected Google accounts
    const users = await getUsersWithConnectedAccounts(source);

    for (const user of users) {
      // Add jitter to prevent all users syncing simultaneously
      const jitter = Math.random() * 5000; // 0-5 seconds
      await new Promise(resolve => setTimeout(resolve, jitter));

      await syncUserData(user.id, source);
    }
  },
  { connection }
);
```

### Pattern 5: Quality Gates at Ingestion
**What:** Validate data before inserting into graph
**When to use:** Every ingestion operation, before Neo4j insertion

**Example:**
```typescript
// Source: https://www.integrate.io/blog/data-validation-etl/
import { z } from "zod";

// Schema validation
const CalendarEventSchema = z.object({
  id: z.string(),
  summary: z.string().min(1, "Event title required"),
  start: z.object({
    dateTime: z.string().datetime().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  end: z.object({
    dateTime: z.string().datetime().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  attendees: z.array(z.object({
    email: z.string().email(),
    displayName: z.string().optional(),
  })).optional(),
}).refine(
  (data) => data.start.dateTime || data.start.date,
  "Event must have start time or date"
);

async function ingestCalendarEvent(rawEvent: unknown) {
  // Field-level validation
  const validationResult = CalendarEventSchema.safeParse(rawEvent);

  if (!validationResult.success) {
    // Log validation failure, don't insert
    console.error("Validation failed:", validationResult.error.flatten());
    return { success: false, errors: validationResult.error.errors };
  }

  const event = validationResult.data;

  // Business rule validation
  if (event.start.dateTime && event.end.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);

    if (end <= start) {
      console.error("Event end time before start time");
      return { success: false, errors: ["Invalid time range"] };
    }
  }

  // Passed quality gates - insert into graph
  await insertEventIntoGraph(event);
  return { success: true };
}
```

### Anti-Patterns to Avoid
- **Full sync on every run:** Use incremental sync with tokens/historyId, not full data refresh
- **Synchronous API calls without retry:** Always wrap in exponential backoff with jitter
- **Ignoring 410/404 errors:** These signal expired tokens - must fall back to full sync
- **Manual OAuth implementation:** Use Composio's built-in OAuth flow
- **In-memory job queue:** Use persistent queue (BullMQ + Redis) for reliability
- **Simultaneous user sync:** Add jitter to prevent thundering herd on APIs

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth 2.0 flow with refresh tokens | Custom OAuth client, token storage, PKCE implementation | Composio AgentAuth | OAuth takes weeks to implement correctly: redirect URIs, scope management, token rotation, secure storage, PKCE for security - Composio handles all of it |
| Background job scheduling | Custom cron + in-memory queue | BullMQ + Redis | Jobs need persistence (survive restarts), distributed workers, retry on failure, monitoring - DIY loses jobs on crash |
| Retry with exponential backoff | Custom setTimeout recursion | exponential-backoff library | Edge cases: jitter to prevent thundering herd, max delay caps, attempt counting, error type filtering - library handles all |
| Google API pagination | Manual pageToken loops | Iterator pattern with retry | APIs return pageToken inconsistently, need to handle nextSyncToken vs pageToken, backoff on rate limits |
| Sync token storage | In-memory Map or file | Database table (Supabase) | Need per-user tokens, survive restarts, audit trail, concurrency safety |

**Key insight:** OAuth, job queues, and API pagination have subtle edge cases (token expiry, job loss on crash, rate limit bursts) that mature libraries handle correctly. Custom solutions miss these until production failures occur.

## Common Pitfalls

### Pitfall 1: Ignoring Sync Token Expiry (410 Errors)
**What goes wrong:** Google Calendar and Contacts sync tokens expire after ~7 days or when ACL changes. Code continues using expired token, gets 410 Gone error, sync stops working.

**Why it happens:** Developers test with fresh tokens and don't encounter expiry in local testing.

**How to avoid:**
- Always catch 410 status code for Calendar/Contacts
- Fallback to full sync (syncToken=null) on 410
- Similarly, catch 404 for Gmail historyId and fallback to full sync

**Warning signs:** Users report "sync stopped working after a week" or "data not updating"

### Pitfall 2: Thundering Herd on API Quotas
**What goes wrong:** Background sync job triggers for all users at exact same time (e.g., every hour at :00). All users hit Google APIs simultaneously, exhaust quota in seconds, all requests fail with 429 rate limit errors.

**Why it happens:** Cron jobs execute exactly on schedule, no built-in jitter.

**How to avoid:**
- Add random jitter (0-5 seconds) before each user's sync starts
- Spread cron schedules across minutes (not all on :00)
- Use exponential backoff with jitter on API calls
- Monitor quota usage in Google Cloud Console

**Warning signs:** Spike of 429 errors at exact hourly intervals, quota exhausted within first minute of hour

### Pitfall 3: Missing Pagination Handling
**What goes wrong:** Code fetches first page of Calendar events or Gmail messages, misses remaining pages. Incomplete data in graph, users see "some events missing."

**Why it happens:** Initial syncs with small datasets return all results in one page. Production accounts have hundreds of events requiring pagination.

**How to avoid:**
- Check for nextPageToken in every API response
- Loop until nextPageToken is null/undefined
- For incremental sync, continue pagination until reaching nextSyncToken
- Test with accounts that have 500+ items

**Warning signs:** Users with large calendars report missing events, data counts don't match Google UI

### Pitfall 4: OAuth Token Storage in Code or Logs
**What goes wrong:** Refresh tokens logged or stored in plaintext, exposed in version control. Attacker gains permanent access to user's Google account.

**Why it happens:** Debugging OAuth flow, developers log full token response. Tokens copied to .env files for testing.

**How to avoid:**
- Use Composio's encrypted credential storage (handles this automatically)
- Never log full OAuth responses (redact access_token, refresh_token)
- Store tokens in database with encryption at rest
- Rotate tokens on security incident

**Warning signs:** Security audit finds tokens in logs, git history, or unencrypted database columns

### Pitfall 5: Blocking Request Thread on Long Sync
**What goes wrong:** Sync operation runs in HTTP request handler, takes 30+ seconds for large accounts. Request times out, partial data written, user sees errors.

**Why it happens:** Sync triggered by user clicking "Sync Now" button, implemented as synchronous API call.

**How to avoid:**
- Always run sync in background job queue (BullMQ)
- HTTP endpoint enqueues job and returns immediately with job ID
- Provide separate endpoint for checking job status
- Use WebSocket or polling for progress updates

**Warning signs:** Timeout errors for large accounts, partial data ingestion, no visibility into sync progress

### Pitfall 6: Not Validating Data Before Graph Insertion
**What goes wrong:** Malformed data from Google API (missing fields, invalid dates) inserted into Neo4j. Graph queries fail, MCP tools return errors, AI gets confused.

**Why it happens:** Assumption that Google APIs always return valid data. Edge cases like cancelled events, all-day vs timed events, missing attendee emails.

**How to avoid:**
- Use Zod schemas for field-level validation
- Check business rules (end time > start time)
- Log validation failures, skip invalid records
- Monitor validation failure rate

**Warning signs:** Neo4j constraint violations, graph queries returning null, AI tools failing unexpectedly

## Code Examples

Verified patterns from official sources:

### Complete Sync Workflow (Calendar)
```typescript
// Source: https://developers.google.com/workspace/calendar/api/guides/sync
import { Composio } from "@composio/core";
import { backOff } from "exponential-backoff";
import { Queue } from "bullmq";

interface CalendarSyncState {
  userId: string;
  syncToken: string | null;
  lastSyncAt: Date;
  status: "idle" | "syncing" | "error";
}

class CalendarIngestionService {
  constructor(
    private composio: Composio,
    private syncQueue: Queue,
    private supabase: SupabaseClient
  ) {}

  async scheduleSyncForUser(userId: string) {
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 5000;

    await this.syncQueue.add(
      "sync-calendar",
      { userId },
      {
        delay: jitter,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      }
    );
  }

  async performSync(userId: string): Promise<void> {
    // Get current sync state
    const { data: syncState } = await this.supabase
      .from("sync_state")
      .select("*")
      .eq("user_id", userId)
      .eq("source", "calendar")
      .single();

    let currentSyncToken = syncState?.sync_token || null;
    let hasMore = true;

    try {
      while (hasMore) {
        const result = await backOff(
          () => this.fetchCalendarEvents(userId, currentSyncToken),
          {
            numOfAttempts: 5,
            maxDelay: 30000,
            jitter: "full",
          }
        );

        // Process events through quality gates
        for (const event of result.events) {
          await this.ingestEvent(userId, event);
        }

        // Check for pagination
        if (result.nextPageToken) {
          currentSyncToken = result.nextPageToken;
          hasMore = true;
        } else if (result.nextSyncToken) {
          // Final page - save sync token for next run
          await this.saveSyncToken(userId, result.nextSyncToken);
          hasMore = false;
        } else {
          hasMore = false;
        }
      }

      // Update last sync time
      await this.supabase
        .from("sync_state")
        .upsert({
          user_id: userId,
          source: "calendar",
          last_sync_at: new Date().toISOString(),
          status: "idle",
        });

    } catch (error) {
      if (error.response?.status === 410) {
        // Sync token expired - clear and retry full sync
        await this.saveSyncToken(userId, null);
        return this.performSync(userId);
      }
      throw error;
    }
  }

  private async fetchCalendarEvents(
    userId: string,
    syncToken: string | null
  ) {
    const result = await this.composio.tools.execute(
      "GOOGLECALENDAR_LIST_EVENTS",
      {
        calendarId: "primary",
        syncToken: syncToken,
        maxResults: 250,
      },
      userId
    );

    return {
      events: result.items || [],
      nextPageToken: result.nextPageToken,
      nextSyncToken: result.nextSyncToken,
    };
  }

  private async ingestEvent(userId: string, rawEvent: unknown) {
    // Quality gate: schema validation
    const validation = CalendarEventSchema.safeParse(rawEvent);
    if (!validation.success) {
      console.error("Invalid event:", validation.error);
      return;
    }

    const event = validation.data;

    // Quality gate: business rules
    if (!this.isValidTimeRange(event)) {
      console.error("Invalid time range:", event);
      return;
    }

    // Insert into Neo4j graph
    await this.insertEventNode(userId, event);

    // Extract entities (attendees, organizations) for relationship discovery
    if (event.attendees?.length > 0) {
      await this.extractEntitiesFromEvent(userId, event);
    }
  }

  private async saveSyncToken(userId: string, token: string | null) {
    await this.supabase
      .from("sync_state")
      .upsert({
        user_id: userId,
        source: "calendar",
        sync_token: token,
      });
  }
}
```

### Rate Limiting with Composio
```typescript
// Source: https://moldstud.com/articles/p-how-do-i-handle-rate-limits-and-quotas-when-using-google-apis
import { backOff } from "exponential-backoff";

async function callGoogleAPIWithRateLimit<T>(
  operation: () => Promise<T>
): Promise<T> {
  return backOff(operation, {
    numOfAttempts: 5,
    startingDelay: 1000,
    maxDelay: 30000,
    timeMultiple: 2,
    jitter: "full", // Randomize retry delays
    retry: (error: any, attemptNumber: number) => {
      // Retry on rate limit (429) or server errors (5xx)
      if (error.response?.status === 429) {
        console.log(`Rate limited, retry attempt ${attemptNumber}`);
        return true;
      }
      if (error.response?.status >= 500) {
        console.log(`Server error ${error.response.status}, retry attempt ${attemptNumber}`);
        return true;
      }
      // Don't retry on 4xx (except 429) - client errors
      return false;
    },
  });
}

// Usage
const events = await callGoogleAPIWithRateLimit(() =>
  composio.tools.execute("GOOGLECALENDAR_LIST_EVENTS", params, userId)
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual OAuth with googleapis library | Composio AgentAuth | 2024-2025 | Reduces OAuth implementation from weeks to hours, handles token rotation automatically |
| BullMQ repeatable jobs API | BullMQ Job Schedulers | November 2025 (v5.16.0) | More cohesive and robust API for cron-based scheduling, deprecated old repeatable API |
| OAuth 2.0 implicit flow | OAuth 2.1 with PKCE + token rotation | 2025-2026 | Security: prevents code interception and token theft attacks |
| Full sync every run | Incremental sync with tokens | Always (Google API design) | Bandwidth: Calendar uses syncToken, Gmail uses historyId, Contacts uses syncToken (7-day expiry) |

**Deprecated/outdated:**
- Google Calendar modifiedSince parameter: Deprecated in favor of syncToken-based incremental sync
- OAuth 2.0 implicit grant: Removed in OAuth 2.1, use authorization code flow with PKCE
- BullMQ repeatable jobs: Deprecated in v5.16.0, use Job Schedulers API instead

## Open Questions

Things that couldn't be fully resolved:

1. **Google Tasks API delta sync mechanism**
   - What we know: Tasks API supports `updatedMin` parameter for timestamp-based filtering
   - What's unclear: Official docs don't show explicit sync token support like Calendar/Contacts
   - Recommendation: Use `updatedMin` with last_sync_at timestamp, research if Tasks API added sync tokens since documentation was published

2. **Composio rate limiting passthrough**
   - What we know: Composio abstracts Google API calls, handles authentication
   - What's unclear: Whether Composio automatically handles rate limit retries or if application must implement exponential backoff
   - Recommendation: Test with high-volume sync, implement exponential-backoff wrapper around Composio calls as safety measure

3. **Entity extraction accuracy with GPT-4o-mini**
   - What we know: Project already uses GPT-4o-mini for entity extraction (from STATE.md Phase 3)
   - What's unclear: Whether entity extraction quality degrades with large email/calendar batches
   - Recommendation: Monitor extraction quality (vague relationships filtered), consider batch size limits to maintain accuracy

4. **Sync state storage schema**
   - What we know: Need to store syncToken/historyId per user per source
   - What's unclear: Optimal database schema (single table vs per-source tables, JSON column for tokens)
   - Recommendation: Single `sync_state` table with columns: user_id, source (enum), sync_token (text), history_id (text), last_sync_at (timestamp), status (enum)

## Sources

### Primary (HIGH confidence)
- Composio Quickstart - https://docs.composio.dev/docs/quickstart - Installation, authentication flow, tool execution
- Google Calendar API Sync Guide - https://developers.google.com/workspace/calendar/api/guides/sync - syncToken incremental sync, 410 error handling, pagination
- Gmail API Sync Guide - https://developers.google.com/workspace/gmail/api/guides/sync - historyId-based sync, 404 error handling, full vs partial sync
- People API Contacts - https://developers.google.com/people/v1/contacts - Sync tokens for incremental updates, 7-day expiry
- BullMQ Documentation - https://docs.bullmq.io/guide/job-schedulers - Job Schedulers API for cron patterns
- exponential-backoff npm - https://www.npmjs.com/package/exponential-backoff - Retry with jitter configuration

### Secondary (MEDIUM confidence)
- OAuth 2.1 Features 2026 - https://rgutierrez2004.medium.com/oauth-2-1-features-you-cant-ignore-in-2026-a15f852cb723 - PKCE enforcement, token rotation best practices
- BullMQ Background Jobs Guide - https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/ - Cron-based scheduling patterns
- Node.js Advanced Retry Logic - https://v-checha.medium.com/advanced-node-js-patterns-implementing-robust-retry-logic-656cf70f8ee9 - Exponential backoff best practices
- Data Validation in ETL 2026 - https://www.integrate.io/blog/data-validation-etl/ - Quality gates, schema validation, business rule checks

### Tertiary (LOW confidence)
- Composio Google services integration - WebSearch results indicate Composio supports Calendar, Gmail, Tasks, Contacts but specific API limits not documented
- Google Tasks API updatedMin parameter - Inferred from search results, needs verification with official docs when implementing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Composio officially supports Google services, BullMQ actively maintained with v5.16.0+ Job Schedulers, exponential-backoff proven library
- Architecture: HIGH - Google API sync patterns documented in official guides (Calendar syncToken, Gmail historyId, Contacts syncToken with 7-day expiry)
- Pitfalls: HIGH - All pitfalls verified from official error codes (410 Gone, 404 Not Found), rate limiting documented in Google Cloud docs, OAuth security from OAuth 2.1 spec

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain with mature APIs)
