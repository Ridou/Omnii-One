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
import { createNode, createRelationship } from '../../graph/operations/crud';
import { NodeLabel, type EntityNode, type ContactNode, type EventNode, type ConceptNode } from '../../graph/schema/nodes';
import { RelationshipType } from '../../graph/schema/relationships';
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

/**
 * Allowed relationship types for validation.
 * Prevents injection by whitelisting known relationship types.
 */
const ALLOWED_RELATIONSHIPS = [
  'EMPLOYED_BY',
  'FOUNDED',
  'ATTENDED',
  'REPLIED_TO',
  'MENTIONED_IN',
  'SCHEDULED_FOR',
  'LOCATED_AT',
  'WORKS_WITH',
  'REPORTED_TO',
  'PARTICIPANT_OF',
  'KNOWS',
  'WORKS_AT',
  'CREATED_BY',
  'OCCURRED_AT',
  'ATTENDED_BY',
];

/**
 * Find a matching node in the graph by name.
 *
 * Searches for existing nodes with the same name (case-insensitive) to avoid duplicates.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param userId - User ID for multi-tenant filtering
 * @param entity - Extracted entity to search for
 * @returns Node ID if found, null otherwise
 */
async function findMatchingNode(
  client: Neo4jHTTPClient,
  userId: string,
  entity: ExtractedEntity
): Promise<{ id: string; name: string } | null> {
  const cypher = `
    MATCH (n {user_id: $userId})
    WHERE toLower(n.name) = toLower($name)
    RETURN n.id AS id, n.name AS name
    LIMIT 1
  `;

  const result = await client.query(cypher, {
    userId,
    name: entity.name,
  });

  if (!result.data || !result.data.values || result.data.values.length === 0) {
    return null;
  }

  const idIndex = result.data.fields.indexOf('id');
  const nameIndex = result.data.fields.indexOf('name');

  return {
    id: result.data.values[0][idIndex] as string,
    name: result.data.values[0][nameIndex] as string,
  };
}

/**
 * Map extracted entity type to NodeLabel.
 */
function mapEntityTypeToNodeLabel(type: ExtractedEntity['type']): NodeLabel {
  switch (type) {
    case 'Person':
      return NodeLabel.Contact;
    case 'Organization':
      return NodeLabel.Entity;
    case 'Event':
      return NodeLabel.Event;
    case 'Concept':
      return NodeLabel.Concept;
    case 'Location':
      return NodeLabel.Entity;
    default:
      return NodeLabel.Entity;
  }
}

/**
 * Discover relationships from text and create graph nodes/relationships.
 *
 * This is the main entry point for relationship discovery:
 * 1. Extracts entities and relationships from text using LLM
 * 2. Matches entities to existing nodes or creates new ones
 * 3. Creates relationships between nodes with provenance tracking
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param userId - User ID for multi-tenant filtering
 * @param text - Text to analyze for entities and relationships
 * @param options - Discovery options
 * @returns Result with counts of nodes/relationships created
 */
