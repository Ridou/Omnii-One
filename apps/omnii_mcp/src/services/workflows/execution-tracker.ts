/**
 * Execution Tracker Service
 *
 * Provides idempotent workflow execution tracking with Supabase persistence.
 * Prevents duplicate workflow executions on retry and tracks execution status
 * for MCP tool responses and debugging visibility.
 *
 * Key features:
 * - Exactly-once execution semantics via idempotency keys
 * - Status tracking: pending -> running -> completed/failed
 * - Cached results for completed executions
 * - Failed execution retry support
 *
 * @module ExecutionTracker
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

/**
 * Execution status enum matching database constraint
 */
export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

/**
 * Actor type enum matching database constraint
 */
export type ExecutionActor = "user" | "ai_assistant" | "system" | "webhook";

/**
 * Workflow execution record structure matching Supabase schema
 */
export interface WorkflowExecution {
  /** Idempotency key - primary key */
  id: string;
  /** n8n workflow ID or identifier */
  workflow_id: string;
  /** Human-readable workflow name */
  workflow_name?: string;
  /** User who triggered the execution */
  user_id: string;
  /** Current execution status */
  status: ExecutionStatus;
  /** Workflow output data (JSON) */
  result?: unknown;
  /** Error message if failed */
  error_message?: string;
  /** Input parameters used */
  parameters?: Record<string, unknown>;
  /** Who triggered the execution */
  actor?: ExecutionActor;
  /** When record was created */
  created_at: string;
  /** When record was last updated */
  updated_at: string;
  /** When execution started running */
  started_at?: string;
  /** When execution completed or failed */
  completed_at?: string;
}

/**
 * Options for creating a new execution
 */
export interface ExecuteOptions {
  /** Idempotency key (caller-provided or generated) */
  idempotencyKey: string;
  /** n8n workflow ID */
  workflowId: string;
  /** Human-readable workflow name */
  workflowName?: string;
  /** User ID triggering the execution */
  userId: string;
  /** Who is triggering the execution */
  actor?: ExecutionActor;
  /** Input parameters for the workflow */
  parameters?: Record<string, unknown>;
}

/**
 * Result from idempotent execution
 */
export interface ExecutionResult<T> {
  /** The result data */
  data: T;
  /** Whether this was a cached result */
  cached: boolean;
  /** The execution record */
  execution: WorkflowExecution;
}

// ============================================================================
// ExecutionTracker Class
// ============================================================================

/**
 * ExecutionTracker provides idempotent workflow execution tracking.
 *
 * Usage:
 * ```typescript
 * const tracker = getExecutionTracker();
 *
 * // Execute workflow with exactly-once semantics
 * const result = await tracker.executeIdempotent(
 *   {
 *     idempotencyKey: `send-email-${requestId}`,
 *     workflowId: "n8n-email-workflow",
 *     userId: user.id,
 *     actor: "ai_assistant",
 *     parameters: { to: "user@example.com", subject: "Hello" },
 *   },
 *   async () => {
 *     // Actual workflow execution
 *     return await n8nClient.executeWorkflow(params);
 *   }
 * );
 *
 * if (result.cached) {
 *   console.log("Returned cached result from previous execution");
 * }
 * ```
 */
export class ExecutionTracker {
  private supabase: SupabaseClient;
  private readonly TABLE_NAME = "workflow_executions";

