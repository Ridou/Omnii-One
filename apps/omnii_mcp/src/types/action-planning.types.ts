/**
 * Action Planning Types
 *
 * Types for multi-step operation planning and execution
 */

/**
 * Response categories for client-side component detection
 */
export enum ResponseCategory {
  // General categories
  GENERAL = "general",
  TOOL_RESPONSE = "tool_response",
  
  // Email categories
  EMAIL_LIST = "email_list",
  EMAIL_SINGLE = "email_single", 
  EMAIL_SENT = "email_sent",
  EMAIL_DRAFT = "email_draft",
  
  // Calendar categories  
  CALENDAR_LIST = "calendar_list",
  CALENDAR_EVENT = "calendar_event",
  
  // Contact categories
  CONTACT_SINGLE = "contact_single",
  CONTACT_LIST = "contact_list",
  
  // Task categories
  TASK_SINGLE = "task_single",
  TASK_LIST = "task_list",
}

/**
 * Execution context types
 */
export enum ExecutionContextType {
  SMS = "sms",
  WEBSOCKET = "websocket",
}

/**
 * Simplified step states
 */
export enum StepState {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  WAITING_INTERVENTION = "WAITING_INTERVENTION",
  TIMEOUT = "TIMEOUT",
}

/**
 * Simplified plan states
 */
export enum PlanState {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CREATED = "CREATED",
  WAITING_INTERVENTION = "WAITING_INTERVENTION",
}

/**
 * Approval system states
 */
export enum ApprovalState {
  DRAFT_PENDING = "draft_pending",
  STEP_APPROVED = "step_approved",
  STEP_REJECTED = "step_rejected",
  STEP_MODIFIED = "step_modified",
  USER_CANCELLED = "user_cancelled",
  TIMEOUT_EXPIRED = "timeout_expired", // Phase 2: Timeout handling
  ERROR_RECOVERY = "error_recovery", // Phase 2: Error recovery state
}

/**
 * Risk levels for workflow steps
 */
export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

/**
 * Dependency effect types
 */
export enum DependencyEffect {
  BLOCKS = "blocks", // Step cannot run without dependency
  ENHANCES = "enhances", // Step runs better with dependency data
  OPTIONAL = "optional", // Step can run without dependency
}

/**
 * Dependency resolution strategies
 */
export enum DependencyResolution {
  WAIT = "wait", // Wait for dependency to complete
  SKIP = "skip", // Skip this step
  FALLBACK = "fallback", // Use fallback behavior
  ASK_USER = "ask_user", // Request user decision
}

/**
 * Edit operations for workflow drafts
 */
export enum EditOperation {
  APPROVE_STEP = "approve_step",
  REJECT_STEP = "reject_step",
  MODIFY_PARAMS = "modify_params",
  CANCEL_ALL = "cancel_all",
}

/**
 * Types of actions that can be performed
 */
export type ActionType =
  | "calendar"
  | "task"
  | "contact"
  | "analysis"
  | "email"
  | "system"
  | CalendarActionType
  | TaskActionType
  | ContactActionType
  | AnalysisActionType
  | EmailActionType
  | SystemActionType;

/**
 * Recognized entity from user message
 */
export interface Entity {
  type: "PERSON" | "EMAIL" | "ORG" | "DATE" | string;
  value: string;
  email?: string;
}

/**
 * Simple dependency for MVP
 */
export interface StepDependency {
  stepId: string;
  field?: string;
  effect: DependencyEffect;
  resolution: DependencyResolution;
  fallbackValue?: any;
}

/**
 * Individual step in an action plan
 */
export interface ActionStep {
  type: ActionType;
  action: string;
  params: Record<string, any>;
  description: string;
  id: string;
  state: StepState;
  result?: StepResult;
  // Simplified dependency tracking
  requires?: {
    stepId: string;
    field?: string; // Optional field to extract from step result
  }[];
  // For backward compatibility
  dependsOn?: string[];
}

/**
 * Enhanced step for approval workflow
 */
export interface ApprovalStep extends ActionStep {
  approvalStatus: ApprovalState;
  riskLevel: RiskLevel;
  estimatedTime: string;
  expectedOutcome: string;

  // Modification tracking
  isModified: boolean;
  originalParams?: Record<string, any>;
  userModifications?: Record<string, any>;
}

/**
 * Complete action plan
 */
export interface ActionPlan {
  steps: ActionStep[];
  originalMessage: string;
  summary: string;
  state: PlanState;
  currentStepIndex: number;
  isMultiStep?: boolean;
}

