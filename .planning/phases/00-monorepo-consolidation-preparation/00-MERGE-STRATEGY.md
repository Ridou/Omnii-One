# Merge Strategy: Monorepo Consolidation

**Purpose:** Define concrete decisions for merging omnii-mobile and omnii-mcp standalone repos into the Omnii One monorepo.

**Based On:** `00-DIVERGENCE.md` analysis
**Decision Date:** 2026-01-24
**Execution Phase:** Phase 0 (Plans 03-05)

---

## Executive Summary

**Strategy:** Upgrade standalone repos to match monorepo versions, then migrate codebases.

**Source of Truth:** Monorepo for all domains (mobile, MCP, graph schema)

**Migration Order:** MCP first (low risk), Mobile second (high risk, needs testing)

**Risk Mitigation:** Strict version resolutions, comprehensive testing, atomic commits

---

## 1. Source of Truth Decisions

### Domain-by-Domain Decisions

| Domain | Source of Truth | Rationale | Confidence |
|--------|-----------------|-----------|------------|
| **Mobile Architecture** | Monorepo (`apps/omnii-mobile`) | Expo 53, React 19, React Native 0.79.3, workspace integration, tRPC/React Query | HIGH |
| **MCP Backend** | Monorepo (`apps/omnii_mcp`) | 2x more code (28K lines), structured architecture, RDF/n8n features, workspace deps | VERY HIGH |
| **Graph Schema** | Monorepo (`apps/omnii_mcp`) | Single active source, most recent development (2026-01-24) | VERY HIGH |
| **Shared Packages** | Monorepo (`packages/*`) | Established workspace structure, tRPC API, validators, configs | HIGH |
| **Tooling/Config** | Monorepo (`tooling/*`, root configs) | Turborepo, pnpm, eslint/prettier catalogs | HIGH |

### Standalone Repo Disposition

| Repo | Status After Migration | Preservation Strategy |
|------|------------------------|----------------------|
| `omnii-mobile` | ARCHIVED | Tag `v1.0.0-pre-monorepo`, update README, keep for git history |
| `omnii-mcp` | ARCHIVED | Tag `v1.0.0-pre-monorepo`, update README, keep for git history |

**Archive Timeline:** After Phase 0 completion and verification

---

## 2. Migration Order

### Phase 0 Plan 03: MCP Migration (LOW RISK)

**Execute First Because:**
- Standalone MCP is strict subset of monorepo MCP
- No unique features to preserve (all features exist in monorepo)
- Backend-only (no UI testing complexity)
- Clear diff and cherry-pick workflow
- 7-month development gap (standalone is stale)

**Migration Steps:**
1. Diff standalone MCP against monorepo MCP
2. Identify any unique bug fixes in standalone (if any)
3. Cherry-pick unique fixes to monorepo
4. Verify all monorepo MCP tests pass
5. Archive standalone repo

**Success Criteria:**
- All standalone MCP functionality verified in monorepo
- Test suite passes (30+ test scripts)
- No regression in API endpoints
- Environment variables migrated to new namespace

### Phase 0 Plan 04: Mobile Migration (HIGH RISK)

**Execute Second Because:**
- React Native version conflicts require careful testing
- React 18 → 19 upgrade needs validation
- Expo SDK 52 → 53 has breaking changes
- expo-router 4 → 5 migration
- Must preserve EAS build scripts
- UI/UX testing required across iOS/Android/Web

**Pre-Migration Requirements:**
1. ✅ MCP migration complete (mobile depends on backend)
2. ✅ Environment variables namespaced
3. ✅ Test environment configured for React 19

**Migration Steps:**
1. Add EAS build scripts from standalone to monorepo
2. Create feature branch for mobile migration
3. Copy any unique features (verify none exist first)
4. Update imports to use `@omnii/api`, `@omnii/validators`
5. Run full test suite (UI, integration, E2E)
6. Test on physical iOS/Android devices
7. Verify web build works
8. Merge to main after approval
9. Archive standalone repo

**Success Criteria:**
- All screens render correctly on iOS/Android/Web
- Navigation works with expo-router v5
- Authentication flow works end-to-end
- tRPC integration connects to monorepo MCP
- No console errors or warnings
- Build succeeds for all platforms

### Phase 0 Plan 05: Final Consolidation

