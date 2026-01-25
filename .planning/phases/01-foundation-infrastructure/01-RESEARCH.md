# Phase 1: Foundation Infrastructure - Research

**Researched:** 2026-01-24
**Domain:** Authentication, multi-tenant graph database, runtime compatibility
**Confidence:** MEDIUM

## Summary

Phase 1 establishes authentication, Neo4j multi-tenancy, and resolves the Neo4j-Bun compatibility issue that blocks graph database operations. Research reveals a **critical compatibility blocker**: Neo4j's official JavaScript driver has unresolved TCP-level incompatibilities with Bun runtime when using cluster connections (`neo4j+s` protocol), causing 60-second timeouts and connection failures. The codebase currently uses two authentication approaches (better-auth in packages, Supabase in mobile app), creating architectural misalignment.

**Key findings:**
- Neo4j driver + Bun compatibility is **confirmed broken** for cluster connections (GitHub issues #12772, #9914 open since April-July 2024)
- HTTP Query API workaround is **viable and recommended** - official Neo4j API that works with all runtimes
- Database-per-user is the **modern best practice** for Neo4j multi-tenancy (Neo4j 4.0+)
- Supabase auth hooks enable automatic database provisioning on signup
- Bun has **native .env support** - no dotenv package needed

**Primary recommendation:** Use Neo4j HTTP Query API (not driver) until Bun compatibility is resolved. Standardize on either better-auth OR Supabase Auth (not both). Implement database-per-user provisioning via Supabase auth hooks + Neo4j Aura API.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.50.0 | Authentication + PostgreSQL | Already in omnii_mcp, mobile uses it, managed OAuth flows |
| elysia | ^1.3.4 | HTTP framework | Already in codebase, Bun-native performance |
| drizzle-orm | ^0.44.1 | SQL type safety | Already in packages/db, works with Supabase Postgres |
| zod | catalog | Schema validation | Already workspace-wide via pnpm catalog |

**Neo4j Driver ALTERNATIVES (due to Bun incompatibility):**
| Option | Approach | Status | Recommendation |
|--------|----------|--------|----------------|
| neo4j-driver | Official Bolt driver | **BROKEN** with Bun clusters | ❌ Do not use |
| HTTP Query API | Official REST API | **WORKS** with Bun | ✅ Use this |
| bolt+s fallback | Single-server protocol | Works but not scalable | ⚠️ Dev only |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @better-auth/expo | 1.2.8 | TypeScript-first auth | IF migrating from better-auth |
| better-auth | 1.2.8 | Auth framework | IF NOT using Supabase Auth |
| @elysiajs/bearer | ^1.3.0 | JWT validation | For MCP auth in Elysia routes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Auth | better-auth + Drizzle | More control, but lose managed OAuth, webhooks, edge functions |
| HTTP Query API | Wait for neo4j-driver fix | Blocks entire project indefinitely, no timeline |
| Database-per-user | Label-based isolation | Simpler but shares resources, security boundaries weaker |
| Bun native .env | dotenv package | dotenv unnecessary - Bun loads .env automatically |

**Installation:**
```bash
# Supabase already installed in omnii_mcp
# No new packages needed for Neo4j HTTP approach (use fetch/axios)
# Environment validation
pnpm add -w zod  # Already in catalog
```

## Architecture Patterns

### Recommended Project Structure
```
apps/omnii_mcp/
├── src/
│   ├── services/
│   │   ├── auth/           # Supabase auth service
│   │   │   ├── index.ts
│   │   │   └── jwt.ts      # JWT validation middleware
│   │   ├── neo4j/
│   │   │   ├── http-client.ts    # HTTP Query API wrapper
│   │   │   └── provisioning.ts   # Database creation logic
│   └── routes/
│       └── auth.ts         # Auth callback routes
packages/
├── auth/                   # Consolidate auth logic here
│   ├── src/
│   │   ├── supabase.ts    # Unified Supabase client
│   │   ├── middleware.ts  # Elysia auth middleware
│   │   └── hooks.ts       # Signup webhook handlers
└── db/
    └── src/
        └── neo4j-schema.ts # Neo4j Cypher schema definitions
```

### Pattern 1: Neo4j HTTP Query API Client
**What:** Wrapper around Neo4j's official HTTP API for Cypher queries
**When to use:** Until neo4j-driver Bun compatibility is resolved (no ETA)
**Example:**
```typescript
// Source: https://neo4j.com/docs/query-api/current/query/
class Neo4jHTTPClient {
  constructor(
    private uri: string,     // e.g., https://xxxxx.databases.neo4j.io
    private user: string,
    private password: string,
    private database: string = 'neo4j'
  ) {}

  async query(cypher: string, params: Record<string, any> = {}) {
    const url = `${this.uri}/db/${this.database}/query/v2`;
    const auth = Buffer.from(`${this.user}:${this.password}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ statement: cypher, parameters: params })
    });

    if (!response.ok) {
      throw new Error(`Neo4j query failed: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### Pattern 2: Database-Per-User Provisioning
**What:** Auto-provision isolated Neo4j database on user signup
**When to use:** For every new user (SEC-01 requirement)
**Example:**
```typescript
// Source: https://neo4j.com/docs/aura/tutorials/create-auradb-instance-from-terminal/
// Triggered by Supabase auth webhook on signup
async function provisionUserDatabase(userId: string) {
  const response = await fetch('https://api.neo4j.io/v1/instances', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEO4J_AURA_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `omnii-user-${userId}`,
      version: '5',
      region: 'us-central1',
      memory: '2GB',
      type: 'professional-db',  // or 'enterprise-db'
      tenant_id: process.env.NEO4J_AURA_TENANT_ID,
      cloud_provider: 'gcp'
    })
  });

  const { data } = await response.json();

  // Store connection details in Supabase
  await supabase.from('user_databases').insert({
    user_id: userId,
    neo4j_uri: data.connection_url,
    neo4j_user: data.username,
    neo4j_password: data.password,
    created_at: new Date()
  });
}
```

### Pattern 3: Supabase Auth Hook Integration
**What:** Webhook triggered on user events (signup, login, etc.)
**When to use:** For database provisioning, tenant_id injection
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/auth-hooks
// apps/omnii_mcp/src/routes/webhooks/auth.ts
import { Elysia } from 'elysia';

export const authWebhooks = new Elysia()
  .post('/webhooks/auth/signup', async ({ body }) => {
    const { user } = body;

    // Provision Neo4j database
    await provisionUserDatabase(user.id);

    // Add custom claims to JWT (requires Postgres hook)
    return {
      user: {
        ...user,
        app_metadata: {
          tenant_id: user.id,
          neo4j_database: `omnii-user-${user.id}`
        }
      }
    };
  });
```

