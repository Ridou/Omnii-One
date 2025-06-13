import { z } from "zod/v4";

// Contact data schemas
export const ContactDataSchema = z.object({
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  emails: z.array(
    z.object({
      address: z.string(),
      type: z.enum(["work", "personal", "other"]),
      verified: z.boolean().optional(), // Backend has this, mobile doesn't - making it optional
    }),
  ),
  phones: z.array(
    z.object({
      number: z.string(),
      type: z.enum(["work", "mobile", "home", "other"]),
    }),
  ),
  company: z.string().optional(),
  title: z.string().optional(),
  photoUrl: z.string().optional(),
  contactId: z.string(),
  etag: z.string().optional(),
});

// ✅ Contact list data schema for multiple contacts
export const ContactListDataSchema = z.object({
  contacts: z.array(ContactDataSchema),
  totalCount: z.number(),
  hasMore: z.boolean().optional(),
  nextPageToken: z.string().optional(),
});

// ✅ Single contact wrapper schema
export const SingleContactDataSchema = z.object({
  contact: ContactDataSchema,
});
