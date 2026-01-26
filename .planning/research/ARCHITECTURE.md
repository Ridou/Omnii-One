# Architecture Integration: v2.0 Feature Expansion

**Domain:** Personal Context Server - v2.0 Feature Additions
**Researched:** 2026-01-26
**Confidence:** HIGH (verified with current documentation and 2026 sources)

## Executive Summary

v2.0 feature expansion builds on the proven v1.0 architecture (Bun/Elysia backend, Neo4j graph, PowerSync mobile sync, MCP tools) by adding four major capabilities: local file ingestion, notes capture, enhanced NLP, and gamification. Integration follows the existing patterns established in v1.0:

1. **File ingestion** extends the BullMQ worker pattern from Google services ingestion, using officeParser for multi-format parsing and semantic chunking for embedding generation
2. **Notes capture** leverages Neo4j's bidirectional relationships for wiki-style linking and PowerSync for offline-first mobile capture
3. **Enhanced NLP** builds on the existing entity extraction service with transformer-based models (spaCy/BERT) running backend-side for consistency
4. **Gamification** uses Supabase tables synced via PowerSync with real-time tRPC subscriptions for live XP/achievement updates

All features integrate with existing components rather than replacing them. Build order prioritizes file ingestion first (extends proven ingestion pipeline), then notes (needs file chunking), then NLP (needs document corpus), finally gamification (pure additive feature).

## v1.0 Architecture Recap

**Existing foundation (DO NOT MODIFY):**

```
┌─────────────────────────────────────────────────────────────────────┐
│                   AI Applications (Claude, OpenAI)                   │
└────────────────┬────────────────────────────────────────────────────┘
                 │ MCP Protocol (10 tools)
┌────────────────▼────────────────────────────────────────────────────┐
│                    MCP Server Layer (apps/omnii_mcp)                 │
│  Tools: search_nodes, get_context, calendar_query, task_operations  │
│  GraphRAG: Dual-channel retrieval (vector + graph)                  │
└─────┬──────────────────────────────────┬─────────────────┬──────────┘
      │                                  │                 │
┌─────▼────────┐           ┌─────────────▼─────┐    ┌────▼──────────┐
│   Neo4j      │           │    Supabase       │    │   BullMQ      │
│ HTTP Query   │           │  Auth + Sync      │    │  Workers      │
│ Multi-DB     │           │  Tables           │    │               │
└──────────────┘           └───────────────────┘    └───────────────┘
                                  │
                    ┌─────────────▼────────────────┐
                    │  Mobile (PowerSync Sync)     │
                    │  React Native + Expo         │
                    └──────────────────────────────┘
```

**Key v1.0 patterns to extend:**
- BullMQ workers for background data ingestion (apps/omnii_mcp/src/ingestion/jobs/)
- Neo4j Document/Chunk nodes with embeddings (apps/omnii_mcp/src/graph/schema/)
- PowerSync sync tables in Supabase (apps/omnii_mcp/supabase/)
- tRPC subscriptions for real-time updates (apps/omnii_mcp/src/routes/)
- Entity extraction service (apps/omnii_mcp/src/services/graphrag/)

## v2.0 Feature Integration

### 1. File Ingestion Pipeline

**Goal:** Ingest local files (PDFs, Word docs, text, code, markdown) into Neo4j graph with semantic chunking

#### Integration Points

**Extends existing ingestion architecture:**
- Uses BullMQ queue pattern from Google services ingestion
- Follows Document → Chunk node structure from v1.0
- Leverages existing embedding service for vector generation
- Integrates with existing sync_state table for incremental updates

#### New Components

**File Parser Service** (`apps/omnii_mcp/src/ingestion/sources/files/`)
```typescript
// New service extending existing pattern
import { officeParser } from 'officeparser';

interface FileParserService {
  parseFile(filePath: string, mimeType: string): Promise<ParsedDocument>;
  // Supports: PDF, DOCX, PPTX, XLSX, TXT, MD, code files
}

// Uses officeParser (v6.0.4) for multi-format parsing
// Returns AST with text, formatting, metadata, attachments
```

**Chunking Strategy Service** (`apps/omnii_mcp/src/services/chunking/`)
```typescript
interface ChunkingStrategy {
  semantic: SemanticChunker;      // Groups by semantic similarity
  markdown: MarkdownChunker;       // Splits by headings, preserves structure
  code: CodeChunker;               // Respects function/class boundaries
  fixed: FixedSizeChunker;         // Fallback: 300 chars, 100 overlap
}

// Semantic chunking uses embedding similarity
// Markdown preserves section hierarchy
// Code respects AST boundaries
```

**Storage Pattern**
```
Neo4j Graph:
(:Document {id, name, type, source, createdAt})
  -[:CONTAINS_CHUNK {sequence}]->
    (:Chunk {id, text, embedding, semanticGroup})
      -[:MENTIONS]-> (:Entity)
      -[:SIMILAR_TO {score}]-> (:Chunk)  // kNN graph for related chunks
```

