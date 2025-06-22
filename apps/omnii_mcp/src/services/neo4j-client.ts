/**
 * Neo4j Service Client
 * Communicates with the dedicated Neo4j service
 */

import axios, { AxiosInstance } from 'axios';

interface Neo4jServiceConfig {
  baseURL: string;
  timeout: number;
}

interface NodeData {
  id: string;
  labels: string[];
  properties: { [key: string]: unknown };
}

interface SearchResult extends NodeData {
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

export class Neo4jServiceClient {
  private client: AxiosInstance;
  private config: Neo4jServiceConfig;

  constructor() {
    // Railway internal networking - services can communicate via service names
    const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
    
    this.config = {
      // Use Railway internal service name when in Railway, localhost for local dev
      baseURL: isRailway 
        ? 'http://omnii-neo4j.railway.internal:8001/api'  // Railway internal networking
        : 'http://localhost:8001/api',                    // Local development
      timeout: 10000 // 10 second timeout for internal calls
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'omnii-mcp/1.0'
      }
    });

    // Request/Response interceptors for debugging
    this.client.interceptors.request.use(
      (config) => {
        const env = isRailway ? '[RAILWAY-INTERNAL]' : '[LOCAL]';
        console.log(`${env} [Neo4j-Client] → ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Neo4j-Client] Request error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        const env = isRailway ? '[RAILWAY-INTERNAL]' : '[LOCAL]';
        console.log(`${env} [Neo4j-Client] ← ${response.status} ${response.config.url} (${response.data?.data?.length || 0} items)`);
        return response;
      },
      (error) => {
        const env = isRailway ? '[RAILWAY-INTERNAL]' : '[LOCAL]';
        console.error(`${env} [Neo4j-Client] ← ERROR ${error.response?.status || 'NO_RESPONSE'} ${error.config?.url}:`, error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    console.log(`🔗 [Neo4j-Client] Initialized with baseURL: ${this.config.baseURL}`);
  }

  /**
   * Health check for the Neo4j microservice
   */
  async healthCheck(): Promise<HealthCheck> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('[Neo4j-Client] Health check failed:', error);
      return {
        status: 'unhealthy',
        neo4j: false,
        connection_type: 'microservice-unreachable',
        metrics: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * List nodes of a specific type
   */
  async listNodes(userId: string, nodeType: string = 'Concept', limit: number = 100, filter?: string): Promise<NodeData[]> {
    try {
      const params: any = { user_id: userId, limit };
      if (filter) params.filter = filter;
      if (nodeType !== 'Concept') params.type = nodeType;

      const response = await this.client.get('/concepts', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('[Neo4j-Client] listNodes failed:', error);
      return [];
    }
  }

  /**
   * Search for similar concepts
   */
  async searchSimilarConcepts(userId: string, text: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      const response = await this.client.get('/concepts/search', {
        params: { user_id: userId, q: text, limit }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('[Neo4j-Client] searchSimilarConcepts failed:', error);
      return [];
    }
  }

  /**
   * Get context for AI queries
   */
  async getContextForQuery(userId: string, query: string, limit: number = 5): Promise<ContextData> {
    try {
      const response = await this.client.get('/context', {
        params: { user_id: userId, query, limit }
      });
      return response.data.data || { nodes: [], relationships: [] };
    } catch (error) {
      console.error('[Neo4j-Client] getContextForQuery failed:', error);
      return { nodes: [], relationships: [] };
    }
  }

  /**
   * Get concepts for context (backward compatibility)
   */
  async getConceptsForContext(userId: string, query: string, limit: number = 3): Promise<{concepts: NodeData[], relationships: any[]}> {
    try {
      const response = await this.client.get('/concepts/context', {
        params: { user_id: userId, query, limit }
      });
      return response.data.data || { concepts: [], relationships: [] };
    } catch (error) {
      console.error('[Neo4j-Client] getConceptsForContext failed:', error);
      return { concepts: [], relationships: [] };
    }
  }

  /**
   * Get brain memory context
   */
  async getBrainMemoryContext(userId: string, message: string, channel: 'sms' | 'chat', sourceIdentifier: string): Promise<BrainMemoryContext> {
    try {
      const response = await this.client.get('/brain/memory-context', {
        params: { user_id: userId, message, channel, source_identifier: sourceIdentifier }
      });
      return response.data.data;
    } catch (error) {
      console.error('[Neo4j-Client] getBrainMemoryContext failed:', error);
      // Return empty context structure on failure
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

  /**
   * Store chat conversation (CRITICAL: enables chat->Neo4j pipeline)
   */
  async storeChatConversation(data: {
    user_id: string;
    content: string;
    chat_id: string;
    is_incoming: boolean;
    websocket_session_id?: string;
    thread_id?: string;
    is_group_chat?: boolean;
    participants?: string[];
    reply_to_message_id?: string;
    message_sequence?: number;
    google_service_context?: {
      service_type?: 'calendar' | 'tasks' | 'contacts' | 'email';
      operation?: string;
      entity_ids?: string[];
    };
  }): Promise<any> {
    try {
      const response = await this.client.post('/brain/store-chat', data);
      return response.data.data;
    } catch (error) {
      console.error('[Neo4j-Client] storeChatConversation failed:', error);
      throw error;
    }
  }

  /**
   * Store SMS conversation (CRITICAL: enables SMS->Neo4j pipeline)
   */
  async storeSMSConversation(data: {
    user_id: string;
    content: string;
    phone_number: string;
    is_incoming: boolean;
    local_datetime?: string;
    google_service_context?: any;
  }): Promise<any> {
    try {
      const response = await this.client.post('/brain/store-sms', data);
      return response.data.data;
    } catch (error) {
      console.error('[Neo4j-Client] storeSMSConversation failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const neo4jServiceClient = new Neo4jServiceClient(); 