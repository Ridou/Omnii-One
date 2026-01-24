# Environment Variable Reconciliation Plan

**Purpose:** Prevent "app connects to wrong database" failures by cataloguing all environment variables, identifying namespace collisions, and establishing clear namespace conventions for the monorepo.

**Analysis Date:** 2026-01-24
**Codebases Analyzed:**
- `/Users/santino/Projects/Omnii One` (monorepo - merged omnii)
- `/Users/santino/Projects/omnii-mobile` (standalone - to be migrated)
- `/Users/santino/Projects/omnii-mcp` (standalone - to be migrated)

---

## Executive Summary

**Total Variables Identified:** 60+ unique application variables (excluding build/system vars)

**Critical Findings:**
- BASE_URL, PUBLIC_URL, PORT used by MCP apps (collision risk during migration)
- SUPABASE_*, NEO4J_*, GOOGLE_* shared across apps (same values expected)
- EXPO_PUBLIC_* prefix correctly isolates mobile client-side vars
- No critical collisions detected in current state
- Namespace strategy needed for MCP-specific vs. shared variables

**Recommended Strategy:**
- Shared infrastructure: Use `OMNII_*` prefix for truly shared services
- App-specific: Use `MCP_*` prefix for MCP backend-only variables
- Keep `EXPO_PUBLIC_*` as-is for React Native Metro bundler compatibility
- Build vars: `NODE_ENV`, `CI` stay as-is (standard)

---

## Section 1: Complete Variable Inventory

### 1.1 Monorepo (Omnii One) - Current State

**Total Unique App Variables:** 62

