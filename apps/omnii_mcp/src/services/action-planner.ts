import { OpenAI } from "openai";
import {
  ActionPlan,
  ActionStep,
  ActionType,
  ExecutionContext,
  PlanExecutionResult,
  StepResult,
  CalendarActionType,
  TaskActionType,
  AnalysisActionType,
  ContactActionType,
  EmailActionType,
  SystemActionType,
  UserInterventionParams,
  Entity,
  StepState,
  PlanState,
  ExecutionContextType,
} from "../types/action-planning.types";
import { CachedEntity, EntityType } from "../types/entity.types";
import unifiedGoogleManager from "./unified-google-manager";
import { CalendarTemporalManager } from "./calendar-temporal-manager";
import twilioService from "./twilio-service";
import { redisCache } from "./redis-cache";
import {
  InterventionManager,
  InterventionRequest,
} from "./intervention-manager";
import { EntityManager } from "./entity-recognizer";
import responseManager from "./response-manager";
import { StepExecutorFactory } from "./action-planner/step-executors/step-executor-factory";
import { DependencyResolver } from "./action-planner/dependency-resolver";
import {
  generateStepId,
  ENTITY_PLACEHOLDER,
  slugify,
} from "./action-planner/action-planner-utils";
import { isValidUnifiedToolResponse, validateUnifiedToolResponse } from "@omnii/validators";
import { getObjectStructure, logObjectStructure } from '../utils/object-structure';
import { EmailStepExecutor } from './action-planner/step-executors/email-step-executor';
import { CalendarStepExecutor } from './action-planner/step-executors/calendar-step-executor';
import { ContactStepExecutor } from './action-planner/step-executors/contact-step-executor';
import { TaskStepExecutor } from './action-planner/step-executors/task-step-executor';
import { 
  extractEntitiesFromPlan,
  fillEntityPlaceholders,
  extractActionStepsFromPlan
} from "./action-planner-utils";

export class ActionPlanner {
  private openai: OpenAI;
  private temporalContextManager: CalendarTemporalManager;
  private interventionManager: InterventionManager;
  private entityManager: EntityManager;
  private stepExecutorFactory: StepExecutorFactory;