#### Data Flow

```
File upload (mobile or desktop)
  │
  └─→ Upload to Supabase Storage
        │
        ├─→ Create Document node in Neo4j
        │
        └─→ BullMQ job: process-file
              │
              ├─→ FileParserService.parseFile()
              │     └─→ officeParser extracts text, metadata
              │
              ├─→ ChunkingStrategy (semantic/markdown/code)
              │     └─→ Split into logical chunks
              │
              ├─→ EmbeddingService.generateEmbeddings()
              │     └─→ Create vector embeddings for each chunk
              │
              ├─→ Neo4j: Create Chunk nodes
              │     └─→ Link to Document, set embeddings
              │
              ├─→ EntityExtractionService (existing)
              │     └─→ Extract entities from chunk text
              │
              └─→ PowerSync: Sync document metadata to mobile
                    └─→ Update sync_documents table
```

**Storage recommendation:**
- File blobs → Supabase Storage (existing infrastructure)
- Document metadata → Neo4j Document nodes
- Chunks + embeddings → Neo4j Chunk nodes
- Mobile sync metadata → Supabase sync_documents table

#### Build Order Integration

**Phase 1: File parsing infrastructure**
- Install officeParser, configure supported formats
- Create FileParserService with multi-format support
- Add Supabase Storage bucket for documents
- Create Neo4j Document/Chunk schema (extends v1.0 pattern)

**Phase 2: Chunking and embedding**
- Implement semantic/markdown/code chunking strategies
- Wire into existing EmbeddingService
- Create kNN similarity graph between chunks

**Phase 3: Ingestion pipeline**
- Create BullMQ process-file job (mirrors process-calendar pattern)
- Wire into existing entity extraction
- Add tRPC upload routes

**Phase 4: Mobile upload**
- Add document picker to mobile app
- Upload to Supabase Storage
- Trigger backend processing job
- Show processing status via PowerSync sync

### 2. Notes Capture System

**Goal:** Quick capture with templates, wiki-style bidirectional linking, offline-first mobile experience

#### Integration Points

**Extends existing graph and sync:**
- Uses Neo4j bidirectional relationships for wiki links
- Leverages PowerSync offline queue for instant capture
- Follows Document/Chunk pattern from file ingestion
- Integrates with existing search_nodes MCP tool

#### New Components

**Note Node Schema** (`apps/omnii_mcp/src/graph/schema/nodes.ts`)
```typescript
interface NoteNode {
  id: string;
  title: string;
  content: string;           // Full markdown text
  template?: string;         // Template ID if created from template
  tags: string[];
  createdAt: DateTime;
  updatedAt: DateTime;
  embedding?: number[];      // For semantic search
}

// Relationships:
// (:Note)-[:LINKS_TO]->(:Note)           // Wiki-style [[links]]
// (:Note)-[:CREATED_FROM]->(:Template)   // Template tracking
// (:Note)-[:MENTIONS]->(:Entity)         // Extracted entities
// (:Note)-[:CHUNK]->(:Chunk)             // For long notes
```

**Wiki Link Parser Service** (`apps/omnii_mcp/src/services/notes/`)
```typescript
interface WikiLinkParser {
  extractLinks(markdown: string): string[];  // Find [[link]] syntax
  resolveLinks(noteId: string): Promise<BiDirectionalLinks>;
  createBacklinks(noteId: string, linkedNoteIds: string[]): Promise<void>;
}

// Pattern: [[Note Title]] creates bidirectional link
// Neo4j: (:Note)-[:LINKS_TO]->(:Note) + reverse for backlinks
// Updates automatically when links added/removed
```

**Template System** (`apps/omnii_mcp/src/services/notes/templates.ts`)
```typescript
interface NoteTemplate {
  id: string;
  name: string;
  content: string;           // Markdown with {{placeholders}}
  fields: TemplateField[];   // Structured data fields
}

// Example templates:
// - Meeting Notes: {{date}}, {{attendees}}, {{topics}}
// - Daily Log: {{date}}, {{mood}}, {{tasks}}
// - Project: {{name}}, {{status}}, {{deadline}}
```

#### Data Flow

```
Mobile: Quick capture
  │
  ├─→ Local: Create Note in PowerSync SQLite
  │     └─→ Instant UI update (offline-first)
  │
  └─→ [When online] Sync to backend
        │
        ├─→ Create Note node in Neo4j
        │
        ├─→ WikiLinkParser.extractLinks()
        │     └─→ Create LINKS_TO relationships
        │
        ├─→ EntityExtractionService (existing)
        │     └─→ Extract entities from note content
        │
        └─→ If note > 1000 chars:
              └─→ Chunking + embedding (reuse file pipeline)
```

**PowerSync schema extension:**
```typescript
// Supabase sync_notes table
interface SyncNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: timestamp;
  updated_at: timestamp;
}

// PowerSync syncs to mobile SQLite
// Enables offline capture with conflict resolution
```

#### Build Order Integration

