import type { Neo4jQueryResult, Neo4jHTTPConfig, Neo4jHTTPError } from '../../types/neo4j.types';

/**
 * Neo4j HTTP Query API Client
 *
 * Uses Neo4j's official HTTP Query API v2 to execute Cypher queries.
 * This is the recommended approach for Bun runtime to avoid TCP-level
 * incompatibilities with the neo4j-driver.
 *
 * API Documentation: https://neo4j.com/docs/http-api/current/
 */
export class Neo4jHTTPClient {
  private config: Neo4jHTTPConfig;
  private authHeader: string;
  private baseUrl: string;

  constructor(config: Neo4jHTTPConfig) {
    this.config = config;

    // Generate Basic auth header
    const credentials = `${config.user}:${config.password}`;
    this.authHeader = `Basic ${btoa(credentials)}`;

    // Build base URL for query endpoint
    this.baseUrl = `${config.uri}/db/${config.database}/query/v2`;
  }

  /**
   * Execute a Cypher query via HTTP Query API
   */
  async query(cypher: string, params?: Record<string, any>): Promise<Neo4jQueryResult> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          statement: cypher,
          parameters: params || {},
        }),
      });

      if (!response.ok) {
        // Handle HTTP errors
        const errorText = await response.text();
        let errorData: Neo4jHTTPError;

        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If response is not JSON, create error from status
          errorData = {
            code: `HTTP_${response.status}`,
            message: errorText || response.statusText,
          };
        }

        // Provide helpful error messages based on status code
        if (response.status === 401) {
          throw new Error(
            `Neo4j authentication failed. Check NEO4J_USER and NEO4J_PASSWORD. ` +
            `Error: ${errorData.message}`
          );
        } else if (response.status === 404) {
          throw new Error(
            `Neo4j database not found. Check NEO4J_DATABASE setting. ` +
            `Error: ${errorData.message}`
          );
        } else if (response.status === 500) {
          throw new Error(
            `Neo4j query execution failed. Possible Cypher syntax error. ` +
            `Error: ${errorData.message}`
          );
        } else {
          throw new Error(
            `Neo4j HTTP API error (${response.status}): ${errorData.message}`
          );
        }
      }

      const result = await response.json();
      return result;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Failed to connect to Neo4j at ${this.config.uri}. ` +
          `Check that NEO4J_URI is correct and instance is accessible.`
        );
      }

      // Re-throw our formatted errors
      throw error;
    }
  }

  /**
   * Test the connection by running a simple query
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('RETURN 1 as test');

      // Verify the response structure is as expected
      if (result.data && result.data.fields && result.data.values) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Neo4j HTTP connection test failed:', error);
      return false;
    }
  }

  /**
   * Get the HTTP endpoint URL being used
   */
  getEndpoint(): string {
    return this.baseUrl;
  }
}
