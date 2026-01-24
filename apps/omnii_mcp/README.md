# Omnii Model Context Protocol (MCP)

A Node.js/Express service that builds context-rich prompts for Omnii by retrieving relevant data from Supabase and Neo4j before sending to OpenAI or Anthropic.

## Features

- **Context-rich AI Responses**: Enhances AI responses with user's conversation history, journal entries, goals, and knowledge graph
- **Neo4j Knowledge Graph Integration**: Retrieves relevant concepts and relationships from user's knowledge graph
- **Redis Caching**: Improves performance by caching Neo4j query results
- **User-specific Context**: Ensures privacy by filtering data based on user ID
- **Mock Data Mode**: Develop and test without real database connections
- **Fallback Mechanisms**: Gracefully handles database connection failures
- **Screen-specific Prompting**: Tailors responses based on the user's current screen (chat, journal, graph, goals)

## Setup

### Local Development

```bash
# Install dependencies
npm install

# Create a .env file with required configuration
cat > .env << EOL
# Neo4j Configuration
NEO4J_URI=neo4j+s://your-instance-id.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Other Configuration
PORT=3000
USE_MOCK_DATA=false
EOL

# Build the TypeScript project
npm run build

# Start development server
npm run dev
```

### Using Docker

```bash
# Create a .env file as shown above

# Create a docker MAIN ONE!
sudo docker-compose up --build -d


# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### Updating from GitHub

To update your local repository with the latest changes from the main branch:

```bash
# Navigate to the project directory
cd ~/omnii_mcp

# Reset any local changes to match the remote repository
git reset --hard origin/main

# Remove any untracked files or directories
git clean -fd

# Pull the latest changes
git pull origin main
```

## API Usage

### MCP Endpoint

`POST /mcp`

```json
{
  "userId": "user123",
  "input": "What did I say about Japan last week?",
  "screen": "journal",
  "memoryEnabled": true
}
```

### Neo4j Knowledge Graph API

The following endpoints are available for accessing the user's knowledge graph:

#### List Concepts

`GET /api/neo4j/concepts?user_id=USER_ID`

Optional parameters:
- `limit`: Maximum number of concepts to return (default: 100)
- `filter`: Filter concepts by name or description

#### Search Concepts (Semantic Search)

`GET /api/neo4j/concepts/search?user_id=USER_ID&q=QUERY`

Optional parameters:
- `limit`: Maximum number of results to return (default: 5)

#### Get Node Context

`GET /api/neo4j/nodes/:nodeId/context?user_id=USER_ID`

Returns a node and its relationships.

#### AI Context Retrieval

`GET /api/neo4j/context?user_id=USER_ID&query=QUERY`

Returns relevant concepts and relationships based on the query.

Optional parameters:
- `limit`: Maximum number of concepts to include in context (default: 3)

### Testing

The repository includes several test scripts to verify functionality:

```bash
# Test the MCP endpoint
npm run test:neo4j

# Test the basic Neo4j context retrieval functionality (interactive)
npm run test:context

# Test individual Neo4j API endpoints
npm run test:endpoints

# Test specific endpoint (e.g., search, concepts, context, node, health)
node test-neo4j-endpoints.js search

# Test the Neo4j service with Redis caching
npm run test:service

# Test Neo4j context integration with MCP
npm run test:mcp

# Run all Neo4j-related tests
npm run test:all
```

## Neo4j MCP Integration

The MCP system integrates with Neo4j through the following flow:

1. When a user sends a query to MCP, the system first extracts relevant concepts from the query
2. It searches for these concepts in the user's personal knowledge graph in Neo4j
3. Retrieved concepts and their relationships are formatted as context
4. This context is added to the prompt sent to the AI system (OpenAI/Anthropic)
5. The AI response includes this personalized knowledge graph context

This ensures that the AI has access to the user's personal knowledge and concepts when generating responses.

All Neo4j data is filtered by `user_id` to ensure privacy, and Redis caching improves performance.

## Mock Data Mode

For development without database connections, set `USE_MOCK_DATA=true` in your `.env` file. This provides realistic test data for:

- Chat conversations
- Journal entries
- Goals
- Knowledge graph relationships

## Deployment to EC2

1. Launch an EC2 instance with Ubuntu
2. Install Docker and Git:
   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose git
   ```
3. Clone the repo and create the necessary files:
   ```bash
   git clone https://github.com/yourusername/omnii-mcp.git
   cd omnii-mcp
   
   # Create .env file with your configuration
   nano .env
   
   # Update code from the repository
   git pull origin main
   ```
4. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```
5. Monitor the logs:
   ```bash
   docker-compose logs -f
   ```

## Redis Caching

The system uses Redis to cache Neo4j query results, which:

1. Improves performance by reducing database load
2. Speeds up response times for frequently accessed data
3. Provides graceful fallback if Neo4j becomes temporarily unavailable

Cache keys are structured as: `userId:queryType:queryParams` and default TTL is 1 hour.

## Architecture

- `src/index.ts` - Express server
- `src/routes/mcp.ts` - Main endpoint handler
- `src/routes/neo4j-api.ts` - Neo4j API endpoint handler
- `src/services/` - Core services for context building, memory, and AI
  - `src/services/neo4j-service.ts` - Neo4j knowledge graph service
  - `src/services/redis-cache.ts` - Redis caching layer
  - `src/services/mcp-neo4j-server.ts` - MCP server for Neo4j tools
- `src/utils/` - Formatting utilities and mock data 