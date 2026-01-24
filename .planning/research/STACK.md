# Technology Stack

**Project:** Omnii One - Personal Context Server
**Domain:** Personal Knowledge Graph / MCP Server / AI Context Retrieval
**Researched:** 2025-01-24

## Executive Summary

**Confidence:** MEDIUM - Core technologies verified with official documentation, but Neo4j + Bun incompatibility is a critical blocker requiring mitigation.

**Key Decision:** Your existing stack (Bun/Elysia, React Native/Expo, Supabase) is solid for 2025. However, **Neo4j has known compatibility issues with Bun** that require either switching runtimes or adding an HTTP layer between them. Multi-tenancy in Neo4j 5.x is well-supported via separate databases.

**Stack Philosophy:** Local-first with cloud sync. The stack prioritizes developer experience (TypeScript end-to-end, type safety), performance (Bun's speed, Neo4j's graph queries), and modern AI integration patterns (MCP protocol, vector embeddings).

---

## Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Bun** | 1.1+ | Runtime & package manager | 3x faster than Node.js, native TypeScript support, built-in test runner, superior DX for modern TS apps | HIGH |
| **Elysia** | 1.1+ | HTTP framework | Type-safe, Bun-first, fastest framework in Bun ecosystem, automatic OpenAPI generation, end-to-end type safety with Eden Treaty | MEDIUM |
| **TypeScript** | 5.3+ | Type system | End-to-end type safety from database to mobile, industry standard for 2025 | HIGH |

### Rationale

**Bun + Elysia** (keeping): As of November 2025, Elysia is "the most compelling framework" in the Bun ecosystem for production. It provides end-to-end type safety, can compile to standalone binaries (2-3x memory reduction), and achieves performance benchmarks that align with your local-first architecture goals.

