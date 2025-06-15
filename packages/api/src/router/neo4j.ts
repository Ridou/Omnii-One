import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { protectedProcedure, publicProcedure } from "../trpc";

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
  
  // Check OMNII_TEST_ENV for explicit environment setting
  if (process.env.OMNII_TEST_ENV === 'PROD') {
    return 'https://omniimcp-production.up.railway.app';
  }
  
  // Production detection
  if (process.env.NODE_ENV === 'production' || 
      process.env.RAILWAY_ENVIRONMENT || 
      process.env.VERCEL_ENV) {
    return 'https://omniimcp-production.up.railway.app';
  }
  
  // Default to local development (port 8000 to match your test config)
  return 'http://localhost:8000';
};

// Cache Neo4j availability status
let neo4jAvailabilityCache: { available: boolean; checkedAt: number } | null = null;
const NEO4J_AVAILABILITY_CACHE_TTL = 60000; // 1 minute

// Check if Neo4j is available by checking if MCP service is reachable
const isNeo4jAvailable = async (): Promise<boolean> => {
  // Return cached result if still valid
  if (neo4jAvailabilityCache && 
      Date.now() - neo4jAvailabilityCache.checkedAt < NEO4J_AVAILABILITY_CACHE_TTL) {
    return neo4jAvailabilityCache.available;
  }

  try {
    const baseUrl = getBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const available = response.ok;
    
    // Cache the result
    neo4jAvailabilityCache = { available, checkedAt: Date.now() };
    
    if (!available) {
      console.warn('[Neo4jRouter] MCP service returned non-OK status');
    }
    
    return available;
  } catch (error) {
    // Cache the negative result
    neo4jAvailabilityCache = { available: false, checkedAt: Date.now() };
    console.warn('[Neo4jRouter] MCP service not reachable, Neo4j features will be disabled');
    return false;
  }
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
        // Check if Neo4j is available first
        const available = await isNeo4jAvailable();
        if (!available) {
          return {
            success: true,
            data: [],
            totalCount: 0,
            message: 'Neo4j service is not available',
          };
        }

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

        const data = await response.json() as any;
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
  listNodes: publicProcedure
    .input(ListNodesInputSchema)
    .query(async ({ ctx, input }): Promise<NodeListResponse> => {
      console.log(`[Neo4jRouter] 🚨 DEBUG: listNodes called with ctx:`, {
        hasSession: !!ctx.session,
        hasUser: !!ctx.session?.user,
        userId: ctx.session?.user?.id,
      });
      
      // Use hardcoded user ID for debugging or fallback to session
              const userId = ctx.session?.user?.id;
      console.log(`[Neo4jRouter] Listing ${input.nodeType} nodes for user: ${userId}`);
      
      try {
        // Check if Neo4j is available first
        const available = await isNeo4jAvailable();
        if (!available) {
          return {
            success: true,
            data: [],
            totalCount: 0,
            message: 'Neo4j service is not available',
          };
        }

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

        const data = await response.json() as any;
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
        // Check if Neo4j is available first
        const available = await isNeo4jAvailable();
        if (!available) {
          return {
            success: true,
            data: {
              nodes: [],
              relationships: []
            },
            message: 'Neo4j service is not available',
          };
        }

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