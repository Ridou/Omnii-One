# Domain Pitfalls

**Domain:** Personal knowledge graph / MCP server / codebase consolidation
**Researched:** 2026-01-24
**Project:** Omnii One - Consolidating three divergent codebases (omnii monorepo, omnii-mobile, omnii-mcp)

## Executive Summary

This consolidation project sits at the intersection of six high-risk domains, each with documented failure modes. The greatest danger is not technical complexity but **strategic sequencing errors** - attempting to solve too many problems simultaneously. Research shows 60% of AI projects without AI-ready data will be abandoned through 2026, and 34% of monorepo consolidations experience short-term complexity spikes that derail progress.

**Critical insight:** The industry will spend 2026 debating context graphs without successful implementation. This project's success depends on avoiding the "build everything at once" trap and the "context is slippery" problem that plagues personal AI systems.

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Building for the Graph, Not for Inference

**What goes wrong:** Teams build elaborate knowledge graphs with beautiful schemas but no clear retrieval strategy. The graph becomes a data graveyard - information goes in but never comes back out in useful ways.

**Why it happens:** Knowledge graph tooling makes it easy to model relationships. Developers focus on the schema (nodes, edges, properties) without designing the queries and retrieval patterns that will actually serve AI context.

**Consequences:**
- AI gets irrelevant or incomplete context despite having "all the data"
- Over-personalization: Model makes connections between unrelated topics (e.g., sees 100 golf photos, assumes user loves golf, misses that user loves their son)
- Context rot: Adding more data makes retrieval worse, not better
- 27% of organizations had knowledge graphs in production in late 2025, down from evaluations - suggesting implementation failures

