import { z } from 'zod/v4';

// ============================================================================
// UNIFIED BRAIN MEMORY SCHEMAS (Single Source of Truth)
// ============================================================================

// Enhanced ChatMessage node properties (brain-like enhancement with time-based working memory)
export const EnhancedChatMessageSchema = z.object({
  // Core properties
  id: z.string().uuid("ChatMessage ID must be valid UUID"),
  content: z.string().min(1).max(50000, "Content too long"),
  timestamp: z.string().datetime("Invalid timestamp format"),
  
  // Brain-like properties
  channel: z.enum(['sms', 'chat', 'websocket']),
  source_identifier: z.string().min(1, "Source required"),
  intent: z.string().optional(),
  sentiment: z.number().min(-1).max(1).optional(),
  importance_score: z.number().min(0).max(1).optional(),
  
  // Time-based working memory properties
  last_modified: z.string().datetime().optional(),
  modification_reason: z.string().optional(),
  
  // Channel-specific metadata
  sms_metadata: z.object({
    phone_number: z.string(),
    is_incoming: z.boolean(),
    local_datetime: z.string().optional()
  }).optional(),
  
  chat_metadata: z.object({
    chat_id: z.string(),
    websocket_session_id: z.string().optional(),
    is_group_chat: z.boolean().default(false),
    participants: z.array(z.string()).default([])
  }).optional(),
  
  // Google services context
  google_service_context: z.object({
    service_type: z.enum(['calendar', 'tasks', 'contacts', 'email']).optional(),
    operation: z.string().optional(),
    success: z.boolean().optional()
  }).optional()
});

// Enhanced Memory node properties (brain-like consolidation)
export const EnhancedMemorySchema = z.object({
  id: z.string().uuid("Memory ID must be valid UUID"),
  timestamp: z.string().datetime(),
  memory_type: z.enum(['episodic', 'semantic', 'procedural', 'working']).default('episodic'),
  consolidation_status: z.enum(['fresh', 'consolidating', 'consolidated', 'archived']).default('fresh'),
  consolidation_date: z.string().datetime().optional(),
  episode_type: z.enum(['conversation', 'action', 'service_interaction']).optional(),
  channel: z.enum(['sms', 'chat', 'websocket']).optional(),
  original_message_id: z.string().uuid().optional(),
  consolidation_summary: z.string().optional(),
  importance_score: z.number().min(0).max(1).optional()
});

// Enhanced Concept node properties (semantic network activation)
export const EnhancedConceptSchema = z.object({
  id: z.string().uuid("Concept ID must be valid UUID"),
  name: z.string().min(1).max(100),
  activation_strength: z.number().min(0).max(1).default(0),
  mention_count: z.number().int().min(0).default(0),
  last_mentioned: z.string().datetime().optional(),
  semantic_weight: z.number().min(0).max(1).default(0.5),
  user_id: z.string().min(1, "User ID required")
});

// Enhanced Tag node properties
export const EnhancedTagSchema = z.object({
  id: z.string().uuid("Tag ID must be valid UUID"),
  name: z.string().min(1).max(100),
  usage_count: z.number().int().min(0).default(0),
  last_used: z.string().datetime().optional(),
  channel_origin: z.enum(['sms', 'chat', 'websocket']).optional(),
  category: z.enum(['entity', 'topic', 'action', 'emotion', 'temporal', 'location', 'google_service']).optional(),
  user_id: z.string().min(1, "User ID required")
});

// Brain-like memory context schema (unified structure)
export const BrainMemoryContextSchema = z.object({
  // Working memory (3-week time window: previous + current + next week)
  working_memory: z.object({
    recent_messages: z.array(EnhancedChatMessageSchema),
    time_window_messages: z.array(EnhancedChatMessageSchema).optional(),
    recently_modified_messages: z.array(EnhancedChatMessageSchema).optional(),
    active_concepts: z.array(z.string()),
    current_intent: z.string().optional(),
    time_window_stats: z.object({
      previous_week_count: z.number(),
      current_week_count: z.number(),
      next_week_count: z.number(),
      recently_modified_count: z.number()
    }).optional()
  }),
  
  // Episodic memory (conversation episodes)
  episodic_memory: z.object({
    conversation_threads: z.array(z.object({
      thread_id: z.string(),
      messages: z.array(EnhancedChatMessageSchema).optional(),
      semantic_weight: z.number().min(0).max(1),
      memory_node_id: z.string().uuid().optional()
    })),
    related_episodes: z.array(z.string())
  }),
  
  // Semantic memory (concept associations)
  semantic_memory: z.object({
    activated_concepts: z.array(z.object({
      concept: EnhancedConceptSchema.optional(),
      concept_id: z.string().uuid().optional(),
      concept_name: z.string().optional(),
      activation_strength: z.number().min(0).max(1),
      related_concepts: z.array(z.string())
    })),
    concept_associations: z.array(z.object({
      from_concept: z.string(),
      to_concept: z.string(),
      association_strength: z.number().min(0).max(1),
      relationship_type: z.string().optional()
    }))
  }),
  
  // Memory consolidation metadata
  consolidation_metadata: z.object({
    retrieval_timestamp: z.string().datetime(),
    memory_strength: z.number().min(0).max(1),
    context_channels: z.array(z.enum(['sms', 'chat', 'websocket'])),
    memory_age_hours: z.number().optional(),
    consolidation_score: z.number().min(0).max(1),
    
    // Brain-like memory constants
    working_memory_limit: z.number().default(7).optional(),
    episodic_window_hours: z.number().default(168).optional(),
    semantic_activation_threshold: z.number().default(0.3).optional(),
    
    // Channel-specific optimizations
    sms_optimization: z.object({
      character_budget: z.number().default(1500),
      suggested_response_length: z.enum(['brief', 'normal', 'detailed']).default('normal')
    }).optional(),
    
    chat_optimization: z.object({
      max_message_length: z.number().default(4000),
      supports_rich_content: z.boolean().default(true),
      real_time_context: z.boolean().default(true),
      thread_aware: z.boolean().default(true)
    }).optional()
  })
});

