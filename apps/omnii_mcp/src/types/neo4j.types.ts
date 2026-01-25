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

// Neo4j Aura API types
export interface AuraInstanceRequest {
  name: string;
  version: '5';
  region: string;
  memory: string;
  type: 'free-db' | 'professional-db' | 'enterprise-db';
  tenant_id: string;
  cloud_provider: 'gcp' | 'aws' | 'azure';
}

export interface AuraInstanceResponse {
  data: {
    id: string;
    name: string;
    status: 'creating' | 'running' | 'stopped' | 'deleting';
    connection_url: string;  // neo4j+s://xxx
    username: string;
    password: string;
    tenant_id: string;
  };
}

export interface AuraInstanceStatus {
  data: {
    id: string;
    status: 'creating' | 'running' | 'stopped' | 'deleting';
  };
}
