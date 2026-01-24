# Testing Composio Endpoints

This guide explains how to test your Composio Google Calendar and Google Tasks endpoints with the integration test suite.

## Prerequisites

1. **Running Server**: Your dev server must be running on port 8081
2. **Composio API Key**: Set in your environment variables
3. **ngrok (Optional)**: For testing with your public domain

## Quick Start

### 1. Start Your Dev Server

```bash
bun run dev
# Server should be running on http://localhost:8081
```

### 2. Run Integration Tests

**Local testing:**

```bash
bun run test:integration
```

**Test against ngrok domain:**

```bash
bun run test:composio:ngrok
```

**Custom server URL:**

```bash
TEST_BASE_URL=https://your-domain.com bun run test:composio
```

## What the Tests Cover

### 🏥 Health Checks

- Calendar service health endpoint
- Server availability

### 🔗 Connection Management

- OAuth connection initiation
- Connection status checking
- OAuth callback handling
- Error scenarios

### 📅 Google Calendar Operations

- List calendar events
- Create calendar events
- Search events
- Get user calendars
- Get user profile
- Available tools

### ✅ Google Tasks Operations

- List task lists
- Create/update/delete task lists
- List tasks
- Create/update/delete tasks
- Move tasks
- Clear completed tasks

### 🔧 Error Handling

- Invalid parameters
- Missing authentication
- Nonexistent endpoints
- Performance testing

## Understanding Test Results

### Expected Behaviors

**✅ Success Cases:**

- Health checks should always pass
- OAuth initiation should return redirect URLs
- Connection status checks should work

**⚠️ Expected "Failures":**

- `CONNECTION_ERROR` responses are normal if OAuth not completed
- 401 status codes indicate authentication needed

### OAuth Flow Testing

The tests will output OAuth URLs like:

```
🔗 OAuth URL: https://accounts.google.com/oauth/authorize?client_id=...
🆔 Connection ID: conn_abc123
```

To test authenticated endpoints:

1. Copy the OAuth URL from test output
2. Complete the OAuth flow in your browser
3. Re-run tests to verify authenticated operations

## Environment Variables

```bash
# Required
COMPOSIO_API_KEY=your_composio_api_key

# For ngrok testing
PUBLIC_URL=https://omnii.net
BASE_URL=https://omnii.net

# Test configuration
TEST_BASE_URL=http://localhost:8081  # Override test target
TEST_TIMEOUT=30000                   # Test timeout in ms
```

## Test Output Examples

### Successful Health Check

```
✅ API Success: 200 OK
📊 Calendar service health check passed
```

### OAuth Initiation

```
✅ API Success: 200 OAuth connection initiated successfully
🔗 OAuth URL: https://accounts.google.com/oauth/...
🆔 Connection ID: conn_12345
```

### Expected Connection Error

```
⚠️ Expected: No active connection found
📊 CONNECTION_ERROR - This is normal before OAuth completion
```

## Troubleshooting

### Server Not Running

```
❌ Server is not running at http://localhost:8081
```

**Solution:** Run `bun run dev` first

### Connection Timeouts

```
❌ API Error: 500 Internal Server Error
```

**Check:**

- Server logs for detailed errors
- Composio API key is valid
- Network connectivity

### OAuth Errors

```
❌ OAuth error: access_denied
```

**Solution:** Complete OAuth flow manually using the provided URLs

## Test Customization

### Run Specific Test Groups

```bash
# Only health checks
bun test tests/integration/composio-endpoints.test.js --grep "Health Checks"

# Only calendar tests
bun test tests/integration/composio-endpoints.test.js --grep "Google Calendar"

# Only tasks tests
bun test tests/integration/composio-endpoints.test.js --grep "Google Tasks"
```

### Custom Test Entity

Modify the test file to change the test entity ID:

```javascript
const TEST_ENTITY_ID = "your-test-user@domain.com";
```

## Integration with CI/CD

For automated testing, you can run tests without OAuth:

```bash
# Run tests that don't require authentication
bun test tests/integration/composio-endpoints.test.js --grep "Health|OAuth"
```

## Performance Benchmarks

The tests include performance checks:

- Health check: < 5 seconds
- Connection status: < 10 seconds
- OAuth initiation: < 15 seconds

## Next Steps

1. **Manual OAuth Testing**: Complete OAuth flows for full endpoint testing
2. **Load Testing**: Use tools like `k6` or `artillery` for load testing
3. **Monitoring**: Set up endpoint monitoring in production
4. **Error Tracking**: Integrate with error tracking services
