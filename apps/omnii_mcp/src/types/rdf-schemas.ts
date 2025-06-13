import { z } from 'zod';

// =======================================================================
// RDF BRAIN MEMORY SCHEMAS
// Unified with @omnii/validators for brain-like memory processing
// =======================================================================

// Human input from any channel (SMS, chat, anecdotal text)
export const HumanInputSchema = z.object({
  raw_message: z.string().min(1, "Message cannot be empty"),
  user_id: z.string().min(1, "User ID required"),
  channel: z.enum(['sms', 'chat', 'websocket'], {
    errorMap: () => ({ message: "Invalid channel type" })
  }),
  timestamp: z.string().datetime().optional(),
  metadata: z.object({
    source_identifier: z.string().optional(), // phone number, chat ID, etc.
    is_incoming: z.boolean().default(true),
    local_datetime: z.string().optional(),
    context_hint: z.string().optional()
  }).optional()
});

// RDF processing configuration
export const RDFProcessingSchema = z.object({
  processing_id: z.string().uuid(),
  stage: z.enum(['input', 'concept_extraction', 'reasoning', 'output']),
  start_time: z.string().datetime(),
  reasoning_depth: z.enum(['basic', 'intermediate', 'deep']).default('intermediate'),
  brain_integration_active: z.boolean().default(true),
  context_window_size: z.number().min(1).max(50).default(10),
  confidence_threshold: z.number().min(0).max(1).default(0.7)
});

// Brain memory integration status
export const BrainMemoryIntegrationSchema = z.object({
  concepts_analyzed: z.number().min(0),
  memory_contexts_used: z.number().min(0),
  temporal_reasoning_applied: z.boolean(),
  concept_evolutions_triggered: z.number().min(0),
  neo4j_updates_queued: z.number().min(0),
  cross_channel_correlations: z.number().min(0)
});

// TypeScript types
export type HumanInput = z.infer<typeof HumanInputSchema>;
export type RDFProcessing = z.infer<typeof RDFProcessingSchema>;
export type BrainMemoryIntegration = z.infer<typeof BrainMemoryIntegrationSchema>; 