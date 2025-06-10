import { z } from 'zod';

// Enhanced ChatMessage node properties (brain-like enhancement with time-based working memory)
export const EnhancedChatMessageSchema = z.object({
  // Existing ChatMessage properties (preserved)
  id: z.string().uuid("ChatMessage ID must be valid UUID"),
  content: z.string().min(1).max(50000, "Content too long"),
  timestamp: z.string().datetime("Invalid timestamp format"),
  
  // NEW: Brain-like properties (added to existing ChatMessage nodes)
  channel: z.enum(['sms', 'chat', 'websocket'], {
    errorMap: () => ({ message: "Invalid channel type" })
  }),
  source_identifier: z.string().min(1, "Source required"), // Phone number for SMS, chat ID for chat
  intent: z.string().optional(),
  sentiment: z.number().min(-1).max(1).optional(),
  importance_score: z.number().min(0).max(1).optional(),
  
  // NEW: Time-based working memory properties
  last_modified: z.string().datetime().optional(), // Track when node was last modified
  modification_reason: z.string().optional(), // Why it was modified (concept_update, tag_added, etc.)
  
  // Channel-specific metadata (JSON stored in ChatMessage properties)
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
  
  // Google services context (for existing RELATED_TO relationships)
  google_service_context: z.object({
    service_type: z.enum(['calendar', 'tasks', 'contacts', 'email']).optional(),
    operation: z.string().optional(),
    success: z.boolean().optional()
  }).optional()
});

// Enhanced Memory node properties (brain-like consolidation)
export const EnhancedMemorySchema = z.object({
  // Existing Memory properties (preserved)
  id: z.string().uuid("Memory ID must be valid UUID"),
  timestamp: z.string().datetime(),
  
  // NEW: Brain-like properties (added to existing Memory nodes)
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
  // Existing Concept properties (preserved)
  id: z.string().uuid("Concept ID must be valid UUID"),
  name: z.string().min(1).max(100),
  
  // NEW: Brain-like properties (added to existing Concept nodes)
  activation_strength: z.number().min(0).max(1).default(0),
  mention_count: z.number().int().min(0).default(0),
  last_mentioned: z.string().datetime().optional(),
  semantic_weight: z.number().min(0).max(1).default(0.5),
  user_id: z.string().min(1, "User ID required")
});

// Enhanced Tag node properties (categorization system)
export const EnhancedTagSchema = z.object({
  // Existing Tag properties (preserved)  
  id: z.string().uuid("Tag ID must be valid UUID"),
  name: z.string().min(1).max(100),
  
  // NEW: Brain-like properties (added to existing Tag nodes)
  usage_count: z.number().int().min(0).default(0),
  last_used: z.string().datetime().optional(),
  channel_origin: z.enum(['sms', 'chat', 'websocket']).optional(),
  category: z.enum(['entity', 'topic', 'action', 'emotion', 'temporal', 'location', 'google_service']).optional(),
  user_id: z.string().min(1, "User ID required")
});

