/**
 * Note System Type Definitions
 *
 * Types for wiki-style note creation, wikilink parsing,
 * templates, and note processing.
 */

import type { NoteNode } from '../graph/schema/nodes';

/**
 * Input for creating a new note
 */
export interface NoteInput {
  /** Note title (will be normalized for wikilink matching) */
  title: string;
  /** Markdown content with optional [[wikilinks]] */
  content: string;
  /** How the note is being created */
  createdVia: 'manual' | 'voice' | 'template';
  /** Template type if created from template */
  templateType?: 'meeting-notes' | 'daily-journal' | 'contact-notes';
  /** Pre-parsed frontmatter (when creating from template) */
  frontmatter?: Record<string, unknown>;
}

/**
 * Result from creating a note
 */
export interface CreateNoteResult {
  /** Created note ID */
  noteId: string;
  /** Normalized title for lookups */
  normalizedTitle: string;
  /** Extracted wikilinks from content */
  wikilinks: string[];
  /** Number of new stub notes created for forward references */
  stubsCreated: number;
  /** Number of LINKS_TO relationships created */
  linksCreated: number;
}

/**
 * Match from wikilink parsing
 */
export interface WikilinkMatch {
  /** Full match text including brackets [[...]] */
  raw: string;
  /** Target page/note reference */
  target: string;
  /** Display text (after pipe if piped link, otherwise same as target) */
  display: string;
  /** Normalized target for database lookup */
  normalizedTarget: string;
  /** Position in original text (start index) */
  position: number;
}

/**
 * Template types supported
 */
export type TemplateType = 'meeting-notes' | 'daily-journal' | 'contact-notes';

/**
 * Context data for filling templates
 */
export interface TemplateContext {
  /** Current user name/identifier */
  currentUser: string;
  /** Current date (for date formatting) */
  currentDate: Date;
  /** Meeting-specific context */
  meeting?: {
    title: string;
    attendees: string[];
    project?: string;
    calendarEventId?: string;
  };
  /** Contact-specific context */
  contact?: {
    name: string;
    company?: string;
    email?: string;
  };
  /** Daily journal context */
  journal?: {
    previousDate?: string;
    nextDate?: string;
  };
}

/**
 * Template definition
 */
export interface NoteTemplate {
  /** Template identifier */
  type: TemplateType;
  /** Display name */
  name: string;
  /** Template content with {{placeholders}} */
  template: string;
  /** Default frontmatter fields */
  defaultFrontmatter: Record<string, unknown>;
}

/**
 * Backlink result from query
 */
export interface BacklinkResult {
  /** Linking note ID */
  noteId: string;
  /** Linking note title */
  title: string;
  /** Preview text around the link (context) */
  preview: string;
  /** When the linking note was last updated */
  updatedAt: string;
}

/**
 * Backlinks panel data
 */
export interface BacklinksData {
  /** Target note/entity ID */
  targetId: string;
  /** Target title */
  targetTitle: string;
  /** Notes that link to this target */
  backlinks: BacklinkResult[];
  /** Total count (may be more than returned) */
  totalCount: number;
}

/**
 * Note processing job data (for BullMQ)
 */
export interface NoteProcessingJobData {
  /** User ID for database routing */
  userId: string;
  /** Note ID to process */
  noteId: string;
  /** Processing actions to perform */
  actions: ('extract-entities' | 'update-backlink-counts')[];
}

/**
 * Note update input
 */
export interface NoteUpdateInput {
  /** New title (optional) */
  title?: string;
  /** New content (optional) */
  content?: string;
  /** Updated frontmatter (optional) */
  frontmatter?: Record<string, unknown>;
}

/**
 * Note search result
 */
export interface NoteSearchResult {
  /** Note ID */
  id: string;
  /** Note title */
  title: string;
  /** Preview/snippet */
  preview: string;
  /** Search score */
  score: number;
  /** Match highlights */
  highlights?: string[];
}

/**
 * Voice transcription result
 */
export interface VoiceTranscriptionResult {
  /** Transcribed text */
  transcript: string;
  /** Whether this is a final result */
  isFinal: boolean;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Detected language */
  language?: string;
}
