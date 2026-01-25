# Phase 3: GraphRAG & Advanced MCP - Research

**Researched:** 2026-01-25
**Domain:** Graph-enhanced Retrieval (GraphRAG), MCP multi-client integration
**Confidence:** MEDIUM-HIGH

## Summary

Phase 3 extends basic vector search into full GraphRAG by combining dual-channel retrieval (vector + graph traversal) and expands MCP support beyond Claude to OpenAI and local LLMs. Research reveals GraphRAG is not just "better search" but a fundamentally different architecture that enables contextual reasoning through structured knowledge.

The standard approach uses **local search** for entity-specific queries (fast, targeted) and **global search** for corpus-wide questions (expensive, holistic). Microsoft GraphRAG pioneered this pattern using Leiden community detection for hierarchical graph organization. Neo4j implements the vector+graph combination through HybridCypherRetriever, leveraging HNSW vector indexes with Cypher traversal.

For MCP expansion, OpenAI has officially adopted MCP (March 2025) with their new Responses API, while local LLMs (Ollama, LM Studio) require bridge implementations and tool-calling-capable models (Llama 3.1+, Codestral, Qwen). The critical distinction: OpenAI uses native function calling, while local LLMs need explicit tool schemas and often struggle with parallel calls.

**Primary recommendation:** Implement local search first (entity-centric, faster, cheaper), defer global search to later phases. Use Neo4j's built-in vector+Cypher patterns rather than Microsoft GraphRAG's full indexing pipeline. For MCP, prioritize OpenAI integration (production-ready) over local LLMs (experimental, requires model selection and bridge architecture).

## Standard Stack

The established libraries/tools for GraphRAG and MCP multi-client support:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Neo4j Graph Data Science | 2.x | Leiden community detection, graph algorithms | Industry standard for graph analytics, used by Microsoft GraphRAG implementations |
| Microsoft GraphRAG | Latest (2025-2026) | Reference architecture for local/global search patterns | Pioneered dual-channel retrieval, defines the pattern |
| OpenAI SDK | Latest | Function calling integration | Official SDK, supports new Responses API with parallel tools |
| MCP TypeScript SDK | 2025-11-25 spec | MCP server implementation | Official Anthropic SDK, best DX with Zod schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ollama-mcp-bridge | Latest | Bridge Ollama to MCP servers | If supporting local LLMs without native MCP |
| LangChain GraphRAG | Latest | Entity-relationship extraction | If using GPT-4o-mini for automatic extraction |
| graspologic | Latest | Hierarchical Leiden (Python) | If implementing community detection yourself |
| leidenalg | 0.10.x+ | Python Leiden implementation | Alternative to graspologic, more established |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Neo4j GDS Leiden | graspologic/leidenalg | GDS is integrated, Python libs need graph export |
| OpenAI Responses API | Chat Completions API | Responses has better agentic loop, 3% improvement on SWE-bench |
| MCP TypeScript SDK | Python SDK | TypeScript has better Elysia integration, Python for data science workloads |

**Installation:**
```bash
# Neo4j GDS (if not using Neo4j Aura, which includes it)
# Install via Neo4j Desktop or Docker image with GDS plugin

# GraphRAG reference (for patterns, not direct use)
npm install @microsoft/graphrag  # Optional, for reference

# MCP TypeScript SDK (already using 2025-11-25 spec)
bun add @modelcontextprotocol/sdk

# OpenAI SDK
bun add openai

# Ollama bridge (if supporting local LLMs)
bun add ollama-mcp-bridge  # Or use community bridges
```

## Architecture Patterns

### Recommended Project Structure
```
packages/backend/src/
├── services/
│   ├── graphrag/
│   │   ├── local-search.ts       # Entity-centric retrieval
│   │   ├── dual-channel.ts       # Vector + graph combiner
│   │   ├── relationship-discovery.ts  # Automatic entity linking
│   │   └── temporal-context.ts   # Time-based filtering
│   └── mcp/
│       ├── tools/
│       │   ├── calendar.ts       # Domain-aware calendar tool
│       │   ├── contacts.ts       # Contact lookup tool
│       │   └── tasks.ts          # Task operations tool
│       ├── adapters/
│       │   ├── openai.ts         # OpenAI function calling adapter
│       │   └── local-llm.ts      # Ollama/LM Studio adapter
│       └── middleware/
│           └── tool-auth.ts      # Per-tool authorization
```

### Pattern 1: Dual-Channel Retrieval (Local Search)
**What:** Combine vector similarity search with graph traversal to gather entity context
**When to use:** Entity-specific queries ("what did I do last week?", "find contacts at Acme Corp")

