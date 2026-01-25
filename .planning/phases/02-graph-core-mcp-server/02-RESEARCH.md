# Phase 2: Graph Core & MCP Server - Research

**Researched:** 2026-01-25
**Domain:** Neo4j graph database schema design + MCP protocol implementation
**Confidence:** HIGH

## Summary

This phase implements the core differentiator: a graph database storing personal context (concepts, entities, events, contacts) with vector search, exposed via MCP protocol for AI assistant integration. The research validates that both Neo4j and MCP have mature, well-documented ecosystems with established patterns.

**Key Findings:**
- Neo4j HTTP Query API v2 is production-ready for Bun runtime (avoiding neo4j-driver TCP incompatibility)
- MCP specification 2025-11-25 is stable with TypeScript SDK v1.x recommended for production
- Vector indexes in Neo4j use HNSW algorithm with native VECTOR type support as of 2025.10
- Graph schema must follow query-driven design (model for access patterns, not abstract relationships)
- MCP OAuth 2.1 specification finalized March 2025 with Resource Indicators (RFC 8707) requirement
- Streamable HTTP is the modern MCP transport standard (SSE deprecated as of protocol 2026-03-26)

**Primary recommendation:** Use Neo4j's query-driven modeling approach (design schema based on MCP tool queries), implement MCP tools with @modelcontextprotocol/sdk TypeScript library, avoid custom JWT validation (use Supabase's built-in verification), and use token bucket rate limiting with elysia-rate-limit.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Neo4j HTTP Query API v2 | Current | Graph database operations via HTTP | Official Neo4j API, avoids Bun TCP driver incompatibility, production-ready |
| @modelcontextprotocol/sdk | 1.x (stable) | MCP server implementation | Official TypeScript SDK from Anthropic, v2 not stable until Q1 2026 |
| @supabase/supabase-js | 2.50.0+ | JWT verification | Official Supabase SDK with built-in auth.getUser() validation |
| elysia-rate-limit | Latest | Rate limiting middleware | Bun-optimized, LRU cache, works with Elysia lifecycle |
| zod | 3.25+ | Schema validation | Required peer dependency for MCP SDK, runtime type safety |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Elysia helmet | 3.0.0+ | Security headers | Already in stack, provides baseline security |
| ioredis | 5.6.1+ | Distributed rate limiting | If scaling beyond single instance (Phase 6+) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HTTP Query API v2 | neo4j-driver (TCP) | TCP driver has 60s timeout issues with Bun runtime (prior decision) |
| MCP SDK | Custom JSON-RPC | Custom implementation misses protocol updates, security patches |
| Token bucket | Sliding window | Token bucket better for API bursts, simpler implementation |
| Supabase auth | Custom JWT validation | Custom validation prone to security vulnerabilities (RFC 8725 warnings) |

**Installation:**
```bash
npm install @modelcontextprotocol/sdk zod
npm install elysia-rate-limit
# Neo4j HTTP client and Supabase already in stack
```

## Architecture Patterns

### Recommended Project Structure
```
apps/omnii_mcp/src/
├── mcp/
│   ├── server.ts              # MCP server initialization
│   ├── tools/                 # MCP tool definitions
│   │   ├── search-nodes.ts    # Semantic search tool
│   │   ├── get-context.ts     # Context retrieval tool
│   │   └── list-entities.ts   # Entity listing tool
│   ├── transport.ts           # Streamable HTTP transport
│   └── capabilities.ts        # Server capability declaration
├── graph/
│   ├── schema/
│   │   ├── nodes.ts           # Node label constants + constraints
│   │   ├── relationships.ts   # Relationship type constants
│   │   └── vector-index.ts    # Vector index configuration
│   ├── operations/
│   │   ├── crud.ts            # Create, read, update, delete
│   │   └── search.ts          # Vector search queries
│   └── migrations/            # Schema version tracking
├── middleware/
│   ├── auth.ts                # JWT validation (inline, not .use())
│   └── rate-limit.ts          # Token bucket rate limiter
└── services/neo4j/
    └── http-client.ts         # Already exists
```

### Pattern 1: MCP Server Initialization with Capability Negotiation

**What:** Three-step handshake for protocol version and capability agreement
**When to use:** Required for all MCP server implementations