  constructor(interventionManager?: InterventionManager) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.temporalContextManager = new CalendarTemporalManager();
    this.interventionManager = interventionManager || new InterventionManager();
    this.entityManager = new EntityManager();
    this.stepExecutorFactory = new StepExecutorFactory(
      this.interventionManager
    );
  }

  /**
   * Analyze message and create action plan
   */
  async createPlan(
    message: string,
    entities?: CachedEntity[]
  ): Promise<ActionPlan> {
    try {
      console.log(`[ActionPlanner] Creating plan for: "${message}"`);

      // Get initial plan from LLM
      const initialPlan = await this.createPlanWithLLM(message, entities);

      // Apply placeholder patching if entities are available
      if (entities && entities.length > 0) {
        initialPlan.steps = this.entityManager.patchEmailPlaceholders(
          initialPlan.steps,
          entities
        );
      }

      // Validate plan dependencies before proceeding
      const validationResult =
        this.stepExecutorFactory.validatePlanDependencies(initialPlan.steps);
      if (!validationResult.valid) {
        console.warn(
          `[ActionPlanner] Plan validation found issues:`,
          validationResult.errors
        );
        // Log but don't fail - we'll handle issues during execution
      }

      // Check for unresolved placeholders after patching
      if (this.entityManager.hasUnresolvedPlaceholders(initialPlan.steps)) {
        console.log(
          `[ActionPlanner] Found unresolved placeholders, checking for entities that need resolution`
        );

        // Find entities that need resolution (either UNKNOWN or PERSON entities needing email)
        const entitiesNeedingResolution =
          entities?.filter(
            (e) =>
              e.type === EntityType.UNKNOWN ||
              (e.type === EntityType.PERSON && e.needsEmailResolution)
          ) || [];

        if (entitiesNeedingResolution.length > 0) {
          console.log(
            `[ActionPlanner] Found ${entitiesNeedingResolution.length} entities needing resolution`
          );

          // Create intervention steps using proper enum
          const interventionSteps = entitiesNeedingResolution.map(
            (entity, idx) => {
              let reason: string;
              if (entity.type === EntityType.UNKNOWN) {
                reason = `I don't recognize "${entity.value}". Please provide their email address:`;
              } else {
                // PERSON entity with needsEmailResolution
                reason = `I found "${
                  entity.displayName || entity.value
                }" in your contacts but they don't have an email address. Please provide their email:`;
              }

              return this.createActionStep(
                "system",
                SystemActionType.USER_INTERVENTION,
                {
                  reason,
                  entityToResolve: entity,
                  timeout: 300,
                  state: StepState.PENDING,
                  timestamp: Date.now(),
                },
                `Resolve email for: ${entity.displayName || entity.value}`,
                `intervention_${idx}`
              );
            }
          );

          // Update dependencies - make email steps depend on relevant interventions
          initialPlan.steps.forEach((step) => {
            if (
              step.type === "email" &&
              (step.action === EmailActionType.SEND_EMAIL ||
                step.action === EmailActionType.CREATE_DRAFT ||
                step.action === "send_email" ||
                step.action === "create_draft")
            ) {
              const stepDeps = new Set<string>();

              // Check which intervention steps this email step depends on
              entitiesNeedingResolution.forEach((entity, idx) => {
                const params = JSON.stringify(step.params || {});
                if (
                  params.includes(entity.value) ||
                  (entity.displayName && params.includes(entity.displayName))
                ) {
                  stepDeps.add(`intervention_${idx}`);
                }
              });

              if (stepDeps.size > 0) {
                step.dependsOn = Array.from(stepDeps);
              }
            }
          });

          return {
            ...initialPlan,
            steps: [...interventionSteps, ...initialPlan.steps],
            isMultiStep: true,
            currentStepIndex: 0,
            state: PlanState.CREATED,
          };
        }
      }

      return initialPlan;
    } catch (error) {
      console.error(`[ActionPlanner] Error creating plan:`, error);

      // Fallback: treat as single general step
      return {
        steps: [
          this.createActionStep(
            "analysis",
            "general_response",
            { message },
            "Handle general message"
          ),
        ],
        originalMessage: message,
        summary: "Handle user message",
        isMultiStep: false,
        currentStepIndex: 0,
        state: PlanState.CREATED,
      };
    }
  }

  /**
   * Create plan using LLM (extracted from original createPlan)
   */
  private async createPlanWithLLM(
    message: string,
    entities?: CachedEntity[]
  ): Promise<ActionPlan> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an action planner. Analyze user messages and break them down into sequential steps.

IMPORTANT: For any PERSON entity used as an email recipient, use a placeholder in the form {{ENTITY:<slugified-name>}} for recipient_email. For example, for 'Eden Chan', use recipient_email: "{{ENTITY:eden-chan}}". Do NOT guess the email address. The system will resolve the placeholder at execution time.

Available action types:
- calendar: list_events, create_event, find_free_time
- task: list_tasks, create_task, update_task, complete_task  
- contact: search_contacts, get_all_contacts, create_contact
- analysis: find_free_time, suggest_times, check_conflicts
- email: send_email, create_draft, fetch_emails, add_label, create_label, delete_draft, delete_message, fetch_message_by_id, fetch_message_by_thread_id, get_attachment, list_drafts, list_labels, list_threads, modify_thread_labels, move_to_trash, remove_label, reply_to_thread, get_profile

Return a JSON object with this structure:
{
  "isMultiStep": boolean,
  "summary": "Brief description of what will be done",
  "steps": [
    {
      "type": "calendar|task|contact|analysis|email",
      "action": "specific_action",
      "params": { "key": "value" },
      "description": "What this step does",
      "id": "unique_id"
    }
  ]
}

Examples:
- "Send an email to Eden Chan" → recipient_email: "{{ENTITY:eden-chan}}"
- "Create a draft to Sarah" → recipient_email: "{{ENTITY:sarah}}"
- "Add a contact John" → action: "create_contact", params: { "name": "John" }
- "Search for contact Sarah" → action: "search_contacts", params: { "query": "Sarah" }
- "Get all contacts" → action: "get_all_contacts"

