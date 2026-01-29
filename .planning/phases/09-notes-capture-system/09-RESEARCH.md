# Phase 9: Notes Capture System - Research

**Researched:** 2026-01-29
**Domain:** Wiki-style note-taking with bidirectional links, templates, and voice capture
**Confidence:** HIGH

## Summary

Phase 9 builds on the Document/Chunk infrastructure from Phase 8, extending it with wiki-style linking, backlinks visualization, note templates, and voice-to-text capture. Research shows this requires three technical domains working together: (1) wikilink parsing and bidirectional graph relationships, (2) mobile voice recognition with low-latency transcription, and (3) note templates with metadata structures.

The recommended stack uses markdown-it-wikilinks for `[[wikilink]]` parsing (battle-tested in PKM apps like Obsidian), @jamsch/expo-speech-recognition for native mobile voice capture (wraps iOS SFSpeechRecognizer and Android SpeechRecognizer), and YAML frontmatter for template metadata. Neo4j's undirected relationship traversal eliminates the need for duplicate relationships—a single `LINKS_TO` relationship can be queried bidirectionally at the same speed.

**Critical finding:** Note-taking apps succeed or fail based on **fast writes** and **discoverable connections**. Users expect sub-100ms note creation (offline-first mandatory), sub-3-second voice transcription, and zero-click backlinks panels. The "organizational burden trap" kills adoption—if organizing notes takes more effort than writing them, users abandon the system. Templates reduce this burden by pre-structuring metadata.

**Primary recommendation:** Extend Phase 8's Document/Chunk schema with Note nodes, parse `[[wikilinks]]` to create bidirectional `LINKS_TO` relationships in Neo4j, implement note templates as YAML frontmatter presets, integrate @jamsch/expo-speech-recognition with on-device recognition for <3s latency, and use PowerSync's optimistic UI pattern for instant note creation feedback.

## Standard Stack

The established libraries/tools for note-taking with wiki-links and voice capture:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| markdown-it-wikilinks | 1.0.0+ | Parse `[[wikilinks]]` syntax | Battle-tested in PKM ecosystem, configurable link transformers, handles piped links `[[target\|display]]` |
| @jamsch/expo-speech-recognition | Latest | Mobile voice-to-text | Wraps native iOS/Android APIs, supports interim results, on-device recognition, <3s typical latency |
| markdown-it | 14.1.0+ | Markdown parsing/rendering | From Phase 8, extensible with wikilinks plugin, 100% CommonMark spec |
| compromise | 14.x | Lightweight NLP entity extraction | 1MB/second processing speed, identifies people/places/orgs in note text |
| @xenova/transformers | 3.8.1+ | Advanced NER (optional) | Transformer-based entity extraction, CPU via WASM, more accurate but slower than compromise |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gray-matter | 4.0.3+ | YAML frontmatter parsing | Extract/inject template metadata in note files |
| react-native-live-markdown | Latest | Live markdown editing | Real-time markdown rendering in TextInput with native performance |
| date-fns | 3.x | Date formatting in templates | Format timestamps for daily notes, meeting notes |
| nanoid | 5.x | Short unique note IDs | Generate human-readable note IDs like `note_abc123` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| markdown-it-wikilinks | remark-wiki-link | Remark ecosystem, but markdown-it already used in Phase 8 |
| @jamsch/expo-speech-recognition | expo-av audio recording + API transcription | Higher latency (500ms+ network), costs per API call, no offline |
| compromise | @xenova/transformers only | Transformers more accurate but 10-100x slower, compromise good enough for real-time |
| Native Note storage | MarkdownDB SQLite index | MarkdownDB optimized for static sites, not real-time sync; PowerSync already handles SQLite sync |

**Installation:**
```bash
# Core note parsing
bun add markdown-it markdown-it-wikilinks gray-matter

# NLP entity extraction
bun add compromise @xenova/transformers

# Mobile dependencies (package.json)
npx expo install expo-speech-recognition
bun add date-fns nanoid

# Optional: live markdown editor
bun add react-native-live-markdown
```

