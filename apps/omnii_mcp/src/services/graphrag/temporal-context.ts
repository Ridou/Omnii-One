/**
 * Temporal Context Service
 *
 * Provides time-based query capabilities for the knowledge graph.
 * Enables natural language time queries like "last week" or "this month"
 * to filter graph data by created_at/start_time timestamps.
 *
 * Uses Neo4j's datetime() and duration arithmetic for temporal filtering.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { NodeLabel } from '../../graph/schema/nodes';

/**
 * Mapping of natural language time ranges to ISO 8601 durations.
 * Used by parseTemporalQuery to convert user queries to Neo4j duration syntax.
 */
export const TEMPORAL_DURATIONS: Record<string, string> = {
  'today': 'P0D',
  'yesterday': 'P1D',
  'last week': 'P7D',
  'this week': 'P7D',
  'last month': 'P1M',
  'this month': 'P1M',
  'last year': 'P1Y',
  'this year': 'P1Y',
};

/**
 * Temporal query configuration.
 * Returned by parseTemporalQuery for use in Cypher queries.
 */
export interface TemporalQuery {
  /** ISO 8601 duration string (e.g., "P7D" for 7 days) */
  duration: string;
  /** Start time expression for Cypher (e.g., "datetime() - duration('P7D')") */
  startTime: string;
  /** End time expression for Cypher (always "datetime()" for current time) */
  endTime: string;
}

/**
 * Parse a natural language time range into a temporal query configuration.
 *
 * @param timeRange - Natural language time expression (e.g., "last week")
 * @returns Temporal query configuration with duration and time expressions
 * @throws Error if time range is not recognized
 *
 * @example
 * parseTemporalQuery("last week")
 * // Returns: { duration: "P7D", startTime: "datetime() - duration('P7D')", endTime: "datetime()" }
 */
export function parseTemporalQuery(timeRange: string): TemporalQuery {
  const normalized = timeRange.toLowerCase().trim();
  const duration = TEMPORAL_DURATIONS[normalized];

  if (!duration) {
    const validOptions = Object.keys(TEMPORAL_DURATIONS).join(', ');
    throw new Error(
      `Invalid time range: "${timeRange}". Valid options: ${validOptions}`
    );
  }

  return {
    duration,
    startTime: `datetime() - duration('${duration}')`,
    endTime: 'datetime()',
  };
}

/**
 * Result from a temporal node query.
 */
export interface TemporalNodeResult {
  /** Unique identifier of the node */
  id: string;
  /** Display name of the node */
  name: string;
  /** Node labels (e.g., ['Entity', 'Person']) */
  labels: string[];
  /** When the node was created (ISO 8601) */
  createdAt: string;
  /** Age of the node as ISO 8601 duration string (e.g., "P5D" for 5 days old) */
  age: string;
  /** All properties of the node */
  properties: Record<string, unknown>;
}

/**
 * Options for temporal node queries.
 */
export interface TemporalNodesOptions {
  /** Filter results to specific node types */
  nodeTypes?: NodeLabel[];
  /** Maximum number of results to return (default: 50) */
  limit?: number;
}

/**
 * Query nodes created within a time range.
 *
 * Filters nodes by their created_at timestamp, returning only nodes
 * created within the specified time range. Results include age information
 * showing how long ago each node was created.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param userId - User ID for multi-tenant isolation
 * @param timeRange - Natural language time expression (e.g., "last week")
 * @param options - Query options (nodeTypes, limit)
 * @returns Array of nodes with age information, sorted newest first
 *
 * @example
 * await queryTemporalNodes(client, userId, "last week", { nodeTypes: [NodeLabel.Entity] })
 */
