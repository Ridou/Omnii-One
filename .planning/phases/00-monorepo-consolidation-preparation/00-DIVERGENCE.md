# Divergence Analysis: Three Codebases

**Purpose:** Document all incompatibilities across omnii (monorepo), omnii-mobile (standalone), and omnii-mcp (standalone) to prevent merge conflicts during Phase 0 consolidation.

**Analysis Date:** 2026-01-24
**Codebases Analyzed:**
- `/Users/santino/Projects/Omnii One` (monorepo - migrated omnii)
- `/Users/santino/Projects/omnii-mobile` (standalone)
- `/Users/santino/Projects/omnii-mcp` (standalone)

---

## Executive Summary

**Critical Finding:** Monorepo versions (Expo 53, React 19, React Native 0.79.3) are NEWER than standalone repos. The monorepo MCP is significantly more developed (28K lines vs 13K lines).

**Migration Direction:** Standalone → Monorepo (upgrade path, not downgrade)

**Risk Level:** HIGH - React Native version jump (0.76.9 → 0.79.3) and React upgrade (18 → 19) require careful testing.

---

## 1. React Native/Expo Version Matrix

### Version Comparison

| Package | Monorepo Mobile | Standalone Mobile | Delta | Risk |
|---------|-----------------|-------------------|-------|------|
| **Expo SDK** | 53.0.10 | ~52.0.46 | +1 major | HIGH |
| **React Native** | 0.79.3 | 0.76.9 | +0.02.4 | HIGH |
| **React** | 19.0.0 | 18.3.1 | +1 major | HIGH |
| **React DOM** | 19.0.0 | 18.3.1 | +1 major | MEDIUM |
| **expo-router** | 5.0.7 | ~4.0.21 | +1 major | HIGH |
| **react-native-reanimated** | ~3.18.0 | 3.16.2 | +0.02.0 | MEDIUM |
| **react-native-gesture-handler** | ~2.24.0 | ~2.20.2 | +0.04.0 | LOW |
| **react-native-screens** | ~4.11.1 | ~4.4.0 | +0.07.1 | MEDIUM |
| **react-native-safe-area-context** | ~5.4.0 | 4.12.0 | +1 major | MEDIUM |
| **@react-native-async-storage** | 2.1.2 | 1.23.1 | +0.08.1 | MEDIUM |
| **react-native-svg** | 15.11.2 | 15.8.0 | +0.03.2 | LOW |
| **react-native-web** | ~0.20.0 | ~0.19.13 | +0.01 | MEDIUM |
| **@types/react** | ^19.0.14 | ~18.3.12 | +1 major | LOW |
| **nativewind** | ~4.1.23 | ^4.1.23 | Same | NONE |
| **tailwindcss** | 3.3.2 | ^3.4.17 | -0.01.15 | LOW |

### Package Namespace Differences

| Aspect | Monorepo | Standalone |
|--------|----------|------------|
| **Package name** | @omnii/omnii-mobile | bolt-expo-starter |
| **Package manager** | pnpm@10.0.0 | (not specified) |
| **Workspace integration** | Yes (`@omnii/tailwind-config`, `@omnii/validators`) | No |
| **tRPC/React Query** | Yes (catalog versions) | No |
| **Neo4j driver** | Yes (5.9.0) | No |
| **Catalog system** | Yes | No |

### Breaking Changes Assessment

**Expo 52 → 53:**
- SDK 53 includes React Native 0.79+ support
- Breaking: expo-router v4 → v5 (file-based routing changes)
- Breaking: Several Expo modules bumped major versions

**React 18 → 19:**
- New concurrent features
- Breaking: Legacy mode removed
- Breaking: Some lifecycle methods deprecated
- Breaking: Automatic batching changes

**React Native 0.76 → 0.79:**
- New Architecture stabilization
- Bridgeless mode improvements
- Breaking: Metro bundler updates
- Breaking: Gradle plugin changes (Android)

