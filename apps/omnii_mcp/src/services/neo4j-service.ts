import neo4j from 'neo4j-driver';
import type { Record as Neo4jRecord, Driver, Session } from 'neo4j-driver';
import { redisCache } from './redis-cache';
import * as dotenv from 'dotenv';

dotenv.config();

// Neo4j configuration with validation
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USER;
const neo4jPassword = process.env.NEO4J_PASSWORD;
const neo4jDatabase = process.env.NEO4J_DATABASE || 'neo4j';

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

class Neo4jService {
  private driver: Driver | null = null;

  constructor() {
    try {
      // Only initialize if all required environment variables are present
      if (neo4jUri && neo4jUser && neo4jPassword) {
        this.driver = neo4j.driver(
          neo4jUri,
          neo4j.auth.basic(neo4jUser, neo4jPassword)
        );
        console.log('✅ Neo4j connection initialized successfully');
      } else {
        console.warn('⚠️  Neo4j not initialized - missing environment variables:');
        if (!neo4jUri) console.warn('   - NEO4J_URI is required');
        if (!neo4jUser) console.warn('   - NEO4J_USER is required');
        if (!neo4jPassword) console.warn('   - NEO4J_PASSWORD is required');
        console.warn('   Neo4j endpoints will return empty results until configured.');
      }
    } catch (error) {
      console.error('❌ Error initializing Neo4j:', error);
    }
  }

  private getSession(): Session | null {
    if (!this.driver) {
      console.warn('⚠️  Neo4j driver not available - check environment variables');
      return null;
    }
    return this.driver.session({ database: neo4jDatabase });
  }

