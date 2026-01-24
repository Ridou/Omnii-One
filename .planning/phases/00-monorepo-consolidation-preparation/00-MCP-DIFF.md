# MCP Codebase Comparison

**Date:** 2026-01-24
**Standalone:** `/Users/santino/Projects/omnii-mcp`
**Workspace:** `/Users/santino/Projects/Omnii One/apps/omnii_mcp`

## Executive Summary

**Finding:** The monorepo workspace version is the canonical source of truth. The standalone version is **7-8 months stale** and contains NO unique features.

**Recommendation:** Skip git merge. Document that workspace is canonical. No feature porting needed.

## File Comparison Overview

### Files Only in Workspace (28 unique features/integrations)

The workspace has significantly more features organized in subdirectories:

**Config enhancements:**
- `config/axios.config.ts` - Axios Brotli fix for Railway deployment
- `config/env.validation.ts` - Runtime environment validation
- `config/n8n-agent.config.ts` - n8n agent integration config
- `config/neo4j.config.ts` - Neo4j connection configuration

**Route additions:**
- `routes/brain-monitoring.routes.ts` - Brain/memory monitoring endpoints
- `routes/chat-direct-n8n.ts` - Direct n8n chat integration
- `routes/chat-http.ts` - HTTP chat endpoints
- `routes/n8n-webhooks.ts` - n8n webhook handlers
- `routes/neo4j-direct.ts` - Direct Neo4j query endpoints
- `routes/rdf.ts` - RDF/semantic layer routes

**Service organization (better architecture):**
- `services/caching/` - Redis caching layer (4 files)
- `services/context/` - Context building services (2 files)
- `services/core/` - Core services including action-planner (6 files)
- `services/integrations/` - External integrations (7 files)
- `services/neo4j/` - Neo4j service layer (2 files)
- `services/rdf/` - RDF/semantic layer (8 files)
- `services/workflows/` - Workflow management (6 files)

**Type improvements:**
- `types/brain-memory-schemas.ts` - Brain/memory type definitions
- `types/contact-resolution.ts` - Contact resolution types
- `types/env.d.ts` - Environment variable types
- `types/rdf-schemas.ts` - RDF schema types
- `types/unified-response.types.ts` - Unified response structure
- `types/unified-response.validation.ts` - Response validation

**Utils additions:**
- `utils/debug-logger.ts` - Enhanced debugging
- `utils/object-structure.ts` - Object manipulation utilities
- `utils/rdf-helpers.ts` - RDF helper functions
- `utils/time-memory-helpers.ts` - Time/memory utilities

**Test infrastructure:**
- `test-router.ts` - Test routing utilities
- `scripts/test:rdf` and `scripts/test:rdf-integration` - RDF testing

### Files Only in Standalone (24 legacy files)

The standalone has flat service structure with older implementations:

**Standalone-only services (legacy, superseded by workspace versions):**
- `action-planner.ts` - Superseded by `core/action-planner.ts`
- `aiClient.ts` - Superseded by workspace AI integrations
- `approval-workflow-manager.ts` - Superseded by `workflows/` directory
- `calendar-temporal-manager.ts` - Merged into workspace context services
- `contextBuilder.ts` - Superseded by `context/` directory
- `entity-recognizer.ts` - Merged into workspace core
- `google-contacts-direct.ts` - Superseded by `integrations/` directory
- `graph-service.ts` - Superseded by `neo4j/` directory
- `intervention-manager.ts` - Merged into workflow services
- `mcp-client-manager.ts` - Superseded by workspace MCP implementation
- `mcp-neo4j-server.ts` - Superseded by `neo4j/` directory
- `memory.ts` - Superseded by brain-memory-schemas
- `neo4j-service.ts` - Superseded by `neo4j/` directory
- `redis-cache.ts` - Superseded by `caching/` directory
- `response-manager.ts` - Superseded by unified-response types
- `sms-ai-fallback.ts` - Legacy Twilio integration
- `sms-ai-service.ts` - Legacy Twilio integration
- `sms-ai-simple.ts` - Legacy Twilio integration
- `task-manager.ts` - Merged into core services
- `timezone-manager.ts` - Merged into time-memory-helpers
- `twilio-service.ts` - Legacy Twilio (replaced by n8n SMS)
- `typed-redis-cache.ts` - Superseded by `caching/` directory
- `unified-google-manager.ts` - Superseded by `integrations/` directory
- `websocket-handler.service.ts` - Merged into core services
- `workflow-manager.ts` - Superseded by `workflows/` directory
- `workflow-scheduler.ts` - Superseded by `workflows/` directory

**Standalone-only types:**
- `task-manager.types.ts` - Merged into workspace types

### Files Differing Between Both

**All differing files favor workspace version due to:**
- Newer dependencies (workspace has latest versions)
- Better organization (subdirectories vs. flat)
- Integration with monorepo packages (`@omnii/api`, `@omnii/validators`)
- n8n integration enhancements
- RDF layer additions
- Better error handling

Files with differences:
- `src/app.ts` - Workspace has better routing structure
- `src/config/ngrok.config.ts` - Minor config differences
- `src/routes/index.ts` - Workspace has more routes
- `src/routes/neo4j.ts` - Workspace has RDF integration
- `src/routes/sms.ts` - Workspace has n8n integration
- `src/services/action-planner/*` - Workspace has better organization
- `src/services/plugins/*` - Workspace has type safety improvements
- `src/types/*` - Workspace has more comprehensive types

