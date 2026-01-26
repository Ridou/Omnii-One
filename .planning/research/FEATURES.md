# Feature Landscape: v2.0 Expansion

**Domain:** Personal context server with file ingestion, notes, AI intelligence, and gamification
**Researched:** 2026-01-26
**Confidence:** MEDIUM (based on ecosystem analysis and product patterns)

## Context

This research covers NEW v2.0 features building on existing v1.0 foundation:

**Already built in v1.0:**
- Graph database (Neo4j) with entities, events, contacts, concepts
- MCP tools for AI assistants
- Google services sync (Calendar, Tasks, Gmail, Contacts)
- Mobile app with offline-first architecture
- n8n workflow automation

**v2.0 focus:**
- Local file ingestion
- Notes/knowledge capture
- Enhanced AI intelligence
- Gamification systems

---

## Table Stakes

Features users expect in a personal context/knowledge system. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Import common file formats** | Users have existing docs in PDF, Word, text, markdown | Medium | Must handle: PDF (text + OCR), DOCX, TXT, MD, code files. Tools like MinerU, PyMuPDF show this is expected in 2026 |
| **Quick capture (< 3 seconds)** | Capture thoughts instantly or they're lost | Low | Notion uses keyboard shortcuts (Cmd+Shift+N), mobile widgets. Speed is critical - if it's slow, users won't use it |
| **Wiki-style linking [[brackets]]** | Third-generation note apps standard since Roam (2019) | Low | Bidirectional links with `[[note name]]` syntax. Obsidian, Roam, Notion all support this. Users expect it now |
| **Backlinks panel** | See what connects to current note/entity | Low | Show all notes/entities that link here. Filtering required once connections grow |
| **Search across all content** | Find anything ingested, regardless of source | Medium | Already have vector search (v1.0). Need full-text search for file contents |
| **View file attachments** | See PDFs/images without leaving app | Low | Mobile especially needs inline viewers |
| **Templates for common note types** | Reduce friction for recurring patterns (meeting notes, contacts, journal) | Low | Meeting notes, daily journal, contact notes, project templates. Users create these manually if not provided |
| **Entity extraction (people, dates, places)** | AI should understand what's in content | High | Baseline NER (named entity recognition) is table stakes. Tools: spaCy, GliNER2. Without this, graph stays shallow |
| **Basic progress indicators** | Show completion/activity level | Low | For gamification: XP bar, current level, next milestone. Without visibility, no engagement |
| **Achievement notifications** | Recognize milestones when reached | Low | "You reached level 5!" popup. If hidden, users don't feel rewarded |

### Dependencies on Existing Features

```
File Ingestion → Entity Extraction (needs graph from v1.0)
Wiki Linking → Graph database (already exists)
Quick Capture → Mobile app (already exists)
Templates → Notes storage (needs implementation)
Gamification → Activity tracking (needs analytics)
```

---

## Differentiators

Features that set Omnii One apart from competitors. Not expected, but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Cross-source relationship inference** | Auto-connect email sender to calendar event to contact | High | "This meeting is with John, who emailed you yesterday about project X." Competitors keep data siloed. GraphRAG advantage |
| **Proactive context ("Heads Up")** | Surface relevant info BEFORE meetings/events | High | "Meeting in 15min with Sarah. Last discussed: Q4 budget concerns (see email from Jan 20)." Gemini launched this in Jan 2026 as "Personal Intelligence" |
| **Code repository ingestion** | Developers want work context, not just personal | Medium | Parse code files, commit messages, understand project structure. Most PKM apps ignore code |
| **Offline-first file processing** | Process files locally, sync when ready | Medium | Privacy + speed. Most apps require cloud upload first (Notion, Evernote) |
| **MCP-native gamification** | AI can grant achievements via tool calls | Medium | "Claude just helped you complete your 50th task - Achievement unlocked!" Unique to MCP architecture |
| **Custom entity types** | Users define their own entities beyond standard NER | High | "Track 'workouts', 'recipes', 'books' as entities." Flexible schema vs rigid types |
| **Incremental achievements** | Long-term goals (10,000 items) broken into tiers | Low | Research shows: 10-session minimum, progress bars critical, reduces abandonment. Most apps do one-time badges only |
| **Mascot with personality** | Emotional connection to productivity system | Low-Medium | Research shows gamification works when emotionally intelligent. Duolingo's owl = retention driver. Risk: annoying if not done well |
| **Actionable analytics** | Show time patterns, connection density, vs vanity metrics | Medium | "Your 3pm meetings have 40% more follow-up tasks than morning meetings." Not just "You created 47 notes this week" |
| **Multi-modal entity extraction** | Extract from images, charts, diagrams in PDFs | High | MinerU supports this. Go beyond text-only NER. Extract data from screenshots, handwritten notes |

