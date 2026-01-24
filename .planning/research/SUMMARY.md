# Project Research Summary

**Project:** Omnii One - Personal Context Server
**Domain:** Personal knowledge graph / MCP server / Local-first AI context system
**Researched:** 2026-01-24
**Confidence:** MEDIUM-HIGH

## Executive Summary

Omnii One sits at a strategic intersection: a personal knowledge graph that exposes context to AI assistants via MCP, built with local-first architecture for privacy, and consolidating three divergent codebases. Research reveals this is a **high-value white space** — no major competitor combines graph-native storage, MCP exposure, and n8n extensibility. However, success hinges on avoiding the "build everything at once" trap that plagues 60% of AI projects.

The recommended approach prioritizes **retrieval over ingestion**: design how AI queries the graph before populating it. Use Neo4j's database-per-user multi-tenancy for complete isolation, implement GraphRAG (dual-channel vector + graph retrieval) for 67% better accuracy than traditional RAG, and expose capabilities via MCP's official TypeScript SDK. The critical path is Foundation → MCP Exposure → Mobile Client, resisting scope creep into too many data sources simultaneously.

**Key risks and mitigation:** (1) **Neo4j-Bun incompatibility** requires HTTP proxy layer or alternative database; (2) **Monorepo consolidation** demands specialized tooling (Nx/Turborepo) before merge; (3) **Local-first sync conflicts** require CRDTs or proven sync engines, not custom implementations; (4) **MCP security vulnerabilities** necessitate tool permission boundaries and input validation from day one. Start with ONE data source, validate AI improvement, then expand incrementally.

## Key Findings

### Recommended Stack

The stack is modern and production-ready for 2025-2026, but faces a **critical incompatibility issue**: Neo4j's JavaScript driver doesn't work reliably with Bun runtime. This requires architectural mitigation before implementation begins.

**Core technologies:**
- **Bun + Elysia**: Recommended for 3x Node.js performance, native TypeScript, end-to-end type safety via Eden Treaty. Caveat: Neo4j compatibility blocker requires HTTP proxy layer
- **Neo4j 5.21+**: Industry-leading graph database with native vector search (HNSW), mature multi-tenancy via database-per-user pattern, excellent GraphRAG ecosystem. Use database-per-tenant, not label-based filtering
- **Supabase**: PostgreSQL + auth + storage with native MCP authentication support (OAuth 2.1), RLS for multi-tenancy, local development via Docker. Handles user profiles, auth, relational metadata
- **MCP TypeScript SDK**: Official implementation supporting Streamable HTTP, OAuth helpers, full 2025-11-25 spec. Avoid niche frameworks; stick with battle-tested SDK
- **React Native + Expo SDK 52+**: Mobile framework with official local-first architecture docs. Use Expo Router for file-based navigation, Legend-State or TinyBase for offline sync
- **n8n (self-hosted)**: Workflow orchestration with 400+ integrations, native AI/LangChain support, pairs with Composio for secure OAuth
- **Composio**: Brokered credentials for external integrations (Google, etc.), tokens never reach app runtime, SOC 2 compliant

**Critical decision required:** Neo4j + Bun incompatibility mitigation. Options: (A) HTTP proxy layer wrapping neo4j-driver in Node.js, (B) Alternative graph DB (FalkorDB, SurrealDB), or (C) Hybrid runtime. Recommendation: Option A if GraphRAG ecosystem is non-negotiable.

**Confidence note:** HIGH on individual technologies, MEDIUM on integration approach due to Bun-Neo4j conflict requiring workaround.

### Expected Features

The competitive landscape divides into knowledge management (Obsidian), AI-first memory (Mem.ai, Rewind), and personal CRM (Clay). Omnii One's unique positioning combines all three via MCP exposure — no competitor offers this.

