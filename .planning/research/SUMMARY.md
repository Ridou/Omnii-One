# Project Research Summary - v2.0

**Project:** Omnii One v2.0 Feature Expansion
**Domain:** Personal context server with knowledge management
**Researched:** 2026-01-26
**Confidence:** HIGH

## Executive Summary

v2.0 adds local file ingestion, notes capture, enhanced AI intelligence, and gamification to the existing v1.0 personal context server. Research shows these features integrate cleanly with the proven Bun/Elysia/Neo4j/PowerSync architecture by extending existing patterns: BullMQ workers for file processing (mirrors Google services ingestion), Neo4j Document/Chunk nodes (extends entity graph), PowerSync sync for offline notes, and Supabase tables for gamification state.

The recommended approach prioritizes file ingestion first (extends proven pipeline, provides document corpus), then notes capture (needs chunking strategies), then enhanced NLP (needs document corpus for validation), and finally gamification (pure additive). This sequence follows dependency chains and derisks integration by building on validated v1.0 patterns. Use JavaScript-native NLP (compromise, Transformers.js) rather than Python microservices to maintain operational simplicity; defer to v3.0 if accuracy metrics demand it.

Critical risks center on data quality degradation and user trust erosion. File parsing achieves only 50-70% accuracy "out of the box" without validation gates. LLM entity extraction generates hallucinations and duplicate nodes at scale without semantic entity resolution. Gamification effectiveness drops after 3 days without meaningful progression systems. Notes sync conflicts cause data loss if not using CRDTs. All require human-in-the-loop validation and quality scoring that v1.0's structured Google data didn't need. Prevention: build extraction quality scoring, entity resolution, and CRDT-based sync from day one—not as post-launch fixes.

## Key Findings

### Recommended Stack

v2.0 builds on the validated v1.0 stack (Bun, Elysia, Neo4j HTTP API, Supabase, PowerSync, React Native 0.79.3/Expo 53) with strategic additions focused on JavaScript-native solutions to maintain operational simplicity.

**Core technologies:**

**Backend additions:**
- **unpdf (v1.4.0)**: PDF text extraction — Modern serverless-optimized parser using PDF.js internally, works across all JS runtimes including Bun, more robust than pdf-parse for complex documents
- **mammoth (v1.8.0)**: Word doc parsing — De facto standard for .docx conversion to HTML, actively maintained
- **markdown-it (v14.1.0) + markdown-it-wikilinks (v1.0.0)**: Markdown parsing with wiki-style linking — Enables Obsidian-style `[[brackets]]` bidirectional links
- **tree-sitter (v0.21.1)**: Code parsing — Superior AST-based parsing for 70+ languages, used by GitHub
- **compromise (v14.13.0) + @xenova/transformers (v2.17.0)**: Entity extraction — JavaScript-native NLP avoiding Python microservice complexity. Use compromise for real-time, Transformers.js with BERT NER for batch processing
- **file-type (v19.6.0)**: MIME detection for ingestion routing

**Mobile additions:**
- **@jamsch/expo-speech-recognition (v0.3.1)**: Voice transcription — Uses native iOS/Android speech recognition, faster to ship than whisper.rn
- **react-native-reanimated (v4.2.1)**: Core animations — 60fps UI thread animations, v4.x compatible with RN 0.79.3 New Architecture
- **lottie-react-native (v7.3.5) + rive-react-native (v6.0.0)**: Dual animation system — Lottie for mascot character (After Effects workflow), Rive for UI gamification (3x faster, 12x smaller files)
- **react-native-gifted-charts (v1.4.40)**: Analytics charts — Feature-rich, visually appealing, covers 90% of dashboard needs

**Key decisions:**
- JavaScript-native NLP over Python microservices (defer to v3.0 if accuracy metrics show need)
- Native OS speech recognition over whisper.rn (100MB+ model download, ship faster for MVP)
- Both Lottie AND Rive (artists use Lottie, performance needs Rive)
- Backend-side entity extraction (consistency, GPU acceleration, centralized fine-tuning)

### Expected Features

