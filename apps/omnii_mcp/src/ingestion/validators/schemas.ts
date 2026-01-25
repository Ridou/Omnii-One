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

// === Google Tasks Schema ===

/**
 * Google Tasks task item
 *
 * Quality gates:
 * - Must have title
 * - Due date format must be valid if present
 */
export const GoogleTaskSchema = z.object({
  id: z.string().min(1, "Task ID required"),
  title: z.string().min(1, "Task title required"),
  notes: z.string().optional(),
  status: z.enum(["needsAction", "completed"]).optional(),
  due: z.string().datetime().optional(), // RFC 3339 timestamp
  completed: z.string().datetime().optional(),
  parent: z.string().optional(), // Parent task ID for subtasks
  position: z.string().optional(),
  links: z.array(z.object({
    type: z.string().optional(),
    description: z.string().optional(),
    link: z.string().url().optional(),
  })).optional(),
  updated: z.string().datetime().optional(),
});

export type GoogleTask = z.infer<typeof GoogleTaskSchema>;

/**
 * Google Tasks list (container for tasks)
 */
export const GoogleTaskListSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  updated: z.string().datetime().optional(),
});

export type GoogleTaskList = z.infer<typeof GoogleTaskListSchema>;

// === Gmail Message Schema ===

/**
 * Gmail message header
 */
const GmailHeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
});

/**
 * Gmail message body
 */
const GmailBodySchema = z.object({
  size: z.number(),
  data: z.string().optional(), // Base64 encoded
});

/**
 * Gmail message part (simplified - covers 2 levels of nesting for multipart)
 * Gmail API returns nested parts for multipart/mixed, multipart/alternative, etc.
 */
const GmailPartSchema = z.object({
  partId: z.string(),
  mimeType: z.string(),
  filename: z.string().optional(),
  body: GmailBodySchema.optional(),
  headers: z.array(GmailHeaderSchema).optional(),
  parts: z.array(z.object({
    partId: z.string(),
    mimeType: z.string(),
    filename: z.string().optional(),
    body: GmailBodySchema.optional(),
    headers: z.array(GmailHeaderSchema).optional(),
    // Third level uses z.any() to handle deeply nested structures
    parts: z.array(z.any()).optional(),
  })).optional(),
});

/**
 * Gmail message - validates structure for ingestion
 *
 * Quality gates:
 * - Must have ID and threadId
 * - Must have snippet or payload for content extraction
 */
export const GmailMessageSchema = z.object({
  id: z.string().min(1, "Message ID required"),
  threadId: z.string().min(1, "Thread ID required"),
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(), // Preview text
  historyId: z.string().optional(),
  internalDate: z.string().optional(), // Unix timestamp in milliseconds
  payload: z.object({
    partId: z.string().optional(),
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: z.array(GmailHeaderSchema).optional(),
    body: GmailBodySchema.optional(),
    parts: z.array(GmailPartSchema).optional(),
  }).optional(),
  sizeEstimate: z.number().optional(),
}).refine(
  (data) => data.snippet || data.payload,
  "Message must have snippet or payload for content"
);

export type GmailMessage = z.infer<typeof GmailMessageSchema>;

// === Google Contacts Schema ===

/**
 * Google Contact name
 */
const ContactNameSchema = z.object({
  displayName: z.string().optional(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
  middleName: z.string().optional(),
});

/**
 * Google Contact email
 */
const ContactEmailSchema = z.object({
  value: z.string().email(),
  type: z.string().optional(), // "home", "work", etc.
  formattedType: z.string().optional(),
});

/**
 * Google Contact phone
 */
const ContactPhoneSchema = z.object({
  value: z.string().min(1),
  type: z.string().optional(),
  formattedType: z.string().optional(),
});

/**
 * Google Contact organization
 */
const ContactOrganizationSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
});

/**
 * Google Contact - validates People API response
 *
 * Quality gates:
 * - Must have resourceName (unique identifier)
 * - Must have at least name or email (contact must be identifiable)
 */
export const GoogleContactSchema = z.object({
  resourceName: z.string().min(1, "Resource name required"),
  etag: z.string().optional(),
  names: z.array(ContactNameSchema).optional(),
  emailAddresses: z.array(ContactEmailSchema).optional(),
  phoneNumbers: z.array(ContactPhoneSchema).optional(),
  organizations: z.array(ContactOrganizationSchema).optional(),
  photos: z.array(z.object({
    url: z.string().url().optional(),
    default: z.boolean().optional(),
  })).optional(),
  birthdays: z.array(z.object({
    date: z.object({
      year: z.number().optional(),
      month: z.number().optional(),
      day: z.number().optional(),
    }).optional(),
  })).optional(),
  metadata: z.object({
    sources: z.array(z.object({
      type: z.string().optional(),
      id: z.string().optional(),
    })).optional(),
  }).optional(),
}).refine(
  (data) => {
    const hasName = data.names && data.names.length > 0 &&
      (data.names[0].displayName || data.names[0].givenName || data.names[0].familyName);
    const hasEmail = data.emailAddresses && data.emailAddresses.length > 0;
    return hasName || hasEmail;
  },
  "Contact must have name or email address"
);

export type GoogleContact = z.infer<typeof GoogleContactSchema>;

// === Validation Helper ===

/**
 * Validate data against a schema and return typed result
 */
export function validateIngestionData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  source: string
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${source}: ${issue.path.join(".")} - ${issue.message}`
  );

  return { success: false, errors };
}