### Competitive Analysis

| Feature | Omnii One | Obsidian | Notion | Roam | Evernote |
|---------|-----------|----------|--------|------|----------|
| Cross-source connections | YES | No (manual only) | No | No | No |
| Proactive suggestions | YES | No | No | No | No |
| MCP integration | YES | No | No | No | No |
| Local-first processing | YES | YES | No | No | No |
| Graph database | YES | No (flat files) | No | No | No |
| Gamification | YES | Plugins only | No | No | No |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Built-in rich text editor** | Scope creep. Obsidian spent years on editor. Not differentiator | Support markdown, let users edit in their preferred tool (VS Code, Obsidian, etc.) |
| **Real-time collaborative editing** | Single-user focus. Adds massive complexity (CRDT, conflict resolution) | Defer to v3+. Focus on personal context first |
| **Mandatory cloud sync** | Privacy dealbreaker. Users want local-first | Make cloud optional. Local processing is differentiator |
| **Overly chatty AI assistant** | Research shows: constant interruptions = annoying. Amy.ai case study: bombarded users with emails, harmed brand | Only surface suggestions contextually (before meeting, not randomly). User-initiated queries via MCP |
| **Streak-based gamification only** | Creates anxiety when life interrupts. "Missed my 47-day streak!" = abandonment | Use XP + levels (persistent) instead of streaks (fragile). Allow grace periods |
| **Vanity metric dashboards** | "You created 47 notes!" means nothing. Doesn't drive action | Show actionable patterns: "Your tasks from emails are 3x more likely to get done than verbal tasks" |
| **Auto-linking everything** | "Smart" auto-links become noise. Users lose control | Let users create links explicitly with [[brackets]]. Show suggestions, don't force |
| **Exporting to every format** | Pandoc rabbit hole. Maintenance burden | Export to markdown + JSON. Users can convert with tools |
| **Building OCR from scratch** | Solved problem. Tesseract, Google Vision, Azure exist | Use existing OCR APIs/libraries. Focus on processing results |
| **Custom NLP models per user** | Can't fine-tune models for each user. Compute + data requirements prohibitive | Use general-purpose NER, allow custom entity types via schema |
| **Social/sharing features** | Against privacy principles. Personal data stays private | Hard pass. No sharing, no social graph |
| **AI-powered everything** | LLM overhead for simple tasks. GliNER2 shows: specialized models > general LLMs for extraction | Use LLMs via MCP for queries. Use specialized NLP for extraction (cheaper, faster) |

---

## Feature Dependencies

Mapping how features build on each other:

```
FOUNDATION (v1.0 - already built)
├─ Graph database (Neo4j)
├─ MCP server
├─ Mobile app
├─ Google sync
└─ Vector search (GraphRAG)

FILE INGESTION
├─ PDF parsing (MinerU, PyMuPDF)
├─ Text extraction
├─ Metadata capture (created date, author, source)
└─ → Feeds into: Entity Extraction

ENTITY EXTRACTION
├─ Requires: File content + existing graph
├─ Tools: spaCy, GliNER2
├─ Outputs: People, places, dates, custom entities
└─ → Feeds into: Cross-source connections

NOTES SYSTEM
├─ Quick capture UI (< 3 sec)
├─ Wiki linking [[syntax]]
├─ Backlinks panel
├─ Templates library
└─ → Feeds into: Graph + Entity Extraction

PROACTIVE AI
├─ Requires: Calendar (v1.0) + Notes + Entities
├─ Context window: upcoming events
├─ Triggers: 15min before meeting, morning digest
└─ → Surfaces: Related notes, recent communications, task history

GAMIFICATION
├─ XP system (activity tracking)
│  ├─ +10 XP: Note created
│  ├─ +20 XP: File ingested
│  ├─ +30 XP: Task completed
│  └─ +50 XP: Weekly review
├─ Levels (1-50, exponential curve)
├─ Achievements (standard + incremental)
│  ├─ Standard: "First note", "Connected 10 entities"
│  ├─ Incremental: "100 tasks → 500 tasks → 1000 tasks"
│  └─ Hidden: Easter eggs for power users
├─ Mascot (visual companion)
└─ Analytics (actionable patterns)
```

---

## MVP Recommendation (v2.0)

Based on complexity, impact, and dependencies, prioritize:

