// Response structure from Neo4j HTTP Query API v2
export interface Neo4jQueryResult {
  data: {
    fields: string[];
    values: any[][];
  };
  counters?: {
    nodesCreated?: number;
    nodesDeleted?: number;
    relationshipsCreated?: number;
    relationshipsDeleted?: number;
    propertiesSet?: number;
    labelsAdded?: number;
    labelsRemoved?: number;
  };
  bookmarks?: string[];
}

export interface Neo4jHTTPConfig {
  uri: string;        // https://xxxxx.databases.neo4j.io
  user: string;
  password: string;
  database: string;
}

export interface Neo4jHTTPError {
  code: string;
  message: string;
}