**Must have (table stakes):**
- Multi-source data ingestion — users expect data everywhere (email, calendar, notes, files)
- Semantic search — 2026 baseline; keyword-only feels outdated
- Graph visualization — users need to see connections to trust the system
- Offline mode — local-first expected; cloud-only is dealbreaker
- Mobile access — capture/retrieve anywhere with offline-first architecture
- Privacy controls — local storage option, transparent data usage (Rewind's local-only was key selling point)
- Auto-categorization — AI must reduce manual organization friction

**Should have (competitive differentiators):**
- **MCP server exposure** — UNIQUE POSITIONING: let AI assistants access personal context natively (no major competitor does this)
- **GraphRAG retrieval** — 67% better accuracy vs. traditional RAG via dual-channel (vector + graph traversal)
- **n8n workflow integration** — power users build custom automations (auto-import Slack, summarize emails)
- **Relationship discovery** — surface hidden connections via graph algorithms (community detection, similarity)
- **Automatic data enrichment** — AI fills missing details (job titles, company info) without user input
- **Contextual resurfacing** — proactive "Heads Up" notifications before meetings

**Defer (v2+):**
- Built-in note editor — focus on ingestion + retrieval; let users write where they want (Obsidian, Notion)
- Voice-first capture — valuable but mobile-dependent, complex transcription pipeline
- Social/sharing features — anti-pattern for personal data; focus on individual use
- Multi-modal storage (images, PDFs, audio) — start text-only, expand incrementally

**Anti-features (explicitly avoid):**
- Built-in LLM — expensive, outdated quickly; MCP lets users bring their own (Claude, ChatGPT)
- Rigid folder hierarchies — goes against graph/networked thought model; use tags + graph
- Single AI model lock-in — model-agnostic MCP approach is strategically superior

### Architecture Approach

The architecture follows a multi-layered pattern with clear separation: MCP server layer exposes knowledge graph to AI applications, backend API (Bun/Elysia) orchestrates business logic and real-time communication, Neo4j stores per-user graph databases, Supabase handles auth and relational data, n8n coordinates workflows and external integrations, and mobile clients use local-first architecture with offline sync.

**Major components:**
1. **MCP Server Layer** — Exposes tools, resources, and prompts to AI applications via JSON-RPC 2.0. Supports STDIO (local) and HTTP+SSE (remote). Provides graph queries, entity creation, action execution, and intervention requests
2. **Backend API Layer (Bun/Elysia)** — Business logic with tRPC WebSocket subscriptions for real-time updates. Houses entity recognition (BiLSTM+CRF), action planning, intervention management, and sync service (delta sync with conflict resolution)
3. **Neo4j Graph Layer** — Multi-tenant via database-per-user (complete isolation). Stores entities, relationships, concepts with embeddings for semantic search. Implements GraphRAG with hybrid retrieval (BM25 + vector)
4. **Supabase Layer** — Authentication (JWT with tenant_id in app_metadata), RLS for relational data, OAuth integration. PostgreSQL for user profiles, settings, metadata
5. **n8n Orchestration Layer** — Workflow automation for data pipelines, external service integration (Google via Composio), multi-agent AI workflows, scheduled tasks
6. **Mobile Client Layer (React Native/Expo)** — Offline-first with local Realm/SQLite, tRPC WebSocket sync, background sync with jitter, conflict resolution via CRDTs or proven sync engine

**Critical patterns to follow:**
- **Database-per-tenant** (Neo4j 4.0+): Complete data isolation, independent backups, aligns with local-first philosophy
- **GraphRAG dual-channel retrieval**: Vector search + graph traversal combined for 90% hallucination reduction vs. traditional RAG
- **Local-first with delta sync**: Store locally first, sync changes in batches, conflict resolution via CRDTs (Automerge, Yjs)
- **Brokered credentials (Composio)**: OAuth tokens never reach app runtime, automatic lifecycle management, SOC 2 compliant

**Anti-patterns to avoid:**
- Polling for real-time updates — use WebSocket subscriptions instead
- Shared Neo4j database with label filtering — data leakage risk, performance issues
- Full-sync on every app launch — use first-time sync + delta sync pattern
- Synchronous graph queries blocking UI — local-first with async background sync
- Monolithic MCP server — one server = one clear purpose; separate filesystem/database/API servers

### Critical Pitfalls

Research identified 26 pitfalls across six high-risk domains. Top 5 critical issues:

1. **Building for the graph, not for inference** — Elaborate schemas but no retrieval strategy; graph becomes data graveyard. **Prevention:** Design retrieval patterns BEFORE schema, prototype queries first, measure context relevance (not just graph completeness), build for GraphRAG (unstructured RAG through structured knowledge-graph layer)
2. **MCP security vulnerabilities** — Prompt injection, data exfiltration via tool composition, command injection. **Prevention:** Least-privilege tool access, validate/sanitize ALL inputs, use official MCP SDK (avoid niche frameworks), rate limiting, audit tool composition, proper credential storage (system keychains, secrets managers)
3. **Neo4j multi-tenancy data isolation failures** — User data bleeds across tenants due to label-based partitioning or improper privileges. **Prevention:** Use database-per-tenant (Neo4j 4.0+), create tenant-specific admin roles (no global admin), design for single-database constraints (relationships can't span databases), test isolation upfront
4. **Monorepo consolidation without specialized tooling** — Build times explode, tests run unnecessarily, CI breaks, team abandons monorepo. **Prevention:** Adopt Nx/Turborepo BEFORE consolidation, implement incremental builds, configure smart caching, migrate incrementally (not "big bang"), reconfigure CI/CD for monorepo
5. **Local-first sync conflicts without CRDT strategy** — Naive last-write-wins causes lost edits, data inconsistencies, user trust erosion. **Prevention:** Adopt CRDTs (Automerge, Yjs) or proven sync engines (Replicache, WatermelonDB), don't write custom sync (rabbit hole of edge cases), design conflict-free operations where possible, test offline scenarios rigorously

**Additional high-risk pitfalls:**
- **Consolidation-specific**: Assuming "similar tech" means "easy merge" — React Native/Neo4j/n8n versions may be incompatible despite surface similarity. Requires deep divergence analysis BEFORE consolidation
- **Scope creep**: Attempting to model entire user life (emails, calendar, photos, documents, social media) simultaneously — project never ships. Start with ONE data source, validate AI improvement before adding next
- **Context data quality neglect**: 60% of AI projects without AI-ready data abandoned through 2026. Build quality gates into ingestion pipeline (validate, clean, strip HTML, normalize formats)

## Implications for Roadmap

Based on research, the critical path is Foundation → MCP Exposure → Mobile Client. Attempting to build all layers simultaneously risks the "complexity spike" that derails 34% of monorepo consolidations. Each phase must deliver working functionality before proceeding.

### Phase 0: Pre-Consolidation (Preparation)
**Rationale:** Monorepo consolidation without specialized tooling causes build time explosions and CI breakage. Must establish infrastructure before merging codebases.

**Delivers:**
- Monorepo tooling selected and configured (Nx or Turborepo)
- Deep divergence analysis of three codebases (omnii, omnii-mobile, omnii-mcp)
- Merge strategy document (which codebase is "source of truth" per domain)
- Environment variable reconciliation plan (namespace conflicts identified)
- Git workflow defined (hybrid: rebase local, merge for integration)

**Avoids:**
- Pitfall #4: Monorepo consolidation without specialized tooling
- Pitfall #24: Assuming "similar tech" means "easy merge"
- Pitfall #6: Git divergent branch reconciliation chaos

**Research flags:** Standard patterns; skip research-phase (established monorepo best practices)

### Phase 1: Foundation Infrastructure
**Rationale:** Authentication and data storage are prerequisites for all functionality. Neo4j multi-tenancy decision must be made upfront; migrating from label-based to database-per-tenant later is complex and risky.

**Delivers:**
- Supabase setup (auth with JWT containing tenant_id in app_metadata, RLS policies)
- Neo4j multi-database setup (database-per-user provisioning on signup)
- Basic graph schema (Entity, Concept, Relationship nodes)
- Neo4j-Bun compatibility mitigation (HTTP proxy layer or alternative DB decision finalized)
- Initial monorepo consolidation (first codebase migrated with tooling validation)

**Addresses features:**
- Privacy controls (database-per-user isolation)
- Multi-tenancy foundation for all future features

**Avoids:**
- Pitfall #3: Neo4j multi-tenancy data isolation failures
- Pitfall #1: Building for graph without retrieval strategy (design core queries first)

**Research flags:**
- **Needs deeper research:** Neo4j-Bun mitigation strategy (HTTP proxy implementation or FalkorDB/SurrealDB evaluation)
- **Standard patterns:** Supabase auth, RLS policies (well-documented)

### Phase 2: Backend API + MCP Server
**Rationale:** MCP exposure is the unique differentiator. Building this layer early validates the core value proposition and enables AI-assisted development of subsequent phases.

**Delivers:**
- Bun/Elysia backend with tRPC WebSocket support
- MCP server layer (tools, resources, prompts via official TypeScript SDK)
- GraphRAG retrieval (dual-channel: vector search + graph traversal)
- Basic entity CRUD operations
- MCP security boundaries (tool permissions, input validation, rate limiting)
- Second codebase consolidated into monorepo

**Addresses features:**
- MCP server exposure (UNIQUE positioning)
- Semantic search (2026 baseline)
- GraphRAG retrieval (67% better accuracy)

**Avoids:**
- Pitfall #2: MCP security vulnerabilities (implement auth, tool permissions from start)
- Pitfall #15: MCP server monolith (design multi-server architecture)
- Pitfall #1: Building for graph not inference (retrieval-first approach)

**Research flags:**
- **Needs deeper research:** GraphRAG implementation patterns, embedding model selection (OpenAI vs. local)
- **Standard patterns:** tRPC setup, basic CRUD operations

### Phase 3: Mobile Client + Offline Sync
**Rationale:** Mobile-first architecture with offline capabilities is table stakes. Local-first sync is the most complex technical challenge; getting it wrong causes user trust erosion from lost edits.

**Delivers:**
- React Native/Expo app structure with Expo Router
- Local-first data layer (Realm for graph-like relationships)
- Delta sync implementation (last sync timestamp tracking, conflict resolution)
- tRPC WebSocket subscriptions for real-time updates
- Background sync with jitter (avoid DDoS on own servers)
- Third codebase consolidated into monorepo

**Addresses features:**
- Mobile access (capture/retrieve anywhere)
- Offline mode (local-first expected)
- Cross-device sync (conflict resolution)

**Avoids:**
- Pitfall #5: Local-first sync without CRDT strategy (use Automerge/Yjs or proven sync engine)
- Pitfall #12: Background task API overload (implement jitter, JSON-only)
- Pitfall #13: Offline-first wishful thinking (test with airplane mode)

**Research flags:**
- **Needs deeper research:** CRDT library selection (Automerge vs. Yjs vs. Replicache), conflict resolution strategies
- **Needs deeper research:** Mobile background sync optimization, iOS/Android battery impact mitigation

### Phase 4: External Integrations (n8n + Composio)
**Rationale:** Multi-source data ingestion is table stakes, but attempting too many sources simultaneously causes scope creep. Start with ONE source (Google Calendar recommended), validate AI improvement, then expand.

**Delivers:**
- n8n workflow orchestration setup (self-hosted)
- Composio integration (brokered credentials for Google OAuth)
- Google Calendar ingestion (first data source)
- Data quality pipeline (validate, clean, strip HTML, normalize)
- Workflow error handling templates
- Auto-categorization (tag suggestions based on graph structure)

**Addresses features:**
- Multi-source data ingestion (start with calendar)
- Auto-categorization (AI reduces manual organization)
- n8n workflow integration (power-user differentiator)

**Avoids:**
- Pitfall #14: Scope creep (start with ONE source, resist "just add everything")
- Pitfall #7-10: n8n workflow mistakes (credential management, error handling, batching, debug mode)
- Pitfall #16: Context data quality neglect (build quality gates)

**Research flags:**
- **Needs deeper research:** Composio MCP integration patterns, Google API rate limits and error handling
- **Standard patterns:** n8n workflow basics (well-documented)

### Phase 5: AI Intelligence Layer
**Rationale:** Entity recognition and relationship discovery require working graph + data pipeline. Building this before foundation is "cart before horse."

**Delivers:**
- Entity recognition service (NLP pipeline: BiLSTM + CRF)
- Automatic relationship extraction from ingested data
- Graph visualization (interactive, filterable)
- Relationship discovery algorithms (community detection, similarity)
- Contextual resurfacing ("Heads Up" before meetings)

**Addresses features:**
- Graph visualization (trust builder)
- Relationship discovery (surface hidden connections)
- Automatic data enrichment (AI fills missing details)
- Contextual resurfacing (proactive notifications)

**Avoids:**
- Pitfall #1: Over-personalization (measure context relevance, not volume)
- Pitfall #16: Poor data quality causing AI confusion

**Research flags:**
- **Needs deeper research:** Entity recognition model selection (spaCy vs. BERT vs. custom), relationship extraction patterns
- **Needs deeper research:** Graph visualization library (force-directed layout performance at scale)

### Phase 6: Production Hardening
**Rationale:** Once core functionality works, production-ready polish prevents post-launch fires.

**Delivers:**
- Advanced mobile features (push notifications, adaptive sync frequency)
- Monitoring and observability (Sentry error tracking, performance monitoring)
- Audit logging (compliance for personal data)
- Data export functionality (JSON, Markdown, CSV)
- Version history (rollback AI changes)

**Addresses features:**
- Data export (reduce lock-in fears)

**Avoids:**
- Production incidents from unmonitored failures

**Research flags:** Standard patterns; skip research-phase (established DevOps practices)

### Phase Ordering Rationale

**Why this sequence:**
1. **Foundation before features** — Auth and data storage are prerequisites; attempting features first causes rework
2. **MCP early for validation** — Unique differentiator should be validated early; enables AI-assisted development of later phases
3. **Mobile after backend** — Client depends on API; reversing this causes mock data overhead and integration pain
4. **Integrations after core** — External data sources require stable ingestion pipeline; adding too early causes complexity spike
5. **AI intelligence last in core** — Requires working graph + data; building first is "cart before horse"

**How this avoids pitfalls:**
- **Incremental consolidation** (Phase 0-3) — One codebase per phase prevents "big bang" merge disaster
- **Retrieval-first** (Phase 1-2) — Design how AI queries graph before populating it
- **One data source first** (Phase 4) — Resist scope creep; validate improvement before expanding
- **CRDT strategy upfront** (Phase 3) — Local-first sync planned from start, not retrofitted

**Dependencies validated:**
- Mobile client → Backend API → Auth/Database ✓
- Sync engine → Mobile client + Backend API ✓
- n8n workflows → Backend API + External OAuth ✓
- Entity recognition → Backend API + Neo4j ✓
- MCP server → GraphRAG + Entity recognition + Backend API ✓

**Parallel opportunities:**
- Mobile UI development (Phase 3) can start with mock data while Phase 2 completes
- n8n workflow design (Phase 4) can begin while Phase 3 sync engine is being tested
- Monitoring setup (Phase 6) can be incremental throughout earlier phases

### Research Flags

**Phases needing `/gsd:research-phase` during planning:**
- **Phase 1:** Neo4j-Bun mitigation strategies (sparse documentation on HTTP proxy patterns)
- **Phase 2:** GraphRAG implementation with LangChain + Neo4j (emerging patterns, need current examples)
- **Phase 3:** CRDT library comparison for React Native offline sync (multiple options, need decision framework)
- **Phase 4:** Composio MCP integration patterns (new feature, limited documentation)
- **Phase 5:** Entity recognition model selection and graph algorithms (complex domain, performance tradeoffs)

**Phases with standard patterns (skip research-phase):**
- **Phase 0:** Monorepo tooling (Nx/Turborepo well-documented)
- **Phase 1:** Supabase auth + RLS (official guides comprehensive)
- **Phase 2:** tRPC setup, basic CRUD (standard patterns)
- **Phase 4:** Basic n8n workflows (extensive community examples)
- **Phase 6:** DevOps monitoring (established practices)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Technologies individually proven, but Neo4j-Bun incompatibility requires workaround. HTTP proxy mitigation path exists but adds complexity. Alternative DBs (FalkorDB, SurrealDB) less mature for GraphRAG. |
| Features | HIGH | Competitive landscape well-researched with 2026 sources. MCP positioning validated as unique. Table stakes vs. differentiators clearly identified based on user expectations across Obsidian, Mem.ai, Clay, Rewind. |
| Architecture | MEDIUM-HIGH | Patterns are proven (local-first, database-per-tenant, GraphRAG) but integration complexity is high. Six-layer architecture requires careful orchestration. tRPC WebSocket + CRDT sync is cutting-edge but has working examples. |
| Pitfalls | HIGH | 26 pitfalls identified from 2025-2026 sources, cross-validated across domains. Critical issues (graph-not-inference, MCP security, multi-tenancy isolation, monorepo tooling, CRDT sync) have clear prevention strategies with high-confidence sources. |

**Overall confidence:** MEDIUM-HIGH

Research is comprehensive across stack, features, architecture, and pitfalls. Lower confidence areas are concentrated in **integration complexity** (Neo4j-Bun workaround, six-layer orchestration) rather than fundamental approach validity. The recommended path (retrieval-first, incremental consolidation, one data source initially) has high confidence based on industry research showing 60% of AI projects without data quality fail and 34% of monorepos experience complexity spikes.

### Gaps to Address

**Critical gaps requiring decisions before Phase 1:**

1. **Neo4j-Bun mitigation strategy** — Must choose between: (A) HTTP proxy layer (Node.js wrapper), (B) Alternative graph DB (FalkorDB for GraphRAG optimization or SurrealDB for Bun compatibility), or (C) Hybrid runtime. Recommendation: Option A if GraphRAG ecosystem is non-negotiable; Option B if Bun native compatibility prioritized. **Action:** Prototype both approaches in Phase 1, measure latency/complexity tradeoffs.

2. **Codebase consolidation "source of truth"** — Three divergent codebases (omnii, omnii-mobile, omnii-mcp) likely have incompatible React Native architectures (old bridge vs. new Fabric), Neo4j schema designs, n8n workflow integration patterns. **Action:** Deep divergence analysis in Phase 0 to identify which codebase's patterns become canonical per domain (mobile architecture, graph schema, MCP server structure).

3. **Embedding model selection** — OpenAI (proven quality, expensive, cloud-dependent) vs. local models (nomic-embed-text, bge-small, E5-base-instruct for offline mobile). **Action:** Start with OpenAI for MVP, add local embedding fallback incrementally for offline use cases. Measure retrieval quality delta.

**Moderate gaps for validation during implementation:**

4. **CRDT library choice** — Automerge (feature-rich, larger bundle) vs. Yjs (performance-optimized, lightweight) vs. Replicache (full sync engine). **Action:** Phase 3 research-phase to prototype conflict scenarios with realistic data, measure mobile bundle size impact.

5. **Graph visualization library** — Force-directed layout performance degrades at scale (>1000 nodes). **Action:** Defer to Phase 5; evaluate D3.js vs. Cytoscape.js vs. vis.js with actual user graph sizes.

6. **MCP tool granularity** — High-level domain tools (`schedule_meeting`) vs. low-level graph CRUD (`create_entity`). **Action:** Phase 2 to design both levels, let AI applications choose abstraction based on task.

**Non-blocking gaps (can resolve later):**

7. **Multi-modal storage** — Text-only sufficient for MVP; images/PDFs/audio deferred to v2+. **Action:** Design schema extensibility for future addition.

8. **Voice capture transcription** — Valuable but complex pipeline (Whisper integration, audio storage, speaker diarization). **Action:** Defer to post-Phase 6; focus on text ingestion first.

## Critical Decisions Summary

These decisions must be made before implementation begins:

### Decision 1: Neo4j-Bun Compatibility Mitigation
**Options:**
- A) HTTP proxy layer (Node.js service wrapping neo4j-driver, Bun/Elysia communicates via REST)
- B) Alternative graph DB (FalkorDB for GraphRAG, SurrealDB for Bun native compatibility)
- C) Switch runtime for DB queries only (Bun for HTTP, Node child processes for Neo4j)

