/**
 * Note Graph Operations
 *
 * CRUD operations for Note nodes in Neo4j.
 * Creates notes with proper normalization for wikilink matching.
 */

import { nanoid } from 'nanoid';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import type { NoteNode } from '../../graph/schema/nodes';
import type { NoteInput, NoteUpdateInput } from '../types';
import { normalizeTitle } from '../parsers/wikilink-parser';

/**
 * Create a new note in the graph.
 *
 * Does NOT resolve wikilinks - use link-resolver after creation.
 *
 * @param client - Neo4j HTTP client
 * @param input - Note creation input
 * @returns Created note ID and metadata
 */
export async function createNote(
  client: Neo4jHTTPClient,
  input: NoteInput
): Promise<{ noteId: string; normalizedTitle: string }> {
  const noteId = `note_${nanoid(12)}`;
  const normalizedTitle = normalizeTitle(input.title);
  const now = new Date().toISOString();

  const cypher = `
    CREATE (n:Note {
      id: $id,
      name: $title,
      title: $title,
      normalizedTitle: $normalizedTitle,
      content: $content,
      frontmatter: $frontmatter,
      templateType: $templateType,
      isStub: false,
      createdVia: $createdVia,
      createdAt: datetime($createdAt),
      updatedAt: datetime($createdAt),
      linkCount: 0,
      backlinkCount: 0
    })
    RETURN n.id AS id
  `;

  try {
    await client.query(cypher, {
      id: noteId,
      title: input.title,
      normalizedTitle,
      content: input.content,
      frontmatter: input.frontmatter ? JSON.stringify(input.frontmatter) : null,
      templateType: input.templateType || null,
      createdVia: input.createdVia,
      createdAt: now,
    });

    return { noteId, normalizedTitle };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create note: ${message}`);
  }
}

/**
 * Create a stub note for forward wikilink reference.
 * Used when a [[link]] targets a note that doesn't exist yet.
 *
 * @param client - Neo4j HTTP client
 * @param normalizedTitle - Normalized title from wikilink
 * @param displayTitle - Original display text from wikilink
 * @returns Created stub note ID
 */
export async function createStubNote(
  client: Neo4jHTTPClient,
  normalizedTitle: string,
  displayTitle: string
): Promise<string> {
  const noteId = `note_${nanoid(12)}`;
  const now = new Date().toISOString();

  const cypher = `
    MERGE (n:Note {normalizedTitle: $normalizedTitle})
    ON CREATE SET
      n.id = $id,
      n.name = $displayTitle,
      n.title = $displayTitle,
      n.content = '',
      n.isStub = true,
      n.createdVia = 'wikilink-stub',
      n.createdAt = datetime($createdAt),
      n.updatedAt = datetime($createdAt),
      n.linkCount = 0,
      n.backlinkCount = 0
    RETURN n.id AS id
  `;

  try {
    const result = await client.query(cypher, {
      id: noteId,
      normalizedTitle,
      displayTitle,
      createdAt: now,
    });

    const fields = result.data?.fields || [];
    const idIndex = fields.indexOf('id');
    return result.data?.values?.[0]?.[idIndex] as string || noteId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create stub note: ${message}`);
  }
}

/**
 * Get note by ID.
 *
 * @param client - Neo4j HTTP client
 * @param noteId - Note UUID
 * @returns Note or null
 */
export async function getNoteById(
  client: Neo4jHTTPClient,
  noteId: string
): Promise<NoteNode | null> {
  const cypher = `
    MATCH (n:Note {id: $id})
    RETURN n {
      .id, .name, .title, .normalizedTitle, .content,
      .frontmatter, .templateType, .isStub, .createdVia,
      .linkCount, .backlinkCount,
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } AS note
  `;

  try {
    const result = await client.query(cypher, { id: noteId });

    if (!result.data?.values?.length) {
      return null;
    }

    const fields = result.data.fields;
    const noteIndex = fields.indexOf('note');
    return result.data.values[0][noteIndex] as NoteNode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get note: ${message}`);
  }
}

/**
 * Get note by normalized title (for wikilink resolution).
 *
 * @param client - Neo4j HTTP client
 * @param normalizedTitle - Normalized title to look up
 * @returns Note or null
 */
export async function getNoteByNormalizedTitle(
  client: Neo4jHTTPClient,
  normalizedTitle: string
): Promise<NoteNode | null> {
  const cypher = `
    MATCH (n:Note {normalizedTitle: $normalizedTitle})
    RETURN n {
      .id, .name, .title, .normalizedTitle, .content,
      .frontmatter, .templateType, .isStub, .createdVia,
      .linkCount, .backlinkCount,
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } AS note
  `;

  try {
    const result = await client.query(cypher, { normalizedTitle });

    if (!result.data?.values?.length) {
      return null;
    }

    const fields = result.data.fields;
    const noteIndex = fields.indexOf('note');
    return result.data.values[0][noteIndex] as NoteNode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get note by title: ${message}`);
  }
}

