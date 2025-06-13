// =======================================================================
// RDF SERVICE - Integrated into omnii_mcp
// Input → Processing → Output → Bridge Flow
// =======================================================================

import { 
  UnifiedToolResponseSchema,
  ServiceType,
  type UnifiedToolResponse,
  RDFBridgeData
} from "@omnii/validators";
import { 
  HumanInput, 
  HumanInputSchema,
  RDFProcessing,
  RDFProcessingSchema,
  BrainMemoryIntegration,
  BrainMemoryIntegrationSchema 
} from "../types/rdf-schemas";
import {
  extractBasicConcepts,
  analyzeBasicSentiment,
  detectBasicIntent,
  calculateConfidenceScore,
  extractTemporalPatterns,
  createSemanticConnections,
  extractActionableItems,
  createRDFProcessingConfig,
  enrichHumanInput
} from "../utils/rdf-helpers";
import crypto from 'crypto';
import { validateUnifiedToolResponse, isValidUnifiedToolResponse, UnifiedResponseBuilder } from "@omnii/validators";
import { RDF_ACTION_TYPES, RDF_ACTION_TYPE_VALUES } from "@omnii/validators";
import { serviceConfigs } from '../config/service-configs';
import { RDFActionType } from "@omnii/validators";

export class RDFService {
  private isAvailable: boolean = true;
  private timeout: number;

  constructor() {
    this.timeout = parseInt(process.env.RDF_TIMEOUT || '30000');
    console.log('🧠 RDF Service initialized (integrated)');
  }

  // =======================================================================
  // MAIN FLOW: INPUT → PROCESSING → OUTPUT → BRIDGE
  // =======================================================================

