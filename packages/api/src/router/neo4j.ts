import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { protectedProcedure } from "../trpc";

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const SearchNodesInputSchema = z.object({
  query: z.string().min(1, "Query is required"),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

const ListNodesInputSchema = z.object({
  nodeType: z.string().optional().default('Concept'),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  filter: z.string().optional(),
});

const GetNodeContextInputSchema = z.object({
  nodeId: z.string().min(1, "Node ID is required"),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

const Neo4jBaseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const NodeDataSchema = z.object({
  id: z.string(),
  labels: z.array(z.string()),
  properties: z.record(z.string(), z.any()),
});

const NodeListResponseSchema = Neo4jBaseResponseSchema.extend({
  data: z.array(NodeDataSchema).optional(),
  totalCount: z.number().optional(),
});

const NodeContextResponseSchema = Neo4jBaseResponseSchema.extend({
  data: z.object({
    nodes: z.array(NodeDataSchema),
    relationships: z.array(z.object({
      type: z.string(),
      properties: z.record(z.string(), z.any()),
      source: z.string(),
      target: z.string(),
    })),
  }).optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type NodeListResponse = z.infer<typeof NodeListResponseSchema>;
export type NodeContextResponse = z.infer<typeof NodeContextResponseSchema>;

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Environment-aware base URL resolution
const getBaseUrl = (): string => {
  // Check common environment variables
  if (process.env.MCP_SERVICE_URL) {
    return process.env.MCP_SERVICE_URL;
  }
  
  // Production detection
  if (process.env.NODE_ENV === 'production' || 
      process.env.RAILWAY_ENVIRONMENT || 
      process.env.VERCEL_ENV) {
    return 'https://omniimcp-production.up.railway.app';
  }
  
  // Default to local development
  return 'http://localhost:9090';
};

// ============================================================================
// ROUTER DEFINITION
// ============================================================================

export const neo4jRouter = {
  // Search nodes across all types
  searchNodes: protectedProcedure
    .input(SearchNodesInputSchema)
    .query(async ({ ctx, input }): Promise<NodeListResponse> => {
      const userId = ctx.session.user.id;
      console.log(`[Neo4jRouter] Searching nodes for user: ${userId}, query: ${input.query}`);
      
      try {
        const baseUrl = getBaseUrl();
        const url = new URL(`${baseUrl}/api/neo4j/concepts/search`);
        url.searchParams.set('user_id', userId);
        url.searchParams.set('q', input.query);
        url.searchParams.set('limit', input.limit.toString());
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Neo4j service error: ${response.statusText}`);
        }

        const data = await response.json();
        const nodes = data.data || [];
        
        return {
          success: true,
          data: nodes,
          totalCount: nodes.length,
          message: `Found ${nodes.length} nodes`,
        };
      } catch (error) {
        console.error("[Neo4jRouter] Error searching nodes:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to search nodes",
        };
      }
    }),

  // List nodes of a specific type
  listNodes: protectedProcedure
    .input(ListNodesInputSchema)
    .query(async ({ ctx, input }): Promise<NodeListResponse> => {
      const userId = ctx.session.user.id;
      console.log(`[Neo4jRouter] Listing ${input.nodeType} nodes for user: ${userId}`);
      
      try {
        const baseUrl = getBaseUrl();
        const url = new URL(`${baseUrl}/api/neo4j/concepts`);
        url.searchParams.set('user_id', userId);
        url.searchParams.set('limit', input.limit.toString());
        if (input.filter) {
          url.searchParams.set('filter', input.filter);
        }
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Neo4j service error: ${response.statusText}`);
        }

        const data = await response.json();
        const nodes = data.data || [];
        
        return {
          success: true,
          data: nodes,
          totalCount: nodes.length,
          message: `Retrieved ${nodes.length} ${input.nodeType} nodes`,
        };
      } catch (error) {
        console.error("[Neo4jRouter] Error listing nodes:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to list nodes",
        };
      }
    }),

  // Get context for a specific node
  getNodeContext: protectedProcedure
    .input(GetNodeContextInputSchema)
    .query(async ({ ctx, input }): Promise<NodeContextResponse> => {
      const userId = ctx.session.user.id;
      console.log(`[Neo4jRouter] Getting context for node: ${input.nodeId}`);
      
      try {
        const baseUrl = getBaseUrl();
        // Note: This endpoint may need to be implemented in the MCP service
        // For now, returning a mock response
        console.warn('[Neo4jRouter] Node context endpoint not yet implemented in MCP service');
        
        // Mock response for now
        const context = {
          nodes: [{
            id: input.nodeId,
            labels: ['Concept'],
            properties: { id: input.nodeId, user_id: userId }
          }],
          relationships: []
        };
        
        return {
          success: true,
          data: context,
          message: `Retrieved context for node ${input.nodeId}`,
        };
      } catch (error) {
        console.error("[Neo4jRouter] Error getting node context:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to get node context",
        };
      }
    }),
} satisfies TRPCRouterRecord;