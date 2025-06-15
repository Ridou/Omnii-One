import {
  ActionPlan,
  ActionStep,
  ApprovalStep,
  WorkflowDraft,
  ApprovalState,
  RiskLevel,
  StepState,
  PlanState,
  ExecutionContext,
  Entity,
  PlanExecutionResult,
} from "../../types/action-planning.types";

import {
  WorkflowDraftMessage,
  WorkflowApprovalMessage,
  StepExecutionMessage,
  WorkflowDraftPayload,
  WorkflowApprovalPayload,
} from "../../types/websocket.types";

import { ActionPlanner } from "../core/action-planner";
import { WebSocketHandlerService } from "../core/websocket-handler.service";
import { redisCache } from "../caching/redis-cache";

/**
 * Redis key structure for MVP
 */
const REDIS_KEYS = {
  // Workflow drafts awaiting approval
  WORKFLOW_DRAFT: (sessionId: string) => `workflow:draft:${sessionId}`,

  // Active workflows per user (for cleanup)
  USER_WORKFLOWS: (userId: string) => `user:${userId}:workflows`,

  // Simple TTL: 2 hours for drafts, 24 hours for completed
  DRAFT_TTL: 2 * 60 * 60, // 2 hours
  COMPLETED_TTL: 24 * 60 * 60, // 24 hours
} as const;

/**
 * ApprovalWorkflowManager handles the workflow approval system
 */
export class ApprovalWorkflowManager {
  constructor(
    private actionPlanner: ActionPlanner,
    private websocketHandler: WebSocketHandlerService
  ) {}

  /**
   * Create a workflow draft from user message
   */
  async createWorkflowDraft(
    message: string,
    userId: string,
    phoneNumber: string,
    entities: Entity[]
  ): Promise<WorkflowDraft> {
    // 1. Create ActionPlan using existing planner
    const actionPlan = await this.actionPlanner.createPlan(message, entities as any);

    // 2. Convert to WorkflowDraft
    const sessionId = this.generateSessionId();
    const draft: WorkflowDraft = {
      ...actionPlan,
      userId,
      phoneNumber,
      entities: entities as any,
      steps: actionPlan.steps.map((step) => this.enhanceStepForApproval(step)),
      approvalStatus: ApprovalState.DRAFT_PENDING,
      estimatedDuration: this.calculateEstimatedDuration(actionPlan.steps),
      createdAt: Date.now(),
      lastInteraction: Date.now(),
      executionContext: this.createExecutionContext(
        userId,
        phoneNumber,
        entities,
        sessionId
      ),
    };

    // 3. Store in Redis
    await this.storeDraft(sessionId, draft);

    // 4. Send to user via WebSocket
    await this.sendDraftToUser(sessionId, draft);

    return draft;
  }

  /**
   * Process approval decision from user
   */
  async processApproval(
    sessionId: string,
    approval: WorkflowApprovalPayload
  ): Promise<void> {
    // 1. Load draft from Redis
    const draft = await this.loadDraft(sessionId);
    if (!draft) {
      throw new Error(`Draft not found for session: ${sessionId}`);
    }

    // 2. Apply approval action
    switch (approval.action) {
      case "approve_all":
        await this.approveAllSteps(draft);
        break;
      case "approve_step":
        if (!approval.stepId)
          throw new Error("stepId required for approve_step");
        await this.approveStep(draft, approval.stepId);
        break;
      case "reject_step":
        if (!approval.stepId)
          throw new Error("stepId required for reject_step");
        await this.rejectStep(draft, approval.stepId, approval.reason);
        break;
      case "modify_step":
        if (!approval.stepId || !approval.modifications) {
          throw new Error("stepId and modifications required for modify_step");
        }
        await this.modifyStep(draft, approval.stepId, approval.modifications);
        break;
      case "cancel_all":
        await this.cancelWorkflow(draft);
        return;
    }

    // 3. Update last interaction
    draft.lastInteraction = Date.now();

    // 4. Check if ready to execute
    if (this.isReadyForExecution(draft)) {
      await this.executeApprovedWorkflow(draft);
    } else {
      // Save updated draft and wait for more approvals
      await this.storeDraft(sessionId, draft);
    }
  }

