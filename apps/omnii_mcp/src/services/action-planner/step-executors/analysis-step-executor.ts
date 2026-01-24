import { BaseStepExecutor } from "./base-step-executor";
import {
  ActionStep,
  StepResult,
  ExecutionContext,
  AnalysisActionType,
} from "../../../types/action-planning.types";
import { CalendarTemporalManager } from "../../integrations/calendar-temporal-manager";

/**
 * Executor for analysis-related action steps (free time finding, etc.)
 */
export class AnalysisStepExecutor extends BaseStepExecutor {
  private temporalContextManager: CalendarTemporalManager;

  constructor() {
    super();
    this.temporalContextManager = new CalendarTemporalManager();
  }

  async executeStep(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    try {
      switch (step.action) {
        case AnalysisActionType.FIND_FREE_TIME:
          return await this.executeFreeTimeAnalysis(step, context);

        case "general_response":
          // Fallback for general messages
          return this.createStepResult(
            step,
            true,
            { response: "I'm here to help!" },
            "I'm here to help!"
          );

        default:
          return this.createStepResult(
            step,
            false,
            undefined,
            undefined,
            `Unknown analysis action: ${step.action}`
          );
      }
    } catch (error) {
      console.error(
        `[AnalysisStepExecutor] Analysis step execution failed:`,
        error
      );
      return this.createStepResult(
        step,
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : "Analysis operation failed"
      );
    }
  }

  /**
   * Execute free time analysis using calendar data from previous steps
   */
  private async executeFreeTimeAnalysis(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    // Advanced free time analysis using temporal context manager
    console.log(
      `[AnalysisStepExecutor] Looking for calendar data in context...`
    );
    console.log(
      `[AnalysisStepExecutor] Available step results:`,
      Array.from(context.stepResults.keys())
    );

    // Look for events data from previous steps
    let eventsData = null;
    for (const [key, value] of context.stepResults.entries()) {
      console.log(
        `[AnalysisStepExecutor] Checking step result ${key}:`,
        Array.isArray(value) ? `${value.length} items` : typeof value
      );
      if (Array.isArray(value) && value.length > 0) {
        eventsData = value;
        break;
      }
    }

    if (eventsData && eventsData.length > 0) {
      console.log(
        `[AnalysisStepExecutor] Found ${eventsData.length} events for free time analysis`
      );

      // Use temporal context manager for intelligent free time analysis
      const freeTimeAnalysis = this.temporalContextManager.findFreeTimeSlots(
        eventsData,
        30, // 30 minute minimum duration
        context.userTimezone
      );

      // Format the results for user
      const message = this.formatFreeTimeAnalysis(
        freeTimeAnalysis,
        context.userTimezone
      );

      return this.createStepResult(step, true, freeTimeAnalysis, message);
    }

    console.log(
      `[AnalysisStepExecutor] No calendar data found for free time analysis`
    );
    return this.createStepResult(
      step,
      false,
      undefined,
      "No calendar data available for free time analysis"
    );
  }

  /**
   * Format free time analysis results for user display
   */
  private formatFreeTimeAnalysis(
    freeTimeAnalysis: any,
    userTimezone: string
  ): string {
    let message = "🕐 Free time analysis:\n\n";

    if (freeTimeAnalysis.optimalSlots.length > 0) {
      message += `✨ OPTIMAL SLOTS (${freeTimeAnalysis.optimalSlots.length}):\n`;
      freeTimeAnalysis.optimalSlots
        .slice(0, 3)
        .forEach((slot: any, index: number) => {
          const startTime = slot.start.toLocaleTimeString("en-US", {
            timeZone: userTimezone,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          const endTime = slot.end.toLocaleTimeString("en-US", {
            timeZone: userTimezone,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          message += `${index + 1}. ${startTime} - ${endTime} (${
            slot.duration
          }min)\n   ${slot.reason}\n\n`;
        });
    }

    if (freeTimeAnalysis.slots.length > freeTimeAnalysis.optimalSlots.length) {
      const otherSlots = freeTimeAnalysis.slots.filter(
        (slot: any) => !freeTimeAnalysis.optimalSlots.includes(slot)
      );
      message += `⏰ OTHER AVAILABLE (${otherSlots.length}):\n`;
      otherSlots.slice(0, 2).forEach((slot: any, index: number) => {
        const startTime = slot.start.toLocaleTimeString("en-US", {
          timeZone: userTimezone,
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        message += `${index + 1}. ${startTime} (${slot.duration}min)\n`;
      });
    }

    if (freeTimeAnalysis.suggestions.length > 0) {
      message += `\n💡 Suggestions:\n${freeTimeAnalysis.suggestions.join(
        "\n"
      )}`;
    }

    return message;
  }
}