**Cleanup Tasks:**
1. Update all documentation references
2. Archive standalone repos with proper tags
3. Update CLAUDE.md with final structure
4. Remove any temporary migration files
5. Verify sherif workspace linting passes
6. Update STATE.md with completion

---

## 3. Version Reconciliation Plan

### Root package.json Resolutions

Add to `/Users/santino/Projects/Omnii One/package.json`:

```json
{
  "name": "Omnii",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "pnpm": {
    "overrides": {
      "react": "19.0.0",
      "react-dom": "19.0.0",
      "react-native": "0.79.3",
      "expo": "53.0.10",
      "expo-router": "5.0.7",
      "@react-native-async-storage/async-storage": "2.1.2",
      "react-native-reanimated": "3.18.0",
      "react-native-gesture-handler": "2.24.0",
      "react-native-screens": "4.11.1",
      "react-native-safe-area-context": "5.4.0",
      "react-native-svg": "15.11.2",
      "react-native-web": "0.20.0",
      "nativewind": "4.1.23"
    }
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=10.0.0"
  }
}
```

### pnpm Configuration Updates

Add to `/.npmrc` (if not already present):

```ini
# React Native Metro bundler compatibility
shamefully-hoist=true
auto-install-peers=true

# Strict version resolution
strict-peer-dependencies=false

# Workspace protocol
prefer-workspace-packages=true
```

### Dependency Catalog Updates

Update `/pnpm-workspace.yaml`:

```yaml
catalog:
  prettier: ^3.0.0
  eslint: ^9.0.0
  typescript: ^5.8.3
  tailwindcss: ^3.4.0
  zod: ^3.25.43
  "@trpc/server": ^11.1.4
  "@tanstack/react-query": ^5.0.0
  "@trpc/client": ^11.1.4
  "@trpc/tanstack-react-query": ^11.1.4
  react19: ^19.0.0

catalogs:
  react19:
    react: 19.0.0
    react-dom: 19.0.0
    "@types/react": ^19.0.14
    "@types/react-dom": ^19.0.14
```

### Version Upgrade Verification

After setting resolutions:

```bash
# Clear all node_modules and lockfile
pnpm clean

# Reinstall with strict resolutions
pnpm install

# Verify versions
pnpm why react          # Should show 19.0.0
pnpm why react-native   # Should show 0.79.3
pnpm why expo           # Should show 53.0.10

# Run workspace linting
pnpm lint:ws            # sherif check
```

---

## 4. Environment Variable Namespace Plan

### Namespace Convention

| Prefix | Purpose | Example |
|--------|---------|---------|
| `OMNII_*` | Shared/global config | `OMNII_LOG_LEVEL` |
| `MCP_*` | MCP-specific config | `MCP_PORT`, `MCP_TIMEOUT` |
| `MOBILE_*` | Mobile-specific config | `MOBILE_DEEP_LINK_SCHEME` |
| `EXPO_PUBLIC_*` | Expo client-side (keep as-is) | `EXPO_PUBLIC_BACKEND_BASE_URL` |
| `NEO4J_*` | Neo4j database (keep as-is) | `NEO4J_URI`, `NEO4J_PASSWORD` |
| `SUPABASE_*` | Supabase (keep as-is) | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `GOOGLE_*` | Google OAuth (keep as-is) | `GOOGLE_CLIENT_ID` |
| `TWILIO_*` | Twilio SMS (keep as-is) | `TWILIO_ACCOUNT_SID` |
| `N8N_*` | n8n agent (keep as-is) | `N8N_AGENT_ENABLED` |
| `RDF_*` | RDF Python service (keep as-is) | `RDF_PYTHON_SERVICE_URL` |

### Environment Variable Migration Mapping

#### Mobile Variables (No Changes Needed)

All monorepo mobile variables already follow conventions:

```
✅ EXPO_PUBLIC_* (13 vars) - Keep as-is
✅ GOOGLE_CLIENT_SECRET - Keep as-is
✅ CORS_ORIGINS - Keep as-is
✅ NODE_ENV - Standard
✅ DEBUG - Standard
```

#### MCP Variables (Minor Changes)

**Variables to Rename:**

