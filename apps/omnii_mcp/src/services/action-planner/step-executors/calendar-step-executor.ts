import { BaseStepExecutor } from "./base-step-executor";
import {
  ActionStep,
  StepResult,
  ExecutionContext,
  ExecutionContextType,
  CalendarActionType,
  ResponseCategory,
} from "../../../types/action-planning.types";
import unifiedGoogleManager from "../../unified-google-manager";

/**
 * Executor for calendar-related action steps
 */
export class CalendarStepExecutor extends BaseStepExecutor {
  async executeStep(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    try {
      // Convert step to natural language message for unified manager
      const naturalMessage = this.buildNaturalMessage(step);
      if (!naturalMessage) {
        return this.createStepResult(
          step,
          false,
          undefined,
          undefined,
          `Unknown calendar action: ${step.action}`
        );
      }

      console.log(
        `[CalendarStepExecutor] Routing calendar message to UnifiedGoogleManager: "${naturalMessage}"`
      );

      // Route to unified manager with context
      const result = await unifiedGoogleManager.processMessage(
        naturalMessage,
        context.phoneNumber,
        context.userTimezone,
        context.localDatetime,
        context.context || ExecutionContextType.SMS
      );

      // NEW: Check if result is a UnifiedToolResponse with rich data
      const isUnifiedResponse = result && 
                               typeof result === 'object' && 
                               'type' in result && 
                               'data' in result && 
                               result.type === 'calendar';

      if (isUnifiedResponse) {
        console.log(`[CalendarStepExecutor] 🎯 Received UnifiedToolResponse, preserving rich data`);
        
        // Type-safe access to UnifiedToolResponse
        const unifiedResult = result as any; // We know it's UnifiedToolResponse from the check above
        
        // Determine the appropriate category based on the action
        const category = this.determineCalendarCategory(step.action, unifiedResult);
        
        // Create enhanced StepResult with rich data
        return this.createEnhancedStepResult(
          step,
          unifiedResult.success,
          unifiedResult.data?.raw || unifiedResult, // Keep raw data
          unifiedResult.message,
          unifiedResult.success ? undefined : (unifiedResult.message || 'Calendar operation failed'), // Map failure message to error
          undefined,
          unifiedResult.authRequired || false, // Top-level field in UnifiedToolResponse
          unifiedResult.authUrl || null, // Top-level field in UnifiedToolResponse
          category,
          unifiedResult.data?.structured, // Rich structured data (CalendarListData, etc.)
          unifiedResult.data?.ui, // UI-ready data
          unifiedResult // Full UnifiedToolResponse
        );
      }

      // Fallback for legacy format
      console.log(`[CalendarStepExecutor] ⚠️ Received legacy format, using basic StepResult`);
      
      // Extract relevant data for next steps (legacy format only)
      let stepData = result;
      const legacyResult = result as any;
      if (step.action === CalendarActionType.LIST_EVENTS && legacyResult.rawData) {
        stepData = legacyResult.rawData;
        console.log(
          `[CalendarStepExecutor] Calendar events retrieved: ${
            Array.isArray(stepData) ? stepData.length : "unknown count"
          } events stored for next steps`
        );
      }

      // Type-safe access to legacy format
      return this.createStepResult(
        step,
        legacyResult.success,
        stepData,
        legacyResult.message,
        legacyResult.error,
        undefined,
        legacyResult.authRequired,
        legacyResult.authUrl
      );
    } catch (error) {
      console.error(
        `[CalendarStepExecutor] Calendar step execution failed:`,
        error
      );
      return this.createStepResult(
        step,
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : "Calendar operation failed"
      );
    }
  }

  /**
   * Build natural language message for calendar actions
   */
  private buildNaturalMessage(step: ActionStep): string | null {
    switch (step.action) {
      case CalendarActionType.LIST_EVENTS:
        return "list my events this week";

      case CalendarActionType.CREATE_EVENT:
        return step.params.message || `Create event: ${step.params.title}`;

      default:
        return null;
    }
  }

  /**
   * Determine the appropriate ResponseCategory based on calendar action type
   */
  private determineCalendarCategory(action: string, response: any): ResponseCategory {
    // Check structured data to determine category
    if (response.data?.structured) {
      const structured = response.data.structured;
      
      // If it has an events array, it's a calendar list
      if ('events' in structured && Array.isArray(structured.events)) {
        return ResponseCategory.CALENDAR_LIST;
      }
      
      // If it's a single CalendarData object
      if ('title' in structured && 'start' in structured) {
        return ResponseCategory.CALENDAR_EVENT;
      }
    }
    
    // Fallback to action-based detection
    switch (action) {
      case "list_events":
      case CalendarActionType.LIST_EVENTS:
        return ResponseCategory.CALENDAR_LIST;
      case "create_event":
      case CalendarActionType.CREATE_EVENT:
        return ResponseCategory.CALENDAR_EVENT;
      default:
        return ResponseCategory.CALENDAR_EVENT;
    }
  }

  /**
   * Create enhanced StepResult with rich response data support
   */
  private createEnhancedStepResult(
    step: ActionStep,
    success: boolean,
    data?: any,
    message?: string,
    error?: string,
    state?: any,
    authRequired?: boolean,
    authUrl?: string | null,
    category?: ResponseCategory,
    structuredData?: any,
    uiData?: any,
    unifiedResponse?: any
  ): StepResult {
    const basicResult = this.createStepResult(
      step,
      success,
      data,
      message,
      error,
      state,
      authRequired,
      authUrl
    );
    
    // Add rich data fields
    return {
      ...basicResult,
      category,
      structuredData,
      uiData,
      unifiedResponse
    };
  }
}
