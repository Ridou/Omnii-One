# Technology Stack for v2.0 Features

**Project:** Omnii One v2.0
**Researched:** 2026-01-26
**Confidence:** HIGH

## Context

This stack document covers ONLY the additions needed for v2.0 features. The existing v1.0 stack (Bun, Elysia, Neo4j HTTP API, Supabase, PowerSync, React Native 0.79.3/Expo 53) is validated and will not be changed.

## New Capabilities for v2.0

1. Local file ingestion (PDFs, Word, text, code, markdown)
2. Notes/knowledge capture (quick capture, templates, wiki-linking)
3. Enhanced AI intelligence (entity extraction, proactive suggestions)
4. Gamification (XP, levels, achievements, mascot, analytics)

---

## Backend Stack Additions

### Document Parsing

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| unpdf | ^1.4.0 | PDF text extraction | Modern alternative to pdf-parse, works across all JS runtimes including Bun, serverless-optimized with PDF.js. 48 projects use it. Published 3 months ago (Oct 2025). |
| mammoth | ^1.8.0 | Word doc (.docx) conversion to HTML | De facto standard for .docx parsing in Node.js ecosystem. Converts to clean HTML with style mapping. Actively maintained for 2026. |
| markdown-it | ^14.1.0 | Markdown parsing core | Extensible, plugin-based markdown parser. Foundation for wiki-links. |
| markdown-it-wikilinks | ^1.0.0 | Wiki-style links `[[page]]` | Enables bidirectional linking between notes, Obsidian-style syntax. |

**Alternative considered:**
- **pdf-parse**: Faster for simple text extraction but struggles with complex documents (scanned contracts, multi-column papers, tables). unpdf is more robust and modern.
- **LibPDF**: Modern TypeScript API but less battle-tested than unpdf for production use.
- **pdf.js**: Full rendering engine, overkill for text extraction. unpdf uses pdf.js internally but exposes simpler API.

### Code Parsing

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| tree-sitter | ^0.21.1 | Code parsing and AST | Superior to regex-based parsers. Used by GitHub for syntax highlighting. Incremental parsing enables real-time editing. Supports 70+ languages. |
| tree-sitter-highlight | ^0.21.1 | Syntax highlighting | Built-in Tree-sitter highlighting with logical "highlight names" (function.method, type.builtin). |

**Alternative considered:**
- **Prism**: Regex-based, simpler but less accurate. Users are migrating to Tree-sitter solutions in 2026.
- **Shiki**: Good for static rendering but Tree-sitter provides AST access for semantic analysis.

### Entity Extraction (JavaScript-native)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @xenova/transformers | ^2.17.0 | Transformer models in JS | Hugging Face Transformers.js - runs BERT NER models via ONNX in Node.js/browser. Use with 'Xenova/bert-base-NER' model. |
| compromise | ^14.13.0 | Lightweight NLP | 60fps NLP library, works in browser, English-only. Good for basic entity extraction without Python dependency. |

**Alternative considered:**
- **spaCy via Python microservice**: Better accuracy but adds operational complexity (Python runtime, inter-process communication, deployment). For v2.0, start with JavaScript-native solutions. If accuracy is insufficient, phase in Python microservice later.
- **NLP.js**: Multilingual but heavier than needed for English-only use case.
- **wink-ner**: Trainable but requires training data setup.

**Recommendation for v2.0:**
1. Use **compromise** for lightweight, real-time entity extraction in ingestion pipeline
2. Use **@xenova/transformers** with BERT NER for more accurate batch processing
3. Defer Python/spaCy microservice to v3.0 if accuracy metrics show need

### Additional Backend Libraries

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| file-type | ^19.6.0 | Detect file MIME types | Reliable file type detection for ingestion routing |
| mime-types | ^2.1.35 | MIME type lookup | Standard library for file type handling |

---

## Mobile Stack Additions

### Voice Transcription

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @jamsch/expo-speech-recognition | ^0.3.1 | Native speech-to-text | Expo-compatible, uses iOS SFSpeechRecognizer and Android SpeechRecognizer. Volume metering support for UI feedback. Most comprehensive Expo solution as of 2026. |

**Alternative considered:**
- **whisper.rn**: On-device Whisper model. Better privacy and offline capability BUT requires large model download (100MB+), performance delays on Android, and complex FFmpeg conversion pipeline. Defer to v3.0 for power users.
- **expo-stt**: Unofficial, less maintained than @jamsch package.
- **react-native-voice**: Popular but requires Expo dev build, less native Expo integration.

**Recommendation:** Start with @jamsch/expo-speech-recognition for v2.0 (faster to ship, uses OS-native recognition). Add whisper.rn in v3.0 as "Advanced Mode" for users who want offline/privacy.