### Phase 1: File Foundation
1. **File ingestion pipeline** (PDF, DOCX, TXT, MD) - Table stakes
2. **Basic entity extraction** (spaCy NER) - Table stakes
3. **Search file contents** (extend existing vector search) - Table stakes

**Why first:** Foundation for everything else. Without files in the graph, notes and AI have nothing to work with.

### Phase 2: Notes System
4. **Quick capture UI** (mobile + desktop) - Table stakes
5. **Wiki linking [[syntax]]** - Table stakes
6. **Backlinks panel** - Table stakes
7. **Basic templates** (3-5 types) - Table stakes

**Why second:** Users need to capture thoughts about the files they ingest. Notes + files = complete knowledge base.

### Phase 3: Enhanced Intelligence
8. **Cross-source relationship inference** - Differentiator (HIGH VALUE)
9. **Proactive context ("Heads Up")** - Differentiator (HIGH VALUE)
10. **Actionable analytics** - Differentiator

**Why third:** Intelligence layer that justifies "AI always has the right context" value prop. This is where Omnii One beats competitors.

### Phase 4: Gamification
11. **XP + levels system** - Table stakes for gamification
12. **Achievement system** (standard + incremental) - Table stakes
13. **Mascot companion** - Differentiator
14. **Analytics dashboard** - Differentiator (use findings from Phase 3)

**Why last:** Polish and engagement layer. Works better once users have adopted core features (files + notes + AI).

### Defer to Post-v2.0

- **Custom entity types** - Complex, not critical for initial release
- **Multi-modal extraction** (images/charts) - Nice-to-have, defer until text extraction validated
- **Code repository ingestion** - Niche use case, evaluate demand first
- **MCP-native gamification** - Creative but not critical path

---

## Implementation Notes

### File Ingestion Complexity

**PDF Processing:**
- Text-based PDFs: PyMuPDF (fast, good structure preservation)
- Scanned PDFs: MinerU (OCR + layout analysis)
- Scientific/complex: MinerU (handles formulas, tables, figures)

**Expected processing time:**
- 10-page PDF: < 5 seconds (text extraction)
- 100-page PDF: 30-60 seconds (with OCR)
- User expectation: Background processing with progress indicator

### Quick Capture Performance