export async function discoverRelationships(
  client: Neo4jHTTPClient,
  userId: string,
  text: string,
  options?: {
    createMissingNodes?: boolean;  // Default: true
    minConfidence?: number;        // Default: 0.5
    sourceContext?: string;        // e.g., "email:abc123" for provenance
  }
): Promise<RelationshipDiscoveryResult> {
  const createMissingNodes = options?.createMissingNodes ?? true;
  const minConfidence = options?.minConfidence ?? 0.5;
  const sourceContext = options?.sourceContext;

  // Step 1: Extract entities and relationships using LLM
  const extracted = await extractEntities(text);

  // Step 2: Filter entities by confidence threshold
  const filteredEntities = extracted.entities.filter(
    (entity) => entity.confidence >= minConfidence
  );

  // Step 3: Match or create nodes for each entity
  const entityNodeMap = new Map<string, string>(); // entity name -> node ID
  let nodesCreated = 0;
  let nodesLinked = 0;

  for (const entity of filteredEntities) {
    // Try to find matching node first
    const matchingNode = await findMatchingNode(client, userId, entity);

    if (matchingNode) {
      // Matched to existing node
      entityNodeMap.set(entity.name, matchingNode.id);
      nodesLinked++;
    } else if (createMissingNodes) {
      // Create new node
      const nodeLabel = mapEntityTypeToNodeLabel(entity.type);

      // Generate embedding for the entity
      const embeddingText = `${entity.name} ${JSON.stringify(entity.properties)}`;
      const embedding = await generateEmbedding(embeddingText);

      // Create node based on type
      let nodeId: string;

      if (nodeLabel === NodeLabel.Contact) {
        const contactNode = await createNode<ContactNode>(client, NodeLabel.Contact, {
          name: entity.name,
          email: entity.properties.email as string | undefined,
          organization: entity.properties.organization as string | undefined,
          embedding,
          user_id: userId, // Add user_id for multi-tenancy (not in interface but required at runtime)
        } as any);
        nodeId = contactNode.id;
      } else if (nodeLabel === NodeLabel.Event) {
        const eventNode = await createNode<EventNode>(client, NodeLabel.Event, {
          name: entity.name,
          startTime: (entity.properties.startTime as string) || new Date().toISOString(),
          location: entity.properties.location as string | undefined,
          description: entity.properties.description as string | undefined,
          embedding,
          user_id: userId, // Add user_id for multi-tenancy (not in interface but required at runtime)
        } as any);
        nodeId = eventNode.id;
      } else if (nodeLabel === NodeLabel.Concept) {
        const conceptNode = await createNode<ConceptNode>(client, NodeLabel.Concept, {
          name: entity.name,
          description: entity.properties.description as string | undefined,
          category: entity.properties.category as string | undefined,
          embedding,
          user_id: userId, // Add user_id for multi-tenancy (not in interface but required at runtime)
        } as any);
        nodeId = conceptNode.id;
      } else {
        // Entity
        const entityNode = await createNode<EntityNode>(client, NodeLabel.Entity, {
          name: entity.name,
          type: entity.type === 'Organization' ? 'organization' : entity.type === 'Location' ? 'place' : 'thing',
          properties: entity.properties,
          embedding,
          user_id: userId, // Add user_id for multi-tenancy (not in interface but required at runtime)
        } as any);
        nodeId = entityNode.id;
      }

      entityNodeMap.set(entity.name, nodeId);
      nodesCreated++;
    }
  }

  // Step 4: Create relationships between nodes
  let relationshipsCreated = 0;

  for (const rel of extracted.relationships) {
    const fromId = entityNodeMap.get(rel.from);
    const toId = entityNodeMap.get(rel.to);

    if (!fromId || !toId) {
      // Skip relationships where both entities weren't processed
      continue;
    }

    // Validate relationship type against whitelist
    if (!ALLOWED_RELATIONSHIPS.includes(rel.type)) {
      console.warn(`Skipping invalid relationship type: ${rel.type}`);
      continue;
    }

    // Map to RelationshipType if possible, otherwise use as custom type
    let relationshipType: string;
    if (Object.values(RelationshipType).includes(rel.type as RelationshipType)) {
      relationshipType = rel.type;
    } else {
      // Custom relationship type (validated against whitelist above)
      relationshipType = rel.type;
    }

    // Add sourceContext to relationship properties
    const relationshipProps = {
      ...rel.properties,
      sourceContext,
    };

    // Create relationship using dynamic query (validated type)
    const cypher = `
      MATCH (from {id: $fromId})
      MATCH (to {id: $toId})
      MERGE (from)-[r:${relationshipType}]->(to)
      SET r += $props
      RETURN r
    `;

    const result = await client.query(cypher, {
      fromId,
      toId,
      props: {
        ...relationshipProps,
        createdAt: new Date().toISOString(),
      },
    });

    if (result.data?.values?.length) {
      relationshipsCreated++;
    }
  }

  // Step 5: Return result
  return {
    entities: filteredEntities,
    relationships: extracted.relationships,
    nodesCreated,
    nodesLinked,
    relationshipsCreated,
  };
}
