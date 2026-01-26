/**
 * MCP Tool: omnii_execute_workflow
 *
 * Triggers n8n workflow execution with parameters and idempotency support.
 * Prevents duplicate executions via idempotency keys and tracks execution status.
 *
 * Implements:
 * - ORCH-03: AI-triggered automations via MCP tools
 * - ORCH-05: Idempotent workflow execution
 */

import { z } from 'zod';
import { n8nWorkflowClient } from '../../services/integrations/n8n-workflow-client';
import { getExecutionTracker } from '../../services/workflows/execution-tracker';
import { logAuditEvent, AuditEventType } from '../../services/audit';
import type { MCPToolResponse } from './search-nodes';

/**
 * Generate a UUID v4 for idempotency key if not provided.
 */
function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Zod schema for execute_workflow input validation.
 */
export const ExecuteWorkflowInputSchema = z.object({
  workflow_id: z
    .string()
    .min(1)
    .describe('The n8n workflow ID to execute'),
  parameters: z
    .record(z.unknown())
    .optional()
    .describe('Key-value parameters to pass to the workflow'),
  idempotency_key: z
    .string()
    .optional()
    .describe('Unique key to prevent duplicate executions. If not provided, one will be generated.'),
});

/**
 * MCP tool definition for tools/list response.
 */
export const executeWorkflowToolDefinition = {
  name: 'omnii_execute_workflow',
  description:
    'Execute an n8n workflow with parameters. ' +
    'Supports idempotency to prevent duplicate executions. ' +
    'Returns execution ID for status tracking. ' +
    'Use omnii_list_workflows first to discover available workflow IDs.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      workflow_id: {
        type: 'string',
        description: 'The n8n workflow ID to execute',
      },
      parameters: {
        type: 'object',
        additionalProperties: true,
        description: 'Key-value parameters to pass to the workflow',
      },
      idempotency_key: {
        type: 'string',
        description: 'Unique key to prevent duplicate executions (auto-generated if not provided)',
      },
    },
    required: ['workflow_id'],
  },
};

/**
 * Handle execute_workflow tool invocation.
 *
 * Uses ExecutionTracker for exactly-once execution semantics.
 * Returns cached result if same idempotency_key was used before.
 *
 * @param _client - Neo4j HTTP client (unused, required for handler signature)
 * @param input - Raw input from MCP tool call
 * @param userId - User ID for audit logging
 * @returns MCP-compliant response with execution result
 */
export async function handleExecuteWorkflow(
  _client: unknown,
  input: unknown,
  userId?: string
): Promise<MCPToolResponse> {
  const effectiveUserId = userId || 'unknown';

  try {
    // Validate input with Zod schema
    const parsed = ExecuteWorkflowInputSchema.parse(input);

    // Generate idempotency key if not provided
    const idempotencyKey = parsed.idempotency_key || generateIdempotencyKey();

    // Log audit event for tool invocation
    logAuditEvent({
      event: AuditEventType.MCP_TOOL_INVOKED,
      userId: effectiveUserId,
      actor: 'ai_assistant',
      action: 'execute',
      resource: { type: 'workflow', id: parsed.workflow_id, name: 'omnii_execute_workflow' },
      severity: 'info',
      metadata: {
        workflowId: parsed.workflow_id,
        idempotencyKey,
        hasParameters: !!parsed.parameters,
        parameterKeys: parsed.parameters ? Object.keys(parsed.parameters) : [],
      },
    });

    // Get execution tracker for idempotent execution
    const tracker = getExecutionTracker();

    // Execute with exactly-once semantics
    const result = await tracker.executeIdempotent(
      {
        idempotencyKey,
        workflowId: parsed.workflow_id,
        userId: effectiveUserId,
        actor: 'ai_assistant',
        parameters: parsed.parameters as Record<string, unknown> | undefined,
      },
      async () => {
        // Actual workflow execution
        const triggerResult = await n8nWorkflowClient.triggerWorkflow(
          parsed.workflow_id,
          effectiveUserId,
          parsed.parameters as Record<string, unknown> | undefined
        );

        if (!triggerResult.success) {
          throw new Error(triggerResult.error || 'Workflow execution failed');
        }

        return {
          executionId: triggerResult.executionId,
          data: triggerResult.data,
        };
      }
    );

    // Log completion event
    logAuditEvent({
      event: AuditEventType.WORKFLOW_EXECUTION_COMPLETED,
      userId: effectiveUserId,
      actor: 'ai_assistant',
      action: 'execute',
      resource: { type: 'workflow', id: parsed.workflow_id },
      severity: 'info',
      metadata: {
        idempotencyKey,
        cached: result.cached,
        executionId: result.data.executionId,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              workflowId: parsed.workflow_id,
              idempotencyKey,
              executionId: result.data.executionId,
              cached: result.cached,
              data: result.data.data,
              message: result.cached
                ? 'Returned cached result from previous execution'
                : 'Workflow executed successfully',
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Invalid input',
              details: error.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            }),
          },
        ],
        isError: true,
      };
    }

    // Log error audit event
    logAuditEvent({
      event: AuditEventType.WORKFLOW_EXECUTION_FAILED,
      userId: effectiveUserId,
      actor: 'ai_assistant',
      action: 'execute',
      resource: { type: 'workflow', name: 'omnii_execute_workflow' },
      severity: 'error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    };
  }
}
