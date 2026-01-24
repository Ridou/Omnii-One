# Roadmap: Omnii One

## Overview

This roadmap consolidates three divergent codebases (omnii monorepo, omnii-mobile, omnii-mcp) into a unified personal context server that exposes a knowledge graph to AI assistants via MCP. The journey moves from monorepo foundation through core infrastructure, MCP exposure, data ingestion, mobile client, orchestration, and production hardening. Success depends on avoiding the "build everything at once" trap: we start with retrieval patterns before schema complexity, consolidate incrementally across phases, and validate with ONE data source before expanding.

## Phases

**Phase Numbering:**
- Integer phases (0, 1, 2, 3...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 0: Monorepo Consolidation Preparation** - Establish tooling and merge strategy before consolidation
- [ ] **Phase 1: Foundation Infrastructure** - Authentication, Neo4j multi-tenancy, compatibility resolution
- [ ] **Phase 2: Graph Core & MCP Server** - Graph schema, basic CRUD, MCP protocol implementation
- [ ] **Phase 3: GraphRAG & Advanced MCP** - Dual-channel retrieval, domain-aware tools, multi-AI support
- [ ] **Phase 4: Data Ingestion Pipeline** - Google services integration with quality gates
- [ ] **Phase 5: Mobile Client & Offline Sync** - React Native app with local-first architecture
- [ ] **Phase 6: Orchestration & Automation** - n8n workflows, AI-triggered execution
- [ ] **Phase 7: Production Hardening** - Monitoring, audit logging, advanced mobile features

## Phase Details

### Phase 0: Monorepo Consolidation Preparation
**Goal**: Establish monorepo infrastructure and consolidation strategy before merging codebases to avoid the 34% complexity spike failure rate

**Depends on**: Nothing (first phase)

**Requirements**: FOUND-01

**Success Criteria** (what must be TRUE):
1. Monorepo tooling (Turborepo or Nx) configured with incremental builds and smart caching
2. Deep divergence analysis document exists identifying incompatibilities across three codebases (React Native versions, Neo4j schemas, n8n patterns)
3. Merge strategy document defines "source of truth" per domain (mobile architecture, graph schema, MCP server structure)
4. Environment variable reconciliation plan addresses namespace conflicts
5. First codebase successfully migrated with validated tooling

**Plans:** 5 plans in 4 waves

Plans:
- [ ] 00-01-PLAN.md — Bootstrap monorepo from omnii with git history preservation
- [ ] 00-02-PLAN.md — Deep divergence analysis and merge strategy documentation
- [ ] 00-03-PLAN.md — Merge unique features from standalone omnii-mcp
- [ ] 00-04-PLAN.md — Environment variable reconciliation and turbo.json updates
- [ ] 00-05-PLAN.md — Validate Turborepo tooling and configure Syncpack

---

### Phase 1: Foundation Infrastructure
**Goal**: Establish authentication, data storage, and Neo4j-Bun compatibility layer to enable all downstream functionality

**Depends on**: Phase 0

**Requirements**: FOUND-02, FOUND-03, FOUND-04, FOUND-05, GRAPH-01, SEC-01, SEC-02, SEC-05

**Success Criteria** (what must be TRUE):
1. User can authenticate with Google OAuth via Supabase and receive JWT with tenant_id
2. New user signup automatically provisions isolated Neo4j database (database-per-user pattern)
3. Neo4j-Bun compatibility issue resolved via HTTP proxy layer or alternative database decision finalized and working
4. Environment configuration system supports local, dev, and prod environments with proper secret management
5. Second codebase consolidated into monorepo using established tooling

**Plans**: TBD

Plans:
- [ ] 01-01: TBD (to be planned)

---

### Phase 2: Graph Core & MCP Server
**Goal**: Implement graph schema and MCP protocol layer to validate the core differentiator early

**Depends on**: Phase 1

**Requirements**: GRAPH-02, GRAPH-03, GRAPH-04, MCP-01, MCP-02, MCP-03, MCP-05, MCP-06, MCP-09, SEC-03

**Success Criteria** (what must be TRUE):
1. Graph schema supports concepts, entities, events, and contacts with proper relationships
2. Basic CRUD operations work for creating, reading, updating, and deleting nodes and relationships
3. Vector index configured for semantic search on entity embeddings
4. MCP server exposes working tools for basic graph queries (search nodes, get context, list entities)
5. Claude Desktop can connect to MCP server and execute graph query tools successfully
6. MCP requests are authenticated and rate-limited to prevent abuse

**Plans**: TBD

Plans:
- [ ] 02-01: TBD (to be planned)

---

### Phase 3: GraphRAG & Advanced MCP
**Goal**: Implement dual-channel retrieval (67% better accuracy) and domain-aware tools for OpenAI and local LLMs

**Depends on**: Phase 2

**Requirements**: GRAPH-05, GRAPH-06, GRAPH-07, MCP-04, MCP-07, MCP-08

**Success Criteria** (what must be TRUE):
1. GraphRAG retrieval combines vector search and graph traversal in single query flow
2. Automatic relationship discovery surfaces connections between entities without manual tagging
3. Temporal context awareness enables time-based queries ("what did I do last week?")
4. Domain-aware MCP tools work for calendar queries, contact lookups, and task operations
5. OpenAI function calling integration successfully invokes MCP tools
6. Local LLM (Ollama or LM Studio) can connect and execute MCP tools

**Plans**: TBD

Plans:
- [ ] 03-01: TBD (to be planned)

---

### Phase 4: Data Ingestion Pipeline
**Goal**: Ingest Google services data with quality gates, starting with ONE source to validate AI improvement before expanding

**Depends on**: Phase 3

**Requirements**: INGEST-01, INGEST-02, INGEST-03, INGEST-04, INGEST-05, INGEST-06, INGEST-07, INGEST-08

**Success Criteria** (what must be TRUE):
1. User can connect Google account via OAuth with proper scopes and credential storage via Composio
2. Google Calendar events sync to graph with accurate temporal relationships
3. Google Tasks sync to graph with proper project/list organization
4. Gmail messages ingest to graph with sender/recipient entity extraction
5. Google Contacts sync to graph with relationship inference
6. Entity extraction pipeline identifies people, organizations, and concepts from ingested content
7. Incremental sync works using delta updates (not full refresh) with last sync timestamp tracking
8. Background sync runs with rate limiting and jitter to avoid API quota exhaustion

**Plans**: TBD

Plans:
- [ ] 04-01: TBD (to be planned)

---

### Phase 5: Mobile Client & Offline Sync
**Goal**: Deliver cross-platform mobile app with local-first architecture and proven sync engine to avoid the lost-edits trust erosion

**Depends on**: Phase 4

**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, MOBILE-05, MOBILE-06, MOBILE-07, MOBILE-08

**Success Criteria** (what must be TRUE):
1. React Native/Expo app runs on iOS and Android with Expo Router navigation
2. User can authenticate from mobile app using Supabase auth flow
3. User can connect Google services from mobile app via OAuth connection management
4. Local-first data layer stores graph content offline using Realm or proven sync engine
5. Mobile app syncs with backend when online, with conflict resolution that preserves user edits
6. Unified data view shows graph content (entities, relationships, timeline) in fun, engaging UI
7. Connection status indicators show sync state (online/offline/syncing) clearly
8. Third codebase consolidated into monorepo (consolidation complete)

**Plans**: TBD

Plans:
- [ ] 05-01: TBD (to be planned)

---

### Phase 6: Orchestration & Automation
**Goal**: Enable user-defined workflows and AI-triggered automation via n8n integration

**Depends on**: Phase 5

**Requirements**: ORCH-01, ORCH-02, ORCH-03, ORCH-04, ORCH-05, ORCH-06, SEC-04

**Success Criteria** (what must be TRUE):
1. n8n workflow platform integrated via webhooks for external triggers
2. Backend exposes webhook endpoints that n8n workflows can call
3. AI assistants can trigger workflow execution via MCP tools
4. User can define custom automations in n8n that interact with graph data
5. n8n MCP tools enable workflow operations (list workflows, execute, check status)
6. Workflow error handling includes retry logic with exponential backoff
7. Audit logging captures data access events for compliance

**Plans**: TBD

Plans:
- [ ] 06-01: TBD (to be planned)

---

### Phase 7: Production Hardening
**Goal**: Polish mobile features and add production-ready monitoring, observability, and data portability

**Depends on**: Phase 6

**Requirements**: None (polish and hardening)

**Success Criteria** (what must be TRUE):
1. Push notifications work on mobile for important events (meeting reminders, workflow completions)
2. Adaptive sync frequency adjusts based on user activity and network conditions
3. Error tracking (Sentry or equivalent) captures and reports production issues
4. Performance monitoring tracks API latency, graph query performance, and sync duration
5. Data export functionality allows user to download all data in JSON, Markdown, or CSV formats
6. User can view version history and rollback AI-generated changes if needed

**Plans**: TBD

Plans:
- [ ] 07-01: TBD (to be planned)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Monorepo Consolidation Preparation | 0/5 | Planned | - |
| 1. Foundation Infrastructure | 0/0 | Not started | - |
| 2. Graph Core & MCP Server | 0/0 | Not started | - |
| 3. GraphRAG & Advanced MCP | 0/0 | Not started | - |
| 4. Data Ingestion Pipeline | 0/0 | Not started | - |
| 5. Mobile Client & Offline Sync | 0/0 | Not started | - |
| 6. Orchestration & Automation | 0/0 | Not started | - |
| 7. Production Hardening | 0/0 | Not started | - |

---
*Roadmap created: 2026-01-24*
*Last updated: 2026-01-24*