| Variable | Used In | Category | Purpose |
|----------|---------|----------|---------|
| **Infrastructure - Database** |
| POSTGRES_URL | Monorepo Root | Shared | Supabase PostgreSQL connection (pooler) |
| NEO4J_URI | MCP Backend | Shared | Neo4j graph database connection |
| NEO4J_USER | MCP Backend | Shared | Neo4j authentication username |
| NEO4J_PASSWORD | MCP Backend | Shared | Neo4j authentication password |
| NEO4J_DATABASE | MCP Backend | Shared | Neo4j database name (multi-tenancy) |
| EXPO_PUBLIC_NEO4J_PASSWORD | Mobile | Mobile-only | Neo4j password exposed to React Native |
| REDIS_URL | MCP Backend | Shared | Redis cache connection string |
| DISABLE_REDIS | MCP Backend | MCP-only | Feature flag to disable Redis caching |
| **Infrastructure - Authentication/Auth Services** |
| AUTH_SECRET | Monorepo Root | Shared | better-auth secret key |
| AUTH_DISCORD_ID | Monorepo Root | Shared | Discord OAuth client ID |
| AUTH_DISCORD_SECRET | Monorepo Root | Shared | Discord OAuth client secret |
| AUTH_REDIRECT_PROXY_URL | Monorepo Root | Shared | OAuth redirect proxy URL |
| SUPABASE_URL | MCP Backend, Mobile | Shared | Supabase project URL |
| SUPABASE_ANON_KEY | MCP Backend, Mobile | Shared | Supabase anonymous key (client-safe) |
| SUPABASE_SERVICE_ROLE_KEY | MCP Backend | Shared | Supabase service role key (server-only) |
| EXPO_PUBLIC_SUPABASE_URL | Mobile | Mobile-only | Supabase URL exposed to React Native |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Mobile | Mobile-only | Supabase anon key exposed to React Native |
| NEXT_PUBLIC_SUPABASE_URL | Web App | Shared | Supabase URL exposed to Next.js client |
| **Infrastructure - AI/ML Services** |
| OPENAI_API_KEY | MCP Backend | Shared | OpenAI API key for LLM calls |
| COMPOSIO_API_KEY | MCP Backend | Shared | Composio API key for Google services |
| **Infrastructure - Communication** |
| TWILIO_ACCOUNT_SID | MCP Backend | MCP-only | Twilio account identifier |
| TWILIO_AUTH_TOKEN | MCP Backend | MCP-only | Twilio authentication token |
| TWILIO_PHONE_NUMBER | MCP Backend | MCP-only | Twilio phone number for SMS |
| **Infrastructure - OAuth/Google** |
| GOOGLE_CLIENT_ID | MCP Backend, Mobile | Shared | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | MCP Backend | Shared | Google OAuth client secret |
| GOOGLE_REDIRECT_URI | MCP Backend | MCP-only | Google OAuth redirect URI |
| EXPO_PUBLIC_GOOGLE_CLIENT_ID | Mobile | Mobile-only | Google OAuth client ID for mobile |
| EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID | Mobile | Mobile-only | Google OAuth iOS-specific client ID |
| EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID | Mobile | Mobile-only | Google OAuth web client ID |
| **Infrastructure - n8n Agent Integration** |
| N8N_AGENT_ENABLED | MCP Backend | MCP-only | Enable/disable n8n agent integration |
| N8N_AGENT_SWARM_URL | MCP Backend | MCP-only | n8n swarm endpoint URL |
| N8N_AGENT_TIMEOUT | MCP Backend | MCP-only | n8n agent request timeout (ms) |
| N8N_ENABLED_AGENTS | MCP Backend | MCP-only | Comma-separated list of enabled agents |
| N8N_FALLBACK_ENABLED | MCP Backend | MCP-only | Enable fallback when n8n unavailable |
| N8N_HEALTH_CHECK_INTERVAL | MCP Backend | MCP-only | n8n health check interval (ms) |
| N8N_PERFORMANCE_TRACKING | MCP Backend | MCP-only | Enable n8n performance tracking |
| N8N_REQUEST_LOGGING | MCP Backend | MCP-only | Enable n8n request logging |
| N8N_RETRY_ATTEMPTS | MCP Backend | MCP-only | Number of n8n retry attempts |
| **Infrastructure - Stripe Payments** |
| EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY | Mobile | Mobile-only | Stripe publishable key for client |
| **Infrastructure - RDF Python Service** |
| RDF_PYTHON_SERVICE_URL | MCP Backend | MCP-only | RDF Python service base URL |
| RDF_PYTHON_SERVICE_OVERRIDE_URL | MCP Backend | MCP-only | Override URL for RDF service (testing) |
| **Configuration - Server** |
| BASE_URL | MCP Backend | MCP-only | Backend base URL for API endpoints |
| API_BASE_URL | MCP Backend | MCP-only | Alternative API base URL |
| PUBLIC_URL | MCP Backend | MCP-only | Public-facing URL for MCP server |
| PORT | MCP Backend, Root | Shared | Server port (default 8000 for MCP) |
| CORS_ORIGINS | MCP Backend, Mobile | Shared | Allowed CORS origins (comma-separated) |
| MCP_SERVICE_URL | Mobile | Mobile-only | MCP service URL for mobile app |
| **Configuration - Expo Mobile** |
| EXPO_PUBLIC_APP_VERSION | Mobile | Mobile-only | App version displayed in mobile |
| EXPO_PUBLIC_BACKEND_BASE_URL | Mobile | Mobile-only | Backend base URL for mobile API calls |
| EXPO_PUBLIC_DEV_LAN_IP | Mobile | Mobile-only | LAN IP for local development |
| EXPO_PUBLIC_ENVIRONMENT | Mobile | Mobile-only | Environment name (dev/staging/prod) |
| EXPO_PUBLIC_USE_DIRECT_N8N | Mobile | Mobile-only | Feature flag: bypass backend, call n8n directly |
| EXPO_PUBLIC_USE_HTTP_CHAT | Mobile | Mobile-only | Feature flag: use HTTP chat instead of WebSocket |
| **Configuration - Deployment** |
| RAILWAY_ENVIRONMENT | MCP Backend | MCP-only | Railway environment name |
| RAILWAY_STATIC_URL | MCP Backend | MCP-only | Railway static URL |
| VERCEL_ENV | Root | Shared | Vercel environment (preview/production) |
| **Configuration - Memory/Caching** |
| MEMORY_BRIDGE_ENABLED | MCP Backend | MCP-only | Enable memory bridge feature |
| MEMORY_CACHE_TTL | MCP Backend | MCP-only | Memory cache time-to-live (seconds) |
| CONTEXT_RETRIEVAL_TIMEOUT | MCP Backend | MCP-only | Context retrieval timeout (ms) |
| **Configuration - Build/Runtime** |
| NODE_ENV | All | Standard | Node environment (development/production/test) |
| CI | All | Standard | CI environment flag |
| ENVIRONMENT | MCP Backend, Mobile | Shared | Application environment name |
| DEBUG | MCP Backend, Mobile | Shared | Debug mode flag |
| DEBUG_FD | MCP Backend | MCP-only | Debug file descriptor |
| **Testing** |
| OMNII_TEST_ENV | MCP Backend | MCP-only | Test environment flag |
| TEST_BASE_URL | MCP Backend | MCP-only | Base URL for testing |
| TEST_GOOGLE_CLIENT_ID | Mobile | Mobile-only | Google OAuth client ID for testing |
| TEST_SUPABASE_URL | Mobile | Mobile-only | Supabase URL for testing |
| TEST_SUPABASE_ANON_KEY | Mobile | Mobile-only | Supabase anon key for testing |