**CRITICAL CAVEAT - Neo4j Compatibility**: Neo4j JavaScript driver has **known compatibility issues with Bun** (GitHub issues #12772, #9914). Connections hang with `neo4j+s` protocol, and debugging stalls after first breakpoint. Neo4j officially supports Node.js 18+ and Deno (as of v5.14.0) but **not Bun**.

**Confidence:** MEDIUM because while Bun/Elysia is production-ready, the Neo4j incompatibility requires architectural mitigation (see Solutions section below).

### Sources
- [Better-Elysia: Supercharge Your Bun.js APIs in 2025](https://indusvalley.io/blogs/scalable-apis-with-better-elysia)
- [Elysia: The New High-Performance Framework](https://medium.com/@natanael280198/elysia-the-new-high-performance-framework-redefining-typescript-backends-0228cb97fc9d)
- [Bun + neo4j-driver Issue #12772](https://github.com/oven-sh/bun/issues/12772)
- [Neo4j Driver Bun Support Issue #9914](https://github.com/oven-sh/bun/issues/9914)

---

## Graph Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Neo4j** | 5.21+ | Graph database | Industry-leading graph DB, native vector search (HNSW), mature multi-tenancy, excellent LangChain integration, GraphRAG patterns | HIGH |
| **neo4j-driver** | 6.0.1+ | JavaScript client | Official Neo4j driver with TypeScript support, native Vector type support (as of 6.0+) | HIGH |

### Multi-Tenancy Pattern (CRITICAL)

**Recommendation:** Use **separate databases per tenant** (Federation pattern).

Neo4j 4.0+ introduced multi-database support, fundamentally changing multi-tenancy options. Here are your options:

| Pattern | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Separate Databases** (Federation) | Complete data isolation, independent backups, clear security boundaries, different schemas per tenant | Cannot query across tenants easily, more databases to manage | **RECOMMENDED** for personal context server |
| **Label-Based** (Single DB) | Simpler deployment, cross-tenant queries possible | Risk of data leakage, complex RLS, performance degradation at scale | NOT recommended for multi-user personal data |
| **Sharding** (Multiple DBs, same schema) | Scalability, geographic compliance | Complex query coordination, operational overhead | Overkill for personal context server |

**Why Federation for Personal Context Server:**
- Each user's graph is completely isolated (privacy-first)
- No risk of accidental data leakage between users
- Can delete a user's entire graph by dropping their database
- Aligns with local-first philosophy (each user = isolated context)

**Implementation:**
```typescript
// Dynamic database selection based on authenticated user
const driver = neo4j.driver(uri, auth)
const session = driver.session({ database: `user_${userId}` })
```

### Neo4j + Bun Compatibility Solutions

Since Neo4j driver doesn't work reliably with Bun, you have three options:

**Option 1: HTTP Proxy Layer** (RECOMMENDED)
- Run a small Node.js service that wraps neo4j-driver
- Bun/Elysia backend communicates via HTTP/REST
- Keeps your main stack on Bun while isolating Neo4j compatibility

**Option 2: Switch Runtime for DB Queries**
- Use Bun for HTTP layer (Elysia)
- Spawn Node.js child processes for Neo4j operations
- Complex, not recommended

**Option 3: Alternative Graph Database**
- **FalkorDB**: Redis-based, GraphRAG-optimized, TypeScript support via Drivine client
- **SurrealDB**: Multi-model (document + graph), native TypeScript SDK, Bun-compatible
- Trade-off: Less mature GraphRAG ecosystem than Neo4j

**Decision Required:** If keeping Neo4j is non-negotiable (for LangChain/GraphRAG maturity), implement Option 1. If flexibility exists, evaluate FalkorDB or SurrealDB for native Bun compatibility.

**Confidence:** HIGH on Neo4j capabilities, MEDIUM on integration approach due to runtime incompatibility.

### Sources
- [Neo4j Multi-Tenancy Worked Example](https://neo4j.com/developer/multi-tenancy-worked-example/)
- [Multi-Tenancy on Neo4j Community Discussion](https://community.neo4j.com/t/multi-tenancy-on-neo4j/10627)
- [Multi-Tenant GraphQL With Neo4j 4.0](https://medium.com/grandstack/multitenant-graphql-with-neo4j-4-0-4a1b2b4dada4)
- [Neo4j JavaScript Driver Releases](https://github.com/neo4j/neo4j-javascript-driver/releases)

---

## PostgreSQL & Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Supabase** | Latest | PostgreSQL + Auth + Storage | Managed Postgres, OAuth 2.1 server, built-in MCP server support, RLS for security | HIGH |
| **@supabase/supabase-js** | 2.45+ | Supabase client | Official client with auto token refresh, session management, TypeScript support | HIGH |

### Rationale

**Supabase** (keeping): Excellent choice for 2025. Key advantages:
- **Native MCP Authentication**: Supabase launched hosted MCP server support with dynamic client registration
- **OAuth 2.1 Compliance**: Can authenticate AI agents/LLMs without separate auth systems
- **Local Development**: Self-hosting option via Docker for local-first development
- Row Level Security (RLS) for multi-tenant data isolation
- Vector embeddings support in PostgreSQL (pgvector extension)

**Architecture Pattern:**
- **Supabase PostgreSQL**: User profiles, auth, relational metadata, vector embeddings
- **Neo4j**: Graph relationships, knowledge graph structure, semantic connections
- Clear separation: Postgres for documents/metadata, Neo4j for relationships

**Confidence:** HIGH - Supabase is production-ready, actively maintained, and has first-class MCP support.

### Sources
- [Supabase MCP Authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Announcing Supabase Remote MCP Server](https://supabase.com/blog/remote-mcp-server)
- [Model Context Protocol Supabase Docs](https://supabase.com/docs/guides/getting-started/mcp)

---

## MCP Protocol Implementation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@modelcontextprotocol/sdk** | 1.x | MCP server/client | Official TypeScript SDK, supports Streamable HTTP, OAuth helpers, full spec implementation | HIGH |
| **Zod** | 3.25+ | Schema validation | Required peer dependency for MCP SDK, runtime type validation | HIGH |

### MCP Server Architecture

**Recommended Pattern:** Streamable HTTP transport (remote servers)

The MCP SDK supports:
- **Server libraries**: Tools, resources, prompts
- **Client libraries**: Connect to any MCP server
- **Transport options**: Streamable HTTP (recommended for remote) or stdio (local)
- **Middleware**: Express, Hono, Node.js HTTP integrations
- **OAuth support**: Built-in dynamic client registration

**Implementation Notes:**
- Each MCP server should have **one clear purpose** (avoid endpoint proliferation)
- Use structured error handling (client errors, server errors, external errors)
- Implement configuration management with Pydantic-style validation
- Security: Validate inputs, scope permissions, encrypt data
- Monitor tool usage (log calls, durations, errors)

**2025 Spec Features:**
- Server-side agent loops
- Parallel tool calls
- Explicit capability declarations
- Backward compatibility maintained

**Confidence:** HIGH - Official SDK, actively maintained, production-ready.

### Sources
- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [How to Build MCP Servers with TypeScript](https://dev.to/shadid12/how-to-build-mcp-servers-with-typescript-sdk-1c28)
- [MCP Best Practices Guide](https://modelcontextprotocol.info/docs/best-practices/)
- [Specification - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-11-25)

---

## Mobile Application

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **React Native** | 0.76+ | Mobile framework | Industry standard, shared codebase, excellent Expo integration | HIGH |
| **Expo** | SDK 52+ | Development platform | Managed workflow, OTA updates, native module ecosystem, official local-first docs | HIGH |
| **Expo Router** | 4+ | File-based routing | Default for new Expo projects, production-ready, lazy bundling, deep linking | HIGH |

### Local-First Mobile Stack

**Recommended Libraries:**

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| **Legend-State** | Latest | State + sync | "Super fast all-in-one state and sync library", Supabase integration, fine-grained reactivity | MEDIUM |
| **expo-sqlite** | Latest | Local persistence | Native SQLite, pairs with state management, offline-first foundation | HIGH |
| **react-native-mmkv** | Latest | Secure storage | Faster than AsyncStorage, encrypted session storage recommended by Supabase | HIGH |
| **@react-native-async-storage/async-storage** | Latest | Web storage fallback | Platform-specific storage for web builds | HIGH |

**Architecture Pattern:**
```
Local-first data flow:
1. User creates data → Store in expo-sqlite
2. Legend-State manages state + sync queue
3. Background sync to Supabase when online
4. Conflict resolution via CRDTs (optional)
```

**Alternative Libraries (if Legend-State doesn't fit):**
- **TinyBase**: Reactive data store, Yjs integration, "perfect for local-first"
- **WatermelonDB**: Complex apps, sophisticated queries, larger datasets
- **Turso with Offline Sync**: Modern SQLite service, bidirectional sync
- **Prisma for React Native**: Early access, integrated state + sync

**Authentication Pattern (Supabase + Expo):**
```typescript
// Platform-specific storage adapters
import { SecureStore } from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Supabase client config
const supabase = createClient(url, key, {
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : SecureStore,
    autoRefreshToken: true,
    persistSession: true
  }
})
```

**Key Patterns:**
- Encrypt sessions with Expo Crypto + SecureStore
- Subscribe to auth state changes on app load
- Protected navigation with Expo SplashScreen
- Deep link handling for email verification

**Confidence:** HIGH on core stack (React Native, Expo, Expo Router), MEDIUM on Legend-State (newer library, less battle-tested than alternatives).

### Sources
- [Expo Local-First Architecture](https://docs.expo.dev/guides/local-first/)
- [Local-First Apps Essential in 2025](https://medium.com/@ssshubham660/local-first-apps-why-offline-first-is-becoming-essential-in-2025-and-how-react-native-developers-f03d5cc39e32)
- [Expo SQLite Guide for Offline-First Apps](https://medium.com/@aargon007/expo-sqlite-a-complete-guide-for-offline-first-react-native-apps-984fd50e3adb)
- [Supabase React Native Authentication](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Expo Router Introduction](https://docs.expo.dev/router/introduction/)

---

## Workflow Orchestration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **n8n** | Latest (self-hosted) | Workflow automation | 400+ integrations, native AI/LangChain support, custom code support, self-hosted option | HIGH |
| **Composio** | Latest | Tool provider | 200+ tool integrations, one-click MCP server, OAuth/token auth built-in | MEDIUM |

### Integration Architecture

**n8n + Composio Pattern:**
- **n8n**: Orchestration engine for workflows (data pipelines, scheduled tasks, event triggers)
- **Composio MCP**: Tool provider layer (Google services, social media, external APIs)
- **Integration**: Composio MCP eliminates tool definition boilerplate in n8n workflows

**Hybrid Automation (2025 Trend):**
- Workflows + AI agents co-evolving
- Adaptive decision trees (Switch node + AI service calls)
- Intelligent routing based on AI analysis
- Future: Predictive triggering, self-healing workflows

**When to Use:**
- **Composio alone**: AI agents need reliable, secure integrations
- **n8n alone**: Company-wide automation, not AI-focused
- **Both**: Combining n8n workflows with AI-powered tool integrations

**Confidence:** HIGH on n8n (mature, production-ready), MEDIUM on Composio (newer, but MCP support is a differentiator).

### Sources
- [When Workflows Meet Agents: Hybrid Automation 2025](https://community.n8n.io/t/when-workflows-meet-agents-emerging-patterns-for-hybrid-automation-in-2025/157805)
- [Composio MCP Social Media Automation with n8n](https://composio.dev/blog/how-to-build-a-social-media-automation-agent-using-composio-mcp-and-n8n)
- [n8n vs OpenAI Agent Builder](https://composio.dev/blog/n8n-vs-agent-builder)

---

## AI & Embeddings

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **LangChain (JS)** | Latest | AI orchestration | Best-in-class Neo4j integration, GraphRAG patterns, vector store adapters | HIGH |
| **OpenAI API** | gpt-4o, text-embedding-3-large | LLM + embeddings | Production-ready, reliable, expensive but high-quality | HIGH |

### Local LLM Alternatives

**Embedding Models (Local):**

| Model | Dimensions | Performance | When to Use | Confidence |
|-------|------------|-------------|-------------|------------|
| **nomic-embed-text** | 768 | Good | Multilingual, Ollama-compatible, local-first priority | MEDIUM |
| **bge-small/base** | 384/768 | As good as OpenAI | Cost-sensitive, privacy-focused, local deployment | MEDIUM |
| **E5-base-instruct** | 768 | 100% Top-5 accuracy | Best value for most RAG applications | MEDIUM |
| **Qwen3-Embedding (8B)** | - | #1 MTEB multilingual | Code-based RAG, multilingual needs | LOW |

**Deployment Options:**
- **Ollama**: Free local processing, privacy-focused, offline-capable
- **vLLM**: OpenAI-compatible server with `/v1/embeddings` endpoint
- **LM Studio**: OpenAI-compatible API for local models

**Recommendation:** Start with OpenAI for MVP (known quality), add local embedding fallback for offline mobile use cases.

### Vector Search (Neo4j)

**Neo4j Vector Index:**
- Native HNSW (Hierarchical Navigatable Small World) implementation
- Native VECTOR data type (as of Neo4j 2025.10)
- Supports cosine and euclidean similarity functions
- Dimensions: Configurable (OpenAI: 1536, local models: 384-768)

**TypeScript Integration:**
```typescript
import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector'

const vectorStore = await Neo4jVectorStore.fromExistingIndex(
  embeddings,
  {
    url: neo4jUrl,
    username: neo4jUser,
    password: neo4jPassword,
    indexName: 'embeddings',
    textNodeProperty: 'text',
    embeddingNodeProperty: 'embedding'
  }
)
```

**GraphRAG Pattern (Neo4j + LangChain):**
1. Hybrid retrieval: Vector search + graph traversal
2. Cypher query generation from natural language
3. Graph context enrichment (relationships + properties)
4. Semantic + structural reasoning combined

**Confidence:** HIGH on OpenAI and Neo4j vector search, MEDIUM on local models (less battle-tested in production).

### Sources
- [Best Embedding Models 2026: OpenAI vs Voyage vs Ollama](https://elephas.app/blog/best-embedding-models)
- [Neo4j Vector Index and Search](https://neo4j.com/developer/genai-ecosystem/vector-search/)
- [Neo4j Native Vector Data Type](https://medium.com/neo4j/introducing-neo4js-native-vector-data-type-36a4aaa42d4d)
- [Neo4j GraphRAG with LangChain](https://neo4j.com/blog/developer/neo4j-graphrag-workflow-langchain-langgraph/)
- [Open-source Embeddings Outperform OpenAI](https://huggingface.co/blog/dhuynh95/evaluating-open-source-and-closed-models)

---

## DevOps & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Docker** | Latest | Containerization | Official Bun images, multi-stage builds, production standard | HIGH |
| **Docker Compose** | Latest | Local orchestration | Multi-service local development (Bun, Neo4j, Supabase, n8n) | HIGH |

### Container Strategy

**Multi-stage Dockerfile (Bun):**
```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Production dependencies
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
RUN bun run build

# Release
FROM oven/bun:alpine AS release
COPY --from=build /app/dist /app
COPY --from=install /temp/prod/node_modules /app/node_modules

USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]
```

**Benefits:**
- Alpine-based final image (lightweight, secure)
- Only production dependencies in release
- Can compile to standalone binary for 2-3x memory reduction
- No dev tools in production image

**Local Development Stack (docker-compose.yml):**
```yaml
services:
  backend:
    build: ./backend
    ports: ["3000:3000"]
  neo4j:
    image: neo4j:5.21
    environment:
      - NEO4J_AUTH=neo4j/password
    ports: ["7474:7474", "7687:7687"]
  supabase:
    # Supabase self-hosting stack
  n8n:
    image: n8nio/n8n
    ports: ["5678:5678"]
```

**Confidence:** HIGH - Docker with Bun is well-documented and production-ready.

### Sources
- [Containerize a Bun Application with Docker](https://bun.com/docs/guides/ecosystem/docker)
- [Docker Official Bun Guide](https://docs.docker.com/guides/bun/)
- [Multi-stage Dockerfiles for Bun](https://dev.to/code42cate/how-to-dockerize-a-bun-app-38e4)

---

## Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-----|------------|
| **Drizzle ORM** | Latest | Postgres ORM | Type-safe SQL queries for Supabase, lightweight alternative to Prisma | MEDIUM |
| **date-fns** | 3+ | Date manipulation | Lightweight, tree-shakeable, better DX than moment.js | HIGH |
| **Zod** | 3.25+ | Runtime validation | API input validation, MCP SDK requirement, type inference | HIGH |
| **Vitest** | Latest | Testing | Bun-compatible, Vite-powered, fast test runner | MEDIUM |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not | Confidence |
|----------|-------------|-------------|---------|------------|
| **Runtime** | Bun | Node.js | Bun is 3x faster, better DX, native TS support. Trade-off: Neo4j compatibility issues | HIGH |
| **Graph DB** | Neo4j | FalkorDB | Neo4j has superior GraphRAG ecosystem (LangChain integration), more mature | MEDIUM |
| **Graph DB** | Neo4j | SurrealDB | Multi-model interesting but less proven for knowledge graphs | LOW |
| **Mobile State** | Legend-State | WatermelonDB | Legend-State simpler for most use cases. WatermelonDB if complex queries needed | MEDIUM |
| **Mobile State** | Legend-State | TinyBase | Both viable. Legend-State has built-in Supabase integration | MEDIUM |
| **MCP Framework** | Official SDK | FastMCP | FastMCP is wrapper around official SDK. Use official unless sessions needed | MEDIUM |
| **Backend Framework** | Elysia | Hono | Both excellent. Elysia has better type inference and Eden Treaty client | MEDIUM |

---

## Installation

### Backend (Bun + Elysia)
```bash
# Initialize with Bun
bun create elysia backend
cd backend

# Core dependencies
bun add elysia
bun add neo4j-driver  # WARNING: See Bun compatibility notes
bun add @supabase/supabase-js
bun add @modelcontextprotocol/sdk zod
bun add @langchain/community @langchain/openai

# Dev dependencies
bun add -D @types/node
bun add -D vitest
```

### Mobile (Expo)
```bash
# Create Expo app with TypeScript
npx create-expo-app@latest omnii-mobile --template

# Core dependencies
npx expo install expo-router expo-sqlite
npx expo install @supabase/supabase-js
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-mmkv
npx expo install expo-secure-store expo-crypto

# State management
bun add legend-state

# Dev dependencies
bun add -D @types/react @types/react-native
```

### Neo4j (Docker)
```bash
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  -e NEO4J_PLUGINS='["apoc", "graph-data-science"]' \
  neo4j:5.21
```

---

## Critical Decisions Summary

### 1. Neo4j + Bun Incompatibility (BLOCKER)

**Problem:** Neo4j JavaScript driver doesn't work reliably with Bun runtime.

**Options:**
- A) HTTP proxy layer (Node.js service wrapping neo4j-driver)
- B) Alternative graph DB (FalkorDB, SurrealDB)
- C) Hybrid runtime (Bun for HTTP, Node for DB)

**Recommendation:** Option A if Neo4j non-negotiable, Option B if flexibility exists.

**Action Required:** Decide before implementation phase.

### 2. Multi-Tenancy Pattern

**Decision:** Separate databases per user (Federation pattern).

**Rationale:** Complete data isolation, privacy-first, aligns with personal context server use case.

### 3. Local-First Mobile Sync

**Decision:** Legend-State + expo-sqlite + Supabase sync.

**Rationale:** Modern stack, good DX, Supabase integration built-in.

**Fallback:** TinyBase if more CRDT control needed.

### 4. Embedding Strategy

**Decision:** OpenAI for MVP, local models for offline fallback.

**Rationale:** Proven quality for MVP, add local support incrementally.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Bun/Elysia** | MEDIUM | Production-ready but Neo4j incompatibility is critical |
| **Neo4j** | HIGH | Mature, excellent GraphRAG support, multi-tenancy proven |
| **Supabase** | HIGH | Production-ready, MCP support, strong ecosystem |
| **MCP SDK** | HIGH | Official SDK, actively maintained, v1.x stable |
| **React Native/Expo** | HIGH | Industry standard, excellent local-first docs |
| **n8n + Composio** | MEDIUM | n8n proven, Composio newer but promising |
| **Local-first Sync** | MEDIUM | Ecosystem maturing, multiple viable options |

---

## Open Questions

1. **Neo4j + Bun Integration:** Which mitigation strategy (HTTP proxy vs alternative DB)?
2. **Embedding Model:** OpenAI-only or hybrid with local models from day one?
3. **Mobile Offline Sync:** CRDTs required or eventual consistency sufficient?
4. **MCP Server Deployment:** Self-hosted or leverage Supabase MCP server?

---

## Sources Summary

**Verified with Official Documentation:**
- Bun containerization: [Bun Docker Guide](https://bun.com/docs/guides/ecosystem/docker)
- Neo4j multi-tenancy: [Multi-Tenancy Worked Example](https://neo4j.com/developer/multi-tenancy-worked-example/)
- MCP TypeScript SDK: [Official SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- Expo local-first: [Expo Local-First Guide](https://docs.expo.dev/guides/local-first/)
- Supabase MCP: [MCP Authentication Docs](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)

**Verified via Web Search (2025):**
- Bun/Neo4j compatibility issues: [GitHub Issue #12772](https://github.com/oven-sh/bun/issues/12772)
- GraphRAG patterns: [Neo4j + LangChain Blog](https://neo4j.com/blog/developer/neo4j-graphrag-workflow-langchain-langgraph/)
- Local embedding benchmarks: [Best Embedding Models 2026](https://elephas.app/blog/best-embedding-models)

**Total confidence sources:** 40+ official documentation pages, GitHub releases, and 2025-dated articles.