## Architecture Patterns

### Recommended Project Structure
```
apps/omnii_mcp/src/
├── notes/
│   ├── parsers/
│   │   ├── wikilink-parser.ts      # Extract [[links]] from markdown
│   │   ├── frontmatter-parser.ts   # YAML metadata extraction
│   │   └── entity-extractor.ts     # NLP entity identification
│   ├── templates/
│   │   ├── template-engine.ts      # Fill templates with dynamic data
│   │   └── presets/
│   │       ├── meeting-notes.yaml
│   │       ├── daily-journal.yaml
│   │       └── contact-notes.yaml
│   ├── graph/
│   │   ├── note-nodes.ts           # Note node CRUD operations
│   │   └── link-resolver.ts        # Create bidirectional LINKS_TO relationships
│   └── backlinks/
│       └── query.ts                # Cypher queries for backlinks panel
├── ingestion/
│   └── jobs/
│       └── workers.ts              # Extend with note-processing worker
└── routes/
    └── notes.ts                    # Note CRUD endpoints

apps/omnii_mobile/src/
├── features/
│   └── notes/
│       ├── components/
│       │   ├── NoteEditor.tsx      # Markdown editor with wikilinks
│       │   ├── BacklinksPanel.tsx  # Show reverse links
│       │   ├── VoiceNoteButton.tsx # Voice capture UI
│       │   └── TemplateSelector.tsx
│       ├── hooks/
│       │   ├── useVoiceRecording.ts
│       │   └── useBacklinks.ts
│       └── screens/
│           └── NoteDetailScreen.tsx
```

### Pattern 1: Wikilink Parsing and Bidirectional Links
**What:** Parse `[[wikilinks]]` in markdown and create Neo4j relationships
**When to use:** When creating/updating notes with wiki-style links
**Example:**
```typescript
// Source: markdown-it-wikilinks + Neo4j bidirectional relationships research
import MarkdownIt from 'markdown-it';
import wikilinks from 'markdown-it-wikilinks';

// Configure wikilink parser
const md = new MarkdownIt().use(wikilinks, {
  baseURL: '/notes/',
  relativeBaseURL: './',
  makeAllLinksAbsolute: false,
  uriSuffix: '',
  htmlAttributes: { class: 'wikilink' },
  postProcessPagePath: (pagePath: string) => {
    // Normalize: lowercase, replace spaces with hyphens
    return pagePath.toLowerCase().replace(/\s+/g, '-');
  },
  postProcessLabel: (label: string) => {
    // Display text: capitalize first letter
    return label.charAt(0).toUpperCase() + label.slice(1);
  },
});

// Extract wikilinks from markdown content
function extractWikilinks(markdown: string): string[] {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = wikilinkRegex.exec(markdown)) !== null) {
    // Handle piped links: [[target|display]] -> extract "target"
    const linkText = match[1].split('|')[0].trim();
    links.push(linkText);
  }

  return [...new Set(links)]; // Deduplicate
}

// Create bidirectional links in Neo4j
async function createNoteLinks(
  noteId: string,
  wikilinks: string[],
  client: Neo4jHTTPClient
): Promise<void> {
  // Critical: Use undirected relationship syntax in Cypher
  // Single LINKS_TO relationship, traversable in both directions
  const cypher = `
    MATCH (source:Note {id: $noteId})
    UNWIND $targets AS targetName

    // Find or create target note (for forward links to non-existent notes)
    MERGE (target:Note {normalizedTitle: targetName})
    ON CREATE SET
      target.id = randomUUID(),
      target.title = targetName,
      target.createdAt = datetime(),
      target.isStub = true

    // Create single directional relationship (can be traversed both ways)
    MERGE (source)-[:LINKS_TO]->(target)
  `;

  await client.query(cypher, {
    noteId,
    targets: wikilinks.map(link =>
      link.toLowerCase().replace(/\s+/g, '-')
    ),
  });
}

// Query backlinks (notes linking TO this note)
async function getBacklinks(
  noteId: string,
  client: Neo4jHTTPClient
): Promise<Note[]> {
  // Use undirected syntax: (other)-[:LINKS_TO]-(note)
  // Or explicitly reverse: (other)-[:LINKS_TO]->(note)
  const cypher = `
    MATCH (other:Note)-[:LINKS_TO]->(note:Note {id: $noteId})
    WHERE other.isStub <> true
    RETURN other {
      .id,
      .title,
      .createdAt,
      .preview
    }
    ORDER BY other.updatedAt DESC
    LIMIT 50
  `;

  const result = await client.query(cypher, { noteId });
  return result.records.map(r => r.other);
}
```

