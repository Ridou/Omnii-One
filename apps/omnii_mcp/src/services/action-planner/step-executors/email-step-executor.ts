import { BaseStepExecutor } from "./base-step-executor";
import {
  ActionStep,
  StepResult,
  ExecutionContext,
  ExecutionContextType,
  ResponseCategory,
} from "../../../types/action-planning.types";
import unifiedGoogleManager from "../../unified-google-manager";
import { ENTITY_PLACEHOLDER, slugify } from "../action-planner-utils";
import { EntityPlaceholder } from "../../plugins/email-plugin";

/**
 * Executor for email-related action steps
 */
export class EmailStepExecutor extends BaseStepExecutor {
  async executeStep(
    step: ActionStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    try {
      // Check if step already failed due to contact resolution error
      if (step.params?._resolutionError) {
        console.log(`[EmailStepExecutor] ❌ Step failed due to contact resolution error: ${step.params._resolutionError}`);
        return this.createStepResult(
          step,
          false,
          undefined,
          step.params._resolutionError,
          step.params._resolutionError
        );
      }

      // Check for empty recipient email (another sign of resolution failure)
      if (step.params?.recipient_email === "") {
        console.log(`[EmailStepExecutor] ❌ Step has empty recipient email`);
        return this.createStepResult(
          step,
          false,
          undefined,
          "No recipient email address provided. Contact resolution may have failed.",
          "Missing recipient email address"
        );
      }

      // --- Dependency enforcement is already handled by executeStep ---
      // Patch recipient_email if it's a placeholder
      let patchedStep = { ...step };
      if (
        patchedStep.params &&
        typeof patchedStep.params.recipient_email === "string" &&
        patchedStep.params.recipient_email.startsWith(ENTITY_PLACEHOLDER.PREFIX)
      ) {
        const placeholder = patchedStep.params.recipient_email;
        const placeholderRegex = new RegExp(ENTITY_PLACEHOLDER.PATTERN, "i");
        const match = placeholder.match(placeholderRegex);
        const slug = match?.[1];

        console.log(
          `[EmailStepExecutor] Trying to resolve placeholder: ${placeholder}, slug: ${slug}`
        );
        console.log(
          `[EmailStepExecutor] Available entities:`,
          context.entities.map((e) => ({
            type: e.type,
            value: e.value,
            email: e.email,
            slug: slugify(e.value),
          }))
        );

        if (slug) {
          // Try to find a matching entity with email
          const match = context.entities.find(
            (e) => slugify(e.value) === slug && e.email
          );
          console.log(`[EmailStepExecutor] Found matching entity:`, match);

          if (match && match.email) {
            patchedStep = {
              ...patchedStep,
              params: {
                ...patchedStep.params,
                recipient_email: match.email,
              },
            };
            console.log(
              `[EmailStepExecutor] Resolved ${placeholder} → ${match.email}`
            );
          } else {
            console.log(
              `[EmailStepExecutor] Could not find entity with slug "${slug}" and email`
            );
            return this.createStepResult(
              step,
              false,
              undefined,
              `Could not resolve recipient email for placeholder ${placeholder}`,
              undefined
            );
          }
        }
      }

      // Convert step to natural language message for unified manager
      const naturalMessage = this.buildNaturalMessage(patchedStep);
      if (!naturalMessage) {
        return this.createStepResult(
          step,
          false,
          undefined,
          `Unknown email action: ${patchedStep.action}`,
          undefined
        );
      }

      console.log(
        `[EmailStepExecutor] Routing email message to UnifiedGoogleManager: "${naturalMessage}"`
      );

      // Route to unified manager
      const result = await unifiedGoogleManager.processMessage(
        naturalMessage,
        context.phoneNumber,
        context.userTimezone,
        context.localDatetime,
        context.context || ExecutionContextType.SMS
      );

      // NEW: Log the keys of what we received from UnifiedGoogleManager
      console.log(`[EmailStepExecutor] 🔑 RECEIVED FROM UNIFIED MANAGER:`);
      console.log(`[EmailStepExecutor] - Top level keys:`, Object.keys(result || {}));
      if (result && typeof result === 'object') {
        console.log(`[EmailStepExecutor] - Has 'type' field:`, 'type' in result);
        console.log(`[EmailStepExecutor] - Has 'data' field:`, 'data' in result);
        if ('data' in result && result.data) {
          console.log(`[EmailStepExecutor] - data keys:`, Object.keys(result.data));
          if (result.data.structured) {
            console.log(`[EmailStepExecutor] - structured keys:`, Object.keys(result.data.structured));
          }
        }
      }

      // NEW: Check if result is a UnifiedToolResponse with rich data
      const isUnifiedResponse = result && 
                               typeof result === 'object' && 
                               'type' in result && 
                               'data' in result && 
                               result.type === 'email';

      if (isUnifiedResponse) {
        console.log(`[EmailStepExecutor] 🎯 Received UnifiedToolResponse, preserving rich data`);
        
        // Type-safe access to UnifiedToolResponse
        const unifiedResult = result as any; // We know it's UnifiedToolResponse from the check above
        
        // Determine the appropriate category based on the action
        const category = this.determineEmailCategory(patchedStep.action, unifiedResult);
        
        // Create enhanced StepResult with rich data
        const enhancedResult = this.createEnhancedStepResult(
          step,
          unifiedResult.success,
          unifiedResult.data?.raw || unifiedResult, // Keep raw data
          unifiedResult.message,
          unifiedResult.success ? undefined : (unifiedResult.message || 'Email operation failed'), // Map failure message to error
          undefined,
          unifiedResult.authRequired || false, // Top-level field in UnifiedToolResponse
          unifiedResult.authUrl || null, // Top-level field in UnifiedToolResponse
          category,
          unifiedResult.data?.structured, // Rich structured data (EmailListData, etc.)
          unifiedResult.data?.ui, // UI-ready data
          unifiedResult // Full UnifiedToolResponse
        );
        
        // NEW: Log what we created for the ActionPlanner
        console.log(`[EmailStepExecutor] 🔑 CREATED ENHANCED STEP RESULT:`);
        console.log(`[EmailStepExecutor] - Top level keys:`, Object.keys(enhancedResult));
        console.log(`[EmailStepExecutor] - Has unifiedResponse:`, !!enhancedResult.unifiedResponse);
        console.log(`[EmailStepExecutor] - Has structuredData:`, !!enhancedResult.structuredData);
        console.log(`[EmailStepExecutor] - Has uiData:`, !!enhancedResult.uiData);
        console.log(`[EmailStepExecutor] - Category:`, enhancedResult.category);
        
        return enhancedResult;
      }

      // Fallback for legacy format
      console.log(`[EmailStepExecutor] ⚠️ Received legacy format, using basic StepResult`);
      
      // Type-safe access to legacy format
      const legacyResult = result as any;
      return this.createStepResult(
        step,
        legacyResult.success,
        legacyResult.rawData || legacyResult,
        legacyResult.message,
        legacyResult.error,
        undefined,
        legacyResult.authRequired,
        legacyResult.authUrl
      );
    } catch (error) {
      console.error(`[EmailStepExecutor] Email step execution failed:`, error);
      return this.createStepResult(
        step,
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : "Email operation failed"
      );
    }
  }

