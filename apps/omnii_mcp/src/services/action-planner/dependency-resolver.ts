import {
  ActionStep,
  StepResult,
  ExecutionContext,
  StepState,
} from "../../types/action-planning.types";

/**
 * Result of dependency validation
 */
export interface DependencyValidationResult {
  success: boolean;
  error?: string;
  updatedParams?: Record<string, any>;
}

/**
 * Individual dependency check result
 */
export interface DependencyCheckResult {
  stepId: string;
  field?: string;
  success: boolean;
  error?: string;
  extractedValue?: any;
}

/**
 * Handles all dependency validation and resolution logic
 */
export class DependencyResolver {
  /**
   * Check and resolve all dependencies for a step
   */
  async resolveDependencies(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<DependencyValidationResult> {
    console.log(
      `[DependencyResolver] Checking dependencies for step: ${step.id}`
    );

    try {
      // Handle the complex 'requires' system
      if (step.requires && step.requires.length > 0) {
        console.log(
          `[DependencyResolver] Checking ${step.requires.length} 'requires' dependencies`
        );
        const requiresResult = await this.checkRequiresDependencies(
          step.requires,
          context
        );
        if (!requiresResult.success) {
          return requiresResult;
        }
      }

      // Handle the simple 'dependsOn' system
      if (step.dependsOn && step.dependsOn.length > 0) {
        console.log(
          `[DependencyResolver] Checking ${step.dependsOn.length} 'dependsOn' dependencies`
        );
        const dependsOnResult = await this.checkDependsOnDependencies(
          step.dependsOn,
          context
        );
        if (!dependsOnResult.success) {
          return dependsOnResult;
        }
      }

      // All dependencies satisfied - compute updated parameters
      const updatedParams = await this.computeUpdatedParams(step, context);

      console.log(
        `[DependencyResolver] All dependencies satisfied for step: ${step.id}`
      );
      return {
        success: true,
        updatedParams,
      };
    } catch (error) {
      console.error(
        `[DependencyResolver] Error resolving dependencies:`,
        error
      );
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve dependencies",
      };
    }
  }

  /**
   * Check 'requires' dependencies (complex system with field extraction)
   */
  private async checkRequiresDependencies(
    requires: { stepId: string; field?: string }[],
    context: ExecutionContext
  ): Promise<DependencyValidationResult> {
    const checkResults: DependencyCheckResult[] = [];

    for (const dep of requires) {
      console.log(
        `[DependencyResolver] Checking requires dependency: ${dep.stepId}${
          dep.field ? ` (field: ${dep.field})` : ""
        }`
      );

      const result = await this.checkSingleRequirement(dep, context);
      checkResults.push(result);

      if (!result.success) {
        console.error(
          `[DependencyResolver] Requires dependency failed: ${result.error}`
        );
        return {
          success: false,
          error: result.error,
        };
      }
    }

    console.log(
      `[DependencyResolver] All requires dependencies satisfied (${checkResults.length})`
    );
    return { success: true };
  }

  /**
   * Check 'dependsOn' dependencies (simple system)
   */
  private async checkDependsOnDependencies(
    dependsOn: string[],
    context: ExecutionContext
  ): Promise<DependencyValidationResult> {
    for (const stepId of dependsOn) {
      console.log(
        `[DependencyResolver] Checking dependsOn dependency: ${stepId}`
      );

      const depResult = context.stepResults.get(stepId);

      if (!depResult) {
        const error = `Dependency step ${stepId} has not been executed`;
        console.error(`[DependencyResolver] ${error}`);
        return {
          success: false,
          error,
        };
      }

      if (depResult.state !== StepState.COMPLETED) {
        const error = `Dependency step ${stepId} is not completed (state: ${depResult.state})`;
        console.error(`[DependencyResolver] ${error}`);
        return {
          success: false,
          error,
        };
      }

      console.log(
        `[DependencyResolver] DependsOn dependency satisfied: ${stepId}`
      );
    }

    console.log(
      `[DependencyResolver] All dependsOn dependencies satisfied (${dependsOn.length})`
    );
    return { success: true };
  }

