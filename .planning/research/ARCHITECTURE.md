# Architecture Patterns: Personal Context Server / MCP System

**Domain:** Personal Knowledge Graph / MCP Server
**Researched:** 2026-01-24
**Confidence:** MEDIUM-HIGH

## Executive Summary

Personal context servers integrating with the Model Context Protocol (MCP) follow a multi-layered architecture with clear separation between data ingestion, graph storage, AI interaction, and client applications. The architecture combines:

1. **MCP server layer** providing tools, resources, and prompts to AI applications
2. **Knowledge graph layer** (Neo4j) storing entities, relationships, and concepts with multi-tenancy
3. **Orchestration layer** (n8n) coordinating workflows and data pipelines
4. **Backend API layer** (Bun/Elysia) handling real-time communication and business logic
5. **Mobile client layer** (React Native/Expo) with local-first architecture and offline sync
6. **Authentication/data layer** (Supabase) managing users and relational data

This architecture enables offline-first mobile experiences, real-time updates, AI-powered entity recognition, and seamless integration with external services through standardized protocols.

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Applications Layer                         │
│                    (Claude Desktop, Claude Code)                     │
└────────────────┬────────────────────────────────────────────────────┘
                 │ MCP Protocol (JSON-RPC 2.0)
                 │ Transport: STDIO (local) or HTTP+SSE (remote)
                 │
┌────────────────▼────────────────────────────────────────────────────┐
│                         MCP Server Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Tools      │  │  Resources   │  │   Prompts    │              │
│  │ (Actions)    │  │ (Context)    │  │ (Templates)  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  Capabilities:                                                       │
│  - Entity recognition and linking                                   │
│  - Graph traversal and querying                                     │
│  - Context retrieval for LLM                                        │
│  - Action execution with intervention mgmt                          │
└────────────┬────────────────────────────────────────────────────────┘
             │
             │ Internal API (tRPC over WebSocket)
             │
┌────────────▼────────────────────────────────────────────────────────┐
│                    Backend API Layer (Bun/Elysia)                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Real-Time Communication (WebSocket + tRPC Subscriptions)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Business Logic Layer                                         │  │
│  │ - Entity Recognition Service (NLP Pipeline)                  │  │
│  │ - Action Planning Service (Step Executors)                   │  │
│  │ - Intervention Management Service                            │  │
│  │ - Sync Service (Conflict Resolution, Delta Sync)             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────┬──────────────────────────────────┬─────────────────┬──────────┘
      │                                  │                 │
      │                                  │                 │
┌─────▼────────┐           ┌─────────────▼─────┐    ┌────▼──────────┐
│   Neo4j      │           │    Supabase       │    │     n8n       │
│ Graph Layer  │           │  - PostgreSQL     │    │ Orchestration │
│              │           │  - Auth (RLS)     │    │   Workflows   │
│ Multi-tenant │           │  - Multi-tenancy  │    │               │
│ Per-user DB  │           │  - User metadata  │    │ Data Pipeline │
└──────────────┘           └───────────────────┘    └───────────────┘
      │                              │                     │
      │                              │                     │
      └──────────────────┬───────────┴─────────────────────┘
                         │
           ┌─────────────▼────────────────┐
           │   External Integrations      │
           │  - Google (via Composio)     │
           │  - Email, Calendar, Drive    │
           │  - Custom OAuth Apps         │
           └──────────────────────────────┘
                         │
                         │ REST/GraphQL APIs
                         │
┌────────────────────────▼─────────────────────────────────────────────┐
│                    Mobile Client Layer (React Native/Expo)            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Local-First Architecture                                     │   │
│  │ - Local SQLite/Realm (Graph Subset Replica)                  │   │
│  │ - Context Providers (State Management)                       │   │
│  │ - Offline Queue (Mutations, Actions)                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Sync Engine                                                  │   │
│  │ - Background sync when online                                │   │
│  │ - Conflict resolution (CRDTs/Operational Transform)          │   │
│  │ - Delta sync (only changed data)                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### 1. MCP Server Layer

**Responsibility:** Expose knowledge graph capabilities to AI applications via standardized MCP protocol

**Communicates with:**
- AI applications (Claude Desktop, Claude Code) via MCP protocol
- Backend API layer via internal APIs
- Neo4j graph database for context retrieval

**Key interfaces:**
- **Tools:** `graph/query`, `entity/create`, `relationship/add`, `action/execute`, `intervention/request`
- **Resources:** `context/personal`, `graph/schema`, `entity/{id}`, `memory/recent`
- **Prompts:** `entity_extraction`, `action_planning`, `context_summarization`

**Implementation notes:**
- Uses JSON-RPC 2.0 for all MCP communication
- Supports both STDIO (local development) and HTTP+SSE (production)
- Implements capability negotiation during initialization
- Sends `notifications/tools/list_changed` when graph structure changes
- Provides sampling/elicitation callbacks for LLM interaction and user confirmation

### 2. Backend API Layer (Bun/Elysia)

**Responsibility:** Business logic orchestration, real-time communication, service coordination

**Communicates with:**
- MCP server layer (internal API)
- Mobile clients via tRPC over WebSocket
- Neo4j for graph operations
- Supabase for auth and relational data
- n8n for workflow triggers
- External services via Composio

**Sub-components:**

#### Real-Time Communication Service
- **Technology:** tRPC WebSocket subscriptions
- **Pattern:** Lazy connection with auto-reconnect, bidirectional queries/mutations/subscriptions
- **Provides:** Live entity updates, action status changes, intervention requests
- **Implementation:** BehaviorSubject for connection state tracking, tracked() events for recovery

