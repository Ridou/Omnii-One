import type { Neo4jHTTPConfig } from '../types/neo4j.types';
import { Neo4jHTTPClient } from '../services/neo4j/http-client';

// Define supported node types
type NodeType = 'Concept' | 'Email' | 'Event' | string;

// Node data interface
interface NodeData {
  id: string;
  labels: string[];
  properties: { [key: string]: unknown };
}

// Relationship data interface
interface RelationshipData {
  type: string;
  properties: { [key: string]: unknown };
  source: string;
  target: string;
}

// Context interface
interface ContextData {
  nodes: NodeData[];
  relationships: RelationshipData[];
}

// Export type interfaces for use in other modules
export type { NodeType, NodeData, RelationshipData, ContextData };

/**
 * Get Neo4j HTTP configuration from environment variables
 */
export const getNeo4jHTTPConfig = (): Neo4jHTTPConfig => {
  // Check required environment variables
  if (!process.env.NEO4J_URI) {
    console.error('❌ NEO4J_URI environment variable is required');
    console.error('🔧 Please set: NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io');
    throw new Error('NEO4J_URI environment variable is required');
  }
  if (!process.env.NEO4J_USER) {
    console.error('❌ NEO4J_USER environment variable is required');
    throw new Error('NEO4J_USER environment variable is required');
  }
  if (!process.env.NEO4J_PASSWORD) {
    console.error('❌ NEO4J_PASSWORD environment variable is required');
    throw new Error('NEO4J_PASSWORD environment variable is required');
  }

  // Convert neo4j+s:// protocol to https:// for HTTP Query API
  let uri = process.env.NEO4J_URI;
  if (uri.startsWith('neo4j+s://')) {
    uri = uri.replace('neo4j+s://', 'https://');
  } else if (uri.startsWith('neo4j://')) {
    uri = uri.replace('neo4j://', 'http://');
  }

  const database = process.env.NEO4J_DATABASE || 'neo4j';

  // Log configuration (without exposing password)
  console.log(`🔍 Neo4j HTTP Configuration:`);
  console.log(`   URI: ${uri.substring(0, 30)}...`);
  console.log(`   User: ${process.env.NEO4J_USER}`);
  console.log(`   Password: SET (length: ${process.env.NEO4J_PASSWORD.length})`);
  console.log(`   Database: ${database}`);

  return {
    uri,
    user: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD,
    database,
  };
};

// Simple Neo4j Service class using HTTP client
class SimpleNeo4jService {
  private client: Neo4jHTTPClient;

  constructor() {
    const config = getNeo4jHTTPConfig();
    this.client = new Neo4jHTTPClient(config);

    // Test connection on initialization
    this.testConnection();
  }

  private async testConnection() {
    const isConnected = await this.client.testConnection();
    if (isConnected) {
      console.log('✅ Neo4j HTTP client connection verified successfully!');
    } else {
      console.error('❌ Neo4j HTTP client connection test failed');
    }
  }

  /**
   * List all nodes of a specific type for a user
   */
  async listNodes(userId: string, nodeType: NodeType = 'Concept', limit = 100, filter?: string): Promise<NodeData[]> {
    try {
      let filterQuery = '';
      if (filter) {
        // Adapt filter fields based on node type
        if (nodeType === 'Concept') {
          filterQuery = "AND (n.name CONTAINS $filter OR n.description CONTAINS $filter OR n.content CONTAINS $filter)";
        } else if (nodeType === 'Email') {
          filterQuery = "AND (n.subject CONTAINS $filter OR n.snippet CONTAINS $filter OR n.from CONTAINS $filter)";
        } else if (nodeType === 'Event') {
          filterQuery = "AND (n.title CONTAINS $filter OR n.description CONTAINS $filter OR n.location CONTAINS $filter)";
        } else {
          // Generic filter for other node types
          filterQuery = "AND ANY(key IN keys(n) WHERE n[key] CONTAINS $filter)";
        }
      }

      const result = await this.client.query(
        `
        MATCH (n:${nodeType})
        WHERE n.user_id = $userId ${filterQuery}
        RETURN n, labels(n) as labels
        LIMIT $limit
        `,
        {
          userId,
          limit,
          filter
        }
      );

      // HTTP API returns data in { fields, values } format
      const nodes = result.data.values.map((row: any[]) => {
        const nodeData = row[0]; // First column is 'n'
        const labels = row[1];    // Second column is 'labels'

        return {
          id: nodeData.elementId || nodeData.identity || 'unknown',
          labels: labels,
          properties: nodeData
        };
      });

      return nodes;
    } catch (error) {
      console.error(`Error in listNodes(${nodeType}):`, error);
      return [];
    }
  }