  /**
   * Check a single 'requires' dependency
   */
  private async checkSingleRequirement(
    requirement: { stepId: string; field?: string },
    context: ExecutionContext
  ): Promise<DependencyCheckResult> {
    const { stepId, field } = requirement;

    // Check if dependency step exists and completed
    const depResult = context.stepResults.get(stepId);

    if (!depResult) {
      return {
        stepId,
        field,
        success: false,
        error: `Dependency step ${stepId} has not been executed`,
      };
    }

    if (depResult.state !== StepState.COMPLETED) {
      return {
        stepId,
        field,
        success: false,
        error: `Dependency step ${stepId} is not completed (state: ${depResult.state})`,
      };
    }

    // If field is specified, validate and extract it
    if (field) {
      const extractedValue = this.extractFieldFromResult(depResult, field);

      if (extractedValue === undefined || extractedValue === null) {
        return {
          stepId,
          field,
          success: false,
          error: `Required field '${field}' not found in dependency ${stepId}`,
        };
      }

      console.log(
        `[DependencyResolver] Extracted field '${field}' from ${stepId}:`,
        extractedValue
      );

      return {
        stepId,
        field,
        success: true,
        extractedValue,
      };
    }

    // No field specified, just check completion
    return {
      stepId,
      success: true,
    };
  }

  /**
   * Extract a field value from a step result
   */
  private extractFieldFromResult(result: StepResult, field: string): any {
    // Try different paths where the field might be located
    const paths = [
      result.data?.[field], // Direct field access
      result[field as keyof StepResult], // Field on result itself
      this.getNestedValue(result.data, field), // Nested field access (e.g., "response.email")
    ];

    for (const value of paths) {
      if (value !== undefined && value !== null) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof path !== "string") return undefined;

    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Compute updated parameters based on dependency results
   */
  private async computeUpdatedParams(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<Record<string, any>> {
    const updatedParams = { ...step.params };

    // Only process 'requires' dependencies for parameter updates
    if (step.requires && step.requires.length > 0) {
      for (const requirement of step.requires) {
        const { stepId, field } = requirement;

        if (!field) continue; // No field to extract

        const depResult = context.stepResults.get(stepId);
        if (!depResult) continue; // Should not happen after validation

        const extractedValue = this.extractFieldFromResult(depResult, field);
        if (extractedValue !== undefined && extractedValue !== null) {
          // Update the parameter with the extracted value
          updatedParams[field] = extractedValue;
          console.log(
            `[DependencyResolver] Updated param '${field}' with value from ${stepId}:`,
            extractedValue
          );
        }
      }
    }

    return updatedParams;
  }

  /**
   * Check if a step has any dependencies
   */
  hasDependencies(step: ActionStep): boolean {
    return Boolean(
      (step.requires && step.requires.length > 0) ||
      (step.dependsOn && step.dependsOn.length > 0)
    );
  }

  /**
   * Get all dependency step IDs for a step
   */
  getDependencyStepIds(step: ActionStep): string[] {
    const stepIds = new Set<string>();

    // Add from 'requires'
    if (step.requires) {
      step.requires.forEach((req) => stepIds.add(req.stepId));
    }

    // Add from 'dependsOn'
    if (step.dependsOn) {
      step.dependsOn.forEach((stepId) => stepIds.add(stepId));
    }

    return Array.from(stepIds);
  }

  /**
   * Validate dependency chain for circular dependencies
   */
  validateDependencyChain(steps: ActionStep[]): {
    valid: boolean;
    circularDependencies?: string[];
  } {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const stepMap = new Map(steps.map((step) => [step.id, step]));

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true; // Circular dependency detected
      }

      if (visited.has(stepId)) {
        return false; // Already processed
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = stepMap.get(stepId);
      if (step) {
        const dependencies = this.getDependencyStepIds(step);
        for (const depId of dependencies) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    // Check each step for circular dependencies
    for (const step of steps) {
      if (!visited.has(step.id) && hasCycle(step.id)) {
        return {
          valid: false,
          circularDependencies: Array.from(recursionStack),
        };
      }
    }

    return { valid: true };
  }
}
