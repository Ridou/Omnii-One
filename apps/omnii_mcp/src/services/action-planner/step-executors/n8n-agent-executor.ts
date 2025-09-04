/**
 * n8n Agent Step Executor
 * 
 * Executes action steps using the n8n Agent Swarm with intelligent fallback
 * to local executors when n8n is unavailable or fails
 */

import { BaseStepExecutor } from "./base-step-executor";
import {
  ActionStep,
  StepResult,
  ExecutionContext,
  N8nAgentActionType,
  ResponseCategory,
  StepState,
} from "../../../types/action-planning.types";
import { 
  n8nAgentClient, 
  N8nAgentRequest, 
  N8nAgentResponse 
} from "../../integrations/n8n-agent-client";
import { N8nConfigManager } from "../../../config/n8n-agent.config";
import { EmailStepExecutor } from "./email-step-executor";
import { CalendarStepExecutor } from "./calendar-step-executor";
import { ContactStepExecutor } from "./contact-step-executor";

export class N8nAgentStepExecutor extends BaseStepExecutor {
  private fallbackExecutors: Map<string, BaseStepExecutor>;

  constructor() {
    super();
    
    // Initialize fallback executors for graceful degradation
    this.fallbackExecutors = new Map([
      ['email', new EmailStepExecutor()],
      ['calendar', new CalendarStepExecutor()], 
      ['contact', new ContactStepExecutor()],
    ]);
    
    console.log(`[N8nAgentExecutor] 🤖 Initialized with ${this.fallbackExecutors.size} fallback executors`);
  }