Research identifies a clear split between table stakes (users expect in any knowledge management system) and differentiators (Omnii One's competitive advantages from MCP + graph architecture).

**Must have (table stakes):**
- **Import common file formats (PDF, DOCX, TXT, MD, code)** — Users have existing documents, expect seamless ingestion
- **Quick capture (<3 seconds from anywhere)** — Notion's Cmd+Shift+N pattern, mobile widgets, speed is critical or users abandon
- **Wiki-style linking `[[brackets]]`** — Third-generation note apps standard since Roam 2019, bidirectional with backlinks panel
- **Search across all content** — Vector + full-text search for file contents and notes
- **Entity extraction (people, dates, places)** — Baseline NER is table stakes, graph stays shallow without it
- **Basic progress indicators** — XP bar, current level, next milestone visibility for gamification engagement

**Should have (competitive differentiators):**
- **Cross-source relationship inference** — Auto-connect "This meeting is with John, who emailed yesterday about project X" (GraphRAG advantage)
- **Proactive context ("Heads Up")** — Surface relevant info 15min before meetings (Gemini launched this Jan 2026 as "Personal Intelligence")
- **Code repository ingestion** — Developers want work context, most PKM apps ignore code
- **Offline-first file processing** — Process locally, sync when ready (privacy + speed vs. cloud-first competitors)
- **MCP-native gamification** — AI can grant achievements via tool calls ("Claude helped you complete 50th task")
- **Incremental achievements** — Long-term goals broken into tiers (research shows 10-session minimum reduces abandonment)
- **Mascot with personality** — Emotional connection drives retention (Duolingo model)
- **Actionable analytics** — "Your 3pm meetings have 40% more follow-up tasks" not vanity metrics

**Defer (v2+):**
- **Custom entity types** — Complex, not critical for initial release
- **Multi-modal extraction (images/charts)** — Defer until text extraction validated
- **Real-time collaborative editing** — Single-user focus, massive complexity (CRDT, conflict resolution)
- **Social/sharing features** — Against privacy principles

**Anti-features (explicitly avoid):**
- **Built-in rich text editor** — Scope creep, support markdown + external editors
- **Mandatory cloud sync** — Privacy dealbreaker, make cloud optional
- **Overly chatty AI** — Research shows constant interruptions = annoying, user-initiated only
- **Streak-based gamification only** — Creates anxiety, use persistent XP + levels instead
- **Vanity metric dashboards** — Show actionable patterns, not "You created 47 notes!"

### Architecture Approach

v2.0 extends v1.0's proven patterns (BullMQ workers, Neo4j graph, PowerSync sync, MCP tools) rather than replacing them. Integration follows four parallel tracks that converge on the existing infrastructure.

**Major components:**

1. **File Ingestion Pipeline** — Extends BullMQ worker pattern from Google services. Uses officeParser for multi-format parsing, semantic/markdown/code chunking strategies, generates embeddings via existing service. Neo4j Document/Chunk nodes with kNN similarity graph. Supabase Storage for blobs (existing infrastructure), metadata in graph. Key: Async processing with status updates via PowerSync, not blocking UI.

2. **Notes Capture System** — Leverages PowerSync offline-first sync, Neo4j bidirectional relationships for wiki-style `[[links]]`. Note nodes with LINKS_TO relationships, WikiLinkParser service for extraction, template system for common note types. Supabase sync_notes table for mobile offline queue. Key: CRDT-based sync to prevent data loss from offline conflicts, quick capture (<3s) from widgets.

3. **Enhanced NLP Pipeline** — Builds on existing EntityExtractionService with hybrid approach: compromise for real-time lightweight extraction, @xenova/transformers with BERT NER for batch processing, LLM fallback for ambiguous cases. ProactiveContextService queries temporal context (upcoming 24hrs) and surfaces GraphRAG retrieval. RelationshipInference service suggests cross-source connections with user approval. Key: Backend-side processing (consistency, GPU, centralized tuning), confidence thresholds, semantic entity resolution to prevent duplicate explosion.

4. **Gamification System** — Uses Supabase tables (user_gamification, achievements, user_achievements, xp_transactions) synced via PowerSync. XPEngine awards XP for actions, AchievementEngine evaluates criteria, MascotSystem manages mood/dialogue. Real-time tRPC subscriptions for live XP updates. Event-driven architecture: action completes → award XP → PowerSync sync → mobile animation. Key: Batched XP awards (30s windows), persistent levels not streaks, optional opt-out.

**Integration matrix:**

| v2.0 Feature | Extends v1.0 Component | New Services | Storage |
|--------------|------------------------|--------------|---------|
| File Ingestion | BullMQ workers, embedding service | FileParserService, ChunkingStrategy | Supabase Storage (blobs), Neo4j Document/Chunk nodes |
| Notes Capture | PowerSync sync, search_nodes tool | WikiLinkParser, TemplateSystem | Neo4j Note nodes, Supabase sync_notes |
| Enhanced NLP | EntityExtractionService, GraphRAG | EnhancedEntityExtractor, ProactiveContextService | Neo4j MENTIONS relationships |
| Gamification | PowerSync sync, tRPC subscriptions | XPEngine, AchievementEngine, MascotSystem | Supabase tables |

**Storage strategy:**
- Neo4j: Rich relationships, semantic search, entity linking (Document/Chunk/Note metadata)
- Supabase: Sync state, real-time updates, relational queries, auth (sync tables, gamification)
- Supabase Storage: Blob storage with CDN (file binaries)

### Critical Pitfalls

Research identifies six critical pitfalls that cause rewrites, data loss, or user trust violations. All stem from v2.0 features being inherently less reliable than v1.0's structured Google data.

1. **File Parsing Silent Failures** — PDFs "successfully" ingested but tables garbled, images missing, content incomplete. Users discover weeks later. Manual entry error rate ~1%, automated parsing can be worse without validation. **Prevention:** Implement extraction quality scoring from day one. Flag low-confidence extractions (<70%) for human review. Test with real-world scanned documents and complex layouts, not just clean test files. Provide extraction preview before committing to graph. Track parsing errors and implement fallback strategies.

2. **LLM Entity Extraction Hallucination Cascade** — Enhanced NLP creates fictional entities and relationships. Graph fills with non-existent people, invented meetings. AI returns confident but wrong context. **Prevention:** Use small specialized models for 80-95% of extractions, escalate hard cases only. Implement confidence thresholds (reject <80%, flag 80-90%). Cross-reference with existing entities before creating new nodes. Human-in-the-loop for high-impact entities. Use semantic entity resolution to detect and merge duplicates/hallucinations. Test with adversarial inputs (prompt injection, fictional content).

3. **Graph Database Duplicate Entity Explosion** — "John Smith" becomes 47 separate nodes (John, J. Smith, john smith, etc.). LLM extraction produces large numbers of duplicates. Queries return incomplete results, visualizations become "exceptionally noisy, obfuscating important patterns." **Prevention:** Implement entity resolution pipeline during ingestion, not after. Use semantic entity resolution with language models for matching and merging. Create canonical entity IDs, normalize names. Prefer merging similar entities over creating new nodes. Use external IDs (emails, phones) when available. Monitor duplicate rate, track entity creation vs. unique entities.

4. **Notes Sync Conflicts and Data Loss** — User captures notes offline, returns online, edits disappear. Last-write-wins guarantees data loss. Users lose trust, abandon feature. **Prevention:** Implement CRDT for note content (Yjs, Automerge). Use proven sync engines (PowerSync already in v1.0), never build custom sync. Avoid last-write-wins. Design conflict-free operations (append-only events). Provide clear sync status (local-only vs. synced). Test offline scenarios extensively (network loss during write, concurrent edits). Implement optimistic UI with rollback.

5. **Storage Bloat from Unmanaged File Ingestion** — No quotas, storing originals + extracted text + embeddings without dedup, versioning everything. Storage costs explode 10-100x, query performance degrades, vector search becomes prohibitively expensive. **Prevention:** Enforce file size quotas per user (5GB free tier). Use appropriate storage tiers (hot for frequent, cold for archives). Hash-based deduplication across users. Separate file storage (S3/GCS) from graph storage (Neo4j for metadata only). Intelligent archiving moves old/unused files automatically. Compress embeddings with quantization. Limit versioning to last N versions.

6. **Gamification Reward Fatigue and User Annoyance** — XP system launches with fanfare, after 3 days users find it annoying. Notifications become spam. Research shows gamification rarely increases productivity beyond 3 days. Streak anxiety, focus on metrics over meaningful work (Goodhart's Law). **Prevention:** Reward outcomes not activity (goals achieved, not hours logged). Make rewards meaningful (unlock features, not just badges). Avoid streak mechanics (create anxiety). Allow opt-out. Design for long-term engagement beyond novelty. Respect user focus (minimal notifications, in-context achievements, no interrupts). Measure real productivity impact, not engagement vanity metrics. Start minimal, add based on validated feedback.

## Implications for Roadmap

Based on dependency analysis, integration risks, and research findings, recommend 4-phase structure aligned with architectural dependency chains:

### Phase 1: File Ingestion Foundation
**Rationale:** Extends proven v1.0 BullMQ ingestion pattern, provides document corpus required for Phases 2-3. Highest confidence path (follows established patterns). Validates chunking strategies needed for notes. Derisk file parsing quality before building dependent features.

**Delivers:**
- Multi-format file parsing (PDF, DOCX, TXT, MD, code)
- Semantic/markdown/code chunking strategies
- Neo4j Document/Chunk schema extension
- Supabase Storage integration
- Background processing via BullMQ
- Extraction quality scoring and validation gates

**Addresses:**
- Import common file formats (table stakes)
- Search file contents (extend vector search)
- Offline-first processing (differentiator)

**Avoids:**
- File parsing silent failures (quality scoring from day one)
- Storage bloat (quotas, deduplication, tiered storage)

**Research needs:** Standard patterns, skip research-phase. File parsing libraries well-documented, chunking strategies established in RAG literature.

---

### Phase 2: Notes Capture System
**Rationale:** Needs chunking strategies from Phase 1 for long notes. Provides user-generated content for Phase 3 NLP validation. Leverages PowerSync offline-first architecture already validated in v1.0. Critical for "quick capture" table stakes feature.

**Delivers:**
- Note node schema in Neo4j
- PowerSync sync_notes table for offline
- WikiLinkParser for bidirectional `[[links]]`
- Mobile quick capture UI with templates
- Backlinks panel and visualization
- CRDT-based sync to prevent data loss

**Addresses:**
- Quick capture <3 seconds (table stakes)
- Wiki-style linking `[[brackets]]` (table stakes)
- Backlinks panel (table stakes)
- Templates for common note types (table stakes)

**Avoids:**
- Notes sync conflicts and data loss (CRDT from day one, not LWW)
- Notes capture friction kills adoption (minimize time-to-capture, one-tap widgets)

**Research needs:** Minimal research required. PowerSync patterns established, CRDT libraries (Yjs, Automerge) well-documented. Quick capture UX patterns studied extensively (Notion, Obsidian).

---

### Phase 3: Enhanced NLP Pipeline
**Rationale:** Needs document corpus from Phases 1-2 for validation and tuning. Builds on existing EntityExtractionService with confidence. Implements differentiators (cross-source relationships, proactive context) that justify "AI always has right context" value prop. Most complex integration, benefits from validated file ingestion and notes infrastructure.

**Delivers:**
- Enhanced entity extraction (compromise + Transformers.js BERT NER)
- Confidence scoring and validation gates
- Semantic entity resolution (prevent duplicates)
- ProactiveContextService for "Heads Up" notifications
- RelationshipInference with user approval
- Cross-source relationship discovery

**Addresses:**
- Entity extraction (table stakes)
- Cross-source relationship inference (differentiator - HIGH VALUE)
- Proactive context "Heads Up" (differentiator - HIGH VALUE)
- Actionable analytics patterns (differentiator)

**Avoids:**
- LLM hallucination cascade (confidence thresholds, small models, validation)
- Duplicate entity explosion (semantic entity resolution from start)
- LLM cost explosion (model routing: 80-95% to mini/fast, batch processing, caching)
- Integration performance degradation (async extraction via BullMQ, not synchronous)

**Research needs:** MODERATE research during phase planning. Entity resolution strategies emerging in 2026, LLM routing for cost optimization needs specific parameter tuning, proactive context timing patterns require UX validation.

---

### Phase 4: Gamification System
**Rationale:** Pure additive feature with no blocking dependencies. Can start in parallel with Phase 3. Builds on validated PowerSync sync and tRPC subscriptions. Polish and engagement layer works better once users have adopted core features (files + notes + AI). Lowest integration risk.

**Delivers:**
- XP + levels system with exponential curve
- Achievement system (standard + incremental)
- Mascot companion with mood/dialogue
- Analytics dashboard with actionable insights
- Real-time XP updates via tRPC subscriptions
- Supabase tables synced via PowerSync

**Addresses:**
- Basic progress indicators (table stakes for gamification)
- Incremental achievements (differentiator)
- Mascot with personality (differentiator)
- Actionable analytics dashboard (differentiator)
- MCP-native gamification (differentiator)

**Avoids:**
- Reward fatigue and user annoyance (reward outcomes not activity, allow opt-out, minimal notifications)
- Streak anxiety (persistent XP + levels, not fragile streaks)
- Vanity metrics (actionable patterns: "3pm meetings → 40% more follow-ups")

**Research needs:** LOW research needs. Gamification patterns well-documented, XP/achievement systems established in gaming and productivity apps. Trophy.so, level-up libraries provide reference architectures.

---

### Phase Ordering Rationale

**Dependency chain:**
```
File Ingestion (provides document corpus)
  └─→ Notes Capture (needs chunking strategies from Phase 1)
        └─→ Enhanced NLP (needs document corpus from Phases 1-2 for validation)

Gamification (parallel, no dependencies on other phases)
```

**Why this order:**
1. **File Ingestion first** — Extends proven v1.0 pattern (BullMQ workers, Neo4j nodes), highest confidence. Provides document corpus needed for Phases 2-3. Validates chunking strategies. Derisk file parsing quality before dependent features.

2. **Notes Capture second** — Needs chunking from Phase 1 for long notes. Provides user-generated content for Phase 3 NLP tuning. Leverages validated PowerSync offline-first. Critical table stakes feature.

3. **Enhanced NLP third** — Needs document corpus for validation. Most complex integration benefits from stable infrastructure. Implements high-value differentiators (cross-source relationships, proactive context) that justify product positioning.

4. **Gamification last (or parallel with Phase 3)** — Pure additive, no blocking dependencies. Engagement layer works better after feature adoption. Lowest integration risk allows parallel development.

**How this avoids pitfalls:**
- Builds quality scoring and validation gates from Phase 1 (file parsing failures)
- Validates entity extraction on real corpus before scaling (hallucination cascade)
- Implements CRDT sync from Phase 2 start (data loss)
- Semantic entity resolution baked into Phase 3 architecture (duplicate explosion)
- Async processing via BullMQ prevents performance degradation
- Gamification designed with opt-out and meaningful progression (reward fatigue)

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Enhanced NLP):** Semantic entity resolution strategies emerging in 2026, needs specific algorithm selection. LLM routing parameters for cost optimization require load testing. Proactive context timing patterns need UX validation with user studies.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (File Ingestion):** File parsing libraries (unpdf, mammoth, tree-sitter) well-documented. Chunking strategies established in RAG/GraphRAG literature. BullMQ worker patterns validated in v1.0.
- **Phase 2 (Notes Capture):** PowerSync sync patterns established in v1.0. CRDT libraries (Yjs, Automerge) have extensive docs. Wiki-linking patterns from Obsidian/Roam well-studied.
- **Phase 4 (Gamification):** XP/achievement systems well-documented in gaming literature. Trophy.so and level-up libraries provide reference implementations. Analytics dashboard patterns from productivity apps.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommended libraries are production-proven with 2026 releases. JavaScript-native NLP validated in multiple sources. React Native 0.79.3 compatibility confirmed for all mobile libraries. |
| Features | MEDIUM | Table stakes features validated via competitive analysis (Notion, Obsidian, Roam). Differentiator validation based on 2026 trends (Gemini proactive intelligence, GraphRAG advantages) but limited direct competitor comparison for MCP+graph combo. |
| Architecture | HIGH | Extends validated v1.0 patterns (BullMQ, PowerSync, Neo4j). Integration points clearly defined. officeParser, PowerSync, Neo4j patterns have production case studies. |
| Pitfalls | HIGH | 2025-2026 research specifically addresses LLM entity extraction hallucinations, CRDT sync conflicts, gamification effectiveness. PDF parsing accuracy studies from 2026. Entity resolution strategies from Neo4j 2026 research. |

**Overall confidence:** HIGH

### Gaps to Address

**Entity extraction accuracy thresholds:** Research shows 50-70% "out of the box" accuracy but specific thresholds for confidence scoring (80%? 90%?) need validation during Phase 3 with real document corpus. Plan to A/B test thresholds and measure impact on precision/recall.

**Semantic entity resolution algorithm selection:** 2026 research identifies semantic entity resolution as solution to duplicate explosion but multiple approaches exist (embedding similarity, LLM-based, rule-based hybrid). Need to evaluate specific algorithms (sentence-transformers, GliNER2, custom BERT fine-tuning) during Phase 3 planning with production data characteristics.

**Gamification progression curve tuning:** Research provides general principles (exponential curves, 10-session minimum, avoid streaks) but specific XP amounts per action and level thresholds require user testing. Plan to start conservative (generous XP awards) and tune down if inflation occurs rather than starting stingy and frustrating users.

**File parsing quality scoring metrics:** Need to define "good enough" extraction quality score. 70% confidence? 80%? 90%? How to measure confidence for document parsing (not just entity extraction)? Plan to use combination of signals: text coverage %, layout preservation score, OCR confidence (if applicable), user validation rate.

**Proactive context timing optimization:** Research shows 15-30min before meetings works, but specific timing per user may vary (some want 1hr prep, others want 5min). Plan to implement user preferences with smart defaults, learn from dismissal patterns.

## Sources

### Primary (HIGH confidence)

**Stack research:**
- [unpdf - GitHub](https://github.com/unjs/unpdf) — Modern PDF parser with Bun compatibility
- [mammoth.js - GitHub](https://github.com/mwilliamson/mammoth.js) — De facto DOCX parsing standard
- [@jamsch/expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition) — Most comprehensive Expo voice solution 2026
- [Reanimated 4 Stable Release](https://blog.swmansion.com/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713) — RN 0.79.3 compatibility confirmed
- [Lottie vs. Rive comparison](https://www.callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation) — Performance benchmarks
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/en/index) — JavaScript-native NLP

**Features research:**
- [MinerU GitHub](https://github.com/opendatalab/MinerU) — Document processing for LLMs
- [Obsidian Extract PDF Plugin](https://github.com/akaalias/obsidian-extract-pdf) — Wiki-linking patterns
- [GliNER2: Extracting Structured Information](https://towardsdatascience.com/gliner2-extracting-structured-information-from-text/) — Entity extraction state-of-art
- [Gemini's Proactive AI Responses (Jan 2026)](https://startupnews.fyi/2026/01/15/geminis-new-beta-feature-delivers-pro/) — Proactive context timing
- [Top 10 Gamified Productivity Apps 2025](https://yukaichou.com/lifestyle-gamification/the-top-ten-gamified-productivity-apps/) — Gamification patterns

**Architecture research:**
- [officeParser - npm](https://www.npmjs.com/package/officeparser) — Multi-format parsing architecture
- [PowerSync: Backend DB - SQLite sync](https://www.powersync.com) — Offline-first sync patterns
- [Neo4j Knowledge Graph Generation](https://neo4j.com/blog/developer/knowledge-graph-generation/) — Graph integration patterns
- [Chunking Strategies for LLM Applications](https://www.pinecone.io/learn/chunking-strategies/) — Semantic chunking

**Pitfalls research:**
- [A survey on privacy risks in LLMs](https://link.springer.com/article/10.1007/s44443-025-00177-1) — Hallucination and privacy risks
- [Entity Resolved Knowledge Graphs: Tutorial](https://neo4j.com/blog/developer/entity-resolved-knowledge-graphs/) — Duplicate prevention
- [Offline-First Apps: 2026 Benefits](https://www.octalsoftware.com/blog/offline-first-apps) — CRDT sync patterns
- [Productivity App Gamification That Doesn't Backfire](https://trophy.so/blog/productivity-app-gamification-doesnt-backfire) — Reward fatigue prevention
- [Data Extraction API Complete Guide 2026](https://parseur.com/blog/data-extraction-api) — Parsing accuracy studies

### Secondary (MEDIUM confidence)

- [7 PDF Parsing Libraries for Node.js](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) — Library comparisons
- [20 Productivity App Gamification Examples](https://trophy.so/blog/productivity-gamification-examples) — Feature patterns
- [The Rise of Semantic Entity Resolution](https://towardsdatascience.com/the-rise-of-semantic-entity-resolution/) — Algorithm approaches
- [Focus apps productivity claims](https://theconversation.com/focus-apps-claim-to-improve-your-productivity-do-they-actually-work-271388) — Gamification effectiveness data

### Tertiary (LOW confidence)

- Community discussions on Reddit r/PKM (personal knowledge management) — User expectations for features, needs validation
- GitHub issue discussions on CRDTs and sync conflicts — Implementation patterns, needs testing with Omnii One's specific stack

---
*Research completed: 2026-01-26*
*Ready for roadmap: yes*
