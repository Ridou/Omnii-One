/**
 * Audit Module
 *
 * Exports audit logging service and event types for GDPR compliance.
 */

// Re-export audit event types
export {
  AuditEventType,
  type AuditEventTypeValue,
  type AuditActor,
  type AuditResource,
  type AuditAction,
  type AuditSeverity,
  type AuditEvent,
} from './audit-events';

// Re-export audit logger and functions
export {
  auditLogger,
  logAuditEvent,
  logWorkflowEvent,
  logWebhookEvent,
  logMcpToolEvent,
  logGraphDataAccess,
  createCorrelatedLogger,
} from './audit-logger';