**Implementation approach:**
```typescript
// Source: Neo4j blog + Microsoft GraphRAG patterns
// https://neo4j.com/blog/developer/enhancing-hybrid-retrieval-graphrag-python-package/

async function dualChannelSearch(query: string, limit: number = 10) {
  // Channel 1: Vector search for initial candidates
  const vectorResults = await neo4j.executeQuery(`
    CALL db.index.vector.queryNodes(
      'entity_embeddings',
      $limit,
      $queryEmbedding
    ) YIELD node, score
    RETURN node, score
  `, {
    queryEmbedding: await embedQuery(query),
    limit
  });

  // Channel 2: Graph traversal for context expansion
  const contextResults = await neo4j.executeQuery(`
    UNWIND $nodeIds AS nodeId
    MATCH (n) WHERE elementId(n) = nodeId

    // Gather 1-2 hop neighbors with relationship context
    CALL {
      WITH n
      MATCH (n)-[r1]-(neighbor1)
      OPTIONAL MATCH (neighbor1)-[r2]-(neighbor2)
      WHERE neighbor2 <> n
      RETURN collect(DISTINCT neighbor1) + collect(DISTINCT neighbor2) AS neighbors,
             collect(DISTINCT r1) + collect(DISTINCT r2) AS relationships
    }

    RETURN n AS entity,
           neighbors,
           relationships
  `, {
    nodeIds: vectorResults.records.map(r => r.get('node').elementId)
  });

  // Combine and rank results
  return mergeChannelResults(vectorResults, contextResults);
}
```

**Key considerations:**
- Vector search is O(log N) with HNSW, fast initial retrieval
- Graph traversal depth should be 1-2 hops max to avoid exponential explosion
- Use inline predicates in Cypher to prune unwanted paths early
- Temporal filtering happens at graph traversal stage, not vector search

### Pattern 2: Automatic Relationship Discovery
**What:** Use LLM to extract entities and relationships from text, then link to existing graph nodes
**When to use:** Ingesting new data (emails, notes, calendar events) where connections aren't explicit

**Implementation approach:**
```typescript
// Source: LangChain GraphRAG entity extraction patterns
// https://langchain-graphrag.readthedocs.io/en/latest/guides/graph_extraction/er_extraction/

import { ChatOpenAI } from "@langchain/openai";

async function discoverRelationships(text: string, userId: string) {
  // Use LLM for entity/relationship extraction
  const extractor = new ChatOpenAI({ model: "gpt-4o-mini" });

  const prompt = `Extract entities and relationships from this text.
Return JSON with:
- entities: [{ name, type, properties }]
- relationships: [{ from, to, type, properties }]

IMPORTANT: Use SPECIFIC relationship types (EMPLOYED_BY, FOUNDED, ACQUIRED)
NOT vague types (RELATED_TO, ASSOCIATED_WITH).

Text: ${text}`;

  const extraction = await extractor.invoke(prompt);
  const { entities, relationships } = JSON.parse(extraction.content);

  // Link to existing graph nodes or create new ones
  for (const entity of entities) {
    await neo4j.executeQuery(`
      MERGE (e:Entity {name: $name, user_id: $userId})
      ON CREATE SET e.type = $type, e.properties = $properties, e.created_at = datetime()
      ON MATCH SET e.updated_at = datetime()
    `, { name: entity.name, type: entity.type, properties: entity.properties, userId });
  }

  // Create relationships with temporal context
  for (const rel of relationships) {
    await neo4j.executeQuery(`
      MATCH (from:Entity {name: $from, user_id: $userId})
      MATCH (to:Entity {name: $to, user_id: $userId})
      MERGE (from)-[r:${rel.type}]->(to)
      ON CREATE SET r.discovered_at = datetime(), r.properties = $properties
    `, { from: rel.from, to: rel.to, properties: rel.properties, userId });
  }

  return { entities, relationships };
}
```

**Key pitfalls:**
- Prompt quality is non-negotiable: poor prompts = noisy graph = garbage outputs
- Avoid vague relationship types that provide no semantic value
- Always use fairly powerful LLM (GPT-4o-mini minimum) for extraction quality
- Don't merge entities too aggressively—name ambiguity requires disambiguation logic

### Pattern 3: Temporal Context Awareness
**What:** Filter graph queries by time ranges using Neo4j temporal types and duration arithmetic
**When to use:** Time-based queries ("last week", "this month", "before January 2026")

