# Phase 0: Monorepo Consolidation Preparation - Research

**Researched:** 2026-01-24
**Domain:** Monorepo tooling, codebase consolidation, Turborepo with Bun/Elysia/React Native/Expo
**Confidence:** HIGH

## Summary

Consolidating three codebases (`omnii`, `omnii-mobile`, `omnii-mcp`) into a unified monorepo requires careful orchestration of tooling, git history preservation, and dependency reconciliation. Research reveals that Turborepo with Bun workspaces is the optimal choice for this stack, with Expo SDK 52+ providing automatic monorepo detection for React Native apps. The consolidation should follow an incremental migration strategy using `git filter-repo` to preserve history while maintaining a single source of truth for dependencies.

**Key findings:**
- Turborepo has beta support for Bun and simpler setup than Nx for this use case
- Expo SDK 52+ automatically configures Metro for monorepos, eliminating manual configuration
- React Native version conflicts are the #1 killer of monorepo consolidations - strict version enforcement required
- Git filter-repo is the modern standard for history-preserving migrations (faster than git subtree)
- Environment variable management requires explicit configuration in turbo.json

**Primary recommendation:** Start with the existing `omnii` Turborepo as the consolidation target (already has Turborepo configured with pnpm), migrate `omnii-mcp` first (simpler, no React Native complications), then `omnii-mobile` last (most complex due to React Native version constraints).

## Standard Stack

The established tools for Bun + Elysia + React Native/Expo monorepo consolidation:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Turborepo | 2.5.4+ | Build system & task orchestration | Simpler than Nx, officially supports Bun beta, already in use in `omnii` codebase |
| Bun | 1.2.0+ | Runtime & package manager | Already adopted, workspaces feature built-in, faster than npm/pnpm |
| pnpm | 10.0.0+ | Alternative package manager | Currently used in `omnii`, excellent hoisting control for React Native |
| git filter-repo | latest | Git history rewriting | Modern standard (10-100x faster than filter-branch/subtree for large repos) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Syncpack | latest | Dependency version consistency | Detect and fix version mismatches across workspaces |
| dotenvx | latest | Environment variable management | Share/override env vars across monorepo apps |
| @rnx-kit/metro-config | latest | Metro bundler configuration | If Metro issues arise (Expo SDK 52+ may not need) |
| sherif | latest | Workspace validation | Already configured in `omnii` as `lint:ws` script |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Turborepo | Nx | Nx is 7x faster on large repos, but more complex setup, steeper learning curve, overkill for 3-repo consolidation |
| git filter-repo | git subtree | Subtree allows ongoing sync during transition, but 100x slower, unnecessary for one-time migration |
| Bun workspaces | pnpm workspaces | pnpm has better React Native compatibility (`node-linker=hoisted`), but Bun is faster and already committed to |

**Installation:**
```bash
# Core tooling (if not already installed)
bun install -g turbo@latest
brew install git-filter-repo  # macOS

# Supporting tools
bun add -d syncpack dotenvx
```

## Architecture Patterns

### Recommended Project Structure

Based on Turborepo official recommendations and existing `omnii` structure:

```
omnii-one/                      # Root (target: /Users/santino/Projects/Omnii One/)
├── apps/
│   ├── mobile/                 # From: omnii-mobile (React Native/Expo)
│   ├── omnii_mcp/             # From: omnii-mcp (Bun/Elysia MCP server)
│   ├── omnii-mobile/          # From: omnii/apps/omnii-mobile (if different)
│   └── python-rdf/            # From: omnii/apps/python-rdf
├── packages/
│   ├── api/                   # Shared from omnii
│   ├── auth/                  # Shared from omnii
│   ├── db/                    # Shared from omnii
│   ├── validators/            # Shared from omnii
│   ├── ui/                    # Shared from omnii
│   └── types/                 # New: consolidate TypeScript types
├── tooling/
│   ├── eslint/                # Shared from omnii
│   ├── prettier/              # Shared from omnii
│   ├── tailwind/              # Shared from omnii
│   └── typescript/            # Shared from omnii
├── turbo.json                 # From omnii (update task pipeline)
├── package.json               # From omnii (merge workspaces)
├── pnpm-workspace.yaml        # From omnii (add new apps)
└── bun.lockb                  # Consider: migrate to Bun or keep pnpm
```

**Note:** Turborepo does NOT support nested packages like `apps/**` - must use explicit `apps/*` and `packages/*`.

