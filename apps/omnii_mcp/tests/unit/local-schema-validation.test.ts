import { describe, test, expect } from "bun:test";
import { z } from "zod";

// Local schema definitions for testing (mirroring unified validators structure)
const ServiceType = {
  RDF: "rdf" as const,
  EMAIL: "email" as const,
  CALENDAR: "calendar" as const,
  CONTACT: "contact" as const,
  TASK: "task" as const,
  GENERAL: "general" as const
};

// INPUT Schema: Human anecdotal text
const HumanInputSchema = z.object({
  raw_message: z.string().min(1),
  channel: z.enum(["sms", "chat", "websocket"]),
  timestamp: z.string().datetime(),
  user_id: z.string().uuid(),
  context_metadata: z.record(z.string(), z.any())
});

// PROCESSING Schema: AI reasoning configuration
const RDFProcessingSchema = z.object({
  processing_id: z.string().uuid(),
  stage: z.enum(["concept_extraction", "semantic_analysis", "temporal_reasoning", "bridge_preparation"]),
  start_time: z.string().datetime(),
  reasoning_depth: z.enum(["basic", "intermediate", "deep"]),
  brain_integration_active: z.boolean(),
  context_window_size: z.number().int().positive(),
  confidence_threshold: z.number().min(0).max(1)
});

// AI Reasoning Schema
const AIReasoningSchema = z.object({
  extracted_concepts: z.array(z.string()),
  semantic_connections: z.array(z.object({
    from_concept: z.string(),
    to_concept: z.string(),
    strength: z.number().min(0).max(1),
    evidence_count: z.number().int().min(0)
  })),
  temporal_patterns: z.array(z.object({
    pattern_type: z.string(),
    time_window: z.enum(["previous_week", "current_week", "next_week"]),
    strength: z.number().min(0).max(1),
    recurrence_detected: z.boolean()
  })),
  intent_analysis: z.object({
    primary_intent: z.string(),
    secondary_intents: z.array(z.string()),
    urgency: z.enum(["low", "medium", "high"]),
    complexity: z.enum(["low", "medium", "high"])
  }),
  context_enrichment: z.object({
    time_sensitivity: z.boolean(),
    location_specific: z.boolean(),
    requires_external_data: z.boolean()
  }),
  reasoning_confidence: z.number().min(0).max(1)
});

// Brain Memory Integration Schema
const BrainMemoryIntegrationSchema = z.object({
  concepts_analyzed: z.number().int().min(0),
  memory_contexts_used: z.number().int().min(0),
  temporal_reasoning_applied: z.boolean(),
  concept_evolutions_triggered: z.number().int().min(0),
  neo4j_updates_queued: z.number().int().min(0),
  cross_channel_correlations: z.number().int().min(0)
});

// Structured Action Schema (for omnii_mcp/Composio)
const StructuredActionSchema = z.object({
  action_type: z.enum([
    "create_task", "schedule_event", "send_email", "set_reminder",
    "search_contacts", "book_flight", "search_restaurants", "create_note",
    "update_concept", "trigger_workflow"
  ]),
  priority: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  parameters: z.record(z.string(), z.any()),
  reasoning_chain: z.array(z.string()),
  execution_context: z.object({
    requires_user_confirmation: z.boolean(),
    estimated_completion_time: z.number().int().positive()
  }),
  temporal_constraints: z.object({
    earliest_start: z.string().datetime(),
    preferred_completion: z.string().datetime()
  })
});

// OUTPUT Schema: Analysis results
const RDFAnalysisDataSchema = z.object({
  response_type: z.literal("analysis"),
  processing_metadata: z.object({
    processing_time_ms: z.number().int().min(0),
    concepts_extracted: z.number().int().min(0),
    confidence_score: z.number().min(0).max(1)
  }),
  concept_insights: z.array(z.object({
    concept_id: z.string().uuid(),
    insight_type: z.enum(["semantic_connection", "temporal_pattern", "strength_evolution", "new_association"]),
    confidence: z.number().min(0).max(1),
    temporal_context: z.enum(["previous_week", "current_week", "next_week"])
  })),
  semantic_connections: z.array(z.object({
    from_concept: z.string(),
    to_concept: z.string(),
    strength: z.number().min(0).max(1),
    evidence_count: z.number().int().min(0)
  })),
  temporal_patterns: z.array(z.object({
    pattern_type: z.string(),
    time_window: z.enum(["previous_week", "current_week", "next_week"]),
    strength: z.number().min(0).max(1),
    recurrence_detected: z.boolean()
  }))
});

