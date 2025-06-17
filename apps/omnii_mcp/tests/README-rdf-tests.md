# RDF Integration Tests

## Overview

The RDF integration tests verify the Python RDF service integration with the MCP service.

## Running Tests

### Quick Run
```bash
# Run the simple test script
bun test-rdf-integration.js

# Or run the Bun test directly
bun test tests/rdf-integration.test.js
```

### Environment Configuration

Tests use the configuration from `tests/constants.js`:
- **Local**: `http://localhost:8000` (default)
- **Production**: `https://omniimcp-production.up.railway.app`

To test against production:
```bash
OMNII_TEST_ENV=PROD bun test tests/rdf-integration.test.js
```

## Test Coverage

The test suite covers all RDF endpoints:

1. **Health Check** (`GET /api/rdf/health`)
   - Verifies Python RDF service is running
   - Checks service status

2. **Status Check** (`GET /api/rdf/status`)
   - Verifies integration type
   - Checks service availability

3. **Concept Extraction** (`POST /api/rdf/extract-concepts`)
   - Tests text analysis
   - Extracts concepts, sentiment, and intent

4. **Analysis** (`POST /api/rdf/analyze`)
   - Tests full message analysis
   - Uses actual user ID from constants

5. **Full Processing** (`POST /api/rdf/process`)
   - Tests complete RDF pipeline
   - Includes metadata and channel info

6. **String Input** (`POST /api/rdf/process`)
   - Tests simple string processing
   - Verifies flexible input handling

7. **Test Endpoint** (`GET /api/rdf/test`)
   - Lists available endpoints
   - Verifies service info

## Expected Results

All tests should pass with:
- ✅ 200 status codes
- ✅ Proper response structures
- ✅ Successful data processing

## Troubleshooting

### Python RDF Service Not Running
If tests fail with connection errors:
1. Ensure Python RDF service is running on port 5174
2. Check `python-rdf/` directory
3. Run: `cd python-rdf && python app/main.py`

### Port Configuration
- MCP service: Port 8000 (default)
- Python RDF: Port 5174 (default)
- Neo4j: Port 7687 (default)

### Debug Mode
Enable debug output:
```bash
DEBUG=* bun test tests/rdf-integration.test.js
```