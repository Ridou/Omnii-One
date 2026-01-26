// apps/omnii_mcp/src/graph/versioning/version-operations.ts

import { Neo4jHTTPClient } from '../../services/neo4j/http-client';
import { getNeo4jHTTPConfig } from '../../config/neo4j.config';
import {
  StateNode,
  VersionedEntity,
  VersionHistoryEntry,
  ChangeAuthor,
  MAX_VERSIONS_PER_ENTITY,
} from './temporal-schema';

// Type alias for compatibility with the plan
export type Neo4jHttpClient = Neo4jHTTPClient;

// Factory function to create HTTP Neo4j client
export function createHttpNeo4jClient(): Neo4jHTTPClient {
  return new Neo4jHTTPClient(getNeo4jHTTPConfig());
}

export class VersionedGraphOperations {
  private client: Neo4jHTTPClient;

  constructor(client: Neo4jHTTPClient) {
    this.client = client;
  }

  /**
   * Create a new version of an entity.
   * If entity has no State nodes yet, creates first version.
   * Maintains [:HAS_STATE] with current=true for latest, [:PREVIOUS] chain for history.
   */
  async createVersion(
    entityId: string,
    entityType: string,
    data: Record<string, unknown>,
    createdBy: ChangeAuthor,
    changeDescription?: string
  ): Promise<StateNode> {
    const stateId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get current version number
    const currentVersion = await this.getCurrentVersionNumber(entityId);
    const newVersion = currentVersion + 1;

    // Create new State node and link to entity
    const query = `
      MATCH (e:${entityType} {id: $entityId})

      // Find current state if exists
      OPTIONAL MATCH (e)-[r:HAS_STATE {current: true}]->(currentState:State)

      // Create new state node
      CREATE (newState:State {
        id: $stateId,
        version: $newVersion,
        data: $dataJson,
        createdAt: $now,
        createdBy: $createdBy,
        changeDescription: $changeDescription
      })

      // Link new state to entity as current
      CREATE (e)-[:HAS_STATE {current: true}]->(newState)

      // If there was a current state, mark it as not current and link as previous
      FOREACH (_ IN CASE WHEN currentState IS NOT NULL THEN [1] ELSE [] END |
        SET r.current = false
        CREATE (newState)-[:PREVIOUS]->(currentState)
      )

      RETURN newState
    `;

    const result = await this.client.query(query, {
      entityId,
      stateId,
      newVersion,
      dataJson: JSON.stringify(data),
      now,
      createdBy,
      changeDescription: changeDescription || null,
    });

    // Cleanup old versions if exceeding limit
    await this.pruneOldVersions(entityId, entityType);

    return {
      id: stateId,
      version: newVersion,
      data,
      createdAt: now,
      createdBy,
      changeDescription,
    };
  }

  /**
   * Get current version number for an entity.
   */
  async getCurrentVersionNumber(entityId: string): Promise<number> {
    const query = `
      MATCH (e {id: $entityId})-[:HAS_STATE {current: true}]->(s:State)
      RETURN s.version as version
    `;

    const result = await this.client.query(query, { entityId });

    if (result.data.values.length === 0) {
      return 0;
    }

    return result.data.values[0][0] as number;
  }

  /**
   * Get version history for an entity.
   */
  async getVersionHistory(
    entityId: string,
    limit: number = 20
  ): Promise<VersionHistoryEntry[]> {
    const query = `
      MATCH (e {id: $entityId})-[r:HAS_STATE]->(s:State)
      RETURN s.version as version,
             s.createdAt as createdAt,
             s.createdBy as createdBy,
             s.changeDescription as changeDescription,
             r.current as isCurrent
      ORDER BY s.version DESC
      LIMIT $limit
    `;

    const result = await this.client.query(query, { entityId, limit });

    return result.data.values.map((row: any[]) => ({
      version: row[0] as number,
      createdAt: row[1] as string,
      createdBy: row[2] as ChangeAuthor,
      changeDescription: row[3] as string | undefined,
      isCurrent: row[4] as boolean,
    }));
  }

  /**
   * Get a specific version's data.
   */
  async getVersion(
    entityId: string,
    version: number
  ): Promise<StateNode | null> {
    const query = `
      MATCH (e {id: $entityId})-[:HAS_STATE]->(s:State {version: $version})
      RETURN s.id as id,
             s.version as version,
             s.data as data,
             s.createdAt as createdAt,
             s.createdBy as createdBy,
             s.changeDescription as changeDescription
    `;

    const result = await this.client.query(query, { entityId, version });

    if (result.data.values.length === 0) {
      return null;
    }

    const row = result.data.values[0];
    return {
      id: row[0] as string,
      version: row[1] as number,
      data: typeof row[2] === 'string' ? JSON.parse(row[2]) : row[2],
      createdAt: row[3] as string,
      createdBy: row[4] as ChangeAuthor,
      changeDescription: row[5] as string | undefined,
    };
  }

  /**
   * Rollback to a specific version.
   * Creates a NEW version with the old data (preserves history).
   */
  async rollbackToVersion(
    entityId: string,
    entityType: string,
    targetVersion: number
  ): Promise<StateNode> {
    const targetState = await this.getVersion(entityId, targetVersion);

    if (!targetState) {
      throw new Error(`Version ${targetVersion} not found for entity ${entityId}`);
    }

    // Create new version with old data
    return this.createVersion(
      entityId,
      entityType,
      targetState.data,
      'user',
      `Rollback to version ${targetVersion}`
    );
  }

  /**
   * Get current state data for an entity.
   */
  async getCurrentState(entityId: string): Promise<StateNode | null> {
    const query = `
      MATCH (e {id: $entityId})-[:HAS_STATE {current: true}]->(s:State)
      RETURN s.id as id,
             s.version as version,
             s.data as data,
             s.createdAt as createdAt,
             s.createdBy as createdBy,
             s.changeDescription as changeDescription
    `;

    const result = await this.client.query(query, { entityId });

    if (result.data.values.length === 0) {
      return null;
    }

    const row = result.data.values[0];
    return {
      id: row[0] as string,
      version: row[1] as number,
      data: typeof row[2] === 'string' ? JSON.parse(row[2]) : row[2],
      createdAt: row[3] as string,
      createdBy: row[4] as ChangeAuthor,
      changeDescription: row[5] as string | undefined,
    };
  }

  /**
   * Prune old versions to enforce retention policy.
   */
  private async pruneOldVersions(
    entityId: string,
    entityType: string
  ): Promise<number> {
    const query = `
      MATCH (e:${entityType} {id: $entityId})-[:HAS_STATE]->(s:State)
      WITH s ORDER BY s.version DESC
      SKIP $keepCount
      DETACH DELETE s
      RETURN count(*) as deleted
    `;

    const result = await this.client.query(query, {
      entityId,
      keepCount: MAX_VERSIONS_PER_ENTITY,
    });

    const deleted = (result.data.values[0]?.[0] as number) || 0;
    if (deleted > 0) {
      console.log(`[Versioning] Pruned ${deleted} old versions for ${entityId}`);
    }

    return deleted;
  }
}

// Factory function for creating operations with a client
export function createVersionedOperations(client: Neo4jHTTPClient): VersionedGraphOperations {
  return new VersionedGraphOperations(client);
}