**Phase 1: Note schema and storage**
- Create Note node schema in Neo4j
- Add sync_notes table in Supabase
- Configure PowerSync rules for notes

**Phase 2: Mobile capture UI**
- Quick capture screen with templates
- Markdown editor with [[link]] syntax
- Offline queue for captures
- Tag picker and template selector

**Phase 3: Wiki linking backend**
- WikiLinkParser service
- Bidirectional relationship creation
- Backlink resolution API

**Phase 4: Search and retrieval**
- Add note search to search_nodes MCP tool
- Backlink visualization in mobile
- Template management UI

### 3. Enhanced NLP Pipeline

**Goal:** Improved entity extraction with custom models, proactive context suggestions, cross-source relationship inference

#### Integration Points

**Extends existing entity extraction:**
- Builds on EntityExtractionService from v1.0
- Uses existing Neo4j MENTIONS relationships
- Integrates with GraphRAG dual-channel retrieval
- Leverages relationship discovery from Phase 3

#### New Components

**Enhanced Entity Extractor** (`apps/omnii_mcp/src/services/nlp/`)
```typescript
interface EnhancedEntityExtractor {
  extractors: {
    spacy: SpaCyExtractor;           // Transformer-based NER
    bert: BERTExtractor;             // Fine-tuned for personal data
    custom: CustomModelExtractor;     // Domain-specific models
  };

  extract(text: string, source: string): Promise<ExtractedEntities>;
  // Returns: {people, organizations, locations, dates, topics}
  // Confidence scores, entity linking to existing graph nodes
}

// Uses hybrid approach:
// 1. Rule-based for high-precision (emails, phone numbers)
// 2. Transformer models for contextual understanding
// 3. Entity linking to existing graph nodes
```

**Proactive Context Service** (`apps/omnii_mcp/src/services/context/`)
```typescript
interface ProactiveContextService {
  getUpcomingContext(userId: string, timeframe: string): Promise<ContextCard[]>;
  // "Heads Up" before meetings

  // Uses temporal context service from v1.0
  // Queries: upcoming calendar events, related emails, notes, tasks
  // Surfaces: relevant people, recent interactions, action items
}

// Example: Meeting at 2pm with "Alice"
// Returns: Recent emails with Alice, shared documents, past meetings
```

**Cross-Source Relationship Inference** (`apps/omnii_mcp/src/services/graphrag/relationship-inference.ts`)
```typescript
interface RelationshipInference {
  inferRelationships(userId: string): Promise<InferredRelationships>;

  // Patterns:
  // - Email sender → Calendar attendee: Suggests COLLABORATES_WITH
  // - Task assignee → Note mentions: Suggests WORKING_ON
  // - Document author → Calendar event: Suggests PRESENTED_AT
}

// Uses LLM to analyze patterns and suggest new relationships
// User approval required before creating graph edges
```

#### Architecture Decision: Backend vs Edge

**DECISION: Run NLP backend-side**

**Rationale:**
- Consistency: Same model versions across all users
- Performance: GPU acceleration on server (vs limited mobile compute)
- Privacy: Models stay server-side, no client-side model downloads
- Accuracy: Centralized fine-tuning and updates
- Cost: Shared compute resources vs per-device inference

**Implementation:**
- Entity extraction runs in BullMQ workers (async, batched)
- Average inference: 55ms per request (from research)
- GPU clusters for batch processing: 100K notes in 44 minutes

**Exception: Mobile quick capture**
- Mobile app extracts basic entities locally (dates, times, names)
- Backend refines with transformer models when synced
- Best of both worlds: instant feedback + accurate enrichment

#### Data Flow

```
Content ingestion (email, note, file)
  │
  └─→ BullMQ job: extract-entities
        │
        ├─→ EnhancedEntityExtractor
        │     │
        │     ├─→ SpaCy transformer model
        │     ├─→ BERT fine-tuned for personal data
        │     └─→ Custom domain models
        │           │
        │           └─→ Extract: people, orgs, locations, dates, topics
        │
        ├─→ Entity linking to existing graph nodes
        │     └─→ Neo4j: Create MENTIONS relationships
        │
        └─→ RelationshipInference (if enabled)
              │
              ├─→ Analyze patterns across sources
              ├─→ Suggest new relationships
              └─→ Request user approval (intervention)
```

**Proactive context flow:**
```
Mobile app: Open calendar
  │
  └─→ tRPC subscription: upcoming-context
        │
        └─→ ProactiveContextService
              │
              ├─→ Query temporal context (next 24 hours)
              ├─→ GraphRAG retrieval for each event
              ├─→ Surface: emails, notes, files, people
              └─→ Push to mobile: "Heads Up" notification
```

#### Build Order Integration

**Phase 1: Enhanced extractor**
- Add spaCy and BERT to backend
- Create EnhancedEntityExtractor service
- Wire into existing ingestion jobs
- Benchmark accuracy vs v1.0 baseline

**Phase 2: Proactive context**
- ProactiveContextService implementation
- tRPC subscription for upcoming context
- Mobile "Heads Up" notifications
- Context card UI components

