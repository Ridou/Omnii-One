/**
 * Graph Node Schema Definitions
 *
 * Defines the node labels and property interfaces for the Omnii knowledge graph.
 * These types are used by CRUD operations and MCP tools to interact with user data.
 */

/**
 * Node labels for the knowledge graph.
 * Each label represents a distinct type of information node.
 */
export enum NodeLabel {
  /** Abstract ideas, topics, or themes */
  Concept = 'Concept',
  /** Concrete things: people, organizations, places, things */
  Entity = 'Entity',
  /** Time-bound occurrences: meetings, appointments, activities */
  Event = 'Event',
  /** People the user knows with contact information */
  Contact = 'Contact',
}

/**
 * Base properties shared by all node types.
 */
export interface BaseNodeProperties {
  /** Unique identifier (UUID) */
  id: string;
  /** Display name for the node */
  name: string;
  /** ISO 8601 datetime when node was created */
  createdAt: string;
  /** ISO 8601 datetime when node was last updated */
  updatedAt?: string;
  /**
   * Vector embedding for similarity search.
   * 1536 dimensions for OpenAI text-embedding-ada-002.
   */
  embedding?: number[];
}

/**
 * Concept node - abstract ideas, topics, or themes.
 * Examples: "Machine Learning", "Project Management", "Health"
 */
export interface ConceptNode extends BaseNodeProperties {
  /** Detailed description of the concept */
  description?: string;
  /** Category or classification */
  category?: string;
}

/**
 * Entity types for classification
 */
export type EntityType = 'person' | 'organization' | 'place' | 'thing';

/**
 * Entity node - concrete things in the world.
 * Examples: "Acme Corp", "New York City", "MacBook Pro"
 */
export interface EntityNode extends BaseNodeProperties {
  /** Type classification: person, organization, place, thing */
  type: EntityType;
  /** Additional properties specific to this entity */
  properties?: Record<string, unknown>;
}

/**
 * Event node - time-bound occurrences.
 * Examples: "Team Meeting", "Doctor Appointment", "Flight to NYC"
 */
export interface EventNode extends BaseNodeProperties {
  /** ISO 8601 datetime when event starts */
  startTime: string;
  /** ISO 8601 datetime when event ends (optional for all-day events) */
  endTime?: string;
  /** Location where event occurs */
  location?: string;
  /** Detailed description of the event */
  description?: string;
}

/**
 * Contact node - people the user knows.
 * Examples: "John Smith", "Jane Doe"
 */
export interface ContactNode extends BaseNodeProperties {
  /** Email address */
  email?: string;
  /** Phone number */
  phone?: string;
  /** Organization or company they belong to */
  organization?: string;
}

/**
 * Union type for any node type
 */
export type AnyNode = ConceptNode | EntityNode | EventNode | ContactNode;

/**
 * Type guard to check if a node is a ConceptNode
 */
export function isConceptNode(node: AnyNode): node is ConceptNode {
  return 'description' in node || 'category' in node;
}

/**
 * Type guard to check if a node is an EntityNode
 */
export function isEntityNode(node: AnyNode): node is EntityNode {
  return 'type' in node && ['person', 'organization', 'place', 'thing'].includes((node as EntityNode).type);
}

/**
 * Type guard to check if a node is an EventNode
 */
export function isEventNode(node: AnyNode): node is EventNode {
  return 'startTime' in node;
}

/**
 * Type guard to check if a node is a ContactNode
 */
export function isContactNode(node: AnyNode): node is ContactNode {
  return 'email' in node || 'phone' in node || 'organization' in node;
}
