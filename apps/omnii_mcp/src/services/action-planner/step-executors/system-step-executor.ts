import { BaseStepExecutor } from "./base-step-executor";
import {
  ActionStep,
  StepResult,
  ExecutionContext,
  SystemActionType,
  UserInterventionParams,
  StepState,
  PlanState,
  ExecutionContextType,
} from "../../../types/action-planning.types";
import { CachedEntity, EntityType } from "../../../types/entity.types";
import { redisCache } from "../../caching/redis-cache";
import {
  InterventionManager,
  InterventionRequest,
} from "../../workflows/intervention-manager";

/**
 * Executor for system-related action steps (interventions, etc.)
 */
export class SystemStepExecutor extends BaseStepExecutor {
  private interventionManager: InterventionManager;

  constructor(interventionManager: InterventionManager) {
    super();
    this.interventionManager = interventionManager;
  }

  async executeStep(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    try {
      switch (step.action) {
        case SystemActionType.USER_INTERVENTION:
          // Handle user interventions directly with InterventionManager
          console.log(
            `[SystemStepExecutor] Handling user intervention step: ${step.description}`
          );
          return await this.executeUserInterventionStep(step, context);

        default:
          return this.createStepResult(
            step,
            false,
            undefined,
            undefined,
            `Unknown system action: ${step.action}`
          );
      }
    } catch (error) {
      console.error(
        `[SystemStepExecutor] System step execution failed:`,
        error
      );
      return this.createStepResult(
        step,
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : "System operation failed"
      );
    }
  }

  /**
   * Execute user intervention step
   */
  private async executeUserInterventionStep(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    const params = step.params as UserInterventionParams;

    console.log(
      `[SystemStepExecutor] Requesting intervention via ${
        context.context || ExecutionContextType.SMS
      }: ${params.reason}`
    );

    // Create intervention request
    const interventionRequest: InterventionRequest = {
      sessionId: context.sessionId,
      stepId: step.id,
      reason: params.reason,
      entity: params.entityToResolve,
      timeout: params.timeout || 300,
      context: context.context || ExecutionContextType.SMS,
      userId: context.entityId, // For WebSocket
      phoneNumber: context.phoneNumber, // For SMS
    };

    // Update step state
    step.state = StepState.WAITING_INTERVENTION;
    context.planState = PlanState.WAITING_INTERVENTION;

    try {
      // Request intervention through appropriate channel
      const response = await this.interventionManager.requestIntervention(
        interventionRequest
      );

      if (response.success && response.resolvedValue) {
        // Cache the resolved entity for future use
        if (params.entityToResolve && response.resolvedValue) {
          const entityKey = `entity:${context.phoneNumber}:${params.entityToResolve.type}:${params.entityToResolve.value}`;
          await redisCache.set(
            entityKey,
            {
              email: response.resolvedValue,
              resolvedAt: Date.now(),
            },
            3600
          );
          console.log(
            `[SystemStepExecutor] Cached resolved entity: ${entityKey}`
          );

          // Update the entity in context for immediate use
          const entity = context.entities.find(
            (e) => e.value === params.entityToResolve?.value
          );
          if (entity) {
            entity.email = response.resolvedValue;
            entity.type = EntityType.PERSON; // Convert from UNKNOWN to PERSON
            console.log(
              `[SystemStepExecutor] Updated entity in context: ${entity.value} → ${entity.email}`
            );
          }
        }

        // Create successful result
        const result = this.createStepResult(
          step,
          true,
          { resolvedValue: response.resolvedValue },
          `Resolved: ${response.resolvedValue}`,
          undefined,
          StepState.COMPLETED
        );

        // Store result for dependent steps
        if (step.id) {
          context.stepResults.set(step.id, result);
        }

        // Update plan state to continue execution
        context.planState = PlanState.RUNNING;
        step.state = StepState.COMPLETED;
        return result;
      } else {
        // Handle failure or timeout
        const errorMessage = response.timedOut
          ? "User intervention timeout"
          : response.error || "User intervention failed";

        console.log(
          `[SystemStepExecutor] User intervention failed for ${context.context}: ${errorMessage}`
        );

        const result = this.createStepResult(
          step,
          false,
          undefined,
          undefined,
          errorMessage,
          response.timedOut ? StepState.TIMEOUT : StepState.FAILED
        );

        step.state = result.state!;
        return result;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Check if this is a WebSocket disconnection error
      if (
        errorMessage.includes("WebSocket connection lost") ||
        errorMessage.includes("not connected via WebSocket")
      ) {
        console.warn(
          `[SystemStepExecutor] WebSocket disconnection during intervention: ${errorMessage}`
        );

        // For WebSocket disconnections, return a specific error that can be handled by the client
        const result = this.createStepResult(
          step,
          false,
          undefined,
          "Connection lost during processing. Please reconnect and try again.",
          "WebSocket connection lost",
          StepState.FAILED
        );

        step.state = StepState.FAILED;
        context.planState = PlanState.FAILED;
        return result;
      }

      // For other errors, use the original error handling
      console.error(`[SystemStepExecutor] Error in user intervention:`, error);

      const result = this.createStepResult(
        step,
        false,
        undefined,
        undefined,
        errorMessage,
        StepState.FAILED
      );

      step.state = StepState.FAILED;
      return result;
    }
  }
}
