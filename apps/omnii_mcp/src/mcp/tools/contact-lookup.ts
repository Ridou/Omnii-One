/**
 * MCP Tool: omnii_contact_lookup
 *
 * Looks up contacts by name, email, or description.
 * Uses local search with dual-channel retrieval for contact discovery.
 */

import { z } from 'zod';
import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import { localSearch } from '../../services/graphrag/local-search';
import type { MCPToolResponse } from './search-nodes';

/**
 * Zod schema for contact_lookup input validation.
 */
export const ContactLookupInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(500)
    .describe('Name, email, or description to search for'),
  includeInteractions: z
    .boolean()
    .default(true)
    .describe('Include related events and entities'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe('Maximum contacts to return'),
});

/**
 * MCP tool definition for tools/list response.
 */
export const contactLookupToolDefinition = {
  name: 'omnii_contact_lookup',
  description:
    'Look up contacts by name, email, or description. Returns contact details and ' +
    'optionally related interactions (meetings, emails, events). Uses dual-channel ' +
    'retrieval combining vector similarity with graph traversal.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Name, email, or description to search for',
      },
      includeInteractions: {
        type: 'boolean',
        description: 'Include related events and entities (default: true)',
      },
      limit: {
        type: 'number',
        description: 'Maximum contacts to return (1-50, default: 10)',
      },
    },
    required: ['query'],
  },
};

/**
 * Handle contact_lookup tool invocation.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param userId - User ID for multi-tenant isolation
 * @param input - Raw input from MCP tool call
 * @returns MCP-compliant response with contact details
 */
export async function handleContactLookup(
  client: Neo4jHTTPClient,
  userId: string,
  input: unknown
): Promise<MCPToolResponse> {
  try {
    // Validate input with Zod schema
    const parsed = ContactLookupInputSchema.parse(input);

    // Use local search with Contact filter
    const searchResult = await localSearch(client, parsed.query, userId, {
      nodeTypes: ['Contact'],
      limit: parsed.limit,
      includeContext: parsed.includeInteractions,
      minScore: 0.6, // Lower threshold for contact matching
    });

    // Format response as MCP content
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query: parsed.query,
              resultCount: searchResult.totalResults,
              contacts: searchResult.results.map((r) => {
                const contact = r.entity;
                const interactions = parsed.includeInteractions
                  ? {
                      relatedEvents: r.relatedEntities
                        .filter((e) => e.type === 'Event')
                        .map((e) => ({
                          id: e.id,
                          name: e.name,
                          type: e.type,
                        })),
                      relatedEntities: r.relatedEntities
                        .filter((e) => e.type !== 'Event')
                        .map((e) => ({
                          id: e.id,
                          name: e.name,
                          type: e.type,
                        })),
                      relationships: r.relationships.map((rel) => ({
                        type: rel.type,
                        targetId: rel.targetId,
                        targetName: rel.targetName,
                      })),
                    }
                  : undefined;

                return {
                  id: contact.id,
                  name: contact.name,
                  email: contact.properties.email as string | undefined,
                  phone: contact.properties.phone as string | undefined,
                  organization:
                    (contact.properties.organization as string) || undefined,
                  role: (contact.properties.role as string) || undefined,
                  vectorScore: r.vectorScore.toFixed(3),
                  properties: contact.properties,
                  interactions,
                };
              }),
              searchMetadata: searchResult.searchMetadata,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Invalid input',
              details: error.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            }),
          },
        ],
        isError: true,
      };
    }

    // Handle other errors
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    };
  }
}