| Old Name (Standalone) | New Name (Monorepo) | Notes |
|-----------------------|---------------------|-------|
| `BASE_URL` | `MCP_BASE_URL` | Clarify scope |
| `PUBLIC_URL` | `MCP_PUBLIC_URL` | Clarify scope |
| `PORT` | `MCP_PORT` | Clarify scope |

**Variables Already Namespaced (Keep):**

```
✅ NEO4J_* (4 vars)
✅ SUPABASE_* (3 vars)
✅ N8N_* (10 vars)
✅ GOOGLE_* (3 vars)
✅ TWILIO_* (3 vars)
✅ RDF_* (2 vars)
✅ COMPOSIO_API_KEY
✅ OPENAI_API_KEY
✅ REDIS_URL
```

**Variables to Add from Standalone:**

These standalone MCP variables should be added to monorepo:

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API access | Optional |
| `LANGSMITH_API_KEY` | LangSmith tracing | Optional |
| `OAUTH_ENCRYPTION_KEY` | OAuth token encryption | Required |
| `JWT_SECRET` | JWT signing | Required |
| `JWT_ISSUER` | JWT issuer claim | Required |

### .env.example Files

**Root `.env.example` (monorepo):**

```bash
# ================================
# Omnii One - Environment Variables
# ================================

# ----- Shared Configuration -----
NODE_ENV=development
DEBUG=false

# ----- Neo4j Database -----
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=omnii

# ----- Supabase -----
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ----- Google OAuth -----
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8081/auth/google/callback

# ----- MCP Server -----
MCP_PORT=8081
MCP_BASE_URL=http://localhost:8081
MCP_PUBLIC_URL=https://your-domain.com

# ----- n8n Agent -----
N8N_AGENT_ENABLED=true
N8N_AGENT_SWARM_URL=http://localhost:5678
N8N_AGENT_TIMEOUT=30000
N8N_ENABLED_AGENTS=calendar,email,tasks
N8N_FALLBACK_ENABLED=true
N8N_HEALTH_CHECK_INTERVAL=60000
N8N_PERFORMANCE_TRACKING=true
N8N_REQUEST_LOGGING=false
N8N_RETRY_ATTEMPTS=3

# ----- RDF Python Service -----
RDF_PYTHON_SERVICE_URL=http://localhost:5000
RDF_PYTHON_SERVICE_OVERRIDE_URL=

# ----- Redis Cache -----
REDIS_URL=redis://localhost:6379
DISABLE_REDIS=false

# ----- Memory/Context -----
MEMORY_BRIDGE_ENABLED=true
MEMORY_CACHE_TTL=3600
CONTEXT_RETRIEVAL_TIMEOUT=5000

# ----- AI Services -----
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-your_anthropic_key
COMPOSIO_API_KEY=your_composio_key

# ----- Twilio SMS -----
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ----- Security -----
OAUTH_ENCRYPTION_KEY=your_32_byte_encryption_key
JWT_SECRET=your_jwt_secret
JWT_ISSUER=omnii

# ----- Mobile (Expo) -----
EXPO_PUBLIC_BACKEND_BASE_URL=http://localhost:8081
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_your_stripe_key
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_DEV_LAN_IP=192.168.1.100
EXPO_PUBLIC_NEO4J_PASSWORD=your_password
EXPO_PUBLIC_USE_DIRECT_N8N=false
EXPO_PUBLIC_USE_HTTP_CHAT=false

# ----- Development/Testing -----
TEST_BASE_URL=http://localhost:8081
TEST_GOOGLE_CLIENT_ID=your_test_client_id
TEST_SUPABASE_URL=https://your-test-project.supabase.co
TEST_SUPABASE_ANON_KEY=your_test_anon_key
```

**App-specific .env files:**

- `apps/omnii_mcp/.env.example` - MCP-specific vars only
- `apps/omnii-mobile/.env.example` - Mobile-specific vars only

### Environment Variable Loading

**MCP (`apps/omnii_mcp/src/config/env.validation.ts`):**

Already has environment validation. Ensure it includes new variables:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MCP_PORT: z.string().default('8081'),
  MCP_BASE_URL: z.string().url(),
  MCP_PUBLIC_URL: z.string().url().optional(),

  // Neo4j
  NEO4J_URI: z.string(),
  NEO4J_USER: z.string(),
  NEO4J_PASSWORD: z.string(),
  NEO4J_DATABASE: z.string().default('omnii'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // OAuth
  OAUTH_ENCRYPTION_KEY: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('omnii'),

  // ... rest of env vars
});

