---
phase: 06-orchestration-automation
plan: 05
subsystem: mcp-tools
tags: [mcp, n8n, workflow, automation, ai-tools]
dependency-graph:
  requires: [06-01, 06-02, 06-03, 06-04]
  provides: [workflow-mcp-tools, ai-workflow-trigger, execution-visibility]
  affects: [07-api-mcp-layer]
tech-stack:
  added: []
  patterns: [mcp-tool-pattern, zod-validation, idempotent-execution]
key-files:
  created:
    - apps/omnii_mcp/src/mcp/tools/list-workflows.ts
    - apps/omnii_mcp/src/mcp/tools/execute-workflow.ts
    - apps/omnii_mcp/src/mcp/tools/workflow-status.ts
  modified:
    - apps/omnii_mcp/src/mcp/tools/index.ts
decisions: []
metrics:
  duration: 3min
  completed: 2026-01-26
---

# Phase 6 Plan 05: MCP Workflow Tools Summary

MCP tools for AI-triggered n8n workflow operations with idempotent execution.

## What Was Built

### omnii_list_workflows Tool
- Lists available n8n workflows with name, ID, active status, tags
- Optional `active_only` filter for active workflows only
- Audit logging on every invocation

### omnii_execute_workflow Tool
- Triggers n8n workflow execution with parameters
- Idempotent execution via ExecutionTracker.executeIdempotent()
- Auto-generates idempotency_key if not provided
- Returns execution ID, cached flag, and response data
- Prevents duplicate workflow executions on retry

### omnii_workflow_status Tool
- Check specific execution by ID (checks tracker first, then n8n API)
- Get recent execution history by workflow ID
- Combines data from both ExecutionTracker and n8n API
- Returns formatted status with timing and error information

### Index Updates
- All 3 tools registered in TOOL_DEFINITIONS
- All 3 handlers in TOOL_HANDLERS map
- Full re-exports for direct module access
- Total MCP tools: 10 (7 graph + 3 workflow)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| bbeb25a | feat | add omnii_list_workflows MCP tool |
| 256dd74 | feat | add omnii_execute_workflow MCP tool |
| 109ba53 | feat | add omnii_workflow_status and wire all tools |

## Files Changed

| File | Change |
|------|--------|
| `apps/omnii_mcp/src/mcp/tools/list-workflows.ts` | Created - 156 lines |
| `apps/omnii_mcp/src/mcp/tools/execute-workflow.ts` | Created - 229 lines |
| `apps/omnii_mcp/src/mcp/tools/workflow-status.ts` | Created - 296 lines |
| `apps/omnii_mcp/src/mcp/tools/index.ts` | Modified - imports, definitions, handlers, exports |

## Verification

- [x] `bun run build` compiles without errors
- [x] TOOL_DEFINITIONS includes all 3 workflow tools
- [x] TOOL_HANDLERS has entries for all 3 tools
- [x] Each tool has Zod input validation
- [x] Audit events logged for all tool invocations
- [x] execute_workflow uses idempotent execution tracking

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies Used

| Dependency | Purpose |
|------------|---------|
| n8nWorkflowClient | REST API calls to n8n |
| ExecutionTracker | Idempotent execution via Supabase |
| logAuditEvent | GDPR-compliant audit logging |
| Zod | Input validation schemas |

## Next Phase Readiness

**Phase 6 Complete After This:**
- 06-06 and 06-07 remain for Phase 6

**Ready for 07-api-mcp-layer:**
- MCP tools available for AI assistants
- Workflow execution with exactly-once semantics
- Full audit trail for workflow operations