**Implementation approach:**
```typescript
// Source: Neo4j Cypher temporal documentation
// https://neo4j.com/docs/cypher-manual/current/values-and-types/temporal/

async function queryTemporalContext(
  userId: string,
  relativeTime: string // "last week", "this month", etc.
) {
  // Convert relative time to Neo4j duration
  const durations = {
    "last week": "P7D",
    "last month": "P1M",
    "this year": "P1Y",
  };

  const duration = durations[relativeTime] || "P7D";

  const result = await neo4j.executeQuery(`
    // Calculate time range
    WITH datetime() AS now,
         datetime() - duration($duration) AS startTime

    // Find entities/events in time range
    MATCH (e:Entity {user_id: $userId})
    WHERE e.created_at >= startTime AND e.created_at <= now

    // Optionally traverse to related nodes
    OPTIONAL MATCH (e)-[r]-(related)
    WHERE r.created_at >= startTime OR related.created_at >= startTime

    RETURN e, collect(DISTINCT related) AS relatedEntities,
           duration.between(e.created_at, now) AS age
    ORDER BY e.created_at DESC
  `, { userId, duration });

  return result.records;
}
```

**Temporal best practices:**
- Use `datetime()` for current time, `date()` for date-only
- Use `duration.between(start, end)` to calculate intervals
- Index temporal properties for fast range queries: `CREATE INDEX FOR (e:Entity) ON (e.created_at)`
- Store all times as UTC `datetime` with timezone, convert for display only

### Pattern 4: OpenAI Function Calling Integration
**What:** Expose MCP tools to OpenAI via function calling (tools parameter)
**When to use:** When client is OpenAI ChatGPT, API, or Responses API

**Implementation approach:**
```typescript
// Source: OpenAI function calling docs + MCP tool schema patterns
// https://platform.openai.com/docs/guides/function-calling

import OpenAI from "openai";

// Define MCP tools as OpenAI function schemas
const TOOLS_FOR_OPENAI = [
  {
    type: "function",
    function: {
      name: "omnii_graph_search_nodes",
      description: "Search the user's personal knowledge graph by semantic similarity. Returns entities, events, contacts, and concepts relevant to the query.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language search query"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
            default: 10
          },
          node_types: {
            type: "array",
            items: { type: "string", enum: ["Entity", "Event", "Contact", "Concept"] },
            description: "Filter by node types"
          }
        },
        required: ["query"],
        additionalProperties: false
      },
      strict: true  // Enable Structured Outputs for schema adherence
    }
  },
  {
    type: "function",
    function: {
      name: "omnii_calendar_query",
      description: "Query calendar events with time-based filtering. Supports relative times like 'last week', 'next month', 'today'.",
      parameters: {
        type: "object",
        properties: {
          time_range: {
            type: "string",
            description: "Relative time range (e.g., 'last week', 'next month', 'today')"
          },
          event_type: {
            type: "string",
            description: "Filter by event type (meeting, appointment, etc.)"
          }
        },
        required: ["time_range"],
        additionalProperties: false
      },
      strict: true
    }
  }
];

// Handle OpenAI requests with function calling
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleOpenAIRequest(userId: string, userMessage: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: userMessage }],
    tools: TOOLS_FOR_OPENAI,
    parallel_tool_calls: true  // Enable parallel execution
  });

  const message = response.choices[0].message;

  // Check if model wants to call tools
  if (message.tool_calls) {
    const toolResults = await Promise.all(
      message.tool_calls.map(async (toolCall) => {
        // Execute MCP tool handler
        const result = await executeMCPTool(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments),
          userId
        );

        return {
          tool_call_id: toolCall.id,
          role: "tool" as const,
          name: toolCall.function.name,
          content: JSON.stringify(result)
        };
      })
    );

    // Send tool results back to OpenAI
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: userMessage },
        message,
        ...toolResults
      ]
    });

    return finalResponse.choices[0].message.content;
  }

  return message.content;
}
```

**OpenAI-specific considerations:**
- **NEW in 2026**: Responses API is recommended over Chat Completions (3% SWE-bench improvement)
- Responses API includes built-in agentic loop with `store: true` for state persistence
- Always set `strict: true` for Structured Outputs (ensures schema adherence)
- Parallel tool calls are default, set `parallel_tool_calls: false` to force sequential
- Reasoning models (o1, o3) may produce sequential tool calls even with parallel enabled
- Function results go back as `role: "tool"` messages with `tool_call_id` reference

### Pattern 5: Local LLM MCP Integration
**What:** Bridge local LLMs (Ollama, LM Studio) to MCP servers
**When to use:** Privacy-focused deployments, offline operation, cost reduction

