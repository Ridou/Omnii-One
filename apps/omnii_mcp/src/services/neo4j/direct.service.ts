import neo4j, { Driver, Session, Integer } from 'neo4j-driver';
import type { Record as Neo4jRecord } from 'neo4j-driver';

interface ConceptNode {
  id: string;
  labels: string[];
  properties: { [key: string]: any };
}

interface SearchResult {
  concepts: ConceptNode[];
  totalFound: number;
  searchTerm: string;
  executionTime: number;
}

// Helper function to convert Neo4j integers to regular numbers
const toNumber = (value: any): number => {
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  if (value && typeof value === 'object' && typeof value.low === 'number') {
    return value.low;
  }
  if (typeof value === 'number') {
    return value;
  }
  return parseInt(value?.toString() || '0', 10);
};

export class Neo4jDirectService {
  private driver: Driver;
  private connected: boolean = false;

  constructor() {
    console.log('🚀 Initializing Direct Neo4j Service...');
    
    this.driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(
        process.env.NEO4J_USER!,
        process.env.NEO4J_PASSWORD!
      ),
      {
        maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
        maxConnectionPoolSize: 10,
        connectionAcquisitionTimeout: 10000, // 10 seconds
        connectionTimeout: 10000, // 10 seconds
        disableLosslessIntegers: true,
        logging: {
          level: 'info',
          logger: (level: string, message: string) => {
            console.log(`[Neo4j-Direct-${level.toUpperCase()}] ${message}`);
          }
        }
      }
    );

    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      const session = this.driver.session();
      const result = await session.run('RETURN 1 as test');
      await session.close();
      
      this.connected = true;
      console.log('✅ Direct Neo4j connection established successfully!');
      
      // Get total concept count with proper integer handling
      const countSession = this.driver.session();
      const countResult = await countSession.run('MATCH (c:Concept) RETURN count(c) as total');
      const totalConcepts = toNumber(countResult.records[0].get('total'));
      await countSession.close();
      
