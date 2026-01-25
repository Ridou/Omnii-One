---
phase: 03-graphrag-advanced-mcp
plan: 06
subsystem: mcp
tags: [ollama, lm-studio, local-llm, tool-calling, mcp-adapters]

# Dependency graph
requires:
  - phase: 03-05
    provides: OpenAI adapter pattern for MCP tool conversion
provides:
  - Local LLM adapter for Ollama and LM Studio tool calling
  - HTTP endpoints for local LLM tool execution
  - Hallucination detection for unreliable tool calls
affects: [Phase 4 data ingestion, Phase 6 mobile integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [sequential-tool-execution, hallucination-validation]

key-files:
  created:
    - apps/omnii_mcp/src/mcp/adapters/local-llm.ts
    - apps/omnii_mcp/src/routes/local-llm.ts
  modified:
    - apps/omnii_mcp/src/mcp/adapters/index.ts
    - apps/omnii_mcp/src/routes/index.ts

key-decisions:
  - "Sequential tool execution for local LLM reliability (not parallel like OpenAI)"
  - "Ollama format without strict mode, LM Studio reuses OpenAI format"
  - "validateToolCall function detects hallucinated tool names"

patterns-established:
  - "Pattern: Sequential execution for local LLMs via for-of loop"
  - "Pattern: Separate format adapters for different LLM providers"
  - "Pattern: Hallucination detection reports invalid calls separately"

# Metrics
duration: 6min
completed: 2026-01-25
---

# Phase 3 Plan 6: Local LLM Tool Calling Summary

**Ollama and LM Studio integration with sequential tool execution and hallucination detection for unreliable local models**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-25T18:23:10Z
- **Completed:** 2026-01-25T18:28:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Local LLM adapter supporting Ollama (custom format) and LM Studio (OpenAI format)
- Sequential tool execution pattern for local LLM reliability (vs parallel for OpenAI)
- Hallucination detection catches unknown tool names and malformed arguments
- HTTP endpoints at /api/local-llm for tools and execution

## Task Commits

Each task was committed atomically:

1. **Task 1: Create local LLM tool adapter** - `ad0630b` (feat)
2. **Task 2: Create local LLM HTTP endpoints** - `871eeca` (feat)

## Files Created/Modified
- `apps/omnii_mcp/src/mcp/adapters/local-llm.ts` - Local LLM adapter with Ollama/LM Studio format conversion, validateToolCall for hallucination detection, sequential execution
- `apps/omnii_mcp/src/routes/local-llm.ts` - HTTP endpoints: GET /tools (format query param), POST /execute-tools (with auth), GET /health (recommended models)
- `apps/omnii_mcp/src/mcp/adapters/index.ts` - Export local-llm adapter
- `apps/omnii_mcp/src/routes/index.ts` - Register localLLMRoutes under /api prefix

## Decisions Made

**Sequential execution for local LLMs:**
- Research (03-RESEARCH.md) indicates local LLMs struggle with parallel tool calls
- Used for-of loop instead of Promise.all (OpenAI uses parallel)
- LocalLLMToolAdapter class allows override via options.sequential flag

**Format separation:**
- Ollama: No strict mode, arguments already parsed as object
- LM Studio: Reuses OpenAI format (strict: true, additionalProperties: false)
- Single tools endpoint with format query parameter (?format=lmstudio)

**Hallucination protection:**
- validateToolCall checks tool name exists in TOOL_HANDLERS
- Invalid calls filtered out before execution
- Response includes invalidCalls section with count and names
- Local LLMs more prone to hallucination than GPT-4o per research

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 3 - Blocking] Fixed route prefix conflict**
- **Found during:** Task 2 (Testing endpoints)
- **Issue:** localLLMRoutes had prefix '/api/local-llm' but was mounted under api Elysia instance (already has /api prefix), causing double prefix /api/api/local-llm
- **Fix:** Changed localLLMRoutes prefix to '/local-llm' to work with routes/index.ts api instance prefix
- **Files modified:** apps/omnii_mcp/src/routes/local-llm.ts
- **Verification:** curl http://localhost:8000/api/local-llm/health returns 200 OK
- **Committed in:** 871eeca (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Route prefix fix required for endpoints to be accessible. No scope creep.

## Issues Encountered

None - plan executed smoothly after route prefix fix.

## Authentication Gates

None encountered - local LLM endpoints use same Supabase JWT auth as OpenAI endpoints.

## User Setup Required

None - no external service configuration required.

**For local LLM usage, users need:**
1. Install Ollama or LM Studio locally
2. Download a tool-calling-capable model (llama3.1:70b, qwen2.5:32b, codestral, command-r)
3. Point their LLM client at http://localhost:8000/api/local-llm endpoints

**Verification:**
```bash
# Get available tools
curl http://localhost:8000/api/local-llm/tools

# Check health and recommended models
curl http://localhost:8000/api/local-llm/health
```

## Next Phase Readiness

**Ready for Phase 4 (Data Ingestion):**
- MCP tools now accessible via Claude Desktop (03-05), OpenAI API (03-05), and local LLMs (03-06)
- All tool calling formats supported (MCP JSON-RPC, OpenAI function calling, Ollama/LM Studio)
- Relationship discovery tool (03-04) ready for ingestion workflows

**Phase 3 status:**
- 6/6 plans complete (100%)
- GraphRAG services operational (temporal filtering, dual-channel retrieval)
- Domain MCP tools operational (calendar, contacts, tasks)
- Multi-client MCP integration complete (Claude, OpenAI, local LLMs)

**Considerations for Phase 4:**
- Local LLM tool calling less reliable than OpenAI (use for development/testing, not production)
- Sequential execution may be slower than OpenAI parallel calls (acceptable tradeoff for privacy)
- Hallucination detection catches most invalid calls but not all (local LLMs still experimental)

---
*Phase: 03-graphrag-advanced-mcp*
*Completed: 2026-01-25*
