/**
 * Attendee Context Builder
 *
 * Builds rich context about meeting attendees including
 * recent interactions, relationship strength, and talking points.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { AttendeeContext } from './types';

/**
 * Build context for a single attendee
 */
export async function buildAttendeeContext(
  client: Neo4jHTTPClient,
  attendeeEmail: string,
  lookbackDays = 30
): Promise<AttendeeContext | null> {
  // Find contact in graph
  const contactQuery = `
    MATCH (c:Contact)
    WHERE toLower(c.email) = toLower($email)
    OR toLower(c.primaryEmail) = toLower($email)
    RETURN c
    LIMIT 1
  `;

  const contactResult = await client.query(contactQuery, { email: attendeeEmail });

  if (contactResult.records.length === 0) {
    // Return minimal context for unknown attendee
    return {
      id: '',
      name: attendeeEmail.split('@')[0] ?? attendeeEmail,
      email: attendeeEmail,
      recentInteractions: 0,
      relationshipStrength: 0.1,
      talkingPoints: [],
    };
  }

  const contactNode = contactResult.records[0].get('c') as { properties: Record<string, unknown> } | null;
  const contact = contactNode?.properties ?? {};

  // Get recent interactions count
  const interactionsQuery = `
    MATCH (c:Contact {id: $contactId})-[r]-(n)
    WHERE r.createdAt > datetime() - duration({days: $lookbackDays})
    RETURN count(r) as interactions,
           max(r.createdAt) as lastInteraction
  `;

  const interactionsResult = await client.query(interactionsQuery, {
    contactId: contact.id,
    lookbackDays,
  });

  const interactions =
    (interactionsResult.records[0]?.get('interactions') as number) ?? 0;
  const lastInteraction =
    interactionsResult.records[0]?.get('lastInteraction')?.toString() ?? undefined;

  // Get recent email threads
  const emailQuery = `
    MATCH (c:Contact {id: $contactId})-[:SENT|RECEIVED]-(e:Email)
    WHERE e.date > datetime() - duration({days: $lookbackDays})
    RETURN e.subject as subject, e.date as date
    ORDER BY e.date DESC
    LIMIT 5
  `;

  const emailResult = await client.query(emailQuery, {
    contactId: contact.id,
    lookbackDays,
  });

  // Get shared meetings
  const meetingsQuery = `
    MATCH (c:Contact {id: $contactId})-[:ATTENDED]-(e:Event)
    WHERE e.startTime > datetime() - duration({days: $lookbackDays})
    RETURN e.title as title, e.startTime as date
    ORDER BY e.startTime DESC
    LIMIT 5
  `;

  const meetingsResult = await client.query(meetingsQuery, {
    contactId: contact.id,
    lookbackDays,
  });

  // Extract talking points from notes mentioning this contact
  const notesQuery = `
    MATCH (n:Note)-[:LINKS_TO]->(c:Contact {id: $contactId})
    WHERE n.createdAt > datetime() - duration({days: $lookbackDays})
    RETURN n.title as noteTitle, n.content as content
    ORDER BY n.createdAt DESC
    LIMIT 3
  `;

  const notesResult = await client.query(notesQuery, {
    contactId: contact.id,
    lookbackDays,
  });

  // Build talking points
  const talkingPoints: string[] = [];

  // From recent emails
  for (const r of emailResult.records.slice(0, 2)) {
    talkingPoints.push(`Recent email: ${r.get('subject')}`);
  }

  // From recent meetings
  for (const r of meetingsResult.records.slice(0, 2)) {
    talkingPoints.push(`Attended: ${r.get('title')}`);
  }

  // From notes
  for (const r of notesResult.records.slice(0, 1)) {
    talkingPoints.push(`Note: ${r.get('noteTitle')}`);
  }

  // Calculate relationship strength (0-1)
  const relationshipStrength = calculateRelationshipStrength(
    interactions,
    emailResult.records.length,
    meetingsResult.records.length
  );

  return {
    id: (contact.id as string) ?? '',
    name: ((contact.displayName ?? contact.name) as string) || attendeeEmail,
    email: attendeeEmail,
    role: contact.jobTitle as string | undefined,
    company: (contact.organization ?? contact.company) as string | undefined,
    recentInteractions: interactions,
    lastInteractionDate: lastInteraction,
    relationshipStrength,
    talkingPoints,
  };
}

/**
 * Build context for multiple attendees
 */
export async function buildAttendeesContext(
  client: Neo4jHTTPClient,
  attendeeEmails: string[],
  lookbackDays = 30
): Promise<AttendeeContext[]> {
  const contexts: AttendeeContext[] = [];

  for (const email of attendeeEmails) {
    const context = await buildAttendeeContext(client, email, lookbackDays);
    if (context) {
      contexts.push(context);
    }
  }

  // Sort by relationship strength (strongest first)
  contexts.sort((a, b) => b.relationshipStrength - a.relationshipStrength);

  return contexts;
}

/**
 * Calculate relationship strength based on interaction metrics
 */
function calculateRelationshipStrength(
  totalInteractions: number,
  emailCount: number,
  meetingCount: number
): number {
  // Base score from total interactions
  let score = Math.min(totalInteractions / 20, 0.4); // Max 0.4 from interactions

  // Bonus for emails (communication)
  score += Math.min(emailCount / 10, 0.3); // Max 0.3 from emails

  // Bonus for meetings (face time)
  score += Math.min(meetingCount / 5, 0.3); // Max 0.3 from meetings

  return Math.min(score, 1.0);
}

/**
 * Get top collaborators for context
 */
export async function getTopCollaborators(
  client: Neo4jHTTPClient,
  limit = 5,
  lookbackDays = 30
): Promise<{ name: string; email: string; strength: number }[]> {
  const query = `
    MATCH (c:Contact)-[r]-(n)
    WHERE r.createdAt > datetime() - duration({days: $lookbackDays})
    WITH c, count(r) as interactions
    ORDER BY interactions DESC
    LIMIT $limit
    RETURN c.name as name, c.email as email, interactions
  `;

  const result = await client.query(query, { lookbackDays, limit });

  return result.records.map((r) => ({
    name: r.get('name') as string,
    email: r.get('email') as string,
    strength: Math.min((r.get('interactions') as number) / 20, 1.0),
  }));
}
