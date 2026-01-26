# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** AI always has the right context when querying user's personal data
**Current focus:** Phase 5 - Mobile Client & Offline Sync

## Current Position

Phase: 5 of 7 (Mobile Client & Offline Sync) - IN PROGRESS
Plan: 2 of 3 complete
Status: Plan 05-02 complete - PowerSync mobile SDK ready
Last activity: 2026-01-26 - Completed 05-02-PLAN.md

Progress: [████████░░] 75% Overall (30/40 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 30
- Average duration: 4min
- Total execution time: 130min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 0 | 5/5 | 24min | 5min |
| Phase 1 | 4/5 | 14min | 4min |
| Phase 2 | 7/7 | 22min | 3min |
| Phase 3 | 6/6 | 33min | 6min |
| Phase 4 | 8/8 | 33min | 4min |
| Phase 5 | 2/3 | 10min | 5min |

**Recent Trend:**
- Last plan: 05-02 (7min, complete)
- Previous: 05-01 (3min)
- Trend: Stabilizing around 3-8min (6->4->5->3->7->3->4->4->3->3->6->4->2->4->4->7->8->4->6->3->3->3->5->4->4->5->6->3->7min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

**From Phase 0 Plan 01 (00-01):**
- Git history preservation: Use `git merge --allow-unrelated-histories` (NOT squash) to preserve complete omnii commit history for git blame and bisect
- pnpm hoisting: Added shamefully-hoist=true and auto-install-peers=true for React Native Metro bundler compatibility
- Merge conflict resolution: Combined planning-specific .gitignore entries with omnii patterns; used Omnii One GSD-aware CLAUDE.md

**From Phase 0 Plan 02 (00-02):**
- Source of truth: Monorepo for all domains (mobile architecture, MCP backend, graph schema) - monorepo has newer versions, better architecture, 8 months active development
- Migration order: MCP first (low risk, 1-2h), Mobile second (high risk, 4-6h) - MCP is subset of monorepo, mobile needs React 19 testing
- Version strategy: React 19 and React Native 0.79.3 for entire workspace via pnpm overrides
- Environment namespacing: MCP_* for MCP-specific vars, keep EXPO_PUBLIC_* as-is
- Standalone repo archival: Tag v1.0.0-pre-monorepo, update README, preserve git history

**From Phase 0 Plan 03 (00-03):**
- Skip git merge of standalone omnii-mcp: No unique features, 7-8 months stale, would introduce 24 package conflicts with zero benefit
- Workspace MCP is canonical: 28+ unique features (RDF, n8n, brain monitoring), 107% more code, modular architecture vs flat
- Standalone archival strategy: No code porting needed - all 24 standalone files superseded by better workspace implementations

**From Phase 0 Plan 04 (00-04):**
- OMNII_* namespace for shared infrastructure: Prevents conflicts with third-party libraries, makes project vars greppable, future-proof pattern (OMNII_SUPABASE_URL, OMNII_NEO4J_URI, etc.)
- MCP_* namespace for MCP-specific vars: Enables multiple MCP apps with different BASE_URL/PORT without collision
- Keep EXPO_PUBLIC_* as-is: React Native Metro bundler hardcoded to look for this prefix, don't fight the framework
- Turborepo cache invalidation: globalEnv for all tasks, task env for specific tasks, globalDependencies for .env files
- Environment loading order: System env -> Root .env -> App .env -> App .env.local (gitignored overrides)

**From Phase 0 Plan 05 (00-05):**
- Version enforcement via pnpm catalog + overrides: pnpm-workspace.yaml catalog defines versions, resolutions + pnpm.overrides enforce them across all dependencies
- Exact version pinning for build tools: turbo and @turbo/gen pinned to 2.5.4 (prevents version drift in CI/CD)
- Accept catalog: references in syncpack: Not actual mismatches - pnpm catalogs work correctly, syncpack just doesn't understand them
- Python RDF package.json documented as known issue: Python service uses requirements.txt/Poetry, adding package.json would be artificial

**From Phase 1 Plan 01 (01-01):**
- Neo4j HTTP Query API over TCP driver: HTTP Query API v2 avoids 60-second timeouts from neo4j-driver TCP incompatibility with Bun runtime
- Keep neo4j-driver for legacy compatibility: Neo4jDirectService still uses driver, removing would break that service
- HTTP API response format mapping: HTTP v2 returns { fields, values } arrays instead of Record objects, requires mapping in service methods
- Preserve neo4jService public API: Routes use existing method signatures (listNodes, searchSimilarConcepts, healthCheck), zero changes required

**From Phase 1 Plan 03 (01-03):**
- Supabase Auth standardization: Removed better-auth entirely, standardized on Supabase Auth for consistency with mobile app (FOUND-03 requirement)
- tenantId pattern: Auth middleware extracts tenantId = user.id from JWT for database-per-user Neo4j lookups
- user_databases schema: Tracks Neo4j URI, credentials, Aura instance ID per user with status field for provisioning workflow
- AuthContext interface: Extends Record<string, unknown> for Elysia middleware derive return type compatibility

**From Phase 1 Plan 04 (01-04):**
- Neo4j Aura API for database provisioning: Free-db tier for development, automatic provisioning on user signup via webhook
- Background polling pattern for readiness: 5s intervals, 5min timeout, updates user_databases.status when instance is 'running'
- URI conversion for HTTP API: Convert neo4j+s:// to https:// for HTTP Query API v2 compatibility
- createClientForUser factory pattern: Per-user database isolation via client factory that looks up credentials from Supabase

**From Phase 2 Plan 01 (02-01):**
- Four node labels (Concept, Entity, Event, Contact): Covers core knowledge graph use cases for personal context
- 1536-dimension embedding field for OpenAI ada-002: Standard embedding size for vector similarity search
- Parameterized Cypher queries: All CRUD operations use parameters to prevent injection

**From Phase 2 Plan 02 (02-02):**
- HNSW algorithm with cosine similarity: Best balance of speed and accuracy for embedding search
- Exponential backoff for rate limits: 1s/2s/4s retry pattern respects OpenAI API limits
- searchByText as primary interface: Natural language queries converted to embeddings for vector search
- db.index.vector.queryNodes procedure: Neo4j native vector search for HNSW index

**From Phase 2 Plan 03 (02-03):**
- Protocol version 2025-11-25: Stable MCP protocol version, avoiding experimental 2026-03-26 features
- Singleton pattern for MCP server: Single server instance for consistent state across all routes
- Elysia HTTP transport: Routes at /mcp prefix for protocol traffic, matches existing app framework

**From Phase 2 Plan 04 (02-04):**
- MCPToolResponse type: Standard MCP response format `{ content: [{ type: 'text', text: string }], isError?: boolean }`
- TOOL_DEFINITIONS + TOOL_HANDLERS pattern: Array of definitions for tools/list, map of handlers for tools/call
- Zod validation at handler entry: Fail fast with structured error details for AI clients

**From Phase 2 Plan 05 (02-05):**
- Token bucket rate limiting: 100 requests per minute per user via elysia-rate-limit
- Per-user rate limiting: Extract user ID from JWT sub claim; fallback to IP for unauthenticated
- MCP routes at /mcp: Not under /api prefix - MCP clients expect /mcp endpoint directly
- Supabase JWT auth: All MCP POST requests require valid Bearer token, validated via supabase.auth.getUser()

**From Phase 2 Plan 06 (02-06):**
- Fire-and-forget schema setup: Schema setup runs in background after database becomes ready, errors don't fail provisioning
- ADMIN_KEY protected manual endpoint: POST /webhooks/auth/setup-schema/:userId allows operators to retry schema setup
- Health check schema status: GET /mcp/health?userId=<uuid> returns constraint count and vector index status

**From Phase 2 Plan 07 (02-07):**
- Comprehensive doc structure: Single guide covering auth, config, tools, troubleshooting for developer onboarding
- Phase 2 env vars documented: OMNII_*, MCP_*, ADMIN_KEY all in .env.example with clear sections

**From Phase 3 Plan 01 (03-01):**
- Neo4j datetime() vs localdatetime(): Using datetime() (timezone-aware) for UTC storage ensures consistent temporal filtering across timezones
- Temporal index strategy: Created 4 indexes (Entity.created_at, Event.start_time, Contact.created_at, Concept.created_at) to optimize temporal queries from O(n) scan to O(log n) lookup
- Error handling in parseTemporalQuery: Throws descriptive errors with valid options when time range not recognized (better UX than silent failure)
- Age calculation pattern: Results include duration.between(created_at, datetime()) to provide recency context for AI assistants

**From Phase 3 Plan 02 (03-02):**
- Graph traversal depth cap: Maximum 2 hops prevents exponential path explosion in densely connected graphs while providing sufficient relationship context
- Embedding exclusion from properties: DualChannelResult excludes 1536-dimension embedding field to reduce response payload size
- Vector-only mode option: includeContext flag allows bypassing graph traversal when semantic similarity alone suffices
- Timing estimation for dual-channel: 30/70 split (vector/graph) estimated based on typical query profiles for performance monitoring

**From Phase 3 Plan 03 (03-03):**
- ToolHandler signature extension: Added optional userId parameter to ToolHandler type for GraphRAG services requiring multi-tenant userId isolation
- Task storage strategy: Tasks stored as Entity nodes with entity_type='task' property rather than dedicated Task label for flexibility while maintaining label-based indexing
- Calendar query dual-mode: Calendar tool supports both temporal filtering (queryTemporalEvents) and optional semantic search (searchByText) for "meetings last week" or "meetings about project X last week"
- Contact interaction context: Contact lookup uses localSearch with includeContext flag to control whether to fetch related events/entities for full interaction history

**From Phase 3 Plan 04 (03-04):**
- GPT-4o-mini for entity extraction: Minimum quality model for structured JSON output with response_format json_object, balances accuracy with latency/cost
- Vague relationship filtering: RELATED_TO, ASSOCIATED_WITH, CONNECTED_TO filtered out automatically to enforce specific meaningful types (EMPLOYED_BY, ATTENDED, FOUNDED)
- Entity matching before node creation: Case-insensitive name search prevents duplicate nodes when same entity mentioned multiple times across ingestion sources
- Relationship type whitelist: ALLOWED_RELATIONSHIPS array validates types before Cypher execution to prevent injection (Neo4j doesn't support parameterized relationship types)

**From Phase 3 Plan 05 (03-05):**
- OpenAI Structured Outputs with strict mode: Set strict: true and additionalProperties: false on function parameters for reliable structured output parsing by OpenAI models
- Parallel tool execution via Promise.all: Execute multiple tool calls in parallel per OpenAI recommendation to reduce latency
- MCP response format conversion: Convert MCP content array to OpenAI tool result format with tool_call_id for correlation
- Separate adapter layer pattern: Created mcp/adapters/ for AI platform adapters to enable future integrations without modifying core tools

**From Phase 3 Plan 06 (03-06):**
- Sequential execution for local LLMs: Local LLMs unreliable with parallel tool calls per research, use for-of loop instead of Promise.all
- Ollama vs LM Studio formats: Ollama uses custom format without strict mode, LM Studio reuses OpenAI format (strict: true)
- Hallucination detection for local LLMs: validateToolCall checks tool name exists in TOOL_HANDLERS, filters invalid calls before execution
- Local LLM bridge architecture: HTTP endpoints at /api/local-llm for tools list and execution, separate from MCP JSON-RPC transport

**From Phase 4 Plan 01 (04-01):**
- BullMQ default retry: 3 attempts with exponential backoff (1s, 2s, 4s) for rate-limited API calls
- Redis connection lazy initialization: Single shared Redis instance via getRedisConnection() with maxRetriesPerRequest: null for BullMQ compatibility
- Job retention policy: Keep last 100 completed jobs for inspection, 500 failed jobs for debugging
- Singleton pattern: Lazy initialization with null check for both Composio client and Redis connection

**From Phase 4 Plan 02 (04-02):**
- Zod quality gates: Validate structure + business rules (end > start, contact identifiability) at ingestion boundary
- Two-level Gmail part nesting: Explicit z.object() for first two levels with z.any() for deeper nesting (recursive z.lazy() had TypeScript issues)
- validateIngestionData discriminated union: Returns { success: true, data } or { success: false, errors } for typed error handling

**From Phase 4 Plan 03 (04-03):**
- Service role key for SyncStateService: Bypasses RLS for background jobs to access all users' sync states
- Upsert pattern for updateState: Uses onConflict: "user_id,source" to handle both create and update in single operation
- clearSyncToken nulls all fields: When 410 Gone received, all token fields nulled to trigger full sync on next attempt

**From Phase 4 Plan 04 (04-04):**
- Composio redirectUri parameter: Use redirectUri (not redirectUrl) per Composio SDK type definitions
- connectedAccountId response field: ConnectionRequest returns connectedAccountId, not connectionId
- Status endpoint includes sync state: Integrates with SyncStateService to show lastSync, status, itemsSynced per connected service

**From Phase 4 Plan 05 (04-05):**
- Store google_event_id as node property: Enables deduplication by checking existing events before insertion
- Use metadata field for relationship properties: RelationshipProperties doesn't have response_status, store in metadata
- 90-day lookback for initial sync: Balances data volume with usefulness for calendar queries
- Attendee extraction pattern: Create Contact nodes from event attendees with ATTENDED_BY relationships

**From Phase 4 Plan 06 (04-06):**
- 15-minute default cron schedule: Balances data freshness with API quota conservation
- 0-5 second jitter on all jobs: Prevents thundering herd when many users sync simultaneously
- 10 jobs/minute rate limit: Respects Google API quota while maximizing throughput
- Fan-out pattern: Scheduled job with no userId fans out to per-user jobs with staggered delays
- Optional worker startup: Workers only start when OMNII_REDIS_URL is set (non-blocking for development)

**From Phase 4 Plan 07 (04-07):**
- Tasks storage as Entity nodes: entity_type='task' for consistency with Phase 3 decision
- Gmail emails as Entity nodes: entity_type='email' with gmail_message_id for deduplication
- 30-day completed task retention: Skip older completed tasks to avoid graph bloat
- 500 message limit for Gmail initial sync: Prevents API quota exhaustion
- Source-specific incremental sync: updatedMin (Tasks), historyId (Gmail), syncToken (Contacts)
- 404/410 error handling: Triggers automatic full sync fallback for expired tokens

**From Roadmap:**
- 8-phase structure derived from requirement boundaries, research flags Phase 0 as critical for avoiding monorepo complexity spike
- Neo4j-Bun compatibility needs resolution in Phase 1, GraphRAG dual-channel is key capability, use proven sync engines for mobile

**From Phase 5 Plan 01 (05-01):**
- PowerSync table pattern: UUID id, user_id, updated_at columns required for change tracking
- JSONB properties for flexibility: Used JSONB column for entity-specific attributes rather than separate columns per type
- Composite indexes for sync queries: (user_id, updated_at) on all sync tables for efficient change detection
- Deduplication constraints: Unique on (user_id, google_event_id) for events, (from, to, type) for relationships
- Service role grants: Backend population bypasses RLS via service role key

**From Phase 5 Plan 02 (05-02):**
- @op-engineering/op-sqlite ^14 for peer compatibility: @powersync/op-sqlite requires ^13 or ^14, pinned to satisfy peer
- Schema uses column helper pattern: Used column.text from @powersync/react-native for cleaner API
- Native directories gitignored: ios/ and android/ regenerated via expo prebuild on demand
- Singleton database factory: getPowerSync() returns same instance, resetPowerSync() cleans up for logout

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 0 - COMPLETE:**
- ~~Monorepo tool selection (Turborepo vs. Nx)~~ - RESOLVED: Using Turborepo from omnii (already working)
- ~~Codebase "source of truth" per domain~~ - RESOLVED: Monorepo for all domains (see Plan 00-02 decisions)
- ~~MCP merge strategy~~ - RESOLVED: Skip merge, workspace is canonical (see Plan 00-03 decisions)
- ~~Runtime validation needed~~ - RESOLVED: omnii-mcp app startup confirmed (initializes, env var failure expected)
- Python RDF service lacks package.json (sherif warning - documented as known non-blocking issue)

**Phase 1 - COMPLETE:**
- ~~Neo4j-Bun compatibility mitigation strategy~~ - RESOLVED: Using HTTP Query API v2 instead of TCP driver (Plan 01-01)
- ~~Auth standardization (better-auth vs Supabase)~~ - RESOLVED: Standardized on Supabase Auth, better-auth removed (Plan 01-03)

**Phase 2 - COMPLETE:**
- ~~Embedding model selection~~ - RESOLVED: Using OpenAI ada-002 for server-side embeddings (Plan 02-02)
- ~~Claude Desktop integration~~ - RESOLVED: User approved checkpoint, docs and config complete (Plan 02-07)

**Phase 3 - COMPLETE:**
- ~~GraphRAG implementation patterns~~ - RESEARCHED: Dual-channel retrieval (vector + graph), HybridCypherRetriever pattern, local search first (see 03-RESEARCH.md)
- ~~Temporal context awareness~~ - COMPLETE: Natural language time queries with Neo4j datetime arithmetic (Plan 03-01)
- ~~Dual-channel retrieval~~ - COMPLETE: HybridCypherRetriever pattern combining vector search with 1-2 hop graph traversal (Plan 03-02)
- ~~Domain MCP tools~~ - COMPLETE: Calendar, contacts, tasks tools with temporal filtering and dual-channel retrieval (Plan 03-03)
- ~~Relationship discovery~~ - COMPLETE: LLM-based entity extraction with quality prompts and MCP tool integration (Plan 03-04)
- ~~OpenAI function calling~~ - COMPLETE: OpenAI adapter and HTTP endpoints for function calling integration (Plan 03-05)
- ~~Local LLM integration~~ - COMPLETE: Ollama and LM Studio adapters with sequential execution and hallucination detection (Plan 03-06)

**Phase 4 scope discipline:**
- Must resist adding multiple data sources simultaneously - start with Google Calendar only, validate improvement before expanding

**Phase 5 - IN PROGRESS:**
- ~~CRDT library selection~~ - RESOLVED: Using PowerSync (proven sync engine with Supabase integration)
- Mobile background sync optimization for battery impact - PENDING

## Session Continuity

Last session: 2026-01-26T00:05:12Z
Stopped at: Completed 05-02-PLAN.md (PowerSync mobile SDK installation and schema)
Resume file: None

**Phase 4 Status:** COMPLETE. All 8 plans executed, entity extraction wired, hybrid search implemented.

**Verification Results (2026-01-25):**
Puppeteer-based endpoint verification confirmed all services operational:

| Service | Endpoint | Status | Details |
|---------|----------|--------|---------|
| Server | `/` | ✅ OK | OMNII MCP Server running |
| Health | `/health` | ✅ OK | ready: true, uptime active |
| Swagger | `/swagger` | ✅ OK | 49 routes documented |
| Neo4j Direct | `/api/neo4j-direct/health` | ✅ OK | 637 concepts, 429ms response |
| MCP Protocol | `/mcp/health` | ✅ OK | 7 tools available |
| Auth | `/api/auth/health` | ✅ OK | provider: supabase |
| n8n Webhooks | `/api/n8n/health` | ✅ OK | webhooks configured |
| Local LLM | `/api/local-llm/health` | ✅ OK | ollama/lmstudio, 7 tools |
| RDF Python | `/api/rdf/health` | ⚠️ SKIP | Optional service not running |

Background workers: Ingestion workers started with 15-min cron schedule.

**Delivered (04-01):**
- BullMQ job queue with exponential backoff for background job processing
- Composio client singleton for Google OAuth abstraction
- Redis connection factory for job queues
- Barrel export aggregating ingestion module

**Delivered (04-02):**
- Zod validation schemas for all 4 Google service types (Calendar, Tasks, Gmail, Contacts)
- Business rule validation (end > start, contact identifiability, message content)
- validateIngestionData helper for uniform error handling

**Delivered (04-03):**
- sync_state Supabase table for tracking sync tokens per user/source
- SyncStateService with CRUD operations for incremental sync state
- Helper methods for sync lifecycle (started, completed, failed, rate-limited)
- getUsersNeedingSync for background job scheduling

**Delivered (04-04):**
- POST /api/ingestion/connect - OAuth initiation via Composio
- GET /api/ingestion/callback - OAuth redirect handler
- GET /api/ingestion/status/:userId - Connection + sync state
- DELETE /api/ingestion/disconnect - OAuth revocation

**Delivered (04-05):**
- CalendarIngestionService with incremental sync using sync tokens
- Event validation against CalendarEventSchema quality gate
- Attendee extraction as Contact nodes with ATTENDED_BY relationships
- 410 error handling with automatic full sync fallback
- POST /api/ingestion/sync/calendar manual sync trigger endpoint

**Delivered (04-06):**
- BullMQ sync job scheduler with 15-min cron pattern
- Jitter (0-5 seconds) on all jobs prevents thundering herd
- Rate limiter (10 jobs/minute) respects Google API quota
- Workers process jobs with concurrency limit (default: 3)
- Optional worker startup when Redis available
- Graceful shutdown stops workers cleanly on SIGTERM

**Delivered (04-07):**
- TasksIngestionService with updatedMin incremental sync
- GmailIngestionService with historyId-based sync and 404 fallback
- ContactsIngestionService with syncToken and 410 fallback
- Email sender/recipient extraction as Contact nodes
- Manual sync endpoints for all 4 services (calendar, tasks, gmail, contacts)
- Workers updated to handle all source types

**Delivered (Test Mode Infrastructure - 2026-01-25):**
- `INGESTION_TEST_MODE` env toggle to bypass OAuth
- `/api/test/inject/contacts` - Inject sample contacts
- `/api/test/inject/events` - Inject sample events
- `/api/test/inject/tasks` - Inject sample tasks as Entity nodes
- `/api/test/inject/scenario` - Inject complete scenario (contacts + events + relationships)
- `/api/test/stats` - View graph node/relationship counts
- `/api/test/clear?confirm=yes-delete-all` - Clear all test data
- `/api/test/mcp/tool` - Test MCP tools directly (bypasses auth)
- `/api/test/vector-index` - Check/create/delete vector index
- `/api/test/embed-all-nodes` - Generate embeddings for all nodes
- Fixed reserved word escaping in graph CRUD operations

**MCP Tools Verification (2026-01-25):**
| Tool | Status | Notes |
|------|--------|-------|
| `omnii_graph_list_entities` | ✅ Working | Lists nodes by label |
| `omnii_graph_get_context` | ✅ Working | Shows node + relationships |
| `omnii_calendar_query` | ✅ Working | Queries calendar events |
| `omnii_task_operations` | ✅ Working | Task management |
| `omnii_graph_search_nodes` | ✅ Working | Hybrid vector + text search |
| `omnii_contact_lookup` | ✅ Working | With text search fallback |
| `omnii_extract_relationships` | ✅ Working | With text search fallback |

**Hybrid Search Implementation (2026-01-25):**
- Added text-based search using Cypher CONTAINS matching
- Search now combines vector results (semantic) + text results (keyword)
- Automatic fallback to text-only when vector index unavailable
- Works for all node types (Contact, Event, Entity, Concept)

**Known Issue:** Entity nodes with `type` property fail due to Cypher reserved word. Use different property name or avoid Entity nodes in tests.

**Delivered (04-08):**
- Entity extraction wired into Calendar, Gmail, and Tasks ingestion
- `discoverRelationships` called after node insertion with source context
- `extractEntities` parameter (default: true) forwarded through all layers
- Sync result types include entitiesExtracted and relationshipsCreated counts
- Contacts excluded from entity extraction (they ARE entities, not content)

**Next:** Continue Phase 5 - Plan 05-02 (Mobile PowerSync client)

---

## Phase 5 Status: IN PROGRESS

**Delivered (05-01):**
- sync_entities, sync_events, sync_relationships PostgreSQL tables
- RLS policies restricting access to user's own data
- Composite indexes on (user_id, updated_at) for PowerSync change queries
- Auto-update triggers for updated_at timestamps
- GET /api/powersync/sync - Returns changes since timestamp
- POST /api/powersync/upload - Receives changes from mobile
- POST /api/powersync/populate - Syncs Neo4j data to Supabase
- GET /api/powersync/health - Authenticated health check

**Delivered (05-02):**
- PowerSync packages: @powersync/react-native, @powersync/op-sqlite, @powersync/react, @op-engineering/op-sqlite
- Schema matching backend: sync_entities, sync_events, sync_relationships tables
- Type helpers: SyncEntity, SyncEvent, SyncRelationship interfaces
- Database factory: getPowerSync(), resetPowerSync(), isPowerSyncReady()
- Metro config: unstable_enablePackageExports for ESM module resolution
- Native modules verified: CocoaPods and Android autolinking configured

**Known Issue:** Project path "/Users/santino/Projects/Omnii One" contains space which breaks React Native build scripts. Native modules correctly configured but builds blocked until path renamed.

**Next:** Plan 05-03 - Wire PowerSync connector to Supabase backend
