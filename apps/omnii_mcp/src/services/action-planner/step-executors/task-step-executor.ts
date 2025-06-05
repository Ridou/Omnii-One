import { BaseStepExecutor } from "./base-step-executor";
import {
  ActionStep,
  StepResult,
  ExecutionContext,
  ExecutionContextType,
  TaskActionType,
} from "../../../types/action-planning.types";
import unifiedGoogleManager from "../../unified-google-manager";

/**
 * Executor for task-related action steps
 */
export class TaskStepExecutor extends BaseStepExecutor {
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
          `Unknown task action: ${step.action}`
        );
      }

      console.log(
        `[TaskStepExecutor] Routing task message to UnifiedGoogleManager: "${naturalMessage}"`
      );

      // Route to unified manager
      const result = await unifiedGoogleManager.processMessage(
        naturalMessage,
        context.phoneNumber,
        context.userTimezone,
        context.localDatetime,
        context.context || ExecutionContextType.SMS
      );

      return this.createStepResult(
        step,
        result.success,
        result.rawData || result,
        result.message,
        result.error,
        undefined,
        result.authRequired,
        result.authUrl
      );
    } catch (error) {
      console.error(`[TaskStepExecutor] Task step execution failed:`, error);
      return this.createStepResult(
        step,
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : "Task operation failed"
      );
    }
  }

  /**
   * Build natural language message for task actions
   */
  private buildNaturalMessage(step: ActionStep): string | null {
    switch (step.action) {
      case TaskActionType.LIST_TASKS:
        return "list my tasks";

      case TaskActionType.CREATE_TASK:
        const taskTitle = step.params.task || step.params.title || "New Task";
        return step.params.message || `Create task to ${taskTitle}`;

      default:
        return null;
    }
  }
} 