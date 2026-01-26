/**
 * n8n Workflow Client
 *
 * REST API client for n8n workflow management operations.
 * Supports listing workflows, checking execution status, and triggering workflows.
 *
 * Implements:
 * - ORCH-01: n8n client initialization
 * - ORCH-04: Workflow listing
 * - ORCH-05: Workflow execution status
 */

import { n8nAgentConfig } from '../../config/n8n-agent.config';
import { logWorkflowEvent, AuditEventType } from '../audit';
import { backOff } from 'exponential-backoff';

/**
 * n8n workflow representation from REST API.
 */
export interface Workflow {
  /** Unique workflow identifier */
  id: string;
  /** Workflow name */
  name: string;
  /** Whether workflow is active */
  active: boolean;
  /** Workflow nodes (optional, may be stripped in list) */
  nodes?: unknown[];
  /** Workflow connections (optional, may be stripped in list) */
  connections?: Record<string, unknown>;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Associated tags */
  tags?: Array<{ id: string; name: string }>;
}

/**
 * n8n execution status values.
 */
export type ExecutionStatus =
  | 'new'
  | 'running'
  | 'success'
  | 'error'
  | 'waiting'
  | 'canceled';

/**
 * n8n execution record from REST API.
 */
export interface N8nExecution {
  /** Execution identifier */
  id: string;
  /** Workflow ID that was executed */
  workflowId: string;
  /** Whether execution finished */
  finished: boolean;
  /** Execution mode (manual, webhook, trigger, etc.) */
  mode: string;
  /** ISO timestamp of start */
  startedAt: string;
  /** ISO timestamp of stop (if finished) */
  stoppedAt?: string;
  /** Execution status */
  status: ExecutionStatus;
  /** Execution data (if requested) */
  data?: {
    resultData?: {
      runData?: Record<string, unknown>;
      error?: { message: string; stack?: string };
    };
  };
}

/**
 * Result from triggering a workflow.
 */
export interface WorkflowTriggerResult {
  /** Execution ID for tracking */
  executionId?: string;
  /** Response data from webhook */
  data?: unknown;
  /** Whether trigger was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Error response from n8n API.
 */
interface N8nApiError {
  message: string;
  code?: string;
  httpCode?: number;
}

/**
 * n8n Workflow Client
 *
 * Provides methods to interact with n8n REST API for workflow operations.
 * All methods include audit logging and error handling with retry logic.
 */
export class N8nWorkflowClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor() {
    this.baseUrl = n8nAgentConfig.baseUrl;
    this.apiKey = process.env.N8N_API_KEY;
    this.timeout = n8nAgentConfig.timeout;
    this.maxRetries = n8nAgentConfig.retryAttempts;
  }

