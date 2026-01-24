import { 
  ActionStep, 
  ActionType,
  StepState,
  EmailActionType,
  CalendarActionType,
  TaskActionType,
  ContactActionType
} from '../../types/action-planning.types';
import { RDF_ACTION_TYPES } from '@omnii/validators';
import { generateStepId } from '../action-planner/action-planner-utils';

/**
 * RDF Action Mapper - Converts semantic insights into concrete ActionSteps
 * This is the core bridge between RDF semantic understanding and action execution
 */
export class RDFActionMapper {
  
  // Confidence threshold for using RDF vs falling back to LLM
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly MIN_ACTION_CONFIDENCE = 0.6;

  /**
   * Convert RDF semantic insights into concrete ActionSteps
   */
  async mapSemanticInsightsToActions(
    rdfInsights: any,
    originalMessage: string,
    userId: string
  ): Promise<{
    actions: ActionStep[];
    confidence: number;
    fallbackToLLM: boolean;
    reasoning: string;
  }> {
    console.log(`[RDFActionMapper] 🧠 Processing semantic insights for: "${originalMessage}"`);
    
    // Calculate overall confidence from RDF insights
    const totalConfidence = this.calculateOverallConfidence(rdfInsights);
    console.log(`[RDFActionMapper] 📊 Overall RDF confidence: ${totalConfidence.toFixed(2)}`);
    
    // Check if confidence is high enough for RDF-driven planning
    if (totalConfidence < this.CONFIDENCE_THRESHOLD) {
      console.log(`[RDFActionMapper] ⚠️ Confidence ${totalConfidence.toFixed(2)} below threshold ${this.CONFIDENCE_THRESHOLD} - recommending LLM fallback`);
      return { 
        actions: [], 
        confidence: totalConfidence, 
        fallbackToLLM: true,
        reasoning: `RDF confidence ${totalConfidence.toFixed(2)} below threshold ${this.CONFIDENCE_THRESHOLD}`
      };
    }

    // Generate action steps from RDF insights
    const actionSteps = await this.generateActionSteps(rdfInsights, originalMessage, userId);
    
    if (actionSteps.length === 0) {
      console.log(`[RDFActionMapper] ❌ No actions generated from RDF insights - recommending LLM fallback`);
      return {
        actions: [],
        confidence: totalConfidence,
        fallbackToLLM: true,
        reasoning: 'No concrete actions could be mapped from RDF insights'
      };
    }

    console.log(`[RDFActionMapper] ✅ Generated ${actionSteps.length} actions with confidence ${totalConfidence.toFixed(2)}`);
    return { 
      actions: actionSteps, 
      confidence: totalConfidence, 
      fallbackToLLM: false,
      reasoning: `Successfully mapped ${actionSteps.length} semantic actions`
    };
  }

  /**
   * Generate concrete ActionSteps from RDF insights
   */
  private async generateActionSteps(
    rdfInsights: any, 
    message: string, 
    userId: string
  ): Promise<ActionStep[]> {
    const steps: ActionStep[] = [];
    const structuredActions = rdfInsights.structured_actions || [];
    const intentAnalysis = rdfInsights.ai_reasoning?.intent_analysis || {};
    const extractedConcepts = rdfInsights.ai_reasoning?.extracted_concepts || [];

    console.log(`[RDFActionMapper] 🔄 Processing ${structuredActions.length} structured actions`);

    // Map each RDF action to concrete ActionStep
    for (const rdfAction of structuredActions) {
      if (rdfAction.confidence < this.MIN_ACTION_CONFIDENCE) {
        console.log(`[RDFActionMapper] ⏭️ Skipping action ${rdfAction.action_type} with low confidence ${rdfAction.confidence}`);
        continue;
      }

      const actionStep = this.mapRDFActionToStep(
        rdfAction, 
        intentAnalysis, 
        extractedConcepts,
        message, 
        userId
      );
      
      if (actionStep) {
        console.log(`[RDFActionMapper] ✅ Mapped ${rdfAction.action_type} → ${actionStep.type}:${actionStep.action}`);
        steps.push(actionStep);
      }
    }

    return steps;
  }

  /**
   * Map individual RDF action to concrete ActionStep
   */
  private mapRDFActionToStep(
    rdfAction: any, 
    intentAnalysis: any,
    extractedConcepts: any[],
    message: string, 
    userId: string
  ): ActionStep | null {
    const { action_type, confidence, parameters } = rdfAction;
    const conceptNames = extractedConcepts.map(c => c.concept_name).filter(Boolean);

    console.log(`[RDFActionMapper] 🔍 Mapping ${action_type} with confidence ${confidence}`);

    // Map RDF action types to ActionSteps based on existing action planning patterns
    switch (action_type) {
      case RDF_ACTION_TYPES.SEND_EMAIL:
        return this.createEmailAction(message, intentAnalysis, confidence, conceptNames, parameters);
        
      case RDF_ACTION_TYPES.SCHEDULE_EVENT:
        return this.createCalendarAction(message, intentAnalysis, confidence, conceptNames, parameters);
        
      case RDF_ACTION_TYPES.CREATE_TASK:
        return this.createTaskAction(message, intentAnalysis, confidence, conceptNames, parameters);
        
      case RDF_ACTION_TYPES.SEARCH_CONTACTS:
        return this.createContactAction(message, intentAnalysis, confidence, conceptNames, parameters);

      case RDF_ACTION_TYPES.SET_REMINDER:
        // Map reminder to task creation (most appropriate existing action)
        return this.createReminderAsTask(message, intentAnalysis, confidence, conceptNames, parameters);
        
      default:
        console.log(`[RDFActionMapper] ⚠️ Unsupported RDF action type: ${action_type}`);
        return null;
    }
  }

