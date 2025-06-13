import { z } from 'zod/v4';

// ✅ RDF ACTION TYPE CONSTANTS - Reusable across the codebase
export const RDF_ACTION_TYPES = {
  CREATE_TASK: 'create_task',
  SCHEDULE_EVENT: 'schedule_event', 
  SEND_EMAIL: 'send_email',
  SET_REMINDER: 'set_reminder',
  SEARCH_CONTACTS: 'search_contacts',
  BOOK_FLIGHT: 'book_flight',
  SEARCH_RESTAURANTS: 'search_restaurants',
  CREATE_NOTE: 'create_note',
  UPDATE_CONCEPT: 'update_concept',
  TRIGGER_WORKFLOW: 'trigger_workflow'
} as const;

// ✅ Array of all RDF action types for Zod enum validation
export const RDF_ACTION_TYPE_VALUES = Object.values(RDF_ACTION_TYPES);

// ✅ TypeScript type for RDF action types
export type RDFActionType = typeof RDF_ACTION_TYPES[keyof typeof RDF_ACTION_TYPES];

// ✅ BRAIN MEMORY INTEGRATION SCHEMAS
export const BrainMemoryIntegrationSchema = z.object({
  concepts_analyzed: z.number().int().min(0),
  memory_contexts_used: z.number().int().min(0),
  temporal_reasoning_applied: z.boolean(),
  concept_evolutions_triggered: z.number().int().min(0),
  neo4j_updates_queued: z.number().int().min(0),
  cross_channel_correlations: z.number().int().min(0),
  processing_time_ms: z.number().min(0)
});

export const ConceptInsightSchema = z.object({
  concept_id: z.string().uuid(),
  concept_name: z.string().min(1),
  insight_type: z.enum(['semantic_connection', 'temporal_pattern', 'strength_evolution', 'new_association']),
  confidence: z.number().min(0).max(1),
  description: z.string(),
  temporal_context: z.enum(['previous_week', 'current_week', 'next_week', 'recent_modification']).optional(),
  source_channels: z.array(z.enum(['sms', 'chat', 'websocket'])).optional(),
  evidence_count: z.number().int().min(0).optional()
});

export const SemanticConnectionSchema = z.object({
  from_concept: z.string().uuid(),
  to_concept: z.string().uuid(),
  relationship_type: z.string().min(1),
  strength: z.number().min(0).max(1),
  evidence_count: z.number().int().min(0),
  temporal_stability: z.number().min(0).max(1).optional(),
  cross_channel_verified: z.boolean().optional()
});

export const TemporalPatternSchema = z.object({
  pattern_type: z.string().min(1),
  time_window: z.enum(['previous_week', 'current_week', 'next_week']),
  affected_concepts: z.array(z.string().uuid()),
  confidence: z.number().min(0).max(1),
  strength: z.number().min(0).max(1),
  recurrence_detected: z.boolean().optional(),
  seasonal_pattern: z.boolean().optional()
});

// ✅ STRUCTURED ACTION SCHEMA (for omnii_mcp consumption)
export const StructuredActionSchema = z.object({
  action_type: z.enum(RDF_ACTION_TYPE_VALUES as [string, ...string[]]),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(1),
  parameters: z.record(z.string(), z.any()),
  reasoning_chain: z.array(z.string()),
  execution_context: z.object({
    requires_user_confirmation: z.boolean(),
    estimated_completion_time: z.string().optional(),
    dependent_actions: z.array(z.string()).optional(),
    fallback_actions: z.array(z.string()).optional()
  }).optional(),
  temporal_constraint: z.object({
    execute_after: z.string().datetime().optional(),
    execute_before: z.string().datetime().optional(),
    preferred_time: z.string().optional()
  }).optional()
});

// ✅ HUMAN INPUT PROCESSING SCHEMA
export const HumanInputSchema = z.object({
  raw_message: z.string().min(1),
  channel: z.enum(['sms', 'chat', 'websocket']),
  timestamp: z.string().datetime(),
  user_id: z.string().uuid(),
  context_metadata: z.object({
    device_type: z.string().optional(),
    location: z.string().optional(),
    session_id: z.string().optional(),
    conversation_thread_id: z.string().optional()
  }).optional()
});

// ✅ AI REASONING RESULTS SCHEMA
export const AIReasoningSchema = z.object({
  extracted_concepts: z.array(ConceptInsightSchema),
  semantic_connections: z.array(SemanticConnectionSchema),
  temporal_patterns: z.array(TemporalPatternSchema),
  intent_analysis: z.object({
    primary_intent: z.string(),
    secondary_intents: z.array(z.string()),
    urgency_level: z.enum(['low', 'medium', 'high', 'critical']),
    complexity_score: z.number().min(0).max(1)
  }),
  context_enrichment: z.object({
    related_memories: z.array(z.string().uuid()),
    contextual_factors: z.array(z.string()),
    environmental_context: z.record(z.string(), z.any()).optional()
  }).optional(),
  reasoning_confidence: z.number().min(0).max(1)
});