**Recommendation:** Option A if GraphRAG ecosystem is non-negotiable. Option B if flexibility exists and native Bun compatibility prioritized.

**Action required:** Decide in Phase 1 before graph implementation.

### Decision 2: Monorepo Consolidation Strategy
**Context:** Three codebases with divergent patterns despite similar technologies.

**Approach:**
- Adopt Nx or Turborepo in Phase 0 before any consolidation
- Deep divergence analysis to identify incompatibilities (React Native architecture versions, Neo4j schema patterns, n8n workflow integration approaches)
- Incremental migration: one codebase per phase (Phases 0-3)
- Define "source of truth" per domain in merge strategy document

**Action required:** Complete Phase 0 analysis before consolidation begins.

### Decision 3: Initial Data Source Scope
**Context:** Multi-source ingestion is table stakes, but scope creep is a documented failure mode.

**Recommendation:** Start with ONE high-value source (Google Calendar recommended).

**Rationale:**
- Calendar data is structured (easy ingestion)
- Time-based context is valuable for "Heads Up" feature
- Validates retrieval quality before adding complexity
- Avoids the "build everything at once" trap that causes 60% of AI projects to fail

**Action required:** Resist pressure to add email, documents, social media simultaneously in Phase 4.

### Decision 4: CRDT vs. Proven Sync Engine
**Context:** Local-first sync without conflict-free strategy causes lost edits and user trust erosion.

