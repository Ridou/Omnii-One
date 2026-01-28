# Requirements: Omnii One

**Defined:** 2026-01-24
**Core Value:** AI always has the right context when querying user's personal data

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation & Infrastructure

- [x] **FOUND-01**: Monorepo structure established with Turborepo for consolidated codebase
- [x] **FOUND-02**: Bun/Elysia backend server running with proper configuration
- [x] **FOUND-03**: Supabase authentication with OAuth flow (Google)
- [x] **FOUND-04**: Neo4j-Bun compatibility resolved (HTTP proxy layer or alternative)
- [x] **FOUND-05**: Environment configuration system for local/dev/prod environments

### Graph Database

- [x] **GRAPH-01**: Neo4j multi-tenant isolation using database-per-user pattern
- [x] **GRAPH-02**: Graph schema supporting concepts, entities, events, contacts
- [x] **GRAPH-03**: Basic CRUD operations for graph nodes and relationships
- [x] **GRAPH-04**: Vector index configuration for semantic search
- [x] **GRAPH-05**: GraphRAG dual-channel retrieval (vector + graph traversal)
- [x] **GRAPH-06**: Automatic relationship discovery between entities
- [x] **GRAPH-07**: Temporal context awareness for time-based queries

### MCP Server

- [x] **MCP-01**: MCP protocol compliance (JSON-RPC 2.0, capability negotiation)
- [x] **MCP-02**: MCP server exposing tools for graph queries
- [x] **MCP-03**: Basic query tools (search nodes, get context, list entities)
- [x] **MCP-04**: Domain-aware tools (calendar queries, contact lookups, task operations)
- [x] **MCP-05**: Authentication and authorization for MCP requests
- [x] **MCP-06**: Support for Claude Code/Desktop integration
- [x] **MCP-07**: Support for OpenAI function calling
- [x] **MCP-08**: Support for local LLMs (Ollama, LM Studio)
- [x] **MCP-09**: Rate limiting and request validation

### Data Ingestion & Integrations

- [x] **INGEST-01**: Google OAuth connection flow with proper scopes
- [x] **INGEST-02**: Google Calendar integration with sync to graph
- [x] **INGEST-03**: Google Tasks integration with sync to graph
- [x] **INGEST-04**: Gmail integration with email ingestion to graph
- [x] **INGEST-05**: Google Contacts integration with sync to graph
- [x] **INGEST-06**: Entity extraction from ingested content
- [x] **INGEST-07**: Incremental sync (delta updates, not full refresh)
- [x] **INGEST-08**: Background sync with rate limiting

### Mobile Application

- [x] **MOBILE-01**: Cross-platform React Native/Expo application
- [x] **MOBILE-02**: Authentication flow with Supabase
- [x] **MOBILE-03**: OAuth connection management for Google services
- [x] **MOBILE-04**: Local-first data layer with offline support
- [x] **MOBILE-05**: Real-time sync when online (using proven sync engine)
- [x] **MOBILE-06**: Unified data view showing graph content
- [x] **MOBILE-07**: Fun, engaging UI styling (maintain existing vibe)
- [x] **MOBILE-08**: Connection status indicators

### Orchestration & Automation

- [x] **ORCH-01**: n8n workflow integration via webhooks
- [x] **ORCH-02**: Webhook endpoints for external triggers
- [x] **ORCH-03**: AI-triggered workflow execution
- [x] **ORCH-04**: User-defined automation support
- [x] **ORCH-05**: n8n MCP tools for workflow operations
- [x] **ORCH-06**: Error handling and retry logic for workflows

### Security & Privacy

- [x] **SEC-01**: User data isolation enforced at database level
- [x] **SEC-02**: Secure token storage and refresh
- [x] **SEC-03**: MCP request authentication
- [x] **SEC-04**: Audit logging for data access
- [x] **SEC-05**: Local-first architecture (no mandatory cloud dependency)

## v2.0 Requirements

Active requirements for v2.0 Feature Expansion milestone.

### File Ingestion (FILE)

- [ ] **FILE-01**: User can upload PDF documents and have text content extracted into the graph
- [ ] **FILE-02**: User can upload Word documents (.docx) and have content extracted into the graph
- [ ] **FILE-03**: User can upload text files (.txt), markdown files (.md), and code files with content indexed
- [ ] **FILE-04**: System scores extraction quality and flags low-confidence extractions for review
- [ ] **FILE-05**: User can search across all uploaded file contents via existing search tools

### Notes Capture (NOTE)

- [ ] **NOTE-01**: User can create notes with wiki-style `[[links]]` that create bidirectional connections
- [ ] **NOTE-02**: User can view a backlinks panel showing all notes/entities that link to the current item
- [ ] **NOTE-03**: User can create notes from templates (meeting notes, daily journal, contact notes)
- [ ] **NOTE-04**: User can capture notes via voice-to-text on mobile devices

### Enhanced AI Intelligence (AI2)

