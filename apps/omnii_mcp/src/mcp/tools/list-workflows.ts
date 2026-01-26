/**
 * MCP Tool: omnii_list_workflows
 *
 * Lists available n8n workflows that can be executed via MCP.
 * Supports filtering by active/inactive status.
 *
 * Implements:
 * - ORCH-03: AI-triggered automations via MCP tools
 * - ORCH-05: Workflow status visibility
 */

import { z } from 'zod';
import { n8nWorkflowClient, type Workflow } from '../../services/integrations/n8n-workflow-client';
import { logAuditEvent, AuditEventType } from '../../services/audit';
import type { MCPToolResponse } from './search-nodes';

/**
 * Zod schema for list_workflows input validation.
 */
export const ListWorkflowsInputSchema = z.object({
  active_only: z
    .boolean()
    .optional()
    .describe('If true, only return active workflows. If false, return all workflows.'),
});

/**
 * MCP tool definition for tools/list response.
 */
export const listWorkflowsToolDefinition = {
  name: 'omnii_list_workflows',
  description:
    'List available n8n workflows that can be executed. ' +
    'Returns workflow names, IDs, and activation status. ' +
    'Use this to discover which workflows are available before triggering execution.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      active_only: {
        type: 'boolean',
        description: 'If true, only return active workflows (default: false)',
      },
    },
    required: [],
  },
};

/**
 * Handle list_workflows tool invocation.
 *
 * @param _client - Neo4j HTTP client (unused, required for handler signature)
 * @param input - Raw input from MCP tool call
 * @param userId - User ID for audit logging
 * @returns MCP-compliant response with workflow list
 */
export async function handleListWorkflows(
  _client: unknown,
  input: unknown,
  userId?: string
): Promise<MCPToolResponse> {
  const effectiveUserId = userId || 'unknown';

  try {
    // Validate input with Zod schema
    const parsed = ListWorkflowsInputSchema.parse(input);

    // Log audit event for tool invocation
    logAuditEvent({
      event: AuditEventType.MCP_TOOL_INVOKED,
      userId: effectiveUserId,
      actor: 'ai_assistant',
      action: 'list',
      resource: { type: 'workflow', name: 'omnii_list_workflows' },
      severity: 'info',
      metadata: {
        activeOnly: parsed.active_only,
      },
    });

    // Fetch workflows from n8n
    const workflows = await n8nWorkflowClient.listWorkflows(
      effectiveUserId,
      parsed.active_only
    );

    // Format response with essential workflow info
    const formattedWorkflows = workflows.map((wf: Workflow) => ({
      id: wf.id,
      name: wf.name,
      active: wf.active,
      tags: wf.tags?.map((t) => t.name) || [],
      updatedAt: wf.updatedAt,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              totalCount: formattedWorkflows.length,
              activeOnly: parsed.active_only || false,
              workflows: formattedWorkflows,
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
      event: AuditEventType.WORKFLOW_LIST_REQUESTED,
      userId: effectiveUserId,
      actor: 'ai_assistant',
      action: 'list',
      resource: { type: 'workflow', name: 'omnii_list_workflows' },
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
