/**
 * Meeting Briefing Generator
 *
 * Orchestrates context aggregation to produce comprehensive
 * meeting briefings with AI-powered summaries.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type {
  MeetingBriefing,
  EventSummary,
  EmailSummary,
  ActionItem,
} from './types';
import { buildAttendeesContext } from './attendee-context';
import { findRelevantDocuments, getDocumentKeyPoints } from './document-relevance';
import { nanoid } from 'nanoid';

// OpenAI for AI summary generation
const OPENAI_API_KEY = process.env.OMNII_OPENAI_API_KEY;

/**
 * Generate complete meeting briefing
 */
export async function generateBriefing(
  client: Neo4jHTTPClient,
  eventId: string
): Promise<MeetingBriefing | null> {
  // Fetch event details
  const eventQuery = `
    MATCH (e:Event {id: $eventId})
    RETURN e
  `;

  const eventResult = await client.query(eventQuery, { eventId });

  if (eventResult.records.length === 0) {
    return null;
  }

  const eventNode = eventResult.records[0].get('e') as { properties: Record<string, unknown> } | null;
  const event = eventNode?.properties ?? {};
  const startTime = new Date(String(event.startTime ?? new Date()));
  const endTime = new Date(String(event.endTime ?? new Date()));
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

  // Get attendee emails
  const attendeesQuery = `
    MATCH (e:Event {id: $eventId})-[:HAS_ATTENDEE]->(a)
    RETURN a.email as email
  `;

  const attendeesResult = await client.query(attendeesQuery, { eventId });
  const attendeeEmails = attendeesResult.records.map(
    (r) => r.get('email') as string
  );

  // Build attendee context
  const attendees = await buildAttendeesContext(client, attendeeEmails);

  // Find relevant documents
  const relatedDocuments = await findRelevantDocuments(client, {
    title: (event.title as string) ?? '',
    description: event.description as string | undefined,
    attendeeIds: attendees.map((a) => a.id).filter((id) => id),
    startTime,
  });

  // Enrich documents with key points
  for (const doc of relatedDocuments) {
    doc.keyPoints = await getDocumentKeyPoints(client, doc.id);
  }

  // Get previous meetings with same attendees
  const previousMeetings = await getPreviousMeetings(
    client,
    attendeeEmails,
    eventId,
    3
  );

  // Get related email threads
  const relatedEmails = await getRelatedEmails(client, attendeeEmails, 5);

  // Generate suggested actions
  const suggestedActions = await generateSuggestedActions(
    event,
    attendees,
    relatedDocuments,
    previousMeetings
  );

  // Generate AI summary
  const aiSummary = await generateAISummary({
    event,
    attendees,
    documents: relatedDocuments,
    previousMeetings,
    emails: relatedEmails,
  });

  const briefing: MeetingBriefing = {
    eventId,
    title: (event.title as string) ?? 'Meeting',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration,
    attendees,
    relatedDocuments,
    previousMeetings,
    relatedEmails,
    suggestedActions,
    aiSummary,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
  };

  return briefing;
}

/**
 * Get previous meetings with overlapping attendees
 */
async function getPreviousMeetings(
  client: Neo4jHTTPClient,
  attendeeEmails: string[],
  excludeEventId: string,
  limit: number
): Promise<EventSummary[]> {
  const query = `
    MATCH (e:Event)-[:HAS_ATTENDEE]->(a)
    WHERE e.id <> $excludeEventId
    AND a.email IN $emails
    AND e.endTime < datetime()
    WITH e, count(DISTINCT a) as attendeeOverlap
    WHERE attendeeOverlap >= 2
    RETURN e.id as id, e.title as title, e.startTime as date, attendeeOverlap
    ORDER BY e.startTime DESC
    LIMIT $limit
  `;

  const result = await client.query(query, {
    excludeEventId,
    emails: attendeeEmails,
    limit,
  });

  return result.records.map((r) => ({
    id: r.get('id') as string,
    title: r.get('title') as string,
    date: r.get('date')?.toString() ?? '',
    attendeeOverlap: r.get('attendeeOverlap') as number,
  }));
}

/**
 * Get related email threads
 */