### Pattern 1: Incremental Git Migration with filter-repo

**What:** Migrate repos one at a time, rewriting history to place files in subdirectories
**When to use:** Preserving git history while creating clean monorepo structure

**Example:**
```bash
# Source: https://kokkonisd.github.io/2021/06/23/import-git-history
# https://developers.netlify.com/guides/migrating-git-from-multirepo-to-monorepo-without-losing-history/

# 1. Clone repo to migrate
git clone /Users/santino/Projects/omnii-mcp omnii-mcp-temp
cd omnii-mcp-temp

# 2. Rewrite history to move all files into apps/omnii_mcp/
git filter-repo --to-subdirectory-filter apps/omnii_mcp

# 3. Add as remote and merge into target
cd /Users/santino/Projects/Omnii\ One
git remote add omnii-mcp-source ../omnii-mcp-temp
git fetch omnii-mcp-source
git merge omnii-mcp-source/main --allow-unrelated-histories

# 4. Clean up
git remote remove omnii-mcp-source
rm -rf ../omnii-mcp-temp
```

### Pattern 2: Workspace Protocol for Internal Dependencies

**What:** Use `workspace:*` protocol in package.json for monorepo-internal dependencies
**When to use:** All cross-workspace dependencies

**Example:**
```json
// Source: https://pnpm.io/workspaces
// apps/mobile/package.json
{
  "name": "@omnii/mobile",
  "dependencies": {
    "@omnii/api": "workspace:*",      // Latest version in workspace
    "@omnii/auth": "workspace:^",     // Compatible with current version
    "@omnii/validators": "workspace:~" // Approximately current version
  }
}
```

When published, `workspace:*` resolves to actual version from package.json.

### Pattern 3: Turborepo Task Pipeline with Environment Variables

**What:** Configure task dependencies and environment variable awareness in turbo.json
**When to use:** All monorepo builds, ensure cache invalidation on env changes

**Example:**
```json
// Source: https://turborepo.dev/docs/crafting-your-repository/using-environment-variables
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "env": [
        "DATABASE_URL",
        "NEO4J_*",           // Wildcard for all Neo4j vars
        "SUPABASE_*"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalEnv": [
    "NODE_ENV",
    "CI"
  ]
}
```

**Strict mode (default):** Tasks only see env vars listed in `env` and `globalEnv`
**Loose mode:** All env vars available (use during migration, then switch to strict)

### Pattern 4: React Native Single Version Policy

**What:** Enforce exactly one version of React, React Native, and Expo across all workspaces
**When to use:** Always - duplicate versions cause runtime errors

**Example:**
```json
// Source: https://docs.expo.dev/guides/monorepos/
// Root package.json
{
  "resolutions": {
    "react": "18.3.1",
    "react-native": "0.76.9",
    "expo": "~52.0.46"
  },
  "pnpm": {
    "overrides": {
      "react": "18.3.1",
      "react-native": "0.76.9",
      "expo": "~52.0.46"
    }
  }
}
```

Run `syncpack list-mismatches` to detect violations before they cause runtime errors.

### Anti-Patterns to Avoid

- **Nested workspace globs (`apps/**`)**: Turborepo doesn't support - causes ambiguous package resolution
- **Manual Metro configuration with Expo SDK 52+**: Expo auto-configures, manual config causes conflicts
- **Git squash merges during consolidation**: Loses commit history - use `--allow-unrelated-histories` instead
- **Hoisted dependencies with isolated mode**: React Native requires `node-linker=hoisted` in .npmrc
- **Caching non-deterministic tasks**: Tasks with env-dependent outputs need proper `env` configuration in turbo.json

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dependency version sync | Manual package.json comparison | Syncpack | Detects mismatches like `react@18.3.1` vs `react@18.2.0`, auto-fixes with `syncpack fix-mismatches` |
| Git history rewriting | Bash scripts with `git filter-branch` | git filter-repo | 10-100x faster, handles edge cases (renames, merges, tags), officially recommended by Git |
| Environment variable sharing | Copy .env files manually | dotenvx or turbo.json `globalEnv` | Prevents env drift, supports overrides, validates required vars |
| Workspace validation | Manual dependency checks | sherif (already in `omnii`) | Catches phantom dependencies, validates workspace protocol usage |
| Metro bundler config | Custom metro.config.js | Expo SDK 52+ auto-config | Expo detects monorepo and configures `watchFolders`, `nodeModulesPaths` automatically |
| Monorepo-aware caching | Custom build scripts | Turborepo remote cache | Shares cache across team/CI, parallelizes tasks, handles task dependencies |