## Package.json Comparison

### Dependencies

**Workspace advantages:**
- `@omnii/api: workspace:*` - Monorepo shared API layer
- `@omnii/validators: workspace:*` - Monorepo shared validators
- `@supabase/supabase-js: ^2.50.0` (vs `^2.38.1`)
- `dotenv: ^16.5.0` (vs `^16.3.1`)
- `elysia: ^1.3.4` (vs `^1.3.3`)
- `express-rate-limit: ^7.5.0` (new)
- `follow-redirects: ^1.15.9` (new)
- `ioredis: ^5.6.1` (new - Redis client)
- `uuid: ^11.1.0` (new)
- `zod: ^3.25.43` (vs `^3.25.31`)

**Dev dependencies:**
- `@types/express: ^5.0.3` (vs `^5.0.2`)
- `@types/node: ^22.15.29` (vs `^20.6.3`)
- `typescript: ~5.8.3` (vs `^5.3.2`)
- `eventsource: ^4.0.0` (new)

**Standalone legacy:**
- No workspace dependencies
- Older package versions
- Missing Redis, UUID, rate limiting

## Git History Analysis

**Standalone last commits (May-June 2025):**
```
aea1165 🔧 Enhanced axios Brotli fix
9ef9192 🔧 Fix URL construction and environment configuration
4db9685 Add error handling to catch app startup crashes on Railway
e1d5aa8 Fix Docker build: Remove app loading test
4ef4a56 Add container startup debugging
```

These commits are from **7-8 months ago**. The workspace has been actively developed since then.

**Timeline:**
- Standalone: Last updated May-June 2025
- Workspace: Active development through January 2026
- Delta: 7-8 months of development in workspace only

## Architecture Comparison

### Standalone Architecture (Flat)
```
src/
├── services/
│   ├── action-planner.ts
│   ├── aiClient.ts
│   ├── redis-cache.ts
│   └── ... (25 files at root level)
```

### Workspace Architecture (Organized)
```
src/
├── services/
│   ├── action-planner/ (modular)
│   ├── caching/ (Redis abstraction)
│   ├── context/ (context building)
│   ├── core/ (core services)
│   ├── integrations/ (external APIs)
│   ├── neo4j/ (graph layer)
│   ├── rdf/ (semantic layer)
│   └── workflows/ (workflow engine)
```

**Workspace advantages:**
- Modular architecture
- Clear separation of concerns
- Better scalability
- Easier testing
- RDF semantic layer (not in standalone)
- n8n deep integration (not in standalone)

## Line Count Analysis (from 00-02-DIVERGENCE.md)

- **Workspace:** 28,531 lines
- **Standalone:** 13,754 lines
- **Difference:** Workspace has 14,777 more lines (107% larger)

The workspace has:
- RDF layer (not in standalone)
- n8n integration (basic in standalone)
- Brain/memory monitoring (not in standalone)
- Better organized services
- More comprehensive types
- Enhanced testing

## Merge Recommendations by Category

### Category 1: No Action Needed (28 workspace-only features)

**Reason:** These are new features not present in standalone.
**Action:** Already in workspace, nothing to merge.

All files listed in "Files Only in Workspace" section above.

### Category 2: Skip Standalone Files (24 legacy files)

**Reason:** Standalone implementations are superseded by better workspace versions.
**Action:** Do not port. Workspace versions are superior.

All files listed in "Files Only in Standalone" section above.

### Category 3: Use Workspace Version (All differing files)

**Reason:** Workspace has:
- Newer dependencies
- Better architecture
- Integration with monorepo packages
- Active development (7-8 months ahead)
- RDF layer
- n8n integration

**Action:** Keep workspace versions. Do not overwrite.

## Final Recommendation

**DO NOT perform git merge.**

**Rationale:**
1. Workspace is **7-8 months ahead** in development
2. Workspace has **107% more code** (14,777 lines)
3. Workspace has **better architecture** (modular vs. flat)
4. Workspace has **unique features** not in standalone:
   - RDF semantic layer
   - Deep n8n integration
   - Brain/memory monitoring
   - Monorepo package integration
5. Standalone has **NO unique features**
6. All standalone functionality is present in workspace in **better form**

**Action:**
1. ✅ Document that workspace is canonical (this file)
2. ✅ Create merge report confirming workspace as source of truth
3. ✅ Test workspace MCP server starts successfully
4. ❌ Skip git merge (no value, high risk of regression)
5. ✅ Mark standalone for archival in Phase 0 Plan 05

## Risk Assessment

**Risk of merging standalone into workspace:** HIGH
- Would introduce 7-8 months stale code
- Would conflict with modular architecture
- Would regress features
- Would break workspace:* dependencies
- No benefit (no unique features)

**Risk of NOT merging:** NONE
- Workspace already has all functionality
- Workspace is actively maintained
- No features lost

## Conclusion

The workspace version is the **definitive canonical source** for MCP server implementation. The standalone repository served its purpose during initial development but has been superseded by the monorepo version with superior architecture and more features.

**Merge status:** Not needed - workspace is already complete and canonical.