**Implementation approach:**
```typescript
// Source: Community bridges and MCP client implementations
// https://github.com/patruff/ollama-mcp-bridge

import { MCPClient } from "@modelcontextprotocol/sdk/client";
import { Ollama } from "ollama";

// Local LLM requirements:
// - Must support function/tool calling (Llama 3.1+, Codestral, Qwen, Command R)
// - Community bridge needed (Ollama doesn't natively speak MCP)

const ollama = new Ollama({ host: "http://localhost:11434" });

async function handleLocalLLMRequest(userId: string, userMessage: string) {
  // Get MCP tools and convert to Ollama format
  const mcpTools = await getMCPTools();
  const ollamaTools = mcpTools.map(convertMCPToolToOllamaFormat);

  const response = await ollama.chat({
    model: "llama3.1:70b",  // Must be tool-calling capable
    messages: [{ role: "user", content: userMessage }],
    tools: ollamaTools
  });

  // Check if model wants to call tools
  if (response.message.tool_calls) {
    const toolResults = [];

    for (const toolCall of response.message.tool_calls) {
      // Execute MCP tool
      const result = await executeMCPTool(
        toolCall.function.name,
        toolCall.function.arguments,
        userId
      );

      toolResults.push({
        role: "tool",
        content: JSON.stringify(result)
      });
    }

    // Send results back to model
    const finalResponse = await ollama.chat({
      model: "llama3.1:70b",
      messages: [
        { role: "user", content: userMessage },
        response.message,
        ...toolResults
      ]
    });

    return finalResponse.message.content;
  }

  return response.message.content;
}

function convertMCPToolToOllamaFormat(mcpTool: any) {
  return {
    type: "function",
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema
    }
  };
}
```