**Phase 3: Relationship inference**
- RelationshipInference service
- LLM-based pattern analysis
- User approval workflow (intervention pattern)
- Graph visualization updates

### 4. Gamification System

**Goal:** XP, levels, achievements, mascot companion, analytics - fully synced offline-first

#### Integration Points

**Extends existing sync and real-time:**
- Uses Supabase tables synced via PowerSync
- Leverages tRPC subscriptions for live updates
- Follows event-driven pattern from n8n workflows
- Integrates with existing audit logging

#### New Components

**Gamification State Schema** (`apps/omnii_mcp/supabase/migrations/`)
```sql
-- User gamification state
CREATE TABLE user_gamification (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  current_xp BIGINT DEFAULT 0,
  current_level INT DEFAULT 1,
  lifetime_xp BIGINT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_activity_date DATE,
  mascot_mood TEXT DEFAULT 'happy',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement definitions (admin-managed)
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INT DEFAULT 0,
  criteria JSONB,  -- Flexible criteria definition
  tier TEXT,       -- bronze, silver, gold, platinum
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievement progress
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  achievement_id UUID REFERENCES achievements(id),
  progress FLOAT DEFAULT 0,  -- 0.0 to 1.0
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- XP transaction log (audit trail)
CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount INT NOT NULL,
  source TEXT NOT NULL,  -- 'note_created', 'file_uploaded', 'streak_maintained'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**XP Engine Service** (`apps/omnii_mcp/src/services/gamification/`)
```typescript
interface XPEngine {
  awardXP(userId: string, source: string, amount: number): Promise<XPResult>;
  checkLevelUp(userId: string): Promise<LevelUpEvent | null>;
  calculateStreak(userId: string): Promise<StreakInfo>;
}

// XP sources:
// - note_created: 10 XP
// - file_uploaded: 25 XP
// - calendar_event_attended: 5 XP
// - task_completed: 15 XP
// - streak_maintained: 50 XP
// - achievement_unlocked: Variable (from achievement definition)

// Level formula: XP = 100 * level^1.5 (exponential curve)
```

**Achievement Engine Service** (`apps/omnii_mcp/src/services/gamification/achievements.ts`)
```typescript
interface AchievementEngine {
  checkAchievements(userId: string, event: GameEvent): Promise<UnlockedAchievements>;
  updateProgress(userId: string, achievementId: string, progress: number): Promise<void>;
}

// Achievement examples:
// - "First Steps": Create your first note (10 XP)
// - "Librarian": Upload 100 documents (250 XP)
// - "Connected Mind": Create 50 wiki links (150 XP)
// - "Streak Master": Maintain 30-day streak (500 XP)
// - "Graph Explorer": Browse 1000 nodes (200 XP)
```

**Mascot System** (`apps/omnii_mcp/src/services/gamification/mascot.ts`)
```typescript
interface MascotSystem {
  updateMood(userId: string, activityLevel: string): Promise<MascotMood>;
  getDialogue(userId: string, context: string): Promise<string>;
}

// Moods: happy, excited, sleepy, curious, proud
// Context-aware: Congratulates on level up, encourages on streak break
// Appears in mobile app as animated character
```

#### Real-Time Sync Architecture

**Event-driven XP awards:**
```
User action (create note, upload file)
  │
  ├─→ Action completes in backend
  │
  ├─→ XPEngine.awardXP()
  │     │
  │     ├─→ Insert xp_transactions record
  │     ├─→ Update user_gamification.current_xp
  │     └─→ Check for level up
  │           │
  │           └─→ [LEVEL UP] Broadcast event
  │
  └─→ PowerSync triggers sync
        │
        └─→ Mobile receives update
              │
              ├─→ Show XP animation
              ├─→ Update level progress bar
              └─→ [LEVEL UP] Show celebration modal
```

**Achievement unlock flow:**
```
User activity tracked
  │
  └─→ AchievementEngine.checkAchievements()
        │
        ├─→ Evaluate criteria (via JSONB query)
        │
        └─→ [UNLOCKED] Update user_achievements
              │
              ├─→ Award XP via XPEngine
              ├─→ PowerSync sync to mobile
              └─→ Push notification: "Achievement unlocked!"
```

**Streak tracking:**
```
Daily cron job (or mobile app open)
  │
  └─→ XPEngine.calculateStreak()
        │
        ├─→ Check last_activity_date
        │
        ├─→ [TODAY] Update streak_days++
        │     └─→ Award streak XP (50 XP)
        │
        └─→ [MISSED] Reset streak to 0
              └─→ Update mascot mood to "sleepy"
```

#### Data Flow

**PowerSync configuration:**
```typescript
// apps/omnii_mcp/supabase/migrations/powersync_schema.sql
-- Sync gamification state to mobile
SELECT id, current_xp, current_level, streak_days, mascot_mood
FROM user_gamification
WHERE user_id = auth.uid();

