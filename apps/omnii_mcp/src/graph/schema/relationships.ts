/**
 * Graph Relationship Schema Definitions
 *
 * Defines the relationship types and properties for the Omnii knowledge graph.
 * Relationship types follow Neo4j convention of SCREAMING_SNAKE_CASE.
 */

/**
 * Relationship types for connecting nodes in the knowledge graph.
 * These define the semantic meaning of connections between nodes.
 */
export enum RelationshipType {
  /** Entity or concept mentioned in an event or another concept */
  MENTIONED_IN = 'MENTIONED_IN',
  /** Event attended by a contact */
  ATTENDED_BY = 'ATTENDED_BY',
  /** Generic relationship between concepts or entities */
  RELATED_TO = 'RELATED_TO',
  /** Event occurred at a location entity */
  OCCURRED_AT = 'OCCURRED_AT',
  /** Contact knows another contact */
  KNOWS = 'KNOWS',
  /** Contact works at an organization entity */
  WORKS_AT = 'WORKS_AT',
  /** Entity or concept created by a contact */
  CREATED_BY = 'CREATED_BY',
}

/**
 * Properties that can be attached to relationships.
 */
export interface RelationshipProperties {
  /** Strength or importance of the relationship (0.0 to 1.0) */
  weight?: number;
  /** ISO 8601 datetime when relationship was created */
  createdAt?: string;
  /** ISO 8601 datetime when relationship was last updated */
  updatedAt?: string;
  /** Additional metadata about the relationship */
  metadata?: Record<string, unknown>;
}

/**
 * Complete relationship definition including endpoints
 */
export interface Relationship {
  /** ID of the source node */
  fromId: string;
  /** ID of the target node */
  toId: string;
  /** Type of the relationship */
  type: RelationshipType;
  /** Optional properties on the relationship */
  properties?: RelationshipProperties;
}