  /**
   * Enhance ActionStep for approval workflow
   */
  private enhanceStepForApproval(step: ActionStep): ApprovalStep {
    return {
      ...step,
      approvalStatus: ApprovalState.DRAFT_PENDING,
      riskLevel: this.calculateRiskLevel(step),
      estimatedTime: this.estimateStepTime(step),
      expectedOutcome: this.generateExpectedOutcome(step),
      isModified: false,
    };
  }

  /**
   * Calculate risk level for a step (simple MVP implementation)
   */
  private calculateRiskLevel(step: ActionStep): RiskLevel {
    // Simple risk assessment for MVP
    const HIGH_RISK_ACTIONS = ["send_email", "create_event"];
    const MEDIUM_RISK_ACTIONS = [
      "create_draft",
      "create_task",
      "create_contact",
    ];

    if (HIGH_RISK_ACTIONS.includes(step.action)) return RiskLevel.HIGH;
    if (MEDIUM_RISK_ACTIONS.includes(step.action)) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Estimate step execution time
   */
  private estimateStepTime(step: ActionStep): string {
    // Simple time estimates for MVP
    const timeMap: Record<string, string> = {
      list_events: "5 seconds",
      list_tasks: "5 seconds",
      search_contacts: "10 seconds",
      create_event: "15 seconds",
      create_task: "10 seconds",
      create_draft: "20 seconds",
      send_email: "15 seconds",
    };

    return timeMap[step.action] || "10 seconds";
  }

  /**
   * Generate expected outcome description
   */
  private generateExpectedOutcome(step: ActionStep): string {
    const outcomeMap: Record<string, string> = {
      list_events: "Show your upcoming calendar events",
      list_tasks: "Display your current tasks",
      search_contacts: "Find contact information",
      create_event: "Schedule event in Google Calendar",
      create_task: "Add task to Google Tasks",
      create_draft: "Create email draft in Gmail",
      send_email: "Send email via Gmail",
      create_contact: "Add contact to Google Contacts",
    };

    return outcomeMap[step.action] || `Complete ${step.action} operation`;
  }

  /**
   * Calculate estimated duration for entire workflow
   */
  private calculateEstimatedDuration(steps: ActionStep[]): string {
    const totalSeconds = steps.length * 10; // Simple estimate: 10 seconds per step
    if (totalSeconds < 60) return `${totalSeconds} seconds`;
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  /**
   * Create execution context for workflow
   */
  private createExecutionContext(
    userId: string,
    phoneNumber: string,
    entities: Entity[],
    sessionId: string
  ): ExecutionContext {
    return {
      entityId: userId, // For MVP, use userId as entityId
      phoneNumber,
      userTimezone: "UTC", // Default for MVP
      stepResults: new Map(),
      currentStepIndex: 0,
      entities: entities as any,
      sessionId,
      planState: PlanState.CREATED,
    };
  }

  /**
   * Store workflow draft in Redis
   */
  private async storeDraft(
    sessionId: string,
    draft: WorkflowDraft
  ): Promise<void> {
    try {
      await redisCache.set(
        REDIS_KEYS.WORKFLOW_DRAFT(sessionId),
        draft,
        REDIS_KEYS.DRAFT_TTL
      );

      // Track active workflow for user
      const activeWorkflows =
        (await redisCache.get(REDIS_KEYS.USER_WORKFLOWS(draft.userId))) || [];
      if (!activeWorkflows.includes(sessionId)) {
        activeWorkflows.push(sessionId);
        await redisCache.set(
          REDIS_KEYS.USER_WORKFLOWS(draft.userId),
          activeWorkflows,
          REDIS_KEYS.DRAFT_TTL
        );
      }
    } catch (error) {
      console.error(`[ApprovalWorkflowManager] Failed to store draft:`, error);
      throw error;
    }
  }

  /**
   * Load workflow draft from Redis
   */
  private async loadDraft(sessionId: string): Promise<WorkflowDraft | null> {
    try {
      return await redisCache.get(REDIS_KEYS.WORKFLOW_DRAFT(sessionId));
    } catch (error) {
      console.error(`[ApprovalWorkflowManager] Failed to load draft:`, error);
      return null;
    }
  }

  /**
   * Send workflow draft to user via WebSocket
   */
  private async sendDraftToUser(
    sessionId: string,
    draft: WorkflowDraft
  ): Promise<void> {
    const payload: WorkflowDraftPayload = {
      originalMessage: draft.originalMessage,
      summary: draft.summary,
      totalSteps: draft.steps.length,
      estimatedDuration: draft.estimatedDuration,
      steps: draft.steps.map((step: ApprovalStep, index: number) => ({
        id: step.id,
        order: index + 1,
        description: step.description,
        type: step.type,
        action: step.action,
        riskLevel: step.riskLevel,
        estimatedTime: step.estimatedTime,
        dependencies: step.dependsOn || [],
        expectedOutcome: step.expectedOutcome,
        state: step.state,
        approvalStatus: step.approvalStatus,
        params: this.sanitizeParamsForUser(step.params),
      })),
      risks: this.identifyRisks(draft.steps),
    };

    const message: WorkflowDraftMessage = {
      type: "WORKFLOW_DRAFT",
      sessionId,
      payload,
      timestamp: Date.now(),
    };

    // Send via WebSocket (assuming userId maps to connection)
    await this.websocketHandler.sendToClient(draft.userId, message);
  }

  /**
   * Sanitize step parameters for user display
   */
  private sanitizeParamsForUser(
    params: Record<string, any>
  ): Record<string, any> {
    // For MVP, just return params as-is
    // In production, might want to hide sensitive data
    return { ...params };
  }

  /**
   * Identify risks in workflow steps
   */
  private identifyRisks(
    steps: ApprovalStep[]
  ): { stepId: string; level: RiskLevel; description: string }[] {
    return steps
      .filter((step: ApprovalStep) => step.riskLevel !== RiskLevel.LOW)
      .map((step: ApprovalStep) => ({
        stepId: step.id,
        level: step.riskLevel,
        description: this.getRiskDescription(step),
      }));
  }

  /**
   * Get risk description for step
   */
  private getRiskDescription(step: ApprovalStep): string {
    const riskMap: Record<string, string> = {
      send_email: "Will send an email from your Gmail account",
      create_event: "Will create an event in your Google Calendar",
      create_draft: "Will create a draft in your Gmail account",
      create_task: "Will add a task to your Google Tasks",
      create_contact: "Will add a contact to your Google Contacts",
    };

    return riskMap[step.action] || `Will perform ${step.action} operation`;
  }

  /**
   * Approve all steps in workflow
   */
  private async approveAllSteps(draft: WorkflowDraft): Promise<void> {
    draft.steps.forEach((step: ApprovalStep) => {
      step.approvalStatus = ApprovalState.STEP_APPROVED;
    });
    draft.approvalStatus = ApprovalState.STEP_APPROVED;
  }

  /**
   * Approve specific step
   */
  private async approveStep(
    draft: WorkflowDraft,
    stepId: string
  ): Promise<void> {
    const step = draft.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);

    step.approvalStatus = ApprovalState.STEP_APPROVED;
  }

  /**
   * Reject specific step
   */
  private async rejectStep(
    draft: WorkflowDraft,
    stepId: string,
    reason?: string
  ): Promise<void> {
    const step = draft.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);

    step.approvalStatus = ApprovalState.STEP_REJECTED;
    // Could store rejection reason in step metadata
  }