#### Entity Recognition Service
- **Technology:** NLP pipeline (transformer-based, likely spaCy/BERT)
- **Pattern:** BiLSTM for bidirectional context + CRF for structured prediction
- **Provides:** Named entity recognition, entity linking to graph nodes
- **Flow:** Text → Tokenization → BiLSTM → CRF → Entity labels → Graph linking

#### Action Planning Service
- **Pattern:** Multi-agent orchestration with step executors
- **Provides:** Action decomposition, execution planning, step-by-step tracking
- **Uses:** Working memory (session-specific) + persistent memory (cross-session)
- **Implementation:** Modular sub-workflows for each action type

#### Intervention Management Service
- **Pattern:** Human-in-the-loop with override mechanisms
- **Provides:** Approval workflows, exception handling, risk assessment
- **Features:** Configurable intervention thresholds, audit logging, rollback support

#### Sync Service
- **Pattern:** Delta sync with conflict resolution
- **Provides:** Mobile client synchronization, offline queue processing
- **Strategies:** Last-write-wins, client-wins, server-wins, time-based resolver
- **Implementation:** Bi-temporal data model (event time + ingestion time)

**Architecture pattern:** Clean architecture with BFF (Backend-for-Frontend) layer for mobile clients

**Deployment:** Cluster mode with SO_REUSEPORT for multi-core CPU utilization

### 3. Neo4j Graph Layer

**Responsibility:** Store and query knowledge graph with multi-tenancy isolation

**Communicates with:**
- Backend API layer via Cypher queries
- MCP server layer for context retrieval

**Multi-tenancy pattern:** Multiple databases (Neo4j 4.0+)
- **Approach:** One database per user/tenant
- **Isolation:** Complete separation, no cross-database relationships
- **Queries:** USE statement for database selection
- **Federation:** Composite databases with proxy nodes for cross-user queries (optional)
- **Access control:** Per-database privileges, separate admin/app users

**Schema:**
- **Nodes:** Concepts, Entities, Users, Actions, Interventions
- **Relationships:** HAS_CONCEPT, RELATES_TO, TRIGGERED_BY, DEPENDS_ON
- **Properties:** Timestamps, metadata, embeddings (for semantic search)

**Performance considerations:**
- Graph traversal for relationship discovery
- BM25 + semantic embeddings for hybrid retrieval
- Indexed entity properties for fast lookups

### 4. Supabase Layer

**Responsibility:** Authentication, relational data, multi-tenant access control

**Communicates with:**
- Backend API layer for auth verification
- Mobile clients for authentication flows
- PostgreSQL for relational data storage

