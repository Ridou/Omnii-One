import { z } from "zod";

export enum EntityType {
  PERSON = "PERSON",
  EMAIL = "EMAIL",
  ORG = "ORG",
  DATE = "DATE",
  UNKNOWN = "UNKNOWN",
}

export const CachedEntitySchema = z.object({
  type: z.nativeEnum(EntityType),
  value: z.string(),
  email: z.string().email().optional(),
  resolvedAt: z.number(),
  // Additional properties for better contact resolution
  displayName: z.string().optional(),
  phoneNumber: z.string().optional(),
  needsEmailResolution: z.boolean().optional(),
});

export type CachedEntity = z.infer<typeof CachedEntitySchema>;
