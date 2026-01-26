# Requirements: Omnii One

**Defined:** 2026-01-24
**Core Value:** AI always has the right context when querying user's personal data

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation & Infrastructure

- [ ] **FOUND-01**: Monorepo structure established with Turborepo for consolidated codebase
- [ ] **FOUND-02**: Bun/Elysia backend server running with proper configuration
- [ ] **FOUND-03**: Supabase authentication with OAuth flow (Google)
- [ ] **FOUND-04**: Neo4j-Bun compatibility resolved (HTTP proxy layer or alternative)
- [ ] **FOUND-05**: Environment configuration system for local/dev/prod environments

### Graph Database

- [ ] **GRAPH-01**: Neo4j multi-tenant isolation using database-per-user pattern
- [ ] **GRAPH-02**: Graph schema supporting concepts, entities, events, contacts
- [ ] **GRAPH-03**: Basic CRUD operations for graph nodes and relationships
- [ ] **GRAPH-04**: Vector index configuration for semantic search
- [ ] **GRAPH-05**: GraphRAG dual-channel retrieval (vector + graph traversal)
- [ ] **GRAPH-06**: Automatic relationship discovery between entities
- [ ] **GRAPH-07**: Temporal context awareness for time-based queries

### MCP Server

- [ ] **MCP-01**: MCP protocol compliance (JSON-RPC 2.0, capability negotiation)
- [ ] **MCP-02**: MCP server exposing tools for graph queries
- [ ] **MCP-03**: Basic query tools (search nodes, get context, list entities)
- [ ] **MCP-04**: Domain-aware tools (calendar queries, contact lookups, task operations)
- [ ] **MCP-05**: Authentication and authorization for MCP requests
- [ ] **MCP-06**: Support for Claude Code/Desktop integration
- [ ] **MCP-07**: Support for OpenAI function calling
- [ ] **MCP-08**: Support for local LLMs (Ollama, LM Studio)
- [ ] **MCP-09**: Rate limiting and request validation

### Data Ingestion & Integrations

- [ ] **INGEST-01**: Google OAuth connection flow with proper scopes
- [ ] **INGEST-02**: Google Calendar integration with sync to graph
- [ ] **INGEST-03**: Google Tasks integration with sync to graph
- [ ] **INGEST-04**: Gmail integration with email ingestion to graph
- [ ] **INGEST-05**: Google Contacts integration with sync to graph
- [ ] **INGEST-06**: Entity extraction from ingested content
- [ ] **INGEST-07**: Incremental sync (delta updates, not full refresh)
- [ ] **INGEST-08**: Background sync with rate limiting

### Mobile Application

- [ ] **MOBILE-01**: Cross-platform React Native/Expo application
- [ ] **MOBILE-02**: Authentication flow with Supabase
- [ ] **MOBILE-03**: OAuth connection management for Google services
- [ ] **MOBILE-04**: Local-first data layer with offline support
- [ ] **MOBILE-05**: Real-time sync when online (using proven sync engine)
- [ ] **MOBILE-06**: Unified data view showing graph content
- [ ] **MOBILE-07**: Fun, engaging UI styling (maintain existing vibe)
- [ ] **MOBILE-08**: Connection status indicators

### Orchestration & Automation

- [x] **ORCH-01**: n8n workflow integration via webhooks
- [x] **ORCH-02**: Webhook endpoints for external triggers
- [x] **ORCH-03**: AI-triggered workflow execution
- [x] **ORCH-04**: User-defined automation support
- [x] **ORCH-05**: n8n MCP tools for workflow operations
- [x] **ORCH-06**: Error handling and retry logic for workflows

### Security & Privacy

- [ ] **SEC-01**: User data isolation enforced at database level
- [ ] **SEC-02**: Secure token storage and refresh
- [ ] **SEC-03**: MCP request authentication
- [x] **SEC-04**: Audit logging for data access
- [ ] **SEC-05**: Local-first architecture (no mandatory cloud dependency)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Intelligence

- **AI-01**: Advanced entity recognition with custom NLP models
- **AI-02**: Proactive context suggestions
- **AI-03**: Cross-source relationship inference

### Additional Integrations

- **INT-01**: Local file/document ingestion
- **INT-02**: Notes/knowledge capture system
- **INT-03**: SMS/messaging via Twilio
- **INT-04**: Integration marketplace for user-selectable sources

### Gamification

- **GAME-01**: XP and level progression system
- **GAME-02**: Achievement system
- **GAME-03**: Mascot companion

### Advanced Features

- **ADV-01**: Voice capture for mobile
- **ADV-02**: Browser extension for web capture
- **ADV-03**: Advanced analytics dashboard

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

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 0 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| GRAPH-01 | Phase 1 | Pending |
| GRAPH-02 | Phase 2 | Pending |
| GRAPH-03 | Phase 2 | Pending |
| GRAPH-04 | Phase 2 | Pending |
| GRAPH-05 | Phase 3 | Complete |
| GRAPH-06 | Phase 3 | Complete |
| GRAPH-07 | Phase 3 | Complete |
| MCP-01 | Phase 2 | Pending |
| MCP-02 | Phase 2 | Pending |
| MCP-03 | Phase 2 | Pending |
| MCP-04 | Phase 3 | Complete |
| MCP-05 | Phase 2 | Pending |
| MCP-06 | Phase 2 | Pending |
| MCP-07 | Phase 3 | Complete |
| MCP-08 | Phase 3 | Complete |
| MCP-09 | Phase 2 | Pending |
| INGEST-01 | Phase 4 | Pending |
| INGEST-02 | Phase 4 | Pending |
| INGEST-03 | Phase 4 | Pending |
| INGEST-04 | Phase 4 | Pending |
| INGEST-05 | Phase 4 | Pending |
| INGEST-06 | Phase 4 | Pending |
| INGEST-07 | Phase 4 | Pending |
| INGEST-08 | Phase 4 | Pending |
| MOBILE-01 | Phase 5 | Pending |
| MOBILE-02 | Phase 5 | Pending |
| MOBILE-03 | Phase 5 | Pending |
| MOBILE-04 | Phase 5 | Pending |
| MOBILE-05 | Phase 5 | Pending |
| MOBILE-06 | Phase 5 | Pending |
| MOBILE-07 | Phase 5 | Pending |
| MOBILE-08 | Phase 5 | Pending |
| ORCH-01 | Phase 6 | Complete |
| ORCH-02 | Phase 6 | Complete |
| ORCH-03 | Phase 6 | Complete |
| ORCH-04 | Phase 6 | Complete |
| ORCH-05 | Phase 6 | Complete |
| ORCH-06 | Phase 6 | Complete |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 2 | Pending |
| SEC-04 | Phase 6 | Complete |
| SEC-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-25 — Phase 3 requirements complete (GRAPH-05/06/07, MCP-04/07/08)*