- [ ] **AI2-01**: System extracts entities (people, dates, places, organizations) with enhanced accuracy
- [ ] **AI2-02**: System infers cross-source relationships ("John from this email attended this meeting")
- [ ] **AI2-03**: System surfaces proactive "Heads Up" context before calendar events (15-30 min prior)
- [ ] **AI2-04**: System provides actionable analytics patterns (not vanity metrics)

### Gamification (GAME)

- [ ] **GAME-01**: User earns achievements for milestones (first note, 100 files, 30-day activity)
- [ ] **GAME-02**: Achievements include incremental tiers (bronze/silver/gold for long-term goals)
- [ ] **GAME-03**: Mascot companion appears with mood states reflecting user activity
- [ ] **GAME-04**: User can view productivity analytics dashboard with engagement insights

## Future Requirements (v2.1+)

Deferred to later milestones:

- **XP and level progression system** - May add if achievement-only feels incomplete
- **Quick capture widgets** - Mobile home screen widgets for instant capture
- **Code repository ingestion** - Parse entire project structures
- **Custom entity types** - User-defined entities beyond standard NER
- **Multi-modal extraction** - Extract from images/charts in PDFs
- **On-device Whisper** - Offline voice transcription
- **SMS/messaging via Twilio** - Messaging integration
- **Browser extension** - Web capture extension

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Built-in note editor | Focus on ingestion/retrieval, not content creation |
| Custom query language | Use natural language via AI instead |
| Mandatory cloud sync | Privacy dealbreaker - must remain optional |
| Social/sharing features | Personal data is private by design |
| Building all sources simultaneously | Research shows this causes 60% failure rate |
| Custom sync algorithms | Use proven CRDT libraries/sync engines |
| Shared-database multi-tenancy | Security/performance issues - use database-per-user |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.0 Requirements (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 0 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| GRAPH-01 | Phase 1 | Complete |
| GRAPH-02 | Phase 2 | Complete |
| GRAPH-03 | Phase 2 | Complete |
| GRAPH-04 | Phase 2 | Complete |
| GRAPH-05 | Phase 3 | Complete |
| GRAPH-06 | Phase 3 | Complete |
| GRAPH-07 | Phase 3 | Complete |
| MCP-01 | Phase 2 | Complete |
| MCP-02 | Phase 2 | Complete |
| MCP-03 | Phase 2 | Complete |
| MCP-04 | Phase 3 | Complete |
| MCP-05 | Phase 2 | Complete |
| MCP-06 | Phase 2 | Complete |
| MCP-07 | Phase 3 | Complete |
| MCP-08 | Phase 3 | Complete |
| MCP-09 | Phase 2 | Complete |
| INGEST-01 | Phase 4 | Complete |
| INGEST-02 | Phase 4 | Complete |
| INGEST-03 | Phase 4 | Complete |
| INGEST-04 | Phase 4 | Complete |
| INGEST-05 | Phase 4 | Complete |
| INGEST-06 | Phase 4 | Complete |
| INGEST-07 | Phase 4 | Complete |
| INGEST-08 | Phase 4 | Complete |
| MOBILE-01 | Phase 5 | Complete |
| MOBILE-02 | Phase 5 | Complete |
| MOBILE-03 | Phase 5 | Complete |
| MOBILE-04 | Phase 5 | Complete |
| MOBILE-05 | Phase 5 | Complete |
| MOBILE-06 | Phase 5 | Complete |
| MOBILE-07 | Phase 5 | Complete |
| MOBILE-08 | Phase 5 | Complete |
| ORCH-01 | Phase 6 | Complete |
| ORCH-02 | Phase 6 | Complete |
| ORCH-03 | Phase 6 | Complete |
| ORCH-04 | Phase 6 | Complete |
| ORCH-05 | Phase 6 | Complete |
| ORCH-06 | Phase 6 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 2 | Complete |
| SEC-04 | Phase 6 | Complete |
| SEC-05 | Phase 1 | Complete |

### v2.0 Requirements (Active)

| Requirement | Phase | Status |
|-------------|-------|--------|
| FILE-01 | Phase 8 | Pending |
| FILE-02 | Phase 8 | Pending |
| FILE-03 | Phase 8 | Pending |
| FILE-04 | Phase 8 | Pending |
| FILE-05 | Phase 8 | Pending |
| NOTE-01 | Phase 9 | Pending |
| NOTE-02 | Phase 9 | Pending |
| NOTE-03 | Phase 9 | Pending |
| NOTE-04 | Phase 9 | Pending |
| AI2-01 | Phase 10 | Pending |
| AI2-02 | Phase 10 | Pending |
| AI2-03 | Phase 10 | Pending |
| AI2-04 | Phase 10 | Pending |
| GAME-01 | Phase 11 | Pending |
| GAME-02 | Phase 11 | Pending |
| GAME-03 | Phase 11 | Pending |
| GAME-04 | Phase 11 | Pending |

**Coverage:**
- v1.0 requirements: 48 total, 48 complete
- v2.0 requirements: 17 total, 17 mapped
- Unmapped: 0

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-28 — v2.0 traceability added (17 requirements mapped to phases 8-11)*
