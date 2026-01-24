import { z } from "zod/v4";

// Calendar data schemas
export const CalendarDataSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  attendees: z.array(
    z.object({
      email: z.string(),
      name: z.string().optional(),
      status: z.enum(["accepted", "declined", "pending"]).optional(),
    }),
  ),
  location: z.string().optional(),
  description: z.string().optional(),
  meetingLink: z.string().optional(),
  eventId: z.string().optional(),
});

export const CalendarListDataSchema = z.object({
  events: z.array(CalendarDataSchema),
  totalCount: z.number(),
  hasMore: z.boolean().optional(),
  timeRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});
