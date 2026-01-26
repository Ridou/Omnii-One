/**
 * PowerSync Schema Definition
 *
 * These tables mirror the Supabase sync_* tables exactly.
 * See: apps/omnii_mcp/supabase/migrations/20260125_powersync_tables.sql
 *
 * Schema requirements:
 * - id column is always TEXT (UUIDs stored as strings)
 * - Timestamps are TEXT (ISO 8601 strings)
 * - JSONB becomes TEXT (JSON stringified)
 */

import { column, Schema, Table } from '@powersync/react-native';

// ============================================================================
// sync_entities - Graph entities (tasks, emails, contacts, concepts)
// ============================================================================
export const syncEntitiesTable = new Table({
  user_id: column.text,
  entity_type: column.text, // 'task' | 'email' | 'contact' | 'concept' | 'entity'
  name: column.text,
  properties: column.text, // JSON string (JSONB in Postgres)
  source_id: column.text,
  created_at: column.text, // ISO 8601 timestamp
  updated_at: column.text, // ISO 8601 timestamp
}, {
  indexes: {
    // Index for filtering by entity type
    idx_entity_type: ['entity_type'],
    // Index for finding by source ID (deduplication)
    idx_source_id: ['source_id'],
  },
});

// ============================================================================
// sync_events - Calendar events
// ============================================================================
export const syncEventsTable = new Table({
  user_id: column.text,
  summary: column.text,
  description: column.text,
  start_time: column.text, // ISO 8601 timestamp
  end_time: column.text, // ISO 8601 timestamp
  location: column.text,
  google_event_id: column.text,
  attendees: column.text, // JSON array string (JSONB in Postgres)
  created_at: column.text, // ISO 8601 timestamp
  updated_at: column.text, // ISO 8601 timestamp
}, {
  indexes: {
    // Index for date range queries
    idx_start_time: ['start_time'],
    // Index for Google event deduplication
    idx_google_event: ['google_event_id'],
  },
});

// ============================================================================
// sync_relationships - Entity relationships
// ============================================================================
export const syncRelationshipsTable = new Table({
  user_id: column.text,
  from_entity_id: column.text,
  to_entity_id: column.text,
  relationship_type: column.text,
  properties: column.text, // JSON string (JSONB in Postgres)
  created_at: column.text, // ISO 8601 timestamp
  updated_at: column.text, // ISO 8601 timestamp
}, {
  indexes: {
    // Index for traversing from entity
    idx_from_entity: ['from_entity_id'],
    // Index for traversing to entity
    idx_to_entity: ['to_entity_id'],
    // Index for relationship type queries
    idx_rel_type: ['relationship_type'],
  },
});

// ============================================================================
// Combined schema export
// ============================================================================
export const AppSchema = new Schema({
  sync_entities: syncEntitiesTable,
  sync_events: syncEventsTable,
  sync_relationships: syncRelationshipsTable,
});

// Export database type for typed queries
export type Database = (typeof AppSchema)['types'];

// ============================================================================
// Type helpers for query results
// ============================================================================
export type EntityType = 'task' | 'email' | 'contact' | 'concept' | 'entity';

export interface SyncEntity {
  id: string;
  user_id: string;
  entity_type: EntityType;
  name: string;
  properties: string; // JSON string, parse with JSON.parse()
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncEvent {
  id: string;
  user_id: string;
  summary: string | null;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  google_event_id: string | null;
  attendees: string; // JSON array string
  created_at: string;
  updated_at: string;
}

export interface SyncRelationship {
  id: string;
  user_id: string;
  from_entity_id: string;
  to_entity_id: string;
  relationship_type: string;
  properties: string; // JSON string
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Helper utilities
// ============================================================================

/**
 * Parse JSON properties safely
 * @param json JSON string from database
 * @returns Parsed object or empty object on error
 */
export const parseProperties = <T = Record<string, unknown>>(json: string | null): T => {
  if (!json) return {} as T;
  try {
    return JSON.parse(json) as T;
  } catch {
    return {} as T;
  }
};

/**
 * Parse attendees array from JSON string
 * @param json JSON array string from sync_events.attendees
 * @returns Array of attendee objects
 */
export const parseAttendees = <T = Array<{ email?: string; name?: string; status?: string }>>(
  json: string | null,
): T => {
  if (!json) return [] as unknown as T;
  try {
    return JSON.parse(json) as T;
  } catch {
    return [] as unknown as T;
  }
};

/**
 * Check if an entity is a specific type
 */
export const isEntityType = (entity: SyncEntity, type: EntityType): boolean => {
  return entity.entity_type === type;
};
