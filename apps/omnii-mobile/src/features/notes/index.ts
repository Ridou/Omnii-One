/**
 * Notes Feature Module
 *
 * Wiki-style note capture with bidirectional linking, templates,
 * and voice input support.
 *
 * Components:
 * - VoiceNoteButton: Animated voice recording with real-time transcription
 * - BacklinksPanel: Collapsible panel showing notes that link to current note
 * - TemplateSelector: Modal sheet for choosing note templates
 * - NoteEditor: Full-featured editor with toolbar and wikilink support
 *
 * Hooks:
 * - useVoiceCapture: Voice-to-text recording with expo-speech-recognition
 *
 * API:
 * - Full CRUD operations for notes
 * - Template creation
 * - Backlinks queries
 * - Search functionality
 */

// Components
export {
  VoiceNoteButton,
  BacklinksPanel,
  TemplateSelector,
  NoteEditor,
} from './components';

// Hooks
export {
  useVoiceCapture,
  isVoiceCaptureAvailable,
} from './hooks';
export type { VoiceCaptureState, VoiceCaptureActions } from './hooks';

// API
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
} from './api';
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
} from './api';

// Types
export type {
  NoteInput,
  WikilinkMatch,
  TemplateType,
} from './types';