### 1.2 Standalone omnii-mobile Variables

**Filtered App Variables (14):**
- EXPO_PUBLIC_APP_VERSION
- EXPO_PUBLIC_BACKEND_BASE_URL
- EXPO_PUBLIC_ENVIRONMENT
- EXPO_PUBLIC_GOOGLE_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
- EXPO_PUBLIC_PROJECT_ID ⚠️ (unique to standalone)
- EXPO_PUBLIC_PROJECT_ROOT ⚠️ (unique to standalone)
- EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- EXPO_PUBLIC_SUPABASE_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- NODE_ENV

**Analysis:** Standalone mobile is mostly aligned with monorepo mobile. Two unique vars (PROJECT_ID, PROJECT_ROOT) are Expo build metadata - not critical for runtime.

### 1.3 Standalone omnii-mcp Variables

**App Variables (35):**
- ANTHROPIC_API_KEY ⚠️ (unique - Claude API)
- BASE_URL
- COMPOSIO_API_KEY
- CORS_ORIGINS
- DEBUG
- DEBUG_AUTH ⚠️ (unique - auth debugging)
- DEBUG_FD
- DISABLE_REDIS
- GOOGLE_CALENDAR_INTEGRATION_ID ⚠️ (unique)
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_CREDENTIALS_PATH ⚠️ (unique)
- GOOGLE_REDIRECT_URI
- JWT_ISSUER ⚠️ (unique)
- JWT_SECRET ⚠️ (unique)
- LANGSMITH_API_KEY ⚠️ (unique - LangSmith tracing)
- MCP_SERVER_URL ⚠️ (unique)
- NEO4J_DATABASE
- NEO4J_PASSWORD
- NEO4J_URI
- NEO4J_USER
- NODE_ENV
- OAUTH_ENCRYPTION_KEY ⚠️ (unique)
- OMNII_TEST_ENV
- OPENAI_API_KEY
- PORT
- PUBLIC_URL
- REDIS_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL
- TEST_BASE_URL
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- TWILIO_TEST_PHONE_NUMBER ⚠️ (unique)
- UPSTASH_REDIS_REST_TOKEN ⚠️ (unique - Upstash Redis)
- UPSTASH_REDIS_REST_URL ⚠️ (unique - Upstash Redis)

**Analysis:** Standalone MCP has 11 unique variables not in monorepo MCP. Most are authentication-related or alternative services (Anthropic, LangSmith, Upstash Redis). Need to evaluate if these are newer features to bring into monorepo or deprecated code.

---

## Section 2: Collision Analysis

### 2.1 Variables Used by Multiple Apps

| Variable | Omnii One | omnii-mobile | omnii-mcp | Collision Risk | Resolution |
|----------|-----------|--------------|-----------|----------------|------------|
| **Same Value Expected (Infrastructure)** |
| NEO4J_URI | ✓ MCP | ❌ | ✓ Standalone | LOW | Shared - same Neo4j instance |
| NEO4J_USER | ✓ MCP | ❌ | ✓ Standalone | LOW | Shared - same Neo4j instance |
| NEO4J_PASSWORD | ✓ MCP | ❌ | ✓ Standalone | LOW | Shared - same Neo4j instance |
| NEO4J_DATABASE | ✓ MCP | ❌ | ✓ Standalone | LOW | Shared - same Neo4j instance |
| SUPABASE_URL | ✓ MCP+Mobile | ✓ | ✓ Standalone | LOW | Shared - same Supabase project |
| SUPABASE_ANON_KEY | ✓ MCP+Mobile | ✓ | ✓ Standalone | LOW | Shared - same Supabase project |
| SUPABASE_SERVICE_ROLE_KEY | ✓ MCP | ❌ | ✓ Standalone | LOW | Shared - same Supabase project |
| OPENAI_API_KEY | ✓ MCP | ❌ | ✓ Standalone | LOW | Shared - same OpenAI account |
| GOOGLE_CLIENT_ID | ✓ MCP+Mobile | ✓ | ✓ Standalone | LOW | Shared - same Google OAuth app |
| GOOGLE_CLIENT_SECRET | ✓ MCP+Mobile | ✓ | ✓ Standalone | LOW | Shared - same Google OAuth app |
| REDIS_URL | ✓ MCP | ❌ | ✓ Standalone | LOW | Shared - same Redis instance |
| COMPOSIO_API_KEY | ✓ MCP | ❌ | ✓ Standalone | LOW | Shared - same Composio account |
| **Potentially Different Values (App-Specific)** |
| BASE_URL | ✓ MCP | ❌ | ✓ Standalone | MEDIUM | Need MCP_ prefix for app-specific |
| PUBLIC_URL | ✓ MCP | ❌ | ✓ Standalone | MEDIUM | Need MCP_ prefix for app-specific |
| PORT | ✓ MCP+Root | ❌ | ✓ Standalone | MEDIUM | Need MCP_ prefix for MCP-specific port |
| DEBUG | ✓ MCP+Mobile | ❌ | ✓ Standalone | LOW | Safe - standard debug flag |
| NODE_ENV | ✓ All | ✓ | ✓ Standalone | NONE | Standard - no collision |
| **Mobile-Only (Expo Namespaced - Safe)** |
| EXPO_PUBLIC_* | ✓ Mobile | ✓ | ❌ | NONE | React Native Metro requires prefix |

