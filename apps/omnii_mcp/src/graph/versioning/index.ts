export type {
  StateNode,
  VersionedEntity,
  VersionHistoryEntry,
  VersionDiff,
  ChangeAuthor,
} from './temporal-schema';

export {
  VERSION_SCHEMA_CYPHER,
  MAX_VERSIONS_PER_ENTITY,
} from './temporal-schema';

export {
  VersionedGraphOperations,
  createVersionedOperations,
  createHttpNeo4jClient,
  type Neo4jHttpClient,
} from './version-operations';
