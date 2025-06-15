# Local Development Setup

## Running Services Locally

When developing locally, you need to run both the MCP service and the Python RDF service on different ports:

### 1. Start the MCP Service (Port 8000)

```bash
cd apps/omnii_mcp
bun run dev
```

This starts the main MCP service on port 8000.

### 2. Start the Python RDF Service (Port 8001)  

```bash
cd apps/python-rdf
./start-local.sh
```

This starts the Python RDF service on port 8001.

## Port Configuration

| Service | Local Port | Production Port |
|---------|------------|-----------------|
| MCP Service | 8000 | 8000 |
| Python RDF | 8001 | 8000 (internal) |

## Why Different Ports?

In local development:
- MCP service runs on port 8000
- Python RDF service runs on port 8001 to avoid conflicts

In production (Railway):
- Both services run on port 8000 but on different internal URLs
- MCP: `omniimcp-production.up.railway.app`
- Python: `omnii-rdf-python-production.railway.internal:8000`

## Testing RDF Integration

1. Start both services as described above

2. Test the RDF integration:

```bash
cd apps/omnii_mcp
bun debug-rdf-extraction.js
```

This will test:
- MCP service on port 8000
- Python RDF service on port 8001
- The integration between them

## Environment Variables

For local development, the RDF client automatically uses `http://localhost:8001` for the Python service.

If you need to override this, set:

```bash
export RDF_PYTHON_SERVICE_URL=http://localhost:8001
```

## Troubleshooting

### Port Already in Use

If port 8000 is already in use:
```bash
lsof -i :8000
# Kill the process if needed
```

If port 8001 is already in use:
```bash
lsof -i :8001
# Kill the process if needed
```

### Python Service Not Responding

1. Check if it's running:
```bash
curl http://localhost:8001/health
```

2. Check logs in the Python service terminal

3. Ensure Redis is running (if using caching):
```bash
redis-cli ping
```