### Pattern 4: Environment Configuration Hierarchy
**What:** Bun's native .env file loading with proper precedence
**When to use:** Local, dev, prod environment management (FOUND-05)
**Example:**
```bash
# Source: https://bun.com/docs/runtime/environment-variables
# Bun loads automatically in this order:
# 1. System environment variables
# 2. .env
# 3. .env.production / .env.development (based on NODE_ENV)
# 4. .env.local (gitignored overrides)

# Root .env (shared infrastructure)
OMNII_SUPABASE_URL=https://xxx.supabase.co
OMNII_SUPABASE_ANON_KEY=xxx
OMNII_NEO4J_AURA_API_TOKEN=xxx
OMNII_NEO4J_AURA_TENANT_ID=xxx

# apps/omnii_mcp/.env.local (gitignored, developer-specific)
MCP_BASE_URL=http://localhost:8081
MCP_PORT=8081
NODE_ENV=development
```

### Anti-Patterns to Avoid
- **Don't use neo4j-driver with Bun**: Known incompatibility with `neo4j+s` protocol, 60s timeouts
- **Don't mix better-auth and Supabase Auth**: Codebase currently has both - pick one
- **Don't use shared database for multi-tenancy**: Label-based isolation is weaker than database-per-user
- **Don't install dotenv package**: Bun natively loads .env files, dotenv creates redundancy
- **Don't manually manage OAuth tokens**: Use Supabase's managed flow or better-auth plugins

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow management | Custom Google OAuth implementation | Supabase Auth or better-auth | Handles PKCE, token refresh, edge cases, security audits |
| JWT validation | Manual JWT parsing/verification | @elysiajs/bearer + Supabase JWT | Handles signature verification, expiry, claims extraction |
| Database connection pooling | Custom HTTP client with retry logic | Existing fetch with exponential backoff library | Edge cases: timeouts, DNS failures, rate limits |
| Environment variable validation | Manual process.env checks | Zod schemas with early validation | Type safety, helpful error messages, runtime guarantees |
| Secret encryption at rest | Custom crypto implementation | Supabase Vault or cloud KMS | Cryptography is hard, regulatory compliance requires audits |

