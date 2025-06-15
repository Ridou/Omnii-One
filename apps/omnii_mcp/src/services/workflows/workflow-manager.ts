import { redisCache } from "../caching/redis-cache";
import {
  WorkflowState,
  ActionPlan,
  ExecutionContext,
  Entity,
  StepResult,
} from "../../types/action-planning.types";

export class WorkflowManager {
  private readonly WORKFLOW_TTL = 3600; // 1 hour
  private readonly ACTIVE_WORKFLOWS_TTL = 3600; // 1 hour

  /**
   * Create a new workflow state
   */
  async createWorkflow(
    sessionId: string,
    phoneNumber: string,
    plan: ActionPlan,
    executionContext: ExecutionContext
  ): Promise<WorkflowState> {
    const workflow: WorkflowState = {
      sessionId,
      phoneNumber,
      plan,
      executionContext,
      status: "running",
      currentStepIndex: 0,
      stepResults: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveWorkflow(workflow);
    await this.addActiveWorkflow(phoneNumber, sessionId);

    return workflow;
  }

  /**
   * Load workflow state from Redis
   */
  async loadWorkflow(sessionId: string): Promise<WorkflowState | null> {
    const key = `workflow:${sessionId}`;
    return await redisCache.get(key);
  }

  /**
   * Save workflow state to Redis
   */
  async saveWorkflow(
    workflow: WorkflowState,
    status?: WorkflowState["status"]
  ): Promise<void> {
    if (status) {
      workflow.status = status;
    }
    workflow.updatedAt = Date.now();

    const key = `workflow:${workflow.sessionId}`;
    await redisCache.set(key, workflow, this.WORKFLOW_TTL);
  }

  /**
   * Update workflow with intervention state
   */
  async setInterventionState(
    sessionId: string,
    stepId: string,
    reason: string,
    entity?: Entity
  ): Promise<void> {
    const workflow = await this.loadWorkflow(sessionId);
    if (!workflow) return;

    workflow.status = "waiting_intervention";
    workflow.interventionState = {
      stepId,
      reason,
      entity,
      waitingSince: Date.now(),
    };

    await this.saveWorkflow(workflow);
  }

  /**
   * Clear intervention state and mark as running
   */
  async clearInterventionState(sessionId: string): Promise<void> {
    const workflow = await this.loadWorkflow(sessionId);
    if (!workflow) return;

    workflow.status = "running";
    workflow.interventionState = undefined;

    await this.saveWorkflow(workflow);
  }

  /**
   * Add workflow to active list for phone number
   */
  async addActiveWorkflow(
    phoneNumber: string,
    sessionId: string
  ): Promise<void> {
    const key = `workflows:${phoneNumber}:active`;
    const active = (await redisCache.get(key)) || [];

    if (!active.includes(sessionId)) {
      active.push(sessionId);
      await redisCache.set(key, active, this.ACTIVE_WORKFLOWS_TTL);
    }
  }

  /**
   * Remove workflow from active list
   */
  async removeActiveWorkflow(
    phoneNumber: string,
    sessionId: string
  ): Promise<void> {
    const key = `workflows:${phoneNumber}:active`;
    const active = (await redisCache.get(key)) || [];
    const updated = active.filter((id: string) => id !== sessionId);
    await redisCache.set(key, updated, this.ACTIVE_WORKFLOWS_TTL);
  }

  /**
   * Get all active workflows for a phone number
   */
  async getActiveWorkflows(phoneNumber: string): Promise<WorkflowState[]> {
    const key = `workflows:${phoneNumber}:active`;
    const sessionIds = (await redisCache.get(key)) || [];

    const workflows = await Promise.all(
      sessionIds.map((id: string) => this.loadWorkflow(id))
    );

    return workflows.filter((w): w is WorkflowState => w !== null);
  }

  /**
   * Find waiting intervention for phone number
   */
  async findWaitingIntervention(
    phoneNumber: string
  ): Promise<WorkflowState | null> {
    const workflows = await this.getActiveWorkflows(phoneNumber);
    return workflows.find((w) => w.status === "waiting_intervention") || null;
  }

  /**
   * Update workflow step results
   */
  async addStepResult(sessionId: string, result: StepResult): Promise<void> {
    const workflow = await this.loadWorkflow(sessionId);
    if (!workflow) return;

    // Add the result
    workflow.stepResults.push(result);

    // Find the next step that has all dependencies satisfied
    const nextStepIndex = this.findNextExecutableStep(workflow);
    if (nextStepIndex !== -1) {
      workflow.currentStepIndex = nextStepIndex;
    }

    await this.saveWorkflow(workflow);
  }

  /**
   * Find the next step that has all dependencies satisfied
   */
  private findNextExecutableStep(workflow: WorkflowState): number {
    const { plan, stepResults, currentStepIndex } = workflow;
    const { steps } = plan;

    // Start from the current step
    for (let i = currentStepIndex; i < steps.length; i++) {
      const step = steps[i];

      // If step has no dependencies, it's executable
      if (!step.dependsOn || step.dependsOn.length === 0) {
        return i;
      }

      // Check if all dependencies are satisfied
      const allDepsSatisfied = step.dependsOn.every((depId: string) => {
        // Find the step result for this dependency
        const depResult = stepResults.find((r: StepResult) => r.stepId === depId);
        return depResult && depResult.success;
      });

      if (allDepsSatisfied) {
        return i;
      }
    }

    // No executable steps found
    return -1;
  }

  /**
   * Mark workflow as completed and clean up
   */
  async completeWorkflow(sessionId: string): Promise<void> {
    const workflow = await this.loadWorkflow(sessionId);
    if (!workflow) return;

    workflow.status = "completed";
    await this.saveWorkflow(workflow);
    await this.removeActiveWorkflow(workflow.phoneNumber, sessionId);
  }

  /**
   * Mark workflow as failed
   */
  async failWorkflow(sessionId: string, error?: string): Promise<void> {
    const workflow = await this.loadWorkflow(sessionId);
    if (!workflow) return;

    workflow.status = "failed";
    await this.saveWorkflow(workflow);
    await this.removeActiveWorkflow(workflow.phoneNumber, sessionId);
  }

  /**
   * Clean up stale workflows (for cron job)
   */
  async cleanupStaleWorkflows(): Promise<number> {
    // This would need Redis SCAN to find all workflow keys
    // For now, return 0 as placeholder
    console.log("[WorkflowManager] Cleanup not implemented yet");
    return 0;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return redisCache.isAvailable();
  }
}
