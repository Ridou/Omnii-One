import { z } from "zod/v4";

// Email data schemas
export const EmailDataSchema = z.object({
  id: z.string().optional(),
  subject: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  body: z.string(),
  messageText: z.string().optional(),
  preview: z.string().optional(),
  sender: z.string().optional(),
  date: z.string().optional(),
  threadId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        size: z.number(),
        downloadUrl: z.string().optional(),
      }),
    )
    .optional(),
  isRead: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  messageId: z.string().optional(),
  messageTimestamp: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

export const EmailListDataSchema = z.object({
  emails: z.array(EmailDataSchema),
  totalCount: z.number(),
  unreadCount: z.number(),
  query: z.string().optional(),
  hasMore: z.boolean().optional(),
});

export const SingleEmailDataSchema = z.object({
  email: EmailDataSchema,
});
