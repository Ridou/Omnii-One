/**
 * MCP Module Index
 *
 * Central exports for the MCP server module.
 * Provides capabilities, server, and transport components.
 */

// Capabilities and protocol constants
export {
  SERVER_INFO,
  SERVER_CAPABILITIES,
  DEFAULT_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  type ServerInfo,
  type ServerCapabilities,
  type ProtocolVersion,
} from './capabilities';

// MCP server instance and factory
export {
  createMCPServer,
  getMCPServer,
  resetMCPServer,
  type MCPServerWrapper,
} from './server';

// HTTP transport routes
export { createMCPRoutes, type MCPRoutes } from './transport';

// MCP tools for graph operations
export * from './tools';
