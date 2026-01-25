/**
 * MCP HTTP Transport Configuration
 *
 * Creates Elysia route handlers that bridge HTTP requests to the MCP server.
 * Implements Streamable HTTP transport (not deprecated SSE).
 */

import { Elysia } from 'elysia';
import { getMCPServer } from './server';
import { SERVER_INFO } from './capabilities';

/**
 * JSON-RPC error response structure
 */
interface JsonRpcError {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
  };
  id: string | number | null;
}

/**
 * MCP health check response structure
 */
interface MCPHealthResponse {
  status: 'ok';
  initialized: boolean;
  server: string;
  version: string;
}

/**
 * Creates Elysia routes for the MCP endpoint.
 *
 * Routes:
 * - GET /mcp/health - Health check with initialization status
 * - POST /mcp/ - Main MCP message handler (placeholder for Plan 05)
 *
 * @returns Elysia app instance with MCP routes
 */
export function createMCPRoutes() {
  const app = new Elysia({ prefix: '/mcp' });

  // Health check for MCP endpoint
  app.get('/health', (): MCPHealthResponse => {
    const { isInitialized } = getMCPServer();
    return {
      status: 'ok',
      initialized: isInitialized(),
      server: SERVER_INFO.name,
      version: SERVER_INFO.version,
    };
  });

  // Main MCP message handler - placeholder for Plan 05
  // This will be wired to the actual MCP server transport in Plan 05
  app.post('/', async ({ body, set }): Promise<JsonRpcError> => {
    set.status = 501;
    return {
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: 'MCP endpoint not yet wired - see Plan 05',
      },
      id: (body as Record<string, unknown>)?.id as string | number | null ?? null,
    };
  });

  return app;
}

/**
 * Type export for the MCP routes
 */
export type MCPRoutes = ReturnType<typeof createMCPRoutes>;
