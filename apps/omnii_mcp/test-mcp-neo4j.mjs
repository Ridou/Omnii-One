/**
 * Test script for the MCP Neo4j integration
 * Run with: node test-mcp-neo4j.mjs
 */

// Use ESM import pattern with direct path
import { SseClient } from '@modelcontextprotocol/sdk/dist/esm/client/sse';
import readline from 'readline';

const API_URL = 'http://localhost:3000/api/mcp/neo4j';

async function testMcpNeo4j() {
  console.log('🔌 Connecting to MCP Neo4j server...');
  
  const client = new SseClient(API_URL);
  
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test ping
    await client.ping();
    console.log('✅ Ping successful');
    
    // Test listConcepts
    console.log('📋 Testing listConcepts...');
    const concepts = await client.invoke('listConcepts', { limit: 5 });
    console.log('✅ Received concepts:', JSON.stringify(concepts, null, 2));
    
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n🔍 Enter a node ID to get its context (or "exit" to quit):');
    
    rl.on('line', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        await client.disconnect();
        console.log('👋 Disconnected from MCP server');
        process.exit(0);
        return;
      }
      
      try {
        console.log(`🔍 Getting context for node ${input}...`);
        const context = await client.invoke('getContextForNode', { nodeId: input });
        console.log('✅ Node context:', JSON.stringify(context, null, 2));
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
      
      console.log('\n🔍 Enter another node ID (or "exit" to quit):');
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testMcpNeo4j(); 