**Multi-tenancy pattern:** Row-Level Security (RLS)
- **Approach:** Shared tables with `tenant_id` column
- **Isolation:** RLS policies filter by `app_metadata.tenant_id`
- **Authentication:** JWT tokens with tenant context in `app_metadata`
- **Limitation:** Single tenant per session (can't switch tenants without re-auth)

**Schema:**
- **Tables:** users, profiles, settings, oauth_connections
- **RLS policies:** Automatic filtering by authenticated user's tenant
- **Functions:** `get_tenant_id()` extracts tenant from JWT

**Integration with Composio:**
- OAuth tokens stored in Supabase
- Brokered credentials pattern for security
- AgentAuth handles token lifecycle

### 5. n8n Orchestration Layer

**Responsibility:** Workflow automation, data pipeline orchestration, AI agent coordination

**Communicates with:**
- Backend API via webhooks and HTTP requests
- External services (Google, email, etc.)
- Neo4j for graph updates
- Supabase for data triggers

**Orchestration patterns:**

#### Single Agent with State
- Session-specific working memory
- Memory nodes for context retention
- Sequential AI model calls with intermediate processing

#### Multi-Agent with Gatekeeper
- Centralized control agent
- Specialized agent delegation
- Routing patterns for task assignment

#### Multi-Agent Teams
- Parallel specialized agents
- Orchestrator pattern using AI Agent Tool nodes
- Sub-workflow modularity for debugging

**Best practices:**
- Modular design with sub-workflows
- Conditional logic for complex decisions
- Load balancer distribution for webhook triggers
- AI Agent nodes for autonomous tasking

**Integration with backend:**
- Webhook triggers for graph events
- HTTP requests for action execution
- Database queries for state updates

### 6. Mobile Client Layer (React Native/Expo)

**Responsibility:** Offline-first UI, local data caching, user interaction

**Communicates with:**
- Backend API via tRPC WebSocket
- Supabase for authentication
- Local storage (SQLite/Realm) for offline data

**Local-first architecture:**

#### Data Tier Structure
1. **Local storage** (SQLite/WatermelonDB/Realm) for instant offline reads
2. **Remote APIs** (tRPC) for authoritative data
3. **Real-time sync** for collaborative/time-sensitive features

#### Local Database Choice
- **Realm:** Object-oriented, direct object storage, graph-like relationships via links/backlinks
- **WatermelonDB:** SQLite-based, handles large data sets, offline-first optimized
- **SQLite:** Lightweight, serverless, full SQL syntax support

**Recommended:** Realm for graph-like data with relationships

#### Sync Engine
- **Pattern:** Local-first, sync-later
- **Flow:** UI → Local DB (immediate) → Offline queue → Background sync (batched)
- **First-time sync (FTS):** Download relevant graph subset for user
- **Delta sync:** Only modified entities/relationships
- **Conflict resolution:** Time-based resolver with manual override option

#### State Management
- **Recommendation:** Zustand or TanStack Query (not Redux)
- **Context providers:** User context, graph context, sync status, action queue
- **Caching:** TanStack Query for server state caching with auto-refetch

#### React Server Components (RSC)
- **Via:** Expo Router ecosystem
- **Benefit:** Direct database access for initial renders without REST/GraphQL
- **Pattern:** Hybrid client/server components for data fetching

## Data Flow Patterns

### 1. Entity Recognition Flow

```
User Input (text/voice/import)
  │
  ├─→ Mobile Client: Capture & queue
  │     │
  │     └─→ Local DB: Save draft entity
  │           │
  │           └─→ Offline queue: Add to sync
  │
  ├─→ [When online] Sync to Backend
  │     │
  │     └─→ Entity Recognition Service
  │           │
  │           ├─→ Tokenization
  │           ├─→ BiLSTM (bidirectional context)
  │           ├─→ CRF (structured prediction)
  │           └─→ Entity labels + confidence scores
  │
  └─→ Graph Linking
        │
        ├─→ Neo4j: Query existing entities
        ├─→ Link to existing OR create new node
        ├─→ Create relationships
        └─→ Update graph embeddings
              │
              └─→ Sync back to Mobile
                    │
                    ├─→ Update local DB
                    └─→ Notify UI (tRPC subscription)
```

### 2. Context Retrieval Flow (GraphRAG)

```
AI Application query
  │
  └─→ MCP Server: tools/call("graph/query")
        │
        ├─→ Query Processing
        │     │
        │     ├─→ Embed query (semantic search)
        │     └─→ Entity linking (map to graph nodes)
        │
        ├─→ Dual-Channel Retrieval
        │     │
        │     ├─→ Vector retrieval (text passages)
        │     │     └─→ Semantic similarity search
        │     │
        │     └─→ Graph retrieval
        │           ├─→ Relevant subgraphs
        │           ├─→ Neighbor nodes
        │           └─→ Multi-hop relationships
        │
        ├─→ Context Merger
        │     │
        │     └─→ Combine text + structured data
        │           ├─→ Documentary evidence
        │           └─→ Relational context
        │
        └─→ MCP Response: content[] array
              │
              └─→ AI Application: LLM generation with context
```

**Performance:** Sub-50ms query latency with FalkorDB-style optimization

**Advantages:** 90% hallucination reduction vs. traditional RAG, exact matching via graph query language

### 3. Action Execution Flow (with Intervention)

```
User action request (mobile/AI)
  │
  ├─→ Action Planning Service
  │     │
  │     ├─→ Decompose into steps
  │     ├─→ Check dependencies
  │     └─→ Risk assessment
  │           │
  │           └─→ [HIGH RISK] → Intervention Management
  │                 │
  │                 ├─→ Request approval (MCP elicitation/create)
  │                 ├─→ User notification (mobile push)
  │                 └─→ [APPROVED] → Continue
  │                       [REJECTED] → Abort & log
  │
  └─→ Step Executors
        │
        ├─→ Execute step 1
        │     │
        │     ├─→ n8n workflow trigger (if external action)
        │     │     └─→ Composio integration (Google/OAuth)
        │     │
        │     └─→ Update Neo4j (action state)
        │           └─→ Notify subscribers (tRPC)
        │
        ├─→ Execute step 2 (conditional)
        │     └─→ [FAILURE] → Rollback & notify
        │
        └─→ Complete & persist
              │
              ├─→ Update persistent memory
              └─→ Log audit trail
```

### 4. Mobile Sync Flow

```
Mobile app startup
  │
  └─→ Authentication (Supabase)
        │
        ├─→ Get JWT with tenant_id in app_metadata
        │
        └─→ [First-time sync]
              │
              ├─→ Request user's graph subset
              │     └─→ Backend queries Neo4j (user's database)
              │           └─→ Return entities + relationships
              │
              └─→ Populate local Realm DB
                    └─→ Ready for offline use

[User makes offline changes]
  │
  └─→ Queue mutations in local DB
        │
        └─→ [When online detected]
              │
              ├─→ Delta sync (only changed data)
              │     │
              │     ├─→ Send local changes to backend
              │     └─→ Receive remote changes since last sync
              │
              ├─→ Conflict detection
              │     │
              │     ├─→ [NO CONFLICT] → Apply changes
              │     │
              │     └─→ [CONFLICT] → Resolution strategy
              │           ├─→ Time-based (most recent wins)
              │           ├─→ Client-wins (user priority)
              │           ├─→ Server-wins (authority priority)
              │           └─→ Manual (notify user for decision)
              │
              └─→ Update local DB
                    └─→ Notify UI (re-render)
```

### 5. External Integration Flow (via Composio)

```
n8n workflow triggered
  │
  └─→ Google Calendar action needed
        │
        ├─→ Composio AgentAuth
        │     │
        │     ├─→ Check OAuth token validity
        │     │
        │     └─→ [EXPIRED] → Refresh token
        │           └─→ Update Supabase
        │
        ├─→ Brokered API call
        │     │
        │     └─→ Composio → Google Calendar API
        │           (Tokens never reach app runtime)
        │
        └─→ Response to n8n
              │
              ├─→ Update Neo4j (calendar entity)
              │
              └─→ Sync to mobile
                    └─→ Update local DB
```

## Architecture Patterns to Follow

### Pattern 1: MCP Server Capability Negotiation

**What:** Initialize MCP connection with capability exchange before any operations

**When:** Every MCP client-server connection establishment

**Example:**
```typescript
// Server declares capabilities
const serverCapabilities = {
  tools: { listChanged: true },      // Can send tool update notifications
  resources: {},                     // Supports resources primitive
  prompts: {}                        // Supports prompts primitive
};

// Client declares capabilities
const clientCapabilities = {
  elicitation: {},                   // Can handle user interaction requests
  sampling: {}                       // Can provide LLM sampling
};

// Initialization handshake
await session.initialize({
  protocolVersion: "2025-06-18",
  capabilities: clientCapabilities,
  clientInfo: { name: "omnii-one", version: "1.0.0" }
});

// Server responds with its capabilities
// Now both sides know what's available
```

**Why:** Enables dynamic feature discovery, prevents unsupported operations, allows protocol evolution

### Pattern 2: Local-First with Delta Sync

**What:** Store data locally first, sync changes in batches with delta-only updates

**When:** Mobile app needs offline functionality with eventual consistency

**Example:**
```typescript
// User creates entity offline
const entity = await localDB.entities.create({
  id: uuid(),
  name: "Project Alpha",
  type: "project",
  _syncStatus: "pending",
  _localModifiedAt: Date.now()
});

// Queue for sync
await syncQueue.add(entity.id);

// When online, sync only delta
const lastSyncTimestamp = await syncState.getLastSync();
const changedEntities = await localDB.entities
  .where("_localModifiedAt").gt(lastSyncTimestamp)
  .where("_syncStatus").equals("pending");

// Send to backend
await backend.sync.push(changedEntities);

// Receive server changes
const serverChanges = await backend.sync.pull(lastSyncTimestamp);

// Merge with conflict resolution
for (const change of serverChanges) {
  const local = await localDB.entities.get(change.id);
  if (!local) {
    await localDB.entities.put(change);
  } else if (change._serverModifiedAt > local._localModifiedAt) {
    await localDB.entities.put({ ...change, _syncStatus: "synced" });
  } else {
    // Conflict: decide strategy
    await handleConflict(local, change);
  }
}
```

**Why:** Instant UI updates, works offline, minimal bandwidth, eventual consistency

### Pattern 3: Multi-Database Neo4j Multi-Tenancy

**What:** Separate Neo4j database per user/tenant for complete data isolation

**When:** Multi-tenant knowledge graph requiring strong isolation and user-specific schemas

**Example:**
```typescript
// Create user database on signup
await neo4j.execute(`CREATE DATABASE user_${userId}`);
await neo4j.execute(`GRANT ALL ON DATABASE user_${userId} TO ${userId}_role`);

// Query user's graph
const session = driver.session({ database: `user_${userId}` });
await session.run(`
  MATCH (e:Entity)-[r:RELATES_TO]->(c:Concept)
  WHERE e.id = $entityId
  RETURN e, r, c
`, { entityId });

// Optional: Cross-user federation with composite database
await neo4j.execute(`
  CREATE COMPOSITE DATABASE shared_view
  FOR DATABASE user_alice, DATABASE user_bob
`);

// Query across users with proxy nodes
await session.run(`
  USE shared_view
  MATCH (p:Product) WHERE p.id = $productId
  RETURN p
`, { productId });
// Product nodes exist in both databases for federation
```

**Why:** Complete isolation, independent backups, per-user scaling, regulatory compliance

### Pattern 4: GraphRAG Dual-Channel Retrieval

**What:** Combine vector similarity search with graph traversal for context retrieval

**When:** Providing context to LLM from knowledge graph

**Example:**
```typescript
async function retrieveContext(query: string) {
  // Channel 1: Vector/semantic search
  const queryEmbedding = await embedModel.embed(query);
  const semanticResults = await vectorDB.search(queryEmbedding, {
    limit: 10,
    threshold: 0.7
  });

  // Channel 2: Graph traversal
  const entities = await entityLinker.link(query);
  const graphResults = await neo4j.run(`
    MATCH (e:Entity)-[r*1..3]-(related)
    WHERE e.id IN $entityIds
    RETURN e, r, related
    ORDER BY length(r) ASC
    LIMIT 20
  `, { entityIds: entities.map(e => e.id) });

  // Merge both channels
  const context = {
    documents: semanticResults.map(r => r.text),
    relationships: graphResults.records.map(r => ({
      source: r.get('e').properties,
      target: r.get('related').properties,
      type: r.get('r')[0].type
    }))
  };

  // Format for LLM
  return formatContextForLLM(context);
}
```

**Why:** Semantic similarity + relational structure, 90% hallucination reduction, explainable retrieval

### Pattern 5: tRPC WebSocket Subscriptions for Real-Time Updates

**What:** Bidirectional real-time communication over single WebSocket with type safety

**When:** Need live updates for graph changes, action status, interventions

**Example:**
```typescript
// Backend: Define subscription
const appRouter = router({
  graph: {
    onEntityChanged: publicProcedure
      .input(z.object({ userId: z.string() }))
      .subscription(async ({ input }) => {
        return observable<Entity>((emit) => {
          const listener = (entity: Entity) => {
            emit.next(entity);
          };

          graphEvents.on(`entity:${input.userId}`, listener);

          return () => {
            graphEvents.off(`entity:${input.userId}`, listener);
          };
        });
      })
  }
});

// Mobile client: Subscribe
const subscription = trpc.graph.onEntityChanged
  .subscribe({ userId: currentUser.id }, {
    onData(entity) {
      // Update local DB
      localDB.entities.put(entity);
      // UI auto-updates via observer
    },
    onError(err) {
      console.error('Subscription error:', err);
    }
  });

// Automatic reconnection on disconnect
// Queries and mutations also use same WebSocket
```

**Why:** Type-safe, automatic reconnection, bidirectional, efficient batching

### Pattern 6: n8n Multi-Agent Orchestration

**What:** Coordinate specialized agents with gatekeeper pattern for complex workflows

**When:** Need to orchestrate multiple AI agents, external services, and decision trees

**Example:**
```typescript
// n8n workflow structure
{
  "nodes": [
    {
      "type": "n8n-nodes-base.ai-agent",
      "name": "Gatekeeper Agent",
      "parameters": {
        "model": "claude-opus-4-5",
        "systemPrompt": "Route tasks to specialized agents",
        "tools": [
          "route_to_entity_agent",
          "route_to_calendar_agent",
          "route_to_email_agent"
        ]
      }
    },
    {
      "type": "n8n-nodes-base.switch",
      "name": "Route Decision",
      "parameters": {
        "rules": [
          { "condition": "route === 'entity'", "output": 0 },
          { "condition": "route === 'calendar'", "output": 1 },
          { "condition": "route === 'email'", "output": 2 }
        ]
      }
    },
    {
      "type": "n8n-nodes-base.executeWorkflow",
      "name": "Entity Agent Workflow",
      "parameters": {
        "workflowId": "entity_workflow_id"
      }
    }
    // ... more specialized agents
  ]
}

// Each sub-workflow has its own agent + tools
// Gatekeeper routes based on task analysis
// Results merge back to main workflow
```

**Why:** Modular debugging, specialized expertise, parallel execution, clear routing logic

### Pattern 7: Brokered Credentials with Composio

**What:** Never expose OAuth tokens to app runtime, use secure middle layer for API calls

**When:** Integrating with external OAuth services (Google, GitHub, etc.)

**Example:**
```typescript
// Traditional (insecure) approach
const accessToken = await getTokenFromDB(userId);
const response = await fetch('https://www.googleapis.com/calendar/v3/events', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
// Token exposed in app memory, logs, error traces

// Composio brokered approach
const composio = new Composio(apiKey);

// Connect user once via Composio UI
// Tokens stored in Composio's SOC 2 vault

// Execute action without seeing token
const response = await composio.execute({
  action: 'GOOGLE_CALENDAR_CREATE_EVENT',
  params: { summary: 'Meeting', start: '2026-01-25T10:00:00Z' },
  entityId: userId  // Composio maps to stored credentials
});
// Token never reaches your runtime
// Automatic refresh on expiry
```

**Why:** Security isolation, automatic token lifecycle, no OAuth boilerplate, audit compliance

## Anti-Patterns to Avoid

### Anti-Pattern 1: Polling for Real-Time Updates

**What goes wrong:** Mobile client polls backend every N seconds to check for updates

**Why bad:**
- Battery drain from constant HTTP requests
- Network bandwidth waste (mostly "no changes" responses)
- Delays between polling intervals (not truly real-time)
- Backend load from unnecessary requests
- Difficult to scale with many clients

**Instead:** Use tRPC WebSocket subscriptions or Server-Sent Events
- Single persistent connection
- Server pushes updates when they occur
- Automatic reconnection handling
- Efficient batching of multiple subscriptions

### Anti-Pattern 2: Shared Neo4j Database with Label-Based Filtering

**What goes wrong:** All users share one Neo4j database, using `WHERE user_id = $userId` in every query

**Why bad:**
- Query performance degrades as total data grows (everyone's data in one graph)
- Risk of query bugs exposing other users' data
- Difficult to backup/restore single user
- Schema migrations affect all users simultaneously
- No per-user scaling or data sovereignty

**Instead:** Use multiple databases (Neo4j 4.0+) with one database per user/tenant
- Complete isolation
- Independent scaling
- Per-user backups
- Regulatory compliance (data residency)

### Anti-Pattern 3: Full-Sync on Every Mobile App Launch

**What goes wrong:** App downloads entire graph from server on every startup

**Why bad:**
- Slow app launch (wait for download)
- Massive bandwidth waste
- Server load from full serialization
- Doesn't work offline at all
- User frustration from delays

**Instead:** Implement first-time sync + delta sync pattern
- First launch: Download graph subset
- Store locally in Realm/SQLite
- Subsequent syncs: Only changes since last sync timestamp
- Offline queue for local changes
- Background sync when online

### Anti-Pattern 4: Storing OAuth Tokens in App Code or Local Storage

**What goes wrong:** OAuth refresh tokens stored in mobile app's local storage or committed to git

**Why bad:**
- Security vulnerability (tokens extractable from device)
- Compliance violations (GDPR, SOC 2)
- No centralized revocation
- Manual token refresh logic
- Risk of token exposure in logs

**Instead:** Use brokered credentials pattern (Composio) or secure backend storage
- Tokens never reach client
- Automatic lifecycle management
- Centralized audit trail
- SOC 2 compliant storage

### Anti-Pattern 5: Synchronous Graph Queries Blocking UI

**What goes wrong:** Mobile app makes synchronous Neo4j queries, freezing UI while waiting

**Why bad:**
- Poor user experience (app feels frozen)
- No offline functionality
- Network latency directly impacts UX
- Can't show loading states
- App crashes on timeout

**Instead:** Local-first with async background sync
- Read from local Realm/SQLite (instant)
- Async sync to server in background
- Optimistic UI updates
- Loading states for network operations
- Graceful offline degradation

### Anti-Pattern 6: Single Monolithic n8n Workflow

**What goes wrong:** One giant n8n workflow handles all automation logic (entity recognition, calendar sync, email processing, etc.)

**Why bad:**
- Impossible to debug (too many nodes)
- Hard to test individual pieces
- Difficult to version control
- Performance bottlenecks
- Error in one part breaks everything

**Instead:** Modular sub-workflows with clear boundaries
- Each workflow does one thing
- Execute Workflow nodes for composition
- Independent testing and deployment
- Clear error boundaries
- Parallel execution where possible

### Anti-Pattern 7: Using user_metadata for Tenant ID

**What goes wrong:** Storing `tenant_id` in Supabase `user_metadata` instead of `app_metadata`

**Why bad:**
- **Critical security flaw:** Users can modify `user_metadata` via client API
- Attackers can change their tenant ID to access other users' data
- RLS policies based on user_metadata are bypassable
- No audit trail for tenant changes

**Instead:** Always use `app_metadata` for tenant context
- `app_metadata` only modifiable by server/admin
- Stored in JWT (verified by server)
- Safe to use in RLS policies
- Use `auth.jwt() -> 'app_metadata' ->> 'tenant_id'` in RLS

## Scalability Considerations

### At 100 Users

| Concern | Approach |
|---------|----------|
| **Neo4j** | Single instance, one database per user, 100 total databases |
| **Backend** | Single Bun instance with cluster mode (4-8 workers) |
| **WebSocket** | Single instance handles all connections (<1000 concurrent) |
| **Supabase** | Free tier sufficient (50k monthly active users) |
| **n8n** | Single instance, webhook load balancer optional |
| **Mobile sync** | Background sync every 15 min, delta-only |

**Estimated costs:** ~$50-100/month (Neo4j AuraDB Starter + Supabase Free + minimal compute)

### At 10K Users

| Concern | Approach |
|---------|----------|
| **Neo4j** | Multiple sharded instances (1000 DBs per instance), composite DBs for cross-user queries |
| **Backend** | Load balanced Elysia instances (3-5 nodes), Redis for session state |
| **WebSocket** | SO_REUSEPORT cluster mode, connection pooling, 10k concurrent connections distributed |
| **Supabase** | Pro tier (100k MAU), read replicas for auth queries |
| **n8n** | Distributed webhook triggers across 2-3 instances, queue-based execution |
| **Mobile sync** | Incremental delta sync, CDN for static graph data, compression |

**Estimated costs:** ~$1,500-2,500/month (Neo4j sharded + Supabase Pro + compute fleet)

**Optimizations needed:**
- Connection pooling for Neo4j
- Redis caching for frequently accessed entities
- Background job queue (BullMQ) for async tasks
- CDN for mobile app assets
- Database connection limits per instance

### At 1M Users

| Concern | Approach |
|---------|----------|
| **Neo4j** | Federated clusters (10k DBs per cluster), data sharding by region/tenant tier, read replicas |
| **Backend** | Kubernetes auto-scaling (50+ pods), regional deployments, service mesh |
| **WebSocket** | Dedicated WebSocket gateway layer (separate from API), regional distribution |
| **Supabase** | Enterprise tier, dedicated Postgres instance, horizontal read scaling |
| **n8n** | Dedicated workflow cluster, queue-based execution with Redis, worker auto-scaling |
| **Mobile sync** | Regional edge caching, push notifications for sync triggers, adaptive sync frequency |

**Estimated costs:** ~$15,000-30,000/month (Neo4j Enterprise + Supabase Enterprise + K8s fleet)

**Architecture changes needed:**
- Multi-region deployment (US, EU, APAC)
- GraphQL Federation for cross-region queries
- Message queue (Kafka/RabbitMQ) for event streaming
- Dedicated sync service (separate from main API)
- Rate limiting and quota enforcement
- Advanced monitoring (Datadog/New Relic)
- Chaos engineering for resilience testing

**Data sovereignty:**
- EU users → EU Neo4j cluster + EU Supabase
- US users → US infrastructure
- Compliance with GDPR, CCPA, data residency laws

## Build Order Dependencies

Based on component dependencies, recommended build sequence:

### Phase 1: Core Infrastructure
**Goal:** Authentication and basic data storage operational

1. Supabase setup (auth + PostgreSQL)
   - User registration/login
   - RLS policies for multi-tenancy
   - Basic user profile tables

2. Neo4j multi-database setup
   - Database creation on user signup
   - Basic schema (Entity, Concept, Relationship nodes)
   - Connection pooling

**Why first:** Everything depends on auth and data storage. No functionality possible without these.

**Time estimate:** 1-2 weeks

### Phase 2: Backend API Foundation
**Goal:** tRPC API with WebSocket support

3. Bun/Elysia backend skeleton
   - tRPC router setup
   - WebSocket transport configuration
   - Health check endpoints

4. Basic CRUD operations
   - Create/read/update/delete entities
   - Graph relationship management
   - User context middleware

**Why second:** Provides API layer for all other services to build on.

**Time estimate:** 2-3 weeks

### Phase 3: Mobile Client MVP
**Goal:** Offline-first mobile app with local storage

5. React Native/Expo app structure
   - Authentication flow
   - Realm local database
   - Context providers

6. Basic entity management UI
   - List/create/edit entities
   - Local-first operations
   - Offline queue

**Why third:** Enables user testing of core functionality before advanced features.

**Time estimate:** 3-4 weeks

### Phase 4: Sync Engine
**Goal:** Mobile-backend synchronization

7. Delta sync implementation
   - Last sync timestamp tracking
   - Changed entity detection
   - Conflict resolution strategies

8. Real-time subscriptions
   - tRPC WebSocket subscriptions
   - Live entity updates
   - Connection recovery

**Why fourth:** Connects mobile local storage with authoritative backend graph.

**Time estimate:** 2-3 weeks

### Phase 5: External Integrations
**Goal:** Connect to Google services via Composio

9. Composio integration
   - Google OAuth setup
   - Brokered credentials configuration
   - Calendar/Email/Drive connections

10. n8n workflow setup
    - Basic automation workflows
    - Webhook triggers from backend
    - Data pipeline to Neo4j

**Why fifth:** Requires stable backend API and auth to build on.

**Time estimate:** 2-3 weeks

### Phase 6: AI/NLP Features
**Goal:** Entity recognition and context intelligence

11. Entity recognition service
    - NLP pipeline (spaCy/BERT)
    - Entity linking to graph
    - Confidence scoring

12. GraphRAG context retrieval
    - Dual-channel retrieval (vector + graph)
    - Embedding generation
    - Context formatting for LLM

**Why sixth:** Most complex features requiring all previous layers operational.

**Time estimate:** 4-6 weeks

### Phase 7: MCP Server Layer
**Goal:** Expose knowledge graph to AI applications

13. MCP server implementation
    - Tools, resources, prompts definition
    - JSON-RPC 2.0 protocol
    - Capability negotiation

14. AI agent integration
    - Action planning service
    - Step executors
    - Intervention management

**Why seventh:** Requires complete backend, graph, and NLP pipeline to expose via MCP.

**Time estimate:** 3-4 weeks

### Phase 8: Advanced Features
**Goal:** Production-ready polish

15. Advanced mobile features
    - Push notifications
    - Background sync optimization
    - Adaptive sync frequency

16. Monitoring and observability
    - Error tracking (Sentry)
    - Performance monitoring
    - Audit logging

**Why last:** Nice-to-haves that enhance production experience.

**Time estimate:** 2-3 weeks

**Total estimated timeline:** 20-30 weeks (5-7.5 months) for full system

## Critical Path

**Cannot build Y until X is complete:**

- Mobile client → Backend API → Auth/Database
- Sync engine → Mobile client + Backend API
- n8n workflows → Backend API + External OAuth
- Entity recognition → Backend API + Neo4j
- MCP server → GraphRAG + Entity recognition + Backend API
- Action planning → MCP server + n8n workflows

**Parallel opportunities:**

- Mobile UI can develop in parallel with backend (using mock data)
- n8n workflows can develop in parallel with entity recognition
- Monitoring can be added incrementally throughout

## How n8n Fits as Orchestration Layer

n8n serves as the **workflow automation and integration hub**, sitting between the backend API and external services:

### Primary Responsibilities

1. **Data Pipeline Orchestration**
   - Triggered by backend webhooks when new entities created
   - Enriches entities with external data (Google Calendar, Email)
   - Updates Neo4j with enriched information

2. **External Service Integration**
   - Handles all Google API interactions (Calendar, Gmail, Drive)
   - Uses Composio for secure OAuth credential management
   - Transforms API responses to graph-compatible format

3. **Multi-Agent AI Workflows**
   - Gatekeeper agent routes tasks to specialized agents
   - Sub-workflows for entity extraction, classification, relationship discovery
   - Parallel execution for batch operations

4. **Scheduled Tasks**
   - Periodic sync of external data sources
   - Cleanup of stale entities
   - Background graph optimization

### Integration Patterns

**Backend → n8n:**
- Webhook triggers for events (entity created, action requested)
- HTTP requests for synchronous workflow execution
- Database queries for state checks

**n8n → Backend:**
- HTTP requests to tRPC endpoints
- Direct Neo4j queries for graph updates
- Webhook callbacks for async completion

**n8n → External Services:**
- Composio integration for Google OAuth
- HTTP requests to third-party APIs
- Email/SMS notifications

### Architecture Position

```
Mobile/AI Application
        ↓
Backend API (Bun/Elysia)
        ↓
    ┌───┴────┐
    ↓        ↓
  Neo4j    n8n ──→ External Services (Google, etc.)
            ↓
       Backend API (callback)
```

**Key principle:** n8n handles **orchestration and integration**, not core business logic. Entity recognition, action planning, and graph management stay in the backend for type safety and testability.

## Sources

### MCP Architecture
- [Architecture overview - Model Context Protocol](https://modelcontextprotocol.io/docs/learn/architecture)
- [Architectural Components of MCP - Hugging Face MCP Course](https://huggingface.co/learn/mcp-course/en/unit1/architectural-components)
- [MCP Architecture: Components, Lifecycle & Client-Server Tutorial | Obot AI](https://obot.ai/resources/learning-center/mcp-architecture/)
- [How MCP servers work: Components, logic, and architecture — WorkOS](https://workos.com/blog/how-mcp-servers-work)

### Knowledge Graphs
- [An Ecosystem for Personal Knowledge Graphs: A Survey and Research Roadmap](https://arxiv.org/pdf/2304.09572)
- [GitHub - getzep/graphiti: Build Real-Time Knowledge Graphs for AI Agents](https://github.com/getzep/graphiti)
- [The 2026 Graph Database Landscape: What's Next for Connected Intelligence](https://medium.com/@tongbing00/the-2026-graph-database-landscape-whats-next-for-connected-intelligence-c1212f00d399)

### Neo4j Multi-Tenancy
- [Multi-Tenancy in Neo4j 4.0](https://adamcowley.co.uk/posts/multi-tenancy-neo4j-40/)
- [Multi Tenancy in Neo4j: A Worked Example](https://neo4j.com/developer/multi-tenancy-worked-example/)
- [Neo4j 4: Multi tenancy](https://graphaware.com/blog/multi-tenancy-neo4j/)

### n8n Orchestration
- [AI Agent Orchestration Frameworks: Which One Works Best for You? – n8n Blog](https://blog.n8n.io/ai-agent-orchestration-frameworks/)
- [Multi-agent system: Frameworks & step-by-step tutorial – n8n Blog](https://blog.n8n.io/multi-agent-systems/)
- [n8n Guide 2026: Features & Workflow Automation Deep Dive](https://hatchworks.com/blog/ai-agents/n8n-guide/)

### Local-First Architecture
- [The Architecture Shift: Why I'm Betting on Local-First in 2026](https://dev.to/the_nortern_dev/the-architecture-shift-why-im-betting-on-local-first-in-2026-1nh6)
- [Offline-first frontend apps in 2025: IndexedDB and SQLite in the browser and beyond](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Offline-First Done Right: Sync Patterns for Real-World Mobile Networks](https://developersvoice.com/blog/mobile/offline-first-sync-patterns/)

### React Native Architecture
- [2026 Paradigm Shift: Top 10 Fundamental Developments in React Native Architecture](https://instamobile.io/blog/react-native-paradigm-shift/)
- [Top 11 Local Databases for React Native App Development in 2026](https://www.algosoft.co/blogs/top-11-local-databases-for-react-native-app-development-in-2026/)
- [React Native Local Database Options: A Comprehensive Summary](https://www.powersync.com/blog/react-native-local-database-options)

### tRPC & WebSockets
- [WebSockets | tRPC](https://trpc.io/docs/server/websockets)
- [WebSocket and Real-time Communication | trpc/trpc](https://deepwiki.com/trpc/trpc/4.5-websocket-and-real-time-communication)
- [Subscriptions | tRPC](https://trpc.io/docs/server/subscriptions)

### Bun & Elysia
- [Elysia - Ergonomic Framework for Humans | ElysiaJS](https://elysiajs.com/)
- [Deploy to Production - ElysiaJS](https://elysiajs.com/patterns/deploy)
- [GitHub - lukas-andre/bun-elysia-clean-architecture-example](https://github.com/lukas-andre/bun-elysia-clean-architecture-example)

### Supabase Multi-Tenancy
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Supabase Multi-Tenancy CRM Integration Guide](https://www.stacksync.com/blog/supabase-multi-tenancy-crm-integration)
- [Enforcing Row Level Security in Supabase: A Deep Dive into Multi-Tenant Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)

### Composio Integration
- [From Auth to Action: The Complete Guide to Secure & Scalable AI Agent Infrastructure (2026)](https://composio.dev/blog/secure-ai-agent-infrastructure-guide)
- [AI agent authentication platforms: buyer's guide and comparison (2026)](https://composio.dev/blog/ai-agent-authentication-platforms)
- [MCP Gateways: A Developer's Guide to AI Agent Architecture in 2026](https://composio.dev/blog/mcp-gateways-guide)

### GraphRAG
- [RAG Tutorial: How to Build a RAG System on a Knowledge Graph](https://neo4j.com/blog/developer/rag-tutorial/)
- [From LLMs to Knowledge Graphs: Building Production-Ready Graph Systems in 2025](https://medium.com/@claudiubranzan/from-llms-to-knowledge-graphs-building-production-ready-graph-systems-in-2025-2b4aff1ec99a)
- [What is Graph RAG | Ontotext Fundamentals](https://www.ontotext.com/knowledgehub/fundamentals/what-is-graph-rag/)
- [Building, Improving, and Deploying Knowledge Graph RAG Systems on Databricks](https://www.databricks.com/blog/building-improving-and-deploying-knowledge-graph-rag-systems-databricks)

### AI Agent Architecture
- [A Complete Guide to AI Agent Architecture in 2026 | Lindy](https://www.lindy.ai/blog/ai-agent-architecture)
- [Agentic AI for Enterprises in 2026 | AcmeMinds](https://acmeminds.com/agentic-ai-for-enterprises-in-2026-a-practical-guide/)
- [From Generative to Agentic AI: A Roadmap in 2026](https://medium.com/@anicomanesh/from-generative-to-agentic-ai-a-roadmap-in-2026-8e553b43aeda)

### Entity Recognition & NLP
- [Context-Aware ML/NLP Pipeline for Real-Time Anomaly Detection](https://www.mdpi.com/2504-4990/8/1/25)
- [Recent Advances in Named Entity Recognition: A Comprehensive Survey](https://arxiv.org/html/2401.10825v3)
- [Named Entity Recognition: A Comprehensive Guide to NLP's Key Technology](https://medium.com/@kanerika/named-entity-recognition-a-comprehensive-guide-to-nlps-key-technology-636a124eaa46)