/**
 * Workflow draft for approval system
 */
export interface WorkflowDraft extends ActionPlan {
  userId: string; // WebSocket identifier
  phoneNumber: string;
  entities: Entity[];

  // Override steps to use ApprovalStep
  steps: ApprovalStep[];

  // Approval-specific state
  approvalStatus: ApprovalState;
  estimatedDuration: string;

  // Timestamps
  createdAt: number;
  lastInteraction: number;

  // Context for execution
  executionContext: ExecutionContext;
}

/**
 * Enhanced workflow draft with Phase 2 production hardening features
 */
export interface EnhancedWorkflowDraft extends WorkflowDraft {
  // Phase 2: Production hardening fields
  timeoutConfig: ApprovalTimeout;
  errorRecovery: {
    retryCount: number;
    lastErrorAt?: number;
    lastError?: string;
    recoveryAttempts: string[]; // Log of recovery attempts
  };
  performance: {
    complexity: number; // Workflow complexity score
    estimatedMemoryUsage: number; // Estimated memory usage in bytes
    priority: "low" | "normal" | "high"; // Execution priority
  };
  reconnectionState?: {
    disconnectedAt: number;
    lastSyncedStep: string;
    pendingApprovals: string[]; // Steps waiting for approval during disconnection
  };
}

import { CachedEntity } from "./entity.types";
import { BrainMemoryContext } from "./brain-memory-schemas";

// Re-export for consistency across the application
export { BrainMemoryContext } from "./brain-memory-schemas";

/**
 * Execution context (enhanced with brain memory support and RDF insights)
 */
export interface ExecutionContext {
  entityId: string;
  phoneNumber: string;
  userUUID?: string; // User UUID for OAuth and contact operations
  userTimezone: string;
  localDatetime?: string;
  stepResults: Map<string, StepResult>;
  currentStepIndex: number;
  entities: CachedEntity[];
  sessionId: string;
  planState: PlanState;
  context?: ExecutionContextType; // Use enum instead of string literals
  
  // NEW: Brain-like memory context (uses existing schema)
  brainMemoryContext?: BrainMemoryContext;
  // NEW: Communication channel awareness
  communicationChannel?: 'sms' | 'chat' | 'websocket';
  // Simplified chat context (maps to existing ChatMessage properties)
  chatMetadata?: {
    chatId: string;
    isGroupChat?: boolean;
    participants?: string[];
  };
  
  // NEW: RDF enhancement fields
  rdfInsights?: any; // RDF structured data from semantic analysis
  rdfSuccess?: boolean; // Whether RDF analysis was successful
  enhancedIntent?: {
    primary_intent: string;
    confidence: number;
    urgency_level: string;
  };
}

/**
 * Step result with enhanced support for rich response data
 */
export interface StepResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  stepId: string;
  description: string;
  state: StepState;
  timestamp: number;
  // OAuth fields for auth requirements
  authRequired?: boolean;
  authUrl?: string | null;
  
  // NEW: Rich response data support
  category?: ResponseCategory;
  structuredData?: any; // Rich structured data (EmailListData, etc.)
  uiData?: {
    title?: string;
    subtitle?: string;
    content?: string;
    icon?: string;
    actions?: Array<{
      id: string;
      label: string;
      type: string;
      icon?: string;
      command?: string;
    }>;
    metadata?: Record<string, any>;
  };
  unifiedResponse?: any; // Full UnifiedToolResponse when available
}

/**
 * Plan execution result
 */
export interface PlanExecutionResult {
  success: boolean;
  message: string;
  error?: string;
  executedSteps: number;
  stepResults: StepResult[];
  finalState: PlanState;
  // OAuth fields for auth requirements
  authRequired?: boolean;
  authUrl?: string | null;
  // NEW: Rich response data when available
  unifiedResponse?: any; // UnifiedToolResponse when step contains rich data
}

/**
 * Calendar-specific action types
 */
export enum CalendarActionType {
  LIST_EVENTS = "list_events",
  CREATE_EVENT = "create_event",
  UPDATE_EVENT = "update_event",
  DELETE_EVENT = "delete_event",
  FIND_EVENT = "find_event",
  FIND_FREE_SLOTS = "find_free_slots",
  SYNC_EVENTS = "sync_events",
  LIST_CALENDARS = "list_calendars",
  GET_CURRENT_DATE_TIME = "get_current_date_time",
  GENERAL = "general",
}

/**
 * Task-specific action types
 */
