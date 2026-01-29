/**
 * Heads-Up Scheduler
 *
 * Schedules and manages "Heads Up" briefing deliveries
 * before calendar events.
 */

import { Queue, type JobsOptions } from 'bullmq';
import type { Neo4jHTTPClient } from '../neo4j/http-client';

// Queue name for heads-up jobs
const QUEUE_NAME = 'heads-up-queue';

// Default lead time before events (in minutes)
const DEFAULT_LEAD_TIME_SHORT = 15; // For meetings < 30 min
const DEFAULT_LEAD_TIME_LONG = 30; // For meetings >= 30 min

/**
 * Heads-up job data
 */
export interface HeadsUpJobData {
  eventId: string;
  userId: string;
  eventTitle: string;
  eventStartTime: string;
  leadTimeMinutes: number;
  attemptNumber: number;
}

/**
 * User preferences for heads-up
 */
export interface HeadsUpPreferences {
  enabled: boolean;
  leadTimeMinutes: number;
  minMeetingDurationMinutes: number;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;
  deliveryChannel: 'push' | 'in_app' | 'email';
}

const DEFAULT_PREFERENCES: HeadsUpPreferences = {
  enabled: true,
  leadTimeMinutes: 30,
  minMeetingDurationMinutes: 15,
  deliveryChannel: 'in_app',
};

/**
 * Create heads-up queue
 */
export function createHeadsUpQueue(redisConnection: {
  host: string;
  port: number;
}): Queue<HeadsUpJobData> {
  return new Queue<HeadsUpJobData>(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  });
}

/**
 * Calculate when to deliver heads-up
 */
function calculateDeliveryTime(
  eventStartTime: Date,
  leadTimeMinutes: number
): Date {
  return new Date(eventStartTime.getTime() - leadTimeMinutes * 60 * 1000);
}

/**
 * Check if event qualifies for heads-up
 */
export function shouldScheduleHeadsUp(
  event: {
    startTime: Date;
    endTime: Date;
    attendeeCount: number;
    isAllDay?: boolean;
    isCancelled?: boolean;
  },
  preferences: HeadsUpPreferences = DEFAULT_PREFERENCES
): boolean {
  // Must be enabled
  if (!preferences.enabled) return false;

  // Skip cancelled events
  if (event.isCancelled) return false;

  // Skip all-day events (not meetings)
  if (event.isAllDay) return false;

  // Must have attendees (it's a meeting)
  if (event.attendeeCount < 2) return false;

  // Check minimum duration
  const durationMinutes =
    (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
  if (durationMinutes < preferences.minMeetingDurationMinutes) return false;

  // Must be in the future
  const now = new Date();
  if (event.startTime <= now) return false;

  // Must be within 7 days
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (event.startTime.getTime() - now.getTime() > sevenDays) return false;

  return true;
}

/**
 * Check if current time is in quiet hours
 */
function isQuietHours(
  preferences: HeadsUpPreferences,
  checkTime: Date = new Date()
): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
    return false;
  }

  const [startH, startM] = preferences.quietHoursStart.split(':').map(Number);
  const [endH, endM] = preferences.quietHoursEnd.split(':').map(Number);

  const currentMinutes = checkTime.getHours() * 60 + checkTime.getMinutes();
  const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Schedule heads-up for an event
 */
export async function scheduleHeadsUp(
  queue: Queue<HeadsUpJobData>,
  event: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    attendeeCount: number;
  },
  userId: string,
  preferences: HeadsUpPreferences = DEFAULT_PREFERENCES
): Promise<string | null> {
  // Check if should schedule
  if (
    !shouldScheduleHeadsUp(
      {
        startTime: event.startTime,
        endTime: event.endTime,
        attendeeCount: event.attendeeCount,
      },
      preferences
    )
  ) {
    return null;
  }

  // Calculate lead time based on meeting duration
  const durationMinutes =
    (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
  const leadTime =
    durationMinutes < 30 ? DEFAULT_LEAD_TIME_SHORT : preferences.leadTimeMinutes;

  // Calculate delivery time
  const deliveryTime = calculateDeliveryTime(event.startTime, leadTime);

  // Skip if delivery time is in the past
  if (deliveryTime <= new Date()) {
    return null;
  }

  // Skip if delivery time is in quiet hours
  if (isQuietHours(preferences, deliveryTime)) {
    return null;
  }

  // Calculate delay until delivery
  const delay = deliveryTime.getTime() - Date.now();

  // Create job
  const jobData: HeadsUpJobData = {
    eventId: event.id,
    userId,
    eventTitle: event.title,
    eventStartTime: event.startTime.toISOString(),
    leadTimeMinutes: leadTime,
    attemptNumber: 1,
  };

  const jobOptions: JobsOptions = {
    delay,
    jobId: `headsup-${event.id}`, // Prevent duplicates
  };

  const job = await queue.add('deliver-briefing', jobData, jobOptions);

  return job.id ?? null;
}

/**
 * Reschedule heads-up when event is updated
 */
export async function rescheduleHeadsUp(
  queue: Queue<HeadsUpJobData>,
  event: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    attendeeCount: number;
  },
  userId: string,
  preferences: HeadsUpPreferences = DEFAULT_PREFERENCES
): Promise<string | null> {
  // Cancel existing job
  await cancelHeadsUp(queue, event.id);

  // Schedule new one
  return scheduleHeadsUp(queue, event, userId, preferences);
}

/**
 * Cancel heads-up for an event
 */
export async function cancelHeadsUp(
  queue: Queue<HeadsUpJobData>,
  eventId: string
): Promise<boolean> {
  const jobId = `headsup-${eventId}`;
  const job = await queue.getJob(jobId);

  if (job) {
    await job.remove();
    return true;
  }

  return false;
}

/**
 * Get pending heads-up jobs for user
 */
export async function getPendingHeadsUps(
  queue: Queue<HeadsUpJobData>,
  userId: string
): Promise<HeadsUpJobData[]> {
  const delayed = await queue.getDelayed();

  return delayed
    .filter((job) => job.data.userId === userId)
    .map((job) => job.data);
}

/**
 * Get user preferences from storage
 */
export async function getHeadsUpPreferences(
  client: Neo4jHTTPClient,
  userId: string
): Promise<HeadsUpPreferences> {
  // In production, this would query Supabase user_preferences table
  // For now, return defaults
  return DEFAULT_PREFERENCES;
}

/**
 * Save user preferences
 */
export async function saveHeadsUpPreferences(
  client: Neo4jHTTPClient,
  userId: string,
  preferences: Partial<HeadsUpPreferences>
): Promise<void> {
  // In production, this would update Supabase user_preferences table
  // For now, no-op
}