**Options:**
- A) Implement CRDT library (Automerge or Yjs)
- B) Use proven sync engine (Replicache, WatermelonDB with sync, PowerSync)
- C) Custom sync logic (NOT RECOMMENDED — "rabbit hole of edge cases")

**Recommendation:** Option B (proven sync engine) for faster time-to-market, Option A if full control required.

**Action required:** Decide in Phase 3 planning.

### Decision 5: MCP Server Granularity
**Context:** Tool abstraction level affects AI agent experience.

**Approach:**
- Implement BOTH high-level domain tools (`schedule_meeting`, `find_contact`) AND low-level graph operations (`query_graph`, `create_entity`)
- Let AI applications choose abstraction based on task complexity
- Follow MCP best practice: "One server = one clear purpose" (separate filesystem, database, calendar servers)

**Action required:** Design multi-server architecture in Phase 2.

## Tensions and Conflicts

Research revealed several strategic tensions requiring explicit resolution:

### Tension 1: Performance vs. Compatibility (Bun vs. Neo4j)
**Conflict:** Bun provides 3x Node.js performance and superior DX, but Neo4j driver has known incompatibilities causing connection hangs and debugging issues.

**Impact:** Forces choice between runtime performance and database ecosystem maturity.

**Resolution path:** HTTP proxy layer preserves both (Bun for API, Node wrapper for Neo4j). Alternative DBs (FalkorDB, SurrealDB) sacrifice GraphRAG ecosystem maturity for native Bun compatibility.