export enum TaskActionType {
  LIST_TASKS = "list_tasks",
  CREATE_TASK = "create_task",
  UPDATE_TASK = "update_task",
  COMPLETE_TASK = "complete_task",
}

/**
 * Contact-specific action types
 */
export enum ContactActionType {
  SEARCH_CONTACTS = "search_contacts",
  GET_ALL_CONTACTS = "get_all_contacts",
  CREATE_CONTACT = "create_contact",
}

/**
 * Analysis-specific action types
 */
export enum AnalysisActionType {
  FIND_FREE_TIME = "find_free_time",
  SUGGEST_TIMES = "suggest_times",
  CHECK_CONFLICTS = "check_conflicts",
}

/**
 * Email-specific action types
 */
export enum EmailActionType {
  SEND_EMAIL = "send_email",
  CREATE_DRAFT = "create_draft",
  FETCH_EMAILS = "fetch_emails",
  ADD_LABEL = "add_label",
  CREATE_LABEL = "create_label",
  DELETE_DRAFT = "delete_draft",
  DELETE_MESSAGE = "delete_message",
  FETCH_MESSAGE_BY_ID = "fetch_message_by_id",
  FETCH_MESSAGE_BY_THREAD_ID = "fetch_message_by_thread_id",
  GET_ATTACHMENT = "get_attachment",
  LIST_DRAFTS = "list_drafts",
  LIST_LABELS = "list_labels",
  LIST_THREADS = "list_threads",
  MODIFY_THREAD_LABELS = "modify_thread_labels",
  MOVE_TO_TRASH = "move_to_trash",
  REMOVE_LABEL = "remove_label",
  REPLY_TO_THREAD = "reply_to_thread",
  GET_PROFILE = "get_profile",
}

/**
 * System-specific action types
 */
export enum SystemActionType {
  USER_INTERVENTION = "user_intervention",
}

/**
 * User intervention parameters
 */
export interface UserInterventionParams {
  reason: string;
  entityToResolve?: Entity;
  timeout?: number; // Default 300 seconds
  state: StepState;
  resolvedValue?: string;
  timestamp: number;
}

// Workflow State Management Types
export interface WorkflowState {
  sessionId: string;
  phoneNumber: string;
  plan: ActionPlan;
  executionContext: ExecutionContext;
  status: "running" | "waiting_intervention" | "completed" | "failed";
  currentStepIndex: number;
  stepResults: StepResult[];
  createdAt: number;
  updatedAt: number;
  interventionState?: {
    stepId: string;
    reason: string;
    entity?: Entity;
    waitingSince: number;
  };
}

export interface WorkflowExecutionResult {
  status: "completed" | "failed" | "intervention_needed";
  message: string;
  sessionId: string;
  continueExecution?: boolean;
  error?: string;
}

export interface InterventionResponse {
  sessionId: string;
  entity?: Entity;
  resolvedValue: string;
}

export interface InterventionMatch {
  sessionId: string;
  confidence: number;
}

export interface ConversationContext {
  phoneNumber: string;
  activeWorkflows: WorkflowState[];
  lastMessageTime: number;
  conversationThread: string[]; // Recent messages for context
}

// Update SMSResponse type for consistency
export interface SMSResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Phase 2: Production hardening types

/**
 * Timeout configuration for approval workflows
 */
export interface ApprovalTimeout {
  draftTimeoutMs: number; // How long to wait for initial approval
  stepTimeoutMs: number; // How long to wait for individual step approval
  totalWorkflowTimeoutMs: number; // Maximum workflow lifetime
  reminderIntervals: number[]; // When to send reminder notifications
  defaultAction: "auto_approve" | "auto_reject" | "save_draft"; // What to do on timeout
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  maxRetries: number; // Maximum retry attempts
  retryDelayMs: number; // Delay between retries
  exponentialBackoff: boolean; // Use exponential backoff
  fallbackToDirectExecution: boolean; // Fall back to direct execution on failure
  persistFailedWorkflows: boolean; // Keep failed workflows for debugging
}

/**
 * Performance limits and optimization settings
 */
export interface PerformanceLimits {
  maxStepsPerWorkflow: number; // Maximum steps allowed in a workflow
  maxConcurrentWorkflowsPerUser: number; // Concurrent workflow limit
  maxDependencyDepth: number; // Prevent deep dependency chains
  messagePayloadSizeLimit: number; // WebSocket message size limit (bytes)
  redisKeyExpirationMs: number; // Redis key TTL optimization
}