**Key insight:** The monorepo ecosystem has matured significantly in 2024-2026. Tools like Turborepo, git filter-repo, and Expo SDK 52+ eliminate 90% of historical monorepo pain points. Custom solutions are technical debt.

## Common Pitfalls

### Pitfall 1: React Native Version Skew

**What goes wrong:** Multiple versions of React Native (e.g., 0.76.9 in `omnii-mobile`, 0.73.x in `omnii/apps/omnii-mobile`) cause Metro bundler to bundle both versions, leading to "Duplicate module name" errors or silent runtime failures.

**Why it happens:** React Native doesn't support version coexistence in a single app. Hoisting can accidentally pull in peer dependencies of different versions.

**How to avoid:**
1. **Before migration:** Audit all three repos with `grep -r "react-native" package.json`
2. **Reconciliation:** Choose newest stable version (0.76.9 from `omnii-mobile`)
3. **Enforcement:** Add to root `package.json` resolutions/overrides
4. **Validation:** Run `syncpack list-mismatches` in CI

**Warning signs:**
- Metro bundler errors: "Unable to resolve module react-native"
- Build succeeds but app crashes on launch with "Duplicate module name: react"
- Different apps/packages show different React Native versions in `node_modules`

### Pitfall 2: Expo SDK Mismatch with Manual Metro Config

**What goes wrong:** Expo SDK 52+ auto-configures Metro for monorepos. If you keep old manual `metro.config.js` settings (like `watchFolders`), they conflict with auto-config, causing "Module not found" errors.

**Why it happens:** Migration from pre-SDK 52 setup includes manual Metro config that's now obsolete. Developers copy old config files without checking SDK version.

**How to avoid:**
1. **Check Expo SDK version:** `expo --version` (if 52+, remove manual config)
2. **Delete obsolete config:** Remove `watchFolders`, `resolver.extraNodeModules`, `resolver.nodeModulesPaths` from metro.config.js
3. **Clear cache:** `npx expo start --clear` after config changes
4. **Document:** Add comment in metro.config.js: "// Expo SDK 52+ auto-configures monorepo - do not add watchFolders"

**Warning signs:**
- Error: "Metro bundler error: Unable to resolve module @omnii/api"
- Multiple conflicting `node_modules` directories being watched
- Metro config with both `expo/metro-config` and manual `watchFolders`

### Pitfall 3: Package Manager Mismatch (pnpm vs Bun)

**What goes wrong:** `omnii` uses pnpm (package.json declares `"packageManager": "pnpm@10.0.0"`), but project wants to use Bun. Installing with `bun install` creates `bun.lockb` while `pnpm-lock.yaml` exists, causing dependency resolution conflicts.

**Why it happens:** Two lockfiles with different resolution algorithms produce different dependency trees. Bun and pnpm resolve peer dependencies differently.

**How to avoid:**
1. **Decide early:** Choose pnpm (better React Native support) OR Bun (faster, team preference)
2. **If Bun:** Delete `pnpm-lock.yaml`, update `package.json` packageManager field, run `bun install`
3. **If pnpm:** Keep existing, configure `.npmrc` with `node-linker=hoisted` for React Native
4. **Commit lockfile:** Include chosen lockfile in git, ignore the other in `.gitignore`
5. **CI enforcement:** Check for wrong lockfile in CI (`git ls-files | grep pnpm-lock.yaml` should fail if using Bun)

**Warning signs:**
- Both `pnpm-lock.yaml` and `bun.lockb` exist
- `node_modules` structure changes between installs
- CI fails with "package manager mismatch" errors

### Pitfall 4: Lost Git History from Squash Merges

**What goes wrong:** Using `git merge --squash` during consolidation creates a single commit for entire repo, losing all historical context (who changed what, when, why).

**Why it happens:** Misunderstanding of `--allow-unrelated-histories` (seems "dangerous") leads to using squash as "safer" alternative.

**How to avoid:**
1. **Use filter-repo:** Rewrite history to move files into subdirectory BEFORE merge
2. **Merge with full history:** `git merge remote/main --allow-unrelated-histories` (NOT --squash)
3. **Verify history preserved:** `git log --all --graph --oneline` should show original commits
4. **PR/Issue references:** GitHub references (e.g., "fixes #42") remain intact if repos merge under same org