**Roadmap impact:** Phase 1 must include compatibility layer implementation; adds architectural complexity but preserves both advantages.

### Tension 2: Privacy vs. Convenience (Local-First vs. Cloud Sync)
**Conflict:** Users demand privacy (local-first, offline-capable) but also expect seamless cross-device sync and cloud backup.

**Impact:** Requires sophisticated sync architecture; naive approaches cause data loss and conflicts.

**Resolution path:** Local-first data layer (Realm/SQLite) with optional cloud sync (Supabase). User controls sync behavior; default is offline-capable with opt-in cloud.

**Roadmap impact:** Phase 3 sync implementation is critical path; getting it wrong causes user trust erosion.

### Tension 3: Scope vs. Shipping (Data Source Breadth)
**Conflict:** Knowledge graphs thrive on comprehensive context (emails, calendar, documents, social, health), but attempting all sources simultaneously prevents shipping.

**Impact:** Scope creep is documented as top failure mode for personal AI systems.

**Resolution path:** Start with ONE source (calendar), validate AI improvement, expand incrementally. Resist "just add everything" instinct.

**Roadmap impact:** Phase 4 scoped to single integration; additional sources become Phase 7+ based on validated improvement metrics.

### Tension 4: Flexibility vs. Maintainability (Custom vs. Proven Solutions)
**Conflict:** Custom implementations offer full control (sync logic, embedding pipelines, graph algorithms) but increase maintenance burden and bug surface area.

