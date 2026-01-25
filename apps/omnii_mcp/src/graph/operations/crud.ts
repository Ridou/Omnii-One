/**
 * Graph CRUD Operations
 *
 * Provides create, read, update, and delete operations for graph nodes
 * and relationships using the Neo4j HTTP Client.
 */

import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import type { Neo4jQueryResult } from '../../types/neo4j.types';
import { NodeLabel, type BaseNodeProperties } from '../schema/nodes';
import { RelationshipType, type RelationshipProperties } from '../schema/relationships';

/**
 * Helper to map Neo4j HTTP API response to a single node object
 */
function mapResultToNode<T extends BaseNodeProperties>(result: Neo4jQueryResult): T | null {
  if (!result.data || !result.data.values || result.data.values.length === 0) {
    return null;
  }

  const fields = result.data.fields;
  const values = result.data.values[0];

  // Map fields to values
  const node: Record<string, unknown> = {};
  for (let i = 0; i < fields.length; i++) {
    node[fields[i]] = values[i];
  }

  return node as T;
}

/**
 * Helper to map Neo4j HTTP API response to array of nodes
 */
function mapResultToNodes<T extends BaseNodeProperties>(result: Neo4jQueryResult): T[] {
  if (!result.data || !result.data.values || result.data.values.length === 0) {
    return [];
  }

  const fields = result.data.fields;
  return result.data.values.map((values) => {
    const node: Record<string, unknown> = {};
    for (let i = 0; i < fields.length; i++) {
      node[fields[i]] = values[i];
    }
    return node as T;
  });
}

/**
 * Create a new node in the graph.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param label - Node label (Concept, Entity, Event, Contact)
 * @param properties - Node properties (id and createdAt will be auto-generated)
 * @returns The created node with all properties
 */