  /**
   * Build natural language message for email actions
   */
  private buildNaturalMessage(step: ActionStep): string | null {
    switch (step.action) {
      case "send_email":
        return step.params.subject && step.params.recipient_email
          ? `Send an email to ${step.params.recipient_email} with subject '${
              step.params.subject
            }' and body '${step.params.body || ""}'`
          : "Send an email";

      case "create_draft":
        return step.params.subject && step.params.recipient_email
          ? `Create a draft to ${step.params.recipient_email} with subject '${
              step.params.subject
            }' and body '${step.params.body || ""}'`
          : "Create an email draft";

      case "fetch_emails":
        return step.params.query
          ? `Fetch emails with query '${step.params.query}'`
          : "Fetch my emails";

      case "add_label":
        return step.params.message_id && step.params.add_label_ids
          ? `Add label(s) ${step.params.add_label_ids} to email ${step.params.message_id}`
          : "Add label to email";

      case "create_label":
        return step.params.label_name
          ? `Create label '${step.params.label_name}' in Gmail`
          : "Create a new Gmail label";

      case "delete_draft":
        return step.params.draft_id
          ? `Delete draft with id ${step.params.draft_id}`
          : "Delete an email draft";

      case "delete_message":
        return step.params.message_id
          ? `Delete email with id ${step.params.message_id}`
          : "Delete an email";

      case "fetch_message_by_id":
        return step.params.message_id
          ? `Fetch message with id ${step.params.message_id}`
          : "Fetch an email message by id";

      case "fetch_message_by_thread_id":
        return step.params.thread_id
          ? `Fetch messages in thread ${step.params.thread_id}`
          : "Fetch messages by thread id";

      case "get_attachment":
        return step.params.attachment_id &&
          step.params.message_id &&
          step.params.file_name
          ? `Get attachment '${step.params.file_name}' (id: ${step.params.attachment_id}) from message ${step.params.message_id}`
          : "Get an email attachment";

      case "list_drafts":
        return "List all email drafts";

      case "list_labels":
        return "List all Gmail labels";

      case "list_threads":
        return "List Gmail threads";

      case "modify_thread_labels":
        return step.params.thread_id
          ? `Modify labels for thread ${step.params.thread_id}`
          : "Modify thread labels";

      case "move_to_trash":
        return step.params.message_id
          ? `Move email ${step.params.message_id} to trash`
          : "Move an email to trash";

      case "remove_label":
        return step.params.label_id
          ? `Remove label ${step.params.label_id} from email`
          : "Remove a label from email";

      case "reply_to_thread":
        return step.params.thread_id
          ? `Reply to thread ${step.params.thread_id}`
          : "Reply to thread";

      case "get_profile":
        return "Get Gmail profile";

      default:
        return null;
    }
  }

