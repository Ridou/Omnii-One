import {
  ActionStep,
  StepResult,
  ExecutionContext,
  StepState,
} from "../../../types/action-planning.types";

/**
 * Base class for all step executors
 * Provides common functionality and interface
 */
export abstract class BaseStepExecutor {
  /**
   * Execute a step of a specific type
   */
  abstract executeStep(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<StepResult>;

  /**
   * Helper to create a properly typed StepResult
   */
  protected createStepResult(
    step: ActionStep,
    success: boolean,
    data?: any,
    message?: string,
    error?: string,
    state?: StepState,
    authRequired?: boolean,
    authUrl?: string | null
  ): StepResult {
    return {
      success,
      data,
      message,
      error,
      stepId: step.id,
      description: step.description,
      state: state || (success ? StepState.COMPLETED : StepState.FAILED),
      timestamp: Date.now(),
      authRequired: authRequired || false,
      authUrl: authUrl || null,
    };
  }

  /**
   * Check if error is retryable (server issues, timeouts, etc.)
   */
  protected isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorStr = error.toString().toLowerCase();

    // Composio server errors
    if (errorStr.includes("server unavailable")) return true;
    if (errorStr.includes("timeout")) return true;
    if (errorStr.includes("503")) return true;
    if (errorStr.includes("502")) return true;
    if (errorStr.includes("500")) return true;

    // Network errors
    if (errorStr.includes("network")) return true;
    if (errorStr.includes("connection")) return true;

    return false;
  }

  /**
   * Execute step with retry logic for Composio API failures
   */
  protected async executeWithRetry(
    step: ActionStep,
    context: ExecutionContext,
    maxRetries: number = 2
  ): Promise<StepResult> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[${this.constructor.name}] Step attempt ${attempt}/${maxRetries}`
        );

        const result = await this.executeStep(step, context);

        // If successful, return immediately
        if (result.success) {
          if (attempt > 1) {
            console.log(
              `[${this.constructor.name}] Step succeeded on retry ${attempt}`
            );
          }
          return result;
        }

        // If failed but not a server error, don't retry
        if (!this.isRetryableError(result.error)) {
          console.log(
            `[${this.constructor.name}] Non-retryable error: ${result.error}`
          );
          return result;
        }

        lastError = result.error;

        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s delays
          console.log(
            `[${this.constructor.name}] Retrying step in ${delay}ms due to: ${result.error}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error)) {
          console.log(
            `[${this.constructor.name}] Non-retryable exception: ${error}`
          );
          break;
        }

        if (attempt < maxRetries) {
          const delay = attempt * 2000;
          console.log(
            `[${this.constructor.name}] Retrying step in ${delay}ms due to exception: ${error}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error(
      `[${this.constructor.name}] Step failed after ${maxRetries} attempts:`,
      lastError
    );
    return this.createStepResult(
      step,
      false,
      undefined,
      undefined,
      lastError instanceof Error
        ? lastError.message
        : "Step execution failed after retries"
    );
  }
}