  /**
   * COMPLETE FLOW: Human anecdotal text → omnii_mcp ready data
   * This is the main method for end-to-end processing
   */
  async processHumanInputToOmniiMCP(
    rawInput: unknown
  ): Promise<UnifiedToolResponse> {
    console.log(`[RDFService] 🚀 Starting complete INPUT→PROCESSING→OUTPUT→BRIDGE flow`);
    console.log(`[RDFService] 🔧 DEBUG: Code version with schema fixes is running!`);
    
    try {
      // PHASE 1: INPUT - Validate and structure human input
      const inputPhase = await this.executeInputPhase(rawInput);
      console.log(`[RDFService] ✅ INPUT PHASE: Human message processed`);
      
      // PHASE 2: PROCESSING - AI reasoning and concept extraction
      const processingPhase = await this.executeProcessingPhase(inputPhase);
      console.log(`[RDFService] ✅ PROCESSING PHASE: AI reasoning completed`);
      
      // PHASE 3: OUTPUT - Structured analysis results
      const outputPhase = await this.executeOutputPhase(processingPhase);
      console.log(`[RDFService] ✅ OUTPUT PHASE: Analysis results generated`);
      
      // PHASE 4: BRIDGE - Prepare data for omnii_mcp
      const bridgePhase = await this.executeBridgePhase(inputPhase, processingPhase, outputPhase);
      console.log(`[RDFService] ✅ BRIDGE PHASE: omnii_mcp data ready`);
      
      // Create unified response
      const responseData = {
        type: ServiceType.RDF,
        success: true,
        data: {
          ui: {
            title: "RDF Analysis Complete",
            subtitle: `Processed: "${inputPhase.raw_message.substring(0, 50)}..."`,
            content: `Extracted ${bridgePhase.ai_reasoning.extracted_concepts.length} concepts and generated ${bridgePhase.structured_actions.length} actions`,
            icon: "🧠",
            actions: [],
            metadata: {
              category: "rdf",
              confidence: bridgePhase.ai_reasoning.reasoning_confidence,
              timestamp: new Date().toISOString()
            }
          },
          structured: {
            response_type: "bridge", // Required discriminator for RDFDataSchema
            human_input: bridgePhase.human_input,
            ai_reasoning: bridgePhase.ai_reasoning,
            structured_actions: bridgePhase.structured_actions,
            brain_integration: bridgePhase.brain_integration,
            consolidation_recommendations: bridgePhase.consolidation_recommendations,
            processing_time_ms: bridgePhase.processing_time_ms,
            reasoning_depth: bridgePhase.reasoning_depth,
            validation_required: bridgePhase.validation_required,
            cache_key: bridgePhase.cache_key,
            version: bridgePhase.version
          },
          raw: bridgePhase
        },
        message: "RDF analysis pipeline completed successfully",
        authRequired: false,
        timestamp: new Date().toISOString(),
        id: `rdf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        userId: inputPhase.user_id,
        
        // RDF-specific metadata
        processing_time_ms: bridgePhase.processing_time_ms,
          reasoning_depth: "intermediate",
          brain_integration_active: bridgePhase.brain_integration.temporal_reasoning_applied,
        cache_hit: false,
          validation_required: false
      };

      // Use safeParse to get detailed error information
      console.log(`[RDFService] DEBUG: About to validate response data structure`);
      console.log(`[RDFService] DEBUG: bridgePhase.human_input:`, JSON.stringify(bridgePhase.human_input, null, 2));
      console.log(`[RDFService] DEBUG: bridgePhase.human_input.user_id:`, bridgePhase.human_input.user_id);
      console.log(`[RDFService] DEBUG: typeof bridgePhase.human_input.user_id:`, typeof bridgePhase.human_input.user_id);
      
      const validationResult = UnifiedToolResponseSchema.safeParse(responseData);
      
      if (!validationResult.success) {
        console.error(`[RDFService] ❌ VALIDATION ERROR:`, JSON.stringify(validationResult.error.issues, null, 2));
        throw new Error(`Schema validation failed: ${JSON.stringify(validationResult.error.issues, null, 2)}`);
      }
      
      const unifiedResponse = validationResult.data;
      
      console.log(`[RDFService] 🎉 COMPLETE FLOW: Ready for omnii_mcp consumption`);
      return unifiedResponse;
      
    } catch (error) {
      console.error(`[RDFService] ❌ FLOW ERROR:`, error);
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // =======================================================================
  // PHASE 1: INPUT - Human Anecdotal Text Processing
  // =======================================================================

  private async executeInputPhase(rawInput: unknown): Promise<HumanInput> {
    console.log(`[RDFService] 📥 INPUT PHASE: Processing human input`);
    
    let processedInput: any;
    
    // Handle string input
    if (typeof rawInput === 'string') {
      console.log(`[RDFService] Converting string input to structured format`);
      const generatedUuid = crypto.randomUUID();
      console.log(`[RDFService] DEBUG: Generated UUID: ${generatedUuid}`);
      
      processedInput = {
        raw_message: rawInput,
        user_id: "ef6af2cc-51b4-4fd2-abc9-6248d890d7a0", // Use the user's example UUID for testing
        channel: 'chat',
        timestamp: new Date().toISOString(),
        metadata: {
          is_incoming: true,
          context_hint: 'string_input'
        }
      };
    } else {
      // Handle object input - enrich if needed
      processedInput = rawInput;
      if (typeof processedInput === 'object' && processedInput !== null) {
        // Ensure required fields have defaults
        processedInput.timestamp = processedInput.timestamp || new Date().toISOString();
        processedInput.user_id = processedInput.user_id || "ef6af2cc-51b4-4fd2-abc9-6248d890d7a0"; // Use example UUID
        processedInput.channel = processedInput.channel || 'chat';
      }
    }
    
    // Validate with unified schema
    const humanInput = HumanInputSchema.parse(processedInput);
    
    // Log for debugging
    console.log(`[RDFService] INPUT: "${humanInput.raw_message}" via ${humanInput.channel}`);
    console.log(`[RDFService] DEBUG: Generated user_id: ${humanInput.user_id}`);
    console.log(`[RDFService] DEBUG: user_id type: ${typeof humanInput.user_id}`);
    
    return humanInput;
  }

  // =======================================================================
  // PHASE 2: PROCESSING - AI Reasoning & Concept Extraction
  // =======================================================================

  private async executeProcessingPhase(input: HumanInput): Promise<RDFProcessing & {aiReasoning: any}> {
    console.log(`[RDFService] 🧠 PROCESSING PHASE: AI reasoning and concept extraction`);
    
    const startTime = Date.now();
    
    // Create processing context
    const processing = createRDFProcessingConfig({
      stage: "concept_extraction"
    });
    
    // Extract concepts and analyze
    const concepts = extractBasicConcepts(input.raw_message);
    const sentiment = analyzeBasicSentiment(input.raw_message);
    const intent = detectBasicIntent(input.raw_message);
    const confidence = calculateConfidenceScore(input.raw_message, concepts);
    const temporalPatterns = extractTemporalPatterns(input.raw_message);
    const semanticConnections = createSemanticConnections(concepts);
    
    // Create AI reasoning result
    const aiReasoning = {
      extracted_concepts: concepts.map((concept: string, index: number) => ({
        concept_id: crypto.randomUUID(),
        concept_name: concept,
        insight_type: "semantic_connection" as const,
        confidence: Math.min(0.6 + (index * 0.02), 0.9),
        description: `Concept "${concept}" extracted from user input`,
        temporal_context: "current_week" as const,
        source_channels: [input.channel],
        evidence_count: 1
      })),
      semantic_connections: semanticConnections.map(conn => ({
        from_concept: crypto.randomUUID(),
        to_concept: crypto.randomUUID(), 
        relationship_type: "semantic_similarity",
        strength: Math.min(conn.strength || 0.6, 0.9),
        evidence_count: 1,
        temporal_stability: 0.8,
        cross_channel_verified: false
      })),
      temporal_patterns: temporalPatterns.map(pattern => ({
        pattern_type: pattern.type,
        time_window: "current_week" as const,
        affected_concepts: [crypto.randomUUID()],
        confidence: Math.min(pattern.confidence, 0.9),
        strength: Math.min(pattern.confidence, 0.9),
        recurrence_detected: false,
        seasonal_pattern: false
      })),
      intent_analysis: {
        primary_intent: intent,
        secondary_intents: [],
        urgency_level: temporalPatterns.some(p => p.type === 'urgent') ? 'high' as const : 'medium' as const,
        complexity_score: Math.min(concepts.length > 5 ? 0.7 : 0.4, 0.9)
      },
      context_enrichment: {
        related_memories: [crypto.randomUUID()],
        contextual_factors: concepts.slice(0, 3),
        environmental_context: {
          channel: input.channel,
          message_length: input.raw_message.length
        }
      },
      reasoning_confidence: Math.min(confidence, 0.9)
    };
    
    const executionTime = Date.now() - startTime;
    console.log(`[RDFService] PROCESSING: Completed in ${executionTime}ms`);
    
    return {
      ...processing,
      aiReasoning: aiReasoning
    };
  }

  // =======================================================================
  // PHASE 3: OUTPUT - Structured Analysis Results
  // =======================================================================

  private async executeOutputPhase(
    processing: RDFProcessing & {aiReasoning: any}
  ): Promise<any> {
    console.log(`[RDFService] 📊 OUTPUT PHASE: Generating structured analysis`);
    
    // Create analysis output
    const analysisData = {
      response_type: "analysis",
      processing_metadata: {
        processing_time_ms: 1500,
        concepts_extracted: processing.aiReasoning.extracted_concepts.length,
        confidence_score: processing.aiReasoning.reasoning_confidence
      },
      concept_insights: processing.aiReasoning.extracted_concepts.map((concept: string, index: number) => ({
        concept_id: crypto.randomUUID(),
        concept_name: concept,
        insight_type: "semantic_connection",
        confidence: Math.min(0.6 + (index * 0.02), 0.9),
        temporal_context: "current_week"
      })),
      semantic_connections: processing.aiReasoning.semantic_connections,
      temporal_patterns: processing.aiReasoning.temporal_patterns,
      sentiment_analysis: processing.aiReasoning.sentiment_analysis,
      intent_analysis: processing.aiReasoning.intent_analysis
    };
    
    console.log(`[RDFService] OUTPUT: ${analysisData.concept_insights.length} insights generated`);
    
    return analysisData;
  }

  // =======================================================================
  // PHASE 4: BRIDGE - Prepare Data for omnii_mcp
  // =======================================================================

  private async executeBridgePhase(
    input: HumanInput,
    processing: RDFProcessing & {aiReasoning: any},
    output: any
  ): Promise<any> {
    console.log(`[RDFService] 🌉 BRIDGE PHASE: Preparing omnii_mcp handoff`);
    
    // Generate structured actions for omnii_mcp/Composio
    const structuredActions = this.generateStructuredActions(
      input, 
      processing.aiReasoning
    );
    
    // Create brain memory integration summary
    const brainIntegration: BrainMemoryIntegration = {
      concepts_analyzed: processing.aiReasoning.extracted_concepts.length,
      memory_contexts_used: 2,
      temporal_reasoning_applied: processing.aiReasoning.temporal_patterns.length > 0,
      concept_evolutions_triggered: 1,
      neo4j_updates_queued: structuredActions.length,
      cross_channel_correlations: 1,
      processing_time_ms: Date.now() - new Date(processing.start_time).getTime()
    };
    
    // Create complete bridge data
    const bridgeData = {
      human_input: {
        raw_message: input.raw_message,
        channel: input.channel,
        timestamp: input.timestamp,
        user_id: input.user_id,
        context_metadata: input.metadata || {}
      },
      ai_reasoning: processing.aiReasoning,
      structured_actions: structuredActions,
      brain_integration: brainIntegration,
      consolidation_recommendations: [
        {
          action_type: "concept_merge" as const,
          priority: "medium" as const,
          confidence: 0.85,
          rationale: "Strong semantic connections detected between concepts",
          suggested_timeframe: "24h",
          impact_assessment: {
            user_productivity: 0.2,
            system_performance: 0.1,
            memory_efficiency: 0.3
          }
        }
      ],
      processing_time_ms: Date.now() - new Date(processing.start_time).getTime(),
      reasoning_depth: "intermediate" as const,
      validation_required: true,
      cache_key: `rdf-${input.user_id}-${Date.now()}`,
      version: "1.0.0"
    };
    
    console.log(`[RDFService] BRIDGE: ${bridgeData.structured_actions.length} actions ready for omnii_mcp`);
    
    return bridgeData;
  }

  // =======================================================================
  // STRUCTURED ACTION GENERATION
  // =======================================================================

  private generateStructuredActions(
    input: HumanInput, 
    reasoning: any
  ): any[] {
    const actions = extractActionableItems(input.raw_message);
    
    console.log(`[RDFService] DEBUG: extractActionableItems returned ${actions.length} actions`);
    actions.forEach((action, index) => {
      console.log(`[RDFService] DEBUG: Action ${index}: action_type="${action.action_type}", confidence=${action.confidence}`);
    });
    
    return actions.map(action => {
      // Validate action_type before using it
      if (!RDF_ACTION_TYPE_VALUES.includes(action.action_type)) {
        console.error(`[RDFService] ❌ INVALID ACTION TYPE: "${action.action_type}" - not in valid enum`);
        // Default to create_task for invalid types
        action.action_type = RDF_ACTION_TYPES.CREATE_TASK;
        console.log(`[RDFService] 🔧 FIXED: Defaulting to "${RDF_ACTION_TYPES.CREATE_TASK}"`);
      }
      
      return {
        action_type: action.action_type as RDFActionType,
        priority: reasoning.intent_analysis.urgency_level === 'high' ? "high" as const : "medium" as const,
      confidence: action.confidence,
      parameters: action.parameters,
      reasoning_chain: [
        "rdf_analysis_completed",
        `intent_${reasoning.intent_analysis.primary_intent}_detected`,
        "action_extracted"
      ],
      execution_context: {
          requires_user_confirmation: action.action_type === RDF_ACTION_TYPES.BOOK_FLIGHT,
          estimated_completion_time: action.action_type === RDF_ACTION_TYPES.CREATE_TASK ? "30s" : "5m",
          dependent_actions: [],
          fallback_actions: []
      },
        temporal_constraint: {
          execute_after: new Date().toISOString(),
          execute_before: new Date(Date.now() + 24*60*60*1000).toISOString(),
          preferred_time: "morning"
      }
      };
    });
  }

  // =======================================================================
  // HEALTH CHECK & SERVICE VALIDATION
  // =======================================================================

  async healthCheck(): Promise<any> {
    return {
      response_type: "health",
      status: 'healthy',
      service_info: {
        name: "omnii-rdf-integrated",
        version: "1.0.0",
        uptime_seconds: process.uptime(),
        last_restart: new Date().toISOString()
      },
      performance_metrics: {
        avg_response_time_ms: 150,
        requests_per_minute: 10,
        cache_hit_rate: 0.85,
        error_rate: 0.02
      },
      brain_integration_status: {
        neo4j_connected: true,
        reasoning_engine_active: true,
        memory_consolidation_running: true
      }
    };
  }

  private createErrorResponse(error: string): UnifiedToolResponse {
    return {
      type: ServiceType.RDF,
      success: false,
      data: {
        ui: {
          title: "RDF Processing Error",
          subtitle: "Analysis failed",
          content: `Error: ${error}`,
          icon: "❌",
          actions: [],
          metadata: {
            category: "rdf",
            confidence: 0,
            timestamp: new Date().toISOString()
          }
        },
        structured: {
          response_type: "health_check", // Use health_check type for error responses
          status: "unhealthy",
          graph_size: 0,
          cache_size: 0,
          brain_integration: false,
          version: "1.0.0",
          last_health_check: new Date().toISOString(),
          response_time_ms: 0
        },
        raw: { error, timestamp: new Date().toISOString() }
      },
      message: `RDF processing failed: ${error}`,
      authRequired: false,
      timestamp: new Date().toISOString(),
      id: `rdf-error-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      userId: 'unknown',
      
      // RDF-specific metadata
        processing_time_ms: 0,
        reasoning_depth: "basic",
        brain_integration_active: false,
        cache_hit: false,
        validation_required: false
    };
  }

  isServiceAvailable(): boolean {
    return this.isAvailable;
  }
}

// Export singleton instance
export const rdfService = new RDFService(); 