# Omnii One

## What This Is

A personal context server that consolidates all user data (emails, calendar, tasks, contacts, notes, documents) into a unified graph database. Any AI (Claude, ChatGPT, local LLMs) can securely query this context. It's a local-first system where your data grows and connects together instead of being fragmented across siloed applications.

## Core Value

**AI always has the right context.** When you ask any AI about your life, work, or data, it can query your personal graph and respond with full awareness of who you are, what you're doing, and what matters to you.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Unified graph database storing all user data with proper multi-tenant isolation
- [ ] MCP server exposing graph queries to Claude, OpenAI, and local LLMs
- [ ] Google services integration (Calendar, Tasks, Gmail, Contacts)
- [ ] n8n orchestration for workflows, automations, and data ingestion
- [ ] Mobile app with fun styling showing unified data view
- [ ] Local files/documents ingestion into graph
- [ ] Notes/knowledge capture system
- [ ] SMS/messaging integration via Twilio
- [ ] Integration store for users to select and connect data sources
- [ ] Secure API for AI context retrieval

### Out of Scope

- Gamification system (XP, levels, achievements) — deferred to later phase, keep UI styling vibe
- Complex analytics dashboards — focus on core data flow first
- Third-party app marketplace — user-managed integrations only for now

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
*Last updated: 2026-01-24 after initialization*
