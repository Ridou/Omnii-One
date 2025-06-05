import { mcpClientManager } from './mcp-client-manager';

export class GraphService {
  private async getClient() {
    return mcpClientManager.connect('neo4j-tools');
  }
  
  async listConcepts(limit = 100, filter?: string) {
    try {
      const client = await this.getClient();
      return await client.invoke('listConcepts', { limit, filter });
    } catch (error) {
      console.error('Error in listConcepts:', error);
      return [];
    }
  }
  
  async getContextForNode(nodeId: string) {
    try {
      const client = await this.getClient();
      return await client.invoke('getContextForNode', { nodeId });
    } catch (error) {
      console.error('Error in getContextForNode:', error);
      return { node: null, relationships: [] };
    }
  }
  
  async syncFromNeo4j(force = false) {
    try {
      const client = await this.getClient();
      return await client.invoke('syncFromNeo4j', { force });
    } catch (error) {
      console.error('Error in syncFromNeo4j:', error);
      return { status: 'error', message: String(error) };
    }
  }
}

export const graphService = new GraphService(); 