### Animation & Gamification

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| react-native-reanimated | ^4.2.1 | Core animations | Standard for React Native animations, runs on UI thread for 60fps. v4.x requires New Architecture (which RN 0.79.3 supports). Declarative CSS-compatible API. Published 1 month ago (Dec 2025). |
| react-native-gesture-handler | ^2.24.0 | Touch interactions | Pairs with Reanimated for drag-drop, swipe, pinch-to-zoom. Already in v1.0 package.json. |
| lottie-react-native | ^7.3.5 | Simple mascot animations | Standard for After Effects JSON animations. Good for mascot character expressions, reward animations. Published 9 days ago (Jan 2026). Supports React 19 (required for RN 0.78+). |
| rive-react-native | ^6.0.0 | Interactive gamification UI | Better performance than Lottie (60fps vs 17fps), smaller files (2KB vs 24KB for same animation), interactive state machines. Use for XP progress bars, achievement unlocks. |

**Comparison: Lottie vs Rive**
- **Lottie**: Simpler workflow (After Effects export), larger community, but slower (17fps) and bigger files (24KB)
- **Rive**: 3x faster (60fps), 12x smaller files (2KB), interactive state machines, BUT smaller community and requires Rive editor learning curve

**Recommendation:** Use BOTH
- **Lottie** for mascot character animations (expressions, idle states) - artists already know After Effects
- **Rive** for UI gamification (XP bars, level-up effects, achievement popups) - performance matters for UI responsiveness

### Charts & Analytics

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| react-native-gifted-charts | ^1.4.40 | Analytics dashboard charts | Feature-rich, visually appealing. Supports bar, line, area, pie, stacked charts. Good balance of features and bundle size. |
| victory-native | ^41.4.0 | Complex data visualization | Composable chart components, identical API for web and native. Use if Gifted Charts is insufficient for specific chart types. |

**Alternative considered:**
- **React Native Skia**: Best raw performance for high-frequency real-time data, but overkill for analytics dashboards. Defer to v3.0 if real-time charts needed.
- **React Native Charts Wrapper**: Native performance but requires platform-specific configuration. Adds build complexity.
- **React Native Chart Kit**: Simpler but less customizable than Gifted Charts.

**Recommendation:** Start with react-native-gifted-charts. It covers 90% of analytics dashboard needs with good DX. Add Victory Native only if specific chart types are missing.

---

## Integration Points with Existing Stack

### Backend (Bun/Elysia)

```typescript
// Document ingestion pipeline
import { unpdf } from 'unpdf';
import mammoth from 'mammoth';
import MarkdownIt from 'markdown-it';
import wikilinks from 'markdown-it-wikilinks';

// Entity extraction
import { pipeline } from '@xenova/transformers';
import nlp from 'compromise';

// File type detection
import { fileTypeFromBuffer } from 'file-type';
```

**No breaking changes** - all libraries are standard NPM packages compatible with Bun's Node.js API compatibility.

### Mobile (React Native 0.79.3/Expo 53)

```json
// package.json additions
{
  "dependencies": {
    "@jamsch/expo-speech-recognition": "^0.3.1",
    "react-native-reanimated": "^4.2.1",
    "lottie-react-native": "^7.3.5",
    "rive-react-native": "^6.0.0",
    "react-native-gifted-charts": "^1.4.40"
  }
}
```

**Compatibility notes:**
- Reanimated 4.x requires New Architecture (RN 0.79.3 supports this)
- Lottie 7.3.5 supports React 19 (required for RN 0.78+)
- All libraries compatible with Expo 53

### Neo4j Graph Database

**Document nodes:**
```cypher
// New node types for v2.0
(Document {
  id: uuid,
  type: 'pdf|docx|md|code',
  path: string,
  content_text: string,
  embeddings: vector,
  created_at: datetime,
  updated_at: datetime
})

(Note {
  id: uuid,
  title: string,
  content: string,
  embeddings: vector,
  tags: [string],
  created_at: datetime,
  updated_at: datetime
})

// Relationships
(Note)-[:LINKS_TO]->(Note)  // Wiki-style bidirectional links
(Document)-[:EXTRACTED_ENTITY]->(Entity)
(Note)-[:MENTIONS]->(Entity)
```

**No schema breaking changes** - extends existing entity/concept graph.

---

## Anti-Patterns to Avoid

### Don't: Python Microservice for NER (v2.0)

**Why avoid:**
- Adds operational complexity (Python runtime, process management)
- Deployment complexity (two runtimes: Bun + Python)
- Inter-process communication overhead

**What to do instead:**
- Use JavaScript-native NER (compromise + Transformers.js)
- Measure accuracy metrics in production
- Phase in Python/spaCy microservice in v3.0 ONLY if metrics show need

### Don't: Custom Markdown Parser

**Why avoid:**
- Reinventing the wheel
- Security vulnerabilities (XSS, injection)
- Maintenance burden

**What to do instead:**
- Use markdown-it with plugins
- Extend with markdown-it-wikilinks for bidirectional linking

### Don't: Whisper.rn for MVP

**Why avoid:**
- 100MB+ model download
- Android performance issues (delays, complex FFmpeg conversion)
- Increases time-to-market

