/**
 * MCP API Client
 *
 * Provides typed API client for calling MCP backend endpoints.
 * Uses Supabase session token for authentication.
 */

import { supabase } from '../supabase';
import { getMcpBaseUrl } from '../env';

// MCP tool response type (from backend)
interface McpToolResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// JSON-RPC response wrapper
interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

// Tool call parameters type
type ToolParams = Record<string, unknown>;

/**
 * Get the current auth token for API calls.
 * @throws Error if not authenticated
 */
const getAuthToken = async (): Promise<string> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return session.access_token;
};

/**
 * Base fetch function with auth and error handling.
 * @param endpoint - API endpoint (e.g., '/mcp/health')
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
const apiFetch = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = await getAuthToken();
  const baseUrl = getMcpBaseUrl().replace(/\/$/, '');

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  return response.json();
};

/**
 * Call an MCP tool via the backend HTTP endpoint.
 *
 * @param toolName - Name of the MCP tool (e.g., 'omnii_calendar_query')
 * @param params - Tool parameters
 * @returns Parsed tool response with data or error
 */
export const callMcpTool = async <T = unknown>(
  toolName: string,
  params: ToolParams
): Promise<{ data: T | null; error: string | null }> => {
  try {
    // Use the JSON-RPC style endpoint
    const response = await apiFetch<JsonRpcResponse<McpToolResponse>>('/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params,
        },
      }),
    });

    // Handle JSON-RPC error
    if (response.error) {
      return {
        data: null,
        error: response.error.message,
      };
    }

    const result = response.result;
    if (!result) {
      return {
        data: null,
        error: 'No result in response',
      };
    }

    // Extract text content from MCP response
    const textContent = result.content.find((c) => c.type === 'text');

    if (result.isError || !textContent) {
      return {
        data: null,
        error: textContent?.text || 'Tool execution failed',
      };
    }

    // Parse JSON from text content
    try {
      const data = JSON.parse(textContent.text) as T;
      return { data, error: null };
    } catch {
      // Return raw text if not JSON
      return { data: textContent.text as unknown as T, error: null };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[MCP] Tool call failed (${toolName}):`, error);
    return { data: null, error: message };
  }
};

/**
 * List available MCP tools.
 * @returns Object containing array of tool definitions
 */
export const listMcpTools = async (): Promise<{
  tools: Array<{ name: string; description: string; inputSchema?: unknown }>;
}> => {
  const response = await apiFetch<
    JsonRpcResponse<{ tools: Array<{ name: string; description: string; inputSchema?: unknown }> }>
  >('/mcp', {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
    }),
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return { tools: response.result?.tools || [] };
};

/**
 * Check MCP backend health.
 * @returns Health status including tools count
 */
export const checkMcpHealth = async (): Promise<{
  status: string;
  tools: number;
}> => {
  return apiFetch('/mcp/health');
};

/**
 * Trigger PowerSync data population from Neo4j.
 * Syncs graph data from Neo4j to Supabase sync tables.
 * @returns Sync result with counts
 */
export const populateSyncData = async (): Promise<{
  success: boolean;
  synced: { entities: number; events: number; relationships: number };
}> => {
  return apiFetch('/api/powersync/populate', { method: 'POST' });
};

// ============================================================================
// Typed Tool Wrappers
// ============================================================================

// Calendar event result types
interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  description?: string;
  attendees?: Array<{ name?: string; email?: string }>;
  [key: string]: unknown;
}

// Contact result types
interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  [key: string]: unknown;
}

// Task result types
interface Task {
  id: string;
  title: string;
  status?: string;
  due_date?: string;
  priority?: string;
  [key: string]: unknown;
}

// Search result types
interface SearchResult {
  id: string;
  label: string;
  name?: string;
  title?: string;
  score?: number;
  [key: string]: unknown;
}

// Entity result types
interface Entity {
  id: string;
  label: string;
  name?: string;
  entity_type?: string;
  [key: string]: unknown;
}

// Context result types
interface EntityContext {
  entity: Entity;
  relationships: Array<{
    type: string;
    direction: 'incoming' | 'outgoing';
    node: Entity;
  }>;
}

/**
 * Typed MCP tool wrappers for convenience.
 * Each function provides typed parameters and return values.
 */
export const mcpTools = {
  /**
   * Query calendar events with optional time range and semantic search.
   */
  calendarQuery: (params: { query?: string; time_range?: string; include_context?: boolean }) =>
    callMcpTool<{ events: CalendarEvent[]; total: number }>('omnii_calendar_query', params),

  /**
   * Look up contact information with optional interaction history.
   */
  contactLookup: (params: { query: string; include_interactions?: boolean }) =>
    callMcpTool<{ contacts: Contact[]; total: number }>('omnii_contact_lookup', params),

  /**
   * Task operations: list, get, create, update, complete.
   */
  taskOperations: (params: {
    operation: 'list' | 'get' | 'create' | 'update' | 'complete';
    task_id?: string;
    filter?: string;
    title?: string;
    due_date?: string;
  }) => callMcpTool<{ tasks: Task[]; total: number; task?: Task }>('omnii_task_operations', params),

  /**
   * Search nodes by semantic query with optional type filtering.
   */
  searchNodes: (params: { query: string; node_types?: string[]; limit?: number }) =>
    callMcpTool<{ results: SearchResult[]; total: number }>('omnii_graph_search_nodes', params),

  /**
   * List entities by type.
   */
  listEntities: (params: { entity_type?: string; limit?: number }) =>
    callMcpTool<{ entities: Entity[]; total: number }>('omnii_graph_list_entities', params),

  /**
   * Get entity context with relationships.
   */
  getContext: (params: { entity_id: string; depth?: number }) =>
    callMcpTool<EntityContext>('omnii_graph_get_context', params),

  /**
   * Extract relationships from text content.
   */
  extractRelationships: (params: { text: string; source_type?: string }) =>
    callMcpTool<{
      entities: Array<{ name: string; type: string }>;
      relationships: Array<{ from: string; to: string; type: string }>;
    }>('omnii_extract_relationships', params),
};

// Re-export types for consumers
export type {
  McpToolResponse,
  CalendarEvent,
  Contact,
  Task,
  SearchResult,
  Entity,
  EntityContext,
};
