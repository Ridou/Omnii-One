/**
 * A simplified MCP server for Neo4j service operations
 *
 * This is a temporary implementation to avoid dependency issues with the MCP SDK.
 * It provides the same functionality but doesn't use the actual MCP libraries.
 */
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { neo4jService } from "./neo4j-service";
import * as dotenv from "dotenv";
import type { Request, Response } from "express";
import { z } from "zod";

dotenv.config();

// Create MCP server
const server = new McpServer({
  name: "neo4j-context-server",
  version: "1.0.0",
});

// Define Zod schemas for parameter validation
const ListNodesSchema = {
  userId: z.string(),
  nodeType: z.string().optional(),
  limit: z.number().optional(),
  filter: z.string().optional(),
};

const ContextForNodeSchema = {
  userId: z.string(),
  nodeId: z.string(),
};

const SearchNodesSchema = {
  userId: z.string(),
  text: z.string(),
  nodeType: z.string().optional(),
  limit: z.number().optional(),
};

const GetContextSchema = {
  userId: z.string(),
  query: z.string(),
  limit: z.number().optional(),
};

// Define tool annotations
const readOnlyToolAnnotations = {
  title: "Knowledge Graph Query Tool",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const searchToolAnnotations = {
  title: "Knowledge Graph Search Tool",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const contextToolAnnotations = {
  title: "Knowledge Context Tool",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

// TypeScript interfaces for use in the implementation
interface ListNodesParams {
  userId: string;
  nodeType?: string;
  limit?: number;
  filter?: string;
}

interface ContextForNodeParams {
  userId: string;
  nodeId: string;
}

interface SearchNodesParams {
  userId: string;
  text: string;
  nodeType?: string;
  limit?: number;
}

interface GetContextParams {
  userId: string;
  query: string;
  limit?: number;
}

// Register tool handlers using tool() method
// Original tools for backward compatibility
server.tool(
  "listConcepts",
  "Lists nodes of a specific type from the knowledge graph",
  ListNodesSchema,
  async (params: ListNodesParams) => {
    const { userId, limit = 100, filter } = params;
    // Use the new listNodes method but filter for Concept type only
    const nodes = await neo4jService.listNodes(
      userId,
      "Concept",
      limit,
      filter
    );
    return { content: [{ type: "text", text: JSON.stringify(nodes) }] };
  }
);

server.tool(
  "getContextForNode",
  "Retrieves context information for a specific node by ID",
  ContextForNodeSchema,
  async (params: ContextForNodeParams) => {
    const { userId, nodeId } = params;
    const context = await neo4jService.getContextForNode(userId, nodeId);
    return { content: [{ type: "text", text: JSON.stringify(context) }] };
  }
);

server.tool(
  "searchSimilarConcepts",
  "Searches for concept nodes similar to the provided text",
  SearchNodesSchema,
  async (params: SearchNodesParams) => {
    const { userId, text, limit = 5 } = params;
    const concepts = await neo4jService.searchSimilarConcepts(
      userId,
      text,
      limit
    );
    return { content: [{ type: "text", text: JSON.stringify(concepts) }] };
  }
);

server.tool(
  "getConceptsForContext",
  "Retrieves concept nodes relevant to the provided query context",
  GetContextSchema,
  async (params: GetContextParams) => {
    const { userId, query, limit = 3 } = params;
    const context = await neo4jService.getConceptsForContext(
      userId,
      query,
      limit
    );
    return { content: [{ type: "text", text: JSON.stringify(context) }] };
  }
);

// New multi-node tools
server.tool(
  "listNodes",
  "Lists nodes of a specific type from the knowledge graph",
  ListNodesSchema,
  async (params: ListNodesParams) => {
    const { userId, nodeType = "Concept", limit = 100, filter } = params;
    const nodes = await neo4jService.listNodes(userId, nodeType, limit, filter);
    return { content: [{ type: "text", text: JSON.stringify(nodes) }] };
  }
);

server.tool(
  "searchAllNodes",
  "Searches for nodes of any type similar to the provided text",
  SearchNodesSchema,
  async (params: SearchNodesParams) => {
    const { userId, text, limit = 5 } = params;
    const nodes = await neo4jService.searchAllNodeTypes(userId, text, limit);
    return { content: [{ type: "text", text: JSON.stringify(nodes) }] };
  }
);

server.tool(
  "getContextForQuery",
  "Retrieves contextual information relevant to the provided query",
  GetContextSchema,
  async (params: GetContextParams) => {
    const { userId, query, limit = 5 } = params;
    const context = await neo4jService.getContextForQuery(userId, query, limit);
    return { content: [{ type: "text", text: JSON.stringify(context) }] };
  }
);

// Create express middleware handler
const mcpNeo4jServer = {
  server,

  // Handle MCP connection
  handleConnection(req: Request, res: Response) {
    // Check if handleHttpRequest exists
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write("data: Connected to Neo4j MCP Server\n\n");

    // if (typeof server.server?.handleHttpRequest === "function") {
    //   server.server.handleHttpRequest(req, res);
    // } else {
    // // Fallback response if the method doesn't exist

    // }
  },

  // Expose Neo4j service methods directly for testing - updated for new methods
  async listNodes(
    userId: string,
    nodeType = "Concept",
    limit = 100,
    filter?: string
  ) {
    return await neo4jService.listNodes(userId, nodeType, limit, filter);
  },

  async getContextForNode(userId: string, nodeId: string) {
    return await neo4jService.getContextForNode(userId, nodeId);
  },

  async searchAllNodeTypes(userId: string, text: string, limit = 5) {
    return await neo4jService.searchAllNodeTypes(userId, text, limit);
  },

  async getContextForQuery(userId: string, query: string, limit = 5) {
    return await neo4jService.getContextForQuery(userId, query, limit);
  },

  // Legacy methods for backward compatibility
  async listConcepts(userId: string, limit = 100, filter?: string) {
    return await neo4jService.listNodes(userId, "Concept", limit, filter);
  },

  async searchSimilarConcepts(userId: string, text: string, limit = 5) {
    return await neo4jService.searchSimilarConcepts(userId, text, limit);
  },

  async getConceptsForContext(userId: string, query: string, limit = 3) {
    return await neo4jService.getConceptsForContext(userId, query, limit);
  },
};

export { mcpNeo4jServer };
