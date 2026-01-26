/**
 * useGraphData - Hooks for querying local PowerSync database
 *
 * These hooks provide reactive access to synced graph data.
 * Data updates automatically when PowerSync syncs changes.
 *
 * Usage:
 * ```tsx
 * import { useEntities, useEvents, useRelationships } from '~/hooks/useGraphData';
 *
 * const { entities, isLoading, count } = useEntities('contact', 50);
 * const { events } = useEvents(startDate, endDate);
 * const { relationships } = useRelationships(entityId);
 * ```
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import {
  type SyncEntity,
  type SyncEvent,
  type SyncRelationship,
  parseProperties,
} from '~/lib/powersync/schema';

// Entity type filter
export type EntityType = 'task' | 'email' | 'contact' | 'concept' | 'entity' | 'all';

/**
 * Hook to query entities from local database.
 * Data updates automatically when PowerSync syncs.
 *
 * @param entityType - Filter by entity type, or 'all' for no filter
 * @param limit - Maximum results (default 100)
 * @param searchQuery - Optional name search filter
 */
export const useEntities = (
  entityType: EntityType = 'all',
  limit: number = 100,
  searchQuery?: string
) => {
  // Build query based on filters
  const query = useMemo(() => {
    let sql = 'SELECT * FROM sync_entities';
    const params: (string | number)[] = [];

    const conditions: string[] = [];

    if (entityType !== 'all') {
      conditions.push('entity_type = ?');
      params.push(entityType);
    }

    if (searchQuery?.trim()) {
      conditions.push('name LIKE ?');
      params.push(`%${searchQuery.trim()}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    return { sql, params };
  }, [entityType, limit, searchQuery]);

  const { data, isLoading, error } = useQuery<SyncEntity>(
    query.sql,
    query.params
  );

  // Parse JSON properties for each entity
  const entities = useMemo(() => {
    return (data || []).map((entity: SyncEntity) => ({
      ...entity,
      parsedProperties: parseProperties(entity.properties),
    }));
  }, [data]);

  return {
    entities,
    isLoading,
    error: error?.message,
    count: entities.length,
  };
};

/**
 * Hook to query events from local database.
 * Useful for calendar/timeline views.
 *
 * @param startDate - Filter events starting after this date
 * @param endDate - Filter events ending before this date
 * @param limit - Maximum results
 */
export const useEvents = (
  startDate?: Date,
  endDate?: Date,
  limit: number = 50
) => {
  const query = useMemo(() => {
    let sql = 'SELECT * FROM sync_events';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (startDate) {
      conditions.push('start_time >= ?');
      params.push(startDate.toISOString());
    }

    if (endDate) {
      conditions.push('end_time <= ?');
      params.push(endDate.toISOString());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY start_time ASC LIMIT ?';
    params.push(limit);

    return { sql, params };
  }, [startDate, endDate, limit]);

  const { data, isLoading, error } = useQuery<SyncEvent>(
    query.sql,
    query.params
  );

  // Parse attendees JSON
  const events = useMemo(() => {
    return (data || []).map((event: SyncEvent) => ({
      ...event,
      parsedAttendees: parseProperties<string[]>(event.attendees) || [],
    }));
  }, [data]);

  return {
    events,
    isLoading,
    error: error?.message,
    count: events.length,
  };
};

/**
 * Hook to query relationships from local database.
 *
 * @param entityId - Filter relationships involving this entity
 * @param relationshipType - Filter by relationship type
 */
export const useRelationships = (
  entityId?: string,
  relationshipType?: string
) => {
  const query = useMemo(() => {
    let sql = 'SELECT * FROM sync_relationships';
    const params: string[] = [];
    const conditions: string[] = [];

    if (entityId) {
      conditions.push('(from_entity_id = ? OR to_entity_id = ?)');
      params.push(entityId, entityId);
    }

    if (relationshipType) {
      conditions.push('relationship_type = ?');
      params.push(relationshipType);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY updated_at DESC LIMIT 100';

    return { sql, params };
  }, [entityId, relationshipType]);

  const { data, isLoading, error } = useQuery<SyncRelationship>(
    query.sql,
    query.params
  );

  return {
    relationships: data || [],
    isLoading,
    error: error?.message,
    count: (data || []).length,
  };
};

/**
 * Hook to get a single entity by ID.
 */
export const useEntity = (entityId: string) => {
  const { data, isLoading, error } = useQuery<SyncEntity>(
    'SELECT * FROM sync_entities WHERE id = ? LIMIT 1',
    [entityId]
  );

  const entity = data?.[0] ? {
    ...data[0],
    parsedProperties: parseProperties(data[0].properties),
  } : null;

  return { entity, isLoading, error: error?.message };
};

/**
 * Hook to get entity count by type.
 */
export const useEntityCounts = () => {
  const { data, isLoading } = useQuery<{ entity_type: string; count: number }>(
    `SELECT entity_type, COUNT(*) as count
     FROM sync_entities
     GROUP BY entity_type`
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    (data || []).forEach((row: { entity_type: string; count: number }) => {
      result[row.entity_type] = row.count;
    });
    return result;
  }, [data]);

  return { counts, isLoading };
};
