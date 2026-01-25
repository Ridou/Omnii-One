/**
 * Local LLM Adapter for MCP Tools
 *
 * Converts MCP tool definitions to Ollama and LM Studio formats
 * and handles tool execution for local LLMs.
 *
 * Key differences from OpenAI:
 * - Ollama: arguments as parsed object, no strict mode
 * - LM Studio: uses OpenAI format (reuses conversion)
 * - Sequential execution recommended for local LLM reliability
 * - Extra validation for tool call hallucinations
 */

import {
  TOOL_DEFINITIONS,
  TOOL_HANDLERS,
  type MCPToolResponse,
} from '../tools';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import {
  convertMCPToolToOpenAI,
  getAllToolsForOpenAI,
  type OpenAITool,
} from './openai';

/**
 * Ollama function tool format (no strict mode).
 */
export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Ollama tool call format (arguments already parsed).
 */
export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>; // Parsed object, not string
  };
}

/**
 * Local LLM tool result format.
 */
export interface LocalLLMToolResult {
  role: 'tool';
  content: string;
}

/**
 * LM Studio uses OpenAI format.
 */
export type LMStudioTool = OpenAITool;

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
 * Convert an MCP tool definition to Ollama format.
 *
 * Similar to OpenAI conversion but without strict mode.
 *
 * @param mcpTool - MCP tool definition from TOOL_DEFINITIONS
 * @returns Ollama function tool
 */
export function convertMCPToolToOllama(mcpTool: MCPToolDefinition): OllamaTool {
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: {
        type: 'object',
        properties: mcpTool.inputSchema.properties,
        required: mcpTool.inputSchema.required,
      },
    },
  };
}

/**
 * Get all MCP tools in Ollama format.
 *
 * @returns Array of Ollama function tools
 */
export function getAllToolsForOllama(): OllamaTool[] {
  return TOOL_DEFINITIONS.map((tool) =>
    convertMCPToolToOllama(tool as MCPToolDefinition)
  );
}

/**
 * Validate a tool call to detect hallucinations.
 *
 * Local LLMs are more prone to hallucinating tool names or
 * providing malformed arguments.
 *
 * @param toolCall - Tool call to validate
 * @returns true if tool call is valid
 */
function validateToolCall(toolCall: OllamaToolCall): boolean {
  try {
    // Check if tool name exists in handlers
    if (!TOOL_HANDLERS[toolCall.function.name]) {
      console.warn(
        `[local-llm] Invalid tool name: ${toolCall.function.name} (hallucination)`
      );
      return false;
    }

    // Check if arguments is an object
    if (
      typeof toolCall.function.arguments !== 'object' ||
      toolCall.function.arguments === null
    ) {
      console.warn(
        `[local-llm] Invalid arguments type for ${toolCall.function.name} (expected object)`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `[local-llm] Error validating tool call:`,
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

/**
 * Handle local LLM tool calls by executing corresponding MCP handlers.
 *
 * Processes tool calls SEQUENTIALLY (not parallel) for local LLM reliability.
 * Local LLMs often struggle with parallel tool execution.
 *
 * @param toolCalls - Array of tool calls from Ollama/LM Studio
 * @param context - Execution context with userId and Neo4j client
 * @returns Array of tool results
 */
export async function handleLocalLLMToolCalls(
  toolCalls: OllamaToolCall[],
  context: { userId: string; client: Neo4jHTTPClient }
): Promise<LocalLLMToolResult[]> {
  const results: LocalLLMToolResult[] = [];

  // Process sequentially for local LLM reliability
  for (const toolCall of toolCalls) {
    try {
      // Validate tool call first
      if (!validateToolCall(toolCall)) {
        results.push({
          role: 'tool',
          content: `Error: Unknown or invalid tool "${toolCall.function.name}". Please use a valid tool from the available list.`,
        });
        continue;
      }

      // Get handler for this tool
      const handler = TOOL_HANDLERS[toolCall.function.name];

      // Execute handler with context
      const mcpResponse: MCPToolResponse = await handler(
        context.client,
        toolCall.function.arguments, // Already parsed object
        context.userId
      );

      // Convert MCP response to local LLM result
      const resultText =
        mcpResponse.content
          .map((item) => (item.type === 'text' ? item.text : ''))
          .join('\n') || 'Success';

      results.push({
        role: 'tool',
        content: resultText,
      });
    } catch (error) {
      // Return error as tool result
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      results.push({
        role: 'tool',
        content: `Error executing ${toolCall.function.name}: ${errorMessage}`,
      });
    }
  }

  return results;
}

/**
 * Local LLM Tool Adapter - Convenience wrapper class.
 *
 * Provides a clean interface for integrating MCP tools with local LLMs.
 */
export class LocalLLMToolAdapter {
  constructor(private context: { userId: string; client: Neo4jHTTPClient }) {}

  /**
   * Get all tools in specified format.
   *
   * @param format - Tool format (ollama or lmstudio)
   * @returns Array of tools in requested format
   */
  getTools(format: 'ollama' | 'lmstudio' = 'ollama'): OllamaTool[] | OpenAITool[] {
    if (format === 'lmstudio') {
      // LM Studio uses OpenAI format
      return getAllToolsForOpenAI();
    }
    return getAllToolsForOllama();
  }

  /**
   * Execute tool calls with optional sequential/parallel control.
   *
   * Default is sequential execution (recommended for local LLMs).
   *
   * @param toolCalls - Array of tool calls
   * @param options - Execution options
   * @returns Array of tool results
   */
  async executeToolCalls(
    toolCalls: OllamaToolCall[],
    options?: { sequential?: boolean }
  ): Promise<LocalLLMToolResult[]> {
    // Default to sequential for local LLM reliability
    const sequential = options?.sequential ?? true;

    if (sequential) {
      return handleLocalLLMToolCalls(toolCalls, this.context);
    }

    // Parallel execution (not recommended for local LLMs)
    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        try {
          if (!validateToolCall(toolCall)) {
            return {
              role: 'tool' as const,
              content: `Error: Unknown or invalid tool "${toolCall.function.name}".`,
            };
          }

          const handler = TOOL_HANDLERS[toolCall.function.name];
          const mcpResponse = await handler(
            this.context.client,
            toolCall.function.arguments,
            this.context.userId
          );

          const resultText =
            mcpResponse.content
              .map((item) => (item.type === 'text' ? item.text : ''))
              .join('\n') || 'Success';

          return {
            role: 'tool' as const,
            content: resultText,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          return {
            role: 'tool' as const,
            content: `Error: ${errorMessage}`,
          };
        }
      })
    );

    return results;
  }
}