### 2.2 Critical Collision: BASE_URL, PUBLIC_URL, PORT

**Problem:** During monorepo migration, if both MCP apps load from root .env:
- `BASE_URL` could point to wrong backend
- `PUBLIC_URL` could expose wrong service
- `PORT` could cause port conflicts if both apps try to bind same port

**Example Failure Scenario:**
```bash
# Root .env (wrong approach)
BASE_URL=http://localhost:8000  # Which MCP server?
PORT=8000                        # Both MCP apps try to bind 8000
```

**Resolution:** See Section 3 for namespace strategy.

---

## Section 3: Namespace Resolution Strategy

### 3.1 Namespace Convention

| Prefix | Usage | Examples | Scope |
|--------|-------|----------|-------|
| `OMNII_*` | **Shared infrastructure** across all apps | `OMNII_SUPABASE_URL`, `OMNII_NEO4J_URI`, `OMNII_OPENAI_API_KEY` | Global (root .env) |
| `MCP_*` | **MCP-specific** configuration (multiple MCP apps) | `MCP_BASE_URL`, `MCP_PORT`, `MCP_PUBLIC_URL` | MCP apps only |
| `EXPO_PUBLIC_*` | **React Native Metro** client-side vars | `EXPO_PUBLIC_BACKEND_BASE_URL` | Mobile app only (KEEP AS-IS) |
| `N8N_*` | **n8n integration** configuration | `N8N_AGENT_ENABLED`, `N8N_AGENT_SWARM_URL` | MCP apps only (already namespaced) |
| (none) | **Standard build/runtime** vars | `NODE_ENV`, `CI`, `PORT` (app-level) | Standard across ecosystem |

### 3.2 Rationale

**Why `OMNII_` for shared?**
- Clear ownership: "This belongs to Omnii One project"
- Prevents conflicts with third-party libraries expecting generic names
- Easy to grep: `grep OMNII_ .env` shows all project-specific vars
- Future-proof: If we add more services (e.g., OMNII_MONGODB_URI), pattern is established

**Why `MCP_` for MCP-specific?**
- Multiple MCP servers in monorepo (omnii_mcp, future mcp-v2)
- Each needs own `BASE_URL`, `PORT`, `PUBLIC_URL`
- Prevents collision: `MCP_PORT=8000` vs `MCP_V2_PORT=8001`

**Why keep `EXPO_PUBLIC_` as-is?**
- React Native Metro bundler hardcoded to look for `EXPO_PUBLIC_` prefix
- Changing would break Metro's environment variable injection
- Established Expo convention - don't fight the framework

**Why keep standard vars unprefixed?**
- `NODE_ENV`, `CI`, `DEBUG` are ecosystem standards
- Expected by tooling (Jest, ESLint, Turborepo, etc.)
- Adding prefix breaks tool expectations

### 3.3 Shared vs. App-Specific Decision Tree

```
Is this variable used by multiple apps?
├─ YES: Do they need the SAME value?
│  ├─ YES (e.g., SUPABASE_URL, NEO4J_URI)
│  │  └─ Use OMNII_* prefix → Store in root .env
│  └─ NO (e.g., BASE_URL differs per MCP app)
│     └─ Use app-specific prefix (MCP_*, MOBILE_*) → Store in apps/{app}/.env
└─ NO: Only used by one app?
   └─ Use app-specific prefix → Store in apps/{app}/.env
```