**Example:**
```typescript
// Source: https://modelcontextprotocol.io/specification/2025-11-25
import { McpServer } from '@modelcontextprotocol/sdk';

const server = new McpServer({
  name: 'omnii-graph-server',
  version: '1.0.0'
});

// Register capabilities
server.setRequestHandler('initialize', async (request) => {
  // Step 1: Client sends protocol version + capabilities
  const clientVersion = request.params.protocolVersion;
  const clientCapabilities = request.params.capabilities;

  // Step 2: Server responds with matching version + own capabilities
  return {
    protocolVersion: clientVersion, // Must match or negotiate
    capabilities: {
      tools: {}, // Declare tool support
      resources: {} // Optional resource support
    },
    serverInfo: {
      name: 'omnii-graph-server',
      version: '1.0.0'
    }
  };
});

// Step 3: After client sends 'notifications/initialized',
// server is ready for tool calls
```

### Pattern 2: Query-Driven Graph Schema Design

**What:** Design nodes and relationships based on MCP tool query patterns, not abstract domain models
**When to use:** Graph schema creation for personal context data

**Example:**
```typescript
// Source: https://neo4j.com/docs/getting-started/data-modeling/
// Query: "Find entities mentioned in meetings about X"
// Schema optimized for this access pattern:

// Node labels (CamelCase convention)
enum NodeLabel {
  Concept = 'Concept',      // Abstract ideas
  Entity = 'Entity',        // Concrete things (people, orgs)
  Event = 'Event',          // Time-bound occurrences
  Contact = 'Contact'       // People with contact info
}

// Relationships (SCREAMING_SNAKE_CASE convention)
enum Relationship {
  MENTIONED_IN = 'MENTIONED_IN',
  ATTENDED_BY = 'ATTENDED_BY',
  RELATED_TO = 'RELATED_TO',
  OCCURRED_AT = 'OCCURRED_AT'
}

// Graph traversal for MCP tool query
const query = `
  MATCH (e:Event {title: $eventTitle})
  MATCH (entity:Entity)-[:MENTIONED_IN]->(e)
  MATCH (entity)-[:RELATED_TO]->(concept:Concept {name: $conceptName})
  RETURN entity, concept
`;
```

### Pattern 3: Vector Index for Semantic Search

**What:** HNSW-based vector index for embedding-driven similarity search
**When to use:** MCP tool "search nodes by semantic meaning"

**Example:**
```typescript
// Source: https://neo4j.com/docs/cypher-manual/current/indexes/semantic-indexes/vector-indexes/
// Create vector index (run once during schema setup)
const createIndexQuery = `
  CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS
  FOR (n:Entity)
  ON n.embedding
  OPTIONS {
    indexConfig: {
      \`vector.dimensions\`: 1536,
      \`vector.similarity_function\`: 'cosine',
      \`vector.quantization.enabled\`: true
    }
  }
`;

// Query vector index (MCP tool implementation)
async function searchNodes(query: string, k: number = 10) {
  const embedding = await generateEmbedding(query); // OpenAI API

  const result = await neo4jClient.query(`
    CALL db.index.vector.queryNodes(
      'entity_embeddings',
      $k,
      $queryVector
    ) YIELD node, score
    RETURN node, score
    ORDER BY score DESC
  `, {
    k,
    queryVector: embedding
  });

  return result.data.values;
}
```

### Pattern 4: MCP Tool Registration with Input Validation

**What:** Zod-validated tool inputs with clear descriptions for LLM understanding
**When to use:** Every MCP tool exposed to AI assistants

**Example:**
```typescript
// Source: https://github.com/modelcontextprotocol/typescript-sdk
import { z } from 'zod';

const SearchNodesInputSchema = z.object({
  query: z.string().describe('Natural language search query'),
  limit: z.number().min(1).max(50).default(10).describe('Max results to return'),
  nodeTypes: z.array(z.enum(['Concept', 'Entity', 'Event', 'Contact']))
    .optional()
    .describe('Filter by node types')
});

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'search_nodes') {
    const input = SearchNodesInputSchema.parse(request.params.arguments);

    const results = await searchNodes(input.query, input.limit);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }]
    };
  }
});

