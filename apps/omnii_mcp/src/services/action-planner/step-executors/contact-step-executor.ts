import { BaseStepExecutor } from "./base-step-executor";
import {
  ActionStep,
  StepResult,
  ExecutionContext,
  ExecutionContextType,
  ContactActionType,
} from "../../../types/action-planning.types";
import unifiedGoogleManager from "../../unified-google-manager";

/**
 * Executor for contact-related action steps
 */
export class ContactStepExecutor extends BaseStepExecutor {
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
          `Unknown contact action: ${step.action}`
        );
      }

      console.log(
        `[ContactStepExecutor] Routing contact message to UnifiedGoogleManager: "${naturalMessage}"`
      );

      // Route to unified manager with context
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
        result.error
      );
    } catch (error) {
      console.error(
        `[ContactStepExecutor] Contact step execution failed:`,
        error
      );
      return this.createStepResult(
        step,
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : "Contact operation failed"
      );
    }
  }

  /**
   * Build natural language message for contact actions
   */
  private buildNaturalMessage(step: ActionStep): string | null {
    switch (step.action) {
      case ContactActionType.SEARCH_CONTACTS:
        return step.params.query
          ? `Search for contact ${step.params.query}`
          : "Search my contacts";

      case ContactActionType.GET_ALL_CONTACTS:
        return "Get all my contacts";

      case ContactActionType.CREATE_CONTACT:
      case "add_contact": // Handle legacy action name
        return step.params.name
          ? `Add a contact ${step.params.name}`
          : "Create a new contact";

      default:
        return null;
    }
  }
}
