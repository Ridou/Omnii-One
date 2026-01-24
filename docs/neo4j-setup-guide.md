# Neo4j Setup Guide for Omnii

## Overview

Neo4j integration in Omnii provides a knowledge graph for storing concepts, relationships, and brain memory. The integration is optional - the app will work without Neo4j but with reduced AI memory capabilities.

## Environment Variables

To enable Neo4j, set these environment variables in your `.env` file:

```bash
# Neo4j Connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j  # Optional, defaults to 'neo4j'
```

## Setup Options

### Option 1: Neo4j Desktop (Recommended for Development)

1. Download [Neo4j Desktop](https://neo4j.com/download/)
2. Create a new project and database
3. Start the database
4. Set the connection details in your `.env` file

### Option 2: Docker

```bash
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your-password \
  neo4j:latest
```

### Option 3: Neo4j AuraDB (Cloud)

1. Sign up at [Neo4j AuraDB](https://neo4j.com/cloud/aura/)
2. Create a free instance
3. Use the provided connection string in `NEO4J_URI`

## Testing the Connection

Run the Neo4j connection test:

```bash
cd apps/omnii_mcp
npm test neo4j-connection.test.js
```

## Checking Neo4j Status in the App

The Neo4j integration includes automatic availability checking:

1. **In the Chat Interface**: Navigate to the Memory tab
2. **Brain Memory Card**: Shows concept statistics when Neo4j is available
3. **Graceful Fallback**: Shows "No Neo4j concepts loaded" when unavailable

## Troubleshooting

### Common Issues

1. **"Neo4j service is not available"**
   - Ensure Neo4j is running
   - Check environment variables are set correctly
   - Verify the MCP service is running (`npm run dev` in `apps/omnii_mcp`)

2. **Connection Refused**
   - Check Neo4j is listening on the correct port (default: 7687)
   - Ensure no firewall is blocking the connection

3. **Authentication Failed**
   - Verify username and password are correct
   - For Neo4j Desktop, check the database settings

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=neo4j:*
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│   tRPC API      │────▶│   MCP Service   │
│  (useNeo4j)     │     │ (neo4j router)  │     │ (Neo4j service) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                   ┌─────────────────┐
                                                   │     Neo4j       │
                                                   │   Database      │
                                                   └─────────────────┘
```

## Features When Neo4j is Enabled

- **Concept Storage**: Automatically extracts and stores concepts from conversations
- **Relationship Mapping**: Links related concepts and ideas
- **Memory Context**: Provides relevant context for AI responses
- **Knowledge Graph**: Visual representation of your information network
- **Semantic Search**: Find related concepts across all stored data

## Performance Considerations

- Neo4j queries are cached with Redis (when available)
- Availability checks are cached for 1 minute
- Initial connection may take a few seconds
- Consider indexing frequently queried properties

## Security

- Never commit Neo4j credentials to version control
- Use environment variables for all sensitive data
- Consider using Neo4j's built-in encryption for production
- Implement proper access controls for multi-user scenarios