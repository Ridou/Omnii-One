import {
  WebSocketMessage,
  WebSocketResponse,
  WebSocketMessageType,
  WebSocketResponseStatus,
  CommandType,
  CommandPayload,
} from "../types/websocket.types";
import { ActionPlanner } from "./action-planner";
import { EntityManager } from "./entity-recognizer";
import {
  ExecutionContext,
  PlanState,
  ExecutionContextType,
  BrainMemoryContext,
} from "../types/action-planning.types";
import { TimezoneManager } from "./timezone-manager";
import { UnifiedGoogleManager } from "./unified-google-manager";
import { InterventionManager } from "./intervention-manager";
import { randomBytes } from "crypto";
import responseManager from "./response-manager";
import { getObjectStructure, logObjectStructure } from "../utils/object-structure";
import { isValidUnifiedToolResponse } from "../types/unified-response.validation";
import { productionBrainService } from "./memory/production-brain-service";

// Use Elysia's WebSocket type
interface ElysiaWebSocket {
  send: (message: string) => void;
  readyState: number;
}

/**
 * WebSocket Handler with SMS AI Flow Integration
 *
 * Maps userId → WebSocket connection and processes messages through the
 * existing SMS AI flow: entity extraction → plan creation → execution
 */
export class WebSocketHandlerService {
  // Simple: userId → WebSocket connection
  private connections = new Map<string, ElysiaWebSocket>();
  private actionPlanner: ActionPlanner;
  private timezoneManager: TimezoneManager;
  private googleManager: UnifiedGoogleManager;
  private interventionManager: InterventionManager;
  private entityManager: EntityManager;

  constructor() {
    this.timezoneManager = new TimezoneManager();
    this.googleManager = new UnifiedGoogleManager();
    this.interventionManager = new InterventionManager(this);
    this.actionPlanner = new ActionPlanner(this.interventionManager);
    this.entityManager = new EntityManager();
    
    console.log('🧠 WebSocketHandlerService initialized with brain memory integration');
  }

  /**
   * Register connection by userId
   */
  registerConnectionForUser(userId: string, ws: ElysiaWebSocket): void {
    this.connections.set(userId, ws);
    console.log(
      `[WebSocket] ✅ User ${userId} connected (${this.connections.size} total)`
    );
  }

  /**
   * Remove connection by userId
   */
  removeConnectionForUser(userId: string): void {
    if (this.connections.delete(userId)) {
      console.log(
        `[WebSocket] ❌ User ${userId} disconnected (${this.connections.size} total)`
      );
    }
  }

