/**
 * MCP Tool: omnii_workflow_status
 *
 * Check the status of n8n workflow executions.
 * Supports querying by execution ID or by workflow ID for recent history.
 *
 * Implements:
 * - ORCH-05: Workflow execution status visibility
 */

import { z } from 'zod';
import { n8nWorkflowClient, type N8nExecution } from '../../services/integrations/n8n-workflow-client';
import { getExecutionTracker, type WorkflowExecution } from '../../services/workflows/execution-tracker';
import { logAuditEvent, AuditEventType } from '../../services/audit';
import type { MCPToolResponse } from './search-nodes';

/**
 * Zod schema for workflow_status input validation.
 * Either execution_id OR workflow_id must be provided.
 */
export const WorkflowStatusInputSchema = z
  .object({
    execution_id: z
      .string()
      .optional()
      .describe('Specific execution ID to check status (from execute_workflow response)'),
    workflow_id: z
      .string()
      .optional()
      .describe('Workflow ID to get recent execution history'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe('Maximum number of recent executions to return (when using workflow_id)'),
  })
  .refine((data) => data.execution_id || data.workflow_id, {
    message: 'Either execution_id or workflow_id must be provided',
  });

/**
 * MCP tool definition for tools/list response.
 */
export const workflowStatusToolDefinition = {
  name: 'omnii_workflow_status',
  description:
    'Check the status of n8n workflow executions. ' +
    'Provide execution_id for a specific execution, or workflow_id for recent execution history. ' +
    'Returns execution status, timing, and result/error information.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      execution_id: {
        type: 'string',
        description: 'Specific execution ID to check status',
      },
      workflow_id: {
        type: 'string',
        description: 'Workflow ID for recent execution history',
      },
      limit: {
        type: 'number',
        description: 'Max recent executions to return (default: 10, max: 50)',
      },
    },
    required: [],
  },
};

/**
 * Format an n8n execution for MCP response.
 */
function formatN8nExecution(exec: N8nExecution) {
  return {
    executionId: exec.id,
    workflowId: exec.workflowId,
    status: exec.status,
    finished: exec.finished,
    mode: exec.mode,
    startedAt: exec.startedAt,
    stoppedAt: exec.stoppedAt,
    error: exec.data?.resultData?.error?.message,
  };
}

/**
 * Format a tracked execution for MCP response.
 */
function formatTrackedExecution(exec: WorkflowExecution) {
  return {
    idempotencyKey: exec.id,
    workflowId: exec.workflow_id,
    workflowName: exec.workflow_name,
    status: exec.status,
    actor: exec.actor,
    startedAt: exec.started_at,
    completedAt: exec.completed_at,
    error: exec.error_message,
    parameters: exec.parameters,
  };
}

/**
 * Handle workflow_status tool invocation.
 *
 * Queries both n8n API and local execution tracker for comprehensive status.
 *
 * @param _client - Neo4j HTTP client (unused, required for handler signature)
 * @param input - Raw input from MCP tool call
 * @param userId - User ID for audit logging
 * @returns MCP-compliant response with execution status
 */
export async function handleWorkflowStatus(
  _client: unknown,
  input: unknown,
  userId?: string
): Promise<MCPToolResponse> {
  const effectiveUserId = userId || 'unknown';

  try {
    // Validate input with Zod schema
    const parsed = WorkflowStatusInputSchema.parse(input);

    // Log audit event for tool invocation
    logAuditEvent({
      event: AuditEventType.MCP_TOOL_INVOKED,
      userId: effectiveUserId,
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'workflow_execution', name: 'omnii_workflow_status' },
      severity: 'info',
      metadata: {
        executionId: parsed.execution_id,
        workflowId: parsed.workflow_id,
        limit: parsed.limit,
      },
    });

    // Case 1: Get specific execution by ID
    if (parsed.execution_id) {
      // Check local tracker first (has more context)
      const tracker = getExecutionTracker();
      const trackedExecution = await tracker.getExecution(parsed.execution_id);

      if (trackedExecution) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  source: 'execution_tracker',
                  execution: formatTrackedExecution(trackedExecution),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Fall back to n8n API for executions not in tracker
      try {
        const n8nExecution = await n8nWorkflowClient.getExecutionStatus(
          parsed.execution_id,
          effectiveUserId
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  source: 'n8n_api',
                  execution: formatN8nExecution(n8nExecution),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        // Execution not found in either source
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Execution not found',
                executionId: parsed.execution_id,
              }),
            },
          ],
          isError: true,
        };
      }
    }

    // Case 2: Get recent executions for a workflow
    if (parsed.workflow_id) {
      // Query both sources for comprehensive view
      const tracker = getExecutionTracker();

      const [trackedExecutions, n8nExecutions] = await Promise.all([
        tracker.getExecutionsByWorkflow(
          parsed.workflow_id,
          effectiveUserId,
          parsed.limit
        ),
        n8nWorkflowClient.getWorkflowExecutions(
          parsed.workflow_id,
          effectiveUserId,
          parsed.limit
        ),
      ]);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                workflowId: parsed.workflow_id,
                trackedExecutions: {
                  count: trackedExecutions.length,
                  executions: trackedExecutions.map(formatTrackedExecution),
                },
                n8nExecutions: {
                  count: n8nExecutions.length,
                  executions: n8nExecutions.map(formatN8nExecution),
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Should not reach here due to Zod refinement
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Either execution_id or workflow_id must be provided',
          }),
        },
      ],
      isError: true,
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
      event: AuditEventType.WORKFLOW_STATUS_REQUESTED,
      userId: effectiveUserId,
      actor: 'ai_assistant',
      action: 'read',
      resource: { type: 'workflow_execution', name: 'omnii_workflow_status' },
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
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    };
  }
}
