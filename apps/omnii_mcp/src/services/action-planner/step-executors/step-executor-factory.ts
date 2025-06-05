import { BaseStepExecutor } from "./base-step-executor";
import { EmailStepExecutor } from "./email-step-executor";
import { CalendarStepExecutor } from "./calendar-step-executor";
import { TaskStepExecutor } from "./task-step-executor";
import { ContactStepExecutor } from "./contact-step-executor";
import { AnalysisStepExecutor } from "./analysis-step-executor";
import { SystemStepExecutor } from "./system-step-executor";
import { DependencyResolver } from "../dependency-resolver";
import {
  ActionStep,
  StepResult,
  ExecutionContext,
  ActionType,
  StepState,
} from "../../../types/action-planning.types";
import { InterventionManager } from "../../intervention-manager";

/**
 * Factory for creating and managing step executors with dependency resolution
 */
export class StepExecutorFactory {
  private executors = new Map<ActionType, BaseStepExecutor>();
  private dependencyResolver: DependencyResolver;

  constructor(interventionManager?: InterventionManager) {
    // Initialize dependency resolver
    this.dependencyResolver = new DependencyResolver();

    // Register step executors
    this.executors.set("email", new EmailStepExecutor());
    this.executors.set("calendar", new CalendarStepExecutor());
    this.executors.set("task", new TaskStepExecutor());
    this.executors.set("contact", new ContactStepExecutor());
    this.executors.set("analysis", new AnalysisStepExecutor());

    // System executor needs intervention manager
    if (interventionManager) {
      this.executors.set("system", new SystemStepExecutor(interventionManager));
    }
  }

  /**
   * Execute a step using the appropriate executor with dependency resolution
   */
  async executeStep(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    console.log(
      `[StepExecutorFactory] Executing step: ${step.type} (${step.id})`
    );

    // 1. Check and resolve dependencies first
    if (this.dependencyResolver.hasDependencies(step)) {
      console.log(`[StepExecutorFactory] Step has dependencies, resolving...`);

      const dependencyResult =
        await this.dependencyResolver.resolveDependencies(step, context);

      if (!dependencyResult.success) {
        console.error(
          `[StepExecutorFactory] Dependency resolution failed: ${dependencyResult.error}`
        );
        return this.createFailedResult(
          step,
          `Dependency resolution failed: ${dependencyResult.error}`
        );
      }

      // Update step parameters with resolved dependencies
      if (dependencyResult.updatedParams) {
        console.log(
          `[StepExecutorFactory] Updating step params with dependency values`
        );
        step.params = {
          ...step.params,
          ...dependencyResult.updatedParams,
        };
      }

      console.log(`[StepExecutorFactory] Dependencies resolved successfully`);
    } else {
      console.log(`[StepExecutorFactory] Step has no dependencies`);
    }

    // 2. Find and execute with appropriate executor
    const executor = this.executors.get(step.type);

    if (!executor) {
      console.error(
        `[StepExecutorFactory] No executor found for step type: ${step.type}`
      );
      return this.createFailedResult(
        step,
        `No executor found for step type: ${step.type}`
      );
    }

    console.log(
      `[StepExecutorFactory] Using ${executor.constructor.name} for execution`
    );

    try {
      // Execute the step with the appropriate executor
      const result = await executor.executeStep(step, context);

      console.log(
        `[StepExecutorFactory] Step execution ${
          result.success ? "succeeded" : "failed"
        }`
      );

      return result;
    } catch (error) {
      console.error(`[StepExecutorFactory] Step execution threw error:`, error);
      return this.createFailedResult(
        step,
        error instanceof Error ? error.message : "Step execution failed"
      );
    }
  }

  /**
   * Validate all steps in a plan for dependency issues
   */
  validatePlanDependencies(steps: ActionStep[]): {
    valid: boolean;
    errors: string[];
  } {
    console.log(
      `[StepExecutorFactory] Validating dependencies for ${steps.length} steps`
    );

    const errors: string[] = [];

    // Check for circular dependencies
    const circularCheck =
      this.dependencyResolver.validateDependencyChain(steps);
    if (!circularCheck.valid) {
      errors.push(
        `Circular dependency detected: ${circularCheck.circularDependencies?.join(
          " -> "
        )}`
      );
    }

    // Check that all referenced dependencies exist
    const stepIds = new Set(steps.map((step) => step.id));
    for (const step of steps) {
      const dependencyIds = this.dependencyResolver.getDependencyStepIds(step);
      for (const depId of dependencyIds) {
        if (!stepIds.has(depId)) {
          errors.push(`Step ${step.id} depends on non-existent step: ${depId}`);
        }
      }
    }

    const valid = errors.length === 0;
    console.log(
      `[StepExecutorFactory] Plan validation ${
        valid ? "passed" : "failed"
      } with ${errors.length} errors`
    );

    return { valid, errors };
  }

  /**
   * Check if an executor exists for the given step type
   */
  hasExecutor(stepType: ActionType): boolean {
    return this.executors.has(stepType);
  }

  /**
   * Get list of supported step types
   */
  getSupportedStepTypes(): ActionType[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Get dependency resolver (for external access if needed)
   */
  getDependencyResolver(): DependencyResolver {
    return this.dependencyResolver;
  }

  /**
   * Create a failed StepResult for dependency or executor errors
   */
  private createFailedResult(step: ActionStep, error: string): StepResult {
    return {
      success: false,
      error,
      stepId: step.id,
      description: step.description,
      state: StepState.FAILED,
      timestamp: Date.now(),
      authRequired: false,
      authUrl: null,
    };
  }
}
