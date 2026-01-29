/**
 * Notes Graph Operations Module
 *
 * Exports CRUD operations, wikilink resolution, and backlinks queries.
 */

// Note CRUD operations
export {
  createNote,
  createStubNote,
  getNoteById,
  getNoteByNormalizedTitle,
  updateNote,
  deleteNote,
  listRecentNotes,
  searchNotesByTitle,
  updateNoteLinkCounts,
} from './note-operations';

// Wikilink resolution
export {
  resolveWikilinks,
  removeStaleLinks,
  getOutgoingLinks,
  updateNoteLinks,
} from './link-resolver';

export type { ResolveResult } from './link-resolver';

// Backlinks queries
export {
  getBacklinks,
  getBacklinkCount,
  getBacklinksForEntity,
  getMostLinkedNotes,
} from './backlinks-query';