// Tool listing for capability discovery
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [{
      name: 'search_nodes',
      description: 'Search graph nodes by semantic meaning using vector similarity',
      inputSchema: zodToJsonSchema(SearchNodesInputSchema)
    }]
  };
});
```

### Pattern 5: Inline Auth Middleware (Bun-specific workaround)

**What:** JWT validation inside route handlers due to Elysia .derive() propagation bug with Bun
**When to use:** All authenticated MCP endpoints

**Example:**
```typescript
// Source: Existing codebase at packages/auth/src/middleware.ts
// NOTE: .use(authMiddleware) has issues with Bun runtime

import { createSupabaseClient } from '@omnii/auth';

async function authenticateRequest(headers: Record<string, string>) {
  const authHeader = headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const supabase = createSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return {
    user,
    tenantId: user.id  // Used for database-per-user lookup
  };
}

// Usage in MCP tool handler
server.setRequestHandler('tools/call', async (request, context) => {
  const auth = await authenticateRequest(context.headers);
  const neo4jClient = await createClientForUser(auth.tenantId);

  // Now execute tool with user's isolated database
});
```

### Pattern 6: Token Bucket Rate Limiting

**What:** Allow request bursts up to bucket capacity, refill at steady rate
**When to use:** Protect MCP server from abuse, per-user quotas

**Example:**
```typescript
// Source: https://github.com/rayriffy/elysia-rate-limit
import { rateLimit } from 'elysia-rate-limit';

const mcpRateLimiter = rateLimit({
  duration: 60000,        // 60 second window
  max: 100,               // 100 requests per minute
  responseMessage: 'Rate limit exceeded. Please try again later.',
  generator: (req, server) => {
    // Rate limit per user (extracted from JWT)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return 'anonymous';

    const token = authHeader.substring(7);
    // Parse JWT to get user ID (without full verification for rate limiting)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub; // Supabase user ID
  },
  // Refund on errors (don't penalize failed requests)
  onError: true
});