-- Sync user achievements
SELECT a.*, ua.progress, ua.unlocked_at
FROM achievements a
LEFT JOIN user_achievements ua ON ua.achievement_id = a.id
WHERE ua.user_id = auth.uid() OR ua.user_id IS NULL;
```

**tRPC real-time subscription:**
```typescript
// apps/omnii_mcp/src/routes/gamification.ts
const gamificationRouter = router({
  onXPUpdated: publicProcedure
    .input(z.object({ userId: z.string() }))
    .subscription(({ input }) => {
      return observable<XPUpdate>((emit) => {
        // Listen to Supabase realtime for user_gamification changes
        const subscription = supabase
          .channel('xp-updates')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_gamification',
            filter: `user_id=eq.${input.userId}`
          }, (payload) => {
            emit.next({
              currentXP: payload.new.current_xp,
              currentLevel: payload.new.current_level,
              delta: payload.new.current_xp - payload.old.current_xp
            });
          })
          .subscribe();

        return () => subscription.unsubscribe();
      });
    })
});
```

#### Build Order Integration

**Phase 1: State schema and engine**
- Create Supabase gamification tables
- Implement XPEngine and AchievementEngine services
- Configure PowerSync sync rules
- Add RLS policies for multi-tenant isolation

**Phase 2: Event integration**
- Wire XP awards into existing actions (note creation, file upload, etc.)
- Create achievement criteria definitions
- Implement streak tracking cron job

**Phase 3: Mobile UI**
- XP progress bar and level indicator
- Achievement badge grid
- Mascot character with mood animations
- Celebration modals for level ups

**Phase 4: Analytics dashboard**
- Activity heatmap
- XP history chart
- Achievement completion percentage
- Leaderboard (optional, private by default)

## Component Integration Matrix

| v2.0 Feature | Extends v1.0 Component | New Services | Mobile Changes | Neo4j Changes |
|--------------|------------------------|--------------|----------------|---------------|
| **File Ingestion** | BullMQ workers, embedding service | FileParserService, ChunkingStrategy | Document picker, upload UI | Document/Chunk nodes (extend existing) |
| **Notes Capture** | PowerSync sync, search_nodes tool | WikiLinkParser, TemplateSystem | Quick capture screen, markdown editor | Note nodes, LINKS_TO relationships |
| **Enhanced NLP** | EntityExtractionService, GraphRAG | EnhancedEntityExtractor, ProactiveContextService | "Heads Up" notifications | Improved MENTIONS relationships |
| **Gamification** | PowerSync sync, tRPC subscriptions | XPEngine, AchievementEngine, MascotSystem | XP progress UI, achievement grid | None (uses Supabase tables) |

## Data Storage Strategy

| Data Type | Storage Location | Why |
|-----------|------------------|-----|
| **File blobs** | Supabase Storage | Existing infrastructure, CDN, auth integration |
| **Document metadata** | Neo4j Document nodes | Enables graph relationships, semantic search |
| **Document chunks** | Neo4j Chunk nodes | Embeddings for RAG, entity linking |
| **Notes (full text)** | Neo4j Note nodes | Graph relationships, semantic search |
| **Notes (sync cache)** | Supabase sync_notes | PowerSync offline-first sync |
| **Gamification state** | Supabase tables | PowerSync sync, real-time subscriptions, relational queries |
| **XP transactions** | Supabase audit table | Compliance, history, analytics |
| **Achievements** | Supabase static data | Admin-managed, infrequent updates |

**Why this split?**
- Neo4j: Rich relationships, semantic search, entity linking
- Supabase: Sync state, real-time updates, relational queries, auth
- Supabase Storage: Blob storage with CDN

## Recommended Build Order

Based on dependency analysis and risk mitigation:

### Milestone v2.0 Phase Sequence

**Phase 1: File Ingestion Foundation** (highest priority, extends proven pattern)
1. Install officeParser, configure file parser service
2. Implement semantic/markdown/code chunking strategies
3. Create Document/Chunk schema extension in Neo4j
4. Add Supabase Storage bucket and upload routes
5. Wire into existing BullMQ job system
6. Connect to existing embedding and entity extraction services

**Why first:** Extends proven v1.0 ingestion pipeline pattern, provides document corpus for other features

**Phase 2: Notes Capture System** (depends on file chunking)
1. Create Note node schema in Neo4j
2. Add sync_notes table and PowerSync rules
3. Implement WikiLinkParser for bidirectional links
4. Build mobile quick capture UI with templates
5. Wire into existing entity extraction
6. Add note search to search_nodes MCP tool

**Why second:** Needs chunking strategy from Phase 1 for long notes, provides user-generated content for NLP

**Phase 3: Enhanced NLP Pipeline** (depends on document corpus)
1. Install spaCy and BERT transformer models
2. Create EnhancedEntityExtractor service
3. Wire into existing ingestion jobs
4. Implement ProactiveContextService
5. Add "Heads Up" notifications to mobile
6. Create RelationshipInference service with user approval

**Why third:** Needs document corpus from Phases 1-2, builds on existing entity extraction

**Phase 4: Gamification System** (pure additive, no dependencies)
1. Create Supabase gamification tables and PowerSync sync
2. Implement XPEngine and AchievementEngine
3. Wire XP awards into existing user actions
4. Build mobile XP progress and achievement UI
5. Implement streak tracking and mascot system
6. Create analytics dashboard

**Why last:** Pure additive feature with no blocking dependencies, can be built in parallel with Phase 3

**Total estimated time:** 16-24 weeks (4-6 months) for all v2.0 features

## Critical Integration Points

### 1. BullMQ Job Queue

**Existing:** `apps/omnii_mcp/src/ingestion/jobs/`
- calendar-sync, task-sync, gmail-sync, contacts-sync workers

**Extension for v2.0:**
- Add `process-file` worker (file parsing and chunking)
- Add `extract-entities` worker (enhanced NLP)
- Add `check-achievements` worker (gamification triggers)

**Pattern to follow:**
```typescript
// Existing pattern from calendar-sync.ts
export const calendarSyncWorker = new Worker(
  'calendar-sync',
  async (job: Job) => {
    const { userId } = job.data;
    // Process job
  },
  { connection: redis }
);