export async function createNode<T extends BaseNodeProperties>(
  client: Neo4jHTTPClient,
  label: NodeLabel,
  properties: Omit<T, 'id' | 'createdAt'>
): Promise<T> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const nodeProperties = {
    id,
    createdAt,
    ...properties,
  };

  // Build property string for Cypher query
  // Use backticks to escape property names that might be reserved words (like 'type')
  const propKeys = Object.keys(nodeProperties);
  const propString = propKeys.map((key) => `\`${key}\`: $${key}`).join(', ');

  const cypher = `
    CREATE (n:${label} {${propString}})
    RETURN ${propKeys.map((key) => `n.\`${key}\` AS \`${key}\``).join(', ')}
  `;

  const result = await client.query(cypher, nodeProperties);
  const node = mapResultToNode<T>(result);

  if (!node) {
    throw new Error(`Failed to create ${label} node`);
  }

  return node;
}

/**
 * Get a node by its ID.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param id - UUID of the node to retrieve
 * @returns The node with all properties and labels, or null if not found
 */
export async function getNode<T extends BaseNodeProperties>(
  client: Neo4jHTTPClient,
  id: string
): Promise<(T & { labels: string[] }) | null> {
  const cypher = `
    MATCH (n {id: $id})
    RETURN properties(n) AS props, labels(n) AS labels
  `;

  const result = await client.query(cypher, { id });

  if (!result.data || !result.data.values || result.data.values.length === 0) {
    return null;
  }

  // The result has props and labels as separate fields
  const propsIndex = result.data.fields.indexOf('props');
  const labelsIndex = result.data.fields.indexOf('labels');

  const props = result.data.values[0][propsIndex] as T;
  const labels = result.data.values[0][labelsIndex] as string[];

  return { ...props, labels };
}

/**
 * Get all nodes with a given label.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param label - Node label to filter by
 * @param limit - Maximum number of nodes to return (default: 100)
 * @returns Array of nodes sorted by createdAt descending
 */
export async function getNodesByLabel<T extends BaseNodeProperties>(
  client: Neo4jHTTPClient,
  label: NodeLabel,
  limit: number = 100
): Promise<T[]> {
  const cypher = `
    MATCH (n:${label})
    RETURN properties(n) AS props
    ORDER BY n.createdAt DESC
    LIMIT $limit
  `;

  const result = await client.query(cypher, { limit });

  if (!result.data || !result.data.values || result.data.values.length === 0) {
    return [];
  }

  // Extract props from each row
  const propsIndex = result.data.fields.indexOf('props');
  return result.data.values.map((row) => row[propsIndex] as T);
}

/**
 * Update a node's properties.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param id - UUID of the node to update
 * @param updates - Properties to update (will be merged with existing)
 * @returns The updated node, or null if not found
 */
export async function updateNode<T extends BaseNodeProperties>(
  client: Neo4jHTTPClient,
  id: string,
  updates: Partial<Omit<T, 'id' | 'createdAt'>>
): Promise<T | null> {
  const updatedAt = new Date().toISOString();

  const updateProperties = {
    ...updates,
    updatedAt,
  };

  const cypher = `
    MATCH (n {id: $id})
    SET n += $updates
    RETURN properties(n) AS props
  `;

  const result = await client.query(cypher, { id, updates: updateProperties });

  if (!result.data || !result.data.values || result.data.values.length === 0) {
    return null;
  }

  const propsIndex = result.data.fields.indexOf('props');
  return result.data.values[0][propsIndex] as T;
}

/**
 * Delete a node and all its relationships.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param id - UUID of the node to delete
 * @returns true if node was deleted, false if not found
 */
export async function deleteNode(
  client: Neo4jHTTPClient,
  id: string
): Promise<boolean> {
  const cypher = `
    MATCH (n {id: $id})
    DETACH DELETE n
  `;

  const result = await client.query(cypher, { id });

  // Check if any nodes were deleted
  return result.counters?.nodesDeleted ? result.counters.nodesDeleted > 0 : false;
}

/**
 * Create a relationship between two nodes.
 * Uses MERGE to ensure idempotency (won't create duplicates).
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param fromId - UUID of the source node
 * @param toId - UUID of the target node
 * @param type - Type of relationship to create
 * @param properties - Optional properties for the relationship
 * @returns true if relationship was created, false if nodes not found
 */
export async function createRelationship(
  client: Neo4jHTTPClient,
  fromId: string,
  toId: string,
  type: RelationshipType,
  properties?: RelationshipProperties
): Promise<boolean> {
  const relationshipProps = properties
    ? {
        ...properties,
        createdAt: properties.createdAt || new Date().toISOString(),
      }
    : { createdAt: new Date().toISOString() };

  const cypher = `
    MATCH (from {id: $fromId})
    MATCH (to {id: $toId})
    MERGE (from)-[r:${type}]->(to)
    SET r += $props
    RETURN r
  `;

  const result = await client.query(cypher, {
    fromId,
    toId,
    props: relationshipProps,
  });

  // Check if relationship was created or matched
  return result.data?.values?.length ? result.data.values.length > 0 : false;
}

/**
 * Get relationships for a node.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param nodeId - UUID of the node
 * @param direction - 'outgoing', 'incoming', or 'both' (default: 'both')
 * @returns Array of relationships with connected node IDs
 */
export async function getRelationships(
  client: Neo4jHTTPClient,
  nodeId: string,
  direction: 'outgoing' | 'incoming' | 'both' = 'both'
): Promise<Array<{
  type: string;
  properties: Record<string, unknown>;
  connectedNodeId: string;
  direction: 'outgoing' | 'incoming';
}>> {
  let cypher: string;

  if (direction === 'outgoing') {
    cypher = `
      MATCH (n {id: $nodeId})-[r]->(other)
      RETURN type(r) AS type, properties(r) AS props, other.id AS connectedNodeId, 'outgoing' AS dir
    `;
  } else if (direction === 'incoming') {
    cypher = `
      MATCH (n {id: $nodeId})<-[r]-(other)
      RETURN type(r) AS type, properties(r) AS props, other.id AS connectedNodeId, 'incoming' AS dir
    `;
  } else {
    cypher = `
      MATCH (n {id: $nodeId})-[r]-(other)
      WITH r, other, CASE WHEN startNode(r) = n THEN 'outgoing' ELSE 'incoming' END AS dir
      RETURN type(r) AS type, properties(r) AS props, other.id AS connectedNodeId, dir
    `;
  }

  const result = await client.query(cypher, { nodeId });

  if (!result.data || !result.data.values || result.data.values.length === 0) {
    return [];
  }

  const typeIndex = result.data.fields.indexOf('type');
  const propsIndex = result.data.fields.indexOf('props');
  const connectedIndex = result.data.fields.indexOf('connectedNodeId');
  const dirIndex = result.data.fields.indexOf('dir');

  return result.data.values.map((row) => ({
    type: row[typeIndex] as string,
    properties: row[propsIndex] as Record<string, unknown>,
    connectedNodeId: row[connectedIndex] as string,
    direction: row[dirIndex] as 'outgoing' | 'incoming',
  }));
}

/**
 * Delete a relationship between two nodes.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @param fromId - UUID of the source node
 * @param toId - UUID of the target node
 * @param type - Type of relationship to delete
 * @returns true if relationship was deleted, false if not found
 */
export async function deleteRelationship(
  client: Neo4jHTTPClient,
  fromId: string,
  toId: string,
  type: RelationshipType
): Promise<boolean> {
  const cypher = `
    MATCH (from {id: $fromId})-[r:${type}]->(to {id: $toId})
    DELETE r
  `;

  const result = await client.query(cypher, { fromId, toId });

  return result.counters?.relationshipsDeleted
    ? result.counters.relationshipsDeleted > 0
    : false;
}
