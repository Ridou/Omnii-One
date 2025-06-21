// Define supported node types
export type NodeType = 'Concept' | 'Email' | 'Event' | 'ChatMessage' | 'Memory' | 'Tag' | 'User' | string;

// Node data interface
export interface NodeData {
  id: string;
  labels: string[];
  properties: { [key: string]: unknown };
}

// Relationship data interface
export interface RelationshipData {
  type: string;
  properties: { [key: string]: unknown };
  source: string;
  target: string;
}

// Context interface
export interface ContextData {
  nodes: NodeData[];
  relationships: RelationshipData[];
}

// Search result interface
export interface SearchResult {
  id: string;
  labels: string[];
  properties: { [key: string]: unknown };
  score?: number;
}

// Health check interface
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  neo4j: boolean;
  connection_type: string;
  metrics: {
    total_concepts?: number;
    neo4j_version?: string;
    railway_internal?: boolean;
    timestamp: string;
    error?: string;
  };
}

// Brain memory context interface (simplified for service)
export interface BrainMemoryContext {
  consolidation_metadata: {
    memory_strength: number;
    consolidation_score: number;
    last_consolidation: string;
  };
  working_memory: {
    recent_messages: any[];
    time_window_stats: {
      previous_week_count: number;
      current_week_count: number;
      next_week_count: number;
      recently_modified_count: number;
    };
  };
  episodic_memory: {
    conversation_threads: any[];
    recent_interactions: any[];
  };
  semantic_memory: {
    activated_concepts: Array<{
      id: string;
      name: string;
      activation_strength: number;
      relevance_score: number;
    }>;
    concept_relationships: any[];
  };
}

// Bulk import result interface (Railway template feature)
export interface BulkImportResult {
  imported: number;
  errors: string[];
} 