export async function queryTemporalNodes(
  client: Neo4jHTTPClient,
  userId: string,
  timeRange: string,
  options?: TemporalNodesOptions
): Promise<TemporalNodeResult[]> {
  const temporal = parseTemporalQuery(timeRange);
  const limit = options?.limit ?? 50;
  const nodeTypes = options?.nodeTypes;

  // Build Cypher query with temporal filtering
  let cypher: string;

  if (nodeTypes && nodeTypes.length > 0) {
    // Filter by specific node types
    const labelsFilter = nodeTypes.map((t) => `'${t}'`).join(', ');
    cypher = `
      MATCH (n)
      WHERE n.user_id = $userId
        AND ANY(label IN labels(n) WHERE label IN [${labelsFilter}])
        AND n.created_at >= datetime() - duration($duration)
        AND n.created_at <= datetime()
      WITH n,
           duration.between(n.created_at, datetime()) AS ageObj
      RETURN
        n.id AS id,
        n.name AS name,
        labels(n) AS labels,
        n.created_at AS createdAt,
        toString(ageObj) AS age,
        properties(n) AS properties
      ORDER BY n.created_at DESC
      LIMIT $limit
    `;
  } else {
    // Query all node types
    cypher = `
      MATCH (n)
      WHERE n.user_id = $userId
        AND n.created_at >= datetime() - duration($duration)
        AND n.created_at <= datetime()
      WITH n,
           duration.between(n.created_at, datetime()) AS ageObj
      RETURN
        n.id AS id,
        n.name AS name,
        labels(n) AS labels,
        n.created_at AS createdAt,
        toString(ageObj) AS age,
        properties(n) AS properties
      ORDER BY n.created_at DESC
      LIMIT $limit
    `;
  }

  try {
    const result = await client.query(cypher, {
      userId,
      duration: temporal.duration,
      limit,
    });

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return [];
    }

    const fields = result.data.fields;
    const idIndex = fields.indexOf('id');
    const nameIndex = fields.indexOf('name');
    const labelsIndex = fields.indexOf('labels');
    const createdAtIndex = fields.indexOf('createdAt');
    const ageIndex = fields.indexOf('age');
    const propsIndex = fields.indexOf('properties');

    return result.data.values.map((row) => ({
      id: row[idIndex] as string,
      name: row[nameIndex] as string,
      labels: row[labelsIndex] as string[],
      createdAt: row[createdAtIndex] as string,
      age: row[ageIndex] as string,
      properties: row[propsIndex] as Record<string, unknown>,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Temporal nodes query failed: ${message}`);
  }
}

/**
 * Result from a temporal events query.
 */
export interface TemporalEventResult {
  /** Unique identifier of the event */
  id: string;
  /** Display name of the event */
  name: string;
  /** When the event starts (ISO 8601) */
  startTime: string;
  /** When the event ends (ISO 8601), if available */
  endTime?: string;
  /** Location where event occurs */
  location?: string;
  /** Event description */
  description?: string;
  /** Related entities (if includeRelated=true) */
  relatedEntities?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  /** Related contacts (if includeRelated=true) */
  relatedContacts?: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
}

/**
 * Options for temporal event queries.
 */
export interface TemporalEventsOptions {
  /** Filter by event type (if stored in properties) */
  eventType?: string;
  /** Include related Entity and Contact nodes (default: false) */
  includeRelated?: boolean;
}

/**
 * Query events occurring within a time range.
 *
 * Specialized query for Event nodes that filters by start_time.
 * Optionally includes related Entity and Contact nodes to provide
 * full context about who/what is involved in each event.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param userId - User ID for multi-tenant isolation
 * @param timeRange - Natural language time expression (e.g., "last week")
 * @param options - Query options (eventType, includeRelated)
 * @returns Array of events with optional related nodes, sorted by start time
 *
 * @example
 * await queryTemporalEvents(client, userId, "this week", { includeRelated: true })
 */
export async function queryTemporalEvents(
  client: Neo4jHTTPClient,
  userId: string,
  timeRange: string,
  options?: TemporalEventsOptions
): Promise<TemporalEventResult[]> {
  const temporal = parseTemporalQuery(timeRange);
  const includeRelated = options?.includeRelated ?? false;

  // Build Cypher query with optional related nodes
  let cypher: string;

  if (includeRelated) {
    cypher = `
      MATCH (e:Event)
      WHERE e.user_id = $userId
        AND e.start_time >= datetime() - duration($duration)
        AND e.start_time <= datetime()
      OPTIONAL MATCH (e)-[r1]-(entity:Entity)
      WHERE entity.user_id = $userId
      OPTIONAL MATCH (e)-[r2]-(contact:Contact)
      WHERE contact.user_id = $userId
      WITH e,
           collect(DISTINCT {id: entity.id, name: entity.name, type: entity.type}) AS entities,
           collect(DISTINCT {id: contact.id, name: contact.name, email: contact.email}) AS contacts
      RETURN
        e.id AS id,
        e.name AS name,
        e.start_time AS startTime,
        e.end_time AS endTime,
        e.location AS location,
        e.description AS description,
        entities,
        contacts
      ORDER BY e.start_time ASC
    `;
  } else {
    cypher = `
      MATCH (e:Event)
      WHERE e.user_id = $userId
        AND e.start_time >= datetime() - duration($duration)
        AND e.start_time <= datetime()
      RETURN
        e.id AS id,
        e.name AS name,
        e.start_time AS startTime,
        e.end_time AS endTime,
        e.location AS location,
        e.description AS description
      ORDER BY e.start_time ASC
    `;
  }

  try {
    const result = await client.query(cypher, {
      userId,
      duration: temporal.duration,
    });

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return [];
    }

    const fields = result.data.fields;
    const idIndex = fields.indexOf('id');
    const nameIndex = fields.indexOf('name');
    const startTimeIndex = fields.indexOf('startTime');
    const endTimeIndex = fields.indexOf('endTime');
    const locationIndex = fields.indexOf('location');
    const descriptionIndex = fields.indexOf('description');
    const entitiesIndex = includeRelated ? fields.indexOf('entities') : -1;
    const contactsIndex = includeRelated ? fields.indexOf('contacts') : -1;

    return result.data.values.map((row) => {
      const event: TemporalEventResult = {
        id: row[idIndex] as string,
        name: row[nameIndex] as string,
        startTime: row[startTimeIndex] as string,
        endTime: row[endTimeIndex] as string | undefined,
        location: row[locationIndex] as string | undefined,
        description: row[descriptionIndex] as string | undefined,
      };

      if (includeRelated && entitiesIndex >= 0 && contactsIndex >= 0) {
        const entities = row[entitiesIndex] as Array<{ id: string; name: string; type: string }>;
        const contacts = row[contactsIndex] as Array<{ id: string; name: string; email?: string }>;

        // Filter out null entries from OPTIONAL MATCH
        event.relatedEntities = entities.filter((e) => e.id != null);
        event.relatedContacts = contacts.filter((c) => c.id != null);
      }

      return event;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Temporal events query failed: ${message}`);
  }
}
