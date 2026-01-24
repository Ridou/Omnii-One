# Omnii One - Claude Code Context

## Project Overview

Omnii One is a **personal context server** that consolidates all user data (emails, calendar, tasks, contacts, notes, documents) into a unified graph database. Any AI (Claude, ChatGPT, local LLMs) can securely query this context via MCP (Model Context Protocol).

**Core Value:** AI always has the right context when querying user's personal data.

## Project Status

This is a **brownfield consolidation project** merging three existing codebases:
- `omnii` - Monorepo with React Native/Expo + Bun/Elysia backend
- `omnii-mobile` - Standalone React Native app with gamification
- `omnii-mcp` - Standalone MCP backend with action planning

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend Runtime | Bun |
| Backend Framework | Elysia |
| Mobile | React Native + Expo |
| Graph Database | Neo4j (database-per-user multi-tenancy) |
| SQL/Auth | Supabase (PostgreSQL) |
| Orchestration | n8n |
| AI Integration | MCP protocol for Claude/OpenAI/Local LLMs |
| Google Services | Composio |

## Planning Documents

| Document | Purpose |
|----------|---------|
| `.planning/PROJECT.md` | Project context and requirements |
| `.planning/REQUIREMENTS.md` | 48 v1 requirements with REQ-IDs |
| `.planning/ROADMAP.md` | 8-phase roadmap with success criteria |
| `.planning/STATE.md` | Current project state and progress |
| `.planning/research/` | Stack, features, architecture, pitfalls research |

## GSD Workflow

This project uses the **Get Shit Done (GSD)** framework for planning and execution.

### Commands
- `/gsd:progress` - Check current status and next steps
- `/gsd:plan-phase N` - Plan phase N for execution
- `/gsd:execute-phase N` - Execute phase N plans
- `/gsd:verify-work` - Validate completed work
- `/gsd:help` - Full command reference

### Current Phase
**Phase 0: Monorepo Consolidation Preparation**
- Establish Turborepo tooling
- Analyze divergence across codebases
- Define merge strategy

## n8n Integration

n8n is central to the architecture:
- **Orchestration layer** - handles all workflows
- **Automation addon** - user-defined automations
- **MCP bridge** - provides MCP endpoints for AI tool calling

### n8n Skills Available
Use n8n workflows for:
- Data ingestion pipelines
- Background sync operations
- AI-triggered workflows
- User automation definitions

## Architecture Highlights

1. **MCP Server** - Core differentiator. No competitor exposes personal context via MCP.
2. **GraphRAG** - Dual-channel retrieval (vector + graph) with 67% better accuracy than traditional RAG.
3. **Local-first** - Mobile app works offline with proven sync engine.
4. **Database-per-user** - Complete data isolation in Neo4j.

## Critical Decisions

| Decision | Status |
|----------|--------|
| Neo4j-Bun compatibility | Needs resolution (HTTP proxy recommended) |
| Sync engine | Use proven library (not custom) |
| Initial data source | Start with Google Calendar, validate, then expand |

## Source Codebases (for reference)

Located in `/Users/santino/Projects/`:
- `omnii/` - Main monorepo
- `omnii-mobile/` - Standalone mobile app
- `omnii-mcp/` - Standalone MCP server

## Getting Started

```bash
# Check project status
/gsd:progress

# Start planning Phase 0
/gsd:plan-phase 0
```

---
*Last updated: 2026-01-24*