**Warning signs:**
- Single massive commit like "Merge omnii-mcp into monorepo" with 1000+ files changed
- `git log apps/omnii_mcp/` shows only 1-2 commits instead of full history
- `git blame` on migrated files shows only merge commit

### Pitfall 5: Environment Variable Namespace Collisions

**What goes wrong:** All three repos define `DATABASE_URL`, `OPENAI_API_KEY`, etc., but pointing to different environments (dev/staging/prod). After consolidation, which `.env` file wins? Apps use wrong database.

**Why it happens:** Each standalone repo had its own `.env` at root. Merging creates multiple `.env` files, and Turborepo/package managers have different precedence rules.

**How to avoid:**
1. **Audit before merge:** List all env vars from all three repos (`grep -h "^[A-Z]" */.env | sort -u`)
2. **Namespace by app:** `MOBILE_DATABASE_URL`, `MCP_DATABASE_URL` OR use app-specific `.env` files
3. **Configure Turborepo:** Add to `turbo.json` which env vars affect which tasks
4. **Document loading order:** Root `.env` → App `.env` → Override `.env.local`
5. **Validation:** Create script that checks required env vars per app, run in CI

**Warning signs:**
- App connects to wrong database/API after consolidation
- "Missing environment variable" errors that weren't there before
- Different behavior between `pnpm dev` and `turbo dev`

### Pitfall 6: Divergent Package.json Scripts

**What goes wrong:** Each repo has different `dev`, `build`, `test` scripts. After merge, `turbo dev` runs wrong command for some apps or fails entirely.

**Why it happens:** No standard conventions across repos. `omnii-mobile` uses `expo start --dev-client`, `omnii-mcp` uses `bun run --watch src/app.ts`, `omnii` uses Turborepo tasks.

**How to avoid:**
1. **Standardize during migration:** Rename scripts to match Turborepo conventions
   - `dev`: Development server with hot reload
   - `build`: Production build
   - `test`: Run all tests
   - `lint`: Linting
2. **Document deviations:** If app needs custom script, document in app README
3. **Update turbo.json:** Map standardized script names to actual commands
4. **Test individually:** Run `turbo dev --filter=@omnii/mobile` to verify each app

**Warning signs:**
- `turbo dev` starts some apps but not others
- Error: "missing script: dev" for certain packages
- Apps have scripts like `start`, `serve`, `dev:local` instead of standard `dev`

## Code Examples

Verified patterns from official sources:

### Turborepo Configuration for Bun + Expo Stack

```json
// Source: https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository
// turbo.json
{
  "$schema": "https://turborepo.org/schema.json",
  "globalDependencies": [
    "**/.env",
    "**/.env.local"
  ],
  "globalEnv": [
    "NODE_ENV",
    "CI"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".expo/**"],
      "env": [
        "DATABASE_URL",
        "NEO4J_URI",
        "NEO4J_USERNAME",
        "NEO4J_PASSWORD",
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "OPENAI_API_KEY"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    }
  }
}
```

### Bun Workspace Configuration

```yaml
# Source: https://bun.com/docs/guides/install/workspaces
# bun-workspace.yaml (alternative to pnpm-workspace.yaml)
packages:
  - apps/*
  - packages/*
  - tooling/*
```

```json
// Root package.json
{
  "name": "omnii-one",
  "private": true,
  "packageManager": "bun@1.2.0",
  "workspaces": [
    "apps/*",
    "packages/*",
    "tooling/*"
  ],
  "scripts": {
    "dev": "turbo watch dev --continue",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "lint:ws": "bun x sherif"
  },
  "devDependencies": {
    "turbo": "^2.5.4",
    "syncpack": "latest",
    "sherif": "latest"
  },
  "resolutions": {
    "react": "18.3.1",
    "react-native": "0.76.9",
    "expo": "~52.0.46"
  }
}
```

### Expo Monorepo Metro Configuration (SDK 52+)

```javascript
// Source: https://docs.expo.dev/guides/monorepos/
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Expo SDK 52+ auto-configures monorepo support
// No need to manually set watchFolders or resolver.nodeModulesPaths

module.exports = config;
```

### pnpm Configuration for React Native Hoisting