### Upgrade Path for Standalone Mobile

1. Upgrade expo-cli to support SDK 53
2. Run `npx expo install --fix` to align all packages
3. Update to React 19 (`react@19.0.0`, `react-dom@19.0.0`)
4. Update to React Native 0.79.3
5. Update expo-router 4 → 5 (check file routing patterns)
6. Test all Expo modules for compatibility
7. Add workspace dependencies (`@omnii/tailwind-config`, `@omnii/validators`)

---

## 2. MCP Server Comparison

### Code Maturity Analysis

| Metric | Monorepo MCP | Standalone MCP | Winner |
|--------|--------------|----------------|--------|
| **Package name** | @omnii/omnii_mcp | omnii-mcp | - |
| **Total TS lines** | ~28,531 | ~13,754 | Monorepo (2.07x) |
| **Service organization** | Structured (11 dirs) | Flat (19 files) | Monorepo |
| **Workspace deps** | Yes (`@omnii/api`, `@omnii/validators`) | No | Monorepo |
| **Git history** | Latest: 2026-01-24 | Latest: 2025-05-31 | Monorepo |

### Service Architecture Comparison

**Monorepo MCP Services (structured):**
```
src/services/
├── action-planner/     (AI-driven action planning)
├── caching/            (Redis/memory caching)
├── context/            (Context building)
├── core/               (Core utilities)
├── integrations/       (Google, Composio, etc.)
├── neo4j/              (Graph database)
├── plugins/            (MCP plugin system)
├── rdf/                (RDF/semantic layer)
└── workflows/          (n8n workflow integration)
```

**Standalone MCP Services (flat):**
```
src/services/
├── action-planner.ts          (single file)
├── action-planner/            (subdirectory)
├── aiClient.ts
├── approval-workflow-manager.ts
├── calendar-temporal-manager.ts
├── contextBuilder.ts
├── entity-recognizer.ts
├── google-contacts-direct.ts
├── graph-service.ts
├── intervention-manager.ts
├── mcp-client-manager.ts
├── mcp-neo4j-server.ts
├── memory.ts
├── neo4j-service.ts
├── plugins/
├── redis-cache.ts
└── response-manager.ts
```

### Dependency Differences

| Dependency | Monorepo | Standalone | Notes |
|------------|----------|------------|-------|
| **@omnii/api** | workspace:* | ❌ Missing | Monorepo has shared tRPC API |
| **@omnii/validators** | workspace:* | ❌ Missing | Monorepo has shared Zod schemas |
| **@supabase/supabase-js** | ^2.50.0 | ^2.38.1 | Monorepo newer |
| **dotenv** | ^16.5.0 | ^16.3.1 | Monorepo newer |
| **elysia** | ^1.3.4 | ^1.3.3 | Monorepo newer |
| **zod** | ^3.25.43 | ^3.25.31 | Monorepo newer |
| **typescript** | ~5.8.3 | ^5.3.2 | Monorepo newer |
| **@types/node** | ^22.15.29 | ^20.6.3 | Monorepo newer |
| **express-rate-limit** | ^7.5.0 | ❌ Missing | Monorepo has rate limiting |
| **ioredis** | ^5.6.1 | ❌ Missing | Monorepo has Redis client |
| **uuid** | ^11.1.0 | ❌ Missing | Monorepo has UUID gen |

### Unique Features Per Codebase

**Monorepo MCP Exclusive Features:**
- RDF/semantic layer integration (`src/services/rdf/`)
- n8n agent integration (`src/services/workflows/`)
- Brain memory schemas (`src/types/brain-memory-schemas.ts`)
- Contact resolution (`src/types/contact-resolution.ts`)
- Unified response validation (`src/types/unified-response.validation.ts`)
- Environment validation (`src/config/env.validation.ts`)
- Axios config with Brotli fix (`src/config/axios.config.ts`)
- Structured caching layer (`src/services/caching/`)

