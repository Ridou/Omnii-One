/**
 * Neo4j Service Client
 * Communicates with the dedicated Neo4j service
 */

interface Neo4jClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

interface NodeData {
  id: string;
  labels: string[];
  properties: { [key: string]: unknown };
}

interface SearchResult {
  id: string;
  labels: string[];
  properties: { [key: string]: unknown };
  score?: number;
}

interface ContextData {
  nodes: NodeData[];
  relationships: any[];
}

interface HealthCheck {
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

interface BrainMemoryContext {
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

export class Neo4jClient {
  private config: Neo4jClientConfig;

  constructor() {
    this.config = {
      baseUrl: this.getServiceUrl(),
      timeout: 5000, // 5 seconds
      retries: 3
    };
  }

  private getServiceUrl(): string {
    // Check if we're in Railway environment
    if (process.env.RAILWAY_ENVIRONMENT) {
      // Railway internal service URL (will be set when deployed)
      return process.env.NEO4J_SERVICE_URL || 'http://neo4j-service:8002';
    }
    
    // Local development
    return process.env.NEO4J_SERVICE_URL || 'http://localhost:8002';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.config.retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as T;
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`[Neo4jClient] Attempt ${i + 1} failed:`, lastError.message);
        
        if (i < this.config.retries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    console.error(`[Neo4jClient] All ${this.config.retries} attempts failed for ${endpoint}:`, lastError?.message);
    throw lastError || new Error('Neo4j service unavailable');
  }

  /**
   * Health check for the Neo4j service
   */
  async healthCheck(): Promise<HealthCheck> {
    try {
      const response = await this.request<HealthCheck>('/api/health');
      return response;
    } catch (error) {
      console.error('[Neo4jClient] Health check failed:', error);
      return {
        status: 'unhealthy',
        neo4j: false,
        connection_type: 'unavailable',
        metrics: {
          error: error instanceof Error ? error.message : 'Service unavailable',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Search for similar concepts
   */
  async searchSimilarConcepts(userId: string, text: string, limit = 5): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        q: text,
        limit: limit.toString()
      });

      const response = await this.request<{ data: SearchResult[] }>(`/api/concepts/search?${params}`);
      return response.data || [];
    } catch (error) {
      console.error('[Neo4jClient] Search concepts failed:', error);
      return [];
    }
  }

  /**
   * List concepts for a user
   */
  async listNodes(userId: string, nodeType = 'Concept', limit = 100, filter?: string): Promise<NodeData[]> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        type: nodeType,
        limit: limit.toString(),
        ...(filter && { filter })
      });

      const response = await this.request<{ data: NodeData[] }>(`/api/nodes?${params}`);
      return response.data || [];
    } catch (error) {
      console.error('[Neo4jClient] List nodes failed:', error);
      return [];
    }
  }

  /**
   * Get AI context for a query
   */
  async getContextForQuery(userId: string, query: string, limit = 5): Promise<ContextData> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        query: query,
        limit: limit.toString()
      });

      const response = await this.request<{ data: ContextData }>(`/api/context?${params}`);
      return response.data || { nodes: [], relationships: [] };
    } catch (error) {
      console.error('[Neo4jClient] Get context failed:', error);
      return { nodes: [], relationships: [] };
    }
  }

  /**
   * Get context for a specific node
   */
  async getNodeContext(nodeId: string, userId: string): Promise<ContextData> {
    try {
      const params = new URLSearchParams({
        user_id: userId
      });

      const response = await this.request<{ data: ContextData }>(`/api/nodes/${nodeId}/context?${params}`);
      return response.data || { nodes: [], relationships: [] };
    } catch (error) {
      console.error('[Neo4jClient] Get node context failed:', error);
      return { nodes: [], relationships: [] };
    }
  }

  /**
   * Get brain memory context
   */
  async getBrainMemoryContext(
    userId: string, 
    message: string, 
    channel: 'sms' | 'chat', 
    sourceIdentifier: string
  ): Promise<BrainMemoryContext> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        message: message,
        channel: channel,
        source_identifier: sourceIdentifier
      });

      const response = await this.request<{ data: BrainMemoryContext }>(`/api/brain/memory-context?${params}`);
      return response.data || this.getEmptyBrainContext();
    } catch (error) {
      console.error('[Neo4jClient] Get brain memory context failed:', error);
      return this.getEmptyBrainContext();
    }
  }

  /**
   * Get concepts for context (backward compatibility)
   */
  async getConceptsForContext(userId: string, query: string, limit = 3): Promise<{concepts: NodeData[], relationships: any[]}> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        query: query,
        limit: limit.toString()
      });

      const response = await this.request<{ data: {concepts: NodeData[], relationships: any[]} }>(`/api/concepts/context?${params}`);
      return response.data || { concepts: [], relationships: [] };
    } catch (error) {
      console.error('[Neo4jClient] Get concepts for context failed:', error);
      return { concepts: [], relationships: [] };
    }
  }

  /**
   * Bulk import from CSV (Railway template feature)
   */
  async bulkImportFromCSV(nodeUrls?: string[], relationUrls?: string[]): Promise<{imported: number, errors: string[]}> {
    try {
      const response = await this.request<{ data: {imported: number, errors: string[]} }>('/api/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          node_urls: nodeUrls,
          relation_urls: relationUrls
        })
      });

      return response.data || { imported: 0, errors: ['No response data'] };
    } catch (error) {
      console.error('[Neo4jClient] Bulk import failed:', error);
      return { 
        imported: 0, 
        errors: [error instanceof Error ? error.message : 'Import failed'] 
      };
    }
  }

  /**
   * Check if the Neo4j service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy' && health.neo4j;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service configuration info
   */
  getConfig(): Neo4jClientConfig {
    return { ...this.config };
  }

  /**
   * Update service URL (useful for testing)
   */
  setServiceUrl(url: string): void {
    this.config.baseUrl = url;
  }

  private getEmptyBrainContext(): BrainMemoryContext {
    return {
      consolidation_metadata: {
        memory_strength: 0,
        consolidation_score: 0,
        last_consolidation: new Date().toISOString()
      },
      working_memory: {
        recent_messages: [],
        time_window_stats: {
          previous_week_count: 0,
          current_week_count: 0,
          next_week_count: 0,
          recently_modified_count: 0
        }
      },
      episodic_memory: {
        conversation_threads: [],
        recent_interactions: []
      },
      semantic_memory: {
        activated_concepts: [],
        concept_relationships: []
      }
    };
  }
}

// Export singleton instance
export const neo4jClient = new Neo4jClient(); 