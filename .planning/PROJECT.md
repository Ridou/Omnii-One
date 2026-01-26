# Omnii One

## What This Is

A personal context server that consolidates all user data (emails, calendar, tasks, contacts, notes, documents) into a unified graph database. Any AI (Claude, ChatGPT, local LLMs) can securely query this context. It's a local-first system where your data grows and connects together instead of being fragmented across siloed applications.

## Core Value

**AI always has the right context.** When you ask any AI about your life, work, or data, it can query your personal graph and respond with full awareness of who you are, what you're doing, and what matters to you.

## Current Milestone: v2.0 Feature Expansion

**Goal:** Expand the personal context server with local file ingestion, notes capture, enhanced AI intelligence, and gamification to create a complete personal knowledge system.

**Target features:**
- Local files/documents ingestion (PDFs, Word, text, code, markdown)
- Notes/knowledge capture (quick capture, templates, wiki-style linking)
- Enhanced AI intelligence (entity extraction, proactive suggestions, cross-source connections)
- Full gamification system (XP, levels, achievements, mascot, analytics)

## Requirements

### Validated (v1.0)

Shipped and confirmed working in v1.0:

- ✓ Unified graph database with database-per-user multi-tenancy — v1.0 Phase 1
- ✓ MCP server exposing 10 tools to Claude, OpenAI, local LLMs — v1.0 Phase 2-3
- ✓ Google services integration (Calendar, Tasks, Gmail, Contacts) — v1.0 Phase 4
- ✓ n8n orchestration with webhook triggers and AI execution — v1.0 Phase 6
- ✓ Mobile app with PowerSync offline-first architecture — v1.0 Phase 5
- ✓ GraphRAG dual-channel retrieval (67% better than traditional RAG) — v1.0 Phase 3
- ✓ Sentry error tracking, OpenTelemetry, adaptive sync — v1.0 Phase 7
- ✓ GDPR data export and version history with rollback — v1.0 Phase 7

### Active (v2.0)

Current scope for v2.0:

- [ ] Local file ingestion (PDFs, Word docs, text files, code repos, markdown)
- [ ] Notes/knowledge capture system (quick capture, templates, wiki-linking)
- [ ] Enhanced entity extraction with custom NLP models
- [ ] Proactive context suggestions ("Heads Up" before meetings)
- [ ] Cross-source relationship inference
- [ ] XP and level progression system
- [ ] Achievement system
- [ ] Mascot companion
- [ ] Productivity analytics dashboard

### Out of Scope

- Third-party app marketplace — user-managed integrations only
- Social/sharing features — personal data stays private
- Built-in LLM — model-agnostic MCP approach is strategic advantage
- Real-time collaboration — single-user focus for v2

## Context

**Brownfield consolidation project.** Three existing codebases being unified:

1. **omnii** (monorepo) - Turborepo with React Native/Expo mobile app, Bun/Elysia backend, Neo4j, Supabase, Redis, tRPC, Python RDF services
2. **omnii-mobile** (standalone) - React Native/Expo app with gamification, connects to omnii_mcp backend
3. **omnii-mcp** (standalone) - Bun/Elysia MCP server with action planning, step executors, Composio for Google services

**Existing assets to leverage:**
- Neo4j graph database patterns (concepts, entities, relationships)
- Composio integration for Google OAuth and service calls
- WebSocket real-time communication
- Action planning and step execution patterns
- Twilio SMS integration
- n8n webhook integration

**Technology decisions already made:**
- Bun runtime with Elysia framework (keep)
- React Native with Expo for mobile (keep)
- Neo4j for graph database (keep, research best practices for multi-tenancy)
- Supabase for PostgreSQL/auth (keep)
- n8n for orchestration and automations

## Constraints

- **Local-first**: Must be able to run on user's local server, cloud sync optional
- **Tech stack**: Bun/Elysia, React Native/Expo, Neo4j, Supabase (consolidating existing)
- **Security**: User data must be isolated and accessed only through authenticated APIs
- **MCP compatibility**: Must work with Claude Code, Claude Desktop, OpenAI function calling, local LLMs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Consolidate to single monorepo | Reduce duplicate code, unified development experience | — Pending |
| Keep Bun/Elysia over Node/Express | Performance, TypeScript-native, team familiarity | — Pending |
| Strip gamification for v1 | Focus on core data flow, add fun features later | — Pending |
| n8n as central orchestration | Handles workflows, automations, MCP bridge, user-defined flows | — Pending |
| Neo4j multi-tenancy approach | Research needed for best practices | — Pending |

---
*Last updated: 2026-01-26 after v1.0 complete, starting v2.0*