---

## Section 4: Migration Mapping

### 4.1 Shared Infrastructure Variables (Root .env)

| Old Name (Current) | New Name (Namespaced) | Affected Apps | Migration Note |
|--------------------|-----------------------|---------------|----------------|
| SUPABASE_URL | OMNII_SUPABASE_URL | All (MCP + Mobile) | Update all imports |
| SUPABASE_ANON_KEY | OMNII_SUPABASE_ANON_KEY | All (MCP + Mobile) | Update all imports |
| SUPABASE_SERVICE_ROLE_KEY | OMNII_SUPABASE_SERVICE_ROLE_KEY | MCP apps only | Update all imports |
| NEO4J_URI | OMNII_NEO4J_URI | MCP apps | Update all imports |
| NEO4J_USER | OMNII_NEO4J_USER | MCP apps | Update all imports |
| NEO4J_PASSWORD | OMNII_NEO4J_PASSWORD | MCP apps | Update all imports |
| NEO4J_DATABASE | OMNII_NEO4J_DATABASE | MCP apps | Update all imports |
| OPENAI_API_KEY | OMNII_OPENAI_API_KEY | MCP apps | Update all imports |
| COMPOSIO_API_KEY | OMNII_COMPOSIO_API_KEY | MCP apps | Update all imports |
| REDIS_URL | OMNII_REDIS_URL | MCP apps | Update all imports |
| GOOGLE_CLIENT_ID | OMNII_GOOGLE_CLIENT_ID | MCP + Mobile | Update all imports |
| GOOGLE_CLIENT_SECRET | OMNII_GOOGLE_CLIENT_SECRET | MCP apps | Update all imports |
| POSTGRES_URL | OMNII_POSTGRES_URL | Root + API | Update all imports |
| AUTH_SECRET | OMNII_AUTH_SECRET | Root | Update all imports |
| AUTH_DISCORD_ID | OMNII_AUTH_DISCORD_ID | Root | Update all imports |
| AUTH_DISCORD_SECRET | OMNII_AUTH_DISCORD_SECRET | Root | Update all imports |

### 4.2 MCP-Specific Variables (apps/omnii_mcp/.env)

| Old Name (Current) | New Name (Namespaced) | Affected Apps | Migration Note |
|--------------------|-----------------------|---------------|----------------|
| BASE_URL | MCP_BASE_URL | omnii_mcp | Update app code |
| PUBLIC_URL | MCP_PUBLIC_URL | omnii_mcp | Update app code |
| PORT | MCP_PORT | omnii_mcp | Update app code (keep root PORT as default) |
| GOOGLE_REDIRECT_URI | MCP_GOOGLE_REDIRECT_URI | omnii_mcp | Update app code |
| TWILIO_ACCOUNT_SID | MCP_TWILIO_ACCOUNT_SID | omnii_mcp | Update app code |
| TWILIO_AUTH_TOKEN | MCP_TWILIO_AUTH_TOKEN | omnii_mcp | Update app code |
| TWILIO_PHONE_NUMBER | MCP_TWILIO_PHONE_NUMBER | omnii_mcp | Update app code |
| RDF_PYTHON_SERVICE_URL | MCP_RDF_PYTHON_SERVICE_URL | omnii_mcp | Update app code |
| RDF_PYTHON_SERVICE_OVERRIDE_URL | MCP_RDF_PYTHON_SERVICE_OVERRIDE_URL | omnii_mcp | Update app code |

### 4.3 Mobile-Specific Variables (KEEP AS-IS)

**No changes needed** - EXPO_PUBLIC_* is already namespaced correctly for React Native Metro.

**Variables to keep unchanged:**
- EXPO_PUBLIC_APP_VERSION
- EXPO_PUBLIC_BACKEND_BASE_URL
- EXPO_PUBLIC_DEV_LAN_IP
- EXPO_PUBLIC_ENVIRONMENT
- EXPO_PUBLIC_GOOGLE_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
- EXPO_PUBLIC_NEO4J_PASSWORD
- EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_USE_DIRECT_N8N
- EXPO_PUBLIC_USE_HTTP_CHAT

### 4.4 N8N Variables (Already Namespaced - KEEP AS-IS)

**No changes needed** - N8N_* prefix already correct.

