import { z } from "zod/v4";
import { protectedProcedure, createTRPCRouter } from "../trpc";
import { TRPCError } from "@trpc/server";

// Input schemas based on the RDF service endpoints
const analyzeMessageSchema = z.object({
  text: z.string().min(1),
  domain: z.string().default('contact_communication'),
  task: z.string().default('message_analysis'),
  extractors: z.array(z.string()).default([
    'contact_names',
    'communication_intent', 
    'context_clues',
    'formality_level',
    'urgency_indicators'
  ])
});

const extractConceptsSchema = z.object({
  text: z.string().min(1)
});

const expandNameSchema = z.object({
  name: z.string().min(1),
  domain: z.string().default('name_linguistics'),
  task: z.string().default('name_variation_generation'),
  variation_types: z.array(z.string()).default([
    'phonetic_variations',
    'nickname_derivations',
    'cultural_variants',
    'orthographic_variations',
    'diminutive_forms',
    'similar_sounding_names'
  ])
});

// Since the tRPC API is deployed, it needs to call the production MCP service
const getRDFBaseUrl = () => {
  // Always use the production MCP service for now
  // In the future, you can add environment-based logic here
  return 'https://omniimcp-production.up.railway.app';
};

export const rdfRouter = createTRPCRouter({
  /**
   * Get RDF service health status
   */
  health: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Use localhost for development
      const baseUrl = 'http://localhost:8000';
      
      const response = await fetch(`${baseUrl}/api/rdf/health`);
      const data = await response.json();
      
      return {
        success: response.ok,
        data,
        message: response.ok ? 'RDF service is healthy' : 'RDF service health check failed'
      };
    } catch (error) {
      console.error('RDF health check error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check RDF service health'
      });
    }
  }),

  /**
   * Analyze message for contact communication
   */
  analyzeMessage: protectedProcedure
    .input(analyzeMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const baseUrl = 'http://localhost:8000';
        
        const response = await fetch(`${baseUrl}/api/rdf/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input)
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: data.error || 'RDF analysis failed'
          });
        }
        
        return {
          success: true,
          data: data.analysis,
          message: 'Message analyzed successfully'
        };
      } catch (error) {
        console.error('RDF message analysis error:', error);
        throw error instanceof TRPCError ? error : new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to analyze message'
        });
      }
    }),

  /**
   * Extract concepts from text
   */
  extractConcepts: protectedProcedure
    .input(extractConceptsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const baseUrl = 'http://localhost:8000';
        
        const response = await fetch(`${baseUrl}/api/rdf/extract-concepts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input)
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: data.error || 'Concept extraction failed'
          });
        }
        
        return {
          success: true,
          data: {
            concepts: data.concepts || [],
            sentiment: data.sentiment || { score: 0, polarity: 'neutral' },
            intent: data.intent || 'unknown',
            text_length: data.text_length
          },
          message: 'Concepts extracted successfully'
        };
      } catch (error) {
        console.error('RDF concept extraction error:', error);
        throw error instanceof TRPCError ? error : new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to extract concepts'
        });
      }
    }),

  /**
   * Expand contact name with variations
   */
  expandContactName: protectedProcedure
    .input(expandNameSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const baseUrl = 'http://localhost:8000';
        
        const response = await fetch(`${baseUrl}/api/rdf/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input)
        });
        
        const data = await response.json();
        
        // Extract variations from the response
        const variations = [];
        
        // Always include the original name
        variations.push(input.name);
        
        // Add phonetic variations if available
        if (data.phonetic_variations?.variations) {
          variations.push(...data.phonetic_variations.variations);
        }
        
        // Add nicknames if available
        if (data.nicknames?.variations) {
          variations.push(...data.nicknames.variations);
        }
        
        // Add cultural variants if available
        if (data.cultural_variants?.variations) {
          variations.push(...data.cultural_variants.variations);
        }
        
        // Remove duplicates
        const uniqueVariations = [...new Set(variations)];
        
        return {
          success: true,
          data: {
            name: input.name,
            variations: uniqueVariations,
            metadata: {
              phonetic_count: data.phonetic_variations?.variations?.length || 0,
              nickname_count: data.nicknames?.variations?.length || 0,
              cultural_count: data.cultural_variants?.variations?.length || 0
            }
          },
          message: 'Name variations generated successfully'
        };
      } catch (error) {
        console.error('RDF name expansion error:', error);
        throw error instanceof TRPCError ? error : new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to expand contact name'
        });
      }
    }),

  /**
   * Get RDF service status
   */
  status: protectedProcedure.query(async ({ ctx }) => {
    try {
      const baseUrl = 'https://omniimcp-production.up.railway.app';
      
      const response = await fetch(`${baseUrl}/api/rdf/status`);
      const data = await response.json();
      
      return {
        success: response.ok,
        data,
        message: 'RDF service status retrieved'
      };
    } catch (error) {
      console.error('RDF status check error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get RDF service status'
      });
    }
  }),
});