/**
 * MCP Server Capability Declarations
 *
 * Defines server info, capabilities, and protocol version for MCP protocol compliance.
 * Used during the initialize handshake with MCP clients (Claude Desktop, etc.)
 */

/**
 * Server identification info sent during initialization
 */
export const SERVER_INFO = {
  name: 'omnii-graph-server',
  version: '1.0.0',
  description: 'Personal context graph server for AI assistants',
} as const;

/**
 * Server capabilities declaration
 *
 * Declares what protocol features this server supports:
 * - tools: Supports tool registration and execution
 *
 * Not implementing in Phase 2:
 * - resources: Server-managed resources (files, data)
 * - prompts: Server-defined prompt templates
 */
export const SERVER_CAPABILITIES = {
  tools: {}, // Declare tool support - tools registered separately
  // resources: {},  // Not implementing resources in Phase 2
  // prompts: {},    // Not implementing prompts in Phase 2
} as const;

/**
 * MCP protocol versions supported by this server
 *
 * Using 2025-11-25 as the stable version per research.
 * NOT using 2026-03-26 features yet.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25'] as const;
export const DEFAULT_PROTOCOL_VERSION = '2025-11-25';

/**
 * Type exports for capability structures
 */
export type ServerInfo = typeof SERVER_INFO;
export type ServerCapabilities = typeof SERVER_CAPABILITIES;
export type ProtocolVersion = (typeof SUPPORTED_PROTOCOL_VERSIONS)[number];
