/**
 * Simple MCP Client without SDK
 * Run with: bun simple-client.js
 */

import { API_ENDPOINTS, USER_ID } from "./tests/constants.js";
import { randomUUID } from "crypto";
import readline from "readline";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

// URL constants
const baseUrl = API_ENDPOINTS.LOCAL;
const apiUrl = `${baseUrl}/api/mcp/neo4j`;
const sseUrl = `${apiUrl}/sse`;
const messagesUrl = `${apiUrl}/messages`;

// Session ID and tools
const sessionId = randomUUID();
let availableTools = [];

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Main function
async function main() {
  console.log(`${colors.blue}=== Simple MCP Client for Neo4j ===${colors.reset}`);
  
  try {
    // Step 1: Get available tools
    await getTools();
    
    // Step 2: Connect to SSE
    const eventSource = await connectToSSE();
    
    // Step 3: Interactive prompt
    promptUser();
    
    // Handle Ctrl+C
    process.on("SIGINT", () => {
      console.log(`\n${colors.yellow}Interrupted. Disconnecting...${colors.reset}`);
      eventSource.close();
      rl.close();
      process.exit(0);
    });
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    rl.close();
    process.exit(1);
  }
}

// Get available tools
async function getTools() {
  console.log(`${colors.blue}Discovering tools...${colors.reset}`);
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    availableTools = data.availableTools || [];
    
    console.log(`${colors.green}✓ Found ${availableTools.length} tools:${colors.reset}`);
    
    availableTools.forEach((tool, index) => {
      console.log(`${colors.green}${index + 1}. ${tool.name}${colors.reset} - ${tool.description || 'No description'}`);
    });
    
    return availableTools;
  } catch (error) {
    console.error(`${colors.red}Failed to get tools: ${error.message}${colors.reset}`);
    throw error;
  }
}

// Connect to SSE endpoint
async function connectToSSE() {
  console.log(`${colors.blue}Connecting to SSE with session ID: ${colors.cyan}${sessionId}${colors.reset}`);
  
  // Create the EventSource
  const eventSourceUrl = `${sseUrl}?sessionId=${sessionId}`;
  console.log(`${colors.blue}SSE URL: ${colors.cyan}${eventSourceUrl}${colors.reset}`);
  
  // Use native fetch with streams instead of EventSource for better control
  const response = await fetch(eventSourceUrl, {
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to connect to SSE: ${response.status}`);
  }
  
  console.log(`${colors.green}✓ Connected to SSE${colors.reset}`);
  
  // Get the reader from the response body stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  // Start reading the stream in the background
  readSSEStream(reader, decoder);
  
  // Return a fake EventSource-like object with a close method
  return {
    close: () => {
      console.log(`${colors.yellow}Closing SSE connection...${colors.reset}`);
      // The connection will close when the reader is done or cancelled
      reader.cancel();
    }
  };
}

// Read the SSE stream
async function readSSEStream(reader, decoder) {
  try {
    while (true) {
      const { value, done } = await reader.read();
      
      if (done) {
        console.log(`${colors.yellow}SSE stream closed${colors.reset}`);
        break;
      }
      
      // Decode the received chunk
      const chunk = decoder.decode(value, { stream: true });
      
      // Process SSE messages
      const events = chunk.split('\n\n');
      
      for (const event of events) {
        if (!event.trim()) continue;
        
        // Extract the data part
        const dataMatch = event.match(/^data: (.+)$/m);
        if (dataMatch) {
          const data = dataMatch[1];
          try {
            // Try to parse as JSON
            const jsonData = JSON.parse(data);
            console.log(`${colors.magenta}[Server]${colors.reset} ${colors.cyan}${JSON.stringify(jsonData, null, 2)}${colors.reset}`);
          } catch (e) {
            // Not JSON, print as text
            console.log(`${colors.magenta}[Server]${colors.reset} ${data}`);
          }
        } else if (event.trim()) {
          // Print raw event if it doesn't match the data format
          console.log(`${colors.yellow}[Raw SSE]${colors.reset} ${event.trim()}`);
        }
      }
    }
  } catch (error) {
    console.error(`${colors.red}SSE read error: ${error.message}${colors.reset}`);
  }
}

// Call an MCP tool
async function callTool(toolName) {
  console.log(`${colors.blue}Calling tool: ${colors.cyan}${toolName}${colors.reset}`);
  
  try {
    // Create a request ID
    const requestId = randomUUID();
    
    // Build the payload
    const payload = {
      jsonrpc: "2.0",
      method: "mcp.call_tool",
      params: {
        name: toolName,
        arguments: {
          userId: USER_ID,
          limit: 5
        }
      },
      id: requestId
    };
    
    // Debug the payload
    console.log(`${colors.blue}Request payload:${colors.reset}`);
    console.log(JSON.stringify(payload, null, 2));
    
    // Call the tool with the session ID in the URL
    const messagesUrlWithSession = `${messagesUrl}?sessionId=${sessionId}`;
    console.log(`${colors.blue}Sending request to: ${colors.cyan}${messagesUrlWithSession}${colors.reset}`);
    
    const response = await fetch(messagesUrlWithSession, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Process the response
    const result = await response.json();
    
    console.log(`${colors.green}✓ Tool result:${colors.reset}`);
    console.log(JSON.stringify(result, null, 2));
    
    // Extract and display the content
    if (result.result && result.result.content) {
      result.result.content.forEach(item => {
        if (item.type === 'text') {
          try {
            const parsed = JSON.parse(item.text);
            console.log(JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log(item.text);
          }
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error(`${colors.red}Error calling tool: ${error.message}${colors.reset}`);
    return null;
  }
}

// Interactive prompt
function promptUser() {
  rl.question(`\n${colors.yellow}Enter tool number to call (or 'q' to quit): ${colors.reset}`, async (answer) => {
    if (answer.toLowerCase() === 'q') {
      console.log(`${colors.blue}Goodbye!${colors.reset}`);
      rl.close();
      process.exit(0);
      return;
    }
    
    const toolIndex = parseInt(answer) - 1;
    if (isNaN(toolIndex) || toolIndex < 0 || toolIndex >= availableTools.length) {
      console.log(`${colors.red}Invalid tool number. Please try again.${colors.reset}`);
      promptUser();
      return;
    }
    
    const selectedTool = availableTools[toolIndex];
    await callTool(selectedTool.name);
    
    // Continue the prompt loop
    promptUser();
  });
}

// Start the client
main();