**Prevention:**
1. **Design retrieval patterns BEFORE schema** - Start with "What questions will AI ask?" not "What relationships exist?"
2. **Prototype with mock queries** - Write the Cypher/graph queries for actual use cases before populating data
3. **Measure context relevance** - Track whether retrieved context actually helps AI responses (don't just measure graph completeness)
4. **Build for GraphRAG, not just graph** - Unstructured RAG delivered through structured knowledge-graph layer achieves stronger results than either alone

**Detection:**
- Graph grows but AI accuracy doesn't improve
- High retrieval latency (complex traversals with no clear termination)
- AI responses cite irrelevant personal information
- Users report "AI doesn't understand me" despite extensive data collection

**Phase mapping:**
- **Phase 1 (Foundation):** Define core retrieval patterns, prototype key queries
- **Phase 2:** Implement retrieval-first, populate data second
- **Phase 3+:** Measure and optimize context relevance

**Confidence:** HIGH - Multiple sources confirm this anti-pattern (Cognee blog, research papers, industry adoption data)

---

### Pitfall 2: MCP Security Vulnerabilities and Tool Permission Creep

**What goes wrong:** MCP servers are deployed with inadequate security controls, allowing prompt injection, data exfiltration through tool composition, or command injection vulnerabilities that "shouldn't exist in 2025."

**Why it happens:**
- Developers treat MCP servers as internal-only tools and skip authentication/authorization
- Tool permissions aren't scoped - combining tools can exfiltrate files silently
- Lookalike tools can replace trusted ones without detection
- Niche frameworks are adopted instead of battle-tested SDKs

**Consequences:**
- Prompt injection attacks manipulate tool execution
- Sensitive data leaked through tool chaining (e.g., read_file + send_http)
- Command injection via unsanitized inputs
- Production incidents requiring full security audit and rebuild

**Prevention:**
1. **Implement least-privilege tool access** - Each client/context gets minimal tool set needed
2. **Validate and sanitize ALL inputs** - Treat every parameter as hostile, especially file paths and shell commands
3. **Use official MCP SDKs** - Don't adopt niche frameworks; stick with standard implementations
4. **Add rate limiting** - Prevent DoS attacks and manage costs for resource-intensive operations
5. **Audit tool composition** - Explicitly review what combinations of tools enable
6. **Store credentials properly** - System keychains, environment variables, or dedicated secrets managers (HashiCorp Vault, AWS Secrets Manager)

**Detection:**
- Unexpected API calls or file access in logs
- Tools executing with broader permissions than intended
- Claude unable to connect errors (often indicate protocol/security mismatch)
- Resource exhaustion from unthrottled tool calls

**Phase mapping:**
- **Phase 1:** Security-first MCP server architecture, credential management
- **Phase 2:** Tool permission boundaries, rate limiting
- **Phase 3+:** Audit logging, anomaly detection

**Confidence:** HIGH - Recent security research, Red Hat blog, Nearform implementation guide

---

### Pitfall 3: Neo4j Multi-Tenancy Data Isolation Failures

**What goes wrong:** Personal context data from different users/sources bleeds across tenant boundaries, either through shared database partitioning or improper privilege configuration.

**Why it happens:**
- Pre-Neo4j 4.0 patterns (label/property-based partitioning) still used in 4.0+ codebases
- Global admin roles can't be restricted per-database - requires separate role per tenant
- Relationships can't span databases, forcing shared-database designs
- Migration from label-based to database-per-tenant is complex and risky

**Consequences:**
- User A sees User B's personal knowledge graph data
- Privacy violations and potential regulatory issues (GDPR, CCPA)
- Cannot provide isolation guarantees for sensitive personal data
- Rollback requires full database restore

**Prevention:**
1. **Use Neo4j 4.0+ database-per-tenant** - Each tenant/user gets isolated database, not shared DB with labels
2. **Create tenant-specific admin roles** - No global admin; separate role per database
3. **Design for single-database constraints** - Relationships cannot span databases; plan data model accordingly
4. **Test isolation upfront** - Verify queries cannot access cross-tenant data before populating production
5. **Plan migration carefully** - If migrating from shared DB, test on staging, have rollback plan
6. **Consider impact on sync** - Database-per-tenant affects sync strategy and resource requirements

**Detection:**
- Graph queries returning unexpected cross-user data
- Privilege errors when users access their own data
- Performance degradation as tenant count grows
- Migration failures in test environments

**Phase mapping:**
- **Phase 1:** Define multi-tenancy model (database-per-tenant vs. shared), prototype isolation
- **Phase 2:** Implement tenant provisioning, test cross-tenant query prevention
- **Phase 3+:** Monitor resource usage per tenant, optimize

**Confidence:** MEDIUM - Based on Neo4j community discussions and GraphAware blog (2020), verified against 4.0+ docs

---

### Pitfall 4: Monorepo Consolidation Without Specialized Tooling

**What goes wrong:** Three divergent codebases are merged into a monorepo without proper build orchestration, dependency management, or CI/CD reconfiguration. Builds become slow, tests run unnecessarily, and the team abandons the monorepo.

**Why it happens:**
- Teams underestimate the tooling required for monorepo success
- Existing scripts/CI configs assume single-app structure
- Version conflicts between packages go undetected
- 34% experience short-term complexity spike that feels like regression

**Consequences:**
- Build times explode (entire monorepo rebuilds on every change)
- CI pipeline slowdowns (all tests run for single-file change)
- Dependency drift (subtle package.json differences causing failures)
- Tight coupling (changes cascade across projects unintentionally)
- Team productivity drops during transition period
- Existing CI/CD breaks completely, requiring rebuild

**Prevention:**
1. **Adopt specialized monorepo tooling BEFORE consolidation** - Nx, Turborepo, or similar
2. **Implement incremental builds** - Only build affected projects
3. **Configure smart caching** - Local and CI caching for unchanged modules
4. **Establish conventions early** - Standardized directory structure, naming patterns, shared configs
5. **Migrate incrementally** - One project/package at a time, not "big bang"
6. **Automate dependency management** - Use workspace: protocol, automated updates
7. **Reconfigure CI/CD for monorepo** - Understand what changed, test only affected

**Detection:**
- git status/clone taking >30 seconds
- Full rebuild after single-file change
- Tests for project A running when project B changes
- Developers complaining about "slowness" without specifics
- CI timeouts that didn't exist before

**Phase mapping:**
- **Phase 0 (Pre-consolidation):** Choose and configure monorepo tooling
- **Phase 1:** Migrate first codebase, validate tooling
- **Phase 2:** Migrate second codebase, refine workflows
- **Phase 3:** Migrate third codebase, establish shared conventions

**Confidence:** HIGH - Multiple 2025-2026 sources on monorepo mistakes (InfoQ, dev.to, Aviator)

---

### Pitfall 5: Local-First Sync Conflicts Without CRDT Strategy

**What goes wrong:** Local-first architecture implemented with naive "last-write-wins" conflict resolution. Users make offline edits, sync, and their changes mysteriously disappear or overwrite others' work.

**Why it happens:**
- Writing custom sync algorithms is "a rabbit hole of edge cases"
- CRDTs seem complex; developers think they can solve it simpler
- Last-write-wins (Firestore) or deterministic hashing (CouchDB) is simpler but lossy
- Offline scenarios are hard to test comprehensively

**Consequences:**
- User edits lost during sync (last-write-wins drops changes)
- Data inconsistencies across devices (partial sync, stale caches)
- User trust erosion ("app lost my work")
- Cannot guarantee eventual consistency
- Retry loops and race conditions in sync layer

**Prevention:**
1. **Adopt CRDTs for shared state** - Use Automerge, Yjs, or similar for conflict-free merging
2. **Don't write custom sync** - Use proven sync engines (Replicache, WatermelonDB, PowerSync)
3. **Design for conflict-free operations** - Where possible, avoid conflicting edits (append-only, immutable events)
4. **Implement robust retry with backoff** - Network failures are normal, not exceptional
5. **Create sync status UI** - Users must understand when data is local vs. synced
6. **Test offline scenarios rigorously** - Simulate network loss, partial updates, concurrent edits
7. **Plan for n8n orchestration** - If using n8n, understand that it's another sync surface

**Detection:**
- User reports of "lost edits" after going offline
- Data inconsistencies between mobile and backend
- Sync conflicts requiring manual resolution
- Unbounded growth of conflict logs
- Retry storms (DDoS on own servers)

**Phase mapping:**
- **Phase 1:** Choose CRDT library or sync engine, prototype conflict scenarios
- **Phase 2:** Implement sync with offline-first patterns
- **Phase 3+:** Stress test with concurrent edits, network failures

**Confidence:** HIGH - Multiple 2026 sources on local-first pitfalls (Evil Martians, RxDB, Expo docs)

---

### Pitfall 6: Git Divergent Branch Reconciliation During Consolidation

**What goes wrong:** Three codebases have diverged significantly. Merge attempts create massive conflicts. Developers choose wrong reconciliation strategy (rebase public branches) or give up and manually copy files, losing history.

**Why it happens:**
- Git 2.x+ requires explicit pull strategy configuration
- Developers don't understand merge vs. rebase tradeoffs
- Panic during conflicts leads to destructive actions (git checkout ., reset --hard)
- Ignoring "divergent branches" warning causes chaotic history

**Consequences:**
- Lost commit history (manual file copying instead of proper merge)
- Broken builds after consolidation
- Team members' local repos become unusable
- Cannot trace which codebase contributed which features
- Deployment issues from unexpected merge artifacts

**Prevention:**
1. **Hybrid workflow: rebase local, merge for integration** - Don't rebase public branches
2. **Configure pull strategy explicitly** - Choose merge or rebase based on workflow
3. **Use visual diff tools** - VS Code 2026 AI-powered diff, GitKraken, etc.
4. **Create merge plan before execution** - Identify common ancestor, plan conflict resolution
5. **Never force-push to main/master** - Protect critical branches
6. **Test merge on throwaway branch first** - Practice before real consolidation
7. **Document consolidation strategy** - Which codebase is "source of truth" per domain

**Detection:**
- "You have divergent branches" warning
- Merge conflicts in majority of files
- History shows multiple parallel "Merge branch..." commits
- Developers asking "which version do we keep?"
- CI failures after merge completion

**Phase mapping:**
- **Phase 0 (Pre-consolidation):** Analyze codebases, create merge strategy document
- **Phase 1:** Test merge on isolated branch, resolve major conflicts
- **Phase 2:** Execute consolidation with documented strategy
- **Phase 3:** Validate all features work post-merge

**Confidence:** MEDIUM - Based on 2026 Git workflow guides, not specific to this project type

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 7: n8n Workflow Hardcoded Credentials

**What goes wrong:** API keys and secrets hardcoded into HTTP Request nodes or Code nodes. Workflow exports leak credentials. Rotation requires manually updating dozens of nodes.

**Why it happens:** Fastest way to get workflow working is copy-paste API key directly.

**Prevention:**
- Always use n8n's credential manager (encrypted, rotation-friendly)
- Audit workflows before committing/exporting
- Use environment variables for local development

**Detection:** API keys visible in workflow JSON exports

**Phase mapping:** Phase 2 (n8n integration) - Establish credential management patterns upfront

---

### Pitfall 8: Missing Error Handling in n8n Workflows

**What goes wrong:** Workflows run perfectly for two weeks, then silently fail when an API returns unexpected data or a webhook gets overloaded.

**Why it happens:** External APIs/databases fail, but workflows aren't designed to handle it.

**Prevention:**
- Add error handling to every external call node
- Implement "Error Workflow" for centralized error logging
- Set up alerts for workflow failures
- Test with malformed/missing data

**Detection:**
- Workflows showing "Success" but not producing expected output
- Gaps in data that correspond to API downtime

**Phase mapping:** Phase 2 (n8n integration) - Build error handling patterns into templates

---

### Pitfall 9: n8n Save Execution Progress in Production

**What goes wrong:** Debug feature "Save Execution Progress" left enabled in production. Every node execution writes to database. 30-node workflow × 100 runs/day = 3,000 writes/day. n8n instance slows to a crawl.

**Why it happens:** Enabled during debugging, forgotten when deploying to production.

**Prevention:**
- Disable "Save Execution Progress" in production workflows
- Only enable when actively debugging specific issues
- Monitor database write volume

**Detection:**
- n8n UI becomes slow/unresponsive
- Database shows excessive write operations
- Workflow execution times increase over time

**Phase mapping:** Phase 2 (n8n integration) - Create production workflow checklist

---

### Pitfall 10: n8n Inefficient Batching (Batch Size = 1)

**What goes wrong:** Database query or HTTP request inside SplitInBatches loop with batch size = 1. Processing 1,000 items means 1,000 individual API calls.

**Why it happens:** Default behavior or misunderstanding of batch processing.

**Prevention:**
- Configure batch size appropriately (50-100 for APIs, 500-1000 for databases)
- Use bulk operations where available
- Consider creating single "sync" endpoint on backend instead of multiple calls

**Detection:**
- Workflows taking minutes to process small datasets
- API rate limit errors
- Server load spikes during workflow execution

**Phase mapping:** Phase 2 (n8n integration) - Performance testing with realistic data volumes

---

### Pitfall 11: Monorepo Tight Coupling

**What goes wrong:** Shared code forces all projects to use identical library versions. Change in one project breaks others. "Monorepo" becomes "monolith."

**Why it happens:** Workspace dependencies default to sharing versions; convenience becomes constraint.

**Prevention:**
- Allow version differences where justified
- Use workspace: protocol carefully
- Establish dependency update policies
- Create clear module boundaries

**Detection:**
- Changes to shared library requiring updates across all projects
- Developers avoiding refactoring due to cross-project impact
- Version lock-in preventing security updates

**Phase mapping:** Phase 1 (Initial consolidation) - Define dependency management rules

---

### Pitfall 12: React Native Background Task API Overload

**What goes wrong:** 100,000 devices wake up simultaneously and hit API. Accidental DDoS on own servers. iOS 18/Android 15 flag app as "battery drainer" and permanently restrict it.

**Why it happens:** Background tasks execute synchronously across user base without jitter.

**Prevention:**
- Implement random delay (0-60 seconds) before background requests
- Fetch JSON only, not images/videos
- Create single "sync" endpoint instead of multiple calls
- Rate limit aggressively on server side

**Detection:**
- Server load spikes at regular intervals
- User reports of app being "restricted" by OS
- Battery usage complaints

**Phase mapping:** Phase 3 (Mobile sync) - Design background sync with jitter from start

---

### Pitfall 13: React Native Offline-First Wishful Thinking

**What goes wrong:** App assumes network availability. Users in poor connectivity areas (tunnels, rural, international) experience broken UX.

**Why it happens:** Developers test on office WiFi; offline scenarios feel like edge cases.

**Prevention:**
- Design data layer in three tiers: local storage (instant), remote APIs (authoritative), real-time sync (optional)
- Test with network throttling and airplane mode
- Queue operations when offline, sync when online
- Show clear offline/online status

**Detection:**
- User complaints about "app not working" without error messages
- Support tickets mentioning specific locations (subway, airports)
- Data loss reports from users who were offline

**Phase mapping:** Phase 2-3 (Mobile architecture) - Build offline-first into core data layer

---

### Pitfall 14: Personal Knowledge Graph Scope Creep

**What goes wrong:** Attempt to model entire user life (emails, calendar, photos, documents, social media, purchases, health, location history) simultaneously. Project never ships.

**Why it happens:** Knowledge graphs make it easy to add "just one more data source." Vision of "AI with complete context" is seductive.

**Prevention:**
- Start with ONE high-value data source (e.g., only codebase context OR only calendar)
- Validate AI improvement before adding next source
- Measure marginal value of each addition
- Resist "just add everything" instinct

**Detection:**
- Data integrations growing faster than usage
- Engineers building connectors, not improving AI responses
- Roadmap filled with "Add X integration" vs. "Improve Y retrieval"

**Phase mapping:** Phase 1 (Foundation) - Define MINIMUM viable context sources, defer others

---

### Pitfall 15: MCP Server Monolith Anti-Pattern

**What goes wrong:** Single MCP server handles filesystem + database + web search + calendar + email + Slack. Becomes unmaintainable and unreliable.

**Why it happens:** Convenience of single deployment, perception that more tools = more value.

**Prevention:**
- One MCP server = one clear purpose
- Separate concerns (filesystem server, database server, API server)
- Allow MCP hosts to connect to multiple specialized servers
- Keep servers focused and testable

**Detection:**
- MCP server codebase growing beyond 1,000 lines
- Failure in one tool (e.g., email) breaks unrelated tools (filesystem)
- Difficulty testing due to interdependencies

**Phase mapping:** Phase 1 (MCP architecture) - Design multi-server architecture from start

---

### Pitfall 16: Context Data Quality Neglect

**What goes wrong:** Knowledge graph filled with incomplete metadata, unstripped HTML, empty vectors, ambiguous product names. AI retrieval becomes garbage-in-garbage-out.

**Why it happens:** Focus on ingestion speed, not data quality. Assumption that "more data = better context."

**Consequences:**
- 60% of AI projects without AI-ready data abandoned through 2026
- Massive cost overruns processing poor-quality data at scale
- AI confusion from inconsistent context

**Prevention:**
- Validate and clean data during ingestion
- Strip HTML, normalize formats
- Enrich with metadata (timestamps, source, confidence)
- Implement data quality monitoring
- Chunk text appropriately for retrieval

**Detection:**
- AI responses citing malformed or irrelevant content
- High retrieval volume but low accuracy
- Users manually correcting AI output frequently

**Phase mapping:** Phase 1-2 (Data ingestion) - Build quality gates into ingestion pipeline

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 17: n8n Merge Node Waiting Forever

**What goes wrong:** Merge node configured to wait for both inputs, but upstream branch conditionally never fires. Workflow hangs indefinitely.

**Prevention:**
- Use "Wait for First Input" mode when branches are conditional
- Add timeouts to merge operations
- Test all branch paths

**Detection:** Workflows showing "Executing" status for hours/days

---

### Pitfall 18: n8n Webhook Endpoints Unsecured

**What goes wrong:** Webhook accepts requests from anyone. Bots/scrapers trigger workflows, consuming resources or exposing data.

**Prevention:**
- Use webhook authentication (header tokens, HMAC signatures)
- Validate webhook payloads
- Rate limit webhook endpoints
- Use n8n's webhook authentication features

**Detection:** Unexpected workflow executions, unusual traffic patterns

---

### Pitfall 19: Neo4j Transaction Limitations

**What goes wrong:** Attempt to modify schema and data in same transaction. Neo4j rejects transaction. Migration fails.

**Prevention:**
- Separate schema changes from data changes
- Run schema migrations first, then data migrations
- Test migration scripts in staging

**Detection:** Transaction errors during migration, rollback required

---

### Pitfall 20: MCP Protocol Version Confusion

**What goes wrong:** Client and server use different MCP protocol versions. "Claude was unable to connect" errors with unclear messages.

**Prevention:**
- Pin MCP SDK versions explicitly
- Test against target MCP hosts (Claude Desktop, etc.)
- Monitor MCP spec changes
- Version your server's protocol compatibility

**Detection:** Connection failures with cryptic errors, protocol negotiation failures

---

### Pitfall 21: Graph Database Encoding Entities as Relationships

**What goes wrong:** Model (Alice)-[:EMAILED]->(Bob) instead of (Alice)-[:SENT]->(Email)-[:TO]->(Bob). Queries for actual email content fail because email doesn't exist as node.

**Prevention:**
- Entities are nodes, actions are relationships
- If you need to query properties of the "thing," make it a node
- Review schema with "can I query for X?" test

**Detection:**
- Queries returning relationships but missing entity details
- Cannot filter/sort by relationship properties effectively

---

### Pitfall 22: CRDT Interleaving Anomaly

**What goes wrong:** Two users insert text at same position concurrently. Text syncs but appears interleaved unexpectedly (e.g., "Hello" + "World" becomes "HWeolrllod").

**Prevention:**
- Use battle-tested CRDT libraries (Yjs, Automerge) that handle this
- Don't implement CRDTs from scratch
- Test concurrent edits extensively

**Detection:** User reports of "garbled text" after sync

---

### Pitfall 23: Mobile Monorepo Build Plugin Complexity

**What goes wrong:** Custom Capacitor plugins for one app require complex build configuration. All apps inherit plugin build steps, slowing builds unnecessarily.

**Prevention:**
- Isolate platform-specific plugins per app
- Use monorepo tools' "affected" logic to skip unnecessary builds
- Consider extracting complex plugins to separate packages

**Detection:** Build times increasing as apps added, all apps rebuilding on plugin change

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Foundation (Phase 1)** | Building graph schema before retrieval patterns | Design queries first, schema second |
| **Foundation (Phase 1)** | No multi-tenancy plan | Decide database-per-tenant vs. shared upfront |
| **Foundation (Phase 1)** | Monorepo without tooling | Adopt Nx/Turborepo before consolidation |
| **Consolidation (Phase 2)** | Git divergent branch chaos | Create merge strategy document, test first |
| **Consolidation (Phase 2)** | Tight coupling in shared code | Define module boundaries, version policies |
| **MCP Integration (Phase 2)** | Security vulnerabilities | Implement auth, tool permissions, rate limiting from start |
| **MCP Integration (Phase 2)** | Monolith MCP server | Design multi-server architecture |
| **n8n Workflows (Phase 2)** | Hardcoded credentials | Use credential manager exclusively |
| **n8n Workflows (Phase 2)** | Missing error handling | Build error workflows as templates |
| **Mobile Sync (Phase 3)** | Last-write-wins conflicts | Adopt CRDT or proven sync engine |
| **Mobile Sync (Phase 3)** | Background task API overload | Implement jitter, JSON-only fetching |
| **Mobile Sync (Phase 3)** | Ignoring offline scenarios | Design offline-first data layer |
| **Knowledge Graph (All Phases)** | Scope creep (too many sources) | Start with ONE source, validate before adding |
| **Knowledge Graph (All Phases)** | Poor data quality | Build quality gates into ingestion |
| **AI Context (All Phases)** | Over-personalization | Measure context relevance, not just volume |

---

## Consolidation-Specific Pitfalls

### Pitfall 24: Assuming "Similar Tech" Means "Easy Merge"

**What goes wrong:** Three codebases use React Native, Neo4j, n8n. Team assumes they can merge easily. Discover incompatible:
- React Native versions (different architecture - old vs. new)
- Neo4j schema designs (different node/relationship conventions)
- n8n workflow assumptions (different credential storage, different API endpoints)
- Environment configurations
- Build toolchains

**Why it happens:** Surface-level technology similarity masks deep divergence in implementation patterns, architectural decisions, and operational assumptions.

**Consequences:**
- Merge creates Frankenstein system that doesn't fully work
- Features from one codebase don't transfer to others
- Regressions discovered weeks after consolidation
- Team morale drops as "simple merge" becomes nightmare

**Prevention:**
1. **Deep divergence analysis BEFORE consolidation** - Don't just compare package.json, analyze:
   - Architectural patterns (data flow, state management, API design)
   - React Native architecture version (old bridge vs. new Fabric)
   - Neo4j schema conventions (relationship naming, multi-tenancy approach)
   - n8n workflow integration points (how workflows interact with backend)
   - Environment variable usage and configuration management
2. **Create reconciliation plan per subsystem** - Document "source of truth" for each area
3. **Identify breaking changes** - What works in Codebase A but won't work in consolidated version?
4. **Build migration test suite** - Validate features survive consolidation
5. **Plan for regression testing** - Consolidated system must pass all three original test suites

**Detection:**
- Feature matrix shows capabilities lost after merge
- "It worked in the old app" becomes common refrain
- Bug reports mentioning specific previous codebase
- Team members advocating to "just use Codebase A's approach" without consensus

**Phase mapping:**
- **Phase 0 (Pre-consolidation):** Conduct deep divergence analysis
- **Phase 1:** Build reconciliation plan, identify non-negotiable patterns
- **Phase 2-3:** Execute consolidation with continuous regression testing

**Confidence:** HIGH - Based on monorepo consolidation research and codebase merge best practices

---

### Pitfall 25: Loss of Working Features During Consolidation

**What goes wrong:** Codebase A has feature X working. Codebase B has feature Y working. After consolidation, both features broken or partially functional.

**Why it happens:**
- Features depend on subtle environmental setup not documented
- Implicit dependencies on codebase structure
- Build configurations tuned to specific version combinations
- Different runtime assumptions (mobile vs. backend)

**Prevention:**
1. **Feature inventory before consolidation** - Document what works in each codebase
2. **Dependency tree analysis** - Map explicit AND implicit dependencies
3. **Environment parity testing** - Ensure consolidated setup supports all features
4. **Incremental validation** - After each merge step, validate features still work
5. **Feature flags for testing** - Ability to toggle features during consolidation

**Detection:**
- Features marked "working" in old codebase fail in new
- Integration tests passing, but end-to-end tests failing
- "It works on my machine" (from developer with old codebase checked out)

**Phase mapping:** All phases - Continuous feature validation

---

### Pitfall 26: Three-Way Environment Variable Conflict

**What goes wrong:** Each codebase has .env file with same variable names but different values/meanings:
- omnii: `API_URL=http://localhost:3000/api`
- omnii-mobile: `API_URL=https://prod-api.omnii.com`
- omnii-mcp: `API_URL` unused, uses `MCP_ENDPOINT` instead

After merge, unclear which value to use, apps connect to wrong endpoints.

**Prevention:**
1. **Environment variable audit** - Map all env vars across codebases BEFORE merge
2. **Namespace by app** - Use prefixes (MOBILE_API_URL, BACKEND_API_URL, MCP_API_URL)
3. **Shared .env.example** - Document all variables with comments on usage
4. **Validation scripts** - Check required env vars present and valid
5. **Environment-specific configs** - dev/staging/prod configs explicit

**Detection:**
- Apps connecting to wrong environments after consolidation
- "Unexpected response" errors due to API mismatch
- Developers manually changing .env frequently

**Phase mapping:** Phase 1 (Pre-consolidation) - Environment variable reconciliation

---

## Research Confidence Assessment

| Pitfall Category | Confidence | Source Quality |
|------------------|------------|----------------|
| Knowledge Graphs | HIGH | Multiple 2026 sources, academic research, industry adoption data |
| MCP Security | HIGH | Official docs, security research, implementation guides |
| Neo4j Multi-Tenancy | MEDIUM | Community discussions, 2020 blog posts verified against 4.0+ docs |
| Monorepo Consolidation | HIGH | Recent 2025-2026 case studies, tool documentation |
| Local-First Sync | HIGH | 2026 architecture guides, CRDT research, sync engine docs |
| n8n Workflows | HIGH | Recent 2026 blog posts on specific mistakes |
| Git Workflows | MEDIUM | General Git best practices applied to consolidation |
| React Native Sync | MEDIUM | 2026 guides on background tasks and offline-first |
| Consolidation-Specific | MEDIUM | Inferred from monorepo + divergent codebase research |

---

## Sources

### Knowledge Graphs
- [Knowledge Graph Implementation: Costs & Obstacles | Cutter Consortium](https://www.cutter.com/article/knowledge-graph-implementation-costs-obstacles)
- [Cognee - Knowledge Graphs: Understand Misconceptions for Smarter Insights](https://www.cognee.ai/blog/fundamentals/knowledge-graph-myths)
- [2026 data predictions: Scaling AI agents via contextual intelligence - SiliconANGLE](https://siliconangle.com/2026/01/18/2026-data-predictions-scaling-ai-agents-via-contextual-intelligence/)
- [Why Context Will Be a Key 2026 AI Enabler – IT Business Net](https://itbusinessnet.com/2026/01/why-context-will-be-a-key-2026-ai-enabler/)

### MCP Server Security & Architecture
- [Model Context Protocol (MCP): Understanding security risks and controls - Red Hat](https://www.redhat.com/en/blog/model-context-protocol-mcp-understanding-security-risks-and-controls)
- [Implementing model context protocol (MCP): Tips, tricks and pitfalls | Nearform](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/)
- [What are common mistakes developers make when first using Model Context Protocol (MCP)? - Milvus](https://milvus.io/ai-quick-reference/what-are-common-mistakes-developers-make-when-first-using-model-context-protocol-mcp)
- [MCP Best Practices: Architecture & Implementation Guide](https://modelcontextprotocol.info/docs/best-practices/)
- [Architecture overview - Model Context Protocol](https://modelcontextprotocol.io/docs/learn/architecture)

### Neo4j Multi-Tenancy
- [Neo4j 4: Multi tenancy - GraphAware](https://graphaware.com/blog/multi-tenancy-neo4j/)
- [Multi-Tenancy in Neo4j 4.0 - Adam Cowley](https://adamcowley.co.uk/posts/multi-tenancy-neo4j-40/)
- [Multi Tenancy in Neo4j: A Worked Example - Neo4j](https://neo4j.com/developer/multi-tenancy-worked-example/)

### Monorepo Consolidation
- [From Monorepo Mess to Monorepo Bliss: Avoiding Common Mistakes - InfoQ](https://www.infoq.com/presentations/monorepo-mistakes/)
- [5 Mistakes That You Should Definitely Avoid With A Monorepo - Bits and Pieces](https://blog.bitsrc.io/5-mistakes-that-you-should-avoid-with-a-monorepo-956e8fe3633e)
- [Monorepo Dependency Chaos: Proven Hacks to Keep Your Codebase Sane - DEV Community](https://dev.to/alex_aslam/monorepo-dependency-chaos-proven-hacks-to-keep-your-codebase-sane-and-your-team-happy-1957)
- [Managing Multiple Mobile Apps in a Monorepo - Bluesunrise](https://bluesunrise.com/blog/monorepo/)

### Local-First & Sync Architecture
- [The Architecture Shift: Why I'm Betting on Local-First in 2026 - DEV Community](https://dev.to/the_nortern_dev/the-architecture-shift-why-im-betting-on-local-first-in-2026-1nh6)
- [Cool frontend arts of local-first: storage, sync, conflicts - Evil Martians](https://evilmartians.com/chronicles/cool-front-end-arts-of-local-first-storage-sync-and-conflicts)
- [Why Local-First Software Is the Future and its Limitations - RxDB](https://rxdb.info/articles/local-first-future.html)

### CRDTs & Operational Transforms
- [Building Collaborative Interfaces: Operational Transforms vs. CRDTs - DEV Community](https://dev.to/puritanic/building-collaborative-interfaces-operational-transforms-vs-crdts-2obo)
- [Deciding between CRDTs and OT for data synchronization - Tom's Site](https://thom.ee/blog/crdt-vs-operational-transformation/)
- [Building real-time collaboration applications: OT vs CRDT - Tiny](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)

### n8n Workflow Mistakes
- [5 n8n Workflow Mistakes That Quietly Break Automation - Medium](https://medium.com/@connect.hashblock/5-n8n-workflow-mistakes-that-quietly-break-automation-f1a4cfdac8bc)
- [7 common n8n workflow mistakes that can break your automations - Medium](https://medium.com/@juanm.acebal/7-common-n8n-workflow-mistakes-that-can-break-your-automations-9638903fb076)
- [AI Workflow Builder Best Practices – n8n Blog](https://blog.n8n.io/ai-workflow-builder-best-practices/)

### React Native & Mobile Sync
- [Run React Native Background Tasks 2026 For Optimal Performance - DEV Community](https://dev.to/eira-wexford/run-react-native-background-tasks-2026-for-optimal-performance-d26)
- [Offline first: how to apply this approach in React Native? - Medium](https://medium.com/@vitorbritto/offline-first-how-to-apply-this-approach-in-react-native-e2ed7af29cde)

### Git Divergent Branches
- [Mastering Git Merge and Rebase to Avoid Code Conflicts in 2026 - Medium](https://medium.com/@annxsa/mastering-git-merge-and-rebase-to-avoid-code-conflicts-in-2026-3baa7e86010c)
- [Dealing with diverged git branches - Julia Evans](https://jvns.ca/blog/2024/02/01/dealing-with-diverged-git-branches/)

### Graph Database Anti-Patterns
- [10 Performance, Pitfalls, and Anti-Patterns - Graph Databases in Action](https://livebook.manning.com/book/graph-databases-in-action/chapter-10/v-9/)
- [Data Modeling in Graph Databases - InfoQ](https://www.infoq.com/articles/data-modeling-graph-databases/)

### Context & AI Data Quality
- [Context Rot: How Increasing Input Tokens Impacts LLM Performance - Chroma Research](https://research.trychroma.com/context-rot)
- [AI Data Quality Mistakes That Sabotage Your AI Strategy - QAT](https://qat.com/ai-data-quality-mistakes/)
- [Personal Intelligence: Connecting Gemini to Google apps - Google Blog](https://blog.google/innovation-and-ai/products/gemini-app/personal-intelligence/)