      console.log(`🧠 Found ${totalConcepts} total concepts in Neo4j`);
      
    } catch (error) {
      this.connected = false;
      console.error('❌ Direct Neo4j connection failed:', error);
    }
  }

  /**
   * Search concepts directly in Neo4j - no API routes
   */
  async searchConcepts(userId: string, searchTerm: string, limit: number = 20): Promise<SearchResult> {
    if (!this.connected) {
      throw new Error('Neo4j not connected');
    }

    const startTime = Date.now();
    const session = this.driver.session();
    
    try {
      console.log(`🔍 Direct Neo4j search: "${searchTerm}" for user: ${userId}`);
      
      // Simplified search query - avoid keywords field for now since it has type issues
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        AND (
          coalesce(toLower(toString(c.name)), '') CONTAINS toLower($searchTerm) OR
          coalesce(toLower(toString(c.content)), '') CONTAINS toLower($searchTerm) OR
          coalesce(toLower(toString(c.description)), '') CONTAINS toLower($searchTerm)
        )
        WITH c, labels(c) as nodeLabels,
             CASE 
               WHEN coalesce(toLower(toString(c.name)), '') = toLower($searchTerm) THEN 10
               WHEN coalesce(toLower(toString(c.name)), '') CONTAINS toLower($searchTerm) THEN 8
               WHEN coalesce(toLower(toString(c.content)), '') CONTAINS toLower($searchTerm) THEN 6
               WHEN coalesce(toLower(toString(c.description)), '') CONTAINS toLower($searchTerm) THEN 4
               ELSE 1
             END as relevanceScore
        RETURN c, nodeLabels, relevanceScore
        ORDER BY relevanceScore DESC, c.name ASC
        LIMIT $limit
      `, {
        userId,
        searchTerm,
        limit: neo4j.int(limit)
      });

      const concepts: ConceptNode[] = result.records.map((record: Neo4jRecord) => {
        const node = record.get('c');
        const labels = record.get('nodeLabels');
        const relevanceScore = record.get('relevanceScore');

        return {
          id: node.identity.toString(),
          labels: labels,
          properties: {
            ...node.properties,
            relevanceScore: toNumber(relevanceScore)
          }
        };
      });

      const executionTime = Date.now() - startTime;

      console.log(`✅ Direct search found ${concepts.length} concepts in ${executionTime}ms`);

      return {
        concepts,
        totalFound: concepts.length,
        searchTerm,
        executionTime
      };

    } catch (error) {
      console.error('❌ Direct Neo4j search failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * List concepts directly from Neo4j - no API routes
   */
  async listConcepts(userId: string, limit: number = 100, offset: number = 0): Promise<SearchResult> {
    if (!this.connected) {
      throw new Error('Neo4j not connected');
    }

    const startTime = Date.now();
    const session = this.driver.session();
    
    try {
      console.log(`📋 Direct Neo4j list: ${limit} concepts for user: ${userId}`);
      
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        WITH c, labels(c) as nodeLabels
        RETURN c, nodeLabels
        ORDER BY 
          CASE WHEN c.last_mentioned IS NOT NULL THEN c.last_mentioned ELSE c.created_at END DESC,
          c.name ASC
        SKIP $offset
        LIMIT $limit
      `, {
        userId,
        limit: neo4j.int(limit),
        offset: neo4j.int(offset)
      });

      const concepts: ConceptNode[] = result.records.map((record: Neo4jRecord) => {
        const node = record.get('c');
        const labels = record.get('nodeLabels');

        return {
          id: node.identity.toString(),
          labels: labels,
          properties: node.properties
        };
      });

      const executionTime = Date.now() - startTime;

      console.log(`✅ Direct list found ${concepts.length} concepts in ${executionTime}ms`);

      return {
        concepts,
        totalFound: concepts.length,
        searchTerm: '',
        executionTime
      };

    } catch (error) {
      console.error('❌ Direct Neo4j list failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get concept by ID directly from Neo4j
   */
  async getConceptById(conceptId: string, userId: string): Promise<ConceptNode | null> {
    if (!this.connected) {
      throw new Error('Neo4j not connected');
    }

    const session = this.driver.session();
    
    try {
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE id(c) = $conceptId AND c.user_id = $userId
        RETURN c, labels(c) as nodeLabels
      `, {
        conceptId: neo4j.int(conceptId),
        userId
      });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const node = record.get('c');
      const labels = record.get('nodeLabels');

      return {
        id: node.identity.toString(),
        labels: labels,
        properties: node.properties
      };

    } catch (error) {
      console.error('❌ Direct Neo4j get concept failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get total concept count for a user
   */
  async getConceptCount(userId: string): Promise<number> {
    if (!this.connected) {
      return 0;
    }

    const session = this.driver.session();
    
    try {
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        RETURN count(c) as total
      `, { userId });

      const total = result.records[0].get('total');
      return toNumber(total);

    } catch (error) {
      console.error('❌ Direct Neo4j count failed:', error);
      return 0;
    } finally {
      await session.close();
    }
  }

  /**
   * Test the connection and return status
   */
  async healthCheck(): Promise<{
    connected: boolean;
    totalConcepts: number;
    responseTime: number;
    version?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const session = this.driver.session();
      
      // Test basic connectivity
      await session.run('RETURN 1 as test');
      
      // Get total concepts with proper integer handling
      const countResult = await session.run('MATCH (c:Concept) RETURN count(c) as total');
      const totalConcepts = toNumber(countResult.records[0].get('total'));
      
      await session.close();
      
      const responseTime = Date.now() - startTime;
      
      return {
        connected: true,
        totalConcepts,
        responseTime,
        version: 'direct-connection'
      };
      
    } catch (error) {
      console.error('❌ Direct Neo4j health check failed:', error);
      return {
        connected: false,
        totalConcepts: 0,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Close the driver connection
   */
  async close(): Promise<void> {
    await this.driver.close();
    this.connected = false;
    console.log('🔌 Direct Neo4j service closed');
  }

  get isConnected(): boolean {
    return this.connected;
  }
} 