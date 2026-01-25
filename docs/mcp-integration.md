# MCP Integration Guide

This guide covers integrating the Omnii Graph MCP server with AI clients like Claude Desktop.

## Prerequisites

Before connecting to the MCP server, ensure:

1. **Server is running**: The Omnii MCP server must be accessible (default: `http://localhost:8081`)
2. **User account created**: You need a Supabase account to authenticate
3. **Database provisioned**: Your personal Neo4j database must be created (happens automatically on signup)

## Getting Your Auth Token

The MCP server uses Supabase JWT tokens for authentication. To get your token:

### Option 1: From Supabase Dashboard

1. Log into your Supabase project dashboard
2. Go to **Authentication** > **Users**
3. Find your user and click to view details
4. Use the "Generate Token" option or extract from a session

### Option 2: From Mobile App (if using Omnii mobile)

1. Sign in to the Omnii mobile app
2. Go to **Settings** > **Developer**
3. Copy your access token

### Option 3: Via API

```bash
# Sign in and get token
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "your@email.com",
    "password": "your-password"
  }'
```

The response contains an `access_token` field - this is your JWT.

**Note**: Tokens expire after 1 hour by default. You may need to refresh periodically.

## Claude Desktop Configuration

### Config File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Configuration

Add the Omnii server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omnii-graph": {
      "type": "http",
      "url": "http://localhost:8081/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SUPABASE_JWT_TOKEN"
      }
    }
  }
}
```

Replace `YOUR_SUPABASE_JWT_TOKEN` with your actual JWT from the steps above.

### Restart Claude Desktop

After saving the config, restart Claude Desktop completely:

1. Quit Claude Desktop (Cmd+Q on Mac, Alt+F4 on Windows)
2. Reopen Claude Desktop
3. The tools should appear in the tools menu

## Available Tools

The Omnii MCP server exposes three tools for querying your personal knowledge graph:

### 1. omnii_graph_search_nodes

**Purpose**: Semantic similarity search across your knowledge graph

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Natural language search query (1-500 chars) |
| `limit` | number | No | 10 | Maximum results (1-50) |
| `nodeTypes` | array | No | all | Filter by: `Concept`, `Entity`, `Event`, `Contact` |
| `minScore` | number | No | 0.7 | Minimum similarity score (0-1) |

**Example Prompts**:
- "Search my knowledge graph for anything related to project deadlines"
- "Find contacts I've worked with on AI projects"
- "Look for events happening in January"

**Example Response**:
```json
{
  "query": "project deadlines",
  "resultCount": 3,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Q4 Product Launch",
      "type": "Event",
      "score": "0.923",
      "properties": {
        "date": "2025-12-15",
        "description": "Final product launch deadline"
      }
    }
  ]
}
```

### 2. omnii_graph_get_context

**Purpose**: Get detailed context about a specific node and its relationships

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeId` | string (UUID) | Yes | - | The unique ID of the node |
| `includeRelated` | boolean | No | true | Include related nodes via graph traversal |
| `maxDepth` | number | No | 1 | Traversal depth (1-3) |

**Example Prompts**:
- "Get more details about the node with ID 550e8400-e29b-41d4-a716-446655440000"
- "Show me everything connected to this contact"
- "Explore the context around this event with 2 levels of depth"

**Example Response**:
```json
{
  "node": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Q4 Product Launch",
    "labels": ["Event"],
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-11-15T14:30:00Z",
    "properties": {
      "date": "2025-12-15"
    }
  },
  "relatedCount": 5,
  "related": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Marketing Team",
      "labels": ["Entity"],
      "relationship": {
        "types": ["INVOLVES"],
        "depth": 1
      }
    }
  ]
}
```

### 3. omnii_graph_list_entities

