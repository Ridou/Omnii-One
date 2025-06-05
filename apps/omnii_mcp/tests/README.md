# Omnii MCP Test Suite

This directory contains the Bun test suite for Omnii MCP. The tests are designed to validate both the Neo4j API integration and MCP functionality.

## Configuration

Tests are configured to run against the production API by default:

```
https://omniimcp-production.up.railway.app
```

To run tests against a local dev environment, edit `constants.js` and change the `API_BASE_URL` to use `API_ENDPOINTS.LOCAL`.

## Running Tests

Run all tests:

```bash
bun test
```

Run a specific test:

```bash
bun tests/neo4j-api.test.js
```

## Test Categories

The test suite is organized into several categories:

### Neo4j API Tests

- `neo4j-api.test.js` - Basic Neo4j API operations (health check, concepts)
- `neo4j-endpoints.test.js` - Neo4j API endpoint tests
- `neo4j-service.test.js` - Neo4j service layer tests
- `neo4j-context.test.js` - Neo4j context retrieval tests

### MCP Tests

- `mcp-context.test.js` - MCP context integration tests
- `mcp-neo4j.test.js` - MCP with Neo4j integration tests
- `mcp.test.js` - Core MCP functionality tests
- `mcp-email.test.js` - Email functionality tests with MCP

### Composio Integration Tests

- `composio-calendar.test.js` - Main Google Calendar integration tests
- `composio-connection.test.js` - OAuth connection management tests
- `composio-oauth-flow.test.js` - End-to-end OAuth flow tests

### Other Tests

- `email.test.js` - Email functionality tests
- `multi-node-support.test.js` - Multi-node support tests

## Shared Resources

The test suite uses shared resources for consistency:

- `constants.js` - Shared constants like API URLs and test data
- `setup.js` - Test setup and global helper functions
- `index.test.js` - Main test discovery file

## Test User

Tests use a shared test user ID:

```
cd9bdc60-35af-4bb6-b87e-1932e96fb354
```
