# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** AI always has the right context when querying user's personal data
**Current focus:** Phase 3 - GraphRAG & Advanced MCP

## Current Position

Phase: 3 of 7 (GraphRAG & Advanced MCP) - COMPLETE
Plan: 6 of 6 (03-06 complete)
Status: All MCP integrations complete (Claude, OpenAI, local LLMs), GraphRAG operational
Last activity: 2026-01-25 - Completed 03-06-PLAN.md

Progress: [██████░░░░] 100% Phase 3 complete (6/6 plans executed)

## Performance Metrics

**Velocity:**
- Total plans completed: 20
- Average duration: 5min
- Total execution time: 93min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 0 | 5/5 | 24min | 5min |
| Phase 1 | 4/5 | 14min | 4min |
| Phase 2 | 7/7 | 22min | 3min |
| Phase 3 | 6/6 | 33min | 6min |

**Recent Trend:**
- Last plan: 03-06 (6min, complete)
- Previous: 03-05 (4min)
- Trend: Stabilizing around 3-8min (6→4→5→3→7→3→4→4→3→3→6→4→2→4→4→7→8→4→6min)

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
- Environment loading order: System env → Root .env → App .env → App .env.local (gitignored overrides)

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

**From Roadmap:**
- 8-phase structure derived from requirement boundaries, research flags Phase 0 as critical for avoiding monorepo complexity spike
- Neo4j-Bun compatibility needs resolution in Phase 1, GraphRAG dual-channel is key capability, use proven sync engines for mobile

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 0 - COMPLETE:**
- ~~Monorepo tool selection (Turborepo vs. Nx)~~ - RESOLVED: Using Turborepo from omnii (already working)
- ~~Codebase "source of truth" per domain~~ - RESOLVED: Monorepo for all domains (see Plan 00-02 decisions)
- ~~MCP merge strategy~~ - RESOLVED: Skip merge, workspace is canonical (see Plan 00-03 decisions)
- ~~Runtime validation needed~~ - RESOLVED: omnii-mcp app startup confirmed (✅ initializes, env var failure expected)
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

**Phase 5 research needed:**
- CRDT library selection (Automerge vs. Yjs vs. Replicache) for conflict-free sync
- Mobile background sync optimization for battery impact

## Session Continuity

Last session: 2026-01-25T18:28:49Z
Stopped at: Completed 03-06-PLAN.md
Resume file: None

**Phase 3 Status:** Complete. 6/6 plans complete (100%). GraphRAG services operational (temporal filtering, dual-channel retrieval), domain MCP tools operational (calendar, contacts, tasks), relationship discovery via LLM entity extraction, and multi-client MCP integration complete (Claude Desktop, OpenAI API, Ollama, LM Studio). Ready for Phase 4 data ingestion.