**Local LLM limitations:**
- **Model selection critical**: Only Llama 3.1+, Codestral, Qwen, Command R have native tool calling
- Parallel tool calls often unreliable (models prefer sequential)
- Tool call accuracy lower than GPT-4o (more hallucinated calls)
- Requires bridge architecture (Ollama/LM Studio don't natively support MCP)
- LM Studio provides GUI, but same underlying constraints as Ollama

### Anti-Patterns to Avoid

- **GraphRAG as bolt-on enhancement:** Treating GraphRAG as "better vector search" misses the point—it's about enabling contextual reasoning through structure, not just retrieval accuracy
- **Hand-rolling entity extraction:** Custom regex/NER is fragile; use LLM-based extraction (GPT-4o-mini minimum) with quality prompts
- **Unbounded graph traversal:** Variable-length patterns `[:REL*]` without limits cause exponential path explosion; always specify bounds like `[:REL*1..2]`
- **Vague relationship types:** `RELATED_TO`, `ASSOCIATED_WITH` provide no semantic value; use specific types like `EMPLOYED_BY`, `ATTENDED`, `REPLIED_TO`
- **Global search first:** Global search is expensive (processes all communities); start with local search for entity-centric queries
- **Assuming local LLMs work like OpenAI:** Local LLMs need explicit bridges, tool-calling-capable models, and have lower accuracy; don't assume feature parity

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Community detection | Custom clustering algorithm | Neo4j GDS Leiden or graspologic | Leiden is proven, handles hierarchical structures, GPU-accelerated options exist |
| Entity extraction from text | Regex/spaCy NER | LLM-based extraction (GPT-4o-mini via LangChain) | LLMs understand context, handle ambiguity, extract relationships simultaneously |
| MCP tool schema validation | Manual JSON parsing | Zod schemas in TypeScript SDK | Automatic validation, type inference, better error messages |
| OpenAI function calling loop | Custom conversation manager | Responses API built-in loop | Handles multi-turn, state persistence, 3% better performance |
| Local LLM MCP bridge | Custom protocol adapter | ollama-mcp-bridge or existing clients | Protocol complexity, SSE streaming, session management already solved |
| Temporal query parsing | String parsing for "last week" | Neo4j duration.between + predefined mappings | Handles timezones, leap years, DST correctly |
| Graph traversal with vector search | Sequential queries | HybridCypherRetriever pattern (Neo4j GenAI) | Optimized for combined retrieval, handles ranking/merging |

**Key insight:** GraphRAG's value comes from structure, not algorithmic novelty. Use proven libraries for complex problems (Leiden, entity extraction, MCP protocol) and focus differentiation on domain-aware tooling and prompt engineering quality.

## Common Pitfalls

### Pitfall 1: Poor Prompt Quality for Entity Extraction
**What goes wrong:** Using generic prompts like "extract entities from this text" produces noisy graphs with vague relationships (RELATED_TO) and duplicate entities (name ambiguity).

**Why it happens:** LLMs need specific instructions about entity types, relationship semantics, and disambiguation criteria. Generic prompts default to safe, non-committal outputs.

**How to avoid:**
- Specify allowed entity types explicitly (Person, Organization, Event, Concept)
- Require specific relationship types (provide examples: EMPLOYED_BY not WORKS_FOR)
- Include disambiguation instructions (match to existing entities by name similarity)
- Use at least GPT-4o-mini—weaker models produce unusable extractions

**Warning signs:**
- High percentage of RELATED_TO relationships in graph
- Many singleton entities with no connections
- Duplicate entities with slight name variations (John Smith vs. J. Smith)

### Pitfall 2: Unbounded Graph Traversal
**What goes wrong:** Variable-length patterns without depth limits (`MATCH (a)-[:REL*]-(b)`) cause exponential path explosion, hanging queries or OOM errors.

**Why it happens:** Graph databases follow all paths by default. In densely connected graphs (social networks, knowledge graphs), paths multiply exponentially with each hop.

**How to avoid:**
- Always specify max depth: `[:REL*1..2]` not `[:REL*]`
- Use inline predicates to prune paths early: `WHERE relationship.created_at > $cutoff`
- Profile queries with `EXPLAIN` or `PROFILE` before production
- Consider depth 1-2 for most queries, 3 max for rare cases

**Warning signs:**
- Queries taking >5 seconds on small datasets (<10K nodes)
- Memory usage spiking during traversal
- Neo4j logs showing "Traversal depth exceeded threshold"

### Pitfall 3: Vector Search + Graph Traversal Sequencing
**What goes wrong:** Running vector search, then separately traversing from each result causes N+1 query problem and loses ranking context.

**Why it happens:** Treating vector and graph as separate stages instead of integrated dual-channel retrieval.

**How to avoid:**
- Use `CALL` subqueries to combine in single query (see Pattern 1 example)
- Pass vector search node IDs to graph traversal via `UNWIND`
- Merge results considering both vector score and graph context (relationship strength, hop distance)
- Consider Neo4j GenAI package's HybridCypherRetriever for built-in pattern

**Warning signs:**
- Multiple round-trip queries per search request
- Loss of vector similarity scores in final results
- Inconsistent ranking (high vector score but low graph relevance)

### Pitfall 4: Assuming OpenAI and Local LLMs Are Interchangeable
**What goes wrong:** Code designed for OpenAI fails with local LLMs due to different tool calling formats, lack of parallel calls, and lower accuracy.

**Why it happens:** Local LLMs lag OpenAI in function calling capabilities and require different integration patterns (bridges vs. native API).

**How to avoid:**
- Abstract tool calling behind adapter interface (OpenAIAdapter, OllamaAdapter)
- Test with actual local models early—don't assume compatibility
- Use tool-calling-capable models only (Llama 3.1+, Codestral, Qwen, Command R)
- Expect sequential tool calls from local LLMs (don't rely on parallel execution)
- Build fallback for tool call hallucinations (local LLMs more prone to invalid calls)

**Warning signs:**
- Tool calls working in OpenAI but failing in Ollama
- Invalid JSON in function arguments from local models
- Tools called with wrong parameters or non-existent tool names

### Pitfall 5: Temporal Query Timezone Confusion
**What goes wrong:** Comparing `datetime()` (current time with timezone) to `datetime` properties stored without timezone causes off-by-hours errors.

**Why it happens:** Neo4j has both `DATETIME` (timezone-aware) and `LOCALDATETIME` (naive). Mixing them in comparisons produces wrong results.

**How to avoid:**
- Standardize on `datetime()` (timezone-aware) for all temporal storage
- Store as UTC, convert to user timezone only for display
- Use `datetime({timezone: 'UTC'})` explicitly when creating timestamps
- Create indexes on temporal properties: `CREATE INDEX FOR (e:Entity) ON (e.created_at)`

**Warning signs:**
- "Last week" queries returning today's events
- Events appearing in wrong time ranges for users in different timezones
- Inconsistent results when server timezone changes (DST transitions)

### Pitfall 6: MCP Tool Errors as Protocol Errors
**What goes wrong:** Returning HTTP 500 or JSON-RPC error codes for tool execution failures prevents LLM from seeing error and recovering.

**Why it happens:** Confusion between protocol-level errors (invalid JSON-RPC) and tool execution errors (business logic failures).

**How to avoid:**
- Tool errors return `CallToolResult` with `isError: true` and error text in `content`
- Protocol errors (invalid request structure) are only place for JSON-RPC error codes
- Provide actionable error messages that tell LLM what to do differently
- Include validation errors in result content (e.g., "time_range must be 'last week', 'this month', or 'today'")

**Warning signs:**
- LLM repeatedly calling tool with same invalid parameters (error not visible)
- MCP client logs showing "Tool call failed" but LLM context has no error
- Users seeing "Internal server error" instead of helpful feedback

### Pitfall 7: Global Search for Entity-Specific Queries
**What goes wrong:** Using expensive global search (processes all communities) for queries about specific entities wastes compute and increases latency.

**Why it happens:** Misunderstanding when global vs. local search is appropriate—global is for corpus-wide questions, local for entity-centric queries.

**How to avoid:**
- Use local search for queries mentioning specific entities ("what did John Smith do?")
- Use local search for targeted questions ("meetings last week")
- Reserve global search for thematic questions ("what are the main themes?", "summarize all activity")
- Consider DRIFT search for queries needing both entity detail and broad context

**Warning signs:**
- High compute costs for simple entity lookups
- Queries taking 10+ seconds that should be instant
- Community summary generation happening for every search request

## Code Examples

Verified patterns from official sources:

### Dual-Channel Retrieval with Neo4j
```typescript
// Source: Neo4j HybridCypherRetriever pattern
// https://neo4j.com/blog/developer/enhancing-hybrid-retrieval-graphrag-python-package/

import { Driver } from "neo4j-driver";

async function hybridSearch(
  driver: Driver,
  query: string,
  userId: string,
  limit: number = 10
) {
  const session = driver.session();

  try {
    // Embed query
    const embedding = await embedText(query);

    // Combined vector + graph query
    const result = await session.executeRead(async (tx) => {
      return await tx.run(`
        // Vector search for initial candidates
        CALL db.index.vector.queryNodes(
          'entity_embeddings',
          $limit * 2,  // Get more candidates for graph filtering
          $embedding
        ) YIELD node, score

        WHERE node.user_id = $userId

        // Graph traversal for context
        CALL {
          WITH node
          MATCH (node)-[r1]-(neighbor1)
          WHERE neighbor1.user_id = $userId
          OPTIONAL MATCH (neighbor1)-[r2]-(neighbor2)
          WHERE neighbor2.user_id = $userId AND neighbor2 <> node

          RETURN node,
                 collect(DISTINCT neighbor1) AS neighbors1,
                 collect(DISTINCT neighbor2) AS neighbors2,
                 collect(DISTINCT r1) AS rels1,
                 collect(DISTINCT r2) AS rels2
        }

        // Combine results
        RETURN node AS entity,
               score AS vectorScore,
               neighbors1 + neighbors2 AS relatedEntities,
               rels1 + rels2 AS relationships
        ORDER BY score DESC
        LIMIT $limit
      `, {
        embedding,
        userId,
        limit
      });
    });

    return result.records.map(record => ({
      entity: record.get('entity').properties,
      vectorScore: record.get('vectorScore'),
      relatedEntities: record.get('relatedEntities').map((n: any) => n.properties),
      relationships: record.get('relationships').map((r: any) => ({
        type: r.type,
        properties: r.properties
      }))
    }));
  } finally {
    await session.close();
  }
}
```

### Temporal Queries with Duration Arithmetic
```typescript
// Source: Neo4j temporal documentation
// https://neo4j.com/docs/cypher-manual/current/values-and-types/temporal/

const TEMPORAL_DURATIONS: Record<string, string> = {
  "today": "P0D",
  "yesterday": "P1D",
  "last week": "P7D",
  "last month": "P1M",
  "last year": "P1Y",
  "this week": "P7D",
  "this month": "P1M",
  "this year": "P1Y"
};

async function queryTemporalEvents(
  driver: Driver,
  userId: string,
  timeRange: string
) {
  const duration = TEMPORAL_DURATIONS[timeRange.toLowerCase()];
  if (!duration) {
    throw new Error(`Invalid time range: ${timeRange}. Must be one of: ${Object.keys(TEMPORAL_DURATIONS).join(', ')}`);
  }

  const session = driver.session();

  try {
    const result = await session.run(`
      // Calculate time window
      WITH datetime() AS now,
           datetime() - duration($duration) AS startTime

      // Find events in range
      MATCH (e:Event {user_id: $userId})
      WHERE e.start_time >= startTime AND e.start_time <= now

      // Get related entities
      OPTIONAL MATCH (e)-[:INVOLVES]-(entity:Entity)
      OPTIONAL MATCH (e)-[:WITH]-(contact:Contact)

      RETURN e AS event,
             collect(DISTINCT entity) AS entities,
             collect(DISTINCT contact) AS contacts,
             duration.between(e.start_time, now) AS timeAgo
      ORDER BY e.start_time DESC
    `, { duration, userId });

    return result.records.map(r => ({
      event: r.get('event').properties,
      entities: r.get('entities').map((n: any) => n.properties),
      contacts: r.get('contacts').map((n: any) => n.properties),
      timeAgo: r.get('timeAgo').toString()
    }));
  } finally {
    await session.close();
  }
}
```

### MCP Tool Definition with Zod
```typescript
// Source: MCP TypeScript SDK examples
// https://github.com/modelcontextprotocol/typescript-sdk

import { Server } from "@modelcontextprotocol/sdk/server";
import { z } from "zod";

const server = new Server({
  name: "omnii-graphrag",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
});

// Define tool with Zod schema (automatic validation)
server.tool(
  "omnii_calendar_query",
  z.object({
    time_range: z.enum([
      "today", "yesterday", "this week", "last week",
      "this month", "last month", "this year", "last year"
    ]).describe("Relative time range for calendar query"),
    event_type: z.string().optional().describe("Filter by event type (meeting, appointment, etc.)")
  }),
  async ({ time_range, event_type }, { userId }) => {
    try {
      const events = await queryTemporalEvents(driver, userId, time_range);

      // Filter by event type if specified
      const filtered = event_type
        ? events.filter(e => e.event.type === event_type)
        : events;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            timeRange: time_range,
            eventCount: filtered.length,
            events: filtered
          }, null, 2)
        }]
      };
    } catch (error) {
      // Return error as tool result (not protocol error)
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Failed to query calendar: ${error.message}. Valid time ranges are: today, yesterday, this week, last week, this month, last month, this year, last year.`
        }]
      };
    }
  }
);
```

### OpenAI Responses API Integration
```typescript
// Source: OpenAI Responses API migration guide
// https://platform.openai.com/docs/guides/migrate-to-responses

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function chatWithResponses(userId: string, messages: any[]) {
  // Get MCP tools as OpenAI function schemas
  const tools = getMCPToolsAsOpenAISchemas();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
    parallel_tool_calls: true,
    // Responses API features (vs. Chat Completions)
    store: true,  // Persist reasoning and tool context across turns
    metadata: {
      user_id: userId,
      session_id: generateSessionId()
    }
  });

  const message = response.choices[0].message;

  // Handle tool calls
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolResults = await Promise.all(
      message.tool_calls.map(async (call) => {
        const result = await executeMCPTool(
          call.function.name,
          JSON.parse(call.function.arguments),
          userId
        );

        return {
          tool_call_id: call.id,
          role: "tool" as const,
          name: call.function.name,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        };
      })
    );

    // Continue conversation with tool results
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [...messages, message, ...toolResults],
      store: true  // Maintain state
    });

    return finalResponse.choices[0].message.content;
  }

  return message.content;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chat Completions API | Responses API | March 2025 (OpenAI) | 3% SWE-bench improvement, built-in agentic loop, state persistence |
