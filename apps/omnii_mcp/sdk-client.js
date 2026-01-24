/**
 * MCP SDK Client for Neo4j
 * Run with: bun sdk-client.js
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { API_ENDPOINTS, USER_ID } from "./tests/constants.js";
import readline from "readline";

// Base URL for the MCP Neo4j server
const baseUrl = API_ENDPOINTS.LOCAL;
const apiUrl = `${baseUrl}/api/mcp/neo4j`;

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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log(`${colors.blue}=== MCP SDK Client for Neo4j ===${colors.reset}`);

  // Initialize MCP client
  const client = new Client({
    name: "neo4j-mcp-client",
    version: "1.0.0",
  });

  try {
    // Step 1: Connect to the MCP server via SSE
    console.log(
      `${colors.blue}Connecting to SSE endpoint: ${colors.cyan}${apiUrl}/sse${colors.reset}`
    );

    const transport = new SSEClientTransport(new URL(`${apiUrl}/sse`));
    await client.connect(transport);

    console.log(`${colors.green}✓ Connected successfully!${colors.reset}`);

    // Step 2: List available tools
    console.log(`${colors.blue}Fetching available tools...${colors.reset}`);

    const tools = await client.listTools();

    console.log(
      `${colors.green}✓ Found ${tools.tools.length} tools${colors.reset}`
    );
    console.log(`\n${colors.blue}Available tools:${colors.reset}`);

    tools.tools.forEach((tool, index) => {
      console.log(
        `${colors.green}${index + 1}. ${tool.name}${colors.reset} - ${
          tool.description || "No description"
        }`
      );
    });

    // Step 3: Interactive tool caller
    const promptUser = () => {
      rl.question(
        `\n${colors.yellow}Enter tool number to call (or 'q' to quit): ${colors.reset}`,
        async (answer) => {
          if (answer.toLowerCase() === "q") {
            await client.disconnect();
            console.log(
              `${colors.blue}Disconnected and exiting. Goodbye!${colors.reset}`
            );
            rl.close();
            process.exit(0);
            return;
          }

          const toolIndex = parseInt(answer) - 1;
          if (
            isNaN(toolIndex) ||
            toolIndex < 0 ||
            toolIndex >= tools.tools.length
          ) {
            console.log(
              `${colors.red}Invalid tool number. Please try again.${colors.reset}`
            );
            promptUser();
            return;
          }

          const selectedTool = tools.tools[toolIndex];
          console.log(
            `${colors.blue}Calling tool: ${colors.cyan}${selectedTool.name}${colors.reset}`
          );

          try {
            // Call the tool using the SDK
            const result = await client.callTool(selectedTool.name, {
              userId: USER_ID,
              limit: 5,
            });

            // Display the result
            console.log(`${colors.green}Tool result:${colors.reset}`);

            if (result.content) {
              result.content.forEach((item) => {
                if (item.type === "text") {
                  try {
                    // Try to parse as JSON
                    const parsed = JSON.parse(item.text);
                    console.log(JSON.stringify(parsed, null, 2));
                  } catch (e) {
                    // Display as plain text
                    console.log(item.text);
                  }
                } else {
                  console.log(item);
                }
              });
            }
          } catch (error) {
            console.error(
              `${colors.red}Error calling tool: ${error.message}${colors.reset}`
            );
          }

          // Prompt for next action
          promptUser();
        }
      );
    };

    // Start the interactive prompt
    promptUser();
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);

    // Clean up on error
    try {
      await client.disconnect();
    } catch (e) {
      // Ignore disconnection errors
    }

    rl.close();
    process.exit(1);
  }
}

// Handle CTRL+C
process.on("SIGINT", async () => {
  console.log(`\n${colors.yellow}Interrupted. Disconnecting...${colors.reset}`);
  rl.close();
  process.exit(0);
});

// Start the client
main();