  /**
   * List all nodes of a specific type for a user
   */
  async listNodes(userId: string, nodeType: NodeType = 'Concept', limit = 100, filter?: string): Promise<NodeData[]> {
    const cacheKey = redisCache.getCacheKey(userId, `list${nodeType}s`, `${limit}-${filter || ''}`);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for list${nodeType}s`);
      return cachedData;
    }

    const session = this.getSession();
    if (!session) {
      console.error('No Neo4j session available');
      return [];
    }

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
      
      await redisCache.set(cacheKey, nodes);
      return nodes;
    } catch (error) {
      console.error(`Error in listNodes(${nodeType}):`, error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Get context for a specific node, including related nodes of any type
   */
  async getContextForNode(userId: string, nodeId: string): Promise<ContextData> {
    const cacheKey = redisCache.getCacheKey(userId, 'getContextForNode', nodeId);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache hit for getContextForNode');
      return cachedData;
    }

    const session = this.getSession();
    if (!session) {
      console.error('No Neo4j session available');
      return { nodes: [], relationships: [] };
    }

    try {
      const result = await session.run(
        `
        MATCH (n)
        WHERE id(n) = $nodeId AND n.user_id = $userId
        WITH n, labels(n) as sourceLabels
        MATCH (n)-[r]-(m)
        WHERE m.user_id = $userId
        RETURN n, r, m, sourceLabels, labels(m) as targetLabels
        `,
        { 
          nodeId: Number.parseInt(nodeId), 
          userId 
        }
      );
      
      if (result.records.length === 0) {
        throw new Error(`Node with ID ${nodeId} not found or access denied`);
      }
      
      const nodes: Map<string, NodeData> = new Map();
      const relationships: RelationshipData[] = [];
      
      // First extract the source node (n)
      const firstRecord = result.records[0];
      const sourceNode = firstRecord.get('n');
      const sourceLabels = firstRecord.get('sourceLabels');
      
      // Add source node to nodes map
      nodes.set(sourceNode.identity.toString(), {
        id: sourceNode.identity.toString(),
        labels: sourceLabels,
        properties: sourceNode.properties
      });
      
      // Process all records for relationships and target nodes
      for (const record of result.records) {
        const r = record.get('r');
        const targetNode = record.get('m');
        const targetLabels = record.get('targetLabels');
        const targetId = targetNode.identity.toString();
        
        // Add target node if not already in map
        if (!nodes.has(targetId)) {
          nodes.set(targetId, {
            id: targetId,
            labels: targetLabels,
            properties: targetNode.properties
          });
        }
        
        // Add relationship
        relationships.push({
          type: r.type,
          properties: r.properties,
          source: sourceNode.identity.toString(),
          target: targetId
        });
      }
      
      const contextData: ContextData = { 
        nodes: Array.from(nodes.values()),
        relationships 
      };
      
      await redisCache.set(cacheKey, contextData);
      return contextData;
    } catch (error) {
      console.error('Error in getContextForNode:', error);
      return { nodes: [], relationships: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Search for similar nodes across all available node types
   */
  async searchAllNodeTypes(userId: string, text: string, limit = 5): Promise<NodeData[]> {
    const cacheKey = redisCache.getCacheKey(userId, 'searchAllNodeTypes', `${text}-${limit}`);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache hit for searchAllNodeTypes');
      return cachedData;
    }

    const session = this.getSession();
    if (!session) {
      console.error('No Neo4j session available');
      return [];
    }

    try {
      // Sanitize limit parameter
      const sanitizedLimit = neo4j.int(Number.parseInt(String(limit), 10));
      
      const result = await session.run(
        `
        // Match all nodes that belong to this user
        MATCH (n)
        WHERE n.user_id = $userId
        
        // Calculate relevance score based on node type and properties
        WITH n, labels(n) as nodeLabels,
          CASE
            WHEN 'Concept' IN labels(n) THEN
              CASE
                WHEN n.name CONTAINS $text THEN 5
                WHEN n.content CONTAINS $text THEN 3
                WHEN n.description CONTAINS $text THEN 2
                ELSE 0
              END
            WHEN 'Email' IN labels(n) THEN
              CASE
                WHEN n.subject CONTAINS $text THEN 5
                WHEN n.snippet CONTAINS $text THEN 3
                WHEN n.from CONTAINS $text THEN 2
                ELSE 0
              END
            WHEN 'Event' IN labels(n) THEN
              CASE
                WHEN n.title CONTAINS $text THEN 5
                WHEN n.description CONTAINS $text THEN 3
                WHEN n.location CONTAINS $text THEN 2
                ELSE 0
              END
            ELSE 0
          END AS relevance
        
        // Filter out irrelevant nodes
        WHERE relevance > 0
        
        // Return results sorted by relevance
        RETURN n, nodeLabels, relevance
        ORDER BY relevance DESC
        LIMIT $limit
        `,
        { 
          userId, 
          text, 
          limit: sanitizedLimit
        }
      );
      
      const nodes = result.records.map((record: Neo4jRecord) => {
        const node = record.get('n');
        const labels = record.get('nodeLabels');
        const relevance = record.get('relevance');
        
        return {
          id: node.identity.toString(),
          labels: labels,
          properties: { ...node.properties, relevance } // Include relevance score in properties
        };
      });
      
      await redisCache.set(cacheKey, nodes);
      return nodes;
    } catch (error) {
      console.error('Error in searchAllNodeTypes:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Search specifically for concepts - retaining the original function for compatibility
   */
  async searchSimilarConcepts(userId: string, text: string, limit = 5): Promise<NodeData[]> {
    const cacheKey = redisCache.getCacheKey(userId, 'searchSimilarConcepts', `${text}-${limit}`);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache hit for searchSimilarConcepts');
      return cachedData;
    }

    const session = this.getSession();
    if (!session) {
      console.error('No Neo4j session available');
      return [];
    }

    try {
      // Sanitize limit parameter
      const sanitizedLimit = neo4j.int(Number.parseInt(String(limit), 10));
      
      // Using Neo4j's text similarity search with user_id filter
      const result = await session.run(
        `
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        WITH c, labels(c) as nodeLabels, 
             apoc.text.levenshteinSimilarity(c.name, $text) AS nameSim,
             CASE WHEN c.content IS NOT NULL 
               THEN apoc.text.levenshteinSimilarity(c.content, $text) 
               ELSE 0 
             END AS contentSim
        WITH c, nodeLabels, (nameSim * 2 + contentSim) / 3 AS similarity
        WHERE similarity > 0.3
        RETURN c, nodeLabels, similarity
        ORDER BY similarity DESC
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
        const similarity = record.get('similarity');
        
        return {
          id: node.identity.toString(),
          labels: labels,
          properties: { ...node.properties, similarity }
        };
      });
      
      await redisCache.set(cacheKey, concepts);
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
   * This will search across multiple node types and build a relevant context graph
   */
  async getContextForQuery(userId: string, query: string, limit = 5): Promise<ContextData> {
    const cacheKey = redisCache.getCacheKey(userId, 'getContextForQuery', `${query}-${limit}`);
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache hit for getContextForQuery');
      return cachedData;
    }

    // Sanitize limit parameter for Neo4j query
    const sanitizedNumber = Number.parseInt(String(limit), 10);

    // First find relevant nodes across all types
    const relevantNodes = await this.searchAllNodeTypes(userId, query, sanitizedNumber);
    
    // No nodes found
    if (relevantNodes.length === 0) {
      return { nodes: [], relationships: [] };
    }
    
    const nodeIds = relevantNodes.map(n => n.id);
    
    const session = this.getSession();
    if (!session) {
      console.error('No Neo4j session available');
      return { nodes: relevantNodes, relationships: [] };
    }
    
    try {
      // Get relationships between the found nodes
      const result = await session.run(
        `
        MATCH (n1)-[r]-(n2)
        WHERE id(n1) IN $nodeIds AND id(n2) IN $nodeIds
        AND n1.user_id = $userId AND n2.user_id = $userId
        RETURN r, id(n1) as source, id(n2) as target
        `,
        { 
          nodeIds: nodeIds.map(id => neo4j.int(Number.parseInt(id, 10))), 
          userId 
        }
      );
      
      const relationships = result.records.map(record => {
        const r = record.get('r');
        const source = record.get('source').toString();
        const target = record.get('target').toString();
        
        return {
          type: r.type,
          properties: r.properties,
          source,
          target
        };
      });
      
      const contextData: ContextData = { 
        nodes: relevantNodes,
        relationships
      };
      
      await redisCache.set(cacheKey, contextData);
      return contextData;
    } catch (error) {
      console.error('Error in getContextForQuery:', error);
      return { nodes: relevantNodes, relationships: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Backward compatibility method for getConceptsForContext
   */
  async getConceptsForContext(userId: string, query: string, limit = 3): Promise<{concepts: NodeData[], relationships: RelationshipData[]}> {
    // Sanitize limit parameter
    const sanitizedNumber = Number.parseInt(String(limit), 10);
    
    const contextData = await this.getContextForQuery(userId, query, sanitizedNumber);
    
    // For backward compatibility, filter to only include Concept nodes
    const concepts = contextData.nodes.filter(node => 
      node.labels.includes('Concept')
    );
    
    return {
      concepts,
      relationships: contextData.relationships
    };
  }

  // Close the driver when the application shuts down
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
    }
  }
}

export const neo4jService = new Neo4jService(); 