**Key insight:** Authentication and secrets management are security-critical - use battle-tested libraries. OAuth has many edge cases (state validation, PKCE, token refresh races) that take months to get right.

## Common Pitfalls

### Pitfall 1: Neo4j Driver Incompatibility Assumption
**What goes wrong:** Assuming neo4j-driver works with Bun because it "should" work
**Why it happens:** Documentation doesn't mention Bun incompatibility, driver installs without errors
**How to avoid:**
- Use HTTP Query API from day one
- Test with `neo4j+s` protocol (cluster) not just `bolt+s` (single server)
- Monitor GitHub issues: oven-sh/bun#12772, oven-sh/bun#9914
**Warning signs:**
- Connection timeouts exactly 60 seconds
- "Active conn count = 0, Idle conn count = 0" errors
- Works with Node.js but hangs with Bun

### Pitfall 2: Database Provisioning Timing
**What goes wrong:** User completes signup but database isn't ready, first query fails
**Why it happens:** Neo4j Aura API is asynchronous, database takes 30-120s to provision
**How to avoid:**
- Use `--await` flag in Aura CLI or poll instance status API
- Store provisioning status in Supabase: `pending`, `ready`, `failed`
- Show user loading state: "Setting up your personal knowledge graph..."
- Implement retry logic with exponential backoff for first queries
**Warning signs:**
- Users see "Database not found" errors immediately after signup
- Auth succeeds but first Neo4j query fails
- Provisioning works locally (pre-created DB) but fails in production

### Pitfall 3: Mixed Authentication Approaches
**What goes wrong:** Codebase uses better-auth (packages/auth) AND Supabase (mobile app), causing confusion
**Why it happens:** Phase 0 consolidated codebases with different auth strategies
**How to avoid:**
- **Decision required**: Pick ONE auth approach for entire stack
- If Supabase: Remove better-auth, migrate packages/auth to Supabase client
- If better-auth: Migrate mobile from Supabase, lose managed OAuth/edge functions
- Update REQUIREMENTS.md if changing from Supabase (FOUND-03 specifies Supabase)
**Warning signs:**
- Two different session formats in codebase
- Mobile can't authenticate with backend (different JWT issuers)
- User table exists in both Supabase AND Drizzle schemas

### Pitfall 4: Environment Variable Namespace Collisions
**What goes wrong:** NEO4J_URI conflicts between shared instance and user-specific databases
**Why it happens:** Database-per-user means N Neo4j URIs, not one global URI
**How to avoid:**
- Use `OMNII_NEO4J_AURA_API_TOKEN` for provisioning API (admin)
- Store per-user connection details in Supabase `user_databases` table
- Fetch user's Neo4j credentials from Supabase based on JWT tenant_id
- Never hardcode user database URIs in .env
**Warning signs:**
- Admin queries work but user queries hit wrong database
- Tenant isolation broken - users see each other's data
- Connection string doesn't match user's database name