  constructor() {
    const url = process.env.OMNII_SUPABASE_URL;
    const key = process.env.OMNII_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "OMNII_SUPABASE_URL and OMNII_SUPABASE_SERVICE_ROLE_KEY required for ExecutionTracker"
      );
    }

    // Use service role key for backend operations (bypasses RLS)
    this.supabase = createClient(url, key);
  }

  // --------------------------------------------------------------------------
  // Basic CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Get an execution by idempotency key.
   * Returns null if not found.
   */
  async getExecution(id: string): Promise<WorkflowExecution | null> {
    const { data, error } = await this.supabase
      .from(this.TABLE_NAME)
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw new Error(`Failed to get execution: ${error.message}`);
    }

    return data as WorkflowExecution | null;
  }

  /**
   * Create a new execution record with status='pending'.
   */
  async createExecution(options: ExecuteOptions): Promise<WorkflowExecution> {
    const { data, error } = await this.supabase
      .from(this.TABLE_NAME)
      .insert({
        id: options.idempotencyKey,
        workflow_id: options.workflowId,
        workflow_name: options.workflowName,
        user_id: options.userId,
        status: "pending" as ExecutionStatus,
        parameters: options.parameters,
        actor: options.actor,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create execution: ${error.message}`);
    }

    return data as WorkflowExecution;
  }

  /**
   * Mark execution as running. Sets started_at timestamp.
   */
  async markRunning(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.TABLE_NAME)
      .update({
        status: "running" as ExecutionStatus,
        started_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to mark execution running: ${error.message}`);
    }
  }

  /**
   * Mark execution as completed with result. Sets completed_at timestamp.
   */
  async markCompleted(id: string, result: unknown): Promise<void> {
    const { error } = await this.supabase
      .from(this.TABLE_NAME)
      .update({
        status: "completed" as ExecutionStatus,
        result: result,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to mark execution completed: ${error.message}`);
    }
  }

  /**
   * Mark execution as failed with error message. Sets completed_at timestamp.
   */
  async markFailed(id: string, errorMessage: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.TABLE_NAME)
      .update({
        status: "failed" as ExecutionStatus,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to mark execution failed: ${error.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // Idempotent Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a workflow with exactly-once semantics.
   *
   * Behavior based on existing execution state:
   * - Not found: Create new execution, run executor, return result
   * - Pending: Mark running, run executor, return result
   * - Running: Throw error (execution already in progress)
   * - Completed: Return cached result without re-executing
   * - Failed: Create new execution (allow retry), run executor, return result
   *
   * @param options - Execution options including idempotency key
   * @param executor - Async function that performs the actual workflow execution
   * @returns Execution result with data and cached flag
   * @throws Error if execution is already running
   */
  async executeIdempotent<T>(
    options: ExecuteOptions,
    executor: () => Promise<T>
  ): Promise<ExecutionResult<T>> {
    const { idempotencyKey } = options;

    // Check for existing execution
    const existing = await this.getExecution(idempotencyKey);

    if (existing) {
      switch (existing.status) {
        case "completed":
          // Return cached result
          return {
            data: existing.result as T,
            cached: true,
            execution: existing,
          };

        case "running":
          // Execution already in progress - reject duplicate request
          throw new Error(
            `Execution already in progress for idempotency key: ${idempotencyKey}`
          );

        case "failed":
          // Allow retry - will create a new execution attempt
          // Delete the failed record to allow fresh insert
          await this.supabase
            .from(this.TABLE_NAME)
            .delete()
            .eq("id", idempotencyKey);
          break;

        case "pending":
          // Orphaned pending record - mark as running and continue
          await this.markRunning(idempotencyKey);
          return await this.runExecution(existing, executor);
      }
    }

    // Create new execution record
    const execution = await this.createExecution(options);
    await this.markRunning(execution.id);

    return await this.runExecution(execution, executor);
  }

  /**
   * Run the actual execution and handle success/failure.
   */
  private async runExecution<T>(
    execution: WorkflowExecution,
    executor: () => Promise<T>
  ): Promise<ExecutionResult<T>> {
    try {
      // Run the executor
      const result = await executor();

      // Mark completed
      await this.markCompleted(execution.id, result);

      // Refresh execution record
      const updated = await this.getExecution(execution.id);

      return {
        data: result,
        cached: false,
        execution: updated ?? execution,
      };
    } catch (err) {
      // Mark failed
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      await this.markFailed(execution.id, errorMessage);

      // Re-throw to caller
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------

  /**
   * Get recent executions for a user.
   * Useful for MCP tool status queries and debugging.
   *
   * @param userId - User ID to query
   * @param limit - Maximum number of results (default: 20)
   */
  async getRecentExecutions(
    userId: string,
    limit: number = 20
  ): Promise<WorkflowExecution[]> {
    const { data, error } = await this.supabase
      .from(this.TABLE_NAME)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent executions: ${error.message}`);
    }

    return (data ?? []) as WorkflowExecution[];
  }

  /**
   * Get executions for a specific workflow.
   * Useful for workflow-specific debugging and monitoring.
   *
   * @param workflowId - Workflow ID to query
   * @param userId - User ID for isolation
   * @param limit - Maximum number of results (default: 50)
   */
  async getExecutionsByWorkflow(
    workflowId: string,
    userId: string,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    const { data, error } = await this.supabase
      .from(this.TABLE_NAME)
      .select("*")
      .eq("workflow_id", workflowId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get executions by workflow: ${error.message}`);
    }

    return (data ?? []) as WorkflowExecution[];
  }

  /**
   * Get executions by status for a user.
   * Useful for finding running or failed executions.
   *
   * @param userId - User ID to query
   * @param status - Status to filter by
   * @param limit - Maximum number of results (default: 50)
   */
  async getExecutionsByStatus(
    userId: string,
    status: ExecutionStatus,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    const { data, error } = await this.supabase
      .from(this.TABLE_NAME)
      .select("*")
      .eq("user_id", userId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get executions by status: ${error.message}`);
    }

    return (data ?? []) as WorkflowExecution[];
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let _executionTracker: ExecutionTracker | null = null;

/**
 * Get singleton ExecutionTracker instance.
 * Creates instance on first call (lazy initialization).
 */
export function getExecutionTracker(): ExecutionTracker {
  if (!_executionTracker) {
    _executionTracker = new ExecutionTracker();
  }
  return _executionTracker;
}

/**
 * Reset singleton for testing purposes.
 */
export function resetExecutionTracker(): void {
  _executionTracker = null;
}