app.use(mcpRateLimiter);
```

### Anti-Patterns to Avoid

- **Pattern:** Using MERGE on full patterns with unbound variables
  **Why bad:** Creates duplicate nodes if pattern doesn't exist. Always MERGE nodes first, then relationships.
  **Instead:** `MERGE (n:Node {id: $id}) ... MERGE (m:Node {id: $id2}) ... MERGE (n)-[r:REL]->(m)`

- **Pattern:** Exposing MCP server via stdio transport for remote access
  **Why bad:** Stdio is local-only, doesn't support multiple clients, no network transport
  **Instead:** Use Streamable HTTP transport (SSE deprecated as of 2026-03-26)

- **Pattern:** Implementing custom JWT validation logic
  **Why bad:** Easy to miss security requirements (signature verification, expiry, issuer validation)
  **Instead:** Use Supabase SDK's `auth.getUser(token)` which handles all validation

- **Pattern:** Creating vector indexes without specifying dimensions
  **Why bad:** No validation of embedding vector size, leads to runtime errors
  **Instead:** Always specify `vector.dimensions: 1536` (for OpenAI ada-002)

- **Pattern:** Using generic relationship types like CONNECTED_TO or RELATED_TO everywhere
  **Why bad:** Loses semantic meaning, makes graph traversal queries complex
  **Instead:** Use specific relationship types (MENTIONED_IN, ATTENDED_BY, CREATED_BY)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol implementation | Custom JSON-RPC server | @modelcontextprotocol/sdk | Protocol versioning, capability negotiation, security updates handled automatically |
| JWT validation | Manual token parsing + signature verification | Supabase SDK auth.getUser() | Missing validation checks (exp, nbf, iss, aud) leads to vulnerabilities (RFC 8725) |
| Rate limiting | Custom request counting | elysia-rate-limit | LRU cache, memory management, edge case handling (clock skew, distributed systems) |
| Vector similarity search | Manual cosine similarity in app code | Neo4j VECTOR index + HNSW | HNSW algorithm provides log(n) search vs O(n) brute force, quantization for performance |
| Graph schema migrations | Manual Cypher scripts | Version-tracked migration files | Schema drift between environments, no rollback capability, hard to audit changes |

**Key insight:** Security (JWT, rate limiting) and performance (vector search) are domains where DIY implementations consistently fail at edge cases discovered by production usage. Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: Tool Name Collisions Between MCP Servers
**What goes wrong:** Multiple MCP servers can define tools with the same name, causing the last-loaded tool to overwrite earlier ones. AI assistant only sees the latest tool.
**Why it happens:** MCP protocol has no tool namespacing mechanism. Tools identified by name only.
**How to avoid:** Prefix tool names with server identifier (e.g., `omnii_graph_search_nodes` not `search_nodes`)
**Warning signs:** Tool calls fail with "tool not found" despite successful server connection; tool behavior changes when adding new MCP servers

### Pitfall 2: Vector Index Dimension Mismatch
**What goes wrong:** Vector index created with wrong dimensions (e.g., 1536) but embeddings have different size (e.g., 768). Insert fails silently or throws cryptic errors.
**Why it happens:** Different embedding models produce different vector sizes (OpenAI ada-002: 1536, Sentence Transformers: 384/768)
**How to avoid:** Lock embedding model + dimension in configuration. Create index with exact dimension. Add validation before insert: `if (embedding.length !== 1536) throw new Error()`
**Warning signs:** "Vector dimension mismatch" errors; search returns no results despite data existing

### Pitfall 3: MERGE Creating Duplicate Nodes
**What goes wrong:** Using `MERGE (a:Person)-[:KNOWS]->(b:Person)` with unbound variables creates duplicate Person nodes every time.
**Why it happens:** MERGE tries to match the entire pattern. If pattern doesn't exist, creates all unbound parts.
**How to avoid:** Always MERGE nodes separately first: `MERGE (a:Person {id: $id1}) MERGE (b:Person {id: $id2})` then `MERGE (a)-[:KNOWS]->(b)`
**Warning signs:** Node count grows unexpectedly; duplicate entities in search results

### Pitfall 4: Treating MCP Like REST
**What goes wrong:** Implementing MCP tools without retries, assuming single call always succeeds, not handling partial failures
**Why it happens:** MCP is designed for agentic loops, not one-shot requests. Tools should be idempotent and retry-friendly.
**How to avoid:** Design tools as operations (with success/failure states) not actions. Return actionable error messages LLM can understand. Support partial results.
**Warning signs:** Flaky tool calls; AI assistant says "I couldn't complete that task" with no retry

### Pitfall 5: Missing MCP Initialization Handshake
**What goes wrong:** Server accepts tool calls before receiving `notifications/initialized`. Client thinks server isn't ready.
**Why it happens:** MCP requires strict 3-step initialization: initialize request → initialize response → initialized notification. Only after step 3 can tools be called.
**How to avoid:** Track initialization state. Reject tool calls with "Server not initialized" until handshake completes. Test with official MCP clients (Claude Desktop).
**Warning signs:** "Claude was unable to connect" errors; tools listed but not callable

### Pitfall 6: Ignoring Rate Limit Edge Cases
**What goes wrong:** Rate limiter breaks with clock skew, allows double requests at window boundaries, doesn't handle distributed scenarios
**Why it happens:** Token bucket and sliding window algorithms have subtle timing issues. DIY implementations miss these.
**How to avoid:** Use elysia-rate-limit which handles edge cases. For distributed systems (Phase 6+), use Redis-backed implementation.
**Warning signs:** Rate limit bypassed by rapid requests; inconsistent enforcement across instances

### Pitfall 7: Neo4j HTTP API Error Handling
**What goes wrong:** 401 errors treated as "database down" instead of "wrong credentials"; 404 treated as "query failed" instead of "database doesn't exist"
**Why it happens:** HTTP Query API uses standard HTTP status codes but errors require context interpretation
**How to avoid:** Check existing http-client.ts error handling patterns (401 → auth failed, 404 → database not found, 500 → Cypher syntax)
**Warning signs:** Misleading error messages; retry logic on authentication failures

## Code Examples

Verified patterns from official sources:

### Neo4j HTTP Query API v2 Request Format
```typescript
// Source: https://neo4j.com/docs/query-api/current/query/
async function executeQuery(cypher: string, params: Record<string, any>) {
  const response = await fetch(`${NEO4J_URI}/db/${database}/query/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${user}:${password}`)}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      statement: cypher,
      parameters: params
    })
  });

  if (!response.ok) {
    const error = await response.json();
    // Handle by status code (see http-client.ts)
    throw new Error(`Neo4j error: ${error.message}`);
  }

  return response.json();
}
```

### MCP Tool Definition with Structured Output
```typescript
// Source: https://modelcontextprotocol.io/docs/develop/build-server
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_context') {
    const { entityId } = GetContextInputSchema.parse(args);

    const result = await neo4jClient.query(`
      MATCH (e:Entity {id: $entityId})
      OPTIONAL MATCH (e)-[r]-(related)
      RETURN e, collect({type: type(r), node: related}) as relationships
    `, { entityId });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result.data.values[0])
      }],
      isError: false
    };
  }
});
```

### Graph CRUD Operations
```typescript
// Source: https://neo4j.com/docs/cypher-manual/current/clauses/merge/
// CREATE: Always creates new nodes
async function createEntity(name: string, type: string) {
  return neo4jClient.query(`
    CREATE (e:Entity {
      id: randomUUID(),
      name: $name,
      type: $type,
      createdAt: datetime()
    })
    RETURN e
  `, { name, type });
}

