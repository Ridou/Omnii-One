---
phase: 02-graph-core-mcp-server
plan: 01
subsystem: graph-foundation
tags: [neo4j, graph-schema, crud, typescript]
dependency-graph:
  requires:
    - 01-04 (Neo4j HTTP client, createClientForUser)
  provides:
    - NodeLabel enum for Concept/Entity/Event/Contact
    - CRUD operations for graph nodes
    - Relationship management
    - Schema constraints setup
  affects:
    - 02-02 (MCP node tools will use CRUD operations)
    - 02-03 (MCP relationship tools will use createRelationship)
    - 02-04 (Search tools will use getNodesByLabel)
tech-stack:
  added: []
  patterns:
    - Parameterized Cypher queries
    - Neo4j HTTP API response mapping
    - IF NOT EXISTS for idempotent constraints
key-files:
  created:
    - apps/omnii_mcp/src/graph/schema/nodes.ts
    - apps/omnii_mcp/src/graph/schema/relationships.ts
    - apps/omnii_mcp/src/graph/schema/constraints.ts
    - apps/omnii_mcp/src/graph/operations/crud.ts
    - apps/omnii_mcp/src/graph/index.ts
  modified: []
decisions:
  - id: GRAPH-SCHEMA-01
    decision: Four node labels (Concept, Entity, Event, Contact)
    rationale: Covers core knowledge graph use cases for personal context
  - id: GRAPH-SCHEMA-02
    decision: 1536-dimension embedding field for OpenAI ada-002
    rationale: Standard embedding size for vector similarity search
  - id: GRAPH-CRUD-01
    decision: Return properties via properties(n) in Cypher
    rationale: HTTP API response mapping cleaner with explicit property extraction
metrics:
  duration: 4min
  completed: 2026-01-25
---

# Phase 2 Plan 1: Graph Schema and CRUD Summary

**One-liner:** TypeScript enums/interfaces for 4 node types + parameterized CRUD operations + idempotent schema constraints

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Define graph schema constants and interfaces | eb4b930 | nodes.ts, relationships.ts |
| 2 | Implement CRUD operations module | 7fdd9f3 | crud.ts, index.ts |
| 3 | Add database constraints for data integrity | dd52f99 | constraints.ts, index.ts |

## Key Deliverables

### Graph Schema (nodes.ts, relationships.ts)

**Node Labels:**
- `Concept` - abstract ideas, topics, themes
- `Entity` - concrete things (person/organization/place/thing)
- `Event` - time-bound occurrences with startTime/endTime
- `Contact` - people with email/phone/organization

**Relationship Types (SCREAMING_SNAKE_CASE):**
- `MENTIONED_IN`, `ATTENDED_BY`, `RELATED_TO`
- `OCCURRED_AT`, `KNOWS`, `WORKS_AT`, `CREATED_BY`

**Base Properties:**
```typescript
interface BaseNodeProperties {
  id: string;           // UUID
  name: string;         // Display name
  createdAt: string;    // ISO datetime
  updatedAt?: string;   // ISO datetime
  embedding?: number[]; // 1536 dimensions for ada-002
}
```

### CRUD Operations (crud.ts)

| Function | Purpose |
|----------|---------|
| `createNode<T>` | Create node with auto-generated UUID and createdAt |
| `getNode` | Get node by ID with labels |
| `getNodesByLabel` | Get nodes by label, ordered by createdAt DESC |
| `updateNode` | Merge updates, auto-set updatedAt |
| `deleteNode` | DETACH DELETE (removes relationships too) |
| `createRelationship` | MERGE relationship (idempotent) |
| `getRelationships` | Get relationships for a node |
| `deleteRelationship` | Remove specific relationship |

All operations use parameterized Cypher queries to prevent injection.

### Schema Constraints (constraints.ts)

**Uniqueness constraints:** `concept_id`, `entity_id`, `event_id`, `contact_id`

**Existence constraints:** `concept_name`, `entity_name`, `event_name`, `contact_name`

Uses `IF NOT EXISTS` for idempotent setup. Handles Enterprise vs Community edition gracefully.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

1. **HTTP API Response Mapping:** Neo4j HTTP Query API v2 returns `{ fields: [], values: [][] }` arrays, not Record objects. Helper functions `mapResultToNode` and `mapResultToNodes` handle this.

2. **Type Guards Added:** Included `isConceptNode`, `isEntityNode`, `isEventNode`, `isContactNode` for runtime type checking.

3. **Extra Operations Added:** `getRelationships` and `deleteRelationship` added for completeness beyond plan requirements.

## Next Phase Readiness

**Ready for 02-02 (MCP Node Tools):**
- All CRUD operations available via `import { createNode, getNode, ... } from './graph'`
- NodeLabel enum available for type-safe label selection
- Operations accept Neo4jHTTPClient from createClientForUser

**Dependencies verified:**
- Neo4jHTTPClient interface matches Phase 1 implementation
- createClientForUser returns compatible client instance
