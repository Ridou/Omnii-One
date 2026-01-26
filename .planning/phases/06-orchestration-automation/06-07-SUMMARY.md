---
phase: 06
plan: 07
subsystem: security
tags: [audit-logging, mcp-tools, sec-04, compliance]
depends_on:
  requires: [06-01]
  provides: [mcp-tool-audit-logging]
  affects: [mcp-tools]
tech-stack:
  added: []
  patterns: [audit-event-logging, error-audit-tracking]
key-files:
  created: []
  modified:
    - apps/omnii_mcp/src/mcp/tools/search-nodes.ts
    - apps/omnii_mcp/src/mcp/tools/get-context.ts
    - apps/omnii_mcp/src/mcp/tools/list-entities.ts
    - apps/omnii_mcp/src/mcp/tools/calendar-query.ts
    - apps/omnii_mcp/src/mcp/tools/contact-lookup.ts
    - apps/omnii_mcp/src/mcp/tools/task-operations.ts
    - apps/omnii_mcp/src/mcp/tools/extract-relationships.ts
decisions: []
metrics:
  duration: 3min
  completed: 2026-01-25
---

# Phase 6 Plan 07: MCP Tool Audit Logging Summary

**One-liner:** Retrofitted SEC-04 audit logging to all 7 existing MCP graph tools with PII-safe metadata.

## What Was Built

This plan retrofitted audit logging to all existing MCP tools for SEC-04 compliance (data access logging). All graph data access events are now logged with tool name, user ID, resource type, action, and tool-specific parameters.

### Task 1: Graph Read Tools (search-nodes, get-context, list-entities)

Added audit logging to the three core graph read tools:

- **search-nodes.ts**: Logs search queries, limits, node types, score thresholds, time ranges
- **get-context.ts**: Logs node ID lookups with includeRelated and maxDepth settings
- **list-entities.ts**: Logs entity listing with node type, limit, and pagination offset

All tools now:
- Import `logAuditEvent` and `AuditEventType` from audit service
- Log `GRAPH_DATA_ACCESSED` events after input validation
- Include tool-specific parameters in metadata
- Log error events with severity 'error' in catch blocks
- Accept optional `userId` parameter for audit context

### Task 2: Domain-Specific Tools (calendar, contacts, tasks, relationships)

Added audit logging to the four domain-specific tools:

- **calendar-query.ts**: Logs time range queries with event type filters and semantic search
- **contact-lookup.ts**: Logs contact searches with query, interaction inclusion, and limits
- **task-operations.ts**: Determines action type (list/read) based on operation parameter
- **extract-relationships.ts**: Uses 'create' action for relationship extraction operations

All tools follow the same pattern:
- Audit event logged after Zod validation passes
- Tool-specific metadata captured (avoiding PII - audit service handles redaction)
- Error cases logged with severity 'error'

## Audit Event Structure

Each tool logs events with this structure:
```typescript
{
  event: AuditEventType.GRAPH_DATA_ACCESSED,
  userId: userId || 'unknown',
  actor: 'ai_assistant',
  action: 'read' | 'list' | 'create',
  resource: { type: string, name: string, id?: string },
  severity: 'info' | 'error',
  metadata: { /* tool-specific parameters */ }
}
```

Resource types by tool:
| Tool | Resource Type | Action |
|------|--------------|--------|
| search-nodes | graph_search | read |
| get-context | graph_node | read |
| list-entities | graph_entities | list |
| calendar-query | calendar_events | read |
| contact-lookup | contacts | read |
| task-operations | tasks | list/read |
| extract-relationships | graph_relationships | create |

## Verification Results

- Build: omnii_mcp package builds successfully (186ms)
- All 7 tool files contain `logAuditEvent` import
- All 7 tools log `GRAPH_DATA_ACCESSED` on invocation (14 total calls - 2 per tool)
- Error cases log with severity 'error'
- PII fields (email, phone, etc.) handled by audit service redaction

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Description |
|--------|-------------|
| 93978e2 | feat(06-07): add audit logging to graph read tools |
| 7501476 | feat(06-07): add audit logging to domain-specific tools |

## Next Phase Readiness

SEC-04 compliance is now complete for all MCP tools. The audit logging foundation (06-01) combined with this retrofit ensures all data access events are logged with appropriate metadata for compliance auditing.

Remaining Phase 6 plans can proceed:
- 06-03: Workflow trigger system (already has audit logging)
- 06-04: Webhook validation
- 06-05: Workflow MCP tools
- 06-06: n8n client integration
