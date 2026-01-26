// apps/omnii_mcp/src/graph/versioning/temporal-schema.ts

export type ChangeAuthor = 'user' | 'ai_assistant' | 'system' | 'ingestion';

export interface StateNode {
  id: string;
  version: number;
  data: Record<string, unknown>;
  createdAt: string; // ISO timestamp
  createdBy: ChangeAuthor;
  changeDescription?: string;
}

export interface VersionedEntity {
  entityId: string;
  entityType: string; // 'Concept', 'Entity', 'Event', 'Contact'
  currentState: StateNode;
  versionCount: number;
}

export interface VersionHistoryEntry {
  version: number;
  createdAt: string;
  createdBy: ChangeAuthor;
  changeDescription?: string;
  isCurrent: boolean;
}

export interface VersionDiff {
  version: number;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

// Schema constraints for Neo4j
export const VERSION_SCHEMA_CYPHER = `
// Create index on State.version for efficient history queries
CREATE INDEX state_version IF NOT EXISTS FOR (s:State) ON (s.version);

// Create index on State.createdAt for temporal queries
CREATE INDEX state_created_at IF NOT EXISTS FOR (s:State) ON (s.createdAt);

// Create constraint for State.id uniqueness
CREATE CONSTRAINT state_id IF NOT EXISTS FOR (s:State) REQUIRE s.id IS UNIQUE;
`;

// Maximum versions to keep per entity (retention policy)
export const MAX_VERSIONS_PER_ENTITY = 50;
