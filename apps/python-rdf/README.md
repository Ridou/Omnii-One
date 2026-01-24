# Python RDF Service

This is the Python RDF service for Omnii that handles advanced RDF reasoning and brain memory integration.

## Local Development

### Starting the Service

For local development, use the provided start script:

```bash
./start-local.sh
```

This will start the Python RDF service on **port 8001** (since the MCP service runs on port 8000).

### Manual Start

If you need to start manually:

```bash
# Set the port to 8001 for local development
export PORT=8001

# Optional: Set local Redis URL (defaults to localhost:6379)
export REDIS_URL=redis://localhost:6379

# Start the service
python app/main.py
```

## Production

In production (Railway), the service runs on port 8000 and is accessed via the internal Railway URL:
- `http://omnii-rdf-python-production.railway.internal:8000`

## Port Configuration

- **Local Development**: Port 8001 (MCP service uses 8000)
- **Production**: Port 8000 (Railway internal)

## Dependencies

Install dependencies:

```bash
pip install -r requirements.txt
```

## Environment Variables

- `PORT`: The port to run the service on (default: 8000, local: 8001)
- `REDIS_URL`: Redis connection URL (default: redis://localhost:6379)
- `NODE_ENV`: Environment mode (production/development)

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /api/rdf/analyze` - Main RDF analysis endpoint
- `POST /query` - SPARQL query execution
- `POST /evolve-concept` - Concept evolution with RDF reasoning
- `POST /analyze-brain-memory` - Brain memory context analysis
- `GET /metrics` - Service metrics

## Testing

To test if the service is running:

```bash
# Health check
curl http://localhost:8001/health

# Test RDF analysis
curl -X POST http://localhost:8001/api/rdf/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I need to email John Smith about the meeting",
    "domain": "concept_extraction",
    "task": "extract_concepts",
    "extractors": ["concepts", "sentiment", "intent"]
  }'
```