/**
 * React Hooks for MCP Tools
 *
 * Provides React hooks that wrap MCP tool calls with loading/error state management.
 * Each hook handles async state, error handling, and provides typed data access.
 */

import { useState, useCallback } from 'react';
import {
  mcpTools,
  callMcpTool,
  checkMcpHealth,
  populateSyncData,
  type CalendarEvent,
  type Contact,
  type Task,
  type SearchResult,
  type EntityContext,
} from '~/lib/api/mcp';

// ============================================================================
// Generic Hook
// ============================================================================

/**
 * Result type for useMcpTool hook
 */
interface UseMcpToolResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  execute: (params?: Record<string, unknown>) => Promise<T | null>;
  reset: () => void;
}

/**
 * Generic hook for calling MCP tools with loading/error state.
 *
 * @param toolName - Name of the MCP tool (e.g., 'omnii_calendar_query')
 * @param defaultParams - Default parameters to merge with execute params
 * @returns Hook result with data, loading state, error, and execute function
 *
 * @example
 * const { data, isLoading, error, execute } = useMcpTool<MyResultType>('omnii_my_tool');
 * // Call with additional params
 * await execute({ query: 'search term' });
 */
export function useMcpTool<T = unknown>(
  toolName: string,
  defaultParams?: Record<string, unknown>
): UseMcpToolResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (params?: Record<string, unknown>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await callMcpTool<T>(toolName, {
          ...defaultParams,
          ...params,
        });

        if (result.error) {
          setError(result.error);
          setData(null);
          return null;
        }

        setData(result.data);
        return result.data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setData(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toolName, defaultParams]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, execute, reset };
}

// ============================================================================
// Typed Domain Hooks
// ============================================================================

/**
 * Hook for querying calendar events via MCP.
 *
 * @returns Hook result with events array, total count, and query function
 *
 * @example
 * const { events, total, isLoading, error, query } = useCalendarQuery();
 * // Query upcoming events
 * await query({ time_range: 'this week' });
 * // Query by search term
 * await query({ query: 'team meeting' });
 */