**Purpose**: Browse nodes by type with pagination

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeType` | string | Yes | - | One of: `Concept`, `Entity`, `Event`, `Contact` |
| `limit` | number | No | 20 | Maximum results (1-100) |
| `offset` | number | No | 0 | Pagination offset |

**Example Prompts**:
- "List all my contacts"
- "Show me 50 concepts from my knowledge graph"
- "Get the next page of events (offset 20)"

**Example Response**:
```json
{
  "nodeType": "Contact",
  "total": 47,
  "returned": 20,
  "offset": 0,
  "hasMore": true,
  "nodes": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Alice Smith",
      "createdAt": "2025-10-05T09:00:00Z",
      "updatedAt": "2025-11-20T16:45:00Z"
    }
  ]
}
```

## Rate Limits

The MCP server enforces rate limiting to ensure fair usage:

| Limit | Value |
|-------|-------|
| Requests per minute | 100 |
| Window duration | 60 seconds |
| Rate limit scope | Per authenticated user |

When rate limited, you'll receive:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Rate limit exceeded. Maximum 100 requests per minute."
  },
  "id": null
}
```

Wait 60 seconds for the window to reset.

## Troubleshooting

### "Missing or invalid authorization header"

**Cause**: The JWT token is missing or malformed

**Solution**:
1. Verify your token in the config file starts with `Bearer ` (note the space)
2. Check the token hasn't expired (tokens expire after 1 hour)
3. Generate a new token and update the config

### "Invalid or expired token"

**Cause**: The JWT token is expired or was revoked

**Solution**:
1. Generate a new token using one of the methods above
2. Update `claude_desktop_config.json` with the new token
3. Restart Claude Desktop

### "Tool not found"

**Cause**: Attempting to call a tool that doesn't exist

**Solution**:
1. Verify you're using the correct tool names:
   - `omnii_graph_search_nodes`
   - `omnii_graph_get_context`
   - `omnii_graph_list_entities`

### "Rate limit exceeded"

**Cause**: Too many requests in a short time window

**Solution**:
1. Wait 60 seconds for the rate limit window to reset
2. If consistently hitting limits, space out your queries

### Connection refused / ECONNREFUSED

**Cause**: MCP server is not running

**Solution**:
1. Start the server: `cd apps/omnii_mcp && bun run dev`
2. Verify it's running: `curl http://localhost:8081/mcp/health`
3. Check the port matches your config (default: 8081)

### Tools not appearing in Claude Desktop

**Cause**: Config not loaded or malformed

**Solution**:
1. Validate your JSON syntax (use a JSON validator)
2. Ensure the config file is in the correct location
3. Restart Claude Desktop completely (not just reload)
4. Check Claude Desktop logs for errors

## Security Notes

### Token Handling

- **Never commit tokens**: Keep `claude_desktop_config.json` out of version control
- **Token rotation**: Rotate tokens periodically for security
- **Minimum permissions**: Use tokens with only necessary scopes

### Network Security

- **Local development**: Default config uses `localhost:8081` - not exposed to internet
- **Production**: Use HTTPS and proper firewall rules
- **CORS**: Server restricts cross-origin requests

### Data Isolation

- **Database per user**: Each user has their own isolated Neo4j database
- **No cross-user access**: Your JWT can only access your data
- **Audit logging**: All MCP requests are logged for security review

## Health Check

Verify the server is working:

```bash
# Basic health check (no auth required)
curl http://localhost:8081/mcp/health

# Check with user schema status
curl "http://localhost:8081/mcp/health?userId=YOUR_USER_ID"
```

Expected response:
```json
{
  "status": "ok",
  "initialized": true,
  "server": "omnii-graph",
  "version": "0.1.0",
  "tools": 3
}
```

## Protocol Details

The Omnii MCP server implements:

- **Protocol version**: 2025-11-25
- **Transport**: Streamable HTTP
- **Format**: JSON-RPC 2.0
- **Authentication**: Bearer token (Supabase JWT)

### Supported Methods

| Method | Description |
|--------|-------------|
| `initialize` | Initialize connection with protocol negotiation |
| `notifications/initialized` | Client acknowledgment (no response) |
| `tools/list` | List available tools |
| `tools/call` | Execute a tool |