**What to do instead:**
- Use @jamsch/expo-speech-recognition (OS-native)
- Ship faster, validate voice capture feature
- Add whisper.rn in v3.0 as "Advanced Mode" if users request offline capability

### Don't: Full PDF Rendering Engine

**Why avoid:**
- Huge bundle size (pdf.js is 800KB+)
- Not needed for text extraction
- Overkill for ingestion pipeline

**What to do instead:**
- Use unpdf for text extraction only
- If PDF preview is needed in UI, add pdf.js ONLY to mobile app for viewer feature (not backend)

---

## Installation Commands

### Backend

```bash
# Document parsing
bun add unpdf mammoth markdown-it markdown-it-wikilinks

# Code parsing
bun add tree-sitter tree-sitter-highlight

# Entity extraction
bun add @xenova/transformers compromise

# File utilities
bun add file-type mime-types
```

### Mobile

```bash
# Voice
pnpm add @jamsch/expo-speech-recognition

# Animation (reanimated already installed, just needs upgrade)
pnpm add lottie-react-native rive-react-native

# Charts
pnpm add react-native-gifted-charts victory-native
```

---

## Phasing Recommendations

### Phase 1: Document Ingestion (Week 1-2)
- unpdf, mammoth, markdown-it, markdown-it-wikilinks
- file-type, mime-types
- Basic entity extraction with compromise

### Phase 2: Notes Capture (Week 3-4)
- @jamsch/expo-speech-recognition
- Wiki-linking in UI
- Note graph visualization

### Phase 3: Enhanced AI (Week 5-6)
- @xenova/transformers with BERT NER
- Proactive suggestions service
- Cross-source relationship inference

### Phase 4: Gamification (Week 7-8)
- lottie-react-native, rive-react-native
- react-native-gifted-charts
- XP/levels/achievements system

### Defer to v3.0:
- whisper.rn (on-device Whisper)
- Python/spaCy microservice (if accuracy metrics show need)
- tree-sitter language parsers beyond basic highlighting
- React Native Skia (if high-performance real-time charts needed)

---

## Success Metrics

Track these to inform v3.0 decisions:

| Metric | Target | Informs Decision |
|--------|--------|------------------|
| Entity extraction accuracy | >80% | Whether to add spaCy microservice |
| Voice transcription accuracy | >90% | Whether to add whisper.rn |
| Animation framerate | 60fps | Whether Lottie/Rive are sufficient or need Skia |
| Document parsing errors | <5% | Whether unpdf/mammoth are sufficient |

---

## Sources

**PDF Parsing:**
- [unpdf - GitHub](https://github.com/unjs/unpdf)
- [7 PDF Parsing Libraries for Node.js](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025)

**Word Documents:**
- [mammoth.js - GitHub](https://github.com/mwilliamson/mammoth.js)
- [mammoth - npm](https://www.npmjs.com/package/mammoth)

**Voice Transcription:**
- [@jamsch/expo-speech-recognition - GitHub](https://github.com/jamsch/expo-speech-recognition)
- [Build a Voice-to-Text App with Whisper and React Native](https://www.djamware.com/post/687b1ce8bf43dc2f985e5df5/build-a-voicetotext-transcription-app-with-whisper-and-react-native)
- [Using Whisper for speech recognition in React Native](https://blog.logrocket.com/using-whisper-speech-recognition-react-native/)

**Animation:**
- [Lottie vs. Rive: Optimizing Mobile App Animation](https://www.callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation)
- [Skia: Game Changer for React Native in 2026](https://medium.com/@expertappdevs/skia-game-changer-for-react-native-in-2026-f23cb9b85841)
- [lottie-react-native releases](https://github.com/lottie-react-native/lottie-react-native/releases)

**Charts:**
- [Top 10 React Native Chart Libraries for 2026](https://vocal.media/journal/top-10-react-native-chart-libraries-for-developers-in-2026)
- [Top 9 React Native Chart Libraries 2025](https://blog.openreplay.com/react-native-chart-libraries-2025/)

**Entity Extraction:**
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/en/index)
- [NLP Libraries for Node.js and JavaScript](https://www.kommunicate.io/blog/nlp-libraries-node-javascript/)
- [compromise - GitHub](https://github.com/spencermountain/compromise)

**Code Parsing:**
- [Tree-sitter Syntax Highlighting](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html)
- [Tree-sitter: Revolutionizing Parsing](https://www.deusinmachina.net/p/tree-sitter-revolutionizing-parsing)

**Markdown:**
- [markdown-it-wikilinks - npm](https://www.npmjs.com/package/markdown-it-wikilinks)
- [Bi-directional Links - Nólëbase Integrations](https://nolebase-integrations.ayaka.io/pages/en/integrations/markdown-it-bi-directional-links/)

**React Native Reanimated:**
- [Reanimated 4 Stable Release](https://blog.swmansion.com/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713)
- [React Native Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/)
