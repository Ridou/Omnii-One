import { z } from "zod/v4";

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
  // Smart contact suggestions when no exact match is found
  smartSuggestions: z.array(z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    confidence: z.number(),
    reasoning: z.string(),
  })).optional(),
});

export type CachedEntity = z.infer<typeof CachedEntitySchema>;