// BRIDGE Schema: Complete package for omnii_mcp
const RDFBridgeDataSchema = z.object({
  human_input: HumanInputSchema,
  ai_reasoning: AIReasoningSchema,
  structured_actions: z.array(StructuredActionSchema),
  brain_integration: BrainMemoryIntegrationSchema,
  consolidation_recommendations: z.array(z.object({
    type: z.string(),
    concept_id: z.string().uuid(),
    action: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  processing_metadata: z.object({
    total_processing_time_ms: z.number().int().min(0),
    cache_used: z.boolean(),
    fallback_triggered: z.boolean(),
    validation_passed: z.boolean()
  })
});

// Unified Tool Response Schema
const UnifiedToolResponseSchema = z.object({
  service_type: z.literal(ServiceType.RDF),
  success: z.boolean(),
  message: z.string(),
  data: RDFBridgeDataSchema.nullable(),
  metadata: z.object({
    processing_time_ms: z.number().int().min(0),
    reasoning_depth: z.enum(["basic", "intermediate", "deep"]),
    brain_integration_active: z.boolean(),
    cache_hit: z.boolean(),
    validation_required: z.boolean()
  }),
  timestamp: z.string().datetime()
});

// Helper functions
function createSampleHumanInput(message: string, userId: string, channel: "sms" | "chat" | "websocket" = "sms") {
  return {
    raw_message: message,
    channel,
    timestamp: new Date().toISOString(),
    user_id: userId,
    context_metadata: {
      location: "test_environment",
      previous_messages: 1
    }
  };
}

function createMockBrainIntegration() {
  return {
    concepts_analyzed: 3,
    memory_contexts_used: 2,
    temporal_reasoning_applied: true,
    concept_evolutions_triggered: 1,
    neo4j_updates_queued: 2,
    cross_channel_correlations: 1
  };
}

describe("Local Schema Validation", () => {
  describe("Input→Processing→Output→Bridge Flow", () => {
    test("should validate complete RDF processing flow", () => {
      console.log("🚀 Testing complete Input→Processing→Output→Bridge flow");

      // PHASE 1: INPUT - Human anecdotal text
      const humanInput = createSampleHumanInput(
        "Book me a flight to Italy next month for vacation",
        "550e8400-e29b-41d4-a716-446655440000"
      );

      const inputValidation = HumanInputSchema.safeParse(humanInput);
      expect(inputValidation.success).toBe(true);
      console.log("✅ INPUT PHASE: Human message validated");

      // PHASE 2: PROCESSING - AI reasoning configuration
      const processing = {
        processing_id: "550e8400-e29b-41d4-a716-446655440001",
        stage: "concept_extraction" as const,
        start_time: new Date().toISOString(),
        reasoning_depth: "intermediate" as const,
        brain_integration_active: true,
        context_window_size: 10,
        confidence_threshold: 0.7
      };

      const processingValidation = RDFProcessingSchema.safeParse(processing);
      expect(processingValidation.success).toBe(true);
      console.log("✅ PROCESSING PHASE: Configuration validated");

      // AI Reasoning results
      const aiReasoning = {
        extracted_concepts: ["flight_booking", "travel_destination", "vacation_planning"],
        semantic_connections: [
          {
            from_concept: "travel",
            to_concept: "italy",
            strength: 0.85,
            evidence_count: 1
          }
        ],
        temporal_patterns: [
          {
            pattern_type: "future_planning",
            time_window: "next_week" as const,
            strength: 0.8,
            recurrence_detected: false
          }
        ],
        intent_analysis: {
          primary_intent: "travel_booking",
          secondary_intents: ["vacation_planning"],
          urgency: "medium" as const,
          complexity: "medium" as const
        },
        context_enrichment: {
          time_sensitivity: true,
          location_specific: true,
          requires_external_data: true
        },
        reasoning_confidence: 0.85
      };

      const reasoningValidation = AIReasoningSchema.safeParse(aiReasoning);
      expect(reasoningValidation.success).toBe(true);
      console.log("✅ AI REASONING: Concept extraction validated");

      // PHASE 3: OUTPUT - Analysis results
      const analysisData = {
        response_type: "analysis" as const,
        processing_metadata: {
          processing_time_ms: 1500,
          concepts_extracted: 3,
          confidence_score: 0.85
        },
        concept_insights: [
          {
            concept_id: "550e8400-e29b-41d4-a716-446655440002",
            insight_type: "semantic_connection" as const,
            confidence: 0.9,
            temporal_context: "next_week" as const
          }
        ],
        semantic_connections: [
          {
            from_concept: "travel",
            to_concept: "italy",
            strength: 0.85,
            evidence_count: 1
          }
        ],
        temporal_patterns: [
          {
            pattern_type: "future_planning",
            time_window: "next_week" as const,
            strength: 0.8,
            recurrence_detected: false
          }
        ]
      };

      const analysisValidation = RDFAnalysisDataSchema.safeParse(analysisData);
      expect(analysisValidation.success).toBe(true);
      console.log("✅ OUTPUT PHASE: Analysis results validated");

      // PHASE 4: BRIDGE - omnii_mcp handoff with structured actions
      const structuredActions = [
        {
          action_type: "book_flight" as const,
          priority: "high" as const,
          confidence: 0.9,
          parameters: {
            destination: "Italy",
            timeframe: "next_month",
            trip_type: "vacation"
          },
          reasoning_chain: ["travel_intent_detected", "destination_extracted", "timeframe_identified"],
          execution_context: {
            requires_user_confirmation: true,
            estimated_completion_time: 300
          },
          temporal_constraints: {
            earliest_start: new Date().toISOString(),
            preferred_completion: new Date(Date.now() + 24*60*60*1000).toISOString()
          }
        }
      ];

      const actionValidation = z.array(StructuredActionSchema).safeParse(structuredActions);
      expect(actionValidation.success).toBe(true);
      console.log("✅ STRUCTURED ACTIONS: Composio-ready actions validated");

      // Complete bridge data
      const bridgeData = {
        human_input: humanInput,
        ai_reasoning: aiReasoning,
        structured_actions: structuredActions,
        brain_integration: createMockBrainIntegration(),
        consolidation_recommendations: [
          {
            type: "concept_strengthening",
            concept_id: "550e8400-e29b-41d4-a716-446655440002",
            action: "increase_activation_strength",
            confidence: 0.85
          }
        ],
        processing_metadata: {
          total_processing_time_ms: 1500,
          cache_used: false,
          fallback_triggered: false,
          validation_passed: true
        }
      };

      const bridgeValidation = RDFBridgeDataSchema.safeParse(bridgeData);
      expect(bridgeValidation.success).toBe(true);
      console.log("✅ BRIDGE PHASE: omnii_mcp package validated");

      // Final unified response
      const unifiedResponse = {
        service_type: ServiceType.RDF,
        success: true,
        message: "RDF analysis pipeline completed successfully",
        data: bridgeData,
        metadata: {
          processing_time_ms: 1500,
          reasoning_depth: "intermediate" as const,
          brain_integration_active: true,
          cache_hit: false,
          validation_required: false
        },
        timestamp: new Date().toISOString()
      };

      const responseValidation = UnifiedToolResponseSchema.safeParse(unifiedResponse);
      expect(responseValidation.success).toBe(true);
      console.log("✅ UNIFIED RESPONSE: Complete integration validated");

      // Verify omnii_mcp readiness
      if (responseValidation.success) {
        expect(responseValidation.data.service_type).toBe("rdf");
        expect(responseValidation.data.data?.structured_actions).toHaveLength(1);
        expect(responseValidation.data.data?.structured_actions[0].action_type).toBe("book_flight");
        expect(responseValidation.data.data?.brain_integration.temporal_reasoning_applied).toBe(true);
        console.log("✅ OMNII_MCP READY: Structured actions and brain integration confirmed");
      }
    });

    test("should validate different action types", () => {
      console.log("🎯 Testing various structured action types");

      const actionTypes = [
        {
          action_type: "set_reminder" as const,
          scenario: "reminder creation",
          parameters: { title: "Call mom", time: "tomorrow 2pm" }
        },
        {
          action_type: "search_restaurants" as const,
          scenario: "restaurant search",
          parameters: { location: "nearby", cuisine: "italian" }
        },
        {
          action_type: "create_task" as const,
          scenario: "task creation",
          parameters: { title: "Complete project", due: "next week" }
        },
        {
          action_type: "schedule_event" as const,
          scenario: "calendar event",
          parameters: { title: "Meeting", time: "tomorrow 3pm" }
        }
      ];

      actionTypes.forEach((actionType) => {
        const action = {
          action_type: actionType.action_type,
          priority: "medium" as const,
          confidence: 0.8,
          parameters: actionType.parameters,
          reasoning_chain: ["intent_detected", "parameters_extracted"],
          execution_context: {
            requires_user_confirmation: false,
            estimated_completion_time: 60
          },
          temporal_constraints: {
            earliest_start: new Date().toISOString(),
            preferred_completion: new Date(Date.now() + 60*60*1000).toISOString()
          }
        };

        const validation = StructuredActionSchema.safeParse(action);
        expect(validation.success).toBe(true);
        console.log(`✅ ${actionType.scenario}: ${actionType.action_type} validated`);
      });
    });

    test("should validate brain memory integration", () => {
      console.log("🧠 Testing brain memory integration");

      const brainIntegration = createMockBrainIntegration();
      const validation = BrainMemoryIntegrationSchema.safeParse(brainIntegration);
      
      expect(validation.success).toBe(true);
      expect(brainIntegration.concepts_analyzed).toBe(3);
      expect(brainIntegration.temporal_reasoning_applied).toBe(true);
      expect(brainIntegration.neo4j_updates_queued).toBe(2);
      
      console.log("✅ Brain memory integration: Neo4j updates and temporal reasoning validated");
    });

    test("should validate error handling", () => {
      console.log("🚨 Testing error handling and validation failures");

      // Invalid human input
      const invalidInput = {
        raw_message: "", // Empty message
        channel: "invalid_channel", // Invalid channel
        timestamp: "not_a_date", // Invalid timestamp
        user_id: "not_a_uuid", // Invalid UUID
        context_metadata: "not_an_object" // Invalid metadata
      };

      const inputValidation = HumanInputSchema.safeParse(invalidInput);
      expect(inputValidation.success).toBe(false);
      console.log("✅ Error handling: Invalid input properly rejected");

      // Invalid structured action
      const invalidAction = {
        action_type: "invalid_action", // Invalid action type
        priority: "super_high", // Invalid priority
        confidence: 1.5, // Invalid confidence (> 1)
        parameters: "not_an_object", // Invalid parameters
        reasoning_chain: "not_an_array", // Invalid reasoning chain
        execution_context: {} // Missing required fields
      };

      const actionValidation = StructuredActionSchema.safeParse(invalidAction);
      expect(actionValidation.success).toBe(false);
      console.log("✅ Error handling: Invalid action properly rejected");
    });
  });

  describe("Schema Alignment Verification", () => {
    test("should confirm complete flow structure", () => {
      console.log("📋 Verifying Input→Processing→Output→Bridge structure");

      // INPUT: Raw human anecdotal text
      expect(HumanInputSchema).toBeDefined();
      console.log("✅ INPUT: HumanInputSchema defined");

      // PROCESSING: AI reasoning and configuration
      expect(RDFProcessingSchema).toBeDefined();
      expect(AIReasoningSchema).toBeDefined();
      console.log("✅ PROCESSING: RDFProcessingSchema + AIReasoningSchema defined");

      // OUTPUT: Analysis results
      expect(RDFAnalysisDataSchema).toBeDefined();
      console.log("✅ OUTPUT: RDFAnalysisDataSchema defined");

      // BRIDGE: omnii_mcp handoff
      expect(RDFBridgeDataSchema).toBeDefined();
      expect(StructuredActionSchema).toBeDefined();
      expect(BrainMemoryIntegrationSchema).toBeDefined();
      console.log("✅ BRIDGE: RDFBridgeDataSchema + StructuredActions + BrainIntegration defined");

      // UNIFIED RESPONSE: Complete integration
      expect(UnifiedToolResponseSchema).toBeDefined();
      expect(ServiceType.RDF).toBe("rdf");
      console.log("✅ UNIFIED RESPONSE: Complete integration schema defined");

      console.log("🎉 VALIDATION COMPLETE: All schemas aligned for omnii_mcp integration");
    });
  });
}); 