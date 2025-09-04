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
} from "../../types/action-planning.types";
import { CachedEntity, EntityType } from "../../types/entity.types";
import unifiedGoogleManager from "../integrations/unified-google-manager";
import { CalendarTemporalManager } from "../integrations/calendar-temporal-manager";
import twilioService from "../integrations/twilio-service";
import { redisCache } from "../caching/redis-cache";
import {
  InterventionManager,
  InterventionRequest,
} from "../workflows/intervention-manager";
import { EntityManager } from "../rdf/entity-recognizer";
import { SmartContactResolver } from "../rdf/smart-contact-resolver";
import responseManager from "../workflows/response-manager";
import { StepExecutorFactory } from "../action-planner/step-executors/step-executor-factory";
import { DependencyResolver } from "../action-planner/dependency-resolver";
import {
  generateStepId,
  ENTITY_PLACEHOLDER,
  slugify,
} from "../action-planner/action-planner-utils";
import { isValidUnifiedToolResponse, validateUnifiedToolResponse } from "@omnii/validators";
import { getObjectStructure, logObjectStructure } from '../../utils/object-structure';
import { EmailStepExecutor } from '../action-planner/step-executors/email-step-executor';
import { CalendarStepExecutor } from '../action-planner/step-executors/calendar-step-executor';
import { ContactStepExecutor } from '../action-planner/step-executors/contact-step-executor';
import { TaskStepExecutor } from '../action-planner/step-executors/task-step-executor';
// Removed unused imports from action-planner-utils
import { RDFContactAnalyzer } from '../rdf/rdf-contact-analyzer';
import { ContactConfidenceBooster } from '../rdf/contact-confidence-booster';
import { RDFActionMapper } from '../rdf/rdf-action-mapper';