  /**
   * Create email action from RDF insights
   */
  private createEmailAction(
    message: string, 
    intent: any, 
    confidence: number,
    concepts: string[],
    parameters?: any
  ): ActionStep {
    const urgencyLevel = intent.urgency_level || 'medium';
    const formalityLevel = intent.formality_level || 'neutral';
    
    // Extract recipient from message (basic pattern matching)
    const recipientMatch = message.match(/(?:email|send|draft|message)\s+(?:to\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
    const recipient = recipientMatch?.[1] || '{{ENTITY:recipient}}';
    
    return {
      type: 'email' as ActionType,
      action: urgencyLevel === 'high' || urgencyLevel === 'critical' ? EmailActionType.SEND_EMAIL : EmailActionType.CREATE_DRAFT,
      params: {
        recipient_email: recipient.includes('{{') ? recipient : `{{ENTITY:${recipient.toLowerCase().replace(/\s+/g, '-')}}}`,
        subject: this.generateContextualSubject(message, intent, concepts),
        body: this.generateContextualBody(message, intent, formalityLevel),
        priority: urgencyLevel
      },
      description: `${urgencyLevel === 'high' ? 'Send' : 'Draft'} email based on semantic analysis`,
      id: generateStepId(),
      state: StepState.PENDING,
      confidence: confidence,
      semanticContext: {
        primaryIntent: intent.primary_intent,
        urgencyLevel: urgencyLevel,
        formalityLevel: formalityLevel,
        conceptsUsed: concepts
      }
    };
  }

  /**
   * Create calendar action from RDF insights
   */
  private createCalendarAction(
    message: string, 
    intent: any, 
    confidence: number,
    concepts: string[],
    parameters?: any
  ): ActionStep {
    const urgencyLevel = intent.urgency_level || 'medium';
    
    return {
      type: 'calendar' as ActionType,
      action: CalendarActionType.CREATE_EVENT,
      params: {
        summary: this.generateEventTitle(message, intent, concepts),
        start: this.extractTimeFromMessage(message) || '{{ENTITY:datetime}}',
        description: this.generateEventDescription(message, intent, concepts)
      },
      description: 'Create calendar event from semantic understanding',
      id: generateStepId(),
      state: StepState.PENDING,
      confidence: confidence,
      semanticContext: {
        primaryIntent: intent.primary_intent,
        urgencyLevel: urgencyLevel,
        conceptsUsed: concepts,
        temporalContext: { hasTimeReference: message.toLowerCase().includes('tomorrow') || message.toLowerCase().includes('next') }
      }
    };
  }

  /**
   * Create task action from RDF insights
   */
  private createTaskAction(
    message: string, 
    intent: any, 
    confidence: number,
    concepts: string[],
    parameters?: any
  ): ActionStep {
    const urgencyLevel = intent.urgency_level || 'medium';
    
    return {
      type: 'task' as ActionType,
      action: TaskActionType.CREATE_TASK,
      params: {
        title: this.generateTaskTitle(message, concepts),
        description: this.generateTaskDescription(message, intent),
        priority: urgencyLevel
      },
      description: 'Create task based on semantic analysis',
      id: generateStepId(),
      state: StepState.PENDING,
      confidence: confidence,
      semanticContext: {
        primaryIntent: intent.primary_intent,
        urgencyLevel: urgencyLevel,
        conceptsUsed: concepts
      }
    };
  }

  /**
   * Create contact action from RDF insights
   */
  private createContactAction(
    message: string, 
    intent: any, 
    confidence: number,
    concepts: string[],
    parameters?: any
  ): ActionStep {
    // Determine if this is a search or creation based on intent
    const isSearch = message.toLowerCase().includes('find') || message.toLowerCase().includes('search') || 
                    message.toLowerCase().includes('look') || intent.primary_intent?.includes('search');
    
    return {
      type: 'contact' as ActionType,
      action: isSearch ? ContactActionType.SEARCH_CONTACTS : ContactActionType.GET_ALL_CONTACTS,
      params: {
        query: this.extractContactQuery(message, concepts)
      },
      description: `${isSearch ? 'Search' : 'List'} contacts based on semantic analysis`,
      id: generateStepId(),
      state: StepState.PENDING,
      confidence: confidence,
      semanticContext: {
        primaryIntent: intent.primary_intent,
        conceptsUsed: concepts
      }
    };
  }

  /**
   * Create reminder as task (mapping RDF reminder to existing task system)
   */
  private createReminderAsTask(
    message: string, 
    intent: any, 
    confidence: number,
    concepts: string[],
    parameters?: any
  ): ActionStep {
    return {
      type: 'task' as ActionType,
      action: TaskActionType.CREATE_TASK,
      params: {
        title: `Reminder: ${this.extractReminderContent(message)}`,
        description: `Auto-created reminder from: "${message}"`,
        priority: intent.urgency_level || 'medium'
      },
      description: 'Create reminder task based on semantic analysis',
      id: generateStepId(),
      state: StepState.PENDING,
      confidence: confidence,
      semanticContext: {
        primaryIntent: 'reminder',
        urgencyLevel: intent.urgency_level,
        conceptsUsed: concepts
      }
    };
  }

  // ============================================================================
  // SEMANTIC CONTENT GENERATION HELPERS
  // ============================================================================

  private generateContextualSubject(message: string, intent: any, concepts: string[]): string {
    // Use concepts to generate relevant subject
    if (concepts.includes('meeting') || concepts.includes('project')) {
      return 'Project Meeting Discussion';
    }
    if (concepts.includes('report') || concepts.includes('quarterly')) {
      return 'Quarterly Report Update';
    }
    if (concepts.includes('dinner') || concepts.includes('tonight')) {
      return 'Tonight\'s Plans';
    }
    
    // Fallback based on formality
    const formality = intent.formality_level || 'neutral';
    if (formality === 'business') return 'Business Inquiry';
    if (formality === 'casual') return 'Quick Update';
    
    return 'Message from AI Assistant';
  }

  private generateContextualBody(message: string, intent: any, formality: string): string {
    const greeting = formality === 'formal' ? 'Dear colleague,' : 
                    formality === 'business' ? 'Hi there,' : 'Hey!';
    
    return `${greeting}\n\n${message}\n\nBest regards`;
  }

  private generateEventTitle(message: string, intent: any, concepts: string[]): string {
    if (concepts.includes('meeting')) return 'Meeting';
    if (concepts.includes('call')) return 'Phone Call';
    if (concepts.includes('lunch') || concepts.includes('dinner')) return 'Meal Planning';
    
    return 'Calendar Event';
  }

  private generateEventDescription(message: string, intent: any, concepts: string[]): string {
    return `Event created from: "${message}"\nConcepts: ${concepts.join(', ')}`;
  }

  private generateTaskTitle(message: string, concepts: string[]): string {
    // Extract action verb + object
    const actionMatch = message.match(/(create|make|do|complete|finish|review|update|check)\s+([^.!?]+)/i);
    if (actionMatch) {
      return actionMatch[0];
    }
    
    // Use concepts
    if (concepts.length > 0) {
      return concepts.slice(0, 3).join(' ');
    }
    
    return message.substring(0, 50);
  }

  private generateTaskDescription(message: string, intent: any): string {
    return `Task created from semantic analysis of: "${message}"`;
  }

  private extractContactQuery(message: string, concepts: string[]): string {
    // Extract person name patterns
    const nameMatch = message.match(/(?:find|search|look)\s+(?:for\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (nameMatch) return nameMatch[1];
    
    // Use concepts that look like names
    const namelikeConcepts = concepts.filter(c => /^[A-Z][a-z]+$/.test(c));
    if (namelikeConcepts.length > 0) return namelikeConcepts[0];
    
    return '';
  }

  private extractReminderContent(message: string): string {
    const reminderMatch = message.match(/remind.*?(?:about|to|of)\s+(.+?)(?:\.|$)/i);
    return reminderMatch?.[1] || message.replace(/remind.*?(?:about|to|of)\s+/i, '').trim();
  }

  private extractTimeFromMessage(message: string): string | null {
    // Basic time extraction patterns
    if (message.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // Default to 2 PM
      return tomorrow.toISOString();
    }
    
    if (message.toLowerCase().includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(14, 0, 0, 0);
      return nextWeek.toISOString();
    }
    
    return null;
  }

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  /**
   * Calculate overall confidence from RDF insights
   */
  private calculateOverallConfidence(rdfInsights: any): number {
    const intentConfidence = rdfInsights.ai_reasoning?.intent_analysis?.confidence || 0;
    const actionConfidences = (rdfInsights.structured_actions || []).map((a: any) => a.confidence || 0);
    const conceptCount = (rdfInsights.ai_reasoning?.extracted_concepts || []).length;
    
    // Weight factors
    const intentWeight = 0.4;
    const actionWeight = 0.4;
    const conceptWeight = 0.2;
    
    // Calculate weighted confidence
    const avgActionConfidence = actionConfidences.length > 0 ? 
      actionConfidences.reduce((sum: number, conf: number) => sum + conf, 0) / actionConfidences.length : 0;
    
    const conceptScore = Math.min(conceptCount / 5, 1); // Normalize to 0-1
    
    const overallConfidence = (
      intentWeight * intentConfidence +
      actionWeight * avgActionConfidence +
      conceptWeight * conceptScore
    );
    
    return Math.max(0, Math.min(1, overallConfidence));
  }
} 