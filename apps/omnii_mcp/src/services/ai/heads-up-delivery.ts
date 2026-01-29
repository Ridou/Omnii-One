/**
 * Heads-Up Delivery
 *
 * Delivers meeting briefings via configured channels
 * (push notification, in-app, email).
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { MeetingBriefing } from './types';
import type { HeadsUpPreferences } from './heads-up-scheduler';
import { nanoid } from 'nanoid';

/**
 * Delivery result
 */
export interface DeliveryResult {
  success: boolean;
  channel: 'push' | 'in_app' | 'email';
  deliveredAt: string;
  notificationId?: string;
  error?: string;
}

/**
 * In-app notification record
 */
export interface InAppNotification {
  id: string;
  userId: string;
  type: 'heads_up';
  title: string;
  body: string;
  data: {
    eventId: string;
    briefingId?: string;
  };
  read: boolean;
  createdAt: string;
  expiresAt: string;
}

/**
 * Rate limit tracking (in-memory, would use Redis in production)
 */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // Max 5 heads-ups per hour

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userDeliveries = rateLimitMap.get(userId) ?? [];

  // Filter to last hour
  const recentDeliveries = userDeliveries.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  // Update map
  rateLimitMap.set(userId, recentDeliveries);

  return recentDeliveries.length < RATE_LIMIT_MAX;
}

/**
 * Record delivery for rate limiting
 */
function recordDelivery(userId: string): void {
  const now = Date.now();
  const userDeliveries = rateLimitMap.get(userId) ?? [];
  userDeliveries.push(now);
  rateLimitMap.set(userId, userDeliveries);
}

/**
 * Deliver briefing via appropriate channel
 */
export async function deliverBriefing(
  client: Neo4jHTTPClient,
  userId: string,
  briefing: MeetingBriefing,
  preferences: HeadsUpPreferences
): Promise<DeliveryResult> {
  // Check rate limit
  if (!checkRateLimit(userId)) {
    return {
      success: false,
      channel: preferences.deliveryChannel,
      deliveredAt: new Date().toISOString(),
      error: 'Rate limit exceeded (max 5 per hour)',
    };
  }

  let result: DeliveryResult;

  switch (preferences.deliveryChannel) {
    case 'push':
      result = await deliverViaPush(userId, briefing);
      break;
    case 'email':
      result = await deliverViaEmail(userId, briefing);
      break;
    case 'in_app':
    default:
      result = await deliverViaInApp(client, userId, briefing);
      break;
  }

  if (result.success) {
    recordDelivery(userId);
  }

  return result;
}

/**
 * Deliver via push notification
 */
async function deliverViaPush(
  userId: string,
  briefing: MeetingBriefing
): Promise<DeliveryResult> {
  // In production, this would call Expo push notification service
  // For now, simulate success

  const title = `Heads Up: ${briefing.title}`;
  const body = briefing.aiSummary.slice(0, 100);

  // Would call: await sendPushNotification(userId, title, body, { eventId: briefing.eventId })

  return {
    success: true,
    channel: 'push',
    deliveredAt: new Date().toISOString(),
    notificationId: nanoid(),
  };
}

/**
 * Deliver via email
 */
async function deliverViaEmail(
  userId: string,
  briefing: MeetingBriefing
): Promise<DeliveryResult> {
  // In production, this would send email via SendGrid/SES
  // For now, simulate success

  // Would call: await sendEmail(userEmail, subject, htmlBody)

  return {
    success: true,
    channel: 'email',
    deliveredAt: new Date().toISOString(),
    notificationId: nanoid(),
  };
}

/**
 * Deliver via in-app notification (stored in database)
 */
async function deliverViaInApp(
  client: Neo4jHTTPClient,
  userId: string,
  briefing: MeetingBriefing
): Promise<DeliveryResult> {
  const notification: InAppNotification = {
    id: nanoid(),
    userId,
    type: 'heads_up',
    title: `Heads Up: ${briefing.title}`,
    body: briefing.aiSummary,
    data: {
      eventId: briefing.eventId,
    },
    read: false,
    createdAt: new Date().toISOString(),
    expiresAt: briefing.expiresAt,
  };

  // Store in Neo4j
  const query = `
    CREATE (n:Notification {
      id: $id,
      userId: $userId,
      type: $type,
      title: $title,
      body: $body,
      eventId: $eventId,
      read: $read,
      createdAt: datetime($createdAt),
      expiresAt: datetime($expiresAt)
    })
    RETURN n
  `;

  try {
    await client.query(query, {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      eventId: notification.data.eventId,
      read: notification.read,
      createdAt: notification.createdAt,
      expiresAt: notification.expiresAt,
    });

    return {
      success: true,
      channel: 'in_app',
      deliveredAt: new Date().toISOString(),
      notificationId: notification.id,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'in_app',
      deliveredAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to store notification',
    };
  }
}

/**
 * Get unread notifications for user
 */
export async function getUnreadNotifications(
  client: Neo4jHTTPClient,
  userId: string,
  limit = 20
): Promise<InAppNotification[]> {
  const query = `
    MATCH (n:Notification)
    WHERE n.userId = $userId
    AND n.read = false
    AND n.expiresAt > datetime()
    RETURN n
    ORDER BY n.createdAt DESC
    LIMIT $limit
  `;

  const result = await client.query(query, { userId, limit });

  return result.records.map((r) => {
    const node = r.get('n') as { properties: Record<string, unknown> } | null;
    const n = node?.properties ?? {};
    return {
      id: n.id as string,
      userId: n.userId as string,
      type: 'heads_up' as const,
      title: n.title as string,
      body: n.body as string,
      data: { eventId: n.eventId as string },
      read: n.read as boolean,
      createdAt: String(n.createdAt),
      expiresAt: String(n.expiresAt),
    };
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(
  client: Neo4jHTTPClient,
  notificationId: string
): Promise<void> {
  const query = `
    MATCH (n:Notification {id: $notificationId})
    SET n.read = true, n.readAt = datetime()
  `;

  await client.query(query, { notificationId });
}

/**
 * Clean up expired notifications
 */
export async function cleanupExpiredNotifications(
  client: Neo4jHTTPClient
): Promise<number> {
  const query = `
    MATCH (n:Notification)
    WHERE n.expiresAt < datetime()
    DELETE n
    RETURN count(n) as deleted
  `;

  const result = await client.query(query, {});
  return (result.records[0]?.get('deleted') as number) ?? 0;
}