// New pattern for file processing
export const fileProcessWorker = new Worker(
  'process-file',
  async (job: Job) => {
    const { userId, fileId } = job.data;
    // Parse file, chunk, embed, extract entities
  },
  { connection: redis }
);
```

### 2. PowerSync Sync Rules

**Existing:** `apps/omnii_mcp/supabase/migrations/powersync_schema.sql`
- sync_entities, sync_relationships tables

**Extension for v2.0:**
```sql
-- Add document sync
CREATE TABLE sync_documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT,
  type TEXT,
  status TEXT,  -- 'processing', 'complete', 'failed'
  created_at TIMESTAMPTZ
);

-- Add notes sync
CREATE TABLE sync_notes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Add gamification sync
CREATE TABLE sync_gamification (
  user_id UUID PRIMARY KEY,
  current_xp BIGINT,
  current_level INT,
  streak_days INT,
  mascot_mood TEXT,
  updated_at TIMESTAMPTZ
);
```

### 3. Neo4j Schema Extension

**Existing:** `apps/omnii_mcp/src/graph/schema/nodes.ts`
- Concept, Entity, Event, Contact nodes

**Extension for v2.0:**
```typescript
// Document and Chunk nodes (extend existing pattern)
export const DocumentNode = {
  label: 'Document',
  properties: ['id', 'name', 'type', 'source', 'createdAt'],
  indexes: ['id', 'name'],
  constraints: ['id']
};

export const ChunkNode = {
  label: 'Chunk',
  properties: ['id', 'text', 'embedding', 'semanticGroup', 'sequence'],
  indexes: ['id'],
  constraints: ['id']
};

// Note nodes
export const NoteNode = {
  label: 'Note',
  properties: ['id', 'title', 'content', 'template', 'tags', 'createdAt', 'updatedAt'],
  indexes: ['id', 'title'],
  constraints: ['id']
};

// Relationships
export const DocumentRelationships = {
  CONTAINS_CHUNK: { from: 'Document', to: 'Chunk', properties: ['sequence'] },
  LINKS_TO: { from: 'Note', to: 'Note', properties: ['createdAt'] },
  SIMILAR_TO: { from: 'Chunk', to: 'Chunk', properties: ['score'] }
};
```

### 4. tRPC Route Extensions

**Existing:** `apps/omnii_mcp/src/routes/`
- mcp.ts, calendar.ts, tasks.ts, gmail.ts, contacts.ts

**Extension for v2.0:**
```typescript
// apps/omnii_mcp/src/routes/files.ts
export const filesRouter = router({
  upload: publicProcedure
    .input(z.object({ name: z.string(), mimeType: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Upload to Supabase Storage, queue processing job
    }),

  getStatus: publicProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Return processing status
    })
});