/**
 * Update an existing note.
 *
 * @param client - Neo4j HTTP client
 * @param noteId - Note ID to update
 * @param updates - Fields to update
 */
export async function updateNote(
  client: Neo4jHTTPClient,
  noteId: string,
  updates: NoteUpdateInput
): Promise<void> {
  const setClauses: string[] = ['n.updatedAt = datetime()'];
  const params: Record<string, unknown> = { id: noteId };

  if (updates.title !== undefined) {
    setClauses.push('n.title = $title');
    setClauses.push('n.name = $title');
    setClauses.push('n.normalizedTitle = $normalizedTitle');
    params.title = updates.title;
    params.normalizedTitle = normalizeTitle(updates.title);
  }

  if (updates.content !== undefined) {
    setClauses.push('n.content = $content');
    params.content = updates.content;
  }

  if (updates.frontmatter !== undefined) {
    setClauses.push('n.frontmatter = $frontmatter');
    params.frontmatter = JSON.stringify(updates.frontmatter);
  }

  // If updating a stub to full note
  setClauses.push('n.isStub = false');

  const cypher = `
    MATCH (n:Note {id: $id})
    SET ${setClauses.join(', ')}
  `;

  try {
    await client.query(cypher, params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update note: ${message}`);
  }
}

/**
 * Delete a note and its relationships.
 *
 * @param client - Neo4j HTTP client
 * @param noteId - Note ID to delete
 */
export async function deleteNote(
  client: Neo4jHTTPClient,
  noteId: string
): Promise<void> {
  const cypher = `
    MATCH (n:Note {id: $id})
    DETACH DELETE n
  `;

  try {
    await client.query(cypher, { id: noteId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete note: ${message}`);
  }
}

/**
 * List recent notes.
 *
 * @param client - Neo4j HTTP client
 * @param limit - Max notes to return
 * @param includeStubs - Whether to include stub notes
 * @returns Array of notes
 */
export async function listRecentNotes(
  client: Neo4jHTTPClient,
  limit: number = 50,
  includeStubs: boolean = false
): Promise<NoteNode[]> {
  const stubFilter = includeStubs ? '' : 'WHERE n.isStub = false';

  const cypher = `
    MATCH (n:Note)
    ${stubFilter}
    RETURN n {
      .id, .name, .title, .normalizedTitle,
      .templateType, .isStub, .createdVia,
      .linkCount, .backlinkCount,
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } AS note
    ORDER BY n.updatedAt DESC
    LIMIT $limit
  `;

  try {
    const result = await client.query(cypher, { limit });

    if (!result.data?.values?.length) {
      return [];
    }

    const fields = result.data.fields;
    const noteIndex = fields.indexOf('note');
    return result.data.values.map((row) => row[noteIndex] as NoteNode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list notes: ${message}`);
  }
}

/**
 * Search notes by title.
 *
 * @param client - Neo4j HTTP client
 * @param query - Search query
 * @param limit - Max results
 * @returns Matching notes
 */
export async function searchNotesByTitle(
  client: Neo4jHTTPClient,
  query: string,
  limit: number = 20
): Promise<NoteNode[]> {
  const normalizedQuery = normalizeTitle(query);

  const cypher = `
    MATCH (n:Note)
    WHERE n.normalizedTitle CONTAINS $query
       OR toLower(n.title) CONTAINS toLower($rawQuery)
    RETURN n {
      .id, .name, .title, .normalizedTitle,
      .isStub, .createdVia,
      createdAt: toString(n.createdAt)
    } AS note
    ORDER BY n.isStub ASC, n.updatedAt DESC
    LIMIT $limit
  `;

  try {
    const result = await client.query(cypher, {
      query: normalizedQuery,
      rawQuery: query,
      limit,
    });

    if (!result.data?.values?.length) {
      return [];
    }

    const fields = result.data.fields;
    const noteIndex = fields.indexOf('note');
    return result.data.values.map((row) => row[noteIndex] as NoteNode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to search notes: ${message}`);
  }
}

/**
 * Update link counts on a note.
 *
 * @param client - Neo4j HTTP client
 * @param noteId - Note ID
 */
export async function updateNoteLinkCounts(
  client: Neo4jHTTPClient,
  noteId: string
): Promise<void> {
  const cypher = `
    MATCH (n:Note {id: $id})
    OPTIONAL MATCH (n)-[out:LINKS_TO]->()
    OPTIONAL MATCH ()-[in:LINKS_TO]->(n)
    WITH n, count(DISTINCT out) AS outLinks, count(DISTINCT in) AS inLinks
    SET n.linkCount = outLinks, n.backlinkCount = inLinks
  `;

  try {
    await client.query(cypher, { id: noteId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update link counts: ${message}`);
  }
}
