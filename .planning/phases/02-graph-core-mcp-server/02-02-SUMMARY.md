---
phase: 02-graph-core-mcp-server
plan: 02
subsystem: graph-search
tags: [neo4j, vector-search, embeddings, openai, semantic-search]
dependency-graph:
  requires: ["02-01"]
  provides: ["vector-index-config", "embedding-generation", "semantic-search"]
  affects: ["02-03", "02-04"]
tech-stack:
  added: []
  patterns: ["vector-similarity-search", "exponential-backoff", "hnsw-index"]
key-files:
  created:
    - apps/omnii_mcp/src/graph/schema/vector-index.ts
    - apps/omnii_mcp/src/graph/operations/embeddings.ts
    - apps/omnii_mcp/src/graph/operations/search.ts
  modified:
    - apps/omnii_mcp/src/graph/index.ts
decisions:
  - id: DEC-02-02-01
    decision: "HNSW algorithm with cosine similarity for vector index"
    rationale: "Best balance of speed and accuracy for embedding search"
  - id: DEC-02-02-02
    decision: "Exponential backoff 1s/2s/4s for rate limits"
    rationale: "Standard retry pattern that respects API rate limits"
metrics:
  duration: 3min
  completed: 2026-01-25
---

# Phase 2 Plan 2: Vector Search and Embeddings Summary

**One-liner:** Neo4j HNSW vector index with OpenAI ada-002 embeddings and semantic search operations

## What Was Built

### Vector Index Configuration (`vector-index.ts`)
- `VECTOR_INDEX_NAME = 'entity_embeddings'` - Index identifier
- `VECTOR_DIMENSIONS = 1536` - OpenAI ada-002 dimensions
- `VECTOR_SIMILARITY = 'cosine'` - Similarity function
- `createVectorIndex()` - Creates HNSW index with quantization
- `checkVectorIndex()` - Returns index status (state, population)
- `dropVectorIndex()` - Removes index for testing/reset

### Embedding Generation (`embeddings.ts`)
- `generateEmbedding(text)` - Single text to 1536-dim vector
- `generateEmbeddings(texts)` - Batch embedding generation
- Uses `text-embedding-ada-002` model via OpenAI client
- Rate limit handling with exponential backoff (1s, 2s, 4s)
- Dimension validation (must be exactly 1536)

### Semantic Search (`search.ts`)
- `searchByText(client, query, options)` - Natural language search (primary interface)
- `searchByEmbedding(client, embedding, options)` - Direct vector search
- `findRelatedNodes(client, nodeId, options)` - Graph traversal
- Options: `limit`, `minScore`, `nodeTypes`, `maxDepth`
- Uses `db.index.vector.queryNodes` Neo4j procedure

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Index algorithm | HNSW | Fast approximate nearest neighbor, good for large graphs |
| Similarity function | Cosine | Standard for normalized embeddings like ada-002 |
| Quantization | Enabled | Better memory efficiency with minimal accuracy loss |
| Rate limit strategy | Exponential backoff | Respects API limits, max 3 retries |
| Search default | minScore: 0.7 | Filters low-quality matches |

## Technical Details

### Vector Index Cypher
```cypher
CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS
FOR (n:Entity)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine',
    `vector.quantization.enabled`: true
  }
}
```

### Search Query Pattern
```cypher
CALL db.index.vector.queryNodes($indexName, $k, $queryVector)
YIELD node, score
WHERE score >= $minScore
RETURN node.id, node.name, labels(node), score, properties(node)
ORDER BY score DESC
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| b1d5616 | feat | add vector index configuration |
| 91d6e1b | feat | add OpenAI embedding generation module |
| 111518c | feat | add semantic search operations |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 02-03 (MCP Tools Implementation):**
- [x] Vector index configuration available for schema setup
- [x] Embedding generation for storing node embeddings
- [x] searchByText ready for search_nodes MCP tool
- [x] All exports available via graph module index

**Dependencies provided:**
- `createVectorIndex` - For initializing user databases
- `generateEmbedding` - For storing embeddings on node creation
- `searchByText` - Primary interface for MCP search tool
- `findRelatedNodes` - For context expansion in search results
