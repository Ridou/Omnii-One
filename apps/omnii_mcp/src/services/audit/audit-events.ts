/**
 * Audit Event Type Definitions
 *
 * Defines structured types for audit logging across the MCP server.
 * Used for GDPR compliance, debugging, and workflow execution tracking.
 */

/**
 * Event categories for audit logging.
 * Covers workflow execution, webhook handling, MCP tool invocations, and data access.
 */
export const AuditEventType = {
  // Workflow execution events
  WORKFLOW_EXECUTION_TRIGGERED: 'workflow_execution_triggered',
  WORKFLOW_EXECUTION_COMPLETED: 'workflow_execution_completed',
  WORKFLOW_EXECUTION_FAILED: 'workflow_execution_failed',
  WORKFLOW_LIST_REQUESTED: 'workflow_list_requested',
  WORKFLOW_STATUS_REQUESTED: 'workflow_status_requested',

  // Webhook events
  WEBHOOK_RECEIVED: 'webhook_received',
  WEBHOOK_VALIDATION_FAILED: 'webhook_validation_failed',

  // MCP events
  MCP_TOOL_INVOKED: 'mcp_tool_invoked',

  // Graph data access events
  GRAPH_DATA_ACCESSED: 'graph_data_accessed',
} as const;

export type AuditEventTypeValue =
  (typeof AuditEventType)[keyof typeof AuditEventType];

/**
 * Actor types representing who initiated the action.
 */
export type AuditActor = 'user' | 'ai_assistant' | 'system' | 'webhook';

/**
 * Resource being accessed or modified.
 */
export interface AuditResource {
  /** Resource type (e.g., 'workflow', 'contact', 'calendar_event') */
  type: string;
  /** Resource identifier */
  id?: string;
  /** Human-readable resource name */
  name?: string;
}

/**
 * Action performed on the resource.
 */
export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'list';

/**
 * Severity level of the audit event.
 */
export type AuditSeverity = 'info' | 'warning' | 'error';

/**
 * Complete audit event record.
 * All fields for structured audit logging.
 */
export interface AuditEvent {
  /** Event type from AuditEventType */
  event: AuditEventTypeValue;

  /** User ID who owns the data/resource */
  userId: string;

  /** Who initiated the action */
  actor?: AuditActor;

  /** Resource being accessed */
  resource?: AuditResource;

  /** Action performed */
  action?: AuditAction;

  /** Event severity */
  severity?: AuditSeverity;

  /** Additional event-specific metadata */
  metadata?: Record<string, unknown>;

  /** Correlation ID for tracing across services */
  correlationId?: string;

  /** ISO timestamp (auto-generated if not provided) */
  timestamp?: string;
}