  /**
   * Modify step parameters
   */
  private async modifyStep(
    draft: WorkflowDraft,
    stepId: string,
    modifications: Record<string, any>
  ): Promise<void> {
    const step = draft.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);

    // Store original params for potential rollback
    if (!step.originalParams) {
      step.originalParams = { ...step.params };
    }

    step.userModifications = modifications;
    step.params = { ...step.params, ...modifications };
    step.isModified = true;
    step.approvalStatus = ApprovalState.STEP_MODIFIED;
  }

  /**
   * Cancel entire workflow
   */
  private async cancelWorkflow(draft: WorkflowDraft): Promise<void> {
    draft.approvalStatus = ApprovalState.USER_CANCELLED;
    draft.state = PlanState.FAILED;

    // Clean up from Redis
    await redisCache.del(
      REDIS_KEYS.WORKFLOW_DRAFT(draft.executionContext.sessionId)
    );
  }

  /**
   * Check if workflow is ready for execution
   */
  private isReadyForExecution(draft: WorkflowDraft): boolean {
    // At least one step must be approved
    const approvedSteps = draft.steps.filter(
      (step) =>
        step.approvalStatus === ApprovalState.STEP_APPROVED ||
        step.approvalStatus === ApprovalState.STEP_MODIFIED
    );

    return approvedSteps.length > 0;
  }

  /**
   * Execute approved workflow using existing ActionPlanner
   */
  private async executeApprovedWorkflow(draft: WorkflowDraft): Promise<void> {
    try {
      // Filter to only approved/modified steps
      const approvedSteps = draft.steps.filter(
        (step) =>
          step.approvalStatus === ApprovalState.STEP_APPROVED ||
          step.approvalStatus === ApprovalState.STEP_MODIFIED
      );

      // Convert back to ActionPlan for execution
      const actionPlan: ActionPlan = {
        steps: approvedSteps,
        originalMessage: draft.originalMessage,
        summary: draft.summary,
        isMultiStep: draft.isMultiStep,
        currentStepIndex: 0,
        state: PlanState.RUNNING,
      };

      // Execute using existing ActionPlanner
      const result: PlanExecutionResult = await this.actionPlanner.executePlan(
        actionPlan,
        draft.executionContext
      );

      // Update draft state
      draft.state = result.finalState;

      // Send execution result to user
      await this.sendExecutionResult(draft.executionContext.sessionId, result);

      // Store completed workflow with longer TTL
      await redisCache.set(
        REDIS_KEYS.WORKFLOW_DRAFT(draft.executionContext.sessionId),
        draft,
        REDIS_KEYS.COMPLETED_TTL
      );
    } catch (error) {
      console.error(`[ApprovalWorkflowManager] Execution failed:`, error);

      // Send error to user
      const errorMessage: StepExecutionMessage = {
        type: "STEP_EXECUTION",
        sessionId: draft.executionContext.sessionId,
        payload: {
          stepId: "execution_error",
          status: StepState.FAILED,
          message: `Workflow execution failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
        timestamp: Date.now(),
      };

      await this.websocketHandler.sendToClient(draft.userId, errorMessage);
    }
  }

  /**
   * Send execution result to user
   */
  private async sendExecutionResult(
    sessionId: string,
    result: PlanExecutionResult
  ): Promise<void> {
    // For MVP, send a simple completion message
    // In future phases, could send detailed step-by-step updates

    const message: StepExecutionMessage = {
      type: "STEP_EXECUTION",
      sessionId,
      payload: {
        stepId: "workflow_complete",
        status: result.success ? StepState.COMPLETED : StepState.FAILED,
        message: result.message,
        result: {
          success: result.success,
          stepId: "workflow_complete",
          description: "Workflow execution completed",
          state: result.success ? StepState.COMPLETED : StepState.FAILED,
          timestamp: Date.now(),
          message: result.message,
          data: {
            executedSteps: result.executedSteps,
            finalState: result.finalState,
            stepResults: result.stepResults,
          },
        },
      },
      timestamp: Date.now(),
    };

    // Find the userId from the workflow to send the result
    try {
      const draft = await this.loadDraft(sessionId);
      if (draft) {
        console.log(
          `[ApprovalWorkflowManager] Sending execution result to user ${draft.userId}`
        );
        await this.websocketHandler.sendToClient(draft.userId, message);
      } else {
        console.warn(
          `[ApprovalWorkflowManager] Could not find draft for session ${sessionId} to send result`
        );
      }
    } catch (error) {
      console.error(
        `[ApprovalWorkflowManager] Failed to send execution result:`,
        error
      );
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
