/**
 * Graph Schema Constraints
 *
 * Defines and manages schema constraints for data integrity.
 * These constraints should be run once per user database to ensure
 * proper uniqueness and property existence.
 */

import type { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import { NodeLabel } from './nodes';

/**
 * Result of constraint setup operation
 */
export interface ConstraintSetupResult {
  success: boolean;
  constraintsCreated: number;
  errors: string[];
}

/**
 * Information about an existing constraint
 */
export interface ConstraintInfo {
  name: string;
  type: string;
  entityType: string;
  labelsOrTypes: string[];
  properties: string[];
  ownedIndex: string | null;
}

/**
 * Constraint definitions for the knowledge graph
 */
const UNIQUENESS_CONSTRAINTS = [
  { label: NodeLabel.Concept, property: 'id', name: 'concept_id' },
  { label: NodeLabel.Entity, property: 'id', name: 'entity_id' },
  { label: NodeLabel.Event, property: 'id', name: 'event_id' },
  { label: NodeLabel.Contact, property: 'id', name: 'contact_id' },
];

const EXISTENCE_CONSTRAINTS = [
  { label: NodeLabel.Concept, property: 'name', name: 'concept_name' },
  { label: NodeLabel.Entity, property: 'name', name: 'entity_name' },
  { label: NodeLabel.Event, property: 'name', name: 'event_name' },
  { label: NodeLabel.Contact, property: 'name', name: 'contact_name' },
];

/**
 * Set up schema constraints for a user's database.
 * Creates uniqueness constraints for node IDs and existence constraints
 * for required properties like name.
 *
 * Uses "IF NOT EXISTS" syntax to be idempotent - safe to run multiple times.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @returns Result indicating success and number of constraints created
 */
export async function setupSchemaConstraints(
  client: Neo4jHTTPClient
): Promise<ConstraintSetupResult> {
  const errors: string[] = [];
  let constraintsCreated = 0;

  // Create uniqueness constraints for node IDs
  for (const constraint of UNIQUENESS_CONSTRAINTS) {
    try {
      const cypher = `
        CREATE CONSTRAINT ${constraint.name} IF NOT EXISTS
        FOR (n:${constraint.label})
        REQUIRE n.${constraint.property} IS UNIQUE
      `;
      await client.query(cypher);
      constraintsCreated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to create uniqueness constraint ${constraint.name}: ${message}`);
    }
  }

  // Create existence constraints for required properties
  // Note: Existence constraints require Neo4j Enterprise Edition
  // In Community Edition, these will fail silently or with a specific error
  for (const constraint of EXISTENCE_CONSTRAINTS) {
    try {
      const cypher = `
        CREATE CONSTRAINT ${constraint.name} IF NOT EXISTS
        FOR (n:${constraint.label})
        REQUIRE n.${constraint.property} IS NOT NULL
      `;
      await client.query(cypher);
      constraintsCreated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Existence constraints may not be supported in all Neo4j editions
      // Log but don't fail the whole operation
      if (message.includes('Enterprise') || message.includes('not supported')) {
        // Skip existence constraints for Community Edition
        continue;
      }
      errors.push(`Failed to create existence constraint ${constraint.name}: ${message}`);
    }
  }

  return {
    success: errors.length === 0,
    constraintsCreated,
    errors,
  };
}

/**
 * Check existing constraints in the database.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @returns List of existing constraints
 */
export async function checkConstraints(
  client: Neo4jHTTPClient
): Promise<ConstraintInfo[]> {
  const cypher = 'SHOW CONSTRAINTS';

  try {
    const result = await client.query(cypher);

    if (!result.data || !result.data.values || result.data.values.length === 0) {
      return [];
    }

    const fields = result.data.fields;
    const nameIndex = fields.indexOf('name');
    const typeIndex = fields.indexOf('type');
    const entityTypeIndex = fields.indexOf('entityType');
    const labelsOrTypesIndex = fields.indexOf('labelsOrTypes');
    const propertiesIndex = fields.indexOf('properties');
    const ownedIndexIndex = fields.indexOf('ownedIndex');

    return result.data.values.map((row) => ({
      name: row[nameIndex] as string,
      type: row[typeIndex] as string,
      entityType: row[entityTypeIndex] as string,
      labelsOrTypes: row[labelsOrTypesIndex] as string[],
      properties: row[propertiesIndex] as string[],
      ownedIndex: row[ownedIndexIndex] as string | null,
    }));
  } catch (error) {
    // SHOW CONSTRAINTS may not be supported in all contexts
    // Return empty array rather than failing
    console.error('Failed to check constraints:', error);
    return [];
  }
}

/**
 * Drop all constraints in the database.
 * Useful for testing or resetting a database.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @returns Number of constraints dropped
 */
export async function dropAllConstraints(
  client: Neo4jHTTPClient
): Promise<number> {
  const constraints = await checkConstraints(client);
  let dropped = 0;

  for (const constraint of constraints) {
    try {
      const cypher = `DROP CONSTRAINT ${constraint.name} IF EXISTS`;
      await client.query(cypher);
      dropped++;
    } catch (error) {
      console.error(`Failed to drop constraint ${constraint.name}:`, error);
    }
  }

  return dropped;
}

/**
 * Create temporal indexes for time-based queries.
 * Indexes created_at on Entity, Event, Contact, Concept nodes
 * and start_time on Event nodes for efficient temporal filtering.
 *
 * @param client - Neo4j HTTP client for the user's database
 * @returns Number of indexes created
 */
export async function createTemporalIndex(
  client: Neo4jHTTPClient
): Promise<number> {
  const indexQueries = [
    'CREATE INDEX entity_created_at IF NOT EXISTS FOR (n:Entity) ON (n.created_at)',
    'CREATE INDEX event_start_time IF NOT EXISTS FOR (n:Event) ON (n.start_time)',
    'CREATE INDEX contact_created_at IF NOT EXISTS FOR (n:Contact) ON (n.created_at)',
    'CREATE INDEX concept_created_at IF NOT EXISTS FOR (n:Concept) ON (n.created_at)',
  ];

  let created = 0;

  for (const query of indexQueries) {
    try {
      await client.query(query);
      created++;
    } catch (error) {
      console.error('Failed to create temporal index:', error);
    }
  }

  return created;
}