  /**
   * Process incoming WebSocket message
   */
  async processMessage(
    message: WebSocketMessage,
    ws: ElysiaWebSocket
  ): Promise<WebSocketResponse | any> {
    try {
      console.log(`[WebSocket] 🚀 Processing message:`, message);
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
          console.log(
            `[WebSocket] 🚀 Processing command message:`,
            message.payload
          );
          return await this.processCommand(message.payload);

        case WebSocketMessageType.SYSTEM:
          console.log(
            `[WebSocket] 🔧 Processing system message:`,
            message.payload
          );
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
      console.error("[WebSocket] Error processing message:", error);
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
   * Process command messages using the SMS AI flow
   */
  private async processCommand(
    payload: CommandPayload
  ): Promise<WebSocketResponse | any> {
    if (!payload?.userId) {
      return {
        status: WebSocketResponseStatus.ERROR,
        data: { error: "Missing userId in command" },
        timestamp: Date.now(),
      };
    }

    try {
      console.log(
        `[WebSocket] 🚀 Processing message from user: ${payload.userId}`
      );
      console.log(`[WebSocket] 💬 Message: "${payload.message}"`);

      // Use the SMS AI flow: entity extraction → plan creation → execution
      const result = await this.handleWithActionPlanner(
        payload.message,
        payload.userId,
        payload.localDatetime
      );

      // Send response through ResponseManager (for consistency)
      // ✅ DISABLED: ResponseManager might interfere with UnifiedToolResponse
      /*
      if (result.success) {
        await responseManager.sendResponse(
          result.message,
          payload.userId,
          ExecutionContextType.WEBSOCKET,
          true
        );
      } else if (!result.authRequired) {
        // Don't send error responses for OAuth requirements
        await responseManager.sendResponse(
          result.message,
          payload.userId,
          ExecutionContextType.WEBSOCKET,
          false,
          result.error
        );
      }
      */

      // ✅ CRITICAL DEBUG: What did handleWithActionPlanner return?
      console.log(`[WebSocket] 🔍 *** PROCESSCOMMAND RESULT ANALYSIS ***`);
      console.log(`[WebSocket] - result type:`, typeof result);
      console.log(`[WebSocket] - result keys:`, result ? Object.keys(result) : 'no result');
      
      // ✅ NEW: Check if result IS a UnifiedToolResponse (since handleWithActionPlanner returns it directly)
      if (isValidUnifiedToolResponse(result)) {
        console.log(`[WebSocket] 🎯 *** RESULT IS UNIFIED TOOL RESPONSE ***`);
        console.log(`[WebSocket] - result.type:`, result.type);
        console.log(`[WebSocket] - result.success:`, result.success);
        console.log(`[WebSocket] - result has data.ui:`, !!result.data?.ui);
        console.log(`[WebSocket] - result has data.structured:`, !!result.data?.structured);
        
        console.log(`[WebSocket] 🚀 PROCESSCOMMAND returning UnifiedToolResponse directly to app.ts`, result);
        logObjectStructure(`[WebSocket] Final UnifiedToolResponse to app.ts`, result);
        return result; // Return the UnifiedToolResponse directly
      }
      
      // ✅ Legacy format check: Check if result has legacy properties
      console.log(`[WebSocket] 🔍 *** LEGACY FORMAT ANALYSIS ***`);
      console.log(`[WebSocket] - result.success:`, result.success);
      console.log(`[WebSocket] - result.message:`, !!result.message);
      console.log(`[WebSocket] - result.authRequired:`, result.authRequired);
      console.log(`[WebSocket] - result.authUrl:`, !!result.authUrl);

      // Check if this is an OAuth response using structured data
      if (result.authRequired && result.authUrl) {
        console.log(`[WebSocket] 🔐 OAuth response detected`);
        return {
          status: WebSocketResponseStatus.SUCCESS,
          data: {
            requiresAuth: true,
            authUrl: result.authUrl,
            message: result.message,
            userId: payload.userId,
            action: "oauth_required",
          },
          timestamp: Date.now(),
        };
      }

      // OLD: Check if we have a unified response and return it directly (legacy path)
      if (result.unifiedResponse) {
        console.log(
          `[WebSocket] 🎉 Found result.unifiedResponse (legacy path), returning rich data to client`
        );
        console.log(`[WebSocket] 📊 RICH DATA BEING SENT TO CLIENT:`);
        console.log(`[WebSocket] - Type: ${result.unifiedResponse.type}`);
        console.log(`[WebSocket] - Success: ${result.unifiedResponse.success}`);
        console.log(`[WebSocket] - Title: ${result.unifiedResponse.data?.ui?.title}`);
        console.log(`[WebSocket] - Content length: ${result.unifiedResponse.data?.ui?.content?.length || 0} chars`);
        console.log(`[WebSocket] - Actions: ${result.unifiedResponse.data?.ui?.actions?.length || 0} actions`);
        
        if (result.unifiedResponse.data?.structured) {
          console.log(`[WebSocket] 🔥 STRUCTURED DATA TO CLIENT:`);
          if (result.unifiedResponse.type === 'email') {
            const emailData = result.unifiedResponse.data.structured;
            console.log(`[WebSocket] 📧 Email data preview:`, {
              hasEmails: !!emailData.emails,
              emailCount: emailData.emails?.length || 0,
              totalCount: emailData.totalCount,
              unreadCount: emailData.unreadCount,
              hasMore: emailData.hasMore
            });
          }
          console.log(`[WebSocket] Full structured data keys:`, Object.keys(result.unifiedResponse.data.structured));
        }
        
        // ✅ Use structure utility instead of full JSON dump
        logObjectStructure(`[WebSocket] 🚀 SENDING TO CLIENT - UnifiedToolResponse structure`, result.unifiedResponse);
        return result.unifiedResponse; // Return the UnifiedToolResponse directly
      }

      // OLD: Fallback to legacy response format
      console.log(`[WebSocket] 📤 Using legacy response format`);
      return {
        status: result.success
          ? WebSocketResponseStatus.SUCCESS
          : WebSocketResponseStatus.ERROR,
        data: {
          message: result.message,
          success: result.success,
          userId: payload.userId,
          processedAt: new Date().toISOString(),
          error: result.error,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[WebSocket] Command processing error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Command failed";

      return {
        status: WebSocketResponseStatus.ERROR,
        data: {
          error: errorMessage,
          userId: payload.userId,
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Handle message with action planner (enhanced with brain memory)
   */
  private async handleWithActionPlanner(
    message: string,
    userId: string,
    localDatetime?: string
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
    authRequired: boolean;
    authUrl: string | null;
    // NEW: Brain memory insights
    brainMemoryUsed?: boolean;
    memoryStrength?: number;
    relatedConversations?: number;
  } | any> {
    try {
      console.log(`[WebSocket] 🧠 Processing chat message with brain memory: "${message}" for user: ${userId}`);
      
      // Generate session ID for this interaction
      const sessionId = randomBytes(16).toString("hex");

      // Get user's timezone with fallback
      const userTimezone =
        this.timezoneManager.getUserTimezone(userId) || "America/Los_Angeles";

      console.log(
        `[WebSocket] 📍 Using timezone: ${userTimezone} for user: ${userId}`
      );

      // NEW: Get brain memory context before processing
      let brainMemoryContext: BrainMemoryContext | null = null;
      let brainMemoryUsed = false;
      
      try {
        console.log(`[WebSocket] 🧠 Retrieving brain memory context for chat user: ${userId}`);
        brainMemoryContext = await productionBrainService.getBrainMemoryContext(
          userId,
          message,
          'chat',
          `chat_${userId}`, // Use chat ID format
          {
            prioritizeRecent: false, // Chat can use longer context
            timeoutMs: 200 // Slightly more time for chat
          }
        );
        brainMemoryUsed = true;
        console.log(`[WebSocket] ✅ Brain memory retrieved: strength ${brainMemoryContext.consolidation_metadata.memory_strength.toFixed(2)}, ${brainMemoryContext.working_memory.recent_messages.length} recent messages`);
      } catch (error) {
        console.warn(`[WebSocket] ⚠️ Brain memory retrieval failed, continuing without context:`, error);
        brainMemoryUsed = false;
      }

      // Extract and resolve entities
      console.log(`[WebSocket] 🔍 Extracting entities from: "${message}"`);

      const resolvedEntities = await this.entityManager.resolveEntities(
        message,
        ExecutionContextType.WEBSOCKET
      );
      console.log(
        `[WebSocket] ✅ Resolved ${resolvedEntities.length} entities:`,
        resolvedEntities
      );

      if (resolvedEntities.length === 0) {
        console.log(
          `[WebSocket] ⚠️  No entities resolved - plan will have placeholders that need intervention`
        );
      } else {
        resolvedEntities.forEach((entity, idx) => {
          console.log(
            `[WebSocket] Entity ${idx + 1}: ${entity.type} = "${
              entity.value
            }" ${entity.email ? `(email: ${entity.email})` : "(no email)"}`
          );
        });
      }

      // Create execution context with brain memory enhancement
      const context: ExecutionContext = {
        entityId: userId,
        phoneNumber: userId, // Use userId as phoneNumber for WebSocket context
        userTimezone,
        localDatetime,
        stepResults: new Map(),
        currentStepIndex: 0,
        entities: resolvedEntities,
        sessionId,
        planState: PlanState.PENDING,
        context: ExecutionContextType.WEBSOCKET,
        // NEW: Add brain memory context
        brainMemoryContext: brainMemoryContext || undefined,
        // NEW: Communication channel awareness
        communicationChannel: 'chat',
        // Chat metadata for brain memory
        chatMetadata: {
          chatId: `chat_${userId}`,
          isGroupChat: false,
          participants: [userId]
        }
      };

      // Create and execute plan (ActionPlanner will use brain memory context if available)
      console.log(`[WebSocket] 🎯 Creating action plan...`);
      const plan = await this.actionPlanner.createPlan(
        message,
        resolvedEntities
      );
      console.log(
        `[WebSocket] 📝 Plan created with ${plan.steps.length} steps`
      );

      console.log(`[WebSocket] ⚡ Executing plan...`);
      const result = await this.actionPlanner.executePlan(plan, context);
      console.log(
        `[WebSocket] 🏁 Plan execution ${
          result.success ? "completed" : "failed"
        }`
      );

      // NEW: Store this chat conversation in brain memory (async, don't block response)
      this.storeChatInBrainMemory(
        userId,
        message,
        `chat_${userId}`,
        true, // is_incoming = true for user messages
        localDatetime,
        result.success
      ).catch((error: any) => {
        console.warn(`[WebSocket] ⚠️ Failed to store chat in brain memory:`, error);
      });

      // ✅ CRITICAL DEBUG: What did ActionPlanner return?
      console.log(`[WebSocket] 🔍 *** ACTIONPLANNER RESULT ANALYSIS ***`);
      console.log(`[WebSocket] - result type:`, typeof result);
      console.log(`[WebSocket] - result keys:`, result ? Object.keys(result) : 'no result');
      console.log(`[WebSocket] - result.success:`, result.success);
      console.log(`[WebSocket] - result.message:`, !!result.message);
      console.log(`[WebSocket] - result.unifiedResponse exists:`, !!result.unifiedResponse);
      console.log(`[WebSocket] - result.unifiedResponse type:`, typeof result.unifiedResponse);
      
      if (result.unifiedResponse) {
        console.log(`[WebSocket] 🎯 *** UNIFIED RESPONSE FOUND ***`);
        console.log(`[WebSocket] - unifiedResponse.type:`, result.unifiedResponse.type);
        console.log(`[WebSocket] - unifiedResponse.success:`, result.unifiedResponse.success);
        console.log(`[WebSocket] - unifiedResponse.data exists:`, !!result.unifiedResponse.data);
        console.log(`[WebSocket] - unifiedResponse.data.ui exists:`, !!result.unifiedResponse.data?.ui);
        console.log(`[WebSocket] - unifiedResponse.data.structured exists:`, !!result.unifiedResponse.data?.structured);
      } else {
        console.log(`[WebSocket] ❌ *** NO UNIFIED RESPONSE FOUND ***`);
        console.log(`[WebSocket] - Will use legacy format fallback`);
        
        // ✅ CRITICAL DEBUG: Show exactly what ActionPlanner returned
        logObjectStructure(`[WebSocket] 🔍 ACTIONPLANNER RETURNED`, result);
      }

      // ✅ NEW: Check if we have a unified response and return it directly  
      if (result.unifiedResponse) {
        console.log(`[WebSocket] 🚀 handleWithActionPlanner returning UnifiedToolResponse directly`);
        logObjectStructure(`[WebSocket] UnifiedResponse structure`, result.unifiedResponse);
        return result.unifiedResponse; // Return the UnifiedToolResponse directly
      }

      // OLD: Fallback to legacy response format
      return {
        success: result.success,
        message: result.message,
        error: result.error,
        authRequired: result.authRequired || false,
        authUrl: result.authUrl || null,
      };
    } catch (error) {
      console.error(`[WebSocket] Action planner error:`, error);
      return {
        success: false,
        message: "Sorry, I had trouble processing that request.",
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
      // 1 = OPEN
      const data =
        typeof message === "string" ? message : JSON.stringify(message);
      console.log(`[WebSocket] ✅ Sent to user: ${userId}`);
      ws.send(data);
      return true;
    } else {
      console.log(`[WebSocket] ❌ User ${userId} not connected`);
      return false;
    }
  }

  /**
   * Check if user has an active WebSocket connection
   */
  isUserConnected(userId: string): boolean {
    const ws = this.connections.get(userId);
    return ws ? ws.readyState === 1 : false; // 1 = OPEN
  }

  /**
   * Get connection status
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connected users
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * NEW: Store chat conversation in brain memory (async)
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
      await productionBrainService.manager.storeChatConversation({
        user_id: userId,
        content: content,
        chat_id: chatId,
        is_incoming: isIncoming,
        websocket_session_id: this.connections.get(userId)?.id,
        is_group_chat: false,
        participants: [userId],
        google_service_context: success ? {
          service_type: 'tasks', // Default for chat processing
          operation: 'chat_processed',
          entity_ids: [userId]
        } : undefined
      });
      console.log(`[WebSocket] 🧠💾 Stored chat in brain memory for ${chatId}`);
    } catch (error) {
      console.error(`[WebSocket] ❌ Brain memory storage failed:`, error);
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

      // Handle other system message types
      return {
        status: WebSocketResponseStatus.ERROR,
        data: { error: `Unknown system action: ${payload.action}` },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[WebSocket] System message processing error:", error);
      return {
        status: WebSocketResponseStatus.ERROR,
        data: {
          error:
            error instanceof Error ? error.message : "System message failed",
        },
        timestamp: Date.now(),
      };
    }
  }
}
