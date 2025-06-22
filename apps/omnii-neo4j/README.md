# Neo4j Microservice

A dedicated REST API microservice for Neo4j operations, connecting to your existing Neo4j AuraDB instance.

## Overview

This microservice provides a REST API layer for Neo4j graph database operations, specifically designed to work with your existing Neo4j AuraDB. It handles concept retrieval, search, and graph operations for the Omnii application.

## Features

- **REST API** for Neo4j operations
- **Secure connection** to Neo4j AuraDB
- **Health monitoring** with built-in health check endpoint
- **TypeScript** with full type safety
- **Fast deployment** on Railway

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/neo4j/concepts` - List concepts
- `GET /api/neo4j/concepts/search` - Search concepts
- Additional Neo4j operations as needed

## Environment Variables

```bash
NEO4J_URI=neo4j+s://your.auradb.instance:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j
NODE_ENV=production
PORT=8000
```

## Development

```bash
# Install dependencies
bun install

# Development with hot reload
bun run dev

# Build for production
bun run build

# Start production server
bun run start:prod

# Run tests
bun test
```

## Deployment

This service is configured for Railway deployment:

1. **Connect your repository** to Railway
2. **Set environment variables** in Railway dashboard
3. **Deploy** - Railway will automatically build and deploy

The service will be available at your Railway-generated domain on port 8000.

## Architecture

```
Omnii App → Neo4j Microservice → Neo4j AuraDB
```

This microservice acts as a dedicated API layer between your Omnii application and Neo4j AuraDB, providing optimized queries and proper error handling.

## 📄 Files Structure

```
apps/omnii-neo4j/
├── Dockerfile          # Multi-stage Neo4j build
├── railway.toml        # Railway deployment config
├── server-logs.xml     # Neo4j server logging config
├── user-logs.xml       # Neo4j user logging config
└── README.md          # This file
```

## 🔗 Integration

The `omnii_mcp` service connects directly to this Neo4j database using:
- Standard Neo4j driver (port 7687)
- Railway internal networking
- Existing Neo4j routes in `omnii_mcp/src/routes/neo4j.ts`

This replaces the need for external AuraDB and provides Railway-optimized Neo4j hosting.

## 📄 License

Part of the Omnii platform. 