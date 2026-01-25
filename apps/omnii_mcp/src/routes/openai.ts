/**
 * OpenAI-Compatible HTTP Endpoints
 *
 * Provides HTTP routes for OpenAI function calling integration.
 * This is NOT a full OpenAI API proxy - it provides endpoints for:
 * - Listing available tools (for client configuration)
 * - Executing tool calls (when client receives tool_calls from OpenAI)
 */

import { Elysia, t } from 'elysia';
import { createSupabaseClient } from '@omnii/auth';
import {
  getAllToolsForOpenAI,
  handleOpenAIToolCalls,
  type OpenAIToolCall,
} from '../mcp/adapters/openai';
import { createClientForUser } from '../services/neo4j/http-client';

/**
 * OpenAI routes for function calling integration.
 */
export const openaiRoutes = new Elysia({ prefix: '/api/openai' })
  /**
   * GET /api/openai/tools
   *
   * Returns all available MCP tools in OpenAI function format.
   * Clients can use this to configure their OpenAI API calls.
   */
  .get('/tools', () => {
    const tools = getAllToolsForOpenAI();

    return {
      tools,
      version: '1.0.0',
      count: tools.length,
    };
  })

  /**
   * POST /api/openai/execute-tools
   *
   * Executes OpenAI tool calls and returns results.
   *
   * Expected flow:
   * 1. Client calls OpenAI API with tools
   * 2. OpenAI returns tool_calls in response
   * 3. Client POSTs tool_calls to this endpoint
   * 4. Client sends results back to OpenAI API
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

        // Execute tool calls
        const results = await handleOpenAIToolCalls(body.tool_calls, {
          userId,
          client,
        });

        return {
          results,
          count: results.length,
        };
      } catch (error) {
        console.error('Error executing OpenAI tool calls:', error);
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
            id: t.String(),
            type: t.Literal('function'),
            function: t.Object({
              name: t.String(),
              arguments: t.String(),
            }),
          })
        ),
      }),
    }
  );
