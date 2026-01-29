/**
 * Notes Feature API
 *
 * Clean, typed API client for note operations.
 */

export {
  createNote,
  createNoteFromTemplate,
  getBacklinks,
  updateNote,
  deleteNote,
  getNote,
  listNotes,
  searchNotes,
  listTemplates,
} from './notesApi';

export type {
  Note,
  CreateNoteParams,
  CreateNoteResult,
  TemplateContext,
  CreateFromTemplateParams,
  CreateFromTemplateResult,
  BacklinkItem,
  BacklinksResult,
  UpdateNoteParams,
  WikilinkInfo,
} from './notesApi';