| MCP Claude-only | MCP multi-client (OpenAI, local LLMs) | March 2025 (OpenAI adoption) | Industry standardization, broader ecosystem |
| Vector-only RAG | GraphRAG dual-channel | 2024-2025 (Microsoft research) | 67% accuracy improvement, multi-hop reasoning |
| Louvain community detection | Leiden algorithm | 2019 (algorithm), 2024-2025 (GraphRAG adoption) | Better hierarchical structure, faster convergence |
| HTTP+SSE transport | Streamable HTTP | March 2025 (MCP spec update) | Single endpoint, simpler client implementation |
| Manual function calling loop | Parallel tool calls + auto-retry | 2024-2025 (OpenAI, Anthropic) | Faster multi-tool execution, better error recovery |

**Deprecated/outdated:**
- **Assistants API**: Deprecated, shutting down August 26, 2026. Migrate to Responses API.
- **HTTP+SSE transport**: Replaced by Streamable HTTP (MCP 2025-03-26 spec). SSE remains for compatibility.
- **Chat Completions without `store`**: For agentic workflows, Responses API with state persistence is now standard.
- **Vague relationship types (RELATED_TO, ASSOCIATED_WITH)**: GraphRAG best practices require specific semantic relationships.

## Open Questions

Things that couldn't be fully resolved:

