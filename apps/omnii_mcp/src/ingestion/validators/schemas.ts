/**
 * Ingestion Quality Gate Schemas
 *
 * Validates Google API data before graph insertion.
 * Rejects malformed data with descriptive errors.
 */

import { z } from "zod";

// === Calendar Event Schema ===

/**
 * Google Calendar event time (either dateTime or date, not both)
 */
const CalendarTimeSchema = z.object({
  dateTime: z.string().datetime().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeZone: z.string().optional(),
}).refine(
  (data) => data.dateTime || data.date,
  "Event must have either dateTime or date"
);

/**
 * Google Calendar event attendee
 */
const AttendeeSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  responseStatus: z.enum(["needsAction", "declined", "tentative", "accepted"]).optional(),
  organizer: z.boolean().optional(),
  self: z.boolean().optional(),
});

/**
 * Google Calendar event - validates structure and business rules
 *
 * Quality gates:
 * - Must have summary (event title)
 * - Must have start time/date
 * - End time must be after start time (if both are datetime)
 */
export const CalendarEventSchema = z.object({
  id: z.string().min(1, "Event ID required"),
  summary: z.string().min(1, "Event title required"),
  description: z.string().optional(),
  start: CalendarTimeSchema,
  end: CalendarTimeSchema.optional(),
  location: z.string().optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
  attendees: z.array(AttendeeSchema).optional(),
  creator: z.object({
    email: z.string().email().optional(),
    displayName: z.string().optional(),
  }).optional(),
  organizer: z.object({
    email: z.string().email().optional(),
    displayName: z.string().optional(),
  }).optional(),
  recurringEventId: z.string().optional(),
  created: z.string().datetime().optional(),
  updated: z.string().datetime().optional(),
}).refine(
  (data) => {
    // Business rule: end time must be after start time
    if (data.start.dateTime && data.end?.dateTime) {
      return new Date(data.end.dateTime) > new Date(data.start.dateTime);
    }
    return true; // All-day events or missing end time are valid
  },
  "Event end time must be after start time"
);

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