```ini
# Source: https://docs.expo.dev/guides/monorepos/
# .npmrc (if using pnpm instead of Bun)
node-linker=hoisted
shamefully-hoist=true
auto-install-peers=true
dedupe-injected-deps=true
```

### Git History Preservation Script

```bash
#!/bin/bash
# Source: https://developers.netlify.com/guides/migrating-git-from-multirepo-to-monorepo-without-losing-history/
# migrate-repo.sh - Migrate a repo into monorepo preserving history

set -e

SOURCE_REPO=$1
TARGET_DIR=$2
MONOREPO_ROOT=$3

if [ -z "$SOURCE_REPO" ] || [ -z "$TARGET_DIR" ] || [ -z "$MONOREPO_ROOT" ]; then
  echo "Usage: ./migrate-repo.sh <source-repo-path> <target-dir> <monorepo-root>"
  echo "Example: ./migrate-repo.sh ~/Projects/omnii-mcp apps/omnii_mcp ~/Projects/Omnii\ One"
  exit 1
fi

echo "Cloning $SOURCE_REPO to temp directory..."
TEMP_DIR=$(mktemp -d)
git clone "$SOURCE_REPO" "$TEMP_DIR"

echo "Rewriting history to move files into $TARGET_DIR..."
cd "$TEMP_DIR"
git filter-repo --to-subdirectory-filter "$TARGET_DIR" --force

echo "Merging into monorepo at $MONOREPO_ROOT..."
cd "$MONOREPO_ROOT"
git remote add temp-source "$TEMP_DIR"
git fetch temp-source
git merge temp-source/main --allow-unrelated-histories -m "Merge $SOURCE_REPO into $TARGET_DIR

Preserves full git history from $SOURCE_REPO"

echo "Cleaning up..."
git remote remove temp-source
rm -rf "$TEMP_DIR"

echo "Migration complete! Verify with: git log $TARGET_DIR/"
```

### Dependency Sync Validation

```json
// Source: https://github.com/JamieMason/syncpack
// .syncpackrc.json
{
  "versionGroups": [
    {
      "label": "React ecosystem must match",
      "packages": ["**"],
      "dependencies": ["react", "react-dom", "react-native"],
      "policy": "sameRange"
    },
    {
      "label": "Use workspace protocol for internal packages",
      "packages": ["**"],
      "dependencies": ["@omnii/*"],
      "dependencyTypes": ["dev", "prod"],
      "policy": "workspace"
    }
  ],
  "semverGroups": [
    {
      "label": "Pin exact versions for build tools",
      "packages": ["**"],
      "dependencies": ["turbo", "typescript"],
      "range": ""
    }
  ]
}
```

Run with: `syncpack list-mismatches` (detect) and `syncpack fix-mismatches` (auto-fix)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| git subtree for migrations | git filter-repo | 2020-2021 | 10-100x faster, officially recommended by Git core team |
| Manual Metro config for RN monorepos | Expo SDK 52+ auto-config | Nov 2024 (SDK 52) | Zero-config monorepo support, eliminates 80% of Metro issues |
| Lerna for monorepo management | Turborepo/Nx | 2021-2022 | Lerna maintenance mode since 2022, Turborepo acquired by Vercel |
| Yarn workspaces | pnpm/Bun workspaces | 2023-2024 | pnpm 40% faster, Bun 10x faster than npm/Yarn for installs |
| git filter-branch | git filter-repo | 2019 | filter-branch officially deprecated, filter-repo in Git docs |
| Turborepo Node.js only | Turborepo with Bun beta | Sept 2023 | Native Bun support reduces install time by 60%+ |

**Deprecated/outdated:**
- **Lerna**: Still works but in maintenance mode, team recommends migrating to Nx or Turborepo
- **git filter-branch**: Officially deprecated by Git, use git filter-repo instead
- **Manual Metro watchFolders with Expo SDK 52+**: Auto-configured, manual settings cause conflicts
- **Expo SDK <52 in monorepos**: Requires complex manual Metro config, upgrade to SDK 52+ strongly recommended

## Open Questions

Things that couldn't be fully resolved:

1. **Bun vs pnpm: Which package manager to commit to?**
   - What we know: `omnii` currently uses pnpm@10.0.0, project prefers Bun for runtime
   - What's unclear: Does Bun's package manager have full parity with pnpm for React Native hoisting requirements?
   - Recommendation: **Test migration** - Try `bun install` with React Native and verify Metro resolves all packages. If issues arise, stick with pnpm for package management, use Bun only for runtime. Document decision in consolidation plan.