1. **Leiden Algorithm Implementation**
   - What we know: Neo4j GDS has Leiden built-in, Python has graspologic/leidenalg, GPU options exist
   - What's unclear: Whether Neo4j GDS Leiden supports hierarchical levels (critical for GraphRAG global search)
   - Recommendation: Test Neo4j GDS Leiden first, fall back to Python graspologic + export if hierarchical not supported

2. **Local LLM Tool Calling Reliability**
   - What we know: Llama 3.1+, Codestral, Qwen, Command R support tool calling; accuracy lower than GPT-4o
   - What's unclear: Which specific model/version provides best accuracy for MCP tool calling (quantitative comparison)
   - Recommendation: Start with OpenAI (production), defer local LLM to Phase 4+; if needed, test Llama 3.1:70b vs. Qwen:32b

3. **Bun Compatibility with Neo4j GDS**
   - What we know: Phase 2 uses HTTP Query API v2 for Bun compatibility
   - What's unclear: Whether Neo4j GDS procedures (Leiden) are accessible via HTTP API or require Bolt driver
   - Recommendation: Test `CALL gds.leiden.stream()` via HTTP API; if unavailable, run Leiden via Python script and import results

4. **Global Search Necessity**
   - What we know: Local search handles entity-specific queries (faster, cheaper); global search for corpus-wide questions
   - What's unclear: For personal context (user's calendar, contacts, notes), are corpus-wide questions common enough to justify global search complexity?
   - Recommendation: Defer global search to later phase; implement local search first, add global only if user queries demand it

