/**
 * Document Relevance Finder
 *
 * Finds and ranks documents relevant to a meeting
 * based on content, participants, and timing.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { DocumentSummary } from './types';

/**
 * Find documents relevant to an event
 */
export async function findRelevantDocuments(
  client: Neo4jHTTPClient,
  eventContext: {
    title: string;
    description?: string;
    attendeeIds: string[];
    startTime: Date;
  },
  limit = 5
): Promise<DocumentSummary[]> {
  const documents: DocumentSummary[] = [];

  // Strategy 1: Title/description keyword match
  const keywords = extractKeywords(
    `${eventContext.title} ${eventContext.description ?? ''}`
  );

  if (keywords.length > 0) {
    const keywordQuery = `
      MATCH (d:Document)
      WHERE any(keyword IN $keywords WHERE
        toLower(d.title) CONTAINS toLower(keyword)
        OR toLower(d.content) CONTAINS toLower(keyword)
      )
      AND d.createdAt > datetime() - duration({days: 90})
      RETURN d.id as id, d.title as title, d.mimeType as type,
             d.createdAt as uploadedAt
      ORDER BY d.createdAt DESC
      LIMIT $limit
    `;

    const keywordResult = await client.query(keywordQuery, {
      keywords,
      limit: Math.ceil(limit / 2),
    });

    for (const r of keywordResult.records) {
      documents.push({
        id: r.get('id') as string,
        title: r.get('title') as string,
        type: simplifyMimeType(r.get('type') as string),
        relevanceScore: 0.8,
        keyPoints: [],
        uploadedAt: r.get('uploadedAt')?.toString() ?? '',
      });
    }
  }

  // Strategy 2: Documents authored by attendees
  if (eventContext.attendeeIds.length > 0) {
    const attendeeQuery = `
      MATCH (c:Contact)-[:AUTHORED|UPLOADED]->(d:Document)
      WHERE c.id IN $attendeeIds
      AND d.createdAt > datetime() - duration({days: 30})
      RETURN d.id as id, d.title as title, d.mimeType as type,
             d.createdAt as uploadedAt, c.name as author
      ORDER BY d.createdAt DESC
      LIMIT $limit
    `;

    const attendeeResult = await client.query(attendeeQuery, {
      attendeeIds: eventContext.attendeeIds,
      limit: Math.ceil(limit / 2),
    });

    for (const r of attendeeResult.records) {
      const docId = r.get('id') as string;
      // Avoid duplicates
      if (!documents.find((d) => d.id === docId)) {
        documents.push({
          id: docId,
          title: r.get('title') as string,
          type: simplifyMimeType(r.get('type') as string),
          relevanceScore: 0.7,
          keyPoints: [`By ${r.get('author')}`],
          uploadedAt: r.get('uploadedAt')?.toString() ?? '',
        });
      }
    }
  }

  // Strategy 3: Recent uploads (temporal proximity)
  const recentQuery = `
    MATCH (d:Document)
    WHERE d.createdAt > datetime() - duration({days: 7})
    AND NOT d.id IN $existingIds
    RETURN d.id as id, d.title as title, d.mimeType as type,
           d.createdAt as uploadedAt
    ORDER BY d.createdAt DESC
    LIMIT $limit
  `;

  const recentResult = await client.query(recentQuery, {
    existingIds: documents.map((d) => d.id),
    limit: limit - documents.length,
  });

  for (const r of recentResult.records) {
    documents.push({
      id: r.get('id') as string,
      title: r.get('title') as string,
      type: simplifyMimeType(r.get('type') as string),
      relevanceScore: 0.5,
      keyPoints: ['Recent upload'],
      uploadedAt: r.get('uploadedAt')?.toString() ?? '',
    });
  }

  // Sort by relevance
  documents.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return documents.slice(0, limit);
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once',
    'meeting', 'call', 'sync', 'discussion', 'review',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  // Return unique keywords
  return [...new Set(words)].slice(0, 10);
}

/**
 * Simplify MIME type for display
 */
function simplifyMimeType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/msword': 'Word',
    'text/plain': 'Text',
    'text/markdown': 'Markdown',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.ms-excel': 'Excel',
  };

  return typeMap[mimeType] ?? mimeType.split('/').pop() ?? 'Document';
}

/**
 * Get document key points (from chunks)
 */
export async function getDocumentKeyPoints(
  client: Neo4jHTTPClient,
  documentId: string,
  maxPoints = 3
): Promise<string[]> {
  const query = `
    MATCH (d:Document {id: $documentId})-[:HAS_CHUNK]->(c:Chunk)
    WHERE c.isKeySection = true OR c.importance > 0.7
    RETURN c.content as content
    ORDER BY c.importance DESC
    LIMIT $maxPoints
  `;

  const result = await client.query(query, { documentId, maxPoints });

  return result.records.map((r) => {
    const content = r.get('content') as string;
    // Return first sentence or truncated content
    const firstSentence = content.split(/[.!?]/)[0];
    return firstSentence?.trim().slice(0, 100) ?? '';
  });
}
