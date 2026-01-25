/**
 * Local LLM HTTP Endpoints
 *
 * Provides HTTP routes for local LLM (Ollama, LM Studio) tool integration.
 * Supports both Ollama and LM Studio formats.
 */

import { Elysia, t } from 'elysia';
import { createSupabaseClient } from '@omnii/auth';
import {
  getAllToolsForOllama,
  getAllToolsForOpenAI,
  handleLocalLLMToolCalls,
  type OllamaToolCall,
} from '../mcp/adapters';
import { createClientForUser } from '../services/neo4j/http-client';
import { TOOL_HANDLERS } from '../mcp/tools';

/**
 * Validate a tool call to detect hallucinations.
 *
 * @param toolCall - Tool call to validate
 * @returns true if tool call is valid
 */
function validateToolCall(toolCall: OllamaToolCall): boolean {
  try {
    // Check if tool name exists in handlers
    if (!TOOL_HANDLERS[toolCall.function.name]) {
      return false;
    }

    // Check if arguments is an object
    if (
      typeof toolCall.function.arguments !== 'object' ||
      toolCall.function.arguments === null
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Local LLM routes for tool calling integration.
 */
export const localLLMRoutes = new Elysia({ prefix: '/local-llm' })
  /**
   * GET /api/local-llm/tools
   *
   * Returns all available MCP tools in requested format (ollama or lmstudio).
   *
   * Query params:
   * - format: 'ollama' | 'lmstudio' (default: 'ollama')
   */
  .get(
    '/tools',
    ({ query }) => {
      const format = query.format || 'ollama';

      if (format === 'lmstudio') {
        // LM Studio uses OpenAI format
        return {
          tools: getAllToolsForOpenAI(),
          format: 'openai',
          note: 'LM Studio uses OpenAI-compatible format',
        };
      }

      return {
        tools: getAllToolsForOllama(),
        format: 'ollama',
      };
    },
    {
      query: t.Object({
        format: t.Optional(
          t.Union([t.Literal('ollama'), t.Literal('lmstudio')])
        ),
      }),
    }
  )

  /**
   * POST /api/local-llm/execute-tools
   *
   * Executes local LLM tool calls and returns results.
   *
   * Expected flow:
   * 1. Client calls local LLM (Ollama/LM Studio) with tools
   * 2. LLM returns tool_calls in response
   * 3. Client POSTs tool_calls to this endpoint
   * 4. Client sends results back to LLM
   *
   * Requires authentication via Bearer token.
   */
  .post(
    '/execute-tools',
    async ({ body, headers, set }) => {
      // Extract auth token
      const authHeader = headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        set.status = 401;
        return {
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        };
      }

      const token = authHeader.substring(7);
      const supabase = createSupabaseClient();

      // Validate token and get user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        set.status = 401;
        return {
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        };
      }

      const userId = user.id;

      try {
        // Create Neo4j client for user
        const client = await createClientForUser(userId);

        // Validate tool calls first (catch hallucinations)
        const validCalls = body.tool_calls.filter(validateToolCall);
        const invalidCalls = body.tool_calls.filter(
          (tc) => !validateToolCall(tc)
        );

        // Execute valid tool calls
        const results = await handleLocalLLMToolCalls(validCalls, {
          userId,
          client,
        });

        // Return results with hallucination warnings
        return {
          results,
          invalidCalls:
            invalidCalls.length > 0
              ? {
                  count: invalidCalls.length,
                  names: invalidCalls.map((tc) => tc.function.name),
                  message:
                    'Some tool calls were invalid (unknown tool name or malformed arguments)',
                }
              : undefined,
        };
      } catch (error) {
        console.error('Error executing local LLM tool calls:', error);
        set.status = 500;
        return {
          error: 'Internal Server Error',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    {
      body: t.Object({
        tool_calls: t.Array(
          t.Object({
            function: t.Object({
              name: t.String(),
              arguments: t.Record(t.String(), t.Unknown()),
            }),
          })
        ),
      }),
    }
  )

  /**
   * GET /api/local-llm/health
   *
   * Health check endpoint for local LLM bridge.
   *
   * Returns supported formats and recommended models.
   */
  .get('/health', () => ({
    status: 'ok',
    supportedFormats: ['ollama', 'lmstudio'],
    toolCount: getAllToolsForOllama().length,
    note: 'For best results, use tool-calling-capable models: Llama 3.1+, Codestral, Qwen, Command R',
    recommendedModels: [
      {
        name: 'llama3.1:70b',
        provider: 'Ollama',
        notes: 'Best accuracy for tool calling',
      },
      {
        name: 'qwen2.5:32b',
        provider: 'Ollama',
        notes: 'Good balance of speed and accuracy',
      },
      {
        name: 'codestral',
        provider: 'Ollama',
        notes: 'Strong tool calling support',
      },
      {
        name: 'command-r',
        provider: 'Ollama/LM Studio',
        notes: 'Enterprise-grade tool calling',
      },
    ],
  }));
