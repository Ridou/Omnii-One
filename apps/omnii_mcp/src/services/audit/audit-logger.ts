/**
 * Audit Logger Service
 *
 * Pino-based audit logging with automatic PII redaction for GDPR compliance.
 * All data access events are logged with structured metadata.
 */

import pino from 'pino';
import {
  type AuditEvent,
  type AuditEventTypeValue,
  AuditEventType,
} from './audit-events';

/**
 * PII redaction paths.
 * These fields are automatically censored in log output.
 */
const REDACT_PATHS = [
  // Direct PII fields
  'email',
  'phone',
  'phoneNumber',
  'ssn',
  'password',
  'token',
  'apiKey',
  'secret',
  'creditCard',

  // Nested metadata PII
  'metadata.email',
  'metadata.phone',
  'metadata.phoneNumber',
  'metadata.ssn',
  'metadata.password',
  'metadata.token',
  'metadata.apiKey',

  // Parameter PII (from tool calls)
  'parameters.email',
  'parameters.phone',
  'parameters.phone_number',
  'parameters.address',
  'parameters.ssn',

  // Request header secrets
  'req.headers.authorization',
  'req.headers["x-api-key"]',
  'req.headers.cookie',

  // Response data PII
  'response.email',
  'response.phone',
  'response.token',
];

/**
 * Pino logger instance configured for audit logging.
 */
export const auditLogger = pino({
  name: 'omnii-audit',
  level: process.env.AUDIT_LOG_LEVEL || 'info',
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  base: {
    service: 'omnii-mcp',
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
});

/**
 * Log a structured audit event.
 * Automatically adds timestamp and default actor if not provided.
 */
export function logAuditEvent(event: AuditEvent): void {
  const enrichedEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    actor: event.actor || 'user',
    severity: event.severity || 'info',
  };

  const logLevel = enrichedEvent.severity === 'error' ? 'error' :
                   enrichedEvent.severity === 'warning' ? 'warn' : 'info';

  auditLogger[logLevel](enrichedEvent, `Audit: ${event.event}`);
}

/**
 * Log workflow execution events.
 */
export function logWorkflowEvent(
  event:
    | typeof AuditEventType.WORKFLOW_EXECUTION_TRIGGERED
    | typeof AuditEventType.WORKFLOW_EXECUTION_COMPLETED
    | typeof AuditEventType.WORKFLOW_EXECUTION_FAILED
    | typeof AuditEventType.WORKFLOW_LIST_REQUESTED
    | typeof AuditEventType.WORKFLOW_STATUS_REQUESTED,
  userId: string,
  workflowId?: string,
  metadata?: Record<string, unknown>
): void {
  const severity =
    event === AuditEventType.WORKFLOW_EXECUTION_FAILED ? 'error' : 'info';

  logAuditEvent({
    event,
    userId,
    actor: 'user',
    action:
      event === AuditEventType.WORKFLOW_LIST_REQUESTED
        ? 'list'
        : event === AuditEventType.WORKFLOW_STATUS_REQUESTED
          ? 'read'
          : 'execute',
    resource: workflowId
      ? { type: 'workflow', id: workflowId }
      : { type: 'workflow' },
    severity,
    metadata,
  });
}

/**
 * Log webhook events.
 */
export function logWebhookEvent(
  event:
    | typeof AuditEventType.WEBHOOK_RECEIVED
    | typeof AuditEventType.WEBHOOK_VALIDATION_FAILED,
  source: string,
  success: boolean,
  metadata?: Record<string, unknown>
): void {
  logAuditEvent({
    event,
    userId: 'system',
    actor: 'webhook',
    action: 'execute',
    resource: { type: 'webhook', name: source },
    severity: success ? 'info' : 'warning',
    metadata: { ...metadata, success },
  });
}

/**
 * Log MCP tool invocation events.
 */
export function logMcpToolEvent(
  toolName: string,
  userId: string,
  actor: 'user' | 'ai_assistant',
  metadata?: Record<string, unknown>
): void {
  logAuditEvent({
    event: AuditEventType.MCP_TOOL_INVOKED,
    userId,
    actor,
    action: 'execute',
    resource: { type: 'mcp_tool', name: toolName },
    severity: 'info',
    metadata,
  });
}

/**
 * Log graph data access events.
 */
export function logGraphDataAccess(
  userId: string,
  nodeType: string,
  action: 'read' | 'create' | 'update' | 'delete' | 'list',
  nodeId?: string,
  metadata?: Record<string, unknown>
): void {
  logAuditEvent({
    event: AuditEventType.GRAPH_DATA_ACCESSED,
    userId,
    actor: 'user',
    action,
    resource: { type: nodeType, id: nodeId },
    severity: 'info',
    metadata,
  });
}

/**
 * Create a child logger with correlation ID for request tracing.
 */
export function createCorrelatedLogger(correlationId: string) {
  return auditLogger.child({ correlationId });
}