  /**
   * Execute step using n8n Agent Swarm with fallback support
   */
  async executeStep(step: ActionStep, context: ExecutionContext): Promise<StepResult> {
    const startTime = Date.now();
    console.log(`[N8nAgentExecutor] 🤖 Executing n8n agent step: ${step.action}`);
    console.log(`[N8nAgentExecutor] 📝 Step description: ${step.description}`);
    
    try {
      // Check if n8n service is available
      if (!n8nAgentClient.isAvailable()) {
        console.warn(`[N8nAgentExecutor] ⚠️ n8n service unavailable, attempting fallback`);
        
        if (this.canFallbackToLocal(step)) {
          return await this.executeLocalFallback(step, context);
        }
        
        throw new Error('n8n Agent service unavailable and no local fallback available');
      }
      
      // Build n8n request with full context
      const n8nRequest = this.buildN8nRequest(step, context);
      
      // Execute with retry logic
      console.log(`[N8nAgentExecutor] 📤 Sending request to ${n8nRequest.agent_type || 'auto'} agent`);
      const n8nResponse = await n8nAgentClient.executeWithRetry(n8nRequest);
      
      // Parse response into StepResult format
      const stepResult = this.parseN8nResponse(n8nResponse, step);
      
      const executionTime = Date.now() - startTime;
      console.log(`[N8nAgentExecutor] ✅ n8n agent execution completed in ${executionTime}ms: ${n8nResponse.agent}`);
      
      return stepResult;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`[N8nAgentExecutor] ❌ n8n agent execution failed after ${executionTime}ms:`, error);
      
      // Attempt fallback to local system if applicable
      if (this.shouldFallbackToLocal(error) && this.canFallbackToLocal(step)) {
        console.log(`[N8nAgentExecutor] 🔄 Attempting fallback to local execution`);
        return await this.executeLocalFallback(step, context);
      }
      
      // Return error result if no fallback possible
      return this.createStepResult(
        step,
        false,
        undefined,
        undefined,
        `n8n Agent execution failed: ${error.message}`,
        StepState.FAILED,
        false,
        null
      );
    }
  }

  /**
   * Build n8n agent request from action step and execution context
   */
  private buildN8nRequest(step: ActionStep, context: ExecutionContext): N8nAgentRequest {
    // Determine agent type from action
    const agentType = this.mapActionToAgentType(step.action);
    
    // Build natural language message from step
    const message = this.buildNaturalMessage(step);
    
    console.log(`[N8nAgentExecutor] 🎯 Routing to ${agentType} agent: "${message}"`);
    
    return {
      message,
      user_id: context.userUUID || context.entityId,
      agent_type: agentType,
      context: {
        userTimezone: context.userTimezone,
        localDatetime: context.localDatetime,
        entities: context.entities,
        rdfInsights: context.rdfInsights,
        executionContext: {
          sessionId: context.sessionId,
          communicationChannel: context.communicationChannel,
          planState: context.planState,
          currentStepIndex: context.currentStepIndex,
        },
        brainMemoryContext: context.brainMemoryContext,
      },
      metadata: {
        requestId: step.id,
        priority: this.determinePriority(step, context),
        timeout: N8nConfigManager.getTimeoutForOperation(step.action),
        sessionId: context.sessionId,
      }
    };
  }

  /**
   * Parse n8n agent response into omnii StepResult format
   */
  private parseN8nResponse(response: N8nAgentResponse, step: ActionStep): StepResult {
    const category = this.mapAgentToResponseCategory(response.agent);
    
    console.log(`[N8nAgentExecutor] 📊 Parsing response: ${response.agent} → ${category}`);
    
    return this.createStepResult(
      step,
      response.success,
      response.result,
      response.success 
        ? `${response.agent} completed: ${response.action}` 
        : `${response.agent} failed: ${response.error}`,
      response.error,
      response.success ? StepState.COMPLETED : StepState.FAILED,
      false, // n8n handles auth internally
      null,
      category,
      response.result, // structuredData
      {
        title: `${response.agent} Result`,
        subtitle: response.action,
        content: response.success ? 'Operation completed successfully' : response.error,
        icon: this.getAgentIcon(response.agent),
        actions: this.generateAgentActions(response),
        metadata: {
          executionTime: response.execution_time,
          agent: response.agent,
          action: response.action,
          requestId: response.metadata?.requestId,
          confidence: response.metadata?.confidence,
        }
      }
    );
  }

  /**
   * Determine if error should trigger fallback to local system
   */
  private shouldFallbackToLocal(error: any): boolean {
    const errorStr = error.message?.toLowerCase() || '';
    
    // Fallback conditions for service availability issues
    const fallbackConditions = [
      'timeout',
      '503', '502', '500', // Server errors
      'connection', 'network', // Network issues
      'unavailable', 'unreachable', // Service issues
      'internal server error',
    ];
    
    const shouldFallback = fallbackConditions.some(condition => errorStr.includes(condition));
    
    console.log(`[N8nAgentExecutor] 🤔 Fallback analysis: error="${errorStr.substring(0, 50)}", shouldFallback=${shouldFallback}`);
    
    return shouldFallback;
  }

  /**
   * Check if step can fallback to local execution
   */
  private canFallbackToLocal(step: ActionStep): boolean {
    // Map n8n actions to local equivalents
    const fallbackMapping = {
      // Email actions with local equivalents
      'smart_email_compose': 'send_email',
      'email_context_search': 'fetch_emails',
      
      // Calendar actions with local equivalents  
      'smart_scheduling': 'create_event',
      'meeting_coordination': 'list_events',
      
      // Contact actions with local equivalents
      'contact_enrichment': 'search_contacts',
      'relationship_mapping': 'get_all_contacts',
    };
    
    const hasLocalEquivalent = fallbackMapping[step.action] !== undefined;
    console.log(`[N8nAgentExecutor] 🔍 Fallback check: ${step.action} → ${hasLocalEquivalent ? 'available' : 'not available'}`);
    
    return hasLocalEquivalent;
  }

  /**
   * Execute fallback using local step executors
   */
  private async executeLocalFallback(step: ActionStep, context: ExecutionContext): Promise<StepResult> {
    // Determine which local executor to use
    const localExecutorType = this.mapToLocalExecutorType(step.action);
    const executor = this.fallbackExecutors.get(localExecutorType);
    
    if (!executor) {
      throw new Error(`No local fallback executor available for action: ${step.action}`);
    }
    
    console.log(`[N8nAgentExecutor] 🔄 Executing local fallback with ${localExecutorType} executor`);
    
    // Convert n8n action to local action format
    const localStep = this.convertToLocalAction(step);
    
    // Execute with local executor
    const result = await executor.executeStep(localStep, context);
    
    // Add fallback metadata to result
    if (result.success) {
      result.message = `${result.message} (processed locally - n8n agent unavailable)`;
      if (result.uiData) {
        result.uiData.metadata = {
          ...result.uiData.metadata,
          fallbackUsed: true,
          originalAction: step.action,
          fallbackExecutor: localExecutorType,
        };
      }
    }
    
    console.log(`[N8nAgentExecutor] ✅ Local fallback completed successfully`);
    return result;
  }

  /**
   * Map n8n action to agent type for routing
   */
  private mapActionToAgentType(action: string): 'email' | 'calendar' | 'contact' | 'web' | 'youtube' | 'auto' {
    const agentMapping = {
      // Email agent actions
      'smart_email_compose': 'email',
      'email_thread_analysis': 'email', 
      'email_bulk_operations': 'email',
      'email_context_search': 'email',
      
      // Calendar agent actions
      'smart_scheduling': 'calendar',
      'meeting_coordination': 'calendar',
      'calendar_optimization': 'calendar',
      'multi_person_scheduling': 'calendar',
      
      // Contact agent actions
      'contact_enrichment': 'contact',
      'relationship_mapping': 'contact',
      'contact_deduplication': 'contact',
      
      // Web agent actions
      'web_research': 'web',
      'information_gathering': 'web',
      'competitive_analysis': 'web',
      
      // YouTube agent actions
      'youtube_content_search': 'youtube',
      'learning_path_creation': 'youtube',
      'video_summary_generation': 'youtube',
    };
    
    return agentMapping[action] || 'auto';
  }

  /**
   * Build natural language message from action step
   */
  private buildNaturalMessage(step: ActionStep): string {
    // Convert structured step into natural language for n8n
    const { action, params, description } = step;
    
    // Use description as base, enhance with parameters
    let message = description;
    
    // Add key parameters to the message for context
    if (params.recipient_email) {
      message += ` to ${params.recipient_email}`;
    }
    if (params.subject) {
      message += ` with subject "${params.subject}"`;
    }
    if (params.query) {
      message += ` searching for "${params.query}"`;
    }
    if (params.start_time && params.end_time) {
      message += ` from ${params.start_time} to ${params.end_time}`;
    }
    
    console.log(`[N8nAgentExecutor] 💬 Natural message: "${message}"`);
    return message;
  }

  /**
   * Map agent type to response category for UI rendering
   */
  private mapAgentToResponseCategory(agent: string): ResponseCategory {
    const categoryMapping = {
      'Email Agent': ResponseCategory.N8N_AGENT_RESPONSE,
      'Calendar Agent': ResponseCategory.N8N_AGENT_RESPONSE,
      'Contact Agent': ResponseCategory.N8N_AGENT_RESPONSE,
      'Web Agent': ResponseCategory.WEB_RESEARCH,
      'YouTube Agent': ResponseCategory.YOUTUBE_SEARCH,
    };
    
    return categoryMapping[agent] || ResponseCategory.AGENT_AUTOMATION;
  }

  /**
   * Get icon for agent type
   */
  private getAgentIcon(agent: string): string {
    const iconMapping = {
      'Email Agent': '📧',
      'Calendar Agent': '📅',
      'Contact Agent': '👥',
      'Web Agent': '🌐',
      'YouTube Agent': '🎥',
    };
    
    return iconMapping[agent] || '🤖';
  }

  /**
   * Determine request priority based on step and context
   */
  private determinePriority(step: ActionStep, context: ExecutionContext): 'low' | 'normal' | 'high' {
    // Check urgency from RDF insights
    const urgencyLevel = context.rdfInsights?.ai_reasoning?.intent_analysis?.urgency_level;
    if (urgencyLevel === 'high' || urgencyLevel === 'critical') {
      return 'high';
    }
    
    // Check action type priority
    const agentType = this.mapActionToAgentType(step.action);
    const agentPriority = N8nConfigManager.getAgentPriority(agentType);
    
    // Consider communication channel
    if (context.communicationChannel === 'sms') {
      return 'high'; // SMS requests are typically urgent
    }
    
    return agentPriority;
  }

  /**
   * Map n8n action to local executor type for fallback
   */
  private mapToLocalExecutorType(action: string): string {
    const executorMapping = {
      // Email actions → email executor
      'smart_email_compose': 'email',
      'email_thread_analysis': 'email',
      'email_bulk_operations': 'email',
      'email_context_search': 'email',
      
      // Calendar actions → calendar executor
      'smart_scheduling': 'calendar',
      'meeting_coordination': 'calendar', 
      'calendar_optimization': 'calendar',
      'multi_person_scheduling': 'calendar',
      
      // Contact actions → contact executor
      'contact_enrichment': 'contact',
      'relationship_mapping': 'contact',
      'contact_deduplication': 'contact',
    };
    
    return executorMapping[action] || 'email'; // Default to email
  }

  /**
   * Convert n8n action step to local action format
   */
  private convertToLocalAction(step: ActionStep): ActionStep {
    const actionMapping = {
      // Email conversions
      'smart_email_compose': 'send_email',
      'email_context_search': 'fetch_emails',
      
      // Calendar conversions
      'smart_scheduling': 'create_event',
      'meeting_coordination': 'list_events',
      
      // Contact conversions
      'contact_enrichment': 'search_contacts',
      'relationship_mapping': 'get_all_contacts',
    };
    
    const localAction = actionMapping[step.action] || step.action;
    
    const localStep: ActionStep = {
      ...step,
      type: this.mapToLocalExecutorType(step.action) as any,
      action: localAction,
      description: `${step.description} (local fallback)`,
    };
    
    console.log(`[N8nAgentExecutor] 🔄 Converted ${step.action} → ${localAction}`);
    return localStep;
  }

  /**
   * Generate UI actions for agent responses
   */
  private generateAgentActions(response: N8nAgentResponse): any[] {
    const actions = [];
    
    // Add common actions based on agent type
    switch (response.agent) {
      case 'Email Agent':
        if (response.result?.messageId) {
          actions.push({
            id: 'view_email',
            label: 'View Email',
            type: 'primary',
            icon: '👁️',
            command: `view_email_${response.result.messageId}`,
          });
        }
        break;
        
      case 'Calendar Agent':
        if (response.result?.eventId) {
          actions.push({
            id: 'view_event',
            label: 'View Event',
            type: 'primary', 
            icon: '📅',
            command: `view_event_${response.result.eventId}`,
          });
        }
        break;
        
      case 'Web Agent':
        if (response.result?.results?.length > 0) {
          actions.push({
            id: 'view_all_results',
            label: 'View All Results',
            type: 'secondary',
            icon: '🔍',
            command: 'expand_web_results',
          });
        }
        break;
        
      case 'YouTube Agent':
        if (response.result?.videos?.length > 0) {
          actions.push({
            id: 'create_playlist',
            label: 'Create Playlist',
            type: 'secondary',
            icon: '📝',
            command: 'create_youtube_playlist',
          });
        }
        break;
    }
    
    // Add retry action for failed requests
    if (!response.success) {
      actions.push({
        id: 'retry_request',
        label: 'Retry',
        type: 'primary',
        icon: '🔄',
        command: 'retry_n8n_request',
      });
    }
    
    return actions;
  }

  /**
   * Check if step supports local fallback execution
   */
  private canFallbackToLocal(step: ActionStep): boolean {
    if (!N8nConfigManager.getConfig().fallbackEnabled) {
      return false;
    }
    
    // Actions that have local equivalents
    const fallbackableActions = [
      'smart_email_compose', 'email_context_search',
      'smart_scheduling', 'meeting_coordination',
      'contact_enrichment', 'relationship_mapping',
    ];
    
    const canFallback = fallbackableActions.includes(step.action);
    console.log(`[N8nAgentExecutor] 🔍 Fallback check for ${step.action}: ${canFallback ? 'available' : 'not available'}`);
    
    return canFallback;
  }

  /**
   * Get supported action types for this executor
   */
  getSupportedActions(): string[] {
    return Object.values(N8nAgentActionType);
  }

  /**
   * Check if action is supported by this executor
   */
  supportsAction(action: string): boolean {
    return this.getSupportedActions().includes(action);
  }
}