Reference the following email actions and their parameters:
- send_email: Send an email using Gmail. Params: recipient_email (required), subject (required), body (required), cc, bcc, is_html, attachment, extra_recipients, user_id (defaults to me)
- create_draft: Create a draft email. Params: recipient_email (required), subject (required), body (required), cc, bcc, is_html, attachment, extra_recipients, thread_id, user_id (defaults to me)
- fetch_emails: Fetch emails. Params: query, label_ids, max_results, include_payload, include_spam_trash, user_id (defaults to me)
- add_label: Add a label to an email. Params: message_id (required), add_label_ids, remove_label_ids, user_id (defaults to me)
- create_label: Create a new label. Params: label_name (required), label_list_visibility, message_list_visibility, user_id (defaults to me)
- delete_draft: Delete a draft. Params: draft_id (required), user_id (defaults to me)
- delete_message: Delete an email message. Params: message_id (required), user_id (defaults to me)
- fetch_message_by_id: Fetch a message by message_id. Params: message_id (required), format, user_id (defaults to me)
- fetch_message_by_thread_id: Fetch messages by thread_id. Params: thread_id (required), page_token, user_id (defaults to me)
- get_attachment: Get an attachment. Params: message_id (required), attachment_id (required), file_name (required), user_id (defaults to me)
- list_drafts: List all drafts. Params: max_results, page_token, user_id (defaults to me)
- list_labels: List all labels. Params: user_id (defaults to me)
- list_threads: List threads. Params: query, max_results, page_token, user_id (defaults to me)
- modify_thread_labels: Modify labels of a thread. Params: thread_id (required), add_label_ids, remove_label_ids, user_id (defaults to me)
- move_to_trash: Move an email to trash. Params: message_id (required), user_id (defaults to me)
- remove_label: Remove a label. Params: label_id (required), user_id (defaults to me)
- reply_to_thread: Reply to a thread. Params: thread_id (required), message_body (required), recipient_email (required), cc, bcc, is_html, extra_recipients, user_id (defaults to me)
- get_profile: Get the Gmail profile. Params: user_id (defaults to me)
`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        response_format: { type: "json_object" },
      });

      const planData = JSON.parse(response.choices[0].message.content || "{}");

      // Initialize steps with proper state
      const steps = (planData.steps || []).map((step: any) =>
        this.createActionStep(
          step.type,
          step.action,
          step.params,
          step.description,
          step.id
        )
      );

      const plan: ActionPlan = {
        steps,
        originalMessage: message,
        summary: planData.summary || "Process user request",
        isMultiStep: planData.isMultiStep || false,
        currentStepIndex: 0,
        state: PlanState.CREATED,
      };

      console.log(
        `[ActionPlanner] Created plan with ${plan.steps.length} steps:`,
        plan.summary
      );
      console.log(
        `[ActionPlanner] Plan steps:`,
        JSON.stringify(plan.steps, null, 2)
      );
      return plan;
    } catch (error) {
      console.error(`[ActionPlanner] Error creating plan:`, error);

      // Fallback: treat as single general step
      return {
        steps: [
          this.createActionStep(
            "analysis",
            "general_response",
            { message },
            "Handle general message"
          ),
        ],
        originalMessage: message,
        summary: "Handle user message",
        isMultiStep: false,
        currentStepIndex: 0,
        state: PlanState.CREATED,
      };
    }
  }

  /**
   * Execute action plan step by step with SMS notifications
   */
  async executePlan(
    plan: ActionPlan,
    context: ExecutionContext
  ): Promise<PlanExecutionResult> {
    console.log(`[ActionPlanner] Executing plan: ${plan.summary}`);

    const stepResults: StepResult[] = [];
    let finalMessage = "";

    try {
      // Update plan state
      plan.state = PlanState.RUNNING;
      context.planState = PlanState.RUNNING;

      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        context.currentStepIndex = i;

        console.log(
          `[ActionPlanner] Executing step ${i + 1}/${plan.steps.length}: ${
            step.description
          }`
        );

        const result = await this.executeStep(step, context);
        stepResults.push(result);

        if (!result.success) {
          // Check if this is an OAuth requirement vs a real error
          if (result.authRequired && result.authUrl) {
            console.log(
              `[ActionPlanner] Step ${i + 1} requires OAuth: ${result.authUrl}`
            );
            return {
              success: false,
              message: result.message || "Authentication required",
              error: result.error,
              executedSteps: i + 1,
              stepResults,
              finalState: PlanState.FAILED,
              authRequired: true,
              authUrl: result.authUrl,
            };
          } else {
            console.error(
              `[ActionPlanner] Step ${i + 1} failed:`,
              result.error
            );
            plan.state = PlanState.FAILED;
            return {
              success: false,
              message: result.message || "Operation failed",
              error: result.error,
              executedSteps: i + 1,
              stepResults,
              finalState: PlanState.FAILED,
            };
          }
        }

        // Store result for next steps
        if (step.id) {
          context.stepResults.set(step.id, result);
        }
      }

      // All steps completed successfully
      plan.state = PlanState.COMPLETED;

      // NEW: Check if any step result contains UnifiedToolResponse and return it directly
      const unifiedResponse = this.extractUnifiedToolResponse(stepResults);
      if (unifiedResponse) {
        console.log(
          `[ActionPlanner] Found UnifiedToolResponse, returning rich data directly`
        );
        
        // For single step plans with UnifiedToolResponse, return the response directly
        // This preserves the rich structured data for the client
        const finalResult = {
          success: true,
          message: unifiedResponse.message,
          executedSteps: plan.steps.length,
          stepResults,
          finalState: PlanState.COMPLETED,
          // NEW: Pass through the unified response
          unifiedResponse,
        };
        
        // ✅ CRITICAL DEBUG: Log what we're returning to WebSocketHandler
        console.log(`[ActionPlanner] 🔑 *** FINAL RESULT BEING RETURNED ***`);
        console.log(`[ActionPlanner] - Final result keys:`, Object.keys(finalResult));
        console.log(`[ActionPlanner] - Has unifiedResponse:`, !!finalResult.unifiedResponse);
        console.log(`[ActionPlanner] - unifiedResponse type:`, typeof finalResult.unifiedResponse);
        console.log(`[ActionPlanner] - unifiedResponse.type:`, finalResult.unifiedResponse?.type);
        console.log(`[ActionPlanner] - unifiedResponse.success:`, finalResult.unifiedResponse?.success);
        console.log(`[ActionPlanner] - unifiedResponse has data.ui:`, !!finalResult.unifiedResponse?.data?.ui);
        console.log(`[ActionPlanner] - unifiedResponse has data.structured:`, !!finalResult.unifiedResponse?.data?.structured);
        
        console.log(`[ActionPlanner] 🚀 *** RETURNING UNIFIED RESPONSE TO WEBSOCKET HANDLER ***`);
        return finalResult;
      }

      // OLD: Fallback to text formatting for legacy responses
      finalMessage = responseManager.formatStepResults(stepResults);

      return {
        success: true,
        message: finalMessage,
        executedSteps: plan.steps.length,
        stepResults,
        finalState: PlanState.COMPLETED,
      };
    } catch (error) {
      console.error(`[ActionPlanner] Plan execution failed:`, error);
      plan.state = PlanState.FAILED;

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      finalMessage = `Plan execution failed: ${errorMessage}`;

      return {
        success: false,
        message: finalMessage,
        error: errorMessage,
        executedSteps: stepResults.length,
        stepResults,
        finalState: PlanState.FAILED,
      };
    }
  }

  /**
   * Execute step with retry logic for Composio API failures
   */
  private async executeStepWithRetry(
    step: ActionStep,
    context: ExecutionContext,
    maxRetries: number = 2
  ): Promise<StepResult> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ActionPlanner] Step attempt ${attempt}/${maxRetries}`);

        const result = await this.executeStep(step, context);

        // If successful, return immediately
        if (result.success) {
          if (attempt > 1) {
            console.log(`[ActionPlanner] Step succeeded on retry ${attempt}`);
          }
          return result;
        }

        // If failed but not a server error, don't retry
        if (!this.isRetryableError(result.error)) {
          console.log(`[ActionPlanner] Non-retryable error: ${result.error}`);
          return result;
        }

        lastError = result.error;

        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s delays
          console.log(
            `[ActionPlanner] Retrying step in ${delay}ms due to: ${result.error}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error)) {
          console.log(`[ActionPlanner] Non-retryable exception: ${error}`);
          break;
        }

        if (attempt < maxRetries) {
          const delay = attempt * 2000;
          console.log(
            `[ActionPlanner] Retrying step in ${delay}ms due to exception: ${error}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error(
      `[ActionPlanner] Step failed after ${maxRetries} attempts:`,
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

  /**
   * Check if error is retryable (server issues, timeouts, etc.)
   */
  private isRetryableError(error: any): boolean {
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
   * Send step notification via SMS
   */
  private async sendStepNotification(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    try {
      await twilioService.sendMessage({
        to: phoneNumber,
        body: message,
      });
      console.log(
        `[ActionPlanner] Step notification sent to ${phoneNumber}: ${message}`
      );
    } catch (error) {
      console.error(`[ActionPlanner] Failed to send step notification:`, error);
      // Don't fail the whole operation if SMS fails
    }
  }

  /**
   * Execute individual step
   */
  private async executeStep(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    try {
      // Update step state
      step.state = StepState.RUNNING;

      // Execute using the factory (which handles dependencies internally)
      const result = await this.stepExecutorFactory.executeStep(step, context);

      // Update step state and result
      step.state = result.success ? StepState.COMPLETED : StepState.FAILED;
      step.result = result;

      return result;
    } catch (error) {
      const result = this.createStepResult(
        step,
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : "Step execution failed"
      );

      step.state = StepState.FAILED;
      step.result = result;
      return result;
    }
  }

  /**
   * Helper to create a properly typed StepResult
   */
  private createStepResult(
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
   * Helper to create a properly typed ActionStep
   */
  private createActionStep(
    type: ActionType,
    action: string,
    params: Record<string, any>,
    description: string,
    id?: string
  ): ActionStep {
    return {
      type,
      action,
      params,
      description,
      id: id || generateStepId(),
      state: StepState.PENDING,
    };
  }

  // NEW: Helper to extract UnifiedToolResponse from step results
  private extractUnifiedToolResponse(stepResults: StepResult[]): any | null {
    // Look for UnifiedToolResponse in successful step results
    for (const result of stepResults) {
      if (result.success) {
        // NEW: First check the unifiedResponse field (where EmailStepExecutor stores it)
        if (result.unifiedResponse) {
          console.log(`[ActionPlanner] 🔍 Checking step result.unifiedResponse for UnifiedToolResponse...`);
          
          if (isValidUnifiedToolResponse(result.unifiedResponse)) {
            console.log(`[ActionPlanner] 🎯 FOUND VALID UnifiedToolResponse in step result.unifiedResponse!`);
            
            // Validate and log the data
            try {
              const validatedData = validateUnifiedToolResponse(result.unifiedResponse);
              console.log(`[ActionPlanner] Type: ${validatedData.type}`);
              console.log(`[ActionPlanner] Title: ${validatedData.data?.ui?.title}`);
              console.log(`[ActionPlanner] Content: ${validatedData.data?.ui?.content}`);
              console.log(`[ActionPlanner] Actions: ${validatedData.data?.ui?.actions?.length || 0} actions`);
              
              if (validatedData.data?.structured) {
                console.log(`[ActionPlanner] 🔥 RICH STRUCTURED DATA FOUND:`);
                console.log(`[ActionPlanner] Structured data type:`, typeof validatedData.data.structured);
                
                // NEW: Log the structure outline
                console.log(`[ActionPlanner] 📋 RESPONSE STRUCTURE OUTLINE:`);
                console.log(getObjectStructure(validatedData));
                
                // Log email list data if present
                if (validatedData.type === 'email' && validatedData.data.structured) {
                  const structuredData = validatedData.data.structured;
                  
                  // Check if it's EmailListData (has emails array)
                  if (structuredData && typeof structuredData === 'object' && 'emails' in structuredData && Array.isArray(structuredData.emails)) {
                    console.log(`[ActionPlanner] 📧 EMAIL LIST DATA:`);
                    console.log(`[ActionPlanner] - Total emails: ${structuredData.totalCount}`);
                    console.log(`[ActionPlanner] - Unread emails: ${structuredData.unreadCount}`);
                    console.log(`[ActionPlanner] - First 3 emails:`, 
                      structuredData.emails.slice(0, 3).map((email: any) => ({
                        subject: email.subject,
                        from: email.from,
                        isRead: email.isRead,
                        date: email.date
                      }))
                    );
                  } else {
                    console.log(`[ActionPlanner] 📧 SINGLE EMAIL DATA found`);
                  }
                } else {
                  console.log(`[ActionPlanner] ⚠️ No structured data found in UnifiedToolResponse`);
                }
              } else {
                console.log(`[ActionPlanner] ⚠️ No structured data found in UnifiedToolResponse`);
              }
              
              return validatedData;
            } catch (validationError) {
              console.error(`[ActionPlanner] ❌ UnifiedToolResponse validation failed:`, validationError);
              // Continue to check other results
            }
          } else {
            console.log(`[ActionPlanner] 📄 Step result.unifiedResponse is not a valid UnifiedToolResponse`);
            
            // Log the structure of what we actually got
            console.log(`[ActionPlanner] 📋 ACTUAL UNIFIEDRESPONSE STRUCTURE:`);
            console.log(getObjectStructure(result.unifiedResponse));
          }
        }
        
        // FALLBACK: Check result.data for backward compatibility
        if (result.data) {
          console.log(`[ActionPlanner] 🔍 Checking step result.data for UnifiedToolResponse...`);
          
          if (isValidUnifiedToolResponse(result.data)) {
            console.log(`[ActionPlanner] 🎯 FOUND VALID UnifiedToolResponse in step result.data!`);
            
            // Validate and log the data
            try {
              const validatedData = validateUnifiedToolResponse(result.data);
              console.log(`[ActionPlanner] Type: ${validatedData.type}`);
              console.log(`[ActionPlanner] Title: ${validatedData.data?.ui?.title}`);
              console.log(`[ActionPlanner] Content: ${validatedData.data?.ui?.content}`);
              console.log(`[ActionPlanner] Actions: ${validatedData.data?.ui?.actions?.length || 0} actions`);
              
              return validatedData;
            } catch (validationError) {
              console.error(`[ActionPlanner] ❌ UnifiedToolResponse validation failed:`, validationError);
              // Continue to check other results
            }
          } else {
            console.log(`[ActionPlanner] 📄 Step result.data is not a valid UnifiedToolResponse`);
            
            // Log the structure of what we actually got
            console.log(`[ActionPlanner] 📋 ACTUAL STEP DATA STRUCTURE:`);
            console.log(getObjectStructure(result.data));
          }
        }
      }
    }
    
    console.log(`[ActionPlanner] ❌ No valid UnifiedToolResponse found in ${stepResults.length} step results`);
    
    // Log what we did find for debugging
    stepResults.forEach((result, index) => {
      console.log(`[ActionPlanner] Step ${index + 1} result:`, {
        success: result.success,
        hasData: !!result.data,
        hasUnifiedResponse: !!result.unifiedResponse,
        dataType: typeof result.data,
        unifiedResponseType: typeof result.unifiedResponse,
        dataKeys: result.data ? Object.keys(result.data) : [],
        unifiedResponseKeys: result.unifiedResponse ? Object.keys(result.unifiedResponse) : [],
        isUnifiedToolResponseInData: result.data ? isValidUnifiedToolResponse(result.data) : false,
        isUnifiedToolResponseInUnifiedResponse: result.unifiedResponse ? isValidUnifiedToolResponse(result.unifiedResponse) : false
      });
    });
    
    return null;
  }
}
