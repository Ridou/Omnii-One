# RDF Integration Guide

## Understanding the RDF Flow

The RDF integration has several layers:

```
Your Test → MCP Service (port 8000) → Python RDF Service (port 8001)
```

## Current Issue

Your tests are returning empty concepts because:

1. **Environment Mismatch**: The RDF client is configured for Railway production URLs
   - Production: `http://omnii-rdf-python-production.railway.internal:8000`
   - Local should be: `http://localhost:8001`

2. **Missing Python Service**: The Python RDF service might not be running locally

## How to Fix

### 1. Start the Python RDF Service

```bash
cd apps/python-rdf
pip install -r requirements.txt
./start-local.sh
```

The Python service should start on port 8001.

### 2. Update RDF Client for Local Development

Create a `.env` file in `apps/omnii_mcp/`:

```env
RDF_PYTHON_SERVICE_URL=http://localhost:8001
```

Or temporarily modify `src/services/rdf-client.ts`:

```typescript
private pythonServiceUrl = process.env.NODE_ENV === 'production' 
  ? "http://omnii-rdf-python-production.railway.internal:8000"
  : "http://localhost:8001";
```

### 3. Test the Python Service Directly

```bash
# Check if Python service is running
curl http://localhost:8001/health

# Test concept extraction directly
curl -X POST http://localhost:8001/api/rdf/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I need to email John Smith about the meeting",
    "domain": "concept_extraction",
    "task": "extract_concepts",
    "extractors": ["concepts", "sentiment", "intent"]
  }'
```

## What the RDF Service Should Return

### For Concept Extraction

```json
{
  "concepts": [
    {"name": "email", "type": "action"},
    {"name": "John Smith", "type": "person"},
    {"name": "meeting", "type": "event"}
  ],
  "sentiment": {
    "score": 0.5,
    "polarity": "neutral"
  },
  "intent": "communication_request"
}
```

### For Contact Analysis

```json
{
  "contact_extraction": {
    "primary_contact": "John Smith",
    "confidence": 0.95
  },
  "intent_analysis": {
    "communication_action": "email",
    "urgency": "normal"
  },
  "context_analysis": {
    "formality_level": "professional",
    "context_indicators": ["meeting", "business"]
  }
}
```

## Running the Tests

### 1. Debug Test (Recommended First)

```bash
bun debug-rdf-extraction.js
```

This will show you:
- What the endpoints actually return
- Whether the Python service is reachable
- The exact response structure

### 2. Real Data Test

```bash
bun test tests/rdf-real-data.test.js
```

This tests:
- Contact extraction
- Multi-concept messages
- Rich text analysis
- Direct Python service access

### 3. Integration Test

```bash
bun test tests/rdf-integration.test.js
```

## Common Issues

### Empty Concepts

If you're getting empty concepts:

1. **Python service not running**: Start it with `cd apps/python-rdf && ./start-local.sh`
2. **Wrong URL**: Check `RDF_PYTHON_SERVICE_URL` environment variable
3. **Python service error**: Check Python service logs

### Connection Refused

If you get connection errors:

1. **Check ports**: 
   - MCP service: 8000
   - Python RDF: 8001
   
2. **Check processes**:
   ```bash
   lsof -i :8000  # MCP service
   lsof -i :8001  # Python RDF
   ```

### Fallback Behavior

The RDF contact analyzer has fallbacks:
- If RDF fails, it uses regex patterns
- Check logs for "⚠️ RDF analysis failed, using fallback"

## Testing with Real Data

Use the `rdf-real-data.test.js` which includes:

1. **Contact Communication**: Tests contact name extraction
2. **Rich Text**: Tests multiple concept extraction
3. **Context Analysis**: Tests with message history
4. **Direct Python**: Tests Python service directly

## Expected Behavior

When everything works correctly:

1. **Concepts**: Should extract people, places, actions, events
2. **Sentiment**: Should return polarity and score
3. **Intent**: Should identify the primary action
4. **Contacts**: Should extract names with confidence scores

## Debugging Steps

1. Run `bun debug-rdf-extraction.js` first
2. Check if Python service is running
3. Test Python service directly with curl
4. Check MCP service logs
5. Use real data tests to verify integration