- N8N_AGENT_ENABLED
- N8N_AGENT_SWARM_URL
- N8N_AGENT_TIMEOUT
- N8N_ENABLED_AGENTS
- N8N_FALLBACK_ENABLED
- N8N_HEALTH_CHECK_INTERVAL
- N8N_PERFORMANCE_TRACKING
- N8N_REQUEST_LOGGING
- N8N_RETRY_ATTEMPTS

### 4.5 Standard Variables (KEEP AS-IS)

**No changes needed** - ecosystem standards.

- NODE_ENV
- CI
- DEBUG
- DEBUG_FD
- ENVIRONMENT
- VERCEL_ENV
- RAILWAY_ENVIRONMENT
- RAILWAY_STATIC_URL

### 4.6 Unique Standalone Variables (Evaluation Required)

**From standalone omnii-mcp (not in monorepo):**

| Variable | Purpose | Decision | Action |
|----------|---------|----------|--------|
| ANTHROPIC_API_KEY | Claude API access | MIGRATE | Add as `OMNII_ANTHROPIC_API_KEY` (shared) |
| DEBUG_AUTH | Auth debugging flag | EVALUATE | Check if used in code, may be deprecated |
| GOOGLE_CALENDAR_INTEGRATION_ID | Composio integration ID | EVALUATE | May be obsolete with Composio migration |
| GOOGLE_CREDENTIALS_PATH | Service account JSON path | EVALUATE | May be deprecated (using OAuth now) |
| JWT_ISSUER | JWT token issuer | EVALUATE | Check if better-auth replacement made this obsolete |
| JWT_SECRET | JWT signing secret | EVALUATE | Check if better-auth replacement made this obsolete |
| LANGSMITH_API_KEY | LangSmith tracing | MIGRATE | Add as `OMNII_LANGSMITH_API_KEY` (optional) |
| MCP_SERVER_URL | MCP server endpoint | MIGRATE | Add as `MCP_SERVER_URL` (app-specific) |
| OAUTH_ENCRYPTION_KEY | OAuth token encryption | EVALUATE | Check if better-auth handles this |
| TWILIO_TEST_PHONE_NUMBER | Testing phone number | MIGRATE | Add as `MCP_TWILIO_TEST_PHONE_NUMBER` |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis auth | MIGRATE | Add as `OMNII_UPSTASH_REDIS_REST_TOKEN` (alternative to REDIS_URL) |
| UPSTASH_REDIS_REST_URL | Upstash Redis endpoint | MIGRATE | Add as `OMNII_UPSTASH_REDIS_REST_URL` (alternative to REDIS_URL) |

**Recommendation:** During omnii-mcp migration (Plan 00-05), grep codebase for each unique variable to determine if actively used.

---

## Section 5: Environment Loading Order & Precedence

### 5.1 Loading Strategy (Turborepo + Dotenv)

Turborepo and Bun/Node.js will load environment variables in this order (later overrides earlier):

```
1. System environment (highest precedence)
   ├─ Actual OS environment variables
   └─ CI/CD injected secrets

2. Root .env (shared defaults)
   └─ /Users/santino/Projects/Omnii One/.env
      (Contains OMNII_* shared infrastructure vars)

3. App-level .env (app-specific defaults)
   └─ /Users/santino/Projects/Omnii One/apps/{app}/.env
      (Contains MCP_*, app-specific vars)

4. App-level .env.local (local overrides, gitignored)
   └─ /Users/santino/Projects/Omnii One/apps/{app}/.env.local
      (Developer-specific overrides, never committed)
      (Highest precedence for local development)
```

### 5.2 .gitignore Configuration

```gitignore
# Root
.env
.env.local
.env.*.local

# Apps
apps/*/.env
apps/*/.env.local

# Keep templates
!.env.example
!apps/*/.env.example
```

### 5.3 Example: Developer Local Override

**Scenario:** Developer wants to test MCP with local Neo4j instead of cloud.

**Root .env (committed template):**
```bash
# Shared infrastructure (production defaults)
OMNII_NEO4J_URI=neo4j+s://abc123.databases.neo4j.io
OMNII_NEO4J_USER=neo4j
OMNII_NEO4J_PASSWORD=  # Fill from 1Password
```

**apps/omnii_mcp/.env.local (gitignored, developer-specific):**
```bash
# Override for local testing
OMNII_NEO4J_URI=bolt://localhost:7687
OMNII_NEO4J_PASSWORD=local_password
```

**Result:** MCP app loads cloud defaults from root, overridden by local bolt:// connection.

### 5.4 Turborepo Cache Invalidation

When environment variables change, Turborepo must invalidate cache. See Section 6 for turbo.json configuration.

---