Research indicates users abandon capture if it takes > 3 seconds. Requirements:
- Open capture interface: < 500ms
- Save note: < 1 second
- Sync to graph: Background (don't block UI)

Mobile implementation:
- Widget on home screen (iOS/Android)
- Share sheet integration
- Keyboard shortcut (desktop)

### Entity Extraction Approaches

**Baseline (v2.0):** spaCy with pre-trained models
- People: Named entities (PERSON tag)
- Places: Location entities (GPE, LOC tags)
- Dates: Temporal entities (DATE tag)
- Orgs: Organization entities (ORG tag)

**Enhanced (v2.1+):** GliNER2 for schema-driven extraction
- Custom entities: Projects, topics, products
- Relationship extraction: "John works on Project X"
- Structured data: Extract JSON from meeting notes

**LLM fallback (via MCP):** For ambiguous cases
- "Is 'Mercury' a planet, element, or company?"
- Use Claude/GPT only when needed (cost control)

### Gamification Balance

Research findings inform design:

**What works:**
- XP for core actions (not everything)
- Levels with meaningful milestones (every 5 levels = unlock)
- Incremental achievements (10-session minimum)
- Progress bars (visual feedback)
- Emotional design (mascot with personality)

**What fails:**
- Points for everything (cheapens rewards)
- Streak-only systems (anxiety when broken)
- Hidden mechanics (users feel manipulated)
- Vanity metrics (no actionable insight)
- Constant interruptions (annoying)

### Proactive AI Timing

Timing research shows:
- Before meetings: 15-30 minutes (gives time to prepare)
- Morning digest: 8-9am (planning window)
- End of day review: 5-6pm (reflection time)
- Never: Random interruptions (users ignore/disable)

Frequency limits:
- Max 1 proactive suggestion per hour
- User can adjust or disable
- Learn from dismissals (if user ignores 3x, stop that pattern)

---

## Sources

### File Ingestion & Document Processing
- [Best Python PDF to Text Parser Libraries: A 2026 Evaluation](https://unstract.com/blog/evaluating-python-pdf-to-text-libraries/)
- [MinerU GitHub - Document Processing for LLMs](https://github.com/opendatalab/MinerU)
- [Obsidian Extract PDF Plugin](https://github.com/akaalias/obsidian-extract-pdf)
- [Building a Scalable Document Pre-Processing Pipeline - AWS](https://aws.amazon.com/blogs/architecture/building-a-scalable-document-pre-processing-pipeline/)
- [Data Ingestion: An Introduction - Confluent](https://www.confluent.io/learn/data-ingestion/)
- [7 Best PDF Parsing Tools - Otio Blog](https://otio.ai/blog/pdf-parsing)

### Notes & Quick Capture Systems
- [How to Take Notion Quick Notes with iPhone Shortcuts (2026)](https://bennybuildsit.com/blog/how-to-take-notion-quick-notes-iphone-shortcuts)
- [Notion Quick Capture Hacks - The Sweet Setup](https://thesweetsetup.com/notion-quick-capture-hacks/)
- [Roam Research: Networked Note-Taking](https://www.primeproductiv4.com/apps-tools/roam-research-review)
- [Best Note-Taking Apps 2026: Data & screenshots for 41 apps](https://noteapps.info/best_note_taking_apps_2025)
- [Backlinks as the backbone of note-taking](https://zblesk.net/blog/backlinks-as-the-backbone-of-note-taking/)
- [The rise of networked note-taking](https://reflect.app/blog/rise-of-networked-note-taking)

### Entity Extraction & Knowledge Graphs
- [GliNER2: Extracting Structured Information from Text](https://towardsdatascience.com/gliner2-extracting-structured-information-from-text/)
- [Building a Knowledge Graph: Comprehensive Guide (Jan 2026)](https://medium.com/@brian-curry-research/building-a-knowledge-graph-a-comprehensive-end-to-end-guide-using-modern-tools-e06fe8f3b368)
- [Knowledge Graph Extraction and Challenges - Neo4j](https://neo4j.com/blog/developer/knowledge-graph-extraction-challenges/)
- [Entity Linking and Relationship Extraction With Relik - Neo4j](https://neo4j.com/blog/developer/entity-linking-relationship-extraction-relik-llamaindex/)
- [Named Entity Recognition: Comprehensive Guide - Kanerika](https://medium.com/@kanerika/named-entity-recognition-a-comprehensive-guide-to-nlps-key-technology-636a124eaa46)

### Gamification & User Engagement
- [20 Productivity App Gamification Examples (2025)](https://trophy.so/blog/productivity-gamification-examples)
- [Next-Gen Gamification: The Future of Tasks by 2026](https://magictask.io/blog/next-gen-gamification-task-management/)
- [Top 10 Gamified Productivity Apps for 2025](https://yukaichou.com/lifestyle-gamification/the-top-ten-gamified-productivity-apps/)
- [Gamification Strategies to Boost Mobile App Engagement](https://www.storyly.io/post/gamification-strategies-to-increase-app-engagement)
- [Achievements - Android Developers](https://developer.android.com/games/pgs/achievements)

### Productivity Analytics
- [AI Metrics That Matter: Value vs Vanity in Marketing](https://www.thegutenberg.com/blog/ai-value-vs-vanity-metrics-measuring-true-business-impact/)
- [What KPIs Matter in 2026: Master Meaningful Metrics](https://alliedinsight.com/resources/what-kpis-matter-in-2026/)
- [Vanity Metrics vs. Actionable Insights - AgencyAnalytics](https://agencyanalytics.com/blog/vanity-metrics)
- [How To Identify and Use Actionable Metrics - Amplitude](https://amplitude.com/blog/actionable-metrics)

### Context-Aware AI & Proactive Suggestions
- [Gemini's New Beta Feature: Proactive AI Responses](https://startupnews.fyi/2026/01/15/geminis-new-beta-feature-delivers-pro/)
- [Lenovo Defines Next Era of Hybrid AI (Jan 2026)](https://news.lenovo.com/pressroom/press-releases/hybrid-ai-personalized-perceptive-proactive-ai-portfolio-tech-world-ces-2026/)
- [Designing a Proactive Context-Aware AI Chatbot - CHI 2024](https://dl.acm.org/doi/10.1145/3613905.3650912)
- [10 Best AI Personal Assistants in 2026](https://www.dume.ai/blog/10-ai-personal-assistants-youll-need-in-2026)

### AI Assistant UX Anti-Patterns
- [Is your product's AI annoying people? - TechCrunch](https://techcrunch.com/2019/06/17/is-your-products-ai-annoying-people/)
- [Why do I find on-device AI assistants so annoying? - IT Pro](https://www.itpro.com/technology/artificial-intelligence/on-device-ai-assistants-annoying)
- [AI Gaslighting is Real: When Your Digital Assistant Drives You Mad](https://retrosusie.com/ai-assistant-frustration-is-real-lessons-from-my-creative-breakdown-with-chatgpt/)
