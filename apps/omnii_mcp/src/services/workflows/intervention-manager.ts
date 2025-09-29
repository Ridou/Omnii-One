import {
  ExecutionContextType,
  StepState,
  UserInterventionParams,
  Entity,
} from "../../types/action-planning.types";
import { getTwilioService } from "../integrations/twilio-service";
import { redisCache } from "../caching/redis-cache";
import { WebSocketHandlerService } from "../core/websocket-handler.service";
import {
  WebSocketMessageType,
  WebSocketResponseStatus,
} from "../../types/websocket.types";

export interface InterventionRequest {
  sessionId: string;
  stepId: string;
  reason: string;
  entity?: Entity;
  timeout: number;
  context: ExecutionContextType;
  userId: string; // For WebSocket
  phoneNumber: string; // For SMS
}

export interface InterventionResponse {
  success: boolean;
  resolvedValue?: string;
  error?: string;
  timedOut?: boolean;
}

/**
 * Manages user interventions across different communication channels
 */
export class InterventionManager {
  constructor(private wsHandler?: WebSocketHandlerService) {}

  /**
   * Request user intervention through appropriate channel
   */
  async requestIntervention(
    request: InterventionRequest
  ): Promise<InterventionResponse> {
    const stateKey = `intervention:${request.sessionId}:${request.stepId}`;

    // Initialize intervention state
    const interventionState = {
      status: StepState.PENDING,
      reason: request.reason,
      entity: request.entity,
      phoneNumber: request.phoneNumber,
      userId: request.userId,
      context: request.context,
      timestamp: Date.now(),
      resolvedValue: undefined,
    };

    // Store intervention state
    await redisCache.set(stateKey, interventionState, request.timeout);

    // Send intervention request through appropriate channel
    try {
      if (request.context === ExecutionContextType.WEBSOCKET) {
        await this.sendWebSocketIntervention(request);
      } else {
        await this.sendSMSIntervention(request);
      }
    } catch (error) {
      console.error(`[InterventionManager] Error sending intervention:`, error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send intervention",
      };
    }

    // Wait for response
    return await this.waitForResponse(stateKey, request.timeout);
  }

  /**
   * Send intervention request via WebSocket
   */
  private async sendWebSocketIntervention(
    request: InterventionRequest
  ): Promise<void> {
    if (!this.wsHandler) {
      throw new Error("WebSocket handler not available");
    }

    const interventionMessage = {
      type: WebSocketMessageType.SYSTEM,
      data: {
        action: "user_intervention_required",
        sessionId: request.sessionId,
        stepId: request.stepId,
        reason: request.reason,
        entity: request.entity,
        timeout: request.timeout,
        message: `❓ ${request.reason}\n\nPlease provide the information to continue.`,
      },
      timestamp: Date.now(),
    };

    const success = this.wsHandler.sendToClient(
      request.userId,
      interventionMessage
    );
    if (!success) {
      console.warn(
        `[InterventionManager] User ${request.userId} not connected via WebSocket - connection may have been lost during processing`
      );

      // Instead of throwing an error, we'll store the pending intervention
      // and let the caller handle the disconnection gracefully
      throw new Error(`WebSocket connection lost for user ${request.userId}`);
    }

    console.log(
      `[InterventionManager] WebSocket intervention sent to user: ${request.userId}`
    );
  }

  /**
   * Send intervention request via SMS
   */
  private async sendSMSIntervention(
    request: InterventionRequest
  ): Promise<void> {
    const message = `❓ ${request.reason}\n\nReply within ${Math.floor(
      request.timeout / 60
    )} minutes.`;

    const twilioService = getTwilioService();
    if (!twilioService) {
      console.error('❌ Cannot send intervention SMS - Twilio service not configured');
      throw new Error('SMS service not available for intervention');
    }
    
    await twilioService.sendMessage({
      to: request.phoneNumber,
      body: message,
    });

    console.log(
      `[InterventionManager] SMS intervention sent to: ${request.phoneNumber}`
    );
  }

  /**
   * Wait for intervention response
   */
  private async waitForResponse(
    stateKey: string,
    timeoutSeconds: number
  ): Promise<InterventionResponse> {
    const timeoutMs = timeoutSeconds * 1000;
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < timeoutMs) {
      const state = await redisCache.get(stateKey);

      if (state?.status === StepState.COMPLETED) {
        return {
          success: true,
          resolvedValue: state.resolvedValue,
        };
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Timeout
    console.log(
      `[InterventionManager] Intervention timeout for key: ${stateKey}`
    );
    return {
      success: false,
      timedOut: true,
      error: "User intervention timeout",
    };
  }

  /**
   * Resolve intervention with user response
   */
  async resolveIntervention(
    sessionId: string,
    stepId: string,
    resolvedValue: string
  ): Promise<boolean> {
    const stateKey = `intervention:${sessionId}:${stepId}`;

    try {
      const state = await redisCache.get(stateKey);
      if (!state) {
        console.warn(
          `[InterventionManager] No intervention found for: ${stateKey}`
        );
        return false;
      }

      // Update state with resolved value
      const updatedState = {
        ...state,
        status: StepState.COMPLETED,
        resolvedValue: resolvedValue.trim(),
        resolvedAt: Date.now(),
      };

      await redisCache.set(stateKey, updatedState, 300); // Keep for 5 minutes

      console.log(
        `[InterventionManager] Intervention resolved: ${stateKey} = ${resolvedValue}`
      );
      return true;
    } catch (error) {
      console.error(
        `[InterventionManager] Error resolving intervention:`,
        error
      );
      return false;
    }
  }

  /**
   * Check for pending interventions for a user
   */
  async getPendingInterventions(
    userId: string,
    phoneNumber: string
  ): Promise<string[]> {
    // This is a simplified implementation
    // In production, you'd maintain an index of active interventions per user
    return [];
  }
}