  /**
   * Search specifically for concepts
   */
  async searchSimilarConcepts(userId: string, text: string, limit = 5): Promise<NodeData[]> {
    try {
      const result = await this.client.query(
        `
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        AND (c.name CONTAINS $text OR c.content CONTAINS $text OR c.description CONTAINS $text)
        WITH c, labels(c) as nodeLabels,
             CASE
               WHEN c.name CONTAINS $text THEN 3
               WHEN c.content CONTAINS $text THEN 2
               WHEN c.description CONTAINS $text THEN 1
               ELSE 0
             END AS relevance
        WHERE relevance > 0
        RETURN c, nodeLabels, relevance
        ORDER BY relevance DESC
        LIMIT $limit
        `,
        {
          userId,
          text,
          limit
        }
      );

      // HTTP API returns data in { fields, values } format
      const concepts = result.data.values.map((row: any[]) => {
        const nodeData = row[0];  // 'c'
        const labels = row[1];     // 'nodeLabels'
        const relevance = row[2];  // 'relevance'

        return {
          id: nodeData.elementId || nodeData.identity || 'unknown',
          labels: labels,
          properties: { ...nodeData, relevance }
        };
      });

      return concepts;
    } catch (error) {
      console.error('Error in searchSimilarConcepts:', error);
      return [];
    }
  }

  /**
   * Get comprehensive context for AI based on a query
   */
  async getContextForQuery(userId: string, query: string, limit = 5): Promise<ContextData> {
    // For now, just search concepts and return without relationships
    const concepts = await this.searchSimilarConcepts(userId, query, limit);
    return {
      nodes: concepts,
      relationships: []
    };
  }

  /**
   * Backward compatibility method for getConceptsForContext
   */
  async getConceptsForContext(userId: string, query: string, limit = 3): Promise<{concepts: NodeData[], relationships: RelationshipData[]}> {
    const contextData = await this.getContextForQuery(userId, query, limit);

    // Filter to only include Concept nodes
    const concepts = contextData.nodes.filter(node =>
      node.labels.includes('Concept')
    );

    return {
      concepts,
      relationships: contextData.relationships
    };
  }

  /**
   * Health check method for brain monitoring
   */
  async healthCheck() {
    try {
      // Test basic connectivity
      const isConnected = await this.client.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed');
      }

      // Count some basic metrics
      const conceptCountResult = await this.client.query('MATCH (c:Concept) RETURN count(c) as total');
      const totalConcepts = conceptCountResult.data.values[0]?.[0] || 0;

      return {
        status: 'healthy' as const,
        neo4j: true,
        redis: false, // We don't use Redis in SimpleNeo4jService
        memory_bridge: true,
        metrics: {
          total_conversations: 0, // Not tracked in simple service
          active_concepts: totalConcepts,
          memory_strength_avg: 0.8 // Default value
        }
      };
    } catch (error) {
      console.error('Neo4j health check failed:', error);
      return {
        status: 'unhealthy' as const,
        neo4j: false,
        redis: false,
        memory_bridge: false,
        metrics: {
          total_conversations: 0,
          active_concepts: 0,
          memory_strength_avg: 0
        }
      };
    }
  }

  /**
   * Get brain memory context (simplified version for backward compatibility)
   */
  async getBrainMemoryContext(userId: string, message: string, channel: 'sms' | 'chat', sourceIdentifier: string) {
    try {
      // Get related concepts for the message
      const concepts = await this.searchSimilarConcepts(userId, message, 5);

      return {
        consolidation_metadata: {
          memory_strength: Math.random() * 0.5 + 0.5, // Random between 0.5-1.0
          consolidation_score: Math.random() * 0.8 + 0.2,
          last_consolidation: new Date().toISOString()
        },
        working_memory: {
          recent_messages: [], // Simplified - not tracking messages
          time_window_stats: {
            previous_week_count: 0,
            current_week_count: 1,
            next_week_count: 0,
            recently_modified_count: concepts.length
          }
        },
        episodic_memory: {
          conversation_threads: [], // Simplified - not tracking threads
          recent_interactions: []
        },
        semantic_memory: {
          activated_concepts: concepts.map(concept => ({
            id: concept.id,
            name: concept.properties.name || 'Unknown',
            activation_strength: Math.random() * 0.5 + 0.5,
            relevance_score: Math.random() * 0.8 + 0.2
          })),
          concept_relationships: []
        }
      };
    } catch (error) {
      console.error('Error getting brain memory context:', error);
      // Return empty context structure
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

  // Close method (no-op for HTTP client)
  async close(): Promise<void> {
    console.log('🔌 Neo4j HTTP client service closed');
  }
}

// Export simple service instance
export const neo4jService = new SimpleNeo4jService();

// For backward compatibility
export const productionBrainService = neo4jService;
export const getNeo4jService = () => neo4jService;