**Standalone MCP Exclusive Features:**
- ❌ None identified - all features appear to be subset of monorepo

### Test Scripts Divergence

**Common scripts:** Both have extensive test coverage with similar patterns

**Monorepo-only scripts:**
- `test:rdf` - RDF integration tests
- `test:rdf-integration` - RDF integration tests

**Standalone-only scripts:**
- (None unique)

### Source of Truth Decision

**MONOREPO MCP** is the source of truth:
- 2x more code (newer development)
- Better organized architecture
- Workspace integration (`@omnii/api`, `@omnii/validators`)
- Newer dependencies
- RDF/n8n features
- More recent git history (2026-01-24 vs 2025-05-31)

**Migration Strategy:**
- Diff standalone against monorepo
- Cherry-pick any unique bug fixes from standalone (if any)
- Discard standalone codebase after verification

---

## 3. Shared Package Dependencies

### Monorepo Shared Packages

The monorepo has established shared packages that standalone repos lack:

| Package | Purpose | Used By |
|---------|---------|---------|
| **@omnii/api** | tRPC API definitions | omnii-mobile, omnii_mcp |
| **@omnii/validators** | Shared Zod schemas | omnii-mobile, omnii_mcp |
| **@omnii/auth** | Authentication utilities | api, db |
| **@omnii/db** | Supabase database client | api |
| **@omnii/ui** | Shared UI components | (future use) |
| **@omnii/tailwind-config** | Tailwind configuration | omnii-mobile |
| **@omnii/eslint-config** | ESLint configuration | All packages |
| **@omnii/prettier-config** | Prettier configuration | All packages |
| **@omnii/tsconfig** | TypeScript configuration | All packages |

### Standalone Repos Missing

**omnii-mobile (standalone):**
- ❌ No `@omnii/api` - no tRPC integration
- ❌ No `@omnii/validators` - duplicate Zod schemas
- ❌ No `@omnii/tailwind-config` - local tailwind config
- ❌ No shared tooling configs

**omnii-mcp (standalone):**
- ❌ No `@omnii/api` - no tRPC integration
- ❌ No `@omnii/validators` - duplicate Zod schemas
- ❌ No shared tooling configs

### Migration Impact

**When migrating standalone repos:**
1. Replace local Zod schemas with `@omnii/validators` imports
2. Integrate tRPC API from `@omnii/api`
3. Adopt shared tooling configs (eslint, prettier, tsconfig)
4. Remove duplicate code

---

## 4. Environment Variable Audit

### Environment Variable Namespace Analysis

#### Monorepo Mobile (21 vars)

**Namespaces:**
- `EXPO_PUBLIC_*` (13 vars) - Client-side Expo variables
- `GOOGLE_*` (1 var) - Google OAuth
- `CORS_*` (1 var) - CORS configuration
- `NODE_ENV` (1 var) - Standard Node
- `TEST_*` (3 vars) - Testing
- Other (2 vars)

**Full List:**
```
CORS_ORIGINS
DEBUG
ENVIRONMENT
EXPO_PUBLIC_APP_VERSION
EXPO_PUBLIC_BACKEND_BASE_URL
EXPO_PUBLIC_DEV_LAN_IP
EXPO_PUBLIC_ENVIRONMENT
EXPO_PUBLIC_GOOGLE_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_NEO4J_PASSWORD
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_USE_DIRECT_N8N
EXPO_PUBLIC_USE_HTTP_CHAT
GOOGLE_CLIENT_SECRET
NODE_ENV
TEST_GOOGLE_CLIENT_ID
TEST_SUPABASE_ANON_KEY
TEST_SUPABASE_URL
```

#### Standalone Mobile (238 vars - includes node_modules)