## Section 6: Turborepo Integration

### 6.1 globalEnv Configuration

**Purpose:** Variables that affect ALL tasks across workspace. Changes to these invalidate entire cache.

**Recommended globalEnv:**
```json
"globalEnv": [
  "CI",
  "NODE_ENV",
  "OMNII_SUPABASE_URL",
  "OMNII_SUPABASE_ANON_KEY",
  "OMNII_NEO4J_URI",
  "OMNII_OPENAI_API_KEY",
  "OMNII_COMPOSIO_API_KEY"
]
```

**Why these?**
- CI, NODE_ENV: Affect build outputs across all apps
- OMNII_SUPABASE_URL: Database connection affects all apps
- OMNII_NEO4J_URI: Graph database affects MCP apps
- OMNII_OPENAI_API_KEY: AI services affect MCP apps

### 6.2 Task-Level env Configuration

**Purpose:** Variables that only affect specific tasks. Changes invalidate only that task's cache.

**Recommended task env:**
```json
{
  "build": {
    "dependsOn": ["^build"],
    "outputs": [".cache/tsbuildinfo.json", "dist/**", ".expo/**"],
    "env": [
      "OMNII_NEO4J_URI",
      "OMNII_NEO4J_USER",
      "OMNII_NEO4J_PASSWORD",
      "OMNII_REDIS_URL",
      "MCP_*",
      "N8N_*",
      "EXPO_PUBLIC_*"
    ]
  },
  "dev": {
    "cache": false,
    "persistent": false
  },
  "test": {
    "env": [
      "OMNII_TEST_ENV",
      "TEST_*"
    ]
  }
}
```

**Wildcard support:** Turborepo supports `MCP_*`, `N8N_*`, `EXPO_PUBLIC_*` wildcards to catch all app-specific vars.

### 6.3 globalDependencies for .env Files

**Purpose:** Invalidate cache when .env files change (even if var values unchanged).

**Recommended globalDependencies:**
```json
"globalDependencies": [
  "**/.env",
  "**/.env.local",
  "**/.env.example"
]
```

**Why .env.example?** If template changes, it likely means new vars added or structure changed - worth invalidating cache.

---

## Section 7: Migration Execution Plan

### 7.1 Phase 0 (Preparation - This Plan)

**Deliverables:**
- [x] ENV-RECONCILIATION.md (this document)
- [ ] Updated turbo.json with env awareness
- [ ] Root .env.example with all shared vars
- [ ] App-level .env.example templates

### 7.2 Phase 1 (MCP Migration - Plan 00-05)

**Steps:**
1. Grep standalone omnii-mcp for unique vars (ANTHROPIC_API_KEY, etc.)
2. Determine which are actively used vs. deprecated
3. Add active unique vars to monorepo with `OMNII_*` or `MCP_*` prefix
4. Update monorepo MCP code to use namespaced vars (find/replace)
5. Test MCP app with new env var names
6. Archive standalone omnii-mcp

### 7.3 Phase 2 (Mobile Migration - Plan 00-06)

**Steps:**
1. Verify EXPO_PUBLIC_* vars aligned between standalone and monorepo
2. No namespace changes needed (already correct)
3. Test mobile app builds with Expo SDK 53
4. Archive standalone omnii-mobile

### 7.4 Phase 3 (Root Namespace Migration - Separate Plan)

**Steps (Future):**
1. Create migration script: `scripts/migrate-env-vars.ts`
2. Find/replace across codebase:
   - `process.env.SUPABASE_URL` → `process.env.OMNII_SUPABASE_URL`
   - `process.env.NEO4J_URI` → `process.env.OMNII_NEO4J_URI`
   - etc.
3. Update all .env.example files
4. Run tests to verify no breakage
5. Commit with message: `refactor(env): namespace shared infrastructure vars with OMNII_ prefix`

---

## Section 8: Security Considerations

### 8.1 Secret Management Best Practices

**DO:**
- Store production secrets in 1Password/Vault, not .env files
- Use .env.example as documentation (no real values)
- Gitignore all .env and .env.local files
- Use Vercel/Railway environment variable UI for deployments
- Rotate secrets regularly (especially after team member departure)

**DON'T:**
- Commit .env files with real values (even accidentally)
- Share .env files via Slack/email
- Log environment variable values (even in DEBUG mode)
- Expose `SUPABASE_SERVICE_ROLE_KEY` to client (mobile/web)

### 8.2 Client vs. Server Variable Separation

