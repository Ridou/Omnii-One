/**
 * Relationship Discovery Module
 *
 * Provides automatic entity extraction and relationship discovery from unstructured text.
 * Uses LLM-based extraction with quality prompts to identify entities and their relationships,
 * then creates or links graph nodes for building the knowledge graph.
 */

import OpenAI from 'openai';
import { env } from '../../config/env';
import type { Neo4jHTTPClient } from '../neo4j/http-client';
import { createNode } from '../../graph/operations/crud';
import { NodeLabel } from '../../graph/schema/nodes';
import { generateEmbedding } from '../../graph/operations/embeddings';

/**
 * OpenAI client for entity extraction.
 */
const openai = new OpenAI({
  apiKey: env.OMNII_OPENAI_API_KEY,
});

/**
 * Model for entity extraction.
 * GPT-4o-mini provides minimum quality for structured extraction.
 */
const EXTRACTION_MODEL = 'gpt-4o-mini';

/**
 * Maximum retries for rate limit errors.
 */
const MAX_RETRIES = 3;

/**
 * Base delay in milliseconds for exponential backoff.
 */
const BASE_DELAY_MS = 1000;

/**
 * Extracted entity from text.
 */
export interface ExtractedEntity {
  name: string;
  type: 'Person' | 'Organization' | 'Event' | 'Concept' | 'Location';
  properties: Record<string, unknown>;
  confidence: number;
}

/**
 * Extracted relationship between entities.
 */
export interface ExtractedRelationship {
  from: string;  // Entity name
  to: string;    // Entity name
  type: string;  // Specific relationship type
  properties: Record<string, unknown>;
}

/**
 * Result of relationship discovery process.
 */
export interface RelationshipDiscoveryResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  nodesCreated: number;
  nodesLinked: number;  // Matched to existing
  relationshipsCreated: number;
}

/**
 * Extraction prompt that enforces quality and specific relationship types.
 */
const EXTRACTION_PROMPT = `Extract entities and relationships from the following text.

RULES:
1. Entity types MUST be one of: Person, Organization, Event, Concept, Location
2. Relationship types MUST be SPECIFIC and MEANINGFUL:
   - Use: EMPLOYED_BY, FOUNDED, ATTENDED, REPLIED_TO, MENTIONED_IN, SCHEDULED_FOR, LOCATED_AT, WORKS_WITH, REPORTED_TO, PARTICIPANT_OF
   - NEVER use: RELATED_TO, ASSOCIATED_WITH, CONNECTED_TO, HAS_RELATIONSHIP (too vague)
3. For people, extract: name, email (if present), role (if mentioned)
4. For organizations, extract: name, type (company, nonprofit, etc.)
5. Confidence should be 0.0-1.0 based on how explicit the mention is

Return JSON in this exact format:
{
  "entities": [
    { "name": "John Smith", "type": "Person", "properties": { "role": "CEO" }, "confidence": 0.9 }
  ],
  "relationships": [
    { "from": "John Smith", "to": "Acme Corp", "type": "EMPLOYED_BY", "properties": { "role": "CEO" } }
  ]
}

Text to analyze:
`;

/**
 * Vague relationship types to filter out.
 */
const VAGUE_RELATIONSHIP_TYPES = [
  'RELATED_TO',
  'ASSOCIATED_WITH',
  'CONNECTED_TO',
  'HAS_RELATIONSHIP',
  'LINKED_TO',
  'HAS_CONNECTION',
];

/**
 * Sleep for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a rate limit error (status 429).
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return error.status === 429;
  }
  return false;
}

/**
 * Extract entities and relationships from text using LLM.
 *
 * Uses GPT-4o-mini with quality prompts to identify entities and their relationships.
 * Filters out vague relationship types to ensure meaningful graph connections.
 *
 * @param text - Text to analyze for entities and relationships
 * @returns Extracted entities and relationships
 * @throws Error if extraction fails after retries
 */
export async function extractEntities(text: string): Promise<{
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot extract entities from empty text');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: EXTRACTION_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert entity extraction system. Extract entities and relationships from text with high precision.',
          },
          {
            role: 'user',
            content: EXTRACTION_PROMPT + text,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistent extraction
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse JSON response
      const parsed = JSON.parse(content) as {
        entities?: ExtractedEntity[];
        relationships?: ExtractedRelationship[];
      };

      const entities = parsed.entities || [];
      const relationships = parsed.relationships || [];

      // Validate entity types
      const validEntityTypes = ['Person', 'Organization', 'Event', 'Concept', 'Location'];
      const validatedEntities = entities.filter((entity) => {
        if (!validEntityTypes.includes(entity.type)) {
          console.warn(`Filtered out entity with invalid type: ${entity.type}`);
          return false;
        }
        return true;
      });

      // Filter out vague relationship types
      const specificRelationships = relationships.filter((rel) => {
        if (VAGUE_RELATIONSHIP_TYPES.includes(rel.type)) {
          console.warn(`Filtered out vague relationship type: ${rel.type}`);
          return false;
        }
        return true;
      });

      return {
        entities: validatedEntities,
        relationships: specificRelationships,
      };
    } catch (error) {
      if (isRateLimitError(error)) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `OpenAI rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(delayMs);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }

      // Non-rate-limit errors are thrown immediately
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract entities: ${message}`);
    }
  }

  // Exhausted retries
  throw new Error(
    `Failed to extract entities after ${MAX_RETRIES} retries: ${lastError?.message || 'Rate limit exceeded'}`
  );
}