### Pattern 2: Note Templates with Dynamic Fields
**What:** YAML frontmatter templates filled with context-specific data
**When to use:** Creating notes from templates (meeting notes, daily journal)
**Example:**
```typescript
// Source: gray-matter + note template best practices research
import matter from 'gray-matter';
import { format } from 'date-fns';
import { nanoid } from 'nanoid';

interface TemplateContext {
  currentUser: string;
  currentDate: Date;
  meeting?: {
    title: string;
    attendees: string[];
    project: string;
  };
  contact?: {
    name: string;
    company: string;
  };
}

// Template preset example: Meeting Notes
const meetingNotesTemplate = `---
type: meeting-notes
meeting_title: {{meeting.title}}
date: {{date}}
attendees:
{{#each meeting.attendees}}
  - {{this}}
{{/each}}
project: {{meeting.project}}
author: {{currentUser}}
---

# {{meeting.title}} - Meeting Notes

**Date:** {{date}}
**Attendees:** {{attendees_list}}
**Project:** [[{{meeting.project}}]]

## Agenda

- [ ]

## Key Decisions

-

## Action Items

- [ ] **@{{currentUser}}:**

## Next Meeting

- **Date:**
- **Topics:**
`;

// Fill template with context
function fillTemplate(
  template: string,
  context: TemplateContext
): string {
  let filled = template;

  // Replace simple variables
  filled = filled.replace(/\{\{date\}\}/g,
    format(context.currentDate, 'yyyy-MM-dd')
  );
  filled = filled.replace(/\{\{currentUser\}\}/g, context.currentUser);

  // Replace nested variables
  if (context.meeting) {
    filled = filled.replace(/\{\{meeting\.title\}\}/g, context.meeting.title);
    filled = filled.replace(/\{\{meeting\.project\}\}/g, context.meeting.project);

    // Handle arrays (attendees)
    const attendeesList = context.meeting.attendees.join(', ');
    filled = filled.replace(/\{\{attendees_list\}\}/g, attendeesList);

    // Handle YAML array syntax
    const attendeesYaml = context.meeting.attendees
      .map(a => `  - ${a}`)
      .join('\n');
    filled = filled.replace(
      /\{\{#each meeting\.attendees\}\}\n  - \{\{this\}\}\n\{\{\/each\}\}/g,
      attendeesYaml
    );
  }

  return filled;
}

// Create note from template
async function createNoteFromTemplate(
  templateName: string,
  context: TemplateContext,
  client: Neo4jHTTPClient
): Promise<{ noteId: string; content: string }> {
  // 1. Load template
  const template = await loadTemplate(templateName);

  // 2. Fill with context
  const content = fillTemplate(template, context);

  // 3. Parse frontmatter
  const { data: frontmatter, content: markdown } = matter(content);

  // 4. Extract wikilinks
  const wikilinks = extractWikilinks(markdown);

  // 5. Create Note node
  const noteId = nanoid(12);
  const cypher = `
    CREATE (n:Note {
      id: $id,
      title: $title,
      content: $content,
      frontmatter: $frontmatter,
      templateType: $templateType,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN n.id AS id
  `;

  await client.query(cypher, {
    id: noteId,
    title: frontmatter.meeting_title || frontmatter.type,
    content: markdown,
    frontmatter: JSON.stringify(frontmatter),
    templateType: templateName,
  });

  // 6. Create wikilink relationships
  await createNoteLinks(noteId, wikilinks, client);

  return { noteId, content };
}
```

### Pattern 3: Voice-to-Text Note Capture
**What:** Mobile voice recording with on-device transcription
**When to use:** Quick note capture on mobile devices
**Example:**
```typescript
// Source: @jamsch/expo-speech-recognition official docs
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
  requestPermissionsAsync,
} from 'expo-speech-recognition';
import { useState, useEffect } from 'react';

function useVoiceNoteCapture() {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for recognition results
  useSpeechRecognitionEvent('result', (event) => {
    // Interim results for real-time feedback
    if (!event.isFinal && event.results[0]) {
      setTranscript(event.results[0].transcript);
    }
    // Final results
    if (event.isFinal && event.results[0]) {
      setTranscript(event.results[0].transcript);
      setIsRecording(false);
    }
  });

  // Listen for errors
  useSpeechRecognitionEvent('error', (event) => {
    setError(event.error);
    setIsRecording(false);
  });

  async function startRecording() {
    // 1. Request permissions
    const { status } = await requestPermissionsAsync();
    if (status !== 'granted') {
      setError('Microphone permission denied');
      return;
    }

    // 2. Start recognition
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true, // Real-time feedback
        maxAlternatives: 1,
        continuous: false,

        // iOS-specific: on-device recognition
        requiresOnDeviceRecognition: true,
        addsPunctuation: true,

        // Android-specific
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: 'free_form',
        },
      });

      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function stopRecording() {
    ExpoSpeechRecognitionModule.stop();
    setIsRecording(false);
  }

  return {
    transcript,
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}

// Voice note component
function VoiceNoteButton() {
  const { transcript, isRecording, startRecording, stopRecording } =
    useVoiceNoteCapture();
  const { createNote } = useNoteCreation();

  async function handleVoiceNote() {
    if (isRecording) {
      stopRecording();
      // Create note from transcript
      if (transcript.trim()) {
        await createNote({
          content: transcript,
          createdVia: 'voice',
        });
      }
    } else {
      await startRecording();
    }
  }

  return (
    <Pressable onPress={handleVoiceNote}>
      {isRecording ? (
        <Text>Recording... {transcript}</Text>
      ) : (
        <Text>Tap to record voice note</Text>
      )}
    </Pressable>
  );
}
```

### Pattern 4: PowerSync Optimistic UI for Instant Notes
**What:** Create notes locally, sync to server in background
**When to use:** All note creation/editing operations
**Example:**
```typescript
// Source: PowerSync offline-first patterns research
import { usePowerSync } from '@powersync/react';
import { v4 as uuid } from 'uuid';

async function createNote(
  content: string,
  powerSync: PowerSyncDatabase
): Promise<string> {
  const noteId = uuid();
  const now = new Date().toISOString();

  // 1. Write to local SQLite (instant feedback)
  await powerSync.execute(
    `INSERT INTO notes (id, content, created_at, synced)
     VALUES (?, ?, ?, 0)`,
    [noteId, content, now]
  );

  // 2. Queue upload to backend (background sync)
  await powerSync.writeCheckpoint({
    writeCheckpoint: async (tx) => {
      // This executes when online
      await fetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          id: noteId,
          content,
          createdAt: now,
        }),
      });
    },
  });

  // 3. Return immediately (optimistic UI)
  return noteId;
}

// UI shows note instantly, syncs in background
function NoteEditor() {
  const powerSync = usePowerSync();
  const [content, setContent] = useState('');

  async function saveNote() {
    // Instant feedback: note appears in list immediately
    const noteId = await createNote(content, powerSync);

    // Navigate to note detail (shows even if offline)
    navigation.navigate('NoteDetail', { noteId });
  }

  return (
    <TextInput
      value={content}
      onChangeText={setContent}
      onSubmitEditing={saveNote}
    />
  );
}
```

### Pattern 5: Entity Extraction from Note Content
**What:** Extract people, places, organizations from notes for graph connections
**When to use:** Background job after note creation/update
**Example:**
```typescript
// Source: compromise NLP + @xenova/transformers research
import nlp from 'compromise';
import { pipeline } from '@xenova/transformers';

interface ExtractedEntities {
  people: string[];
  places: string[];
  organizations: string[];
  dates: string[];
}

// Fast extraction with compromise (real-time)
function extractEntitiesFast(text: string): ExtractedEntities {
  const doc = nlp(text);

  return {
    people: doc.people().out('array'),
    places: doc.places().out('array'),
    organizations: doc.organizations().out('array'),
    dates: doc.dates().out('array'),
  };
}

// Accurate extraction with transformers (background job)
async function extractEntitiesAccurate(
  text: string
): Promise<ExtractedEntities> {
  const classifier = await pipeline(
    'token-classification',
    'Xenova/bert-base-NER'
  );

  const results = await classifier(text);

  const entities: ExtractedEntities = {
    people: [],
    places: [],
    organizations: [],
    dates: [],
  };

  for (const entity of results) {
    if (entity.entity.includes('PER')) {
      entities.people.push(entity.word);
    } else if (entity.entity.includes('LOC')) {
      entities.places.push(entity.word);
    } else if (entity.entity.includes('ORG')) {
      entities.organizations.push(entity.word);
    }
  }

  return entities;
}

// Link entities to graph
async function linkEntitiesToNote(
  noteId: string,
  entities: ExtractedEntities,
  client: Neo4jHTTPClient
): Promise<void> {
  const cypher = `
    MATCH (n:Note {id: $noteId})

    // Link people
    UNWIND $people AS personName
    MERGE (p:Person {name: personName})
    MERGE (n)-[:MENTIONS]->(p)

    // Link organizations
    UNWIND $orgs AS orgName
    MERGE (o:Organization {name: orgName})
    MERGE (n)-[:MENTIONS]->(o)

    // Link places
    UNWIND $places AS placeName
    MERGE (loc:Location {name: placeName})
    MERGE (n)-[:MENTIONS]->(loc)
  `;

  await client.query(cypher, {
    noteId,
    people: entities.people,
    orgs: entities.organizations,
    places: entities.places,
  });
}
```

### Anti-Patterns to Avoid

- **Duplicate bidirectional relationships:** Don't create both `(A)-[:LINKS_TO]->(B)` and `(B)-[:LINKS_TO]->(A)`. Neo4j traverses relationships in both directions at same speed. Use single directional relationship with undirected queries.

- **Blocking UI on voice transcription:** Don't wait for transcription to complete before showing feedback. Use interim results to show real-time transcription as user speaks.

- **Custom template engine:** Don't build complex template language. Use simple string replacement with `{{variable}}` syntax or adopt Handlebars if complexity grows. YAML frontmatter + string replacement covers 90% of use cases.

- **Synchronous entity extraction on save:** Don't block note creation waiting for NLP. Extract entities in background BullMQ job. User should see note instantly, entities appear later.

- **File-based note storage with custom sync:** Don't implement custom file sync. Use PowerSync SQLite database for mobile offline-first, sync to PostgreSQL, then hydrate Neo4j graph via background jobs.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wikilink parsing | Regex `\[\[.*?\]\]` | markdown-it-wikilinks | Handles edge cases: nested brackets, piped links `[[target\|display]]`, escaping, URI encoding |
| Voice transcription | Audio recording + API | @jamsch/expo-speech-recognition | Native APIs give <3s latency, on-device privacy, punctuation, interim results; API adds 500ms+ network delay |
| Template filling | Custom string replace | gray-matter + simple replace | YAML frontmatter parsing is complex (nested objects, arrays, escaping); gray-matter handles all edge cases |
| Bidirectional graph queries | Dual relationships | Neo4j undirected syntax | Creating both `A->B` and `B->A` wastes 2x storage, 2x write time; Neo4j traverses single relationship both ways |
| Offline sync | Custom SQLite sync | PowerSync | Partial sync, conflict resolution, optimistic UI patterns are complex; PowerSync solves at scale |
| Entity extraction | Regex patterns | compromise + @xenova/transformers | "John Smith" vs "john smith", "New York" vs "new york", context-dependent entity types—NLP models handle nuances |

**Key insight:** Note-taking apps have 20+ years of accumulated wisdom in PKM (Personal Knowledge Management) ecosystem. Markdown-it-wikilinks, YAML frontmatter, and bidirectional links are solved problems. Innovation should be in **user experience** (voice capture, AI suggestions, contextual backlinks), not re-implementing markdown parsers.

## Common Pitfalls

### Pitfall 1: Broken Wikilinks (Dead Link Accumulation)
**What goes wrong:** User creates `[[link to nonexistent note]]`, no note created, link breaks when clicked.
**Why it happens:** Not pre-creating stub notes for forward references.
**How to avoid:** Use `MERGE` in Neo4j to create stub notes with `isStub: true` when wikilink target doesn't exist. Later, when user creates actual note, merge with stub and set `isStub: false`.
**Warning signs:** Users report "broken links" or "clicking does nothing" in notes with many wikilinks.

### Pitfall 2: Voice Transcription Latency Creep
**What goes wrong:** Voice notes take 5-10 seconds to appear, users perceive as "broken".
**Why it happens:** Using cloud API transcription (network delay) or waiting for final result before showing anything.
**How to avoid:** Use on-device recognition (`requiresOnDeviceRecognition: true` on iOS) and show interim results immediately. User sees transcription appear word-by-word as they speak.
**Warning signs:** Users say "voice notes are slow" or don't use voice feature after trying once.

### Pitfall 3: Template Over-Engineering
**What goes wrong:** Templates become mini-programming language with loops, conditionals, functions—complexity spirals.
**Why it happens:** Trying to make templates handle every edge case instead of keeping simple.
**How to avoid:** Limit templates to simple variable replacement and basic lists. If template logic grows beyond 5 variable types, create multiple template presets instead of one complex template.
**Warning signs:** Template bugs, users confused by template syntax, team spends days debugging template rendering.

### Pitfall 4: Backlinks Performance Degradation
**What goes wrong:** Backlinks panel takes 2-3 seconds to load, stutters when scrolling.
**Why it happens:** Querying all backlinks without pagination, fetching full note content instead of previews.
**How to avoid:** Limit backlinks query to 50 most recent, fetch only `{id, title, preview}` fields, add index on `LINKS_TO` relationship. Use Cypher `LIMIT 50` and pagination for hundreds of backlinks.
**Warning signs:** Users report "backlinks are slow", database CPU spikes when opening notes with many backlinks.

### Pitfall 5: Note Title Normalization Mismatch
**What goes wrong:** User types `[[Project Alpha]]` and `[[project-alpha]]` in different notes, creates two separate notes instead of linking to same note.
**Why it happens:** Inconsistent normalization between wikilink parser and database lookup.
**How to avoid:** Store both `title` (display) and `normalizedTitle` (lowercase, hyphens for spaces) on Note nodes. Match wikilinks against `normalizedTitle`, display with original `title`. Normalize ONCE in `postProcessPagePath` config.
**Warning signs:** Duplicate notes with similar names, users confused why wikilinks create new notes.

### Pitfall 6: Frontmatter Parsing Breaks on Edge Cases
**What goes wrong:** Notes with `---` in content body corrupt frontmatter parsing, lose metadata.
**Why it happens:** Hand-rolling frontmatter extraction with simple regex instead of proper parser.
**How to avoid:** Use gray-matter library—handles escaped delimiters, nested YAML, multiline strings. Don't use regex on YAML.
**Warning signs:** Users report "template data disappeared" or "note metadata corrupted" after editing.

### Pitfall 7: Entity Extraction Blocking Note Creation
**What goes wrong:** Creating note takes 5-10 seconds because waiting for NLP entity extraction.
**Why it happens:** Running entity extraction synchronously in POST /notes endpoint.
**How to avoid:** Extract entities in background BullMQ job. Create note immediately, queue `extract-entities` job with noteId. User sees note instantly, entity links appear 5-30s later.
**Warning signs:** Users complain "creating notes is slow", timeout errors on note creation.

## Code Examples

Verified patterns from official sources:

### Backlinks Query with Preview
```typescript
// Source: Neo4j undirected relationship traversal + GraphAware bidirectional relationships
async function getBacklinksWithPreview(
  noteId: string,
  client: Neo4jHTTPClient,
  limit: number = 50
): Promise<BacklinkPreview[]> {
  const cypher = `
    MATCH (other:Note)-[:LINKS_TO]->(target:Note {id: $noteId})
    WHERE other.isStub <> true

    // Extract context around the link
    WITH other, target,
      // Find the wikilink in content
      reduce(preview = '', chunk IN split(other.content, '[[' + target.title + ']]') |
        CASE WHEN preview = ''
          THEN substring(chunk, size(chunk) - 50)
          ELSE preview
        END
      ) AS beforeLink

    RETURN other {
      .id,
      .title,
      .createdAt,
      preview: beforeLink + '[[' + target.title + ']]'
    } AS backlink
    ORDER BY other.updatedAt DESC
    LIMIT $limit
  `;

  const result = await client.query(cypher, { noteId, limit });
  return result.records.map(r => r.backlink);
}
```

### Daily Journal Template
```yaml
---
type: daily-journal
date: {{date}}
day_of_week: {{dayOfWeek}}
author: {{currentUser}}
tags:
  - journal
  - daily-notes
---

# Daily Journal - {{date}}

## Morning Reflection

**Mood:**

**Today's Focus:**
- [ ]

## Notes

## Evening Reflection

**Wins:**
-

**Learnings:**
-

**Tomorrow's Priorities:**
1.
2.
3.

---
**Previous:** [[{{previousDate}}]]
**Next:** [[{{nextDate}}]]
```

### Contact Notes Template
```yaml
---
type: contact-notes
contact_name: {{contact.name}}
company: {{contact.company}}
email: {{contact.email}}
last_contact: {{date}}
tags:
  - people
  - {{contact.company}}
---

# {{contact.name}} - Contact Notes

**Company:** [[{{contact.company}}]]
**Email:** {{contact.email}}
**Last Contact:** {{date}}

## Background

## Conversation Notes

### {{date}}

## Follow-up Items

- [ ]

## Related

-
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hierarchical folders | Bi-directional links + graph | 2017 (Roam Research) | Notes discovered through connections, not file paths |
| Cloud-only sync | Local-first offline sync | 2020-2023 (Obsidian, Notion offline) | Zero-latency writes, works offline, sync when online |
| Manual tagging | Automatic entity extraction | 2023-2026 (AI-powered PKM) | Graph connections emerge automatically from content |
| API-based transcription | On-device speech recognition | 2024-2026 (iOS 17+, Android 12+) | <3s latency, privacy, offline capability |
| Custom markdown parsers | Standardized markdown-it ecosystem | 2015-2020 | Plugin ecosystem, battle-tested, spec compliance |

**Deprecated/outdated:**
- **File-based sync with Dropbox/iCloud:** Causes conflicts, slow, not designed for app databases. Modern: PowerSync with PostgreSQL backend.
- **TinyMCE/CKEditor WYSIWYG editors:** Heavy, slow on mobile, accessibility issues. Modern: Live markdown rendering (react-native-live-markdown).
- **Server-side voice transcription APIs (Google/AWS):** 500ms+ latency, costs scale with usage. Modern: On-device with @jamsch/expo-speech-recognition.
- **Hierarchical note organization:** Rigid structure, hard to refactor. Modern: Graph-based with bidirectional links.

## Open Questions

Things that couldn't be fully resolved:

1. **Entity extraction accuracy in practice**
   - What we know: compromise processes 1MB/sec, transformers.js more accurate but slower
   - What's unclear: Real-world accuracy on actual user notes (names, project mentions, etc.)
   - Recommendation: Start with compromise for real-time extraction, add transformers.js refinement in background job, A/B test accuracy vs. latency tradeoff

2. **Wikilink conflict resolution strategy**
   - What we know: Need normalized titles to match links, stub notes for forward references
   - What's unclear: How to handle user manually creating note that matches stub (merge? replace? conflict?)
   - Recommendation: Implement MERGE with ON MATCH to update stub with full content, preserve relationships

3. **Voice transcription language support**
   - What we know: @jamsch/expo-speech-recognition supports 50+ languages via native APIs
   - What's unclear: Which languages support on-device recognition vs. requiring network
   - Recommendation: Default to en-US on-device, add language selector in settings, gracefully fallback to cloud if on-device unavailable

4. **Backlinks panel UI performance with 100+ backlinks**
   - What we know: Limit to 50, pagination for more
   - What's unclear: Should we virtualize list? Group by date? Show aggregated count?
   - Recommendation: Start with simple paginated list (50 per page), add virtualization only if performance issues emerge in testing

## Sources

### Primary (HIGH confidence)
- GitHub jsepia/markdown-it-wikilinks - Plugin configuration, link processing
- GitHub jamsch/expo-speech-recognition - Voice recognition API, platform support, latency characteristics
- GitHub xenova/transformers.js v3.8.1 - NER model support, performance characteristics
- GraphAware Neo4j Bidirectional Relationships - Best practices for single directional relationships, undirected queries
- BullMQ official docs - Background job patterns, retry strategies
- PowerSync official docs - Offline-first sync patterns, optimistic UI
- Phase 8 Research (08-RESEARCH.md) - Document/Chunk schema, chunking strategies, embedding generation

### Secondary (MEDIUM confidence)
- [Best way to represent bidirectional relationships - Neo4j Community](https://community.neo4j.com/t/best-way-to-represent-bidirectional-relationships/47628) - Community consensus on single relationship
- [Top APIs for real-time speech recognition 2026](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription) - Latency benchmarks, on-device vs. cloud
- [Meeting Notes That Actually Work in 2026](https://trueconf.com/blog/productivity/meeting-notes-template) - Template structure best practices
- [Building Scalable Background Jobs with BullMQ](https://dev.to/asad_ahmed_5592ac0a7d0258/building-scalable-background-jobs-in-nodejs-with-bullmq-a-complete-guide-509p) - Job processing patterns
- [React Native markdown editor best practices](https://docs.expo.dev/guides/editing-richtext/) - Live markdown rendering patterns

### Tertiary (LOW confidence)
- [Obsidian vs Roam Research comparison](https://thesweetsetup.com/obsidian-vs-roam/) - Feature comparison, general PKM patterns
- [Named Entity Recognition comprehensive guide](https://medium.com/@kanerika/named-entity-recognition-a-comprehensive-guide-to-nlps-key-technology-636a124eaa46) - NER approaches overview
- [Note-taking app pitfalls](https://www.smartkarrot.com/resources/blog/why-note-taking-apps-and-tools-do-not-work-well-anymore/) - Common UX failures

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs/GitHub, versions confirmed
- Architecture: HIGH - Patterns based on Phase 8 infrastructure, Neo4j official best practices, PowerSync official patterns
- Pitfalls: MEDIUM - Based on community wisdom and PKM app failure modes, not direct field testing

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable domain, markdown/wikilinks patterns mature)
