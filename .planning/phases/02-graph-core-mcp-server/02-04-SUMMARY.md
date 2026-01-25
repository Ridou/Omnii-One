---
phase: 02-graph-core-mcp-server
plan: 04
subsystem: mcp-tools
tags: [mcp, tools, zod, neo4j, graph-query]

dependency-graph:
  requires: ["02-01", "02-02", "02-03"]
  provides: ["MCP tools for graph queries"]
  affects: ["02-05", "02-06", "02-07"]

tech-stack:
  added: []
  patterns:
    - "Zod input validation for MCP tools"
    - "TOOL_DEFINITIONS + TOOL_HANDLERS pattern"
    - "MCPToolResponse type for consistent responses"

key-files:
  created:
    - apps/omnii_mcp/src/mcp/tools/search-nodes.ts
    - apps/omnii_mcp/src/mcp/tools/get-context.ts
    - apps/omnii_mcp/src/mcp/tools/list-entities.ts
    - apps/omnii_mcp/src/mcp/tools/index.ts
  modified:
    - apps/omnii_mcp/src/mcp/index.ts

decisions:
  - key: "MCPToolResponse type"
    choice: "{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }"
    rationale: "MCP protocol standard response format"
  - key: "Zod validation in handlers"
    choice: "Validate input at handler entry, return structured errors"
    rationale: "Fail fast with helpful error messages for AI clients"

metrics:
  duration: 3min
  completed: 2026-01-25
---

# Phase 2 Plan 4: MCP Tools Summary

**One-liner:** Three MCP tools (search_nodes, get_context, list_entities) with Zod validation bridging AI clients to graph operations.

## What Was Built

### MCP Tools Implemented

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `omnii_graph_search_nodes` | Semantic similarity search | query, limit, nodeTypes, minScore | Ranked search results with scores |
| `omnii_graph_get_context` | Node context retrieval | nodeId, includeRelated, maxDepth | Node + related nodes via traversal |
| `omnii_graph_list_entities` | Browse nodes by type | nodeType, limit, offset | Paginated node list |

### Architecture Patterns

1. **Tool Definition Structure**
   - `*ToolDefinition`: MCP protocol schema for tools/list
   - `*InputSchema`: Zod schema for runtime validation
   - `handle*`: Async handler returning MCPToolResponse

2. **Registration Module**
   - `TOOL_DEFINITIONS`: Array of all tool definitions
   - `TOOL_HANDLERS`: Map of tool name to handler function
   - Helper functions: `isValidTool`, `getToolHandler`, `getToolNames`

3. **Error Handling**
   - Zod validation errors return structured details
   - Graph operation errors wrapped in MCPToolResponse
   - isError flag for MCP protocol compliance

## Key Files

```
apps/omnii_mcp/src/mcp/tools/
  search-nodes.ts   # Semantic search tool
  get-context.ts    # Context retrieval tool
  list-entities.ts  # Entity listing tool
  index.ts          # Tool registration
```

## Decisions Made

1. **MCPToolResponse type**: Used MCP protocol standard `{ content: [{ type: 'text', text: string }], isError?: boolean }` for all tool responses.

2. **Zod validation at handler entry**: Each handler validates input immediately and returns structured error details for invalid input, helping AI clients understand what went wrong.

3. **Embedding excluded from context**: The `get_context` tool filters out the embedding field from node properties to keep responses smaller.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| f6654be | feat | implement omnii_graph_search_nodes MCP tool |
| 11c0b12 | feat | implement get_context and list_entities MCP tools |
| 13907a9 | feat | create tool registration module |

## Verification Results

```
All MCP tools:
  - omnii_graph_search_nodes (handler ok)
  - omnii_graph_get_context (handler ok)
  - omnii_graph_list_entities (handler ok)

SUCCESS: All tools have definitions and handlers
```

## Next Phase Readiness

**Ready for:** Plan 02-05 (MCP handlers integration) can now wire these tools into the MCP server's tools/list and tools/call endpoints.

**Exports available:**
- `TOOL_DEFINITIONS` - For tools/list response
- `TOOL_HANDLERS` - For tools/call dispatch
- `isValidTool`, `getToolHandler` - For validation and lookup