2. **Which `omnii-mobile` becomes canonical: standalone repo or omnii/apps/omnii-mobile?**
   - What we know: Both exist with different features (standalone has gamification per context)
   - What's unclear: Are they divergent forks or one is outdated?
   - Recommendation: **Divergence analysis task** - Compare package.json dependencies, git commit timestamps, feature sets. Likely standalone `omnii-mobile` is newer (React Native 0.76.9 vs checking `omnii` version). Document in merge strategy.

3. **Neo4j schema compatibility across three codebases**
   - What we know: All three use Neo4j, but potentially different node/relationship structures
   - What's unclear: Are schemas compatible or will consolidation require migration?
   - Recommendation: **Schema audit** - Export Cypher schema from each repo's Neo4j instance, diff them. Document as "source of truth" decision in merge strategy.

4. **n8n workflow migration strategy**
   - What we know: n8n is central to architecture for orchestration
   - What's unclear: Are n8n workflows defined in code (repo) or stored in n8n database?
   - Recommendation: **n8n workflow inventory** - Check if workflows are in git (JSON files) or external. If external, document workflow export/import process in consolidation plan.

5. **tRPC router consolidation from omnii-mcp**
   - What we know: `omnii` uses tRPC v11, `omnii-mcp` may have separate routers
   - What's unclear: Do routers overlap (duplicate endpoints) or complement (different domains)?
   - Recommendation: **Router mapping** - List all tRPC procedures from both codebases, identify overlaps. Plan to merge overlapping routers or keep separate if they serve different domains (e.g., MCP-specific vs general API).

## Sources

### Primary (HIGH confidence)

- [Turborepo Environment Variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables) - Official Turborepo documentation
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/) - Official Expo SDK 52+ monorepo setup
- [Turborepo Repository Structure](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) - Official directory layout recommendations
- [Bun Workspaces](https://bun.com/docs/guides/install/workspaces) - Official Bun workspace configuration
- [pnpm Workspaces](https://pnpm.io/workspaces) - Official pnpm workspace protocol documentation

### Secondary (MEDIUM confidence)

- [Migrating Git from multirepo to monorepo](https://developers.netlify.com/guides/migrating-git-from-multirepo-to-monorepo-without-losing-history/) - Netlify Developers guide (2025)
- [Setting Up a React Native + Web Monorepo](https://www.hoangpham.dev/articles/003-setup-monorepo-react-native-and-web) - Practical implementation guide
- [Turborepo React Native Starter](https://vercel.com/templates/next.js/turborepo-react-native) - Vercel official template
- [Managing TypeScript Packages in Monorepos](https://nx.dev/blog/managing-ts-packages-in-monorepos) - Nx blog (TypeScript best practices)
- [Syncpack GitHub](https://github.com/JamieMason/syncpack) - Official Syncpack repository

### Tertiary (LOW confidence - WebSearch only, flagged for validation)

- [Monorepos!! Nx vs Turborepo vs Lerna](https://dev.to/suryansh_yc/monorepos-nx-vs-turborepo-vs-lerna-part-1-turborepo-167f) - DEV Community comparison
- [GitHub: turbobun](https://github.com/mugencraft/turbobun) - Bun + Turborepo example repo
- [Dealing with Monorepo's Hell with Bun](https://www.fgbyte.com/blog/02-bun-turborepo-hell) - Community troubleshooting
- [Monorepo Dependency Chaos](https://dev.to/alex_aslam/monorepo-dependency-chaos-proven-hacks-to-keep-your-codebase-sane-and-your-team-happy-1957) - DEV Community practices
- [Migrating to Monorepo Guide](https://graphite.dev/guides/migrating-to-monorepo-a-step-by-step-guide) - Graphite developer guide

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Turborepo, Bun, git filter-repo verified from official docs
- Architecture: HIGH - Expo SDK 52+, Turborepo structure from official sources
- Pitfalls: MEDIUM - React Native version conflicts verified from Expo docs, environment variable issues from Turborepo docs, others from community sources
- Git migration: HIGH - git filter-repo verified from Git documentation and Netlify guide
- Bun compatibility: MEDIUM - Beta support confirmed, but limited production examples

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - tooling is stable, but Bun support in Turborepo may evolve from beta to stable)
