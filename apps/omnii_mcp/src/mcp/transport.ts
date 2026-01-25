/**
 * MCP HTTP Transport Configuration
 *
 * Creates Elysia route handlers that bridge HTTP requests to the MCP server.
 * Implements Streamable HTTP transport with authentication and rate limiting.
 */

import { Elysia } from 'elysia';
import { createSupabaseClient } from '@omnii/auth';
import { createClientForUser } from '../services/neo4j/http-client';
import { getMCPServer } from './server';
import { SERVER_INFO } from './capabilities';
import { TOOL_DEFINITIONS, getToolHandler } from './tools';
import { mcpRateLimiter } from '../middleware/rate-limit';
import { checkConstraints } from '../graph/schema/constraints';
import { checkVectorIndex } from '../graph/schema/vector-index';

/**
 * JSON-RPC 2.0 request structure
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: string | number | null;
}

/**
 * JSON-RPC 2.0 response structure
 */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id: string | number | null;
}

/**
 * Authenticated user context
 */
interface AuthContext {
  userId: string;
  tenantId: string;
}

/**
 * User schema status for health check
 */
interface UserSchemaStatus {
  userId: string;
  constraintCount: number;
  vectorIndex: {
    name: string;
    state: string;
    populationPercent: number;
    entityCount: number;
    type: string;
  } | null;
}

/**
 * MCP health check response structure
 */
interface MCPHealthResponse {
  status: 'ok';
  initialized: boolean;
  server: string;
  version: string;
  tools: number;
  userSchema?: UserSchemaStatus | { userId: string; error: string };
}

/**
 * Authenticate request using Supabase JWT.
 *
 * @param authHeader - Authorization header value
 * @returns AuthContext with userId and tenantId
 * @throws Error if authentication fails
 */
async function authenticateRequest(authHeader: string | null): Promise<AuthContext> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const supabase = createSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  // tenantId = userId for database-per-user multi-tenancy
  return { userId: user.id, tenantId: user.id };
}

/**
 * Handle MCP protocol methods.
 *
 * @param method - JSON-RPC method name
 * @param params - Method parameters
 * @param auth - Authenticated user context
 * @returns Method result
 */
async function handleMCPMethod(
  method: string,
  params: unknown,
  auth: AuthContext
): Promise<unknown> {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: (params as { protocolVersion?: string })?.protocolVersion || '2025-11-25',
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      };

    case 'notifications/initialized':
      // Notification - no response needed
      return null;

    case 'tools/list':
      return { tools: TOOL_DEFINITIONS };

    case 'tools/call': {
      const { name, arguments: args } = params as { name: string; arguments?: unknown };
      const handler = getToolHandler(name);

      if (!handler) {
        throw { code: -32601, message: `Tool not found: ${name}` };
      }

      // Create user-isolated Neo4j client
      const neo4jClient = await createClientForUser(auth.tenantId);
      return await handler(neo4jClient, args || {}, auth.userId);
    }

    default:
      throw { code: -32601, message: `Method not found: ${method}` };
  }
}

/**
 * Creates Elysia routes for the MCP endpoint.
 *
 * Routes:
 * - GET /mcp/health - Health check with initialization status
 * - POST /mcp/ - Main MCP JSON-RPC handler with auth and rate limiting
 *
 * @returns Elysia app instance with MCP routes
 */
export function createMCPRoutes() {
  const app = new Elysia({ prefix: '/mcp' });

  // Apply rate limiting to all MCP routes
  app.use(mcpRateLimiter);

  // Health check for MCP endpoint (no auth required)
  // Optionally check user schema with ?userId=<uuid>
  app.get('/health', async ({ query }): Promise<MCPHealthResponse> => {
    const { isInitialized } = getMCPServer();
    const baseHealth: MCPHealthResponse = {
      status: 'ok',
      initialized: isInitialized(),
      server: SERVER_INFO.name,
      version: SERVER_INFO.version,
      tools: TOOL_DEFINITIONS.length,
    };

    // If userId provided, check their schema status
    const userId = query.userId as string | undefined;
    if (userId) {
      try {
        const client = await createClientForUser(userId);
        const constraints = await checkConstraints(client);
        const vectorIndex = await checkVectorIndex(client);

        return {
          ...baseHealth,
          userSchema: {
            userId,
            constraintCount: constraints.length,
            vectorIndex,
          },
        };
      } catch (error) {
        return {
          ...baseHealth,
          userSchema: {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }

    return baseHealth;
  });

  // Main MCP message handler with authentication
  app.post('/', async ({ body, headers, set }): Promise<JsonRpcResponse | undefined> => {
    const request = body as JsonRpcRequest;
    const requestId = request?.id ?? null;

    // Validate JSON-RPC 2.0 request structure
    if (!request?.jsonrpc || request.jsonrpc !== '2.0' || !request.method) {
      set.status = 400;
      return {
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' },
        id: requestId,
      };
    }

    // Authenticate request
    let auth: AuthContext;
    try {
      auth = await authenticateRequest(headers.authorization || null);
    } catch (error) {
      set.status = 401;
      return {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Authentication failed',
        },
        id: requestId,
      };
    }

    // Handle MCP method
    try {
      const result = await handleMCPMethod(request.method, request.params, auth);

      // Notifications don't get a response
      if (request.method.startsWith('notifications/')) {
        set.status = 204;
        return undefined;
      }

      return { jsonrpc: '2.0', result, id: requestId };
    } catch (error: unknown) {
      // Handle structured JSON-RPC errors
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error
      ) {
        const rpcError = error as { code: number; message: string };
        return {
          jsonrpc: '2.0',
          error: { code: rpcError.code, message: rpcError.message },
          id: requestId,
        };
      }

      // Handle unexpected errors
      console.error('[MCP] Error:', error);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
        id: requestId,
      };
    }
  });

  return app;
}

/**
 * Type export for the MCP routes
 */
export type MCPRoutes = ReturnType<typeof createMCPRoutes>;