async function getRelatedEmails(
  client: Neo4jHTTPClient,
  attendeeEmails: string[],
  limit: number
): Promise<EmailSummary[]> {
  const query = `
    MATCH (e:Email)-[:SENT_BY|RECEIVED_BY]->(c:Contact)
    WHERE c.email IN $emails
    AND e.date > datetime() - duration({days: 14})
    WITH e.threadId as threadId,
         collect(DISTINCT e.subject)[0] as subject,
         collect(DISTINCT c.name) as participants,
         max(e.date) as lastDate,
         count(e) as messageCount
    RETURN threadId, subject, participants, lastDate, messageCount
    ORDER BY lastDate DESC
    LIMIT $limit
  `;

  const result = await client.query(query, { emails: attendeeEmails, limit });

  return result.records.map((r) => ({
    threadId: r.get('threadId') as string,
    subject: r.get('subject') as string,
    participants: r.get('participants') as string[],
    lastMessageDate: r.get('lastDate')?.toString() ?? '',
    messageCount: r.get('messageCount') as number,
    keyTopics: [], // Would need NLP to extract
  }));
}

/**
 * Generate suggested action items
 */
async function generateSuggestedActions(
  event: Record<string, unknown>,
  attendees: { name: string; relationshipStrength: number }[],
  documents: { title: string; relevanceScore: number }[],
  previousMeetings: { title: string }[]
): Promise<ActionItem[]> {
  const actions: ActionItem[] = [];

  // Suggest reviewing high-relevance documents
  for (const doc of documents.filter((d) => d.relevanceScore > 0.7).slice(0, 2)) {
    actions.push({
      id: nanoid(),
      type: 'review_document',
      description: `Review "${doc.title}" before the meeting`,
      priority: 'medium',
      completed: false,
      relatedEntityId: doc.title, // Would be doc.id in real implementation
    });
  }

  // Suggest preparing for attendees with low relationship
  const newAttendees = attendees.filter((a) => a.relationshipStrength < 0.3);
  if (newAttendees.length > 0) {
    actions.push({
      id: nanoid(),
      type: 'prepare_topic',
      description: `Research background on ${newAttendees[0]?.name ?? 'new attendee'}`,
      priority: 'low',
      completed: false,
    });
  }

  // Suggest follow-up from previous meetings
  if (previousMeetings.length > 0) {
    actions.push({
      id: nanoid(),
      type: 'follow_up',
      description: `Review outcomes from "${previousMeetings[0]?.title}"`,
      priority: 'medium',
      completed: false,
    });
  }

  return actions;
}

/**
 * Generate AI-powered summary using OpenAI
 */
async function generateAISummary(context: {
  event: Record<string, unknown>;
  attendees: { name: string; talkingPoints: string[] }[];
  documents: { title: string }[];
  previousMeetings: { title: string }[];
  emails: { subject: string }[];
}): Promise<string> {
  if (!OPENAI_API_KEY) {
    // Fallback to basic summary
    return generateBasicSummary(context);
  }

  try {
    const prompt = `Generate a brief meeting preparation summary (2-3 sentences) for:
Meeting: ${context.event.title}
Attendees: ${context.attendees.map((a) => a.name).join(', ')}
Related docs: ${context.documents.map((d) => d.title).join(', ') || 'None'}
Previous meetings: ${context.previousMeetings.map((m) => m.title).join(', ') || 'None'}
Recent emails: ${context.emails.map((e) => e.subject).join(', ') || 'None'}

Focus on key preparation points and what to expect.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return generateBasicSummary(context);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? generateBasicSummary(context);
  } catch {
    return generateBasicSummary(context);
  }
}

/**
 * Generate basic summary without AI
 */
function generateBasicSummary(context: {
  event: Record<string, unknown>;
  attendees: { name: string }[];
  documents: { title: string }[];
  previousMeetings: { title: string }[];
}): string {
  const parts: string[] = [];

  parts.push(`Meeting with ${context.attendees.length} attendee(s).`);

  if (context.documents.length > 0) {
    parts.push(`${context.documents.length} related document(s) to review.`);
  }

  if (context.previousMeetings.length > 0) {
    parts.push(`Follow-up from ${context.previousMeetings.length} previous meeting(s).`);
  }

  return parts.join(' ');
}