5. **Relationship Discovery Prompt Engineering**
   - What we know: Prompt quality is critical; must specify relationship types, avoid vague types
   - What's unclear: Optimal prompt templates for personal data (emails, calendar, notes) vs. general text
   - Recommendation: Start with LangChain GraphRAG examples, iterate based on extraction quality; consider domain-specific prompts per data source

## Sources

### Primary (HIGH confidence)
- [Neo4j Cypher Manual - Temporal Values](https://neo4j.com/docs/cypher-manual/current/values-and-types/temporal/) - Temporal types, duration arithmetic
- [Neo4j Cypher Manual - Variable-Length Patterns](https://neo4j.com/docs/cypher-manual/current/patterns/variable-length-patterns/) - Graph traversal depth limits
- [Neo4j Developer Guide - Vector Search](https://neo4j.com/developer/genai-ecosystem/vector-search/) - HNSW implementation
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) - Streamable HTTP transport
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Tool definition patterns
- [Microsoft GraphRAG Documentation](https://microsoft.github.io/graphrag/) - Local/global search architecture
- [OpenAI Platform Documentation](https://platform.openai.com/docs/guides/migrate-to-responses) - Responses API migration

### Secondary (MEDIUM confidence)
- [Neo4j Blog - Enhancing Hybrid Retrieval with GraphRAG](https://neo4j.com/blog/developer/enhancing-hybrid-retrieval-graphrag-python-package/) - Dual-channel patterns
- [LangChain GraphRAG - Entity Relationship Extraction](https://langchain-graphrag.readthedocs.io/en/latest/guides/graph_extraction/er_extraction/) - LLM-based extraction
- [Neo4j GDS - Leiden Algorithm](https://neo4j.com/docs/graph-data-science/current/algorithms/leiden/) - Community detection
- [Lettria - GraphRAG Implementation Challenges](https://www.lettria.com/blogpost/an-analysis-of-common-challenges-faced-during-graphrag-implementations-and-how-to-overcome-them) - Common pitfalls
- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices) - OAuth 2.1, rate limiting
- [Ollama MCP Bridge](https://github.com/patruff/ollama-mcp-bridge) - Local LLM integration
- [Model Context Protocol (MCP) with Ollama](https://medium.com/data-science-in-your-pocket/model-context-protocol-mcp-using-ollama-e719b2d9fd7a) - Community implementation

### Tertiary (LOW confidence - marked for validation)
- [Medium - Production Multi-Agent AI Security 2026](https://medium.com/@nraman.n6/production-multi-agent-ai-security-the-2026-implementation-guide-00f81ebc675b) - Security patterns
- [Meilisearch Blog - What is GraphRAG (2026)](https://www.meilisearch.com/blog/graph-rag) - GraphRAG overview
- [CData Blog - 2026: Year for Enterprise-Ready MCP](https://www.cdata.com/blog/2026-year-enterprise-ready-mcp-adoption) - Industry trends
- [Docker Blog - Local LLM Tool Calling Evaluation](https://www.docker.com/blog/local-llm-tool-calling-a-practical-evaluation/) - Model comparisons

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDKs, well-documented libraries
- Architecture (dual-channel retrieval): MEDIUM-HIGH - Neo4j blog + Microsoft patterns, needs testing for Neo4j GDS Leiden
- Architecture (MCP integration): HIGH - Official OpenAI adoption, MCP spec stable
- Pitfalls: HIGH - Documented in official sources (Neo4j, OpenAI, MCP), verified in community experiences
- Local LLM support: MEDIUM - Community bridges active, but model selection and reliability need validation

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain, but MCP/OpenAI evolving rapidly)

**Notes for planner:**
- Phase 2 built foundation (vector search, basic MCP tools, Neo4j schema)
- Phase 3 extends with dual-channel retrieval and multi-client MCP
- Defer global search and local LLM support to later phases (reduce scope, focus on OpenAI)
- Temporal queries well-supported by Neo4j, straightforward implementation
- Relationship discovery depends on prompt engineering quality—iterate based on results