export function useCalendarQuery() {
  const [data, setData] = useState<{ events: CalendarEvent[]; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(
    async (params: { query?: string; time_range?: string; include_context?: boolean }) => {
      setIsLoading(true);
      setError(null);

      const result = await mcpTools.calendarQuery(params);

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
      }

      setIsLoading(false);
      return result.data;
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    events: data?.events || [],
    total: data?.total || 0,
    isLoading,
    error,
    query,
    reset,
  };
}

/**
 * Hook for looking up contacts via MCP.
 *
 * @returns Hook result with contacts array, total count, and lookup function
 *
 * @example
 * const { contacts, total, isLoading, error, lookup } = useContactLookup();
 * // Find contacts by name or email
 * await lookup('John Smith');
 * // Include interaction history
 * await lookup('jane@example.com', true);
 */
export function useContactLookup() {
  const [data, setData] = useState<{ contacts: Contact[]; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (query: string, includeInteractions?: boolean) => {
    setIsLoading(true);
    setError(null);

    const result = await mcpTools.contactLookup({
      query,
      include_interactions: includeInteractions,
    });

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
    return result.data;
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    contacts: data?.contacts || [],
    total: data?.total || 0,
    isLoading,
    error,
    lookup,
    reset,
  };
}

/**
 * Hook for task operations via MCP.
 *
 * @returns Hook result with tasks array, total count, and operation functions
 *
 * @example
 * const { tasks, total, isLoading, error, listTasks, completeTask } = useTaskOperations();
 * // List all tasks
 * await listTasks();
 * // List filtered tasks
 * await listTasks('pending');
 * // Complete a task
 * await completeTask('task-123');
 */
export function useTaskOperations() {
  const [data, setData] = useState<{ tasks: Task[]; total: number; task?: Task } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listTasks = useCallback(async (filter?: string) => {
    setIsLoading(true);
    setError(null);

    const result = await mcpTools.taskOperations({ operation: 'list', filter });

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
    return result.data;
  }, []);

  const getTask = useCallback(async (taskId: string) => {
    setIsLoading(true);
    setError(null);

    const result = await mcpTools.taskOperations({
      operation: 'get',
      task_id: taskId,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
    return result.data?.task || null;
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    setIsLoading(true);
    setError(null);

    const result = await mcpTools.taskOperations({
      operation: 'complete',
      task_id: taskId,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return false;
    }

    return true;
  }, []);

  const createTask = useCallback(async (title: string, dueDate?: string) => {
    setIsLoading(true);
    setError(null);

    const result = await mcpTools.taskOperations({
      operation: 'create',
      title,
      due_date: dueDate,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return null;
    }

    return result.data?.task || null;
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    tasks: data?.tasks || [],
    total: data?.total || 0,
    task: data?.task,
    isLoading,
    error,
    listTasks,
    getTask,
    completeTask,
    createTask,
    reset,
  };
}

/**
 * Hook for graph search via MCP.
 *
 * @returns Hook result with search results array and search function
 *
 * @example
 * const { results, isLoading, error, search } = useGraphSearch();
 * // Search all nodes
 * await search('machine learning');
 * // Search specific node types
 * await search('project update', ['Event', 'Entity']);
 */
export function useGraphSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, nodeTypes?: string[], limit?: number) => {
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      return [];
    }

    setIsLoading(true);
    setError(null);

    const result = await mcpTools.searchNodes({
      query,
      node_types: nodeTypes,
      limit,
    });

    if (result.error) {
      setError(result.error);
      setResults([]);
      setTotal(0);
    } else {
      setResults(result.data?.results || []);
      setTotal(result.data?.total || 0);
    }

    setIsLoading(false);
    return result.data?.results || [];
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setTotal(0);
    setError(null);
    setIsLoading(false);
  }, []);

  return { results, total, isLoading, error, search, reset };
}

/**
 * Hook for listing entities via MCP.
 *
 * @returns Hook result with entities array and list function
 *
 * @example
 * const { entities, total, isLoading, error, listEntities } = useEntityList();
 * // List all entities
 * await listEntities();
 * // List specific entity type
 * await listEntities('task', 20);
 */
export function useEntityList() {
  const [data, setData] = useState<{ entities: SearchResult[]; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listEntities = useCallback(async (entityType?: string, limit?: number) => {
    setIsLoading(true);
    setError(null);

    const result = await mcpTools.listEntities({
      entity_type: entityType,
      limit,
    });

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
    return result.data;
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    entities: data?.entities || [],
    total: data?.total || 0,
    isLoading,
    error,
    listEntities,
    reset,
  };
}

/**
 * Hook for getting entity context via MCP.
 *
 * @returns Hook result with entity context and getContext function
 *
 * @example
 * const { entity, relationships, isLoading, error, getContext } = useEntityContext();
 * // Get context for an entity
 * await getContext('entity-123');
 * // Get deeper context
 * await getContext('entity-123', 2);
 */
export function useEntityContext() {
  const [data, setData] = useState<EntityContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getContext = useCallback(async (entityId: string, depth?: number) => {
    setIsLoading(true);
    setError(null);

    const result = await mcpTools.getContext({
      entity_id: entityId,
      depth,
    });

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
    return result.data;
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    entity: data?.entity || null,
    relationships: data?.relationships || [],
    isLoading,
    error,
    getContext,
    reset,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for MCP backend health check.
 *
 * @returns Hook result with health status and check function
 *
 * @example
 * const { health, isLoading, error, check } = useMcpHealth();
 * // Check backend health
 * await check();
 * console.log(health?.status, health?.tools);
 */
export function useMcpHealth() {
  const [health, setHealth] = useState<{ status: string; tools: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await checkMcpHealth();
      setHealth(result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Health check failed';
      setError(message);
      setHealth(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setHealth(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { health, isLoading, error, check, reset };
}

/**
 * Hook to trigger sync data population from Neo4j to Supabase.
 *
 * @returns Hook result with sync result and populate function
 *
 * @example
 * const { result, isLoading, error, populate } = useSyncPopulate();
 * // Trigger data population
 * await populate();
 * console.log(result?.synced.entities, result?.synced.events);
 */
export function useSyncPopulate() {
  const [result, setResult] = useState<{
    success: boolean;
    synced: { entities: number; events: number; relationships: number };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const populate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await populateSyncData();
      setResult(data);
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync populate failed';
      setError(message);
      setResult(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { result, isLoading, error, populate, reset };
}
