import {
  WebSocketMessage,
  WebSocketResponse,
  WebSocketMessageType,
  WebSocketResponseStatus,
  CommandType,
  CommandPayload,
} from "../../types/websocket.types";
import { ActionPlanner } from "./action-planner";
import { EntityManager } from "../rdf/entity-recognizer";
import {
  ExecutionContext,
  PlanState,
  ExecutionContextType,
  BrainMemoryContext,
  ResponseCategory,
  StepResult,
} from "../../types/action-planning.types";
import { TimezoneManager } from "../integrations/timezone-manager";
import { UnifiedGoogleManager } from "../integrations/unified-google-manager";
import { InterventionManager } from "../workflows/intervention-manager";
import { rdfServiceClient } from "../rdf/rdf-client";
import { randomBytes } from "crypto";
import responseManager from "../workflows/response-manager";
import { getObjectStructure, logObjectStructure } from "../../utils/object-structure";
import { isValidUnifiedToolResponse } from "@omnii/validators";
import { productionBrainService } from "../../config/neo4j.config";

// Import our new context services
import { contextRelevanceEngine, RelevantContext, CachedConcept } from "../context/context-relevance-engine";
import { contextSummarizer, ContextPrompt } from "../context/context-summarizer";
import { EmailData, TaskData, CalendarData, ContactData } from '@omnii/validators';
import { OpenAI } from 'openai';

// Use Elysia's WebSocket type
interface ElysiaWebSocket {
  send: (message: string) => void;
  readyState: number;
}

/**
 * Enhanced WebSocket Handler with AI Context Integration
 * 
 * Integrates cached memory data (emails, tasks, calendar, contacts, Neo4j concepts) 
 * as intelligent context for chat conversations, creating a ChatGPT/Claude-like 
 * experience with semantic understanding and automatic task/action creation.
 */
export class EnhancedWebSocketHandler {
  // Simple: userId → WebSocket connection
  private connections = new Map<string, ElysiaWebSocket>();
  private actionPlanner: ActionPlanner;
  private timezoneManager: TimezoneManager;
  private googleManager: UnifiedGoogleManager;
  private interventionManager: InterventionManager;
  private entityManager: EntityManager;
  private rdfService: {
    processHumanInputToOmniiMCP: (message: string) => Promise<any>;
  };

  // Context service instances
  private contextEngine = contextRelevanceEngine;
  private contextSummarizer = contextSummarizer;
  private openai: OpenAI;

  constructor() {
    this.timezoneManager = new TimezoneManager();
    this.googleManager = new UnifiedGoogleManager();
    this.interventionManager = new InterventionManager(this as any);
    this.actionPlanner = new ActionPlanner(this.interventionManager);
    this.entityManager = new EntityManager();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Create RDF service adapter that connects to Python service on Railway
    this.rdfService = {
      processHumanInputToOmniiMCP: async (message: string) => {
        try {
          console.log(`[EnhancedWebSocket] 🚀 RDF Client: Connecting to Python service on Railway internal network`);
          
          // Use the RDF client to connect to Python service
          const result = await rdfServiceClient.processRDFRequest({
            text: message,
            domain: 'contact_communication',
            task: 'message_analysis',
            extractors: ['contact_names', 'communication_intent', 'context_clues', 'formality_level', 'urgency_indicators']
          });
          
          console.log(`[EnhancedWebSocket] ✅ RDF Client: Received response from Python service`);
          
          // Transform the result to match the expected interface
          return {
            success: true,
            data: {
              structured: {
                ai_reasoning: {
                  extracted_concepts: result.concepts || [],
                  intent_analysis: {
                    primary_intent: result.intent || 'unknown',
                    confidence: result.confidence || 0.5,
                    urgency_level: result.urgency_level || 'medium'
                  }
                },
                structured_actions: result.actions || []
              }
            }
          };
        } catch (error) {
          console.warn(`[EnhancedWebSocket] ⚠️ RDF Client: Failed to connect to Python service:`, error);
          // Return a graceful fallback response
          return {
            success: false,
            data: {
              structured: {
                ai_reasoning: {
                  extracted_concepts: [],
                  intent_analysis: {
                    primary_intent: 'unknown',
                    confidence: 0,
                    urgency_level: 'medium'
                  }
                },
                structured_actions: []
              }
            }
          };
        }
      }
    };
  }

  /**
   * Register a connection for a user ID
   */
  registerConnectionForUser(userId: string, ws: ElysiaWebSocket): void {
    console.log(`[EnhancedWebSocket] 📝 Registering connection for user: ${userId}`);
    this.connections.set(userId, ws);
  }

  /**
   * Remove connection for a user ID
   */
  removeConnectionForUser(userId: string): void {
    console.log(`[EnhancedWebSocket] 🗑️ Removing connection for user: ${userId}`);
    this.connections.delete(userId);
  }

  /**
   * Get list of connected user IDs
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Send initial context awareness message following Shape of AI patterns
   */
  private sendContextAwareness(userId: string): void {
    const welcomeMessage = {
      type: 'ai_capability_disclosure',
      title: '🤖 AI Assistant Ready',
      content: 'I can access your emails, tasks, calendar, and brain concepts to provide contextual assistance.',
      capabilities: [
        'Context-aware responses using your cached data',
        'Smart task creation from conversations', 
        'Proactive suggestions based on your patterns',
        'Transparent reasoning with source citations'
      ],
      data_sources: [
        'Recent emails and communications',
        'Task lists and due dates',
        'Calendar events and scheduling',
        'Brain concepts and knowledge graph'
      ]
    };
    
    this.sendToClient(userId, welcomeMessage);
  }

