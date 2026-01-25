/**
 * MCP Tools Index
 *
 * Aggregates all MCP tool definitions and handlers for the Omnii graph.
 * This module is the entry point for registering tools with the MCP server.
 */

import {
  searchNodesToolDefinition,
  handleSearchNodes,
  SearchNodesInputSchema,
  type MCPToolResponse,
} from './search-nodes';
import {
  getContextToolDefinition,
  handleGetContext,
  GetContextInputSchema,
} from './get-context';
import {
  listEntitiesToolDefinition,
  handleListEntities,
  ListEntitiesInputSchema,
} from './list-entities';
import {
  calendarQueryToolDefinition,
  handleCalendarQuery,
  CalendarQueryInputSchema,
} from './calendar-query';
import {
  contactLookupToolDefinition,
  handleContactLookup,
  ContactLookupInputSchema,
} from './contact-lookup';
import {
  taskOperationsToolDefinition,
  handleTaskOperations,
  TaskOperationsInputSchema,
} from './task-operations';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';

/**
 * All tool definitions for MCP tools/list response.
 */
export const TOOL_DEFINITIONS = [
  searchNodesToolDefinition,
  getContextToolDefinition,
  listEntitiesToolDefinition,
  calendarQueryToolDefinition,
  contactLookupToolDefinition,
  taskOperationsToolDefinition,
] as const;

/**
 * Tool handler function type.
 */
export type ToolHandler = (
  client: Neo4jHTTPClient,
  input: unknown,
  userId?: string
) => Promise<MCPToolResponse>;

/**
 * Map of tool names to their handler functions.
 */
export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  [searchNodesToolDefinition.name]: handleSearchNodes,
  [getContextToolDefinition.name]: handleGetContext,
  [listEntitiesToolDefinition.name]: handleListEntities,
  [calendarQueryToolDefinition.name]: handleCalendarQuery,
  [contactLookupToolDefinition.name]: handleContactLookup,
  [taskOperationsToolDefinition.name]: handleTaskOperations,
};

/**
 * Check if a tool name is valid (has a registered handler).
 *
 * @param name - Tool name to check
 * @returns true if tool exists
 */
export function isValidTool(name: string): boolean {
  return name in TOOL_HANDLERS;
}

/**
 * Get the handler function for a tool by name.
 *
 * @param name - Tool name to look up
 * @returns Handler function or null if not found
 */
export function getToolHandler(name: string): ToolHandler | null {
  return TOOL_HANDLERS[name] ?? null;
}

/**
 * Get all tool names.
 *
 * @returns Array of registered tool names
 */
export function getToolNames(): string[] {
  return TOOL_DEFINITIONS.map((t) => t.name);
}

// Re-export individual tool components for direct access
export {
  // Search nodes
  searchNodesToolDefinition,
  handleSearchNodes,
  SearchNodesInputSchema,
  // Get context
  getContextToolDefinition,
  handleGetContext,
  GetContextInputSchema,
  // List entities
  listEntitiesToolDefinition,
  handleListEntities,
  ListEntitiesInputSchema,
  // Calendar query
  calendarQueryToolDefinition,
  handleCalendarQuery,
  CalendarQueryInputSchema,
  // Contact lookup
  contactLookupToolDefinition,
  handleContactLookup,
  ContactLookupInputSchema,
  // Task operations
  taskOperationsToolDefinition,
  handleTaskOperations,
  TaskOperationsInputSchema,
};

// Re-export types
export type { MCPToolResponse };