export class ActionPlanner {
  private openai: OpenAI;
  private temporalContextManager: CalendarTemporalManager;
  private interventionManager: InterventionManager;
  private entityManager: EntityManager;
  private stepExecutorFactory: StepExecutorFactory;
  private smartContactResolver: SmartContactResolver;
  private rdfActionMapper: RDFActionMapper;

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
    this.smartContactResolver = new SmartContactResolver();
    this.rdfActionMapper = new RDFActionMapper();
  }

  /**
   * Analyze message and create action plan (enhanced with RDF-first approach)
   */
  async createPlan(
    message: string,
    entities?: CachedEntity[],
    userUUID?: string,
    executionContext?: ExecutionContext
  ): Promise<ActionPlan> {
    try {
      console.log(`[ActionPlanner] 🧠 Creating RDF-driven semantic plan for: "${message}"`);
      console.log(`[ActionPlanner] 🔍 Input entities:`, entities?.map(e => ({
        type: e.type,
        value: e.value,
        email: e.email,
        needsEmailResolution: e.needsEmailResolution
      })));

      // ✅ NEW: Get all cached data for enhanced planning context
      let allCachedData = null;
      if (userUUID) {
        console.log(`[ActionPlanner] 🧠 Loading brain memory cache for enhanced planning context`);
        allCachedData = await this.getAllCachedData(userUUID);
        console.log(`[ActionPlanner] 🧠 Brain memory context loaded - planning with complete data awareness`);
      }

      // NEW: Step 1 - Check for RDF insights in execution context (RDF-first approach)
      const rdfInsights = executionContext?.rdfInsights;
      const rdfSuccess = executionContext?.rdfSuccess;

      if (rdfSuccess && rdfInsights) {
        console.log(`[ActionPlanner] 🎯 RDF insights available - attempting semantic planning`);
        
        // Try RDF-driven action planning first
        const rdfResult = await this.rdfActionMapper.mapSemanticInsightsToActions(
          rdfInsights,
          message,
          userUUID || 'unknown'
        );

        if (!rdfResult.fallbackToLLM && rdfResult.actions.length > 0) {
          console.log(`[ActionPlanner] ✅ RDF semantic planning successful - confidence: ${rdfResult.confidence.toFixed(2)}`);
          console.log(`[ActionPlanner] 🎯 Generated ${rdfResult.actions.length} semantic actions:`, 
            rdfResult.actions.map(a => `${a.type}:${a.action}`));
          
          // Create RDF-driven plan
          const semanticPlan: ActionPlan = {
            steps: rdfResult.actions,
            originalMessage: message,
            summary: this.generateSemanticSummary(rdfInsights, rdfResult.actions),
            isMultiStep: rdfResult.actions.length > 1,
            currentStepIndex: 0,
            state: PlanState.CREATED,
            // NEW: Mark as RDF-driven with metadata
            planningMethod: 'rdf_semantic',
            rdfConfidence: rdfResult.confidence,
            semanticInsights: {
              primaryIntent: rdfInsights.ai_reasoning?.intent_analysis?.primary_intent,
              extractedConcepts: rdfInsights.ai_reasoning?.extracted_concepts?.map((c: any) => c.concept_name) || [],
              actionMappingUsed: true,
              fallbackReason: undefined
            }
          };

          // Apply entity resolution to semantic plan if needed
          if (entities && entities.length > 0) {
            console.log(`[ActionPlanner] 🔧 Applying entity resolution to ${semanticPlan.steps.length} semantic steps`);
            semanticPlan.steps = this.entityManager.patchEmailPlaceholders(semanticPlan.steps, entities);
            
            // Check for unresolved placeholders and apply RDF contact resolution
            const hasUnresolvedPlaceholders = this.entityManager.hasUnresolvedPlaceholders(semanticPlan.steps);
            if (hasUnresolvedPlaceholders) {
              const entitiesNeedingResolution = entities.filter(e => 
                e.type === EntityType.UNKNOWN || (e.type === EntityType.PERSON && e.needsEmailResolution)
              );
              
              if (entitiesNeedingResolution.length > 0) {
                const resolvedEntities = await this.resolveEntitiesWithRDF(entitiesNeedingResolution, entities, userUUID);
                semanticPlan.steps = this.patchEntityPlaceholders(semanticPlan.steps, resolvedEntities);
                semanticPlan.steps = await this.enhanceEmailStepsWithContext(semanticPlan.steps, message, userUUID);
              }
            }
          }

          console.log(`[ActionPlanner] 🚀 Returning RDF-driven semantic plan with ${semanticPlan.steps.length} steps`);
          return semanticPlan;
        } else {
          console.log(`[ActionPlanner] ⚠️ RDF semantic planning failed - ${rdfResult.reasoning}`);
        }
      } else {
        console.log(`[ActionPlanner] ⚠️ No RDF insights available - RDF success: ${rdfSuccess}, insights: ${!!rdfInsights}`);
      }

      // Step 2: Fallback to LLM-based planning (existing logic)
      console.log(`[ActionPlanner] 🤖 Falling back to LLM-based planning`);
      const llmPlan = await this.createPlanWithLLM(message, entities);
      
      // Mark as LLM fallback with reasoning
      llmPlan.planningMethod = 'llm_fallback';
      llmPlan.rdfConfidence = rdfInsights ? 0.3 : 0;
      llmPlan.semanticInsights = {
        actionMappingUsed: false,
        fallbackReason: rdfInsights ? 'RDF confidence too low' : 'No RDF insights available'
      };

      // Apply existing entity resolution logic for LLM plan
      if (entities && entities.length > 0) {
        console.log(`[ActionPlanner] 🔧 Patching email placeholders with ${entities.length} entities...`);
        llmPlan.steps = this.entityManager.patchEmailPlaceholders(llmPlan.steps, entities);
        
        console.log(`[ActionPlanner] 📋 After placeholder patching:`, {
          stepDetails: llmPlan.steps.map(s => ({
            type: s.type,
            action: s.action,
            recipientEmail: s.params?.recipient_email
          }))
        });
      } else {
        console.log(`[ActionPlanner] ⚠️ No entities provided for placeholder patching`);
      }

      // Validate plan dependencies before proceeding
      const validationResult = this.stepExecutorFactory.validatePlanDependencies(llmPlan.steps);
      if (!validationResult.valid) {
        console.warn(`[ActionPlanner] Plan validation found issues:`, validationResult.errors);
      }

      // Check for unresolved placeholders after patching (existing logic)
      const hasUnresolvedPlaceholders = this.entityManager.hasUnresolvedPlaceholders(llmPlan.steps);
      console.log(`[ActionPlanner] 🔍 Has unresolved placeholders: ${hasUnresolvedPlaceholders}`);
      
      if (hasUnresolvedPlaceholders) {
        console.log(`[ActionPlanner] Found unresolved placeholders, checking for entities that need resolution`);

        const entitiesNeedingResolution = entities?.filter(e => 
          e.type === EntityType.UNKNOWN || (e.type === EntityType.PERSON && e.needsEmailResolution)
        ) || [];

        console.log(`[ActionPlanner] 🔍 Entities needing resolution:`, entitiesNeedingResolution.map(e => ({
          type: e.type,
          value: e.value,
          needsEmailResolution: e.needsEmailResolution
        })));

        if (entitiesNeedingResolution.length > 0) {
          console.log(`[ActionPlanner] 🧠 Found ${entitiesNeedingResolution.length} entities needing resolution - using RDF reasoning`);

          const resolvedEntities = await this.resolveEntitiesWithRDF(entitiesNeedingResolution, entities, userUUID);
          const updatedSteps = this.patchEntityPlaceholders(llmPlan.steps, resolvedEntities);
          const enhancedSteps = await this.enhanceEmailStepsWithContext(updatedSteps, message, userUUID);

          console.log(`[ActionPlanner] 📋 Final plan after RDF resolution and email enhancement:`, {
            stepDetails: enhancedSteps.map(s => ({
              type: s.type,
              action: s.action,
              recipientEmail: s.params?.recipient_email,
              subject: s.params?.subject
            }))
          });

          return {
            ...llmPlan,
            steps: enhancedSteps,
            isMultiStep: llmPlan.isMultiStep,
            currentStepIndex: 0,
            state: PlanState.CREATED,
          };
        } else {
          console.log(`[ActionPlanner] ❌ No entities found that need resolution`);
        }
      } else {
        console.log(`[ActionPlanner] ✅ No unresolved placeholders found`);
      }

      console.log(`[ActionPlanner] 📋 Returning LLM plan as-is:`, {
        stepDetails: llmPlan.steps.map(s => ({
          type: s.type,
          action: s.action,
          recipientEmail: s.params?.recipient_email
        }))
      });

      return llmPlan;
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
        planningMethod: 'llm_fallback',
        rdfConfidence: 0,
        semanticInsights: {
          actionMappingUsed: false,
          fallbackReason: 'Error during planning'
        }
      };
    }
  }

  /**
   * Generate semantic summary from RDF insights and actions
   */
  private generateSemanticSummary(rdfInsights: any, actions: ActionStep[]): string {
    const primaryIntent = rdfInsights.ai_reasoning?.intent_analysis?.primary_intent || 'unknown';
    const actionTypes = actions.map(a => a.type).join(', ');
    const conceptCount = rdfInsights.ai_reasoning?.extracted_concepts?.length || 0;
    
    return `Semantic analysis detected ${primaryIntent} intent with ${conceptCount} concepts, executing ${actionTypes} actions`;
  }

  /**
   * Resolve entities using cached data first, then RDF reasoning as fallback
   * ✅ FIXED: Now uses brain memory cache for fast contact resolution
   */
  private async resolveEntitiesWithRDF(
    entitiesNeedingResolution: CachedEntity[],
    allEntities?: CachedEntity[],
    userUUID?: string
  ): Promise<CachedEntity[]> {
    console.log(`[ActionPlanner] 🧠 Resolving ${entitiesNeedingResolution.length} entities with cached data first`);
    console.log(`[ActionPlanner] 🔑 Using userUUID: ${userUUID || 'undefined'}`);
    
    if (!userUUID) {
      console.warn(`[ActionPlanner] ⚠️ No userUUID provided, cannot use brain memory cache`);
    }
    
    const resolvedEntities: CachedEntity[] = [];
    
    for (const entity of entitiesNeedingResolution) {
      console.log(`[ActionPlanner] 🔍 Resolving entity: ${entity.type} = "${entity.value}"`);
      
      try {
        const contactName = entity.value;
        
        // ✅ STEP 1: Check brain memory cache first (24hr cached contacts)
        let cachedContactMatch = null;
        if (userUUID) {
          cachedContactMatch = await this.searchCachedContacts(contactName, userUUID);
          
          if (cachedContactMatch) {
            console.log(`[ActionPlanner] 🎯 CACHE HIT: Found "${contactName}" in brain memory cache`);
            console.log(`[ActionPlanner] 📧 Email: ${cachedContactMatch.email}`);
            
            const resolvedEntity: CachedEntity = {
              type: EntityType.EMAIL,
              value: entity.value,
              email: cachedContactMatch.email,
              displayName: cachedContactMatch.name,
              resolvedAt: Date.now(),
              confidence: 0.95, // High confidence for cached data
            };
            resolvedEntities.push(resolvedEntity);
            continue; // Skip expensive RDF resolution
          } else {
            console.log(`[ActionPlanner] 📭 Cache miss for "${contactName}" - will try RDF fallback`);
          }
        }
        
        // ✅ STEP 2: Fallback to RDF reasoning (only if cache miss)
        console.log(`[ActionPlanner] 🤖 Falling back to RDF contact resolution for "${contactName}"`);
        
        // Initialize RDF contact analyzer and confidence booster
        const rdfAnalyzer = new RDFContactAnalyzer();
        const confidenceBooster = new ContactConfidenceBooster();
        
        // Step 2a: Analyze the contact mention using RDF semantics
        const contextMessage = `Send email to ${contactName}`; // Reconstruct context
        
        const analysis = await rdfAnalyzer.analyzeMessage(contextMessage);
        console.log(`[ActionPlanner] 📊 RDF Analysis complete:`, {
          contact: analysis.primary_contact,
          intent: analysis.intent,
          confidence: analysis.confidence,
          context: analysis.context_clues
        });
        
        // Step 2b: Expand the contact name for better matching
        const expandedNames = await rdfAnalyzer.expandContactName(contactName);
        console.log(`[ActionPlanner] 📝 Name expansion: ${contactName} → [${expandedNames.join(', ')}]`);
        
        // Step 2c: Search for contacts using all name variations (this will hit Google API)
        const searchResults = await rdfAnalyzer.searchContacts(expandedNames, userUUID);
        console.log(`[ActionPlanner] 🔍 Found ${searchResults.length} potential contacts via RDF`);
        
        if (searchResults.length === 0) {
          console.log(`[ActionPlanner] ❌ No contacts found for "${contactName}" in cache or via RDF`);
          resolvedEntities.push({
            ...entity,
            displayName: `${contactName} (not found)`,
          });
          continue;
        }
        
        // Step 2d: Apply contextual scoring and brain memory confidence boosting
        const scoredContacts = await rdfAnalyzer.scoreContacts(searchResults, analysis);
        console.log(`[ActionPlanner] 🎯 Scored ${scoredContacts.length} contacts`);
        
        // Step 2e: Boost confidence using brain memory (if userUUID available)
        let boostedContacts = scoredContacts;
        if (userUUID) {
          try {
            boostedContacts = await confidenceBooster.boostContactConfidence(
              scoredContacts,
              contactName,
              userUUID
            );
            console.log(`[ActionPlanner] 🧠 Brain memory boosting complete`);
          } catch (error) {
            console.warn(`[ActionPlanner] Brain memory boosting failed:`, error);
            // Continue with unboosted scores
          }
        }
        
        // Step 2f: Apply smart intervention logic
        const topContact = boostedContacts[0];
        const autoResolveThreshold = 0.8;
        
        if (topContact && topContact.confidence >= autoResolveThreshold) {
          // High confidence - auto-resolve
          console.log(`[ActionPlanner] ✅ Auto-resolving via RDF: ${topContact.name} (${Math.round(topContact.confidence * 100)}% confidence)`);
          
          const resolvedEntity: CachedEntity = {
            type: EntityType.EMAIL,
            value: entity.value,
            email: topContact.email!,
            displayName: topContact.name,
            resolvedAt: Date.now(),
            confidence: topContact.confidence,
          };
          resolvedEntities.push(resolvedEntity);
          
        } else if (boostedContacts.length > 0) {
          // Multiple options or low confidence - use best match for now
          const bestMatch = boostedContacts[0];
          console.log(`[ActionPlanner] 💡 Using best match via RDF: ${bestMatch.name} (${Math.round(bestMatch.confidence * 100)}% confidence)`);
          
          if (bestMatch.email) {
            const resolvedEntity: CachedEntity = {
              type: EntityType.EMAIL,
              value: entity.value,
              email: bestMatch.email,
              displayName: bestMatch.name,
              resolvedAt: Date.now(),
              confidence: bestMatch.confidence,
            };
            resolvedEntities.push(resolvedEntity);
          } else {
            console.log(`[ActionPlanner] ⚠️ Best match "${bestMatch.name}" has no email`);
            resolvedEntities.push({
              ...entity,
              displayName: `${bestMatch.name} (no email)`,
            });
          }
        } else {
          // No good matches found
          console.log(`[ActionPlanner] ❌ No suitable matches found for "${contactName}"`);
          resolvedEntities.push({
            ...entity,
            displayName: `${contactName} (no matches)`,
          });
        }
        
      } catch (error) {
        console.error(`[ActionPlanner] Error in contact resolution for "${entity.value}":`, error);
        resolvedEntities.push({
          ...entity,
          displayName: `${entity.value} (resolution error)`,
        });
      }
    }
    
    const successfulResolutions = resolvedEntities.filter(e => e.email).length;
    console.log(`[ActionPlanner] 🎯 Contact Resolution complete: ${successfulResolutions}/${entitiesNeedingResolution.length} entities resolved to emails`);
    
    return resolvedEntities;
  }

  /**
   * ✅ Search cached contacts from brain memory cache (Supabase)
   * This should find contacts like "Richard Santin" instantly from cache
   */
  private async searchCachedContacts(
    searchName: string, 
    userUUID: string
  ): Promise<{ name: string; email: string } | null> {
    try {
      console.log(`[ActionPlanner] 🧠 Searching brain memory cache for: "${searchName}"`);
      
      // Try to get cached contacts from Supabase brain_memory_cache table
      const baseUrl = process.env.RAILWAY_STATIC_URL 
        ? `https://${process.env.RAILWAY_STATIC_URL}` 
        : (process.env.BASE_URL || 'http://localhost:8000');
      
      const response = await fetch(`${baseUrl}/api/trpc/contacts.listContacts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userUUID,
        },
      });
      
      if (!response.ok) {
        console.log(`[ActionPlanner] ⚠️ Failed to fetch cached contacts: ${response.status}`);
        return null;
      }
      
          const contactsData = await response.json() as any;
    // ✅ Use the CORRECT tRPC response structure: result.data.json.data.contacts
    const contacts = contactsData?.result?.data?.json?.data?.contacts || 
                    contactsData?.json?.data?.contacts || 
                    contactsData?.data?.contacts || 
                    contactsData?.contacts || [];
      
      if (!Array.isArray(contacts) || contacts.length === 0) {
        console.log(`[ActionPlanner] 📭 No cached contacts found`);
        return null;
      }
      
      console.log(`[ActionPlanner] 🧠 Searching ${contacts.length} cached contacts for "${searchName}"`);
      
      // Search for exact and partial matches
      const searchLower = searchName.toLowerCase();
      const exactMatch = contacts.find((contact: any) => 
        contact.name?.toLowerCase() === searchLower
      );
      
      if (exactMatch && exactMatch.emails?.length > 0) {
        console.log(`[ActionPlanner] 🎯 EXACT CACHE MATCH: ${exactMatch.name} → ${exactMatch.emails[0].address}`);
        return {
          name: exactMatch.name,
          email: exactMatch.emails[0].address
        };
      }
      
      // Try partial match (e.g., "Richard Santin" matches "Richard")
      const partialMatch = contacts.find((contact: any) => {
        const contactNameLower = contact.name?.toLowerCase() || '';
        return contactNameLower.includes(searchLower) || searchLower.includes(contactNameLower);
      });
      
      if (partialMatch && partialMatch.emails?.length > 0) {
        console.log(`[ActionPlanner] 🎯 PARTIAL CACHE MATCH: ${partialMatch.name} → ${partialMatch.emails[0].address}`);
        return {
          name: partialMatch.name,
          email: partialMatch.emails[0].address
        };
      }
      
      console.log(`[ActionPlanner] 📭 No cache match found for "${searchName}"`);
      return null;
      
    } catch (error) {
      console.error(`[ActionPlanner] ❌ Error searching cached contacts:`, error);
      return null;
    }
  }

  /**
   * ✅ Search cached tasks from brain memory cache (Supabase)
   * This should find task lists and tasks instantly from cache
   */
  private async searchCachedTasks(
    userUUID: string
  ): Promise<{ taskLists: any[]; totalTasks: number } | null> {
    try {
      console.log(`[ActionPlanner] 🧠 Searching brain memory cache for tasks`);
      
      // Get cached tasks from Supabase brain_memory_cache table
      const baseUrl = process.env.RAILWAY_STATIC_URL 
        ? `https://${process.env.RAILWAY_STATIC_URL}` 
        : (process.env.BASE_URL || 'http://localhost:8000');
      
      const response = await fetch(`${baseUrl}/api/trpc/tasks.getCompleteOverview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userUUID,
        },
      });
      
      if (!response.ok) {
        console.log(`[ActionPlanner] ⚠️ Failed to fetch cached tasks: ${response.status}`);
        return null;
      }
      
      const tasksData = await response.json() as any;
      // ✅ Use the CORRECT tRPC response structure: result.data.json.data
      const taskOverview = tasksData?.result?.data?.json?.data || 
                          tasksData?.json?.data || 
                          tasksData?.data || 
                          null;
      
      if (!taskOverview || !Array.isArray(taskOverview.taskLists)) {
        console.log(`[ActionPlanner] 📭 No cached tasks found`);
        return null;
      }
      
      console.log(`[ActionPlanner] 🧠 Found ${taskOverview.taskLists.length} task lists with ${taskOverview.totalTasks} total tasks`);
      
      return {
        taskLists: taskOverview.taskLists,
        totalTasks: taskOverview.totalTasks
      };
      
    } catch (error) {
      console.error(`[ActionPlanner] 🧠 Brain memory tasks cache search failed:`, error);
      return null;
    }
  }

  /**
   * ✅ Search cached calendar events from brain memory cache (Supabase)
   * This should find calendar events instantly from cache
   */
  private async searchCachedCalendar(
    userUUID: string
  ): Promise<{ events: any[]; totalCount: number } | null> {
    try {
      console.log(`[ActionPlanner] 🧠 Searching brain memory cache for calendar events`);
      
      // Get cached calendar from Supabase brain_memory_cache table
      const baseUrl = process.env.RAILWAY_STATIC_URL 
        ? `https://${process.env.RAILWAY_STATIC_URL}` 
        : (process.env.BASE_URL || 'http://localhost:8000');
      
      const response = await fetch(`${baseUrl}/api/trpc/calendar.getEvents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userUUID,
        },
      });
      
      if (!response.ok) {
        console.log(`[ActionPlanner] ⚠️ Failed to fetch cached calendar: ${response.status}`);
        return null;
      }
      
      const calendarData = await response.json() as any;
      // ✅ Use the CORRECT tRPC response structure: result.data.json.data
      const eventData = calendarData?.result?.data?.json?.data || 
                       calendarData?.json?.data || 
                       calendarData?.data || 
                       null;
      
      if (!eventData || !Array.isArray(eventData.events)) {
        console.log(`[ActionPlanner] 📭 No cached calendar events found`);
        return null;
      }
      
      console.log(`[ActionPlanner] 🧠 Found ${eventData.events.length} calendar events`);
      
      return {
        events: eventData.events,
        totalCount: eventData.totalCount || eventData.events.length
      };
      
    } catch (error) {
      console.error(`[ActionPlanner] 🧠 Brain memory calendar cache search failed:`, error);
      return null;
    }
  }

  /**
   * ✅ Search cached emails from brain memory cache (Supabase)
   * This should find recent emails instantly from cache
   */
  private async searchCachedEmails(
    userUUID: string
  ): Promise<{ emails: any[]; totalCount: number; unreadCount: number } | null> {
    try {
      console.log(`[ActionPlanner] 🧠 Searching brain memory cache for emails`);
      
      // Get cached emails from Supabase brain_memory_cache table
      const baseUrl = process.env.RAILWAY_STATIC_URL 
        ? `https://${process.env.RAILWAY_STATIC_URL}` 
        : (process.env.BASE_URL || 'http://localhost:8000');
      
      const response = await fetch(`${baseUrl}/api/trpc/email.listEmails`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userUUID,
        },
      });
      
      if (!response.ok) {
        console.log(`[ActionPlanner] ⚠️ Failed to fetch cached emails: ${response.status}`);
        return null;
      }
      
      const emailData = await response.json() as any;
      // ✅ Use the CORRECT tRPC response structure: result.data.json.data
      const emailResponse = emailData?.result?.data?.json?.data || 
                           emailData?.json?.data || 
                           emailData?.data || 
                           null;
      
      if (!emailResponse || !Array.isArray(emailResponse.emails)) {
        console.log(`[ActionPlanner] 📭 No cached emails found`);
        return null;
      }
      
      console.log(`[ActionPlanner] 🧠 Found ${emailResponse.emails.length} emails`);
      
      return {
        emails: emailResponse.emails,
        totalCount: emailResponse.totalCount || emailResponse.emails.length,
        unreadCount: emailResponse.unreadCount || 0
      };
      
    } catch (error) {
      console.error(`[ActionPlanner] 🧠 Brain memory email cache search failed:`, error);
      return null;
    }
  }

  /**
   * ✅ Get all cached data from brain memory cache (Supabase)
   * This provides complete context for ActionPlanner with all Google services data
   */
  private async getAllCachedData(
    userUUID: string
  ): Promise<{
    contacts: { name: string; email: string }[] | null;
    tasks: { taskLists: any[]; totalTasks: number } | null;
    calendar: { events: any[]; totalCount: number } | null;
    emails: { emails: any[]; totalCount: number; unreadCount: number } | null;
  }> {
    console.log(`[ActionPlanner] 🧠 Getting complete cached data context for user: ${userUUID}`);
    
    // Get all cached data in parallel for maximum speed
    const [tasksResult, calendarResult, emailsResult] = await Promise.all([
      this.searchCachedTasks(userUUID).catch(() => null),
      this.searchCachedCalendar(userUUID).catch(() => null), 
      this.searchCachedEmails(userUUID).catch(() => null)
    ]);
    
    // Note: contacts are handled separately in resolveEntitiesWithRDF
    
    console.log(`[ActionPlanner] 🧠 Complete cache context ready:`);
    console.log(`  - Tasks: ${tasksResult ? `${tasksResult.totalTasks} tasks in ${tasksResult.taskLists.length} lists` : 'none'}`);
    console.log(`  - Calendar: ${calendarResult ? `${calendarResult.events.length} events` : 'none'}`);
    console.log(`  - Emails: ${emailsResult ? `${emailsResult.emails.length} emails (${emailsResult.unreadCount} unread)` : 'none'}`);
    
    return {
      contacts: null, // Handled separately in entity resolution
      tasks: tasksResult,
      calendar: calendarResult,
      emails: emailsResult
    };
  }

  /**
   * Enhance email steps with contextual subjects and bodies using RDF reasoning
   */
  private async enhanceEmailStepsWithContext(
    steps: ActionStep[],
    originalMessage: string,
    userUUID?: string
  ): Promise<ActionStep[]> {
    console.log(`[ActionPlanner] 🎨 Enhancing email steps with contextual content`);
    
    const enhancedSteps = await Promise.all(
      steps.map(async (step) => {
        if (step.type === "email" && (step.action === "send_email" || step.action === "create_draft")) {
          // Check if subject is missing or generic
          const hasSubject = step.params?.subject && 
                           step.params.subject !== "No Subject" && 
                           step.params.subject.trim().length > 0;
          
          if (!hasSubject) {
            console.log(`[ActionPlanner] 🎯 Generating subject for email step`);
            
            try {
              // Use RDF to analyze the original message and generate contextual content
              const rdfAnalyzer = new RDFContactAnalyzer();
              const analysis = await rdfAnalyzer.analyzeMessage(originalMessage);
              
              // Generate contextual subject based on analysis
              const subject = this.generateContextualSubject(analysis, originalMessage);
              
              // Generate contextual body if missing
              const hasBody = step.params?.body && step.params.body.trim().length > 0;
              const body = hasBody ? step.params.body : this.generateContextualBody(analysis, originalMessage);
              
              console.log(`[ActionPlanner] ✅ Generated subject: "${subject}"`);
              
              return {
                ...step,
                params: {
                  ...step.params,
                  subject,
                  body
                }
              };
            } catch (error) {
              console.warn(`[ActionPlanner] Failed to generate contextual content:`, error);
              // Fallback to a simple subject
              return {
                ...step,
                params: {
                  ...step.params,
                  subject: "Message from Omnii AI",
                  body: step.params?.body || "Hi there! I wanted to reach out."
                }
              };
            }
          }
        }
        
        return step;
      })
    );
    
    console.log(`[ActionPlanner] 🎨 Email enhancement complete`);
    return enhancedSteps;
  }

  /**
   * Generate contextual email subject based on RDF analysis
   */
  private generateContextualSubject(analysis: any, originalMessage: string): string {
    // Extract key context clues
    const contextClues = analysis.context_clues || [];
    const formality = analysis.formality || 'neutral';
    
    // Generate subject based on context
    if (contextClues.includes('quarterly') && contextClues.includes('report')) {
      return 'Quarterly Report Discussion';
    }
    
    if (contextClues.includes('meeting') || contextClues.includes('project')) {
      return 'Project Meeting Follow-up';
    }
    
    if (contextClues.includes('dinner') || contextClues.includes('tonight')) {
      return 'Tonight\'s Plans';
    }
    
    if (contextClues.includes('medical') || contextClues.includes('test results')) {
      return 'Medical Test Results';
    }
    
    // Check for weekend context
    if (originalMessage.toLowerCase().includes('weekend')) {
      return 'Weekend Plans';
    }
    
    // Check for asking about plans
    if (originalMessage.toLowerCase().includes('plans')) {
      return 'Checking In About Plans';
    }
    
    // Formality-based fallbacks
    if (formality === 'business') {
      return 'Quick Check-in';
    } else if (formality === 'casual') {
      return 'Hey! 👋';
    } else if (formality === 'formal') {
      return 'Professional Inquiry';
    }
    
    // Generic fallback
    return 'Quick Message';
  }

  /**
   * Generate contextual email body based on RDF analysis
   */
  private generateContextualBody(analysis: any, originalMessage: string): string {
    const formality = analysis.formality || 'neutral';
    const contextClues = analysis.context_clues || [];
    
    // Start with appropriate greeting
    let greeting = '';
    if (formality === 'business') {
      greeting = 'Hi there,';
    } else if (formality === 'casual') {
      greeting = 'Hey!';
    } else if (formality === 'formal') {
      greeting = 'Good day,';
    } else {
      greeting = 'Hi,';
    }
    
    // Generate body based on context
    if (contextClues.includes('weekend') || originalMessage.toLowerCase().includes('weekend')) {
      return `${greeting}\n\nI wanted to check what your plans are for the weekend. Let me know what you're up to!\n\nTalk soon!`;
    }
    
    if (contextClues.includes('dinner') || contextClues.includes('tonight')) {
      return `${greeting}\n\nJust wanted to touch base about tonight's plans. Let me know what works for you!\n\nThanks!`;
    }
    
    if (contextClues.includes('quarterly') && contextClues.includes('report')) {
      return `${greeting}\n\nI wanted to follow up regarding the quarterly report. Please let me know if you have any questions or need additional information.\n\nBest regards`;
    }
    
    // Generic friendly message
    return `${greeting}\n\nI wanted to reach out and connect. Hope you're doing well!\n\nBest`;
  }

  /**
   * Patch entity placeholders in steps with resolved emails
   */
  private patchEntityPlaceholders(steps: ActionStep[], resolvedEntities: CachedEntity[]): ActionStep[] {
    console.log(`[ActionPlanner] 🔧 Patching entity placeholders with ${resolvedEntities.length} resolved entities`);
    
    return steps.map(step => {
      if (step.type === "email" && step.params?.recipient_email) {
        const recipientEmail = step.params.recipient_email;
        
        if (typeof recipientEmail === "string" && recipientEmail.startsWith("{{ENTITY:")) {
          const slug = recipientEmail.match(/\{\{ENTITY:([a-z0-9\-]+)\}\}/i)?.[1];
          
          if (slug) {
            // Find matching resolved entity
            const match = resolvedEntities.find(e => 
              slugify(e.value) === slug && e.email
            );
            
            if (match?.email) {
              console.log(`[ActionPlanner] ✅ Resolved ${recipientEmail} → ${match.email} (${match.displayName})`);
              return {
                ...step,
                params: {
                  ...step.params,
                  recipient_email: match.email,
                },
              };
            } else {
              console.warn(`[ActionPlanner] ❌ Could not resolve placeholder: ${recipientEmail}`);
              // Instead of creating fake emails, mark the step as failed
              const entityName = slug.replace(/-/g, ' ');
              return {
                ...step,
                params: {
                  ...step.params,
                  recipient_email: "", // Clear the invalid placeholder
                  _resolutionError: `Could not find email address for "${entityName}". Please ensure the contact exists in your Google Contacts.`
                },
                description: `${step.description} (❌ Contact resolution failed)`,
                state: StepState.FAILED,
              };
            }
          }
        }
      }
      
      return step;
    });
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
- n8n_agent: smart_email_compose, smart_scheduling, contact_enrichment, web_research, youtube_content_search, workflow_automation, multi_service_coordination, email_thread_analysis, meeting_coordination, information_gathering

ROUTING DECISION RULES:
Use n8n_agent when the request involves:
1. Complex multi-step automation across multiple services
2. Web research, information gathering, or external data needs
3. YouTube content discovery and video search
4. Smart email composition requiring AI context awareness
5. Intelligent scheduling coordination with multiple people
6. Cross-service workflow automation
7. Contact enrichment with external data sources
8. Any request that would benefit from AI reasoning beyond simple API calls

Use local executors (email, calendar, task, contact) for:
1. Simple, direct Google API operations
2. Single-step actions (list emails, create task, show calendar)
3. Real-time operations requiring <2 second response
4. Basic CRUD operations without complex logic

Examples of n8n_agent usage:
- "Research the latest AI trends and email a summary to my team" → n8n_agent: workflow_automation
- "Find YouTube videos about React hooks and create learning tasks" → n8n_agent: multi_service_coordination  
- "Compose a professional email to John about the project delay with context from recent emails" → n8n_agent: smart_email_compose
- "Search for information about quantum computing and schedule a meeting to discuss" → n8n_agent: workflow_automation

Examples of local executor usage:
- "List my emails from today" → email: fetch_emails
- "Create a task: Buy groceries" → task: create_task
- "What's on my calendar tomorrow?" → calendar: list_events
- "Find contact John Smith" → contact: search_contacts

Return a JSON object with this structure:
{
  "isMultiStep": boolean,
  "summary": "Brief description of what will be done",
  "steps": [
    {
      "type": "calendar|task|contact|analysis|email|n8n_agent",
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
   * Determine if message should use n8n agents based on complexity and intent
   */
  private shouldUseN8nAgent(
    message: string, 
    rdfInsights: any,
    entities: CachedEntity[]
  ): boolean {
    console.log(`[ActionPlanner] 🤔 Analyzing n8n routing for: "${message.substring(0, 50)}..."`);
    
    // Factors for n8n routing:
    
    // 1. Message complexity (multiple verbs, cross-service coordination)
    const wordCount = message.split(' ').length;
    const hasMultipleVerbs = (message.match(/\b(send|create|find|search|schedule|update|analyze|research|compose|coordinate|optimize)\b/gi) || []).length > 1;
    
    // 2. RDF-detected intent analysis
    const primaryIntent = rdfInsights?.ai_reasoning?.intent_analysis?.primary_intent;
    const complexIntents = ['workflow_automation', 'research_task', 'multi_service_coordination', 'information_seeking'];
    const isComplexIntent = complexIntents.includes(primaryIntent);
    
    // 3. Web/research component detection
    const hasWebComponent = /\b(research|search|find information|look up|what is|how to|latest|trends|news)\b/i.test(message);
    const hasYouTubeComponent = /\b(youtube|video|tutorial|watch|learn|course|lesson)\b/i.test(message);
    
    // 4. Cross-service coordination indicators
    const hasCrossService = this.detectCrossServiceNeed(message);
    
    // 5. AI reasoning requirement indicators
    const needsAIReasoning = /\b(smart|intelligent|analyze|summarize|recommend|suggest|optimize|professional|context)\b/i.test(message);
    
    // 6. Multi-step workflow indicators
    const hasWorkflowKeywords = /\b(and then|after that|also|plus|additionally|coordinate|automate)\b/i.test(message);
    
    // Decision logic with weighted scoring
    const complexityScore = (
      (wordCount > 10 ? 1 : 0) +
      (hasMultipleVerbs ? 1 : 0) +
      (isComplexIntent ? 2 : 0) +
      (hasWebComponent ? 2 : 0) +
      (hasYouTubeComponent ? 2 : 0) +
      (hasCrossService ? 2 : 0) +
      (needsAIReasoning ? 1 : 0) +
      (hasWorkflowKeywords ? 1 : 0)
    );
    
    // Threshold: Use n8n for complexity score >= 2
    const shouldUseN8n = complexityScore >= 2;
    
    console.log(`[ActionPlanner] 🤔 n8n routing analysis:`);
    console.log(`[ActionPlanner] 📊 Complexity score: ${complexityScore} (threshold: 2)`);
    console.log(`[ActionPlanner] 🎯 Decision: ${shouldUseN8n ? 'USE n8n Agent' : 'USE Local System'}`);
    console.log(`[ActionPlanner] 📈 Factors: words=${wordCount}, multiVerb=${hasMultipleVerbs}, intent=${primaryIntent}, web=${hasWebComponent}, youtube=${hasYouTubeComponent}, cross=${hasCrossService}, ai=${needsAIReasoning}, workflow=${hasWorkflowKeywords}`);
    
    return shouldUseN8n;
  }

  /**
   * Detect patterns that require multiple service coordination
   */
  private detectCrossServiceNeed(message: string): boolean {
    const crossServicePatterns = [
      // Email + Calendar coordination
      /email.*calendar/i,
      /calendar.*email/i,
      /schedule.*email/i,
      /meeting.*email/i,
      
      // Task + Email coordination
      /task.*email/i,
      /email.*task/i,
      /remind.*email/i,
      
      // Contact + Email coordination
      /contact.*email/i,
      /email.*contact/i,
      
      // Research + Action coordination
      /research.*email/i,
      /research.*create/i,
      /find.*send/i,
      /search.*schedule/i,
      
      // Multi-action patterns
      /find.*create/i,
      /search.*send/i,
      /analyze.*schedule/i,
      /summarize.*email/i,
    ];
    
    const hasCrossService = crossServicePatterns.some(pattern => pattern.test(message));
    console.log(`[ActionPlanner] 🔗 Cross-service coordination detected: ${hasCrossService}`);
    
    return hasCrossService;
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