// Enhanced relationship properties
export const EnhancedRelationshipSchema = z.object({
  // For RELATED_TO relationships (associative memory)
  strength: z.number().min(0).max(1).optional(), 
  last_activated: z.string().datetime().optional(),
  association_type: z.enum(['semantic', 'episodic', 'temporal', 'causal']).optional(),
  activation_count: z.number().int().min(0).default(0),
  
  // For service relationships
  operation: z.string().optional(),
  success: z.boolean().optional(),
  service_metadata: z.record(z.string(), z.any()).optional()
});

// Time window schema
export const TimeWindowSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  type: z.enum(['previous_week', 'current_week', 'next_week', 'recent_modification']),
  message_count: z.number().int().min(0).default(0)
});

// Memory strength calculation
export const MemoryStrengthCalculationSchema = z.object({
  base_importance: z.number().min(0).max(1),
  recency_bonus: z.number().min(0).max(1),
  frequency_bonus: z.number().min(0).max(1),
  semantic_bonus: z.number().min(0).max(1),
  time_distribution_bonus: z.number().min(0).max(1),
  modification_bonus: z.number().min(0).max(1),
  final_strength: z.number().min(0).max(1)
});

// Composio memory enhancement
export const ComposioMemoryEnhancementSchema = z.object({
  tool_name: z.string(),
  original_params: z.record(z.string(), z.any()),
  memory_enhanced_params: z.record(z.string(), z.any()),
  memory_insights: z.array(z.string()),
  concepts_used: z.array(z.string()),
  episodic_context_used: z.array(z.string()),
  enhancement_confidence: z.number().min(0).max(1)
});

// Brain memory constants
export const BRAIN_MEMORY_CONSTANTS = {
  WORKING_MEMORY_SIZE: 7,
  WORKING_MEMORY_TIME_WINDOW_DAYS: 21,
  EPISODIC_MEMORY_WINDOW_HOURS: 168,
  SEMANTIC_ACTIVATION_THRESHOLD: 0.3,
  MEMORY_CONSOLIDATION_HOURS: 24,
  RECENT_MODIFICATION_HOURS: 2,
  CACHE_TTL_SECONDS: 1800,
  
  TIME_DISTRIBUTION_BONUSES: {
    PREVIOUS_WEEK: 0.1,
    CURRENT_WEEK: 0.2,
    NEXT_WEEK: 0.05,
    RECENT_MODIFICATION: 0.3
  }
} as const;

// ============================================================================
// VALIDATION FUNCTIONS (Following unified pattern)
// ============================================================================

export function isValidBrainMemoryContext(data: any): data is z.infer<typeof BrainMemoryContextSchema> {
  const result = BrainMemoryContextSchema.safeParse(data);
  if (result.success) {
    console.log('[BrainMemoryValidation] ✅ Valid BrainMemoryContext detected');
    return true;
  }
  console.log('[BrainMemoryValidation] ❌ Invalid BrainMemoryContext:', result.error.message);
  return false;
}

export function validateBrainMemoryContext(data: any): z.infer<typeof BrainMemoryContextSchema> {
  console.log('[BrainMemoryValidation] 🔍 Validating BrainMemoryContext with Zod...');
  
  try {
    const validated = BrainMemoryContextSchema.parse(data);
    console.log('[BrainMemoryValidation] ✅ Validation successful');
    
    // Log validation details
    const workingMemoryCount = validated.working_memory.recent_messages.length;
    const episodicThreadsCount = validated.episodic_memory.conversation_threads.length;
    const activatedConceptsCount = validated.semantic_memory.activated_concepts.length;
    
    console.log(`[BrainMemoryValidation] 🧠 Working Memory: ${workingMemoryCount} messages`);
    console.log(`[BrainMemoryValidation] 🧠 Episodic Memory: ${episodicThreadsCount} threads`);
    console.log(`[BrainMemoryValidation] 🧠 Semantic Memory: ${activatedConceptsCount} concepts`);
    
    return validated;
  } catch (error) {
    console.error('[BrainMemoryValidation] ❌ Validation failed:', error);
    throw error;
  }
}

export function safeParseEnhancedChatMessage(data: any): { 
  success: true; 
  data: z.infer<typeof EnhancedChatMessageSchema>; 
} | { 
  success: false; 
  error: string; 
} {
  const result = EnhancedChatMessageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { 
      success: false, 
      error: result.error.message 
    };
  }
} 