// ✅ RDF BRIDGE DATA SCHEMA (Main schema for omnii_mcp handoff)
export const RDFBridgeDataSchema = z.object({
  // Human anecdotal reasoning → AI structured reasoning
  human_input: HumanInputSchema,
  
  // AI reasoning results  
  ai_reasoning: AIReasoningSchema,
  
  // Structured output for omnii_mcp consumption
  structured_actions: z.array(StructuredActionSchema),
  
  // Brain memory context integration
  brain_integration: BrainMemoryIntegrationSchema,
  
  // Consolidation recommendations
  consolidation_recommendations: z.array(z.object({
    action_type: z.enum(['concept_merge', 'relationship_strengthen', 'memory_archive', 'attention_focus']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
    suggested_timeframe: z.string().optional(),
    impact_assessment: z.object({
      user_productivity: z.number().min(-1).max(1),
      system_performance: z.number().min(-1).max(1),
      memory_efficiency: z.number().min(-1).max(1)
    }).optional()
  })).optional(),
  
  // Processing metadata
  processing_time_ms: z.number().min(0),
  reasoning_depth: z.enum(['basic', 'intermediate', 'deep']),
  validation_required: z.boolean(),
  cache_key: z.string().optional(),
  version: z.string().default('1.0.0')
});

// ✅ INTERNAL PROCESSING SCHEMAS (not exposed in unified response)
export const RDFInputSchema = z.object({
  raw_message: z.string().min(1),
  user_id: z.string().uuid(),
  channel: z.enum(['sms', 'chat', 'websocket']),
  timestamp: z.string().datetime(),
  context_window_hours: z.number().min(1).max(720).default(24), // Max 30 days
  include_brain_memory: z.boolean().default(true),
  reasoning_depth: z.enum(['basic', 'intermediate', 'deep']).default('intermediate')
});

export const RDFProcessingSchema = z.object({
  query_type: z.enum(['concept_extraction', 'temporal_analysis', 'semantic_reasoning', 'action_planning']),
  brain_context_loaded: z.boolean(),
  reasoning_steps: z.array(z.object({
    step: z.number().int().min(1),
    operation: z.string().min(1),
    input_data: z.any(),
    output_data: z.any(),
    confidence: z.number().min(0).max(1),
    execution_time_ms: z.number().min(0)
  })),
  execution_time_ms: z.number().min(0),
  cache_hit: z.boolean().default(false),
  errors: z.array(z.object({
    step: z.number(),
    error_type: z.string(),
    error_message: z.string(),
    recoverable: z.boolean()
  })).optional()
});

// ✅ RDF QUERY RESPONSE SCHEMA (for direct RDF queries)
export const RDFQueryDataSchema = z.object({
  query: z.string().min(1),
  query_type: z.enum(['SELECT', 'CONSTRUCT', 'ASK', 'DESCRIBE', 'INSERT', 'DELETE']),
  reasoning_applied: z.boolean(),
  results: z.array(z.record(z.string(), z.any())),
  execution_time_ms: z.number().min(0),
  query_hash: z.string(),
  total_results: z.number().int().min(0),
  
  // Brain memory integration
  brain_memory_integration: BrainMemoryIntegrationSchema.optional(),
  concept_insights: z.array(ConceptInsightSchema).optional(),
  
  // Caching and performance metadata
  cache_hit: z.boolean().optional(),
  cache_ttl: z.number().optional(),
  performance_metrics: z.object({
    query_planning_ms: z.number().min(0),
    execution_ms: z.number().min(0),
    result_processing_ms: z.number().min(0)
  }).optional()
});

// ✅ RDF ANALYSIS RESPONSE SCHEMA
export const RDFAnalysisDataSchema = z.object({
  analysis_type: z.enum(['concept_evolution', 'semantic_reasoning', 'temporal_analysis', 'cross_channel_insights']),
  user_id: z.string().uuid(),
  analysis_timestamp: z.string().datetime(),
  
  // Analysis results
  concept_insights: z.array(ConceptInsightSchema),
  temporal_patterns: z.array(TemporalPatternSchema),
  semantic_connections: z.array(SemanticConnectionSchema),
  
  // Brain memory context
  brain_integration: BrainMemoryIntegrationSchema,
  
  // Analysis metadata
  confidence_score: z.number().min(0).max(1),
  completeness_score: z.number().min(0).max(1),
  novelty_score: z.number().min(0).max(1).optional()
});

// ✅ RDF HEALTH CHECK SCHEMA
export const RDFHealthDataSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  graph_size: z.number().int().min(0),
  cache_size: z.number().int().min(0),
  brain_integration: z.boolean(),
  version: z.string(),
  last_health_check: z.string().datetime(),
  response_time_ms: z.number().min(0),
  system_resources: z.object({
    memory_usage_mb: z.number().min(0),
    cpu_usage_percent: z.number().min(0).max(100),
    active_connections: z.number().int().min(0)
  }).optional()
});

// ✅ DISCRIMINATED UNION FOR ALL RDF RESPONSE TYPES
export const RDFDataSchema = z.discriminatedUnion('response_type', [
  z.object({
    response_type: z.literal('bridge'),
    ...RDFBridgeDataSchema.shape
  }),
  z.object({
    response_type: z.literal('query'),
    ...RDFQueryDataSchema.shape
  }),
  z.object({
    response_type: z.literal('analysis'),
    ...RDFAnalysisDataSchema.shape
  }),
  z.object({
    response_type: z.literal('health_check'),
    ...RDFHealthDataSchema.shape
  })
]);

// ✅ LIST RESPONSE SCHEMAS (for multiple results)
export const RDFQueryListDataSchema = z.object({
  queries: z.array(RDFQueryDataSchema),
  totalCount: z.number().int().min(0),
  hasMore: z.boolean().optional(),
  aggregated_insights: z.object({
    common_concepts: z.array(z.string()),
    pattern_frequency: z.record(z.string(), z.number()),
    overall_confidence: z.number().min(0).max(1)
  }).optional()
});

export const RDFAnalysisListDataSchema = z.object({
  analyses: z.array(RDFAnalysisDataSchema),
  totalCount: z.number().int().min(0),
  hasMore: z.boolean().optional(),
  trend_analysis: z.object({
    concept_evolution_trends: z.array(z.string()),
    temporal_patterns: z.array(z.string()),
    user_behavior_insights: z.array(z.string())
  }).optional()
}); 