// MERGE: Upsert pattern (create if not exists, update if exists)
async function upsertEntity(id: string, properties: Record<string, any>) {
  return neo4jClient.query(`
    MERGE (e:Entity {id: $id})
    ON CREATE SET e += $properties, e.createdAt = datetime()
    ON MATCH SET e += $properties, e.updatedAt = datetime()
    RETURN e
  `, { id, properties });
}

// MATCH + UPDATE: Update existing nodes
async function updateEntity(id: string, updates: Record<string, any>) {
  return neo4jClient.query(`
    MATCH (e:Entity {id: $id})
    SET e += $updates, e.updatedAt = datetime()
    RETURN e
  `, { id, updates });
}

// MATCH + DELETE: Remove nodes and relationships
async function deleteEntity(id: string) {
  return neo4jClient.query(`
    MATCH (e:Entity {id: $id})
    DETACH DELETE e
  `);
}
```

### Vector Index Creation and Query
```typescript
// Source: https://neo4j.com/docs/cypher-manual/current/indexes/semantic-indexes/vector-indexes/
// Run once during schema setup
async function createVectorIndex() {
  await neo4jClient.query(`
    CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS
    FOR (n:Entity)
    ON n.embedding
    OPTIONS {
      indexConfig: {
        \`vector.dimensions\`: 1536,
        \`vector.similarity_function\`: 'cosine',
        \`vector.quantization.enabled\`: true
      }
    }
  `);
}

// Semantic search query
async function searchBySimilarity(queryEmbedding: number[], limit: number = 10) {
  const result = await neo4jClient.query(`
    CALL db.index.vector.queryNodes(
      'entity_embeddings',
      $limit,
      $queryVector
    ) YIELD node, score
    RETURN node.id as id, node.name as name, score
    ORDER BY score DESC
  `, {
    limit,
    queryVector: queryEmbedding
  });

  return result.data.values;
}
```

### MCP Streamable HTTP Transport
```typescript
// Source: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamablehttp.js';