**Actual App Variables (filtered):**
```
EXPO_PUBLIC_APP_VERSION
EXPO_PUBLIC_BACKEND_BASE_URL
EXPO_PUBLIC_ENVIRONMENT
EXPO_PUBLIC_GOOGLE_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_PROJECT_ID
EXPO_PUBLIC_PROJECT_ROOT
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SUPABASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NODE_ENV
```

**Collision Status:** ✅ No collisions (all shared vars have same names)

#### Monorepo MCP (39 vars)

**Namespaces:**
- `NEO4J_*` (4 vars) - Neo4j database
- `SUPABASE_*` (3 vars) - Supabase
- `N8N_*` (10 vars) - n8n agent configuration
- `GOOGLE_*` (3 vars) - Google OAuth
- `TWILIO_*` (3 vars) - Twilio SMS
- `RDF_*` (2 vars) - RDF Python service
- Other (14 vars)

**Full List:**
```
BASE_URL
COMPOSIO_API_KEY
CONTEXT_RETRIEVAL_TIMEOUT
DEBUG
DEBUG_FD
DISABLE_REDIS
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
MEMORY_BRIDGE_ENABLED
MEMORY_CACHE_TTL
N8N_AGENT_ENABLED
N8N_AGENT_SWARM_URL
N8N_AGENT_TIMEOUT
N8N_ENABLED_AGENTS
N8N_FALLBACK_ENABLED
N8N_HEALTH_CHECK_INTERVAL
N8N_PERFORMANCE_TRACKING
N8N_REQUEST_LOGGING
N8N_RETRY_ATTEMPTS
NEO4J_DATABASE
NEO4J_PASSWORD
NEO4J_URI
NEO4J_USER
NODE_ENV
OPENAI_API_KEY
PORT
PUBLIC_URL
RAILWAY_ENVIRONMENT
RAILWAY_STATIC_URL
RDF_PYTHON_SERVICE_OVERRIDE_URL
RDF_PYTHON_SERVICE_URL
REDIS_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
TEST_BASE_URL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

#### Standalone MCP (42 vars - app only)

**Full List:**
```
ANTHROPIC_API_KEY
BASE_URL
COMPOSIO_API_KEY
CORS_ORIGINS
DEBUG
DEBUG_AUTH
DEBUG_FD
DISABLE_REDIS
GOOGLE_CALENDAR_INTEGRATION_ID
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CREDENTIALS_PATH
GOOGLE_REDIRECT_URI
JWT_ISSUER
JWT_SECRET
LANGSMITH_API_KEY
MCP_SERVER_URL
NEO4J_DATABASE
NEO4J_PASSWORD
NEO4J_URI
NEO4J_USER
NODE_ENV
OAUTH_ENCRYPTION_KEY
OMNII_TEST_ENV
OPENAI_API_KEY
PORT
PUBLIC_URL
REDIS_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
TEST_BASE_URL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
TWILIO_TEST_PHONE_NUMBER
UPSTASH_REDIS_REST_TOKEN
UPSTASH_REDIS_REST_URL
```

### Variable Collision Analysis

**Collisions (same name, potentially different use):**
- `DEBUG` - Used by both mobile and MCP
- `NODE_ENV` - Standard, safe collision
- `GOOGLE_CLIENT_ID` - Same purpose, safe
- `GOOGLE_CLIENT_SECRET` - Same purpose, safe
- `BASE_URL` / `PUBLIC_URL` - MCP only, no collision with mobile
- `SUPABASE_*` - Same purpose across all three

**Unique to Monorepo MCP (not in standalone):**
- All `N8N_*` variables (10 vars) - n8n agent integration
- `RDF_PYTHON_SERVICE_OVERRIDE_URL`
- `RDF_PYTHON_SERVICE_URL`
- `MEMORY_BRIDGE_ENABLED`
- `MEMORY_CACHE_TTL`
- `CONTEXT_RETRIEVAL_TIMEOUT`

**Unique to Standalone MCP (not in monorepo):**
- `ANTHROPIC_API_KEY`
- `DEBUG_AUTH`
- `GOOGLE_CALENDAR_INTEGRATION_ID`
- `GOOGLE_CREDENTIALS_PATH`
- `JWT_ISSUER`
- `JWT_SECRET`
- `LANGSMITH_API_KEY`
- `MCP_SERVER_URL`
- `OAUTH_ENCRYPTION_KEY`
- `OMNII_TEST_ENV`
- `TWILIO_TEST_PHONE_NUMBER`
- `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_URL`

**Unique to Monorepo Mobile (not in standalone):**
- `EXPO_PUBLIC_DEV_LAN_IP`
- `EXPO_PUBLIC_NEO4J_PASSWORD`
- `EXPO_PUBLIC_USE_DIRECT_N8N`
- `EXPO_PUBLIC_USE_HTTP_CHAT`
- `CORS_ORIGINS`

**Unique to Standalone Mobile:**
- `EXPO_PUBLIC_PROJECT_ID`
- `EXPO_PUBLIC_PROJECT_ROOT`

### Environment Variable Namespace Plan

See `00-MERGE-STRATEGY.md` section 4 for detailed namespace migration plan.

---

## 5. Script Name Divergence

### Package.json Scripts Comparison

#### Mobile Scripts

**Common scripts (both have):**
- `start`, `dev`, `dev:local`, `dev:tunnel`, `dev:web`, `dev:ios`, `dev:android`
- `build:web`, `build:web:static`, `build:web:spa`
- `lint`, `android`, `ios`
- `test:oauth`
- `generate:assets*` (asset generation scripts)

**Monorepo mobile only:**
- `screenshots:resize` - Screenshot processing

**Standalone mobile only:**
- `build:dev:ios` - EAS build for iOS
- `build:dev:android` - EAS build for Android
- `build:dev` - EAS build for all platforms

**Turborepo Integration:**
The monorepo mobile scripts will be wrapped by Turborepo tasks in root `turbo.json`.

#### MCP Scripts

**Common scripts (both have):**
- `build`, `build:prod`, `start`, `start:prod`, `dev`
- `test*` (extensive test suite - 30+ test scripts)
- Railway deployment tests

**Monorepo MCP only:**
- `test:rdf`
- `test:rdf-integration`

**Standalone MCP only:**
- (None unique - scripts are identical)

**Standardization Needed:**
All scripts compatible with Turborepo. No conflicts.

### Turborepo Pipeline Integration

**Current root scripts (monorepo):**
```json
{
  "build": "turbo run build",
  "dev": "turbo watch dev --continue",
  "dev:local": "turbo dev --filter=@omnii/omnii_mcp... --filter=@omnii/omnii-mobile...",
  "lint": "turbo run lint --continue",
  "typecheck": "turbo run typecheck"
}
```

**Migration Impact:**
- Standalone mobile scripts can be used as-is
- Standalone MCP scripts can be used as-is
- Turborepo will orchestrate via filters

---

## 6. Unique Features Inventory

### Monorepo-Only Features

**Mobile:**
- tRPC integration with backend
- React Query integration
- Workspace package usage (`@omnii/tailwind-config`, `@omnii/validators`)
- Neo4j driver (direct graph access from mobile)
- Screenshot resize tooling

**MCP:**
- RDF semantic layer (`src/services/rdf/`)
- n8n agent integration (`src/services/workflows/`)
- Brain memory schemas
- Contact resolution
- Unified response validation
- Rate limiting
- ioredis for caching
- Axios Brotli fix for Railway deployment

### Standalone-Only Features

**Mobile:**
- EAS build scripts (can be added to monorepo)
- None architecturally unique

**MCP:**
- ❌ None identified - all features are subset of monorepo

---

## 7. Git History Analysis

### Recent Activity

**Monorepo:**
- Last commit: 2026-01-24 (docs(00-01): complete monorepo bootstrap plan)
- Active development on Phase 0 planning
- Turborepo fully operational

**Standalone Mobile:**
- Last commit: 2025-06-05 (refactor static)
- Focus: OAuth webapp fixes, static export
- Development paused ~7 months

**Standalone MCP:**
- Last commit: 2025-05-31 (Enhanced axios Brotli fix)
- Focus: Railway deployment fixes, Brotli compression
- Development paused ~8 months

### Development Timeline

```
2025-05-31: Standalone MCP last updated
2025-06-05: Standalone Mobile last updated
                [7-8 month gap]
