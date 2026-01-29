/**
 * Wikilink Resolver
 *
 * Creates LINKS_TO relationships from [[wikilinks]] in note content.
 * Creates stub notes for forward references to non-existent notes.
 *
 * Key principle: Single directional LINKS_TO relationship.
 * Neo4j traverses relationships in both directions at same speed,
 * so we don't need duplicate relationships for bidirectional linking.
 */

import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import { extractWikilinks } from '../parsers/wikilink-parser';

/**
 * Result from resolving wikilinks.
 */
export interface ResolveResult {
  /** Number of LINKS_TO relationships created */
  linksCreated: number;
  /** Number of stub notes created for forward references */
  stubsCreated: number;
  /** Normalized targets that were linked */
  targets: string[];
}

/**
 * Resolve wikilinks in a note's content.
 *
 * For each [[wikilink]] found:
 * 1. Find or create target note (stub if doesn't exist)
 * 2. Create LINKS_TO relationship from source to target
 *
 * Uses MERGE to avoid duplicate relationships.
 *
 * @param client - Neo4j HTTP client
 * @param sourceNoteId - ID of the note containing wikilinks
 * @param content - Note content to parse for wikilinks
 * @returns Resolution statistics
 */
export async function resolveWikilinks(
  client: Neo4jHTTPClient,
  sourceNoteId: string,
  content: string
): Promise<ResolveResult> {
  const wikilinks = extractWikilinks(content);

  if (wikilinks.length === 0) {
    return { linksCreated: 0, stubsCreated: 0, targets: [] };
  }

  // Cypher to create links with stub note creation
  // Uses MERGE for idempotency (safe to run multiple times)
  const cypher = `
    MATCH (source:Note {id: $sourceId})
    UNWIND $targets AS target

    // Find or create target note
    MERGE (targetNote:Note {normalizedTitle: target.normalized})
    ON CREATE SET
      targetNote.id = 'note_' + substring(randomUUID(), 0, 12),
      targetNote.name = target.display,
      targetNote.title = target.display,
      targetNote.content = '',
      targetNote.isStub = true,
      targetNote.createdVia = 'wikilink-stub',
      targetNote.createdAt = datetime(),
      targetNote.updatedAt = datetime(),
      targetNote.linkCount = 0,
      targetNote.backlinkCount = 0

    // Create link relationship (only if not exists)
    MERGE (source)-[:LINKS_TO]->(targetNote)

    // Return what we did
    RETURN targetNote.id AS targetId, targetNote.isStub AS isStub
  `;

  try {
    const targets = wikilinks.map((link) => ({
      normalized: link.normalizedTarget,
      display: link.display,
    }));

    const result = await client.query(cypher, {
      sourceId: sourceNoteId,
      targets,
    });

    // Count stubs created
    let stubsCreated = 0;
    if (result.data?.values?.length) {
      const fields = result.data.fields;
      const stubIndex = fields.indexOf('isStub');
      for (const row of result.data.values) {
        if (row[stubIndex] === true) {
          stubsCreated++;
        }
      }
    }

    // Update source note's link count
    await updateSourceLinkCount(client, sourceNoteId, wikilinks.length);

    // Update backlink counts on all targets
    await updateTargetBacklinkCounts(
      client,
      wikilinks.map((w) => w.normalizedTarget)
    );

    return {
      linksCreated: wikilinks.length,
      stubsCreated,
      targets: wikilinks.map((w) => w.normalizedTarget),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve wikilinks: ${message}`);
  }
}

/**
 * Remove stale LINKS_TO relationships when note content changes.
 * Call before resolveWikilinks to ensure links match current content.
 *
 * @param client - Neo4j HTTP client
 * @param noteId - Note ID to clean up
 * @param currentTargets - Normalized targets that should remain linked
 */
export async function removeStaleLinks(
  client: Neo4jHTTPClient,
  noteId: string,
  currentTargets: string[]
): Promise<number> {
  const cypher = `
    MATCH (source:Note {id: $noteId})-[r:LINKS_TO]->(target:Note)
    WHERE NOT target.normalizedTitle IN $currentTargets
    DELETE r
    RETURN count(r) AS removed
  `;

  try {
    const result = await client.query(cypher, {
      noteId,
      currentTargets,
    });

    const fields = result.data?.fields || [];
    const removedIndex = fields.indexOf('removed');
    return (result.data?.values?.[0]?.[removedIndex] as number) || 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to remove stale links: ${message}`);
  }
}

/**
 * Update a note's outgoing link count.
 */
async function updateSourceLinkCount(
  client: Neo4jHTTPClient,
  noteId: string,
  count: number
): Promise<void> {
  const cypher = `
    MATCH (n:Note {id: $id})
    SET n.linkCount = $count
  `;

  await client.query(cypher, { id: noteId, count });
}

/**
 * Update backlink counts on target notes.
 */
async function updateTargetBacklinkCounts(
  client: Neo4jHTTPClient,
  normalizedTitles: string[]
): Promise<void> {
  const cypher = `
    UNWIND $titles AS title
    MATCH (target:Note {normalizedTitle: title})
    OPTIONAL MATCH ()-[r:LINKS_TO]->(target)
    WITH target, count(r) AS backlinks
    SET target.backlinkCount = backlinks
  `;

  await client.query(cypher, { titles: normalizedTitles });
}

/**
 * Get all notes linked from a source note.
 *
 * @param client - Neo4j HTTP client
 * @param noteId - Source note ID
 * @returns Array of linked note IDs and titles
 */
export async function getOutgoingLinks(
  client: Neo4jHTTPClient,
  noteId: string
): Promise<Array<{ id: string; title: string; isStub: boolean }>> {
  const cypher = `
    MATCH (source:Note {id: $noteId})-[:LINKS_TO]->(target:Note)
    RETURN target.id AS id, target.title AS title, target.isStub AS isStub
    ORDER BY target.title
  `;

  try {
    const result = await client.query(cypher, { noteId });

    if (!result.data?.values?.length) {
      return [];
    }

    const fields = result.data.fields;
    const idIndex = fields.indexOf('id');
    const titleIndex = fields.indexOf('title');
    const stubIndex = fields.indexOf('isStub');

    return result.data.values.map((row) => ({
      id: row[idIndex] as string,
      title: row[titleIndex] as string,
      isStub: row[stubIndex] as boolean,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get outgoing links: ${message}`);
  }
}

/**
 * Process note update: remove stale links, then resolve current links.
 * Convenience function for the common update workflow.
 *
 * @param client - Neo4j HTTP client
 * @param noteId - Note being updated
 * @param newContent - New content to parse and link
 * @returns Resolution result
 */
export async function updateNoteLinks(
  client: Neo4jHTTPClient,
  noteId: string,
  newContent: string
): Promise<ResolveResult> {
  const wikilinks = extractWikilinks(newContent);
  const currentTargets = wikilinks.map((w) => w.normalizedTarget);

  // Remove links that no longer exist in content
  await removeStaleLinks(client, noteId, currentTargets);

  // Resolve current links (creates new ones, MERGE handles existing)
  return resolveWikilinks(client, noteId, newContent);
}
