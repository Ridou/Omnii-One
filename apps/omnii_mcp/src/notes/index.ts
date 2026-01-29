/**
 * Notes Module
 *
 * Wiki-style note creation with bidirectional linking.
 * Supports templates, backlinks, and voice capture.
 */

// Types
export type {
  NoteInput,
  CreateNoteResult,
  WikilinkMatch,
  TemplateType,
  TemplateContext,
  NoteTemplate,
  BacklinkResult,
  BacklinksData,
  NoteProcessingJobData,
  NoteUpdateInput,
  NoteSearchResult,
  VoiceTranscriptionResult,
} from './types';

// Parsers
export {
  extractWikilinks,
  getWikilinkTargets,
  normalizeTitle,
  renderMarkdownWithWikilinks,
  stripWikilinks,
  countWikilinks,
  parseFrontmatter,
  stringifyFrontmatter,
  updateFrontmatter,
} from './parsers';

// Templates
export {
  fillTemplate,
  getTemplate,
  listTemplates,
  generateTitle,
} from './templates';

// Graph operations
export {
  createNote,
  createStubNote,
  getNoteById,
  getNoteByNormalizedTitle,
  updateNote,
  deleteNote,
  listRecentNotes,
  searchNotesByTitle,
  resolveWikilinks,
  updateNoteLinks,
  getBacklinks,
  getBacklinkCount,
  getBacklinksForEntity,
} from './graph';