  /**
   * Process incoming WebSocket message with context awareness
   */
  async processMessage(
    message: WebSocketMessage,
    ws: ElysiaWebSocket
  ): Promise<WebSocketResponse | any> {
    try {
      console.log(`[EnhancedWebSocket] 🚀 Processing context-aware message:`, message);
      
      // Validate message
      if (!message.type) {
        return {
          status: WebSocketResponseStatus.ERROR,
          data: { error: "Invalid message format: missing type" },
          timestamp: Date.now(),
        };
      }

      // Register connection by userId when we first see it
      if (message.type === WebSocketMessageType.COMMAND) {
        const payload = message.payload as CommandPayload;
        if (payload?.userId && !this.connections.has(payload.userId)) {
          this.registerConnectionForUser(payload.userId, ws);
        }
      }

      // Process message types
      switch (message.type) {
        case WebSocketMessageType.COMMAND:
          console.log(`[EnhancedWebSocket] 🚀 Processing context-aware command:`, message.payload);
          console.log(`[EnhancedWebSocket] 🔍 About to call processContextAwareCommand...`);
          const result = await this.processContextAwareCommand(message.payload);
          console.log(`[EnhancedWebSocket] 🔍 processContextAwareCommand completed:`, result);
          return result;

        case WebSocketMessageType.SYSTEM:
          console.log(`[EnhancedWebSocket] 🔧 Processing system message:`, message.payload);
          return await this.processSystemMessage(message.payload);

        case WebSocketMessageType.PING:
          return {
            status: WebSocketResponseStatus.SUCCESS,
            data: { pong: true },
            timestamp: Date.now(),
          };

        default:
          return {
            status: WebSocketResponseStatus.ERROR,
            data: { error: `Unknown message type: ${message.type}` },
            timestamp: Date.now(),
          };
      }
    } catch (error) {
      console.error("[EnhancedWebSocket] Error processing message:", error);
      return {
        status: WebSocketResponseStatus.ERROR,
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Process command messages with immediate executive assistant response
   */
  private async processContextAwareCommand(
    payload: CommandPayload
  ): Promise<WebSocketResponse | any> {
    console.log(`[EnhancedWebSocket] 🔥 ENTERING processContextAwareCommand with payload:`, payload);
    
    if (!payload?.userId) {
      console.log(`[EnhancedWebSocket] ❌ Missing userId in command`);
      return {
        status: WebSocketResponseStatus.ERROR,
        data: { error: "Missing userId in command" },
        timestamp: Date.now(),
      };
    }

    try {
      console.log(`[EnhancedWebSocket] 🧠 Processing message: "${payload.message}"`);
      console.log(`[EnhancedWebSocket] 👤 User ID: ${payload.userId}`);

      // Step 1: Quick RDF analysis to determine routing
      const rdfInsights = await this.performQuickRDFAnalysis(payload.message);
      
      // Step 2: Check if this should route to n8n agents (complex automation)
      const shouldUseN8n = this.shouldRouteToN8nAgent(payload.message, rdfInsights);
      
      if (shouldUseN8n) {
        console.log(`[EnhancedWebSocket] 🤖 Routing to n8n Agent Swarm for complex automation`);
        
        // For n8n requests, execute immediately and return the result
        const cachedData = await this.loadCachedDataForUser(payload.userId);
        const relevantContext = await this.contextEngine.analyzeRelevantContext(
          payload.message,
          rdfInsights,
          cachedData
        );
        
        const result = await this.executeWithEnhancedContext(
          payload.message,
          payload.userId,
          payload.localDatetime,
          relevantContext,
          undefined,
          rdfInsights
        );
        
        console.log(`[EnhancedWebSocket] 🤖 n8n execution completed, returning result`);
        return result;
        
      } else {
        console.log(`[EnhancedWebSocket] 💼 Using executive assistant flow for simple request`);
        
        // Step 1: Immediate executive assistant response (no waiting for context)
        await this.sendExecutiveAssistantResponse(
          payload.userId, 
          payload.message
        );

        // Step 2: Background context loading and analysis
        const cachedData = await this.loadCachedDataForUser(payload.userId);
        const relevantContext = await this.contextEngine.analyzeRelevantContext(
          payload.message,
          rdfInsights,
          cachedData
        );

        // Step 3: Send context dropdown (asynchronously, hidden by default)
        if (relevantContext.totalRelevanceScore > 0.2) {
          await this.sendContextDropdown(payload.userId, relevantContext, rdfInsights);
        }

        // Step 4: Execute actual actions (in background) and send results as follow-up messages
        this.executeWithEnhancedContext(
          payload.message,
          payload.userId,
          payload.localDatetime,
          relevantContext,
          undefined,
          rdfInsights
        ).then((result: any) => {
          console.log(`[EnhancedWebSocket] 🔍 Background execution completed!`);
          console.log(`[EnhancedWebSocket] 🔍 Result type:`, typeof result);
          console.log(`[EnhancedWebSocket] 🔍 Result keys:`, result ? Object.keys(result) : 'null');
          console.log(`[EnhancedWebSocket] 🔍 Has data:`, !!result?.data);
          console.log(`[EnhancedWebSocket] 🔍 Has unifiedResponse:`, !!result?.unifiedResponse);
          
          // Send any action results as follow-up
          if (result && (result.data || result.unifiedResponse)) {
            console.log(`[EnhancedWebSocket] 📤 Sending action result as follow-up message`);
            
            // If we have a unifiedResponse, send that (contains structured data)
            if (result.unifiedResponse) {
              console.log(`[EnhancedWebSocket] 🎯 Sending UnifiedToolResponse with structured data`);
              this.sendToClient(payload.userId, result.unifiedResponse);
            } else if (result.data) {
              console.log(`[EnhancedWebSocket] 📋 Sending regular result data`);
              this.sendToClient(payload.userId, result);
            }
          } else {
            console.log(`[EnhancedWebSocket] ⚠️ No follow-up data to send (result was empty or invalid)`);
          }
        }).catch((error: any) => {
          console.warn(`[EnhancedWebSocket] ⚠️ Background action execution failed:`, error);
        });
      }

      // Return simple success - executive response already sent
      console.log(`[EnhancedWebSocket] ✅ Executive assistant flow completed`);
      return {
        status: WebSocketResponseStatus.SUCCESS,
        data: { 
          message: "Executive assistant response sent",
          executive_flow: true,
          timestamp: Date.now()
        },
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error(`[EnhancedWebSocket] Executive assistant error:`, error);
      return {
        status: WebSocketResponseStatus.ERROR,
        data: { error: "Failed to process request" },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Analyze message type for better thinking indicators
   */
  private analyzeMessageType(message: string): string {
    const msg = message.toLowerCase();
    
    // Email indicators
    if (msg.includes('email') || msg.includes('inbox') || msg.includes('gmail') || 
        msg.includes('latest') && (msg.includes('5') || msg.includes('10') || msg.includes('emails'))) {
      return 'email';
    }
    
    // Task indicators
    if (msg.includes('task') || msg.includes('todo') || msg.includes('remind')) {
      return 'task';
    }
    
    // Calendar indicators
    if (msg.includes('calendar') || msg.includes('meeting') || msg.includes('event') || msg.includes('schedule')) {
      return 'calendar';
    }
    
    // Contact indicators
    if (msg.includes('contact') || msg.includes('phone') || msg.includes('call')) {
      return 'contact';
    }
    
    return 'general';
  }

  /**
   * Load all cached data for context analysis (simplified for proof-of-concept)
   */
  private async loadCachedDataForUser(userId: string): Promise<{
    emails?: EmailData[];
    tasks?: TaskData[];
    calendar?: CalendarData[];
    contacts?: ContactData[];
    concepts?: CachedConcept[];
  }> {
    console.log(`[EnhancedWebSocket] 🔄 Loading REAL cached data for user: ${userId}`);
    
    try {
      // Load actual cached data from your brain memory cache system
      const [concepts, cachedTasks, cachedEmails, cachedCalendar, cachedContacts] = await Promise.all([
        this.loadBrainConcepts(userId).catch(() => []),
        this.loadCachedTasks(userId).catch(() => []),
        this.loadCachedEmails(userId).catch(() => []),
        this.loadCachedCalendar(userId).catch(() => []),
        this.loadCachedContacts(userId).catch(() => [])
      ]);

      const cachedData: any = {
        emails: cachedEmails,
        tasks: cachedTasks,
        calendar: cachedCalendar,
        contacts: cachedContacts,
        concepts: concepts
      };

      console.log(`[EnhancedWebSocket] ✅ REAL cached data loaded:`);
      console.log(`[EnhancedWebSocket] 📧 Emails: ${cachedEmails.length}`);
      console.log(`[EnhancedWebSocket] ✅ Tasks: ${cachedTasks.length}`);
      console.log(`[EnhancedWebSocket] 📅 Calendar: ${cachedCalendar.length}`);
      console.log(`[EnhancedWebSocket] 👥 Contacts: ${cachedContacts.length}`);
      console.log(`[EnhancedWebSocket] 🧠 Concepts: ${concepts.length}`);
      
      return cachedData;

    } catch (error) {
      console.error(`[EnhancedWebSocket] ❌ Error loading cached data:`, error);
      return {
        emails: [],
        tasks: [],
        calendar: [],
        contacts: [],
        concepts: []
      };
    }
  }

  /**
   * Load cached tasks from brain memory cache
   */
  private async loadCachedTasks(userId: string): Promise<any[]> {
    try {
      // Use the existing ActionPlanner method
      const taskData = await this.actionPlanner['searchCachedTasks'](userId);
      return taskData?.taskLists?.flatMap((list: any) => list.tasks || []) || [];
    } catch (error) {
      console.error(`[EnhancedWebSocket] Error loading cached tasks:`, error);
      return [];
    }
  }

  /**
   * Load cached emails from brain memory cache
   */
  private async loadCachedEmails(userId: string): Promise<any[]> {
    try {
      // Use the existing ActionPlanner method
      const emailData = await this.actionPlanner['searchCachedEmails'](userId);
      return emailData?.emails || [];
    } catch (error) {
      console.error(`[EnhancedWebSocket] Error loading cached emails:`, error);
      return [];
    }
  }

  /**
   * Load cached calendar from brain memory cache
   */
  private async loadCachedCalendar(userId: string): Promise<any[]> {
    try {
      // Use the existing ActionPlanner method
      const calendarData = await this.actionPlanner['searchCachedCalendar'](userId);
      return calendarData?.events || [];
    } catch (error) {
      console.error(`[EnhancedWebSocket] Error loading cached calendar:`, error);
      return [];
    }
  }

  /**
   * Load cached contacts from brain memory cache
   */
  private async loadCachedContacts(userId: string): Promise<any[]> {
    try {
      // Use the existing ActionPlanner method - contacts are handled in entity resolution
      // For now, return empty array since contacts are loaded differently
      return [];
    } catch (error) {
      console.error(`[EnhancedWebSocket] Error loading cached contacts:`, error);
      return [];
    }
  }

  /**
   * Load brain concepts from Neo4j
   */
  private async loadBrainConcepts(userId: string): Promise<CachedConcept[]> {
    try {
      // Use the brain service to get concepts (simplified method)
      const conceptsResponse = await (productionBrainService as any).getAllConcepts?.(userId);
      
      if (!conceptsResponse?.success || !conceptsResponse.data) {
        console.log(`[EnhancedWebSocket] ⚠️ No brain concepts available for user ${userId}`);
        return [];
      }

      // Transform Neo4j concepts to CachedConcept format
      const concepts: CachedConcept[] = conceptsResponse.data.map((concept: any) => ({
        id: concept.id || concept.concept_id || `concept_${Date.now()}`,
        name: concept.name || concept.concept_name,
        content: concept.content || concept.description,
        description: concept.description,
        labels: concept.labels || [],
        properties: concept.properties || {},
        relevanceScore: concept.relevance_score || concept.relevanceScore
      }));

      console.log(`[EnhancedWebSocket] 🧠 Loaded ${concepts.length} brain concepts`);
      return concepts;

    } catch (error) {
      console.warn(`[EnhancedWebSocket] ⚠️ Failed to load brain concepts:`, error);
      return [];
    }
  }

  /**
   * Perform RDF semantic analysis
   */
  private async performRDFAnalysis(message: string): Promise<any> {
    try {
      const rdfResponse = await this.rdfService.processHumanInputToOmniiMCP(message);
      
      if (rdfResponse?.success && rdfResponse.data?.structured) {
        console.log(`[EnhancedWebSocket] ✅ RDF analysis completed`);
        return rdfResponse.data.structured;
      } else {
        console.warn(`[EnhancedWebSocket] ⚠️ RDF analysis failed, using fallback`);
        return {
          ai_reasoning: {
            extracted_concepts: [],
            intent_analysis: {
              primary_intent: 'unknown',
              confidence: 0,
              urgency_level: 'medium'
            }
          },
          structured_actions: []
        };
      }
    } catch (error) {
      console.warn(`[EnhancedWebSocket] ⚠️ RDF analysis error:`, error);
      return null;
    }
  }

  /**
   * Send thinking indicator to user (Claude-style AI transparency)
   */
  private sendThinkingIndicator(userId: string, stage: string): void {
    const thinkingMessage = {
      type: 'ai_thinking',
      stage,
      timestamp: Date.now()
    };
    this.sendToClient(userId, thinkingMessage);
  }

  /**
   * Send context display to user (show what data was considered)
   */
  private sendContextDisplay(userId: string, relevantContext: RelevantContext, contextPrompt: ContextPrompt): void {
    const contextDisplay = {
      type: 'context_display',
      title: '🔍 Context Analysis',
      totalRelevanceScore: relevantContext.totalRelevanceScore,
      reasoning: relevantContext.reasoning,
      dataTypes: contextPrompt.includedDataTypes,
      contextSummary: {
        emails: relevantContext.emailContext.relevant.length,
        tasks: relevantContext.taskContext.relevant.length,
        calendar: relevantContext.calendarContext.relevant.length,
        contacts: relevantContext.contactContext.relevant.length,
        concepts: relevantContext.conceptContext.relevant.length
      },
      confidence: {
        email: relevantContext.emailContext.confidence,
        task: relevantContext.taskContext.confidence,
        calendar: relevantContext.calendarContext.confidence,
        contact: relevantContext.contactContext.confidence,
        concept: relevantContext.conceptContext.confidence
      },
      estimatedTokens: contextPrompt.totalTokens,
      timestamp: Date.now()
    };

    this.sendToClient(userId, contextDisplay);
  }

  /**
   * Execute with enhanced context using action planner
   */
  private async executeWithEnhancedContext(
    message: string,
    userId: string,
    localDatetime?: string,
    relevantContext?: RelevantContext,
    contextPrompt?: ContextPrompt,
    rdfInsights?: any
  ): Promise<any> {
    try {
      console.log(`[EnhancedWebSocket] 🎯 Executing with enhanced context awareness`);
      
      // Generate session ID for this interaction
      const sessionId = randomBytes(16).toString("hex");

      // Get user's timezone with fallback
      const userTimezone = this.timezoneManager.getUserTimezone(userId) || "America/Los_Angeles";

      // Extract and resolve entities
      const resolvedEntities = await this.entityManager.resolveEntities(
        message,
        ExecutionContextType.WEBSOCKET,
        userId
      );
      console.log(`[EnhancedWebSocket] ✅ Resolved ${resolvedEntities.length} entities`);

      // Create enhanced execution context
      const context: ExecutionContext = {
        entityId: userId,
        phoneNumber: userId,
        userUUID: userId,
        userTimezone,
        localDatetime,
        stepResults: new Map(),
        currentStepIndex: 0,
        entities: resolvedEntities,
        sessionId,
        planState: PlanState.PENDING,
        context: ExecutionContextType.WEBSOCKET,
        communicationChannel: 'chat',
        chatMetadata: {
          chatId: `chat_${userId}`,
          isGroupChat: false,
          participants: [userId]
        },
        // Enhanced context fields
        rdfInsights: rdfInsights,
        rdfSuccess: !!rdfInsights,
        enhancedIntent: rdfInsights?.ai_reasoning?.intent_analysis ? {
          primary_intent: rdfInsights.ai_reasoning.intent_analysis.primary_intent || 'unknown',
          confidence: rdfInsights.ai_reasoning.intent_analysis.confidence || 0,
          urgency_level: rdfInsights.ai_reasoning.intent_analysis.urgency_level || 'medium'
        } : undefined,
                 // Context awareness fields (stored in metadata for now)
         // relevantContext - TODO: Add to ExecutionContext type
         // contextPrompt - TODO: Add to ExecutionContext type  
         // contextTokens - TODO: Add to ExecutionContext type
      };

      // Create and execute plan with enhanced context
      console.log(`[EnhancedWebSocket] 🎯 Creating context-aware action plan...`);
      const plan = await this.actionPlanner.createPlan(
        message,
        resolvedEntities,
        userId,
        context
      );
      console.log(`[EnhancedWebSocket] 📝 Plan created with ${plan.steps.length} steps using context`);

      console.log(`[EnhancedWebSocket] ⚡ Executing context-aware plan...`);
      const result = await this.actionPlanner.executePlan(plan, context);
      console.log(`[EnhancedWebSocket] 🏁 Context-aware execution ${result.success ? "completed" : "failed"}`);

      // Store conversation in brain memory (async)
      this.storeChatInBrainMemory(
        userId,
        message,
        `chat_${userId}`,
        true,
        localDatetime,
        result.success
      ).catch((error: any) => {
        console.warn(`[EnhancedWebSocket] ⚠️ Failed to store chat in brain memory:`, error);
      });

      // ✅ NEW: Check for n8n agent responses first
      if (result.stepResults && result.stepResults.length > 0) {
        for (const stepResult of result.stepResults) {
          if (this.isN8nAgentResponse(stepResult)) {
            console.log(`[EnhancedWebSocket] 🤖 Detected n8n agent response, formatting for mobile app`);
            const n8nResponse = this.handleN8nAgentResponse(stepResult);
            if (n8nResponse) {
              return n8nResponse;
            }
          }
        }
      }

      // Enhanced response processing
      if (result.unifiedResponse) {
        // Enhance with context metadata
        result.unifiedResponse.data = result.unifiedResponse.data || {};
        result.unifiedResponse.data.structured = result.unifiedResponse.data.structured || {};
        
        // Add context enhancement
        (result.unifiedResponse.data.structured as any).context_enhancement = {
          relevance_score: relevantContext?.totalRelevanceScore || 0,
          data_sources_used: contextPrompt?.includedDataTypes || [],
          context_tokens: contextPrompt?.totalTokens || 0,
          reasoning_steps: relevantContext?.reasoning || [],
          semantic_analysis: !!rdfInsights
        };

        return result.unifiedResponse;
      }

      // Convert legacy response with context enhancement
      const { UnifiedResponseBuilder, ServiceType } = await import('../../types/unified-response.types.js');
      const builder = new UnifiedResponseBuilder(ServiceType.GENERAL, userId);
      
      const convertedResponse = builder
        .setSuccess(result.success)
        .setTitle(result.success ? "✅ Request Completed" : "❌ Request Failed")
        .setContent(result.message || "Processing completed")
        .setMessage(result.message || "Request processed")
        .setAuth(result.authRequired || false, result.authUrl || undefined)
        .build();

      // Add context enhancement to structured data
      if (!convertedResponse.data.structured) {
        convertedResponse.data.structured = { content: result.message || "Request processed" } as any;
      }
      
      (convertedResponse.data.structured as any).context_enhancement = {
        relevance_score: relevantContext?.totalRelevanceScore || 0,
        data_sources_used: contextPrompt?.includedDataTypes || [],
        context_tokens: contextPrompt?.totalTokens || 0,
        reasoning_steps: relevantContext?.reasoning || [],
        semantic_analysis: !!rdfInsights
      };

      return convertedResponse;

    } catch (error) {
      console.error(`[EnhancedWebSocket] Context-aware execution error:`, error);
      return {
        success: false,
        message: "Sorry, I had trouble processing that request with context.",
        error: error instanceof Error ? error.message : "Unknown error",
        authRequired: false,
        authUrl: null,
      };
    }
  }

  /**
   * Send message to user (simple lookup by user ID)
   */
  sendToClient(userId: string, message: any): boolean {
    const ws = this.connections.get(userId);

    if (ws && ws.readyState === 1) {
      const data = typeof message === "string" ? message : JSON.stringify(message);
      console.log(`[EnhancedWebSocket] ✅ Sent context-aware message to user: ${userId}`);
      ws.send(data);
      return true;
    } else {
      console.log(`[EnhancedWebSocket] ❌ User ${userId} not connected`);
      return false;
    }
  }

  /**
   * Store chat conversation in brain memory (async)
   */
  private async storeChatInBrainMemory(
    userId: string,
    content: string,
    chatId: string,
    isIncoming: boolean,
    localDatetime?: string,
    success?: boolean
  ): Promise<void> {
    try {
      const brainManager = (productionBrainService as any)?.manager;
      if (brainManager && typeof brainManager.storeChatConversation === 'function') {
        await brainManager.storeChatConversation({
          user_id: userId,
          content: content,
          chat_id: chatId,
          is_incoming: isIncoming,
          websocket_session_id: `ws_${userId}_${Date.now()}`,
          is_group_chat: false,
          participants: [userId],
          google_service_context: success ? {
            service_type: 'tasks',
            operation: 'context_aware_chat_processed',
            entity_ids: [userId]
          } : undefined
        });
        console.log(`[EnhancedWebSocket] 🧠💾 Stored context-aware chat in brain memory`);
      }
    } catch (error) {
      console.error(`[EnhancedWebSocket] ❌ Brain memory storage failed:`, error);
    }
  }

  /**
   * Process system messages (interventions, etc.)
   */
  private async processSystemMessage(payload: any): Promise<WebSocketResponse> {
    try {
      // Handle intervention responses
      if (payload.action === "intervention_response") {
        const { sessionId, stepId, resolvedValue } = payload;

        if (!sessionId || !stepId || !resolvedValue) {
          return {
            status: WebSocketResponseStatus.ERROR,
            data: { error: "Missing required intervention response fields" },
            timestamp: Date.now(),
          };
        }

        const success = await this.interventionManager.resolveIntervention(
          sessionId,
          stepId,
          resolvedValue
        );

        if (success) {
          return {
            status: WebSocketResponseStatus.SUCCESS,
            data: {
              message: "Intervention resolved successfully",
              sessionId,
              stepId,
              resolvedValue,
            },
            timestamp: Date.now(),
          };
        } else {
          return {
            status: WebSocketResponseStatus.ERROR,
            data: { error: "Failed to resolve intervention" },
            timestamp: Date.now(),
          };
        }
      }

      return {
        status: WebSocketResponseStatus.ERROR,
        data: { error: `Unknown system action: ${payload.action}` },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[EnhancedWebSocket] System message processing error:", error);
      return {
        status: WebSocketResponseStatus.ERROR,
        data: {
          error: error instanceof Error ? error.message : "System message failed",
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Generate conversational email response using semantic insights
   */
  private generateEmailConversationalResponse(message: string, intent: string, concepts: any[]): string {
    const msg = message.toLowerCase();
    
    // Extract specific numbers or timeframes
    const numberMatch = msg.match(/(\d+)/);
    const requestedCount = numberMatch ? parseInt(numberMatch[1]) : null;
    
    // Check for specific requests - much more conversational and helpful
    if (msg.includes('latest') || msg.includes('recent')) {
      if (requestedCount) {
        return `Perfect! I'll grab your latest ${requestedCount} emails right now. I'll prioritize what's most important and help you stay on top of your inbox so nothing important slips through.`;
      } else {
        return `I'll check your recent emails and organize them by importance. I love helping you stay on top of your communications - let me find what needs your attention most.`;
      }
    } else if (msg.includes('unread')) {
      return `Great idea to check your unread emails! I'll organize them by priority and urgency so you can efficiently tackle what's most important first. Staying organized is key!`;
    } else if (msg.includes('from') && concepts.length > 0) {
      const fromPerson = concepts.find(c => c.concept_name)?.concept_name || 'that person';
      return `I'll find all your recent conversations with ${fromPerson}. I'll organize them chronologically so you can quickly catch up on your communication history.`;
    } else if (msg.includes('who')) {
      return `I'll show you who's been reaching out to you! I'll organize your contacts by recent activity so you can see who needs responses and stay connected with important people.`;
    } else {
      return `I'm here to help you manage your email efficiently! Let me organize your inbox by priority and importance so you can focus on what matters most and stay productive.`;
    }
  }

  /**
   * Generate conversational task response using semantic insights
   */
  private generateTaskConversationalResponse(message: string, intent: string, concepts: any[]): string {
    const msg = message.toLowerCase();
    
    if (msg.includes('overdue') || msg.includes('late')) {
      return `Let's get you caught up! I'll find any overdue tasks and help you prioritize them by importance and deadline. We'll create a plan to tackle them efficiently so you can get back on track.`;
    } else if (msg.includes('today') || msg.includes('due')) {
      return `Great time to check your tasks! I'll organize what's due today and coming up soon by priority. I love helping you stay productive and on top of your commitments.`;
    } else if (msg.includes('create') || msg.includes('add')) {
      return `I'd be happy to help you create a new task! I'll set it up with the right details and suggest the best list and timing to keep you organized and efficient.`;
    } else {
      return `I'm excited to help you organize your tasks! I'll give you a clear view of everything on your plate, organized by priority and deadlines, so you can focus on what's most important and stay productive.`;
    }
  }

  /**
   * Generate conversational calendar response using semantic insights
   */
  private generateCalendarConversationalResponse(message: string, intent: string, concepts: any[]): string {
    const msg = message.toLowerCase();
    
    if (msg.includes('today') || msg.includes('schedule')) {
      return `I'll check your schedule for today and organize it clearly for you! I love helping you see your day at a glance so you can plan efficiently and make the most of your time.`;
    } else if (msg.includes('week') || msg.includes('upcoming')) {
      return `Great planning ahead! I'll review your upcoming week and highlight important meetings and deadlines. I'll help you spot any conflicts and opportunities to optimize your schedule.`;
    } else if (msg.includes('free') || msg.includes('available')) {
      return `I'll find your available time slots and organize them clearly! I love helping you optimize your schedule and find the perfect times for new activities and meetings.`;
    } else {
      return `I'm here to help you master your schedule! Let me organize your calendar information so you can plan efficiently, avoid conflicts, and make the most of your valuable time.`;
    }
  }

  /**
   * Generate conversational contact response using semantic insights
   */
  private generateContactConversationalResponse(message: string, intent: string, concepts: any[]): string {
    const msg = message.toLowerCase();
    
    if (concepts.length > 0) {
      const searchName = concepts.find(c => c.concept_name)?.concept_name || 'that person';
      return `I'll help you find ${searchName} in your contacts! I love keeping your connections organized - let me search through your address book and recent interactions to get you their current information quickly.`;
    } else if (msg.includes('search') || msg.includes('find')) {
      return `I'm excited to help you find the right contact! I'll search through names, email addresses, and companies to give you the best matches. Staying connected is so important!`;
    } else {
      return `I'm here to help you manage your contacts efficiently! Let me organize your address book and recent interactions to help you find exactly who you're looking for and stay connected with important people.`;
    }
  }

  /**
   * Send immediate conversational response using RDF semantic understanding
   */
  private async sendImmediateConversationalResponse(
    userId: string,
    message: string,
    messageType: string,
    rdfInsights: any
  ): Promise<void> {
    console.log(`[EnhancedWebSocket] 💬 STARTING immediate conversational response for: ${messageType}`);
    console.log(`[EnhancedWebSocket] 💬 User: ${userId}, Message: "${message}"`);
    
    // Extract key insights from RDF analysis
    const intent = rdfInsights?.ai_reasoning?.intent_analysis?.primary_intent || 'general';
    const urgency = rdfInsights?.ai_reasoning?.intent_analysis?.urgency_level || 'normal';
    const concepts = rdfInsights?.ai_reasoning?.extracted_concepts || [];
    
    console.log(`[EnhancedWebSocket] 💬 RDF Insights - Intent: ${intent}, Urgency: ${urgency}, Concepts: ${concepts.length}`);
    
    let conversationalResponse = '';
    
    // Generate personalized conversational response based on message type and RDF insights
    switch (messageType) {
      case 'email':
        conversationalResponse = this.generateEmailConversationalResponse(message, intent, concepts);
        console.log(`[EnhancedWebSocket] 💬 Generated EMAIL response: "${conversationalResponse.substring(0, 100)}..."`);
        break;
      case 'task':
        conversationalResponse = this.generateTaskConversationalResponse(message, intent, concepts);
        console.log(`[EnhancedWebSocket] 💬 Generated TASK response: "${conversationalResponse.substring(0, 100)}..."`);
        break;
      case 'calendar':
        conversationalResponse = this.generateCalendarConversationalResponse(message, intent, concepts);
        console.log(`[EnhancedWebSocket] 💬 Generated CALENDAR response: "${conversationalResponse.substring(0, 100)}..."`);
        break;
      case 'contact':
        conversationalResponse = this.generateContactConversationalResponse(message, intent, concepts);
        console.log(`[EnhancedWebSocket] 💬 Generated CONTACT response: "${conversationalResponse.substring(0, 100)}..."`);
        break;
      default:
        conversationalResponse = this.generateGeneralConversationalResponse(message, intent, concepts);
        console.log(`[EnhancedWebSocket] 💬 Generated GENERAL response: "${conversationalResponse.substring(0, 100)}..."`);
    }
    
    // ✅ CRITICAL: Send immediate response first, before any other processing
    const immediateMessage = {
      type: WebSocketMessageType.SYSTEM,
      data: {
        action: "immediate_response",
        message: conversationalResponse,
        reasoning: `Understanding your ${messageType} request and preparing personalized insights...`,
        metadata: {
          responseType: 'conversational',
          intent,
          urgency,
          concepts: concepts.slice(0, 3) // Top 3 concepts
        }
      },
      timestamp: Date.now(),
    };
    
    console.log(`[EnhancedWebSocket] 💬 SENDING immediate response to user ${userId}`);
    console.log(`[EnhancedWebSocket] 💬 Response type: ${immediateMessage.type}`);
    console.log(`[EnhancedWebSocket] 💬 Response action: ${immediateMessage.data.action}`);
    
    // Send the response
    const sent = this.sendToClient(userId, immediateMessage);
    
    if (sent) {
      console.log(`[EnhancedWebSocket] ✅ IMMEDIATE RESPONSE SENT SUCCESSFULLY to user ${userId}`);
    } else {
      console.error(`[EnhancedWebSocket] ❌ FAILED TO SEND immediate response to user ${userId}`);
    }
  }

  /**
   * Generate general conversational response using semantic insights
   */
  private generateGeneralConversationalResponse(message: string, intent: string, concepts: any[]): string {
    // ✅ NEW: More proactive, helpful assistant personality
    const msg = message.toLowerCase();
    
    // Proactive suggestions based on message content
    if (msg.includes('busy') || msg.includes('schedule') || msg.includes('day')) {
      return `I can help you organize your day! Let me check your calendar, tasks, and emails to see how I can make things easier for you. I'll prioritize what needs your attention most.`;
    } else if (msg.includes('behind') || msg.includes('catch up') || msg.includes('overwhelmed')) {
      return `It sounds like you might be feeling behind - I'm here to help you get organized! Let me look at your tasks, emails, and schedule to help you prioritize and catch up efficiently.`;
    } else if (msg.includes('plan') || msg.includes('organize') || msg.includes('manage')) {
      return `I love helping with planning and organization! Let me gather information from your calendar, tasks, and emails to help you create a better workflow and stay on top of everything.`;
    } else if (concepts.length > 0) {
      const mainConcept = concepts[0]?.concept_name || 'your request';
      return `I'm looking into ${mainConcept} for you. I'll check your related emails, tasks, and calendar events to give you a comprehensive view and suggest ways to help you stay organized.`;
    } else {
      return `I'm here to help you stay organized and productive! Let me check your emails, tasks, and calendar to see how I can assist you today. I'll find the most relevant information and suggest ways to help you manage everything efficiently.`;
    }
  }

  /**
   * Quick RDF analysis for immediate response (cached approach)
   */
  private async performQuickRDFAnalysis(message: string): Promise<any> {
    try {
      // Use cached RDF analysis or quick local processing
      const result = await this.rdfService.processHumanInputToOmniiMCP(message);
      return result?.data?.structured || {
        ai_reasoning: {
          intent_analysis: { primary_intent: 'unknown', urgency_level: 'normal' },
          extracted_concepts: []
        }
      };
    } catch (error) {
      console.warn(`[EnhancedWebSocket] Quick RDF analysis failed, using fallback:`, error);
      return {
        ai_reasoning: {
          intent_analysis: { primary_intent: this.extractSimpleIntent(message), urgency_level: 'normal' },
          extracted_concepts: this.extractSimpleConcepts(message)
        }
      };
    }
  }

  /**
   * Send compact data update after initial response
   */
  private async sendCompactDataUpdate(
    userId: string,
    relevantContext: any,
    messageType: string
  ): Promise<void> {
    console.log(`[EnhancedWebSocket] 📊 Sending compact data update for: ${messageType}`);
    
    // Create compact data summary
    const compactData = this.createCompactDataSummary(relevantContext, messageType);
    
    this.sendToClient(userId, {
      type: WebSocketMessageType.SYSTEM,
      data: {
        action: "data_update",
        compactData,
        metadata: {
          updateType: 'compact_data',
          relevanceScore: relevantContext.totalRelevanceScore
        }
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Create compact data summary for quick display
   */
  private createCompactDataSummary(relevantContext: any, messageType: string): any {
    switch (messageType) {
      case 'email':
        return {
          type: 'email_summary',
          count: relevantContext.emailContext.relevant.length,
          unread: relevantContext.emailContext.relevant.filter((e: any) => !e.isRead).length,
          preview: relevantContext.emailContext.relevant.slice(0, 2).map((e: any) => ({
            from: e.from?.split('<')[0]?.trim() || e.from,
            subject: e.subject?.substring(0, 40) + (e.subject?.length > 40 ? '...' : ''),
            time: this.formatTimeAgo(e.date)
          }))
        };
      case 'task':
        return {
          type: 'task_summary',
          total: relevantContext.taskContext.relevant.length,
          overdue: relevantContext.taskContext.relevant.filter((t: any) => 
            t.due && new Date(t.due) < new Date()
          ).length,
          preview: relevantContext.taskContext.relevant.slice(0, 3).map((t: any) => ({
            title: t.title?.substring(0, 50) + (t.title?.length > 50 ? '...' : ''),
            due: t.due ? this.formatTimeAgo(t.due) : null,
            list: t.tasklist?.title || 'Default'
          }))
        };
      default:
        return {
          type: 'general_summary',
          totalItems: relevantContext.totalRelevanceScore > 0 ? 
            Object.values(relevantContext).reduce((sum: number, ctx: any) => 
              sum + (ctx.relevant?.length || 0), 0
            ) : 0
        };
    }
  }

  /**
   * Helper methods for fallback processing
   */
  private extractSimpleIntent(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('email') || msg.includes('inbox')) return 'email_check';
    if (msg.includes('task') || msg.includes('todo')) return 'task_management';
    if (msg.includes('calendar') || msg.includes('meeting')) return 'calendar_check';
    if (msg.includes('contact') || msg.includes('phone')) return 'contact_search';
    return 'general_inquiry';
  }

  private extractSimpleConcepts(message: string): any[] {
    const words = message.split(/\s+/).filter(word => 
      word.length > 3 && !['this', 'that', 'with', 'from', 'the'].includes(word.toLowerCase())
    );
    return words.slice(0, 3).map(word => ({ concept_name: word, confidence: 0.5 }));
  }

  private formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) return `${Math.floor(diffMs / (1000 * 60))}m ago`;
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /**
   * Send immediate executive assistant response like ChatGPT
   */
  private async sendExecutiveAssistantResponse(
    userId: string,
    message: string
  ): Promise<void> {
    console.log(`[EnhancedWebSocket] 🎯 Sending executive assistant response for: "${message}"`);
    
    // 🔥 NEW: Load real user data to make response informative, not fluff
    const userData = await this.loadUserDataForExecutiveResponse(userId, message);
    
    // Generate data-driven executive response using real information
    const executiveResponse = await this.generateDataDrivenExecutiveResponse(message, userData);
    
    // Send immediate response with correct message type for mobile app
    const immediateMessage = {
      type: 'executive_response',
      data: {
        message: executiveResponse,
        style: 'conversational_paragraph',
        priority: 'immediate',
        userData: userData // Include data summary for UI enhancements
      },
      timestamp: Date.now(),
    };
    
    console.log(`[EnhancedWebSocket] ⚡ Sending data-driven executive response: "${executiveResponse.substring(0, 100)}..."`);
    this.sendToClient(userId, immediateMessage);
  }

  /**
   * Load user data for executive response (e.g., email count, task due today)
   */
  private async loadUserDataForExecutiveResponse(userId: string, message: string): Promise<any> {
    try {
      // Use existing cached data loading method
      const cachedData = await this.loadCachedDataForUser(userId);
      
      // Process the cached data to extract useful metrics
      const emailCount = cachedData.emails?.length || 0;
      const taskCount = cachedData.tasks?.length || 0;
      const conceptCount = cachedData.concepts?.length || 0;
      const calendarCount = cachedData.calendar?.length || 0;
      const contactCount = cachedData.contacts?.length || 0;
      
      // Calculate overdue tasks
      const now = new Date();
      const overdueTasks = cachedData.tasks?.filter((task: any) => 
        task.due && new Date(task.due) < now
      ).length || 0;
      
      // Calculate unread emails (if available)
      const unreadEmails = cachedData.emails?.filter((email: any) => 
        !email.isRead
      ).length || 0;
      
      const userData = {
        emailCount,
        unreadEmails,
        taskCount,
        overdueTasks,
        calendarCount,
        contactCount,
        conceptCount,
        hasData: (emailCount + taskCount + calendarCount + contactCount) > 0
      };
      
      console.log(`[EnhancedWebSocket] 📊 Loaded user data for executive response:`, userData);
      return userData;
    } catch (error) {
      console.error(`[EnhancedWebSocket] Error loading user data:`, error);
      return {
        emailCount: 0,
        taskCount: 0,
        calendarCount: 0,
        contactCount: 0,
        hasData: false
      };
    }
  }

  /**
   * Generate data-driven executive response using real information
   */
  private async generateDataDrivenExecutiveResponse(message: string, userData: any): Promise<string> {
    const msg = message.toLowerCase();
    const { emailCount, unreadEmails, taskCount, overdueTasks, calendarCount, hasData } = userData;

    if (msg.includes('email') || msg.includes('inbox') || msg.includes('check') || msg.includes('recent')) {
      if (hasData && emailCount > 0) {
        const unreadText = unreadEmails > 0 ? ` with ${unreadEmails} unread` : '';
        return `Perfect! I can see you have ${emailCount} emails in your system${unreadText}. As your executive assistant, I'll help you prioritize them strategically. I recommend tackling high-priority senders first, then batch-processing similar communications. This approach will help you maintain inbox zero while ensuring important messages get immediate attention. Let me organize these by urgency and importance for you.`;
      } else {
        return `I'll help you efficiently manage your email communications with a strategic approach. As your executive assistant, I recommend setting up an intelligent triage system: urgent decisions first, then batching similar communications together. This executive-level approach ensures important messages get immediate attention while maintaining your productivity flow.`;
      }
    } else if (msg.includes('task') || msg.includes('order') || msg.includes('priority') || msg.includes('todo')) {
      if (hasData && taskCount > 0) {
        const overdueText = overdueTasks > 0 ? ` and ${overdueTasks} overdue items that need immediate attention` : '';
        return `Excellent question about task prioritization! I can see you have ${taskCount} tasks in your system${overdueText}. As your executive assistant, I recommend the Eisenhower Matrix approach: tackle urgent AND important tasks first. Based on your current workload, I'll help you create a personalized priority sequence that maximizes productivity and ensures nothing critical falls through the cracks. Let's organize these by deadline and impact.`;
      } else {
        return `Great question about task prioritization! As your executive assistant, I recommend starting with the Eisenhower Matrix approach: urgent + important first, then important but not urgent. I'll help you build a robust task management system that scales with your responsibilities and ensures consistent productivity.`;
      }
    } else if (msg.includes('schedule') || msg.includes('calendar') || msg.includes('time')) {
      if (hasData && calendarCount > 0) {
        return `Excellent timing to review your schedule! I can see you have ${calendarCount} calendar events to work with. From an executive perspective, I suggest time-blocking your most important work during peak energy hours and protecting 25% of your calendar for strategic thinking. I'll help you optimize these commitments to align with your priorities and create breathing room for unexpected opportunities.`;
      } else {
        return `Excellent timing to review your schedule! From an executive perspective, I suggest implementing strategic time-blocking: peak energy hours for important work, batch similar activities, and protect 25% of your calendar for strategic thinking. I'll help you create a schedule framework that maximizes productivity while maintaining flexibility for opportunities.`;
      }
    } else {
      if (hasData) {
        const dataText = `${taskCount} tasks, ${emailCount} emails, and ${calendarCount} calendar events`;
        return `I'm here to help you approach this strategically! Looking at your current workload (${dataText}), I'll analyze the situation and provide actionable insights. As your executive assistant, I'll help you create a clear path forward that aligns with your priorities and maximizes your effectiveness. Let me organize this information to help you make the best decisions.`;
      } else {
        return `I'm here to help you approach this strategically and efficiently. As your executive assistant, I'll analyze the situation and provide you with actionable insights and a clear path forward. Let me gather relevant information and present you with options that align with your priorities and objectives.`;
      }
    }
  }

  /**
   * Send context dropdown asynchronously (hidden by default)
   */
  private async sendContextDropdown(
    userId: string,
    relevantContext: any,
    rdfInsights: any
  ): Promise<void> {
    console.log(`[EnhancedWebSocket] 📊 Sending context dropdown with relevance: ${relevantContext.totalRelevanceScore}`);
    
    // Create context summary for dropdown
    const contextSummary = {
      totalItems: this.countContextItems(relevantContext),
      emailCount: relevantContext.emailContext?.relevant?.length || 0,
      taskCount: relevantContext.taskContext?.relevant?.length || 0,
      calendarCount: relevantContext.calendarContext?.relevant?.length || 0,
      contactCount: relevantContext.contactContext?.relevant?.length || 0,
      conceptCount: relevantContext.conceptContext?.relevant?.length || 0,
      reasoning: relevantContext.reasoning || []
    };
    
    // Send dropdown with correct message type for mobile app
    const contextMessage = {
      type: 'context_dropdown',
      data: {
        contextSummary,
        relevantContext,
        rdfInsights,
        style: 'collapsible_dropdown',
        priority: 'background'
      },
      timestamp: Date.now(),
    };
    
    console.log(`[EnhancedWebSocket] 📋 Context items: ${contextSummary.totalItems} total`);
    this.sendToClient(userId, contextMessage);
  }

  /**
   * Generate executive assistant response using AI (without context delay)
   */
  private async generateExecutiveAssistantResponse(message: string): Promise<string> {
    // For now, always use fallback since it provides reliable executive-level responses
    // TODO: Re-enable OpenAI when API key is available
    console.log(`[EnhancedWebSocket] 🎯 Generating executive response for: "${message}"`);
    return this.generateFallbackExecutiveResponse(message);
    
    /* Disabled until OpenAI API key is configured
    try {
      // Use OpenAI to generate immediate executive-level response
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `You are an elite executive assistant with 20+ years of experience helping C-level executives. You provide immediate, actionable advice with confidence and expertise.

TONE: Professional, confident, proactive, solutions-focused
STYLE: Conversational paragraph (like ChatGPT)
APPROACH: Executive-level strategic thinking

When the user asks about:
- Task management: Provide prioritization strategies, time management advice
- Scheduling: Suggest optimal time blocking, meeting optimization
- Email management: Recommend triage systems, communication efficiency
- Organization: Offer systems thinking, workflow optimization

Respond immediately with executive-level insight, even without specific data. Use your expertise to provide valuable strategic advice.`
        }, {
          role: 'user',
          content: message
        }],
        max_tokens: 300,
        temperature: 0.7
      });

      return response.choices[0].message.content || "I'll help you tackle this strategically. Let me analyze your situation and provide you with a focused action plan.";
      
    } catch (error) {
      console.warn(`[EnhancedWebSocket] AI response failed, using fallback:`, error);
      return this.generateFallbackExecutiveResponse(message);
    }
    */
  }

  /**
   * Generate fallback executive response if AI fails
   */
  private generateFallbackExecutiveResponse(message: string): string {
    const msg = message.toLowerCase();
    
    if (msg.includes('email') || msg.includes('inbox') || msg.includes('check') || msg.includes('recent')) {
      if (msg.includes('recent') || msg.includes('latest') || msg.includes('check')) {
        return `Perfect! I'll help you efficiently review your recent emails with a strategic approach. As your executive assistant, I recommend prioritizing by sender importance, urgency indicators, and potential business impact. I'll organize your inbox to show you what needs immediate attention versus what can be batched for later review. Let me pull up your latest messages and identify the high-priority items that deserve your focus first.`;
      } else {
        return `Excellent idea to review your email strategically! I recommend the executive triage approach: scan for urgent items first, identify emails requiring decisions from you, and batch similar communications together. I'll help you set up an email system that keeps your inbox under control while ensuring important communications get the attention they deserve.`;
      }
    } else if (msg.includes('task') || msg.includes('order') || msg.includes('priority')) {
      return `Great question about task prioritization! As your executive assistant, I recommend starting with the Eisenhower Matrix approach: tackle urgent AND important tasks first, then important but not urgent items. I'll analyze your specific tasks and deadlines to give you a personalized priority sequence that maximizes your productivity and ensures nothing critical falls through the cracks.`;
    } else if (msg.includes('schedule') || msg.includes('calendar') || msg.includes('time')) {
      return `Excellent timing to review your schedule! From an executive perspective, I suggest time-blocking your most important work during your peak energy hours, batching similar activities together, and protecting at least 25% of your calendar for strategic thinking and unexpected priorities. Let me review your current commitments and suggest an optimized schedule that aligns with your goals.`;
    } else {
      return `I'm here to help you approach this strategically and efficiently. As your executive assistant, I'll analyze the situation and provide you with actionable insights and a clear path forward. Let me gather the relevant information and present you with options that align with your priorities and objectives.`;
    }
  }

  /**
   * Count total context items for summary
   */
  private countContextItems(relevantContext: any): number {
    return (relevantContext.emailContext?.relevant?.length || 0) +
           (relevantContext.taskContext?.relevant?.length || 0) +
           (relevantContext.calendarContext?.relevant?.length || 0) +
           (relevantContext.contactContext?.relevant?.length || 0) +
           (relevantContext.conceptContext?.relevant?.length || 0);
  }

  /**
   * Handle n8n agent responses and format for mobile app
   */
  private handleN8nAgentResponse(stepResult: StepResult): any {
    console.log(`[EnhancedWebSocket] 🤖 Processing n8n agent response: ${stepResult.category}`);
    
    if (stepResult.category === ResponseCategory.N8N_AGENT_RESPONSE) {
      const agentData = stepResult.structuredData;
      
      return {
        type: WebSocketMessageType.SYSTEM,
        data: {
          action: "n8n_agent_response",
          message: stepResult.message || 'AI Agent completed operation',
          agent: agentData?.agent || stepResult.uiData?.metadata?.agent,
          agentAction: agentData?.action || stepResult.uiData?.metadata?.action,
          executionTime: agentData?.execution_time || stepResult.uiData?.metadata?.executionTime,
          result: agentData?.result || stepResult.data,
          category: stepResult.category,
          success: stepResult.success,
          metadata: {
            responseType: 'n8n_agent',
            agent: agentData?.agent || stepResult.uiData?.metadata?.agent,
            action: agentData?.action || stepResult.uiData?.metadata?.action,
            success: stepResult.success,
            executionTime: agentData?.execution_time || stepResult.uiData?.metadata?.executionTime,
            requestId: stepResult.uiData?.metadata?.requestId,
            confidence: stepResult.uiData?.metadata?.confidence,
            fallbackUsed: stepResult.uiData?.metadata?.fallbackUsed,
          }
        },
        timestamp: Date.now(),
      };
    }
    
    if (stepResult.category === ResponseCategory.WEB_RESEARCH) {
      const webData = stepResult.structuredData;
      
      return {
        type: WebSocketMessageType.SYSTEM,
        data: {
          action: "web_research_response",
          message: stepResult.message || 'Web research completed',
          category: stepResult.category,
          webResearch: {
            query: webData?.query || 'Web search',
            results: webData?.results || []
          },
          executionTime: stepResult.uiData?.metadata?.executionTime || '0s',
          metadata: {
            responseType: 'web_research',
            agent: 'Web Agent',
            success: stepResult.success,
          }
        },
        timestamp: Date.now(),
      };
    }
    
    if (stepResult.category === ResponseCategory.YOUTUBE_SEARCH) {
      const youtubeData = stepResult.structuredData;
      
      return {
        type: WebSocketMessageType.SYSTEM,
        data: {
          action: "youtube_search_response",
          message: stepResult.message || 'YouTube search completed',
          category: stepResult.category,
          youtubeSearch: {
            query: youtubeData?.query || 'YouTube search',
            videos: youtubeData?.videos || []
          },
          executionTime: stepResult.uiData?.metadata?.executionTime || '0s',
          metadata: {
            responseType: 'youtube_search',
            agent: 'YouTube Agent',
            success: stepResult.success,
          }
        },
        timestamp: Date.now(),
      };
    }
    
    if (stepResult.category === ResponseCategory.WORKFLOW_COORDINATION) {
      const workflowData = stepResult.structuredData;
      
      return {
        type: WebSocketMessageType.SYSTEM,
        data: {
          action: "workflow_coordination_response",
          message: stepResult.message || 'Workflow coordination completed',
          category: stepResult.category,
          workflow: workflowData?.workflow || {
            name: 'Multi-Service Workflow',
            steps: [],
            overallStatus: stepResult.success ? 'completed' : 'failed',
            executionTime: stepResult.uiData?.metadata?.executionTime || '0s'
          },
          executionTime: stepResult.uiData?.metadata?.executionTime || '0s',
          metadata: {
            responseType: 'workflow_coordination',
            agent: 'Workflow Agent',
            success: stepResult.success,
          }
        },
        timestamp: Date.now(),
      };
    }
    
    return null; // Not an n8n response
  }

  /**
   * Check if step result is from n8n agent and needs special handling
   */
  private isN8nAgentResponse(stepResult: StepResult): boolean {
    const n8nCategories = [
      ResponseCategory.N8N_AGENT_RESPONSE,
      ResponseCategory.WEB_RESEARCH,
      ResponseCategory.YOUTUBE_SEARCH,
      ResponseCategory.WORKFLOW_COORDINATION,
      ResponseCategory.AGENT_AUTOMATION,
    ];
    
    return stepResult.category ? n8nCategories.includes(stepResult.category) : false;
  }

  /**
   * Check if execution result contains n8n agent responses
   */
  private containsN8nAgentResponse(result: any): boolean {
    // Check if the result itself is an n8n response
    if (result.data?.metadata?.agent || result.data?.category?.includes('n8n')) {
      return true;
    }
    
    // Check if result has step results with n8n responses
    if (result.stepResults && Array.isArray(result.stepResults)) {
      return result.stepResults.some((stepResult: any) => this.isN8nAgentResponse(stepResult));
    }
    
    // Check for n8n response indicators in data
    const n8nIndicators = [
      'n8n_agent', 'web_research', 'youtube_search', 'workflow_coordination', 'agent_automation'
    ];
    
    const resultString = JSON.stringify(result).toLowerCase();
    return n8nIndicators.some(indicator => resultString.includes(indicator));
  }

  /**
   * Determine if message should route to n8n agents (same logic as ActionPlanner)
   */
  private shouldRouteToN8nAgent(message: string, rdfInsights: any): boolean {
    console.log(`[EnhancedWebSocket] 🤔 Analyzing n8n routing for: "${message.substring(0, 50)}..."`);
    
    // Factors for n8n routing (same as ActionPlanner logic):
    
    // 1. Message complexity
    const wordCount = message.split(' ').length;
    const hasMultipleVerbs = (message.match(/\b(send|create|find|search|schedule|update|analyze|research|compose|coordinate|optimize)\b/gi) || []).length > 1;
    
    // 2. RDF-detected intent analysis
    const primaryIntent = rdfInsights?.ai_reasoning?.intent_analysis?.primary_intent;
    const complexIntents = ['workflow_automation', 'research_task', 'multi_service_coordination', 'information_seeking'];
    const isComplexIntent = complexIntents.includes(primaryIntent);
    
    // 3. Web/research component detection
    const hasWebComponent = /\b(research|search|find information|look up|what is|how to|latest|trends|news)\b/i.test(message);
    const hasYouTubeComponent = /\b(youtube|video|tutorial|watch|learn|course|lesson)\b/i.test(message);
    
    // 4. Cross-service coordination indicators
    const hasCrossService = this.detectCrossServiceNeed(message);
    
    // 5. AI reasoning requirement indicators
    const needsAIReasoning = /\b(smart|intelligent|analyze|summarize|recommend|suggest|optimize|professional|context)\b/i.test(message);
    
    // 6. Multi-step workflow indicators
    const hasWorkflowKeywords = /\b(and then|after that|also|plus|additionally|coordinate|automate)\b/i.test(message);
    
    // Decision logic with weighted scoring
    const complexityScore = (
      (wordCount > 10 ? 1 : 0) +
      (hasMultipleVerbs ? 1 : 0) +
      (isComplexIntent ? 2 : 0) +
      (hasWebComponent ? 2 : 0) +
      (hasYouTubeComponent ? 2 : 0) +
      (hasCrossService ? 2 : 0) +
      (needsAIReasoning ? 1 : 0) +
      (hasWorkflowKeywords ? 1 : 0)
    );
    
    // Threshold: Use n8n for complexity score >= 1 (lowered for testing)
    const shouldUseN8n = complexityScore >= 1;
    
    console.log(`[EnhancedWebSocket] 🤔 n8n routing analysis:`);
    console.log(`[EnhancedWebSocket] 📊 Complexity score: ${complexityScore} (threshold: 1)`);
    console.log(`[EnhancedWebSocket] 🎯 Decision: ${shouldUseN8n ? 'USE n8n Agent' : 'USE Executive Assistant'}`);
    console.log(`[EnhancedWebSocket] 📈 Factors: words=${wordCount}, multiVerb=${hasMultipleVerbs}, intent=${primaryIntent}, web=${hasWebComponent}, youtube=${hasYouTubeComponent}, cross=${hasCrossService}, ai=${needsAIReasoning}, workflow=${hasWorkflowKeywords}`);
    
    return shouldUseN8n;
  }

  /**
   * Detect patterns that require multiple service coordination
   */
  private detectCrossServiceNeed(message: string): boolean {
    const crossServicePatterns = [
      // Email + Calendar coordination
      /email.*calendar/i,
      /calendar.*email/i,
      /schedule.*email/i,
      /meeting.*email/i,
      
      // Task + Email coordination
      /task.*email/i,
      /email.*task/i,
      /remind.*email/i,
      
      // Contact + Email coordination
      /contact.*email/i,
      /email.*contact/i,
      
      // Research + Action coordination
      /research.*email/i,
      /research.*create/i,
      /find.*send/i,
      /search.*schedule/i,
      
      // Multi-action patterns
      /find.*create/i,
      /search.*send/i,
      /analyze.*schedule/i,
      /summarize.*email/i,
    ];
    
    const hasCrossService = crossServicePatterns.some(pattern => pattern.test(message));
    console.log(`[EnhancedWebSocket] 🔗 Cross-service coordination detected: ${hasCrossService}`);
    
    return hasCrossService;
  }
} 