import { z } from "zod/v4";

import { UnifiedActionSchema } from "./task";

// Re-export for other schemas
export { UnifiedActionSchema };

// General data schemas
export const GeneralDataSchema = z.object({
  content: z.string(),
  summary: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  references: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().optional(),
        type: z.string(),
      }),
    )
    .optional(),
});

// UI metadata schema
export const UIMetadataSchema = z.object({
  category: z.string(),
  confidence: z.number(),
  timestamp: z.string(),
  source: z.string().optional(),
});

// UI data schema
export const UIDataSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  content: z.string(),
  icon: z.string(),
  actions: z.array(UnifiedActionSchema),
  metadata: UIMetadataSchema,
});