// Brain-like memory context schema (uses existing node structure with time-based working memory)
export const BrainMemoryContextSchema = z.object({
  // Working memory (3-week time window: previous + current + next week)
  working_memory: z.object({
    recent_messages: z.array(EnhancedChatMessageSchema), // Most recent for immediate context
    time_window_messages: z.array(EnhancedChatMessageSchema), // 3-week time window
    recently_modified_messages: z.array(EnhancedChatMessageSchema), // Recently modified nodes
    active_concepts: z.array(z.string()), // Concept node IDs
    current_intent: z.string().optional(),
    time_window_stats: z.object({
      previous_week_count: z.number(),
      current_week_count: z.number(),
      next_week_count: z.number(),
      recently_modified_count: z.number()
    })
  }),
  
  // Episodic memory (conversation episodes via ChatMessage-[:HAS_MEMORY]->Memory)
  episodic_memory: z.object({
    conversation_threads: z.array(z.object({
      thread_id: z.string(),
      messages: z.array(EnhancedChatMessageSchema),
      semantic_weight: z.number().min(0).max(1),
      memory_node_id: z.string().uuid().optional() // Links to Memory node
    })),
    related_episodes: z.array(z.string()) // Memory node IDs
  }),
  
  // Semantic memory (concept associations via Concept nodes and relationships)
  semantic_memory: z.object({
    activated_concepts: z.array(z.object({
      concept: EnhancedConceptSchema,
      activation_strength: z.number().min(0).max(1),
      related_concepts: z.array(z.string()) // Concept node IDs via RELATED_TO
    })),
    concept_associations: z.array(z.object({
      from_concept: z.string(), // Concept node ID
      to_concept: z.string(), // Concept node ID
      association_strength: z.number().min(0).max(1), // From RELATED_TO.strength
      relationship_type: z.string().optional() // RELATED_TO, CONTAINS_CONCEPT, etc.
    }))
  }),
  
  // Memory consolidation metadata (brain-like processing state)
  consolidation_metadata: z.object({
    retrieval_timestamp: z.string().datetime(),
    memory_strength: z.number().min(0).max(1),
    context_channels: z.array(z.enum(['sms', 'chat', 'websocket'])),
    memory_age_hours: z.number(),
    consolidation_score: z.number().min(0).max(1),
    
    // Brain-like memory constants
    working_memory_limit: z.number().default(7), // Miller's magic number
    episodic_window_hours: z.number().default(168), // 1 week
    semantic_activation_threshold: z.number().default(0.3),
    
    // Channel-specific optimizations (preserved from original)
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

// Enhanced relationship properties (for existing RELATED_TO, HAS_MEMORY relationships)
export const EnhancedRelationshipSchema = z.object({
  // For RELATED_TO relationships (associative memory)
  strength: z.number().min(0).max(1).optional(), 
  last_activated: z.string().datetime().optional(),
  association_type: z.enum(['semantic', 'episodic', 'temporal', 'causal']).optional(),
  activation_count: z.number().int().min(0).default(0),
  
  // For service relationships (TRIGGERED_SERVICE, etc.)
  operation: z.string().optional(),
  success: z.boolean().optional(),
  service_metadata: z.record(z.any()).optional()
});

// Time-based memory helper types
export const TimeWindowSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  type: z.enum(['previous_week', 'current_week', 'next_week', 'recent_modification']),
  message_count: z.number().int().min(0).default(0)
});

export const MemoryStrengthCalculationSchema = z.object({
  base_importance: z.number().min(0).max(1),
  recency_bonus: z.number().min(0).max(1),
  frequency_bonus: z.number().min(0).max(1),
  semantic_bonus: z.number().min(0).max(1),
  time_distribution_bonus: z.number().min(0).max(1), // NEW: Bonus for being in 3-week window
  modification_bonus: z.number().min(0).max(1), // NEW: Bonus for recent modifications
  final_strength: z.number().min(0).max(1)
});

// Composio tool integration with memory enhancement
export const ComposioMemoryEnhancementSchema = z.object({
  tool_name: z.string(),
  original_params: z.record(z.any()),
  memory_enhanced_params: z.record(z.any()),
  memory_insights: z.array(z.string()),
  concepts_used: z.array(z.string()),
  episodic_context_used: z.array(z.string()),
  enhancement_confidence: z.number().min(0).max(1)
});

// Inferred types for brain-like memory system
export type EnhancedChatMessage = z.infer<typeof EnhancedChatMessageSchema>;
export type EnhancedMemory = z.infer<typeof EnhancedMemorySchema>;
export type EnhancedConcept = z.infer<typeof EnhancedConceptSchema>;
export type EnhancedTag = z.infer<typeof EnhancedTagSchema>;
export type BrainMemoryContext = z.infer<typeof BrainMemoryContextSchema>;
export { BrainMemoryContextSchema as BrainMemoryContext };
export type EnhancedRelationship = z.infer<typeof EnhancedRelationshipSchema>;
export type TimeWindow = z.infer<typeof TimeWindowSchema>;
export type MemoryStrengthCalculation = z.infer<typeof MemoryStrengthCalculationSchema>;
export type ComposioMemoryEnhancement = z.infer<typeof ComposioMemoryEnhancementSchema>;

// Memory constants for brain-like processing
export const BRAIN_MEMORY_CONSTANTS = {
  WORKING_MEMORY_SIZE: 7, // Miller's magic number
  WORKING_MEMORY_TIME_WINDOW_DAYS: 21, // 3 weeks (previous + current + next)
  EPISODIC_MEMORY_WINDOW_HOURS: 168, // 1 week for deep episodic search
  SEMANTIC_ACTIVATION_THRESHOLD: 0.3,
  MEMORY_CONSOLIDATION_HOURS: 24,
  RECENT_MODIFICATION_HOURS: 2, // Pull recently modified nodes back to working memory
  CACHE_TTL_SECONDS: 1800, // 30 minutes
  
  // Time distribution bonuses (brain-like time-based learning)
  TIME_DISTRIBUTION_BONUSES: {
    PREVIOUS_WEEK: 0.1, // Bonus for established memories
    CURRENT_WEEK: 0.2,  // Highest bonus for current context
    NEXT_WEEK: 0.05,    // Small bonus for future planning
    RECENT_MODIFICATION: 0.3 // Strong bonus for recently modified items
  }
} as const; 