/**
 * WebSocket message type definitions with TypeScript enums
 */

export enum WebSocketMessageType {
  COMMAND = "command",
  RESPONSE = "response",
  ERROR = "error",
  NOTIFICATION = "notification",
  PING = "ping",
  PONG = "pong",
  DATA = "data",
  SYSTEM = "system",
  // Approval system message types
  WORKFLOW_DRAFT = "workflow_draft",
  WORKFLOW_APPROVAL = "workflow_approval",
  STEP_EXECUTION = "step_execution",
}

export enum WebSocketResponseStatus {
  SUCCESS = "success",
  ERROR = "error",
}

// More granular command types
export enum CommandType {
  CREATE_EVENT = "create_event",
  UPDATE_EVENT = "update_event",
  LIST_EVENTS = "list_events",
  DELETE_EVENT = "delete_event",
  TEXT_COMMAND = "text_command", // For free-text commands
}

export enum NotificationType {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  SUCCESS = "success",
}

// Import types from action-planning.types.ts
import {
  ActionType,
  StepState,
  StepResult,
  ApprovalState,
  RiskLevel,
} from "./action-planning.types";

// Payload type definitions
export interface BasePayload {
  userId: string; // User identifier (not phone number)
  timestamp?: number; // Optional timestamp
}

export interface CommandPayload extends BasePayload {
  commandType: CommandType;
  message: string; // The actual command text
  entityId?: string; // Optional - not needed for WebSocket (userId is used for everything)
  userTimezone?: string; // User's timezone
  localDatetime?: string; // Optional local datetime
}

export interface NotificationPayload extends BasePayload {
  notificationType: NotificationType;
  title: string;
  message: string;
  data?: any; // Optional additional data
}

export interface PingPayload extends BasePayload {
  sequence?: number; // Optional sequence number for tracking
}

// Approval system payloads
export interface WorkflowDraftPayload {
  originalMessage: string;
  summary: string;
  totalSteps: number;
  estimatedDuration: string;

  steps: {
    id: string;
    order: number;
    description: string;
    type: ActionType;
    action: string;
    riskLevel: RiskLevel;
    estimatedTime: string;
    dependencies: string[];
    expectedOutcome: string;
    state: StepState;
    approvalStatus: ApprovalState;
    params: Record<string, any>;
  }[];

  risks: {
    stepId: string;
    level: RiskLevel;
    description: string;
  }[];
}

export interface WorkflowApprovalPayload {
  action:
    | "approve_all"
    | "approve_step"
    | "reject_step"
    | "modify_step"
    | "cancel_all";
  stepId?: string;
  modifications?: Record<string, any>;
  reason?: string;
}

export interface StepExecutionPayload {
  stepId: string;
  status: StepState;
  progress?: number;
  message: string;
  result?: StepResult;
  nextStepId?: string;
}

// Main message interface with union type for payload
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: CommandPayload | NotificationPayload | PingPayload | any;
  sender?: string;
  timestamp?: number;
}

// Specific message interfaces for approval system
export interface WorkflowDraftMessage {
  type: "WORKFLOW_DRAFT";
  sessionId: string;
  payload: WorkflowDraftPayload;
  timestamp: number;
}

export interface WorkflowApprovalMessage {
  type: "WORKFLOW_APPROVAL";
  sessionId: string;
  payload: WorkflowApprovalPayload;
  timestamp: number;
}

export interface StepExecutionMessage {
  type: "STEP_EXECUTION";
  sessionId: string;
  payload: StepExecutionPayload;
  timestamp: number;
}

// Response interface
export interface WebSocketResponse {
  status: WebSocketResponseStatus;
  data: any;
  timestamp: number;
  requestId?: string; // Optional request ID for correlation
}

// OAuth response interface
export interface OAuthResponse {
  requiresAuth: true;
  authUrl: string | null;
  message: string;
  userId: string;
  action: "oauth_required";
}

// Success response interface
export interface SuccessResponse {
  message: string;
  success: true;
  userId: string;
  processedAt: string;
}

// Error response interface
export interface ErrorResponse {
  error: string;
  message?: string;
  userId?: string;
}
