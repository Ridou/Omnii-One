import { createSession } from '../config/neo4j.config';
import type { NodeData, NodeType, ContextData, SearchResult, HealthCheck, BrainMemoryContext, BulkImportResult } from '../types/neo4j.types';
import type { Record as Neo4jRecord } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

export class Neo4jService {
  private getSession() {
    return createSession();
  }

  /**
   * Health check for the Neo4j service
   */
  async healthCheck(): Promise<HealthCheck> {
    const session = this.getSession();
    
    try {
      // Test connectivity
      await session.run('RETURN 1 as health_test');
      
      // Get metrics
      const [conceptsResult, dbInfoResult] = await Promise.all([
        session.run('MATCH (c:Concept) RETURN count(c) as totalConcepts'),
        session.run('CALL dbms.components() YIELD name, versions RETURN name, versions[0] as version')
      ]);
      
      const totalConcepts = conceptsResult.records[0]?.get('totalConcepts').toNumber() || 0;
      const dbInfo = dbInfoResult.records[0];
      
      // Detect connection type
      const uri = process.env.NEO4J_URI || '';
      const isRailwayTemplate = uri.includes('railway.internal');
      const isExternalAuraDB = uri.includes('databases.neo4j.io');
      const connectionType = isRailwayTemplate ? 'Railway Template' : 
                            isExternalAuraDB ? 'External AuraDB' : 'Other';
      
      return {
        status: 'healthy',
        neo4j: true,
        connection_type: connectionType,
        metrics: {
          total_concepts: totalConcepts,
          neo4j_version: dbInfo?.get('version') || 'unknown',
          railway_internal: isRailwayTemplate,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Neo4j health check failed:', error);
      return {
        status: 'unhealthy',
        neo4j: false,
        connection_type: 'unknown',
        metrics: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    } finally {
      await session.close();
    }
  }

  /**
   * List all nodes of a specific type for a user
   */
  async listNodes(userId: string, nodeType: NodeType = 'Concept', limit = 100, filter?: string): Promise<NodeData[]> {
    const session = this.getSession();
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
      
      // Sanitize limit parameter
      const sanitizedLimit = neo4j.int(Number.parseInt(String(limit), 10));
      
      const result = await session.run(
        `
        MATCH (n:${nodeType})
        WHERE n.user_id = $userId ${filterQuery}
        RETURN n, labels(n) as labels
        LIMIT $limit
        `,
        { 
          userId, 
          limit: sanitizedLimit,
          filter 
        }
      );
      
      const nodes = result.records.map((record: Neo4jRecord) => {
        const node = record.get('n');
        const labels = record.get('labels');
        return {
          id: node.identity.toString(),
          labels: labels,
          properties: node.properties
        };
      });
      
      return nodes;
    } catch (error) {
      console.error(`Error in listNodes(${nodeType}):`, error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Search specifically for concepts
   */
  async searchSimilarConcepts(userId: string, text: string, limit = 5): Promise<SearchResult[]> {
    const session = this.getSession();
    try {
      // Sanitize limit parameter
      const sanitizedLimit = neo4j.int(Number.parseInt(String(limit), 10));
      
      // Simple text search
      const result = await session.run(
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
          limit: sanitizedLimit
        }
      );
      
      const concepts = result.records.map((record: Neo4jRecord) => {
        const node = record.get('c');
        const labels = record.get('nodeLabels');
        const relevance = record.get('relevance');
        
        return {
          id: node.identity.toString(),
          labels: labels,
          properties: { ...node.properties, similarity: relevance.toNumber() / 3.0 },
          score: relevance.toNumber() / 3.0
        };
      });
      
      return concepts;
    } catch (error) {
      console.error('Error in searchSimilarConcepts:', error);
      return [];
    } finally {
      await session.close();
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
   * Get context for a specific node by ID
   */
  async getNodeContext(nodeId: string, userId: string): Promise<ContextData> {
    const session = this.getSession();
    try {
      // Get the node and its relationships
      const result = await session.run(
        `
        MATCH (n)
        WHERE id(n) = $nodeId
        OPTIONAL MATCH (n)-[r]-(connected)
        WHERE (n.user_id = $userId OR connected.user_id = $userId)
        RETURN n, labels(n) as nodeLabels, 
               collect(DISTINCT {
                 relationship: r,
                 connectedNode: connected,
                 connectedLabels: labels(connected)
               }) as connections
        `,
        { nodeId: neo4j.int(nodeId), userId }
      );

      if (result.records.length === 0) {
        return { nodes: [], relationships: [] };
      }

      const record = result.records[0];
      const node = record.get('n');
      const nodeLabels = record.get('nodeLabels');
      const connections = record.get('connections');

      const nodes: NodeData[] = [{
        id: node.identity.toString(),
        labels: nodeLabels,
        properties: node.properties
      }];

      const relationships: any[] = [];

      // Add connected nodes and relationships
      connections.forEach((conn: any) => {
        if (conn.connectedNode && conn.relationship) {
          nodes.push({
            id: conn.connectedNode.identity.toString(),
            labels: conn.connectedLabels,
            properties: conn.connectedNode.properties
          });

          relationships.push({
            type: conn.relationship.type,
            properties: conn.relationship.properties,
            source: conn.relationship.start.toString(),
            target: conn.relationship.end.toString()
          });
        }
      });

      return { nodes, relationships };
    } catch (error) {
      console.error('Error in getNodeContext:', error);
      return { nodes: [], relationships: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Backward compatibility method for getConceptsForContext
   */
  async getConceptsForContext(userId: string, query: string, limit = 3): Promise<{concepts: NodeData[], relationships: any[]}> {
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
   * Get brain memory context (simplified version for backward compatibility)
   */
  async getBrainMemoryContext(userId: string, message: string, channel: 'sms' | 'chat', sourceIdentifier: string): Promise<BrainMemoryContext> {
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
            name: concept.properties.name as string || 'Unknown',
            activation_strength: Math.random() * 0.5 + 0.5,
            relevance_score: concept.score || 0
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

  /**
   * Railway template bulk import feature
   */
  async bulkImportFromCSV(nodeUrls?: string[], relationUrls?: string[]): Promise<BulkImportResult> {
    if (!nodeUrls?.length && !relationUrls?.length) {
      return { imported: 0, errors: ['No CSV URLs provided'] };
    }

    const session = this.getSession();
    let imported = 0;
    const errors: string[] = [];

    try {
      // Import nodes from CSV URLs (Railway template feature)
      if (nodeUrls?.length) {
        for (const url of nodeUrls) {
          try {
            const result = await session.run(
              `LOAD CSV WITH HEADERS FROM $url AS row
               CREATE (n:ImportedNode)
               SET n = row
               RETURN count(n) as imported`,
              { url }
            );
            imported += result.records[0]?.get('imported').toNumber() || 0;
          } catch (error) {
            errors.push(`Node CSV ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Import relationships from CSV URLs (Railway template feature)
      if (relationUrls?.length) {
        for (const url of relationUrls) {
          try {
            const result = await session.run(
              `LOAD CSV WITH HEADERS FROM $url AS row
               MATCH (a), (b)
               WHERE a.id = row.from_id AND b.id = row.to_id
               CREATE (a)-[r:IMPORTED_RELATION]->(b)
               SET r = row
               RETURN count(r) as imported`,
              { url }
            );
            imported += result.records[0]?.get('imported').toNumber() || 0;
          } catch (error) {
            errors.push(`Relation CSV ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      return { imported, errors };
    } finally {
      await session.close();
    }
  }

  /**
   * Store chat conversation - creates ChatMessage and Memory nodes
   * This is the critical method that enables chat->Neo4j pipeline
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
    console.log(`[Neo4j-BrainMemory] 💬 Storing chat conversation for user: ${data.user_id}`);
    
    const session = this.getSession();
    
    try {
      const messageId = uuidv4();
      
      // Store ChatMessage and Memory nodes following Neo4j best practices
      const result = await session.run(`
        // Create ChatMessage node
        CREATE (msg:ChatMessage {
          id: $id,
          content: $content,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          channel: 'chat',
          source_identifier: $chat_id,
          chat_metadata: $chat_metadata
        })
        
        // Link to User (ensure User exists)
        WITH msg
        MERGE (user:User {id: $user_id})
        MERGE (user)-[:OWNS]->(msg)
        
        // Create Memory node for episodic memory
        CREATE (memory:Memory {
          id: $memory_id,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          memory_type: 'episodic',
          consolidation_status: 'fresh',
          episode_type: 'conversation',
          channel: 'chat',
          original_message_id: $id
        })
        
        // Create relationship
        CREATE (msg)-[:HAS_MEMORY]->(memory)
        
        RETURN msg, memory
      `, {
        id: messageId,
        content: data.content,
        timestamp: new Date().toISOString(),
        user_id: data.user_id,
        chat_id: data.chat_id,
        chat_metadata: JSON.stringify({
          chat_id: data.chat_id,
          websocket_session_id: data.websocket_session_id,
          is_group_chat: data.is_group_chat || false,
          participants: data.participants || []
        }),
        memory_id: uuidv4()
      });

      console.log(`[Neo4j-BrainMemory] ✅ Stored chat conversation: ${messageId}`);
      
      return {
        id: messageId,
        user_id: data.user_id,
        content: data.content,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[Neo4j-BrainMemory] ❌ Failed to store chat conversation:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Store SMS conversation - creates ChatMessage and Memory nodes
   */
  async storeSMSConversation(data: {
    user_id: string;
    content: string;
    phone_number: string;
    is_incoming: boolean;
    local_datetime?: string;
    google_service_context?: any;
  }): Promise<any> {
    console.log(`[Neo4j-BrainMemory] 💾 Storing SMS conversation for user: ${data.user_id}`);
    
    const session = this.getSession();
    
    try {
      const messageId = uuidv4();
      
      const result = await session.run(`
        // Create ChatMessage node for SMS
        CREATE (msg:ChatMessage {
          id: $id,
          content: $content,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          channel: 'sms',
          source_identifier: $phone_number,
          sms_metadata: $sms_metadata
        })
        
        // Link to User (ensure User exists)
        WITH msg
        MERGE (user:User {id: $user_id})
        MERGE (user)-[:OWNS]->(msg)
        
        // Create Memory node
        CREATE (memory:Memory {
          id: $memory_id,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          memory_type: 'episodic',
          consolidation_status: 'fresh',
          episode_type: 'conversation',
          channel: 'sms',
          original_message_id: $id
        })
        
        // Create relationship
        CREATE (msg)-[:HAS_MEMORY]->(memory)
        
        RETURN msg, memory
      `, {
        id: messageId,
        content: data.content,
        timestamp: new Date().toISOString(),
        user_id: data.user_id,
        phone_number: data.phone_number,
        sms_metadata: JSON.stringify({
          phone_number: data.phone_number,
          is_incoming: data.is_incoming,
          local_datetime: data.local_datetime
        }),
        memory_id: uuidv4()
      });

      console.log(`[Neo4j-BrainMemory] ✅ Stored SMS conversation: ${messageId}`);
      
      return {
        id: messageId,
        user_id: data.user_id,
        content: data.content,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[Neo4j-BrainMemory] ❌ Failed to store SMS conversation:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }
}

export const neo4jService = new Neo4jService(); 