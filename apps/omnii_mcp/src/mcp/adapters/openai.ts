/**
 * OpenAI Function Calling Adapter
 *
 * Converts MCP tool definitions to OpenAI function calling format
 * and handles execution of OpenAI tool calls.
 */

import { TOOL_DEFINITIONS, TOOL_HANDLERS, type MCPToolResponse } from '../tools';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';

/**
 * OpenAI function tool format (strict mode).
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties: false;
    };
    strict: true;
  };
}

/**
 * OpenAI tool call format (received from OpenAI API).
 */
export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * OpenAI tool result format (sent back to OpenAI API).
 */
export interface OpenAIToolResult {
  tool_call_id: string;
  role: 'tool';
  name: string;
  content: string;
}

/**
 * MCP tool definition shape (from tools/index.ts).
 */
interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Convert an MCP tool definition to OpenAI function format.
 *
 * @param mcpTool - MCP tool definition from TOOL_DEFINITIONS
 * @returns OpenAI function tool with strict mode enabled
 */
export function convertMCPToolToOpenAI(mcpTool: MCPToolDefinition): OpenAITool {
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: {
        type: 'object',
        properties: mcpTool.inputSchema.properties,
        required: mcpTool.inputSchema.required,
        additionalProperties: false, // Required for strict mode
      },
      strict: true, // Enable Structured Outputs
    },
  };
}

/**
 * Get all MCP tools in OpenAI function format.
 *
 * @returns Array of OpenAI function tools
 */
export function getAllToolsForOpenAI(): OpenAITool[] {
  return TOOL_DEFINITIONS.map((tool) =>
    convertMCPToolToOpenAI(tool as MCPToolDefinition)
  );
}

/**
 * Handle OpenAI tool calls by executing corresponding MCP handlers.
 *
 * Executes tool calls in parallel per OpenAI's recommendation.
 *
 * @param toolCalls - Array of tool calls from OpenAI API
 * @param context - Execution context with userId and Neo4j client
 * @returns Array of tool results ready to send back to OpenAI
 */
export async function handleOpenAIToolCalls(
  toolCalls: OpenAIToolCall[],
  context: { userId: string; client: Neo4jHTTPClient }
): Promise<OpenAIToolResult[]> {
  // Execute all tool calls in parallel (per OpenAI recommendation)
  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      try {
        // Parse arguments JSON
        const args = JSON.parse(toolCall.function.arguments);

        // Get handler for this tool
        const handler = TOOL_HANDLERS[toolCall.function.name];
        if (!handler) {
          throw new Error(`Unknown tool: ${toolCall.function.name}`);
        }

        // Execute handler with context
        const mcpResponse: MCPToolResponse = await handler(
          context.client,
          args,
          context.userId
        );

        // Convert MCP response to OpenAI tool result
        // MCP response format: { content: [{ type: 'text', text: string }], isError?: boolean }
        const resultText =
          mcpResponse.content
            .map((item) => (item.type === 'text' ? item.text : ''))
            .join('\n') || 'Success';

        return {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          name: toolCall.function.name,
          content: resultText,
        };
      } catch (error) {
        // Return error as tool result
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        return {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          name: toolCall.function.name,
          content: `Error: ${errorMessage}`,
        };
      }
    })
  );

  return results;
}

/**
 * OpenAI Tool Adapter - Convenience wrapper class.
 *
 * Provides a clean interface for integrating MCP tools with OpenAI.
 */
export class OpenAIToolAdapter {
  constructor(private context: { userId: string; client: Neo4jHTTPClient }) {}

  /**
   * Get all tools in OpenAI format.
   */
  getTools(): OpenAITool[] {
    return getAllToolsForOpenAI();
  }

  /**
   * Execute OpenAI tool calls.
   */
  async executeToolCalls(
    toolCalls: OpenAIToolCall[]
  ): Promise<OpenAIToolResult[]> {
    return handleOpenAIToolCalls(toolCalls, this.context);
  }
}