2026-01-24: Monorepo active development
```

**Implication:** Monorepo is the active codebase. Standalone repos are stale.

---

## 8. Critical Incompatibilities Summary

### HIGH RISK

1. **React Native 0.76.9 → 0.79.3** - Breaking changes in Metro, Gradle
2. **Expo SDK 52 → 53** - Major version bump
3. **React 18 → 19** - Concurrent features, lifecycle changes
4. **expo-router 4 → 5** - File routing changes

### MEDIUM RISK

1. **Package namespace** - `@omnii/*` vs standalone names
2. **Workspace dependencies** - Standalone repos lack `@omnii/api`, `@omnii/validators`
3. **Environment variables** - Namespace differences (manageable)

### LOW RISK

1. **Script names** - All compatible with Turborepo
2. **Tooling versions** - Newer in monorepo, safe to upgrade

---

## 9. Migration Order Recommendation

Based on divergence analysis:

### Phase 1: MCP Migration (Lower Risk)
**Why first:**
- Standalone MCP is strict subset of monorepo MCP
- No unique features to preserve
- Simpler dependency graph
- Backend-only (no UI testing needed)

**Steps:**
1. Diff standalone against monorepo
2. Cherry-pick any unique bug fixes
3. Verify all tests pass in monorepo
4. Archive standalone repo

### Phase 2: Mobile Migration (Higher Risk)
**Why second:**
- React Native version conflicts need careful testing
- Must preserve EAS build scripts
- UI/UX testing required
- Expo SDK upgrade validation

**Steps:**
1. Add EAS build scripts to monorepo mobile
2. Test Expo SDK 53 compatibility
3. Test React 19 compatibility
4. Verify all screens render correctly
5. Archive standalone repo

---

## 10. Action Items

### Immediate (Phase 0)
- [x] Document divergences (this file)
- [ ] Create merge strategy (00-MERGE-STRATEGY.md)
- [ ] Define environment variable namespace plan
- [ ] Identify unique features to preserve

### Phase 0 Completion
- [ ] Diff MCP standalone vs monorepo
- [ ] Diff Mobile standalone vs monorepo
- [ ] Create migration checklist
- [ ] Set up testing environment for React 19

### Phase 1 (Execution)
- [ ] Migrate MCP (verify, cherry-pick, archive)
- [ ] Migrate Mobile (upgrade, test, archive)
- [ ] Update all environment variables
- [ ] Consolidate documentation

---

## Appendix A: Version Resolution Strategy

For root `package.json` (see 00-MERGE-STRATEGY.md):

```json
{
  "pnpm": {
    "overrides": {
      "react": "19.0.0",
      "react-dom": "19.0.0",
      "react-native": "0.79.3",
      "expo": "53.0.10"
    }
  },
  "resolutions": {
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-native": "0.79.3",
    "expo": "53.0.10"
  }
}
```

---

## Appendix B: Standalone Repo Preservation

**After successful migration:**
- Archive standalone repos (do NOT delete)
- Tag final commits: `v1.0.0-pre-monorepo`
- Update README with "ARCHIVED - Migrated to Omnii One monorepo"
- Keep for historical reference and git blame

---

**Document Status:** Complete
**Next Step:** Create `00-MERGE-STRATEGY.md` with resolution decisions