  /**
   * Determine the appropriate ResponseCategory based on email action type
   */
  private determineEmailCategory(action: string, response: any): ResponseCategory {
    // Check structured data to determine category
    if (response.data?.structured) {
      const structured = response.data.structured;
      
      // If it has an emails array, it's an email list
      if ('emails' in structured && Array.isArray(structured.emails)) {
        return ResponseCategory.EMAIL_LIST;
      }
      
      // If it has a single email object
      if ('email' in structured) {
        return ResponseCategory.EMAIL_SINGLE;
      }
      
      // If it's a single EmailData object
      if ('subject' in structured && 'from' in structured) {
        return structured.isDraft ? ResponseCategory.EMAIL_DRAFT : ResponseCategory.EMAIL_SINGLE;
      }
    }
    
    // Fallback to action-based detection
    switch (action) {
      case "fetch_emails":
        return ResponseCategory.EMAIL_LIST;
      case "send_email":
        return ResponseCategory.EMAIL_SENT;
      case "create_draft":
        return ResponseCategory.EMAIL_DRAFT;
      case "fetch_message_by_id":
      case "fetch_message_by_thread_id":
        return ResponseCategory.EMAIL_SINGLE;
      default:
        return ResponseCategory.EMAIL_SINGLE;
    }
  }

  /**
   * Create enhanced StepResult with rich response data support
   */
  private createEnhancedStepResult(
    step: ActionStep,
    success: boolean,
    data?: any,
    message?: string,
    error?: string,
    state?: any,
    authRequired?: boolean,
    authUrl?: string | null,
    category?: ResponseCategory,
    structuredData?: any,
    uiData?: any,
    unifiedResponse?: any
  ): StepResult {
    const basicResult = this.createStepResult(
      step,
      success,
      data,
      message,
      error,
      state,
      authRequired,
      authUrl
    );
    
    // Add rich data fields
    return {
      ...basicResult,
      category,
      structuredData,
      uiData,
      unifiedResponse
    };
  }
}