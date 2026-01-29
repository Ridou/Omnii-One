/**
 * Backlinks Query
 *
 * Queries for notes that link TO a given target note.
 * Uses Neo4j's efficient reverse relationship traversal.
 *
 * Key insight: MATCH (other)-[:LINKS_TO]->(target) is as fast
 * as forward traversal, no need for duplicate relationships.
 */

import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import type { BacklinkResult, BacklinksData } from '../types';

/**
 * Get backlinks for a note.
 *
 * Returns notes that contain [[wikilinks]] pointing to the target.
 * Includes preview text around the link for context.
 *
 * @param client - Neo4j HTTP client
 * @param targetNoteId - Note ID to find backlinks for
 * @param limit - Max results (default 50)
 * @param offset - Pagination offset
 * @returns Backlinks data with results and count
 */
export async function getBacklinks(
  client: Neo4jHTTPClient,
  targetNoteId: string,
  limit: number = 50,
  offset: number = 0
): Promise<BacklinksData> {
  // First get total count
  const countCypher = `
    MATCH (other:Note)-[:LINKS_TO]->(target:Note {id: $targetId})
    WHERE other.isStub = false
    RETURN count(other) AS total, target.title AS targetTitle
  `;

  // Then get paginated results with preview
  const resultsCypher = `
    MATCH (other:Note)-[:LINKS_TO]->(target:Note {id: $targetId})
    WHERE other.isStub = false

    // Extract preview: first 150 chars or content around wikilink
    WITH other, target,
      CASE
        WHEN size(other.content) <= 150 THEN other.content
        ELSE substring(other.content, 0, 150) + '...'
      END AS preview

    RETURN other.id AS noteId,
           other.title AS title,
           preview,
           toString(other.updatedAt) AS updatedAt
    ORDER BY other.updatedAt DESC
    SKIP $offset
    LIMIT $limit
  `;

  try {
    // Get count
    const countResult = await client.query(countCypher, { targetId: targetNoteId });

    let totalCount = 0;
    let targetTitle = '';
    if (countResult.data?.values?.length) {
      const fields = countResult.data.fields;
      const totalIndex = fields.indexOf('total');
      const titleIndex = fields.indexOf('targetTitle');
      totalCount = countResult.data.values[0][totalIndex] as number;
      targetTitle = countResult.data.values[0][titleIndex] as string;
    }

    // Get results
    const resultsResult = await client.query(resultsCypher, {
      targetId: targetNoteId,
      limit,
      offset,
    });

    const backlinks: BacklinkResult[] = [];
    if (resultsResult.data?.values?.length) {
      const fields = resultsResult.data.fields;
      const noteIdIndex = fields.indexOf('noteId');
      const titleIndex = fields.indexOf('title');
      const previewIndex = fields.indexOf('preview');
      const updatedAtIndex = fields.indexOf('updatedAt');

      for (const row of resultsResult.data.values) {
        backlinks.push({
          noteId: row[noteIdIndex] as string,
          title: row[titleIndex] as string,
          preview: row[previewIndex] as string,
          updatedAt: row[updatedAtIndex] as string,
        });
      }
    }

    return {
      targetId: targetNoteId,
      targetTitle,
      backlinks,
      totalCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get backlinks: ${message}`);
  }
}

/**
 * Get backlink count for a note.
 * Fast count query without fetching full backlink data.
 *
 * @param client - Neo4j HTTP client
 * @param targetNoteId - Note ID
 * @returns Number of backlinks
 */
export async function getBacklinkCount(
  client: Neo4jHTTPClient,
  targetNoteId: string
): Promise<number> {
  const cypher = `
    MATCH (other:Note)-[:LINKS_TO]->(target:Note {id: $targetId})
    WHERE other.isStub = false
    RETURN count(other) AS count
  `;

  try {
    const result = await client.query(cypher, { targetId: targetNoteId });

    if (!result.data?.values?.length) {
      return 0;
    }

    const fields = result.data.fields;
    const countIndex = fields.indexOf('count');
    return result.data.values[0][countIndex] as number;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get backlink count: ${message}`);
  }
}

/**
 * Get backlinks for an entity node (not just notes).
 * Allows notes to link to Person, Organization, etc.
 *
 * @param client - Neo4j HTTP client
 * @param entityId - Entity node ID
 * @param limit - Max results
 * @returns Backlinks data
 */
export async function getBacklinksForEntity(
  client: Neo4jHTTPClient,
  entityId: string,
  limit: number = 50
): Promise<BacklinksData> {
  const cypher = `
    MATCH (note:Note)-[:MENTIONS|LINKS_TO]->(entity {id: $entityId})
    WHERE note.isStub = false

    WITH note, entity,
      CASE
        WHEN size(note.content) <= 150 THEN note.content
        ELSE substring(note.content, 0, 150) + '...'
      END AS preview

    RETURN note.id AS noteId,
           note.title AS title,
           preview,
           toString(note.updatedAt) AS updatedAt,
           labels(entity)[0] AS entityType,
           entity.name AS entityName
    ORDER BY note.updatedAt DESC
    LIMIT $limit
  `;

  try {
    const result = await client.query(cypher, { entityId, limit });

    const backlinks: BacklinkResult[] = [];
    let targetTitle = '';

    if (result.data?.values?.length) {
      const fields = result.data.fields;
      const noteIdIndex = fields.indexOf('noteId');
      const titleIndex = fields.indexOf('title');
      const previewIndex = fields.indexOf('preview');
      const updatedAtIndex = fields.indexOf('updatedAt');
      const entityNameIndex = fields.indexOf('entityName');

      for (const row of result.data.values) {
        backlinks.push({
          noteId: row[noteIdIndex] as string,
          title: row[titleIndex] as string,
          preview: row[previewIndex] as string,
          updatedAt: row[updatedAtIndex] as string,
        });
      }

      // Use entity name as target title
      targetTitle = result.data.values[0][entityNameIndex] as string;
    }

    return {
      targetId: entityId,
      targetTitle,
      backlinks,
      totalCount: backlinks.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get entity backlinks: ${message}`);
  }
}

/**
 * Get notes with most backlinks (popular/hub notes).
 *
 * @param client - Neo4j HTTP client
 * @param limit - Max results
 * @returns Notes sorted by backlink count
 */
export async function getMostLinkedNotes(
  client: Neo4jHTTPClient,
  limit: number = 10
): Promise<Array<{ id: string; title: string; backlinkCount: number }>> {
  const cypher = `
    MATCH (n:Note)
    WHERE n.isStub = false AND n.backlinkCount > 0
    RETURN n.id AS id, n.title AS title, n.backlinkCount AS backlinkCount
    ORDER BY n.backlinkCount DESC
    LIMIT $limit
  `;

  try {
    const result = await client.query(cypher, { limit });

    if (!result.data?.values?.length) {
      return [];
    }

    const fields = result.data.fields;
    const idIndex = fields.indexOf('id');
    const titleIndex = fields.indexOf('title');
    const countIndex = fields.indexOf('backlinkCount');

    return result.data.values.map((row) => ({
      id: row[idIndex] as string,
      title: row[titleIndex] as string,
      backlinkCount: row[countIndex] as number,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get most linked notes: ${message}`);
  }
}