**Impact:** "Not invented here" syndrome causes teams to rebuild solved problems poorly.

**Resolution path:** Use battle-tested solutions (official MCP SDK, proven CRDT libraries, established sync engines) unless differentiation requires custom.

**Roadmap impact:** Phase 2 uses official MCP SDK (not niche frameworks), Phase 3 uses proven sync engine (not custom), Phase 5 uses established NLP libraries (spaCy/BERT).

### Tension 5: Monorepo Benefits vs. Consolidation Complexity
**Conflict:** Monorepos enable code sharing and unified tooling, but 34% experience short-term complexity spikes that derail progress.

**Impact:** Consolidation without specialized tooling causes build explosions, CI breakage, team frustration.

**Resolution path:** Invest in tooling (Nx/Turborepo) BEFORE consolidation. Incremental migration over 3 phases prevents "big bang" disaster.

**Roadmap impact:** Phase 0 dedicated to tooling setup; upfront investment prevents later rework.

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- Bun official documentation: [Containerize with Docker](https://bun.com/docs/guides/ecosystem/docker)
- Neo4j official documentation: [Multi-Tenancy Worked Example](https://neo4j.com/developer/multi-tenancy-worked-example/)
- MCP official specification: [TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- Expo official documentation: [Local-First Architecture](https://docs.expo.dev/guides/local-first/)
- Supabase official documentation: [MCP Authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)

**Features Research:**
- Anthropic MCP announcement: [Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)
- Mem.ai product updates: [Mem 2.0 features](https://get.mem.ai/blog/mem-2-dot-0)
- Notion AI 2026 releases: [Official releases page](https://www.notion.com/releases/2026-01-20)
- Contextual retrieval best practices: [Anthropic blog](https://www.anthropic.com/news/contextual-retrieval)

**Architecture Research:**
- MCP architecture documentation: [Official architecture guide](https://modelcontextprotocol.io/docs/learn/architecture)
- tRPC WebSocket documentation: [Subscriptions guide](https://trpc.io/docs/server/subscriptions)
- Neo4j GraphRAG: [Blog post](https://neo4j.com/blog/developer/neo4j-graphrag-workflow-langchain-langgraph/)
- Local-first 2026 architecture: [DEV Community article](https://dev.to/the_nortern_dev/the-architecture-shift-why-im-betting-on-local-first-in-2026-1nh6)

**Pitfalls Research:**
- MCP security analysis: [Red Hat blog](https://www.redhat.com/en/blog/model-context-protocol-mcp-understanding-security-risks-and-controls)
- Monorepo mistakes: [InfoQ presentation](https://www.infoq.com/presentations/monorepo-mistakes/)
- Local-first sync patterns: [Evil Martians blog](https://evilmartians.com/chronicles/cool-front-end-arts-of-local-first-storage-sync-and-conflicts)
- Knowledge graph anti-patterns: [Cognee blog](https://www.cognee.ai/blog/fundamentals/knowledge-graph-myths)

### Secondary (MEDIUM confidence)

**Stack:**
- Bun + Neo4j compatibility issues: [GitHub Issue #12772](https://github.com/oven-sh/bun/issues/12772)
- GraphRAG 2026 trends: [RAGflow blog](https://ragflow.io/blog/rag-review-2025-from-rag-to-context)
- Best embedding models 2026: [Elephas blog](https://elephas.app/blog/best-embedding-models)
- n8n hybrid automation: [Community discussion](https://community.n8n.io/t/when-workflows-meet-agents-emerging-patterns-for-hybrid-automation-in-2025/157805)

**Features:**
- Second brain apps comparison: [AFFiNE blog](https://affine.pro/blog/best-second-brain-apps)
- Personal CRM tools 2026: [Monday blog](https://monday.com/blog/crm-and-sales/personal-crm-software/)
- Privacy trends 2026: [SecurePrivacy blog](https://secureprivacy.ai/blog/data-privacy-trends-2026)

**Architecture:**
- Neo4j multi-tenancy patterns: [GraphAware blog (2020)](https://graphaware.com/blog/multi-tenancy-neo4j/)
- Multi-agent orchestration: [n8n blog](https://blog.n8n.io/multi-agent-systems/)
- React Native databases 2026: [Algosoft blog](https://www.algosoft.co/blogs/top-11-local-databases-for-react-native-app-development-in-2026/)

**Pitfalls:**
- n8n workflow mistakes: [Medium article](https://medium.com/@connect.hashblock/5-n8n-workflow-mistakes-that-quietly-break-automation-f1a4cfdac8bc)
- CRDT vs. OT comparison: [DEV Community](https://dev.to/puritanic/building-collaborative-interfaces-operational-transforms-vs-crdts-2obo)
- Context rot research: [Chroma blog](https://research.trychroma.com/context-rot)

### Tertiary (LOW confidence, needs validation)

- FalkorDB vs. Neo4j for GraphRAG (limited production comparisons; needs benchmarking)
- Legend-State vs. TinyBase for React Native (both newer; needs real-world usage validation)
- Composio MCP integration patterns (new feature, sparse documentation; needs prototyping)

---
*Research completed: 2026-01-24*
*Ready for roadmap: yes*
*Total sources: 75+ verified across official docs, 2025-2026 articles, academic research*