const server = new Server({
  name: 'omnii-graph-server',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

// Create Streamable HTTP transport (modern standard, not SSE)
const transport = new StreamableHTTPServerTransport({
  endpoint: '/mcp',
  enableSSE: false  // SSE deprecated as of 2026-03-26
});

await server.connect(transport);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MCP HTTP+SSE transport | Streamable HTTP | Protocol 2026-03-26 | Better stateless communication, cloud infrastructure compatibility |
| Neo4j LIST<FLOAT> for vectors | Native VECTOR type | Neo4j 2025.10 | End-to-end type safety, better storage efficiency |
| MCP protocol 2024-11-05 | MCP protocol 2025-11-25 | March 2025 | OAuth 2.1 standardization, Resource Indicators (RFC 8707) |
| Fixed Window rate limiting | Token Bucket | Ongoing | Better burst handling for API workloads |
| Abstract domain modeling | Query-driven schema design | Established pattern | Schemas optimized for actual access patterns, not theoretical relationships |

**Deprecated/outdated:**
- **SSE transport for MCP**: Deprecated in protocol 2026-03-26. Use Streamable HTTP instead.
- **Manual JWT validation**: RFC 8725 warns against DIY implementations. Use Supabase SDK.
- **Generic relationship types**: RELATED_TO loses semantic meaning. Use specific types (MENTIONED_IN, ATTENDED_BY).
- **@modelcontextprotocol/sdk v2.x**: Not stable until Q1 2026. Use v1.x for production.

## Open Questions

Things that couldn't be fully resolved:

1. **MCP Client Capability Gaps**
   - What we know: MCP clients don't declare all capabilities during initialize handshake (missing: instructions support, dynamic tool updates, resource subscriptions)
   - What's unclear: Which capabilities Claude Desktop supports in practice beyond basic tool calling
   - Recommendation: Test with Claude Desktop integration (Phase 2 success criteria). Document observed behavior. Watch for SEP-1381 proposal adoption.

2. **Graph Schema Versioning Strategy**
   - What we know: No standard migration tool for Neo4j like Flyway/Liquibase for SQL. Research shows manual Cypher scripts common.
   - What's unclear: Best practice for tracking schema versions in database-per-user multi-tenancy (48 users = 48 schema migrations?)
   - Recommendation: Start with version comments in Cypher files (Phase 2). Evaluate dedicated tooling if schema changes become frequent (Phase 3+). Consider storing schema_version property on metadata node.

3. **Rate Limiting for Database-Per-User**
   - What we know: elysia-rate-limit supports per-user limits via generator function. Neo4j Aura has per-instance quotas.
   - What's unclear: Should rate limiting be per-user-per-tool or global-per-user? How does Neo4j Aura quota interact with application-level rate limiting?
   - Recommendation: Implement global per-user rate limiting (100 req/min) in Phase 2. Monitor Neo4j Aura usage. Add per-tool limits if specific tools create hotspots.

4. **Embedding Model Lock-In**
   - What we know: Vector index dimensions must match embedding model. OpenAI ada-002 = 1536 dimensions. Changing models requires re-indexing all vectors.
   - What's unclear: Is ada-002 the best choice long-term? What's migration path if better embedding models emerge?
   - Recommendation: Use ada-002 (1536 dims) for Phase 2 (industry standard, proven). Add embedding_model property to nodes for future migration. Accept re-indexing cost if switching models (one-time operation).

## Sources

### Primary (HIGH confidence)
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) - Protocol requirements, transport mechanisms
- [Neo4j Vector Indexes Documentation](https://neo4j.com/docs/cypher-manual/current/indexes/semantic-indexes/vector-indexes/) - Vector index configuration, HNSW algorithm
- [Neo4j HTTP Query API](https://neo4j.com/docs/query-api/current/query/) - Request format, authentication, error codes
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official SDK documentation, tool registration patterns
- [Neo4j Data Modeling](https://neo4j.com/docs/getting-started/data-modeling/) - Query-driven design, relationship patterns

### Secondary (MEDIUM confidence)
- [Auth0 MCP Authorization Guide (2025)](https://auth0.com/blog/mcp-specs-update-all-about-auth/) - OAuth 2.1 spec updates, Resource Indicators requirement
- [MCP Server Development Guide](https://github.com/cyanheads/model-context-protocol-resources/blob/main/guides/mcp-server-development-guide.md) - Best practices, pitfall documentation
- [Neo4j Cypher MERGE Documentation](https://neo4j.com/docs/cypher-manual/current/clauses/merge/) - MERGE patterns, ON CREATE/ON MATCH
- [Elysia Rate Limit GitHub](https://github.com/rayriffy/elysia-rate-limit) - Token bucket implementation, Bun compatibility
- [JWT Best Practices RFC 8725](https://datatracker.ietf.org/doc/html/rfc8725) - Security warnings about DIY validation

### Tertiary (LOW confidence)
- [MCP Common Pitfalls (NearForm)](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/) - Community-reported issues
- [Rate Limiting Algorithms Comparison](https://api7.ai/blog/rate-limiting-guide-algorithms-best-practices) - Token bucket vs sliding window analysis
- [Graph Schema Evolution (2026 Paper)](https://iscsitr.in/index.php/ISCSITR-IJDE/article/download/ISCSITR-IJDE_2026_07_01_001/ISCSITR-IJDE_2026_07_01_001/1607) - Academic research on NoSQL schema versioning

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries have official documentation, production usage verified
- Architecture: HIGH - Patterns verified from official Neo4j + MCP docs with code examples
- Pitfalls: MEDIUM - Documented in community resources, some from WebSearch only (tool name collisions, MERGE duplicates confirmed in Neo4j docs)

**Research date:** 2026-01-25
**Valid until:** 2026-03-25 (60 days - MCP and Neo4j are stable, but MCP SDK v2 release expected Q1 2026)