export const env = envSchema.parse(process.env);
```

**Mobile:**

Expo automatically exposes `EXPO_PUBLIC_*` variables. No validation needed (runtime errors will surface).

---

## 5. Package Naming Convention

### Scoped Package Standard

**All packages use `@omnii/*` scope:**

| Package Type | Naming Pattern | Example |
|--------------|----------------|---------|
| Apps | `@omnii/{app-name}` | `@omnii/omnii-mobile`, `@omnii/omnii_mcp` |
| Shared Packages | `@omnii/{package-name}` | `@omnii/api`, `@omnii/validators` |
| Tooling | `@omnii/{tool-name}-config` | `@omnii/eslint-config`, `@omnii/tsconfig` |

### Migration Renames

**Standalone → Monorepo:**

| Old Name | New Name | Type |
|----------|----------|------|
| `bolt-expo-starter` | `@omnii/omnii-mobile` | App |
| `omnii-mcp` | `@omnii/omnii_mcp` | App |

**Note:** The monorepo already has correct names. No action needed.

---

## 6. Workspace Dependencies

### Current Monorepo Structure

```
packages/
├── api/              # @omnii/api - tRPC API definitions
├── auth/             # @omnii/auth - Authentication utilities
├── db/               # @omnii/db - Supabase client
├── ui/               # @omnii/ui - Shared UI components
└── validators/       # @omnii/validators - Zod schemas

tooling/
├── eslint-config/    # @omnii/eslint-config
├── prettier-config/  # @omnii/prettier-config
├── tailwind-config/  # @omnii/tailwind-config
└── typescript/       # @omnii/tsconfig
```

### Standalone Migration to Workspace Deps

**MCP:**
Already uses:
- `@omnii/api: workspace:*`
- `@omnii/validators: workspace:*`

**Mobile:**
Already uses:
- `@omnii/tailwind-config: workspace:^`
- `@omnii/validators: workspace:^`

**No migration needed** - both apps already integrated.

### Future Shared Packages

**Candidates for extraction (future phases):**

| Feature | Current Location | Extract To | Phase |
|---------|------------------|------------|-------|
| Graph utilities | `apps/omnii_mcp/src/services/neo4j/` | `@omnii/graph-utils` | Phase 1 |
| MCP client | `apps/omnii-mobile/src/lib/mcp/` | `@omnii/mcp-client` | Phase 2 |
| RDF schemas | `apps/omnii_mcp/src/types/rdf-schemas.ts` | `@omnii/rdf` | Phase 3 |

---

## 7. Risk Assessment

### Risk Matrix

| Risk | Likelihood | Impact | Severity | Mitigation |
|------|------------|--------|----------|------------|
| **React Native 0.76 → 0.79 breaks mobile** | HIGH | HIGH | CRITICAL | Strict pnpm resolutions, test on physical devices |
| **React 18 → 19 breaks UI components** | MEDIUM | HIGH | HIGH | Comprehensive UI testing, gradual migration |
| **Expo SDK 53 incompatibility** | MEDIUM | HIGH | HIGH | Follow Expo upgrade guide, test all modules |
| **expo-router 4 → 5 routing breaks** | MEDIUM | MEDIUM | MEDIUM | Review routing changes, test navigation flows |
| **Lost standalone features** | LOW | HIGH | MEDIUM | Thorough diff before migration, feature inventory |
| **Environment variable collisions** | LOW | MEDIUM | LOW | Namespace all vars, use validation schemas |
| **Workspace dependency conflicts** | LOW | LOW | LOW | pnpm overrides, sherif linting |
| **Build failures on iOS/Android** | MEDIUM | HIGH | HIGH | Native build testing, EAS build validation |
| **Test suite regressions** | MEDIUM | MEDIUM | MEDIUM | Run full test suite before merge |

### Critical Path Items

**Must Complete Before Migration:**

1. ✅ Divergence analysis (this plan)
2. ✅ Merge strategy decisions (this document)
3. [ ] Set up test environment for React 19
4. [ ] Configure EAS build for monorepo
5. [ ] Create comprehensive test plan
6. [ ] Back up standalone repos

**Rollback Strategy:**

If migration fails:
1. Revert merge commits
2. Restore standalone repos from tags
3. Document failure reasons
4. Re-plan migration with lessons learned

---

## 8. Testing Strategy

### MCP Testing (Plan 03)

**Pre-Migration Tests:**
```bash
# In standalone omnii-mcp
cd /Users/santino/Projects/omnii-mcp
pnpm test:all              # All tests
pnpm test:neo4j            # Neo4j integration
pnpm test:mcp              # MCP protocol
pnpm test:integration      # Integration tests
```

**Post-Migration Tests:**
```bash
# In monorepo
cd /Users/santino/Projects/Omnii One
pnpm turbo run test --filter=@omnii/omnii_mcp
pnpm turbo run test:neo4j --filter=@omnii/omnii_mcp
pnpm turbo run test:mcp --filter=@omnii/omnii_mcp
pnpm turbo run test:integration --filter=@omnii/omnii_mcp
```

**Acceptance Criteria:**
- [ ] All 30+ test scripts pass
- [ ] Neo4j connection works
- [ ] MCP protocol endpoints respond
- [ ] Integration tests pass
- [ ] No console errors

### Mobile Testing (Plan 04)

**Pre-Migration Tests:**
```bash
# In standalone omnii-mobile
cd /Users/santino/Projects/omnii-mobile
pnpm dev:ios              # iOS simulator
pnpm dev:android          # Android emulator
pnpm build:web            # Web build
```

**Post-Migration Tests:**
```bash
# In monorepo
cd /Users/santino/Projects/Omnii One
pnpm turbo run dev --filter=@omnii/omnii-mobile
pnpm android              # Test Android
pnpm ios                  # Test iOS
pnpm turbo run build:web --filter=@omnii/omnii-mobile
```

**Manual Testing Checklist:**
- [ ] App launches on iOS
- [ ] App launches on Android
- [ ] App runs in web browser
- [ ] Authentication flow works (Google OAuth)
- [ ] Navigation between tabs works
- [ ] tRPC queries reach MCP backend
- [ ] UI renders correctly (no layout breaks)
- [ ] No React 19 console warnings
- [ ] expo-router v5 navigation works
- [ ] Deep linking works

**Device Testing:**
- [ ] iPhone (physical device)
- [ ] Android phone (physical device)
- [ ] iPad (simulator)
- [ ] Android tablet (simulator)
- [ ] Web (Chrome, Safari, Firefox)

### Integration Testing

**Full Stack Testing:**
```bash
# Start all services
pnpm dev:local

# Test end-to-end flow
1. Mobile app authenticates via Google
2. Mobile app queries MCP for context
3. MCP retrieves from Neo4j
4. Response displays in mobile UI
```

**Acceptance Criteria:**
- [ ] Mobile ↔ MCP communication works
- [ ] MCP ↔ Neo4j communication works
- [ ] MCP ↔ Supabase authentication works
- [ ] No CORS errors
- [ ] Proper error handling

---

## 9. Migration Execution Timeline

### Phase 0 Plan 03: MCP Migration (1-2 hours)

**Tasks:**
1. Diff standalone vs. monorepo MCP (30 min)
2. Cherry-pick unique fixes (if any) (30 min)
3. Run test suite (15 min)
4. Update environment variables (15 min)
5. Commit and verify (15 min)

**Deliverable:** MCP fully migrated, standalone archived

### Phase 0 Plan 04: Mobile Migration (4-6 hours)

**Tasks:**
1. Add EAS build scripts (30 min)
2. Feature branch creation (15 min)
3. Diff standalone vs. monorepo (1 hour)
4. Update imports to workspace deps (30 min)
5. Run test suite (30 min)
6. Manual testing (iOS/Android/Web) (2 hours)
7. Fix any issues (1 hour buffer)
8. Merge and verify (30 min)

**Deliverable:** Mobile fully migrated, standalone archived

### Phase 0 Plan 05: Consolidation (1 hour)

**Tasks:**
1. Update documentation (30 min)
2. Archive standalone repos (15 min)
3. Verify sherif linting (15 min)
4. Update STATE.md (15 min)

**Deliverable:** Phase 0 complete

**Total Time Estimate:** 6-9 hours for full consolidation

---

## 10. Success Criteria

### Phase 0 Completion Criteria

**Technical:**
- [ ] All standalone MCP functionality in monorepo
- [ ] All standalone mobile functionality in monorepo
- [ ] All tests passing (MCP: 30+ scripts, Mobile: manual tests)
- [ ] Version resolutions enforced (React 19, RN 0.79.3, Expo 53)
- [ ] Environment variables namespaced and validated
- [ ] Workspace dependencies working (`@omnii/*`)
- [ ] Turborepo orchestration functional
- [ ] sherif workspace linting passes
- [ ] No console errors or warnings

**Process:**
- [ ] Divergence analysis complete (00-DIVERGENCE.md)
- [ ] Merge strategy documented (00-MERGE-STRATEGY.md)
- [ ] Migration executed per plan
- [ ] Standalone repos archived with tags
- [ ] Documentation updated (CLAUDE.md, STATE.md)

**Verification:**
- [ ] Full stack runs (`pnpm dev:local`)
- [ ] Mobile app builds for iOS/Android/Web
- [ ] MCP server responds to requests
- [ ] Neo4j connection works
- [ ] Authentication flow works
- [ ] No breaking changes for existing features

---

## 11. Post-Migration Cleanup

### Standalone Repository Archival

**For each standalone repo (`omnii-mobile`, `omnii-mcp`):**

```bash
# Tag final commit
git tag -a v1.0.0-pre-monorepo -m "Final commit before monorepo migration"
git push origin v1.0.0-pre-monorepo

# Update README.md
echo "# ARCHIVED

This repository has been migrated to the [Omnii One monorepo](https://github.com/your-org/omnii-one).

**Last standalone commit:** v1.0.0-pre-monorepo
**Migration date:** 2026-01-24
**New location:** apps/omnii-mobile (or apps/omnii_mcp)

For active development, see the monorepo.
" > README.md

git add README.md
git commit -m "docs: archive repo after monorepo migration"
git push origin main
```

### Documentation Updates

**Files to update:**

1. `.planning/CLAUDE.md` - Remove standalone repo references
2. `.planning/STATE.md` - Mark Phase 0 complete
3. `.planning/PROJECT.md` - Update architecture diagram
4. Root `README.md` - Document new structure
5. `apps/omnii-mobile/README.md` - Update with monorepo context
6. `apps/omnii_mcp/README.md` - Update with monorepo context

### Final Verification

```bash
# Clean install
pnpm clean
pnpm install

# Run all builds
pnpm build

# Run all tests
pnpm test

# Lint workspace
pnpm lint:ws

# Type check all packages
pnpm typecheck
```

---

## Appendix A: Decision Log

| Decision ID | Decision | Rationale | Date |
|-------------|----------|-----------|------|
| MERGE-001 | Monorepo is source of truth for all domains | Newer versions, better architecture, active development | 2026-01-24 |
| MERGE-002 | MCP migrates before Mobile | Lower risk, no UI testing, backend-only | 2026-01-24 |
| MERGE-003 | React 19 for all packages | Monorepo already on 19, future-proof | 2026-01-24 |
| MERGE-004 | Expo SDK 53 for mobile | Monorepo already on 53, latest stable | 2026-01-24 |
| MERGE-005 | Archive standalone repos (don't delete) | Preserve git history for reference | 2026-01-24 |
| MERGE-006 | MCP_* prefix for MCP env vars | Clarity and namespace collision prevention | 2026-01-24 |
| MERGE-007 | Use pnpm overrides for version resolution | Strict version control across workspace | 2026-01-24 |

---

## Appendix B: Reference Links

**Divergence Analysis:** `00-DIVERGENCE.md`
**Project Context:** `.planning/PROJECT.md`
**Requirements:** `.planning/REQUIREMENTS.md`
**Roadmap:** `.planning/ROADMAP.md`
**Current State:** `.planning/STATE.md`

**Expo Upgrade Guide:** https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
**React 19 Migration:** https://react.dev/blog/2024/12/05/react-19
**React Native 0.79:** https://reactnative.dev/blog/2024/10/23/release-0.79

---

**Document Status:** Complete
**Next Step:** Execute Plan 03 (MCP Migration)
**Execution Phase:** Phase 0 Plans 03-05
