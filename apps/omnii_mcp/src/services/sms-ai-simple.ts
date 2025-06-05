import { OpenAI } from "openai";
import { TimezoneManager } from "./timezone-manager";
import { ActionPlanner } from "./action-planner";
import { ExecutionContext, Entity } from "../types/action-planning.types";
import { redisCache } from "./redis-cache";
import { EntityManager } from "./entity-recognizer";
import { randomBytes } from "crypto";
import {
  PlanState,
  ExecutionContextType,
} from "../types/action-planning.types";
import { InterventionManager } from "./intervention-manager";

export class SimpleSMSAI {
  private openai: OpenAI;
  private timezoneManager: TimezoneManager;
  private actionPlanner: ActionPlanner;
  private interventionManager: InterventionManager;
  private entityManager: EntityManager;

  // Phone number to email mapping
  private phoneToEmailMap: Record<string, string> = {
    "+16286885388": "edenchan717@gmail.com",
    "+18582260766": "santino62@gmail.com", // cd9bdc60-35af-4bb6-b87e-1932e96fb354
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.timezoneManager = new TimezoneManager();
    this.interventionManager = new InterventionManager(); // No WebSocket handler for SMS
    this.actionPlanner = new ActionPlanner(this.interventionManager);
    this.entityManager = new EntityManager();
  }

  async processMessage(
    message: string,
    phoneNumber: string,
    localDatetime?: string
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      console.log(`[SimpleSMSAI] Processing: "${message}" from ${phoneNumber}`);

      // Log the timezone info if provided
      if (localDatetime) {
        console.log(`[SimpleSMSAI] User's local datetime: ${localDatetime}`);
      }

      // Check for pending interventions FIRST
      const interventionResult = await this.checkAndHandleIntervention(
        phoneNumber,
        message
      );
      if (interventionResult) {
        return interventionResult;
      }

      // Map phone number to email for entity ID
      const entityId = this.phoneToEmailMap[phoneNumber];
      if (!entityId) {
        return {
          success: true,
          message:
            "Sorry, your phone number is not registered. Please contact support to link your Google account.",
        };
      }

      console.log(`[SimpleSMSAI] Using entity ID: ${entityId}`);

      // Check if user needs timezone setup first
      if (this.timezoneManager.needsTimezoneSetup(phoneNumber)) {
        return await this.timezoneManager.promptForTimezone(phoneNumber);
      }

      // Handle timezone setup responses
      if (this.timezoneManager.isInTimezoneSetup(phoneNumber)) {
        return await this.timezoneManager.handleTimezoneSetup(
          phoneNumber,
          message
        );
      }

      // Removed TasksMemoryManager for simplicity - was causing infinite loops

      // Use action planner for all messages
      return await this.handleWithActionPlanner(
        message,
        phoneNumber,
        entityId,
        localDatetime
      );
    } catch (error) {
      console.error(`[SimpleSMSAI] Error:`, error);
      return {
        success: false,
        message: "Sorry, I'm having trouble right now. Please try again later.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check for pending interventions and handle user response
   */
  private async checkAndHandleIntervention(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; message: string } | null> {
    try {
      // Pattern to search for intervention keys
      // Note: In production, you'd want to use Redis SCAN command
      // For now, we'll check a few possible keys
      const sessionIds = await this.getRecentSessionIds(phoneNumber);

      for (const sessionId of sessionIds) {
        // Check possible intervention keys
        const interventionKeys = [
          `intervention:${sessionId}:intervention_0`,
          `intervention:${sessionId}:intervention_1`,
          `intervention:${sessionId}:intervention_2`,
          `intervention:${sessionId}:batch`,
        ];

        for (const key of interventionKeys) {
          const state = await redisCache.get(key);

          if (
            state?.status === "waiting" &&
            state?.phoneNumber === phoneNumber
          ) {
            console.log(`[SimpleSMSAI] Found pending intervention: ${key}`);

            // Update intervention state
            await redisCache.set(
              key,
              {
                ...state,
                status: "resolved",
                resolvedValue: message.trim(),
                resolvedAt: Date.now(),
              },
              300
            ); // Keep TTL

            return {
              success: true,
              message: "✅ Got it! Continuing with your request...",
            };
          }
        }
      }

      return null; // No pending intervention
    } catch (error) {
      console.error(`[SimpleSMSAI] Error checking interventions:`, error);
      return null;
    }
  }

  /**
   * Get recent session IDs for a phone number from Redis
   */
  private async getRecentSessionIds(phoneNumber: string): Promise<string[]> {
    // In a production system, you'd maintain a list of active sessions per phone
    // For now, we'll check the last few session IDs
    const sessionIds: string[] = [];
    const key = `sessions:${phoneNumber}:recent`;
    const recentSessions = await redisCache.get(key);

    if (recentSessions && Array.isArray(recentSessions)) {
      return recentSessions.slice(0, 5); // Last 5 sessions
    }

    return [];
  }

  /**
   * Store session ID for tracking
   */
  private async storeSessionId(
    phoneNumber: string,
    sessionId: string
  ): Promise<void> {
    const key = `sessions:${phoneNumber}:recent`;
    const existing = (await redisCache.get(key)) || [];
    const updated = [sessionId, ...existing.slice(0, 4)]; // Keep last 5
    await redisCache.set(key, updated, 3600); // 1 hour TTL
  }

  /**
   * Handle messages using action planner
   */
  private async handleWithActionPlanner(
    message: string,
    phoneNumber: string,
    entityId: string,
    localDatetime?: string
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      // Generate session ID for this interaction
      const sessionId = randomBytes(16).toString("hex");

      // Store session ID for tracking
      await this.storeSessionId(phoneNumber, sessionId);

      // Get user's timezone with fallback
      const userTimezone =
        this.timezoneManager.getUserTimezone(phoneNumber) ||
        "America/Los_Angeles";

      // Extract and resolve entities

      const resolvedEntities = await this.entityManager.resolveEntities(
        message,
        ExecutionContextType.SMS
      );
      console.log(`[SimpleSMSAI] Resolved entities:`, resolvedEntities);

      // Create execution context
      const context: ExecutionContext = {
        entityId,
        phoneNumber,
        userTimezone,
        localDatetime,
        stepResults: new Map(),
        currentStepIndex: 0,
        entities: resolvedEntities,
        sessionId,
        planState: PlanState.PENDING,
        context: ExecutionContextType.SMS,
      };

      // Create and execute plan
      const plan = await this.actionPlanner.createPlan(
        message,
        resolvedEntities
      );
      const result = await this.actionPlanner.executePlan(plan, context);

      return {
        success: result.success,
        message: result.message,
        error: result.error,
      };
    } catch (error) {
      console.error(`[SimpleSMSAI] Action planner error:`, error);
      return {
        success: false,
        message: "Sorry, I had trouble processing that request.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle general (non-calendar/task) messages
   */
  private async handleGeneralMessage(message: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `User message: "${message}"\n\nRespond helpfully and concisely.`,
          },
        ],
      });

      const aiMessage =
        response.choices[0].message.content || "I'm here to help!";
      return {
        success: true,
        message: aiMessage,
      };
    } catch (error) {
      console.error(`[SimpleSMSAI] Error in general message handling:`, error);
      return {
        success: false,
        message: "Sorry, I had trouble processing that. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