| Variable Type | Storage | Exposure | Examples |
|---------------|---------|----------|----------|
| **Server-only secrets** | Backend .env, never bundled | Server only | `OMNII_SUPABASE_SERVICE_ROLE_KEY`, `OMNII_OPENAI_API_KEY`, `MCP_TWILIO_AUTH_TOKEN` |
| **Client-safe public vars** | EXPO_PUBLIC_*, bundled into app | Client + Server | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| **Build-time vars** | CI/CD environment | Build process only | `CI`, `VERCEL_ENV`, `RAILWAY_ENVIRONMENT` |

**Critical Rule:** Never prefix server secrets with `EXPO_PUBLIC_` - they'll be bundled into React Native app and exposed to users.

### 8.3 Audit Log

**When migrating, audit for accidental exposure:**

```bash
# Check for leaked secrets in bundled mobile app
cd apps/omnii-mobile
expo export:web --dev
grep -r "SERVICE_ROLE_KEY" .expo/  # Should be empty

# Check for secrets in git history (if paranoid)
git log -p --all | grep "SUPABASE_SERVICE_ROLE_KEY"
```

---

## Appendix A: Variable Reference Quick Lookup

### Infrastructure (Shared - Root .env)

```bash
# Supabase (PostgreSQL + Auth)
OMNII_POSTGRES_URL=
OMNII_SUPABASE_URL=
OMNII_SUPABASE_ANON_KEY=
OMNII_SUPABASE_SERVICE_ROLE_KEY=

# Neo4j (Graph Database)
OMNII_NEO4J_URI=
OMNII_NEO4J_USER=
OMNII_NEO4J_PASSWORD=
OMNII_NEO4J_DATABASE=

# Redis (Caching)
OMNII_REDIS_URL=

# AI/ML Services
OMNII_OPENAI_API_KEY=
OMNII_ANTHROPIC_API_KEY=
OMNII_COMPOSIO_API_KEY=

# Google OAuth
OMNII_GOOGLE_CLIENT_ID=
OMNII_GOOGLE_CLIENT_SECRET=

# Authentication (better-auth)
OMNII_AUTH_SECRET=
OMNII_AUTH_DISCORD_ID=
OMNII_AUTH_DISCORD_SECRET=
```

### MCP Backend (apps/omnii_mcp/.env)

```bash
# Server Configuration
MCP_BASE_URL=
MCP_PUBLIC_URL=
MCP_PORT=8000

# Twilio (SMS)
MCP_TWILIO_ACCOUNT_SID=
MCP_TWILIO_AUTH_TOKEN=
MCP_TWILIO_PHONE_NUMBER=

# RDF Python Service
MCP_RDF_PYTHON_SERVICE_URL=

# n8n Agent Integration
N8N_AGENT_ENABLED=false
N8N_AGENT_SWARM_URL=
N8N_AGENT_TIMEOUT=30000
```

### Mobile App (apps/omnii-mobile/.env)

```bash
# Expo Public Variables (bundled into app)
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_BACKEND_BASE_URL=
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Appendix B: Migration Checklist

**Phase 0 (Preparation):**
- [x] Document all environment variables (this file)
- [ ] Update turbo.json with globalEnv and task env
- [ ] Create root .env.example
- [ ] Add globalDependencies for .env files

**Phase 1 (MCP Migration):**
- [ ] Grep standalone omnii-mcp for unique var usage
- [ ] Migrate unique vars to monorepo (namespaced)
- [ ] Update MCP code to use OMNII_* prefix for shared vars
- [ ] Update MCP code to use MCP_* prefix for app-specific vars
- [ ] Test MCP app with new env var names
- [ ] Update apps/omnii_mcp/.env.example

**Phase 2 (Mobile Migration):**
- [ ] Verify EXPO_PUBLIC_* alignment
- [ ] Test mobile app with React 19
- [ ] Update apps/omnii-mobile/.env.example

**Phase 3 (Root Namespace Migration - Future):**
- [ ] Create migration script (find/replace)
- [ ] Update all process.env references
- [ ] Update all .env.example files
- [ ] Run full test suite
- [ ] Update documentation

**Phase 4 (Verification):**
- [ ] Turborepo cache invalidation works (change var, verify rebuild)
- [ ] No secrets leaked in bundled mobile app
- [ ] All apps start successfully with new var names
- [ ] Environment variable documentation complete

---

**Document Status:** Complete
**Next Steps:**
1. Update turbo.json with env awareness (Task 2)
2. Create .env.example templates (Task 2)
3. During MCP migration, implement namespacing for actively-used vars
