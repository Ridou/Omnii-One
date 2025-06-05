/**
 * Composio Calendar Utility Functions
 *
 * Helper functions for calendar operations and data transformations
 */

import { CalendarEvent, EventDateTime } from "../types/composio-calendar.types";

/**
 * Validate event date/time format
 */
export function validateEventDateTime(dateTime: EventDateTime): boolean {
  if (!dateTime.dateTime && !dateTime.date) {
    return false;
  }

  // Validate ISO 8601 format for dateTime
  if (dateTime.dateTime) {
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return dateTimeRegex.test(dateTime.dateTime);
  }

  // Validate YYYY-MM-DD format for date
  if (dateTime.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(dateTime.date);
  }

  return false;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: any,
  defaultMessage: string = "An error occurred"
): { error: string; code?: string; details?: any } {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;

  return {
    error: errorMessage,
    code: error.code || "UNKNOWN_ERROR",
    details: process.env.NODE_ENV === "development" ? error.stack : undefined,
  };
}

/**
 * Format event time for display
 */
export function formatEventTime(event: CalendarEvent): string {
  const start = event.start.dateTime || event.start.date;
  const end = event.end.dateTime || event.end.date;

  if (!start || !end) {
    return "Invalid time";
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  // All-day event
  if (event.start.date && event.end.date) {
    return `${startDate.toDateString()}`;
  }

  // Timed event
  const startTime = startDate.toLocaleString();
  const endTime = endDate.toLocaleString();

  return `${startTime} - ${endTime}`;
}

/**
 * Generate calendar event summary for AI agents
 */
export function generateEventSummary(event: CalendarEvent): string {
  const timeStr = formatEventTime(event);
  const location = event.location ? ` at ${event.location}` : "";
  const attendees =
    event.attendees && event.attendees.length > 0
      ? ` with ${event.attendees.length} attendee(s)`
      : "";

  return `"${event.summary}" scheduled for ${timeStr}${location}${attendees}`;
}

/**
 * Validate email format for attendees
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse and validate event attendees
 */
export function validateAttendees(attendees: any[]): boolean {
  if (!Array.isArray(attendees)) {
    return false;
  }

  return attendees.every(
    (attendee) =>
      attendee.email &&
      validateEmail(attendee.email) &&
      (!attendee.responseStatus ||
        ["needsAction", "declined", "tentative", "accepted"].includes(
          attendee.responseStatus
        ))
  );
}

/**
 * Create default event data structure
 */
export function createDefaultEventData(
  summary: string,
  startTime: string,
  endTime: string,
  options: {
    description?: string;
    location?: string;
    attendees?: string[];
    calendarId?: string;
  } = {}
) {
  return {
    summary,
    description: options.description || "",
    start: {
      dateTime: startTime,
      timeZone: "UTC",
    },
    end: {
      dateTime: endTime,
      timeZone: "UTC",
    },
    location: options.location || "",
    attendees:
      options.attendees?.map((email) => ({
        email,
        responseStatus: "needsAction" as const,
      })) || [],
    calendarId: options.calendarId || "primary",
  };
}

/**
 * Calculate event duration in minutes
 */
export function calculateEventDuration(event: CalendarEvent): number {
  const startTime = event.start.dateTime || event.start.date;
  const endTime = event.end.dateTime || event.end.date;

  if (!startTime || !endTime) {
    return 0;
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

/**
 * Check if event is happening today
 */
export function isEventToday(event: CalendarEvent): boolean {
  const eventStart = event.start.dateTime || event.start.date;
  if (!eventStart) return false;

  const eventDate = new Date(eventStart);
  const today = new Date();

  return eventDate.toDateString() === today.toDateString();
}

/**
 * Check if event is in the future
 */
export function isEventUpcoming(event: CalendarEvent): boolean {
  const eventStart = event.start.dateTime || event.start.date;
  if (!eventStart) return false;

  const eventDate = new Date(eventStart);
  const now = new Date();

  return eventDate > now;
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  return events.filter((event) => {
    const eventStart = event.start.dateTime || event.start.date;
    if (!eventStart) return false;

    const eventDate = new Date(eventStart);
    return eventDate >= startDate && eventDate <= endDate;
  });
}

/**
 * Group events by date
 */
export function groupEventsByDate(
  events: CalendarEvent[]
): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};

  events.forEach((event) => {
    const eventStart = event.start.dateTime || event.start.date;
    if (!eventStart) return;

    const eventDate = new Date(eventStart);
    const dateKey = eventDate.toDateString();

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(event);
  });

  // Sort events within each day by start time
  Object.keys(grouped).forEach((dateKey) => {
    grouped[dateKey].sort((a, b) => {
      const aStart = new Date(a.start.dateTime || a.start.date || "");
      const bStart = new Date(b.start.dateTime || b.start.date || "");
      return aStart.getTime() - bStart.getTime();
    });
  });

  return grouped;
}

/**
 * Generate human-readable event list for AI agents
 */
export function generateEventListSummary(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return "No events found.";
  }

  const grouped = groupEventsByDate(events);
  const summaries: string[] = [];

  Object.entries(grouped).forEach(([date, dayEvents]) => {
    const eventSummaries = dayEvents.map((event) =>
      generateEventSummary(event)
    );
    summaries.push(
      `${date}:\n${eventSummaries.map((s) => `  - ${s}`).join("\n")}`
    );
  });

  return summaries.join("\n\n");
}

/**
 * Create time slots for scheduling assistance
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number = 30,
  intervalMinutes: number = 30
): string[] {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const slots: string[] = [];

  let current = new Date(start);
  while (current < end) {
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
    if (slotEnd <= end) {
      slots.push(`${current.toISOString()} - ${slotEnd.toISOString()}`);
    }
    current = new Date(current.getTime() + intervalMinutes * 60000);
  }

  return slots;
}

/**
 * Find conflicts between events
 */
export function findEventConflicts(events: CalendarEvent[]): CalendarEvent[][] {
  const conflicts: CalendarEvent[][] = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];

      if (eventsOverlap(event1, event2)) {
        conflicts.push([event1, event2]);
      }
    }
  }

  return conflicts;
}

/**
 * Check if two events overlap
 */
function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  const start1 = new Date(event1.start.dateTime || event1.start.date || "");
  const end1 = new Date(event1.end.dateTime || event1.end.date || "");
  const start2 = new Date(event2.start.dateTime || event2.start.date || "");
  const end2 = new Date(event2.end.dateTime || event2.end.date || "");

  return start1 < end2 && start2 < end1;
}
