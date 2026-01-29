/**
 * Notes API Client
 *
 * Clean, typed API client for note operations.
 * Connects to backend at /api/notes
 */

import { API_BASE_URL } from '~/config/api';

// Types
type CreatedVia = 'manual' | 'voice' | 'template';
type TemplateType = 'meeting-notes' | 'daily-journal' | 'contact-notes';

export interface Note {
  id: string;
  title: string;
  normalizedTitle: string;
  content: string;
  isStub: boolean;
  createdVia: CreatedVia;
  templateType?: TemplateType;
  linkCount?: number;
  backlinkCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateNoteParams {
  userId: string;
  title: string;
  content: string;
  createdVia?: CreatedVia;
}

export interface CreateNoteResult {
  success: boolean;
  noteId: string;
  normalizedTitle: string;
  linksCreated: number;
  stubsCreated: number;
}

export interface TemplateContext {
  currentUser?: string;
  date?: string;
  meeting?: {
    title: string;
    attendees: string[];
    project?: string;
  };
  contact?: {
    name: string;
    company?: string;
    email?: string;
  };
  journal?: {
    previousDate?: string;
    nextDate?: string;
  };
}

export interface CreateFromTemplateParams {
  userId: string;
  templateType: TemplateType;
  context: TemplateContext;
}

export interface CreateFromTemplateResult {
  success: boolean;
  noteId: string;
  normalizedTitle: string;
  title: string;
  linksCreated: number;
  stubsCreated: number;
}

export interface BacklinkItem {
  noteId: string;
  title: string;
  preview: string;
  updatedAt: string;
}

export interface BacklinksResult {
  targetId: string;
  targetTitle: string;
  backlinks: BacklinkItem[];
  totalCount: number;
}

export interface UpdateNoteParams {
  userId: string;
  noteId: string;
  title?: string;
  content?: string;
}

export interface WikilinkInfo {
  target: string;
  display: string;
  normalizedTarget: string;
}

// API Functions

/**
 * Create a new note
 */
export async function createNote(params: CreateNoteParams): Promise<CreateNoteResult> {
  const response = await fetch(`${API_BASE_URL}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: params.userId,
      title: params.title,
      content: params.content,
      createdVia: params.createdVia || 'manual',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to create note');
  }

  return response.json();
}

/**
 * Create a note from template
 */
export async function createNoteFromTemplate(
  params: CreateFromTemplateParams
): Promise<CreateFromTemplateResult> {
  const response = await fetch(`${API_BASE_URL}/api/notes/from-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: params.userId,
      templateType: params.templateType,
      context: params.context,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to create note from template');
  }

  return response.json();
}

/**
 * Get backlinks for a note
 */
export async function getBacklinks(
  userId: string,
  noteId: string,
  limit = 50,
  offset = 0
): Promise<BacklinksResult> {
  const params = new URLSearchParams({
    userId,
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}/backlinks?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to get backlinks');
  }

  return response.json();
}

/**
 * Update an existing note
 */
export async function updateNote(params: UpdateNoteParams): Promise<{
  success: boolean;
  noteId: string;
  linksUpdated: { linksCreated: number; stubsCreated: number } | null;
}> {
  const response = await fetch(`${API_BASE_URL}/api/notes/${params.noteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: params.userId,
      title: params.title,
      content: params.content,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to update note');
  }

  return response.json();
}

/**
 * Delete a note
 */
export async function deleteNote(userId: string, noteId: string): Promise<void> {
  const params = new URLSearchParams({ userId });

  const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}?${params}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to delete note');
  }
}

/**
 * Get a note by ID
 */
export async function getNote(
  userId: string,
  noteId: string
): Promise<{ note: Note; wikilinks: WikilinkInfo[] }> {
  const params = new URLSearchParams({ userId });

  const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to get note');
  }

  return response.json();
}

/**
 * List recent notes
 */
export async function listNotes(
  userId: string,
  limit = 50,
  includeStubs = false
): Promise<{ count: number; notes: Note[] }> {
  const params = new URLSearchParams({
    userId,
    limit: String(limit),
    includeStubs: String(includeStubs),
  });

  const response = await fetch(`${API_BASE_URL}/api/notes?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to list notes');
  }

  return response.json();
}

/**
 * Search notes by title
 */
export async function searchNotes(
  userId: string,
  query: string,
  limit = 20
): Promise<{ query: string; count: number; notes: Note[] }> {
  const params = new URLSearchParams({
    userId,
    q: query,
    limit: String(limit),
  });

  const response = await fetch(`${API_BASE_URL}/api/notes/search?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to search notes');
  }

  return response.json();
}

/**
 * List available templates
 */
export async function listTemplates(): Promise<{
  templates: { type: TemplateType; name: string }[];
}> {
  const response = await fetch(`${API_BASE_URL}/api/notes/templates`);

  if (!response.ok) {
    throw new Error('Failed to fetch templates');
  }

  return response.json();
}
