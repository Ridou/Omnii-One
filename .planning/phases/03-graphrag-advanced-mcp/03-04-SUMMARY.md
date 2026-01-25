---
phase: 03-graphrag-advanced-mcp
plan: 04
subsystem: api
tags: [openai, gpt-4o-mini, entity-extraction, relationship-discovery, mcp-tools, neo4j, graph-db]

# Dependency graph
requires:
  - phase: 02-graph-schema
    provides: CRUD operations (createNode, createRelationship), Neo4j HTTP client, node/relationship schemas
  - phase: 02-graph-embeddings
    provides: generateEmbedding for vector search integration
  - phase: 03-01
    provides: Temporal context patterns and user_id multi-tenancy approach
provides:
  - LLM-based entity extraction with quality prompts enforcing specific relationship types
  - Relationship discovery service that links to existing nodes or creates new ones
  - MCP tool (omnii_extract_relationships) for AI-triggered graph building
affects: [03-05-entity-linking, data-ingestion, email-processing, note-processing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - LLM extraction with structured JSON output (gpt-4o-mini)
    - Vague relationship type filtering for quality control
    - Entity matching by name similarity before node creation
    - Relationship type whitelist validation to prevent injection

key-files:
  created:
    - apps/omnii_mcp/src/services/graphrag/relationship-discovery.ts
    - apps/omnii_mcp/src/mcp/tools/extract-relationships.ts
  modified:
    - apps/omnii_mcp/src/services/graphrag/index.ts
    - apps/omnii_mcp/src/mcp/tools/index.ts

key-decisions:
  - "GPT-4o-mini for entity extraction: Minimum quality model for structured JSON output with low latency/cost"
  - "Vague relationship filtering: RELATED_TO, ASSOCIATED_WITH filtered out to ensure meaningful graph connections"
  - "Entity matching before creation: Case-insensitive name search prevents duplicate nodes"
  - "Relationship type whitelist: ALLOWED_RELATIONSHIPS array prevents Cypher injection via dynamic types"

patterns-established:
  - "EXTRACTION_PROMPT pattern: Quality prompts that enforce specific relationship types and entity properties"
  - "Entity-to-NodeLabel mapping: Extracted types (Person, Organization, Event, Concept, Location) map to graph schema labels"
  - "Provenance tracking: sourceContext parameter stored on relationships for traceability"
  - "Optional userId parameter in ToolHandler: Backward-compatible extension for handlers needing auth context"

# Metrics
duration: 8min
completed: 2026-01-25
---

# Phase 03 Plan 04: Relationship Discovery Summary

**LLM-powered entity extraction with quality prompts creating specific relationships (EMPLOYED_BY, ATTENDED) while linking to existing graph nodes**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-25T10:06:24Z
- **Completed:** 2026-01-25T18:14:35Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Entity extraction service using GPT-4o-mini with structured prompts that enforce specific relationship types
- Relationship discovery pipeline that matches entities to existing nodes before creating new ones
- MCP tool enabling AI to trigger extraction from unstructured text (emails, notes, meeting transcripts)
- Quality controls: vague relationship filtering, type validation, confidence thresholds

## Task Commits

Each task was committed atomically:

1. **Task 1: Create entity extraction with quality prompts** - `6e39127` (feat)
2. **Task 2: Create relationship discovery with graph linking** - `6b08afa` (feat)
3. **Task 3: Create MCP tool to expose relationship discovery** - `b6e553e` (feat)

## Files Created/Modified

- `apps/omnii_mcp/src/services/graphrag/relationship-discovery.ts` - Entity extraction and relationship discovery service with LLM-based extraction, node matching, and graph linking
- `apps/omnii_mcp/src/services/graphrag/index.ts` - Added relationship-discovery export
- `apps/omnii_mcp/src/mcp/tools/extract-relationships.ts` - MCP tool for AI-triggered relationship extraction with Zod validation
- `apps/omnii_mcp/src/mcp/tools/index.ts` - Registered omnii_extract_relationships tool

## Decisions Made

**GPT-4o-mini for extraction:**
- Provides minimum quality for structured entity/relationship extraction
- Lower latency and cost than GPT-4
- JSON mode ensures parseable output

**Vague relationship type filtering:**
- RELATED_TO, ASSOCIATED_WITH, CONNECTED_TO filtered out automatically
- Forces specific, meaningful relationships (EMPLOYED_BY, ATTENDED, FOUNDED)
- Improves graph query precision and semantic clarity

**Entity matching before node creation:**
- Case-insensitive name search across all existing nodes
- Prevents duplicate nodes when same entity mentioned multiple times
- Tracks nodesLinked vs nodesCreated for visibility into graph consolidation

**Relationship type whitelist:**
- ALLOWED_RELATIONSHIPS array validates types before Cypher execution
- Prevents injection since Neo4j doesn't support parameterized relationship types
- Safe to use in dynamic query after validation

**Optional userId in ToolHandler:**
- Extended ToolHandler signature with optional userId parameter
- Maintains backward compatibility with existing handlers
- Enables services requiring user context (multi-tenancy, database-per-user)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Node schema user_id mismatch:**
- Issue: BaseNodeProperties interfaces don't include user_id field needed for multi-tenancy
- Context: user_id is stored on nodes at runtime but not typed in interfaces (design decision for cleaner types)
- Resolution: Used type assertion (`as any`) when passing user_id to createNode, following pattern from other services
- Impact: None - runtime behavior correct, types slightly loosened for this property

## Next Phase Readiness

**Ready for next phase (03-05 Entity Linking):**
- Relationship discovery service operational and tested via MCP tool
- Entity extraction quality validated via prompt engineering and filtering
- Graph linking pattern established for connecting entities to existing nodes

**Data ingestion pipelines can now use:**
- `discoverRelationships()` to extract entities/relationships from emails, calendar events, notes
- Automatic node deduplication via name matching
- Provenance tracking via sourceContext parameter

**No blockers identified.**

---
*Phase: 03-graphrag-advanced-mcp*
*Completed: 2026-01-25*