### Pitfall 5: Bun .env Loading Misunderstanding
**What goes wrong:** Installing dotenv package when Bun already loads .env natively
**Why it happens:** Developers used to Node.js assume dotenv is required
**How to avoid:**
- Remove `dotenv` from package.json if present
- Don't call `dotenv.config()` - Bun loads automatically
- Use `.env.local` for gitignored secrets (loaded last, highest precedence)
- Verify with `console.log(process.env.OMNII_SUPABASE_URL)` - should work without dotenv
**Warning signs:**
- `dotenv` package in dependencies
- `require('dotenv').config()` in entry files
- Environment variables work locally but fail in production

## Code Examples

Verified patterns from official sources:

### Neo4j HTTP Query API - Complete Client
```typescript
// Source: https://neo4j.com/docs/query-api/current/query/
// apps/omnii_mcp/src/services/neo4j/http-client.ts

import type { Session } from '@supabase/supabase-js';

interface Neo4jQueryResult {
  data: {
    values: any[][];
  };
  counters?: {
    nodesCreated?: number;
    relationshipsCreated?: number;
  };
}

export class Neo4jHTTPClient {
  constructor(
    private uri: string,
    private user: string,
    private password: string,
    private database: string
  ) {}

  private get authHeader(): string {
    const credentials = `${this.user}:${this.password}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  async query(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<Neo4jQueryResult> {
    const url = `${this.uri}/db/${this.database}/query/v2`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        statement: cypher,
        parameters: params
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Neo4j HTTP query failed: ${error}`);
    }

    return response.json();
  }

  // Factory: Create client for authenticated user
  static async forUser(session: Session, supabase: any): Promise<Neo4jHTTPClient> {
    const { data, error } = await supabase
      .from('user_databases')
      .select('neo4j_uri, neo4j_user, neo4j_password, database_name')
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      throw new Error('User database not provisioned');
    }

    return new Neo4jHTTPClient(
      data.neo4j_uri,
      data.neo4j_user,
      data.neo4j_password,
      data.database_name
    );
  }
}
```

### Supabase Auth Middleware for Elysia
```typescript
// Source: https://supabase.com/docs/guides/auth/jwts
// packages/auth/src/middleware.ts

import { Elysia } from 'elysia';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.OMNII_SUPABASE_URL!,
  process.env.OMNII_SUPABASE_ANON_KEY!
);

export const authMiddleware = new Elysia()
  .derive(async ({ headers }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error('Invalid token');
    }

    return {
      user,
      tenantId: user.id,  // For database-per-user isolation
      session: { user }
    };
  });

// Usage:
// app.use(authMiddleware).get('/protected', ({ user }) => ...)
```

### Environment Validation with Zod
```typescript
// Source: https://github.com/colinhacks/zod
// apps/omnii_mcp/src/config/env.ts

import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  OMNII_SUPABASE_URL: z.string().url(),
  OMNII_SUPABASE_ANON_KEY: z.string().min(1),

  // Neo4j Aura API (for provisioning)
  OMNII_NEO4J_AURA_API_TOKEN: z.string().min(1),
  OMNII_NEO4J_AURA_TENANT_ID: z.string().min(1),

  // MCP Server
  MCP_BASE_URL: z.string().url(),
  MCP_PORT: z.coerce.number().default(8081),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export const env = envSchema.parse(process.env);

// Fails fast on startup if environment is misconfigured
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| neo4j-driver with Node.js | HTTP Query API with Bun | 2024 (Bun adoption) | Workaround until driver fixed |
| Label-based multi-tenancy | Database-per-user (Neo4j 4.0+) | 2020 | Complete data isolation, better security |
| Manual .env loading (dotenv) | Bun native .env support | 2022 (Bun v0.1) | One less dependency, auto-loading |
| NextAuth (Auth.js) | better-auth or Supabase Auth | 2024-2025 | Better TypeScript DX, managed OAuth |
| Single Postgres database | Postgres (Supabase) + Neo4j per-user | Architecture decision | SQL for auth, graph for knowledge |

**Deprecated/outdated:**
- **neo4j-driver with Bun clusters**: Broken since at least April 2024, no fix timeline
- **REST API (legacy)**: Replaced by HTTP Query API in Neo4j 5.x
- **Shared database multi-tenancy**: Security/performance issues at scale
- **Manual dotenv.config() with Bun**: Unnecessary, Bun loads .env automatically

## Open Questions

Things that couldn't be fully resolved:

1. **better-auth vs. Supabase Auth Decision**
   - What we know: Codebase has both (packages/auth uses better-auth, mobile uses Supabase)
   - What's unclear: Which should be the canonical approach for Phase 1
   - Recommendation: **Use Supabase Auth** - FOUND-03 requirement specifies it, mobile already integrated, managed OAuth flow reduces complexity
   - Action: Migrate packages/auth to Supabase or document decision to change requirement

2. **Neo4j Aura vs. Self-Hosted for Development**
   - What we know: Aura API enables database-per-user provisioning, self-hosted requires manual CREATE DATABASE
   - What's unclear: Cost implications for dev/test environments with many users
   - Recommendation: Aura Free tier (limited) for dev, Professional for prod, or self-hosted Neo4j 5.x Enterprise with automation scripts
   - Action: Evaluate cost model during planning (Phase 1 Plan 01)

3. **Database Provisioning Wait Time UX**
   - What we know: Aura database creation takes 30-120 seconds
   - What's unclear: Best UX pattern - block signup, async provision, or pre-provision pool
   - Recommendation: Async provision + loading state + fallback to shared dev DB for first session
   - Action: Design UX flow in Phase 1 planning

4. **Neo4j HTTP API Performance vs. Driver**
   - What we know: HTTP adds latency vs. native Bolt protocol
   - What's unclear: Real-world performance impact for personal knowledge graph queries
   - Recommendation: Accept HTTP overhead as temporary until driver fixed, optimize query patterns
   - Action: Monitor oven-sh/bun issues for driver fix, migrate when resolved

## Sources

### Primary (HIGH confidence)
- [Neo4j HTTP Query API Documentation](https://neo4j.com/docs/query-api/current/) - Official API specification
- [Neo4j Aura CLI Documentation](https://neo4j.com/docs/aura/tutorials/create-auradb-instance-from-terminal/) - Database provisioning
- [Bun Environment Variables](https://bun.com/docs/runtime/environment-variables) - Native .env support
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google) - OAuth flow

### Secondary (MEDIUM confidence)
- [Bun Issue #12772](https://github.com/oven-sh/bun/issues/12772) - Neo4j cluster connection bug (open, July 2024)
- [Bun Issue #9914](https://github.com/oven-sh/bun/issues/9914) - Neo4j driver support request (open, April 2024)
- [Neo4j Multi-Tenancy Best Practices](https://neo4j.com/developer/multi-tenancy-worked-example/) - Database-per-user pattern
- [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks) - Signup webhook integration

### Tertiary (LOW confidence - verify during implementation)
- Community discussions on Neo4j driver vs. HTTP API performance (anecdotal, not benchmarked)
- better-auth vs. Supabase Auth comparisons (opinions vary, both are valid for 2026)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Supabase/Elysia confirmed in codebase, Neo4j HTTP workaround verified but not ideal
- Architecture: MEDIUM - Database-per-user well-documented, but provisioning UX patterns need validation
- Pitfalls: HIGH - Neo4j-Bun incompatibility confirmed via GitHub issues, other pitfalls based on codebase analysis

**Research date:** 2026-01-24
**Valid until:** 14 days (2026-02-07) - Fast-moving: Bun driver fix could land anytime, monitor GitHub issues

## ASCII Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICES                            │
│  ┌──────────────┐              ┌──────────────┐                │
│  │ Mobile App   │              │ Claude Code  │                │
│  │ (React Native)│              │ / Desktop    │                │
│  └───────┬──────┘              └──────┬───────┘                │
│          │ Supabase Auth JWT          │ MCP Protocol           │
└──────────┼────────────────────────────┼────────────────────────┘
           │                            │
           ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               BACKEND (Bun/Elysia - apps/omnii_mcp)             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Auth Middleware (packages/auth)                          │  │
│  │ ├─ Validate JWT (Supabase token)                        │  │
│  │ ├─ Extract tenant_id (user.id)                          │  │
│  │ └─ Fetch user's Neo4j connection from Supabase          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Neo4j HTTP Client (services/neo4j/http-client.ts)       │  │
│  │ ├─ Query via HTTP Query API (not driver)                │  │
│  │ ├─ User-specific database per tenant_id                 │  │
│  │ └─ Basic auth with user's Neo4j credentials             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                            │
           │ SQL                        │ HTTPS (Cypher)
           ▼                            ▼
┌──────────────────────┐   ┌────────────────────────────────────┐
│   Supabase           │   │   Neo4j Aura (per-user DBs)       │
│ ┌──────────────────┐ │   │ ┌────────────┐  ┌────────────┐   │
│ │ Auth (GoTrue)    │ │   │ │ user-123   │  │ user-456   │   │
│ │ ├─ Google OAuth  │ │   │ │ (isolated  │  │ (isolated  │   │
│ │ └─ JWT issuance  │ │   │ │  database) │  │  database) │   │
│ └──────────────────┘ │   │ └────────────┘  └────────────┘   │
│ ┌──────────────────┐ │   │                                    │
│ │ PostgreSQL       │ │   │ Provisioned via Aura API on        │
│ │ ├─ users         │ │   │ signup webhook                     │
│ │ └─ user_databases│◄┼───┼─(stores connection details)        │
│ └──────────────────┘ │   │                                    │
└──────────────────────┘   └────────────────────────────────────┘

SIGNUP FLOW:
1. User signs up via Google OAuth (Supabase)
2. Supabase triggers auth webhook → apps/omnii_mcp/webhooks/auth
3. Webhook calls Neo4j Aura API to provision database
4. Stores connection details in Supabase user_databases table
5. Returns JWT with tenant_id custom claim
6. Subsequent requests use tenant_id to lookup Neo4j connection

QUERY FLOW (authenticated user):
1. Client sends request with Supabase JWT
2. Auth middleware validates JWT, extracts tenant_id
3. Fetch user's Neo4j credentials from user_databases table
4. Create Neo4jHTTPClient with user's database URI
5. Execute Cypher via HTTP Query API
6. Return results to client
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Neo4j driver never fixed for Bun | MEDIUM | HIGH | HTTP API is permanent, official, supported solution |
| Database provisioning cost overruns | LOW | MEDIUM | Use Aura Free tier for dev, monitor usage, implement soft limits |
| Auth approach confusion (better-auth vs Supabase) | HIGH | MEDIUM | Make explicit decision in Phase 1 Plan 01, document in DECISIONS.md |
| Database provisioning delays | MEDIUM | LOW | Async provision + loading state, pre-provision pool for testing |
| HTTP API performance issues | LOW | LOW | Personal knowledge graphs are small, query optimization sufficient |
| Secrets management complexity | LOW | MEDIUM | Use Supabase Vault for production, .env.local for development |

## Implementation Complexity Estimates

| Component | Complexity | Effort | Dependencies |
|-----------|------------|--------|--------------|
| Neo4j HTTP Client | LOW | 4h | None (replace existing neo4j.config.ts) |
| Supabase Auth Integration | LOW | 2h | Already in mobile, extend to MCP |
| Database Provisioning Webhook | MEDIUM | 8h | Neo4j Aura API credentials, Supabase schema |
| Auth Middleware | LOW | 3h | Supabase client, Elysia plugin |
| Environment Validation | LOW | 2h | Zod schema, update .env.example |
| **Total** | **MEDIUM** | **19h** | **Neo4j Aura account, Supabase project** |

**Blockers:**
- Neo4j Aura API credentials (requires Neo4j account + payment info)
- Supabase project setup (can use existing from mobile app)
- Decision on better-auth vs. Supabase Auth

**Parallelization opportunities:**
- Neo4j HTTP client can be built while auth decision is pending
- Environment validation can happen alongside auth middleware
- Provisioning webhook depends on auth + Neo4j client being complete
