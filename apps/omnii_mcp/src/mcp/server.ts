/**
 * MCP Server Core
 *
 * Creates and manages the MCP server instance using @modelcontextprotocol/sdk.
 * Handles initialization state tracking and provides singleton access pattern.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SERVER_INFO, SERVER_CAPABILITIES } from './capabilities';

/**
 * MCP Server wrapper type with initialization state tracking
 */
export interface MCPServerWrapper {
  /** The underlying MCP Server instance */
  server: Server;
  /** Check if server has completed initialization handshake */
  isInitialized: () => boolean;
}

/**
 * Creates a new MCP server instance with proper capability declaration.
 *
 * The server handles the MCP protocol handshake:
 * 1. Client sends 'initialize' request
 * 2. Server responds with capabilities
 * 3. Client sends 'initialized' notification
 * 4. Server is ready for tool calls
 *
 * @returns MCPServerWrapper with server instance and initialization state
 */
export function createMCPServer(): MCPServerWrapper {
  const server = new Server(SERVER_INFO, {
    capabilities: SERVER_CAPABILITIES,
  });

  // Track initialization state
  let isInitialized = false;

  // Handle initialization completion
  server.oninitialized = () => {
    isInitialized = true;
    console.log('[MCP] Server initialized, ready for tool calls');
  };

  // Handle server errors
  server.onerror = (error: Error) => {
    console.error('[MCP] Server error:', error);
  };

  return {
    server,
    isInitialized: () => isInitialized,
  };
}

/**
 * Singleton instance for the MCP server
 */
let _mcpServer: MCPServerWrapper | null = null;

/**
 * Gets the singleton MCP server instance.
 * Creates the server on first call.
 *
 * @returns MCPServerWrapper singleton
 */
export function getMCPServer(): MCPServerWrapper {
  if (!_mcpServer) {
    _mcpServer = createMCPServer();
  }
  return _mcpServer;
}

/**
 * Resets the singleton MCP server instance.
 * Useful for testing or server restart scenarios.
 */
export function resetMCPServer(): void {
  _mcpServer = null;
}
