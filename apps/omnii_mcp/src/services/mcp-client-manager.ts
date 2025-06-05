// @ts-ignore - Import from main package instead of specific paths
import { Client, SseClient } from '@modelcontextprotocol/sdk';

class McpClientManager {
  private clients: Map<string, Client> = new Map();
  
  async connect(toolName: string): Promise<Client> {
    if (this.clients.has(toolName)) {
      return this.clients.get(toolName)!;
    }
    
    let endpoint = '';
    if (toolName === 'neo4j-tools') {
      endpoint = '/api/mcp/neo4j';
    } else {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    console.log(`Connecting to MCP endpoint: ${endpoint}`);
    const client = new SseClient(endpoint);
    await client.connect();
    this.clients.set(toolName, client);
    return client;
  }
  
  async ping(toolName: string): Promise<boolean> {
    try {
      const client = await this.connect(toolName);
      await client.ping();
      return true;
    } catch (e) {
      console.error(`Failed to ping ${toolName}:`, e);
      return false;
    }
  }
  
  async disconnect(toolName?: string): Promise<void> {
    if (toolName) {
      const client = this.clients.get(toolName);
      if (client) {
        await client.disconnect();
        this.clients.delete(toolName);
      }
    } else {
      // Disconnect all clients
      for (const [name, client] of this.clients.entries()) {
        await client.disconnect();
        this.clients.delete(name);
      }
    }
  }
}

export const mcpClientManager = new McpClientManager(); 