// apps/omnii_mcp/src/routes/notes.ts
export const notesRouter = router({
  create: publicProcedure
    .input(z.object({ title: z.string(), content: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Create note, parse wiki links
    }),

  getBacklinks: publicProcedure
    .input(z.object({ noteId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Return bidirectional links
    })
});

// apps/omnii_mcp/src/routes/gamification.ts
export const gamificationRouter = router({
  onXPUpdated: publicProcedure
    .input(z.object({ userId: z.string() }))
    .subscription(({ input }) => {
      // Real-time XP updates
    })
});
```

## Architecture Anti-Patterns to Avoid

### 1. Processing Files on Mobile Device

**Anti-pattern:** Running officeParser or NLP models on mobile

**Why bad:**
- Battery drain from heavy processing
- Inconsistent results across device capabilities
- Large model downloads (100MB+ for BERT)
- Memory pressure on low-end devices

**Instead:** Server-side processing with status updates via PowerSync
- Mobile uploads to Supabase Storage
- Backend processes asynchronously
- Mobile shows progress via sync_documents.status

### 2. Real-Time XP Updates Without Batching

**Anti-pattern:** Award XP for every single user action immediately

**Why bad:**
- Excessive database writes
- Real-time subscription spam
- Mobile battery drain from constant updates
- Race conditions on concurrent actions

**Instead:** Batch XP awards with debouncing
- Group XP awards in 30-second windows
- Single database transaction per batch
- Single real-time notification per batch
- Mobile animates XP change smoothly

### 3. Storing File Blobs in Neo4j

**Anti-pattern:** Store PDF/DOCX binary data in Neo4j properties

**Why bad:**
- Neo4j optimized for graph queries, not blob storage
- Massive memory overhead
- Slow query performance
- No CDN caching

**Instead:** Supabase Storage for blobs, Neo4j for metadata
- Files in Supabase Storage (existing infrastructure)
- Document/Chunk nodes reference storage URL
- Neo4j focuses on relationships and search

### 4. Synchronous Entity Extraction

**Anti-pattern:** Extract entities during note creation API call

**Why bad:**
- Slow API response times (seconds)
- Poor user experience (waiting for save)
- Blocks concurrent requests
- Mobile timeout issues

**Instead:** Asynchronous extraction via BullMQ
- Note saves immediately
- Background job extracts entities
- PowerSync updates mobile when complete
- User sees instant feedback, entities appear later

### 5. Client-Side Wiki Link Resolution

**Anti-pattern:** Mobile app resolves [[links]] locally

**Why bad:**
- Sync complexity (what if target note not synced?)
- Inconsistent link resolution
- Mobile storage bloat (must sync all notes for linking)
- Stale backlinks

**Instead:** Server-side link resolution with PowerSync
- Backend resolves links during save
- Creates bidirectional relationships in Neo4j
- PowerSync syncs link metadata to mobile
- Mobile displays links, taps fetch from server if needed

## Scalability Considerations

### At 100 Users

| Component | v1.0 Approach | v2.0 Extension |
|-----------|---------------|----------------|
| **File storage** | N/A | Supabase Storage (5GB free tier per project) |
| **Document processing** | N/A | Single BullMQ worker, 1-2 concurrent jobs |
| **NLP inference** | Basic entity extraction | Single CPU instance, batch processing |
| **Gamification state** | N/A | Supabase free tier (500MB DB, 2GB bandwidth) |

**Cost:** ~$100-150/month (v1.0 base + Supabase storage)

### At 10K Users

| Component | v1.0 Approach | v2.0 Extension |
|-----------|---------------|----------------|
| **File storage** | N/A | Supabase Storage Pro (100GB+), CDN caching |
| **Document processing** | N/A | 3-5 BullMQ workers, Redis cluster, 10+ concurrent jobs |
| **NLP inference** | Basic entity extraction | GPU instance for batch processing (100K docs in 44 min) |
| **Gamification state** | N/A | Supabase Pro tier (25GB DB, 250GB bandwidth) |

**Cost:** ~$2,000-3,000/month

**Optimizations needed:**
- CDN for file downloads
- GPU batch processing for NLP
- Redis cluster for BullMQ
- Database read replicas

### At 1M Users

| Component | v1.0 Approach | v2.0 Extension |
|-----------|---------------|----------------|
| **File storage** | N/A | Multi-region Supabase Storage, edge caching |
| **Document processing** | N/A | Distributed BullMQ workers (50+ instances), Kafka queue |
| **NLP inference** | Basic entity extraction | GPU cluster with auto-scaling, model serving infrastructure |
| **Gamification state** | N/A | Sharded Postgres, read replicas, write batching |

**Cost:** ~$20,000-40,000/month

**Architecture changes needed:**
- Microservices for file processing
- Dedicated NLP inference cluster
- Message queue (Kafka) for event streaming
- Edge functions for real-time gamification

## Build Dependencies Graph

```
File Ingestion
  └─→ Notes Capture (needs chunking)
        └─→ Enhanced NLP (needs document corpus)

Gamification (parallel, no dependencies)
```

**Critical path:** File Ingestion → Notes Capture → Enhanced NLP (16-18 weeks)
**Parallel track:** Gamification (6-8 weeks, can start anytime)

## Success Metrics

### File Ingestion
- Parse success rate: >95% for supported formats
- Average processing time: <30s for 10MB document
- Chunk quality: >80% semantic coherence score
- Storage efficiency: <10% overhead vs raw file size

### Notes Capture
- Offline capture reliability: 100% (PowerSync guarantee)
- Wiki link resolution accuracy: >95%
- Sync latency: <2s when online
- Template usage: >30% of notes use templates

### Enhanced NLP
- Entity extraction accuracy: >85% (vs v1.0 baseline)
- Proactive context relevance: >70% user engagement
- Relationship inference precision: >80%
- Inference latency: <100ms per document

### Gamification
- Real-time sync latency: <500ms for XP updates
- Streak tracking accuracy: 100%
- Achievement unlock reliability: 100%
- User engagement lift: +40% daily active usage

## Sources

### File Ingestion & Document Processing
- [7 PDF Parsing Libraries for Extracting Data in Node.js | Strapi](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025)
- [officeParser - npm](https://www.npmjs.com/package/officeparser)
- [GitHub - harshankur/officeParser](https://github.com/harshankur/officeParser)
- [Building a Scalable OCR Pipeline | HealthEdge](https://healthedge.com/resources/blog/building-a-scalable-ocr-pipeline-technical-architecture-behind-healthedge-s-document-processing-platform)
- [Extract and Map Information from Unstructured Content | Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/idea/multi-modal-content-processing)
- [Document Processing Pipeline | MinerU](https://github.com/opendatalab/MinerU)

### Document Chunking & Embeddings
- [Chunking Strategies for LLM Applications | Pinecone](https://www.pinecone.io/learn/chunking-strategies/)
- [Mastering Semantic Search in 2026 | Medium](https://medium.com/@smenon_85/mastering-semantic-search-in-2026-44bc012c4e41)
- [Chunk documents | Azure AI Search](https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents)
- [Evaluating Chunking Strategies for Retrieval | Chroma Research](https://research.trychroma.com/evaluating-chunking)
- [GitHub - Zackriya-Solutions/MCP-Markdown-RAG](https://github.com/Zackriya-Solutions/MCP-Markdown-RAG)
- [rag-agent: Transform Markdown into searchable knowledge base](https://github.com/kevwan/rag-agent)

### NLP & Entity Extraction
- [spaCy · Industrial-strength Natural Language Processing](https://spacy.io/)
- [Natural Language Processing Technology | Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/data-guide/technology-choices/natural-language-processing)
- [How to deploy NLP: Named entity recognition | Elastic](https://www.elastic.co/blog/how-to-deploy-nlp-named-entity-recognition-ner-example)
- [Context-Aware ML/NLP Pipeline for Real-Time Anomaly Detection | MDPI](https://www.mdpi.com/2504-4990/8/1/25)
- [Rule-based Entity Recognition with Spark NLP | John Snow Labs](https://www.johnsnowlabs.com/rule-based-entity-recognition-with-spark-nlp/)

### Neo4j Knowledge Graphs
- [Knowledge Graph Generation | Neo4j](https://neo4j.com/blog/developer/knowledge-graph-generation/)
- [Neo4j LLM Knowledge Graph Builder | Neo4j Labs](https://neo4j.com/labs/genai-ecosystem/llm-graph-builder/)
- [Creating Knowledge Graphs from Unstructured Data | Neo4j](https://neo4j.com/developer/genai-ecosystem/importing-graph-from-unstructured-data/)
- [Using LlamaParse to Create Knowledge Graphs | Neo4j Medium](https://medium.com/neo4j/using-llamaparse-for-knowledge-graph-creation-from-documents-3bd1e1849754)
- [Graph database | Wikipedia](https://en.wikipedia.org/wiki/Graph_database)

### Wiki-Style Linking
- [GitHub - mirkonasato/graphipedia](https://github.com/mirkonasato/graphipedia)
- [Using SurrealDB as a Graph Database](https://surrealdb.com/docs/surrealdb/models/graph)
- [WikiLinkGraphs Dataset | arXiv](https://arxiv.org/pdf/1902.04298)

### Gamification Architecture
- [Trophy 1.0: Developer APIs for gamification | Product Hunt](https://www.producthunt.com/products/trophy-1-0)
- [GitHub - cjmellor/level-up](https://github.com/cjmellor/level-up)
- [GitHub - hpi-schul-cloud/gamification](https://github.com/hpi-schul-cloud/gamification)
- [Gamification Architecture Best Practices | Smartico](https://www.smartico.ai/blog-post/gamification-architecture-best-practices)
- [Top 5 gamification tools for mobile apps in 2026 | Plotline](https://www.plotline.so/blog/tools-to-gamify-apps)
- [State Management in Vanilla JS: 2026 Trends | Medium](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de)

### PowerSync & Offline-First
- [PowerSync: Backend DB - SQLite sync engine](https://www.powersync.com)
- [2025 PowerSync Roadmap Update](https://www.powersync.com/blog/2025-powersync-roadmap-update)
- [GitHub - powersync-ja/powersync.dart](https://github.com/powersync-ja/powersync.dart)
- [PowerSync | Works With Supabase](https://supabase.com/partners/integrations/powersync)

### Backend Architecture
- [AI-Powered Backend Architecture in 2026 | Refonte Learning](https://www.refontelearning.com/blog/ai-powered-backend-architecture-in-2026-how-backend-engineers-build-scalable-intelligent-systems)
- [10 Explosive Backend Development Trends in 2026 | Ainexis Lab](https://ainexislab.com/backend-development-trends-in-2026-the-future-guide/)
- [State management | Building Mobile Apps at Scale](https://www.mobileatscale.com/content/posts/01-state-management/)