  /**
   * Create headers for n8n API requests.
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Handle API response and throw appropriate errors.
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      return response.json() as Promise<T>;
    }

    let errorMessage: string;
    let errorBody: N8nApiError | undefined;

    try {
      errorBody = await response.json();
      errorMessage = errorBody?.message || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }

    switch (response.status) {
      case 401:
      case 403:
        throw new Error(
          `Authentication failed: ${errorMessage}. Ensure N8N_API_KEY is configured correctly.`
        );
      case 404:
        throw new Error(`Resource not found: ${errorMessage}`);
      case 429:
        throw new Error(`Rate limited: ${errorMessage}. Request will be retried.`);
      default:
        if (response.status >= 500) {
          throw new Error(`n8n server error (${response.status}): ${errorMessage}`);
        }
        throw new Error(`n8n API error (${response.status}): ${errorMessage}`);
    }
  }

  /**
   * Check if an error is retryable.
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Retry on rate limits and server errors
      if (error.message.includes('Rate limited')) return true;
      if (error.message.includes('server error')) return true;
      if (error.message.includes('ECONNRESET')) return true;
      if (error.message.includes('ETIMEDOUT')) return true;
      if (error.message.includes('fetch failed')) return true;
    }
    return false;
  }

  /**
   * List all workflows from n8n.
   *
   * @param userId - User ID for audit logging
   * @param active - Optional filter for active/inactive workflows
   * @returns Array of workflows
   */
  async listWorkflows(userId: string, active?: boolean): Promise<Workflow[]> {
    const url = new URL(`${this.baseUrl}/api/v1/workflows`);
    if (active !== undefined) {
      url.searchParams.set('active', String(active));
    }

    logWorkflowEvent(
      AuditEventType.WORKFLOW_LIST_REQUESTED,
      userId,
      undefined,
      { activeFilter: active }
    );

    try {
      const response = await backOff(
        () =>
          fetch(url.toString(), {
            method: 'GET',
            headers: this.getHeaders(),
            signal: AbortSignal.timeout(this.timeout),
          }),
        {
          numOfAttempts: this.maxRetries,
          startingDelay: 1000,
          timeMultiple: 2,
          retry: (error) => this.isRetryableError(error),
        }
      );

      const result = await this.handleResponse<{ data: Workflow[] }>(response);
      return result.data || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list workflows: ${message}`);
    }
  }

  /**
   * Get a specific workflow by ID.
   *
   * @param workflowId - Workflow identifier
   * @param userId - User ID for audit logging
   * @returns Workflow details
   */
  async getWorkflow(workflowId: string, userId: string): Promise<Workflow> {
    const url = `${this.baseUrl}/api/v1/workflows/${workflowId}`;

    logWorkflowEvent(
      AuditEventType.WORKFLOW_STATUS_REQUESTED,
      userId,
      workflowId,
      { operation: 'get_workflow' }
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout),
      });

      return await this.handleResponse<Workflow>(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get workflow ${workflowId}: ${message}`);
    }
  }

  /**
   * Get execution status for a workflow execution.
   *
   * @param executionId - Execution identifier
   * @param userId - User ID for audit logging
   * @returns Execution details including status
   */
  async getExecutionStatus(
    executionId: string,
    userId: string
  ): Promise<N8nExecution> {
    const url = `${this.baseUrl}/api/v1/executions/${executionId}`;

    logWorkflowEvent(
      AuditEventType.WORKFLOW_STATUS_REQUESTED,
      userId,
      undefined,
      { executionId, operation: 'get_execution_status' }
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout),
      });

      return await this.handleResponse<N8nExecution>(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get execution status ${executionId}: ${message}`);
    }
  }

  /**
   * Trigger workflow execution via REST API.
   * Note: This requires the workflow to have a manual trigger node.
   *
   * @param workflowId - Workflow identifier
   * @param userId - User ID for audit logging
   * @param data - Optional data to pass to the workflow
   * @returns Trigger result with execution ID
   */
  async triggerWorkflow(
    workflowId: string,
    userId: string,
    data?: Record<string, unknown>
  ): Promise<WorkflowTriggerResult> {
    const url = `${this.baseUrl}/api/v1/workflows/${workflowId}/activate`;

    logWorkflowEvent(
      AuditEventType.WORKFLOW_EXECUTION_TRIGGERED,
      userId,
      workflowId,
      { inputData: data ? Object.keys(data) : [] }
    );

    try {
      // First, ensure workflow is active
      const activateResponse = await backOff(
        () =>
          fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            signal: AbortSignal.timeout(this.timeout),
          }),
        {
          numOfAttempts: this.maxRetries,
          startingDelay: 1000,
          timeMultiple: 2,
          retry: (error) => this.isRetryableError(error),
        }
      );

      if (!activateResponse.ok && activateResponse.status !== 409) {
        // 409 means already active, which is fine
        await this.handleResponse(activateResponse);
      }

      // Execute via webhook if available, otherwise manual execution
      const execUrl = `${this.baseUrl}/api/v1/workflows/${workflowId}/run`;
      const execResponse = await backOff(
        () =>
          fetch(execUrl, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ data }),
            signal: AbortSignal.timeout(this.timeout),
          }),
        {
          numOfAttempts: this.maxRetries,
          startingDelay: 1000,
          timeMultiple: 2,
          retry: (error) => this.isRetryableError(error),
        }
      );

      const result = await this.handleResponse<{
        executionId?: string;
        data?: unknown;
      }>(execResponse);

      logWorkflowEvent(
        AuditEventType.WORKFLOW_EXECUTION_COMPLETED,
        userId,
        workflowId,
        { executionId: result.executionId }
      );

      return {
        executionId: result.executionId,
        data: result.data,
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logWorkflowEvent(
        AuditEventType.WORKFLOW_EXECUTION_FAILED,
        userId,
        workflowId,
        { error: message }
      );

      return {
        success: false,
        error: `Failed to trigger workflow ${workflowId}: ${message}`,
      };
    }
  }

  /**
   * Trigger workflow via webhook URL.
   * This is the preferred method for triggering workflows.
   *
   * @param webhookUrl - Full webhook URL (e.g., https://n8n.example.com/webhook/abc123)
   * @param userId - User ID for audit logging
   * @param data - Data to send to the webhook
   * @returns Trigger result with response data
   */
  async triggerWorkflowByWebhook(
    webhookUrl: string,
    userId: string,
    data?: Record<string, unknown>
  ): Promise<WorkflowTriggerResult> {
    // Extract workflow context from webhook URL for logging
    const webhookPath = new URL(webhookUrl).pathname;

    logWorkflowEvent(
      AuditEventType.WORKFLOW_EXECUTION_TRIGGERED,
      userId,
      undefined,
      { webhookPath, inputDataKeys: data ? Object.keys(data) : [] }
    );

    try {
      const response = await backOff(
        () =>
          fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data || {}),
            signal: AbortSignal.timeout(this.timeout),
          }),
        {
          numOfAttempts: this.maxRetries,
          startingDelay: 1000,
          timeMultiple: 2,
          retry: (error) => this.isRetryableError(error),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook returned ${response.status}: ${errorText}`);
      }

      let responseData: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      logWorkflowEvent(
        AuditEventType.WORKFLOW_EXECUTION_COMPLETED,
        userId,
        undefined,
        { webhookPath, success: true }
      );

      return {
        data: responseData,
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logWorkflowEvent(
        AuditEventType.WORKFLOW_EXECUTION_FAILED,
        userId,
        undefined,
        { webhookPath, error: message }
      );

      return {
        success: false,
        error: `Failed to trigger webhook: ${message}`,
      };
    }
  }

  /**
   * Get recent executions for a workflow.
   *
   * @param workflowId - Workflow identifier
   * @param userId - User ID for audit logging
   * @param limit - Maximum number of executions to return
   * @returns Array of recent executions
   */
  async getWorkflowExecutions(
    workflowId: string,
    userId: string,
    limit: number = 10
  ): Promise<N8nExecution[]> {
    const url = new URL(`${this.baseUrl}/api/v1/executions`);
    url.searchParams.set('workflowId', workflowId);
    url.searchParams.set('limit', String(limit));

    logWorkflowEvent(
      AuditEventType.WORKFLOW_STATUS_REQUESTED,
      userId,
      workflowId,
      { operation: 'list_executions', limit }
    );

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout),
      });

      const result = await this.handleResponse<{ data: N8nExecution[] }>(response);
      return result.data || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get executions for workflow ${workflowId}: ${message}`);
    }
  }
}

/**
 * Singleton instance of n8n workflow client.
 */
export const n8nWorkflowClient = new N8nWorkflowClient();
