#!/bin/bash

# Composio Integration Test Runner
# Run real endpoint tests against the dev server

set -e  # Exit on any error

echo "🚀 Composio Integration Test Runner"
echo "===================================="

# Configuration
DEFAULT_BASE_URL="http://localhost:8000"
DEFAULT_TIMEOUT="30000"

# Check if base URL is provided
BASE_URL=${TEST_BASE_URL:-$DEFAULT_BASE_URL}
TIMEOUT=${TEST_TIMEOUT:-$DEFAULT_TIMEOUT}

echo "📍 Base URL: $BASE_URL"
echo "⏱️  Timeout: ${TIMEOUT}ms"
echo ""

# Check if server is running
echo "🔍 Checking if server is running..."
if curl -s --fail "$BASE_URL/api/composio/calendar/health" > /dev/null 2>&1; then
    echo "✅ Server is running at $BASE_URL"
else
    echo "❌ Server is not running at $BASE_URL"
    echo ""
    echo "Please start your dev server first:"
    echo "  bun run dev"
    echo ""
    echo "Or set TEST_BASE_URL to your server URL:"
    echo "  export TEST_BASE_URL=https://omnii.live"
    exit 1
fi

echo ""

# Set environment variables for tests
export TEST_BASE_URL="$BASE_URL"
export TEST_TIMEOUT="$TIMEOUT"

# Run the tests
echo "🧪 Running integration tests..."
echo ""

# Use bun test to run the integration tests
if command -v bun &> /dev/null; then
    bun test tests/integration/composio-endpoints.test.js --timeout="$TIMEOUT"
else
    echo "❌ Bun not found. Please install Bun to run tests."
    echo "   Visit: https://bun.sh"
    exit 1
fi

echo ""
echo "✅ Integration tests complete!"
echo ""
echo "📝 Next steps:"
echo "1. If you see connection errors, complete OAuth flow manually"
echo "2. Visit the OAuth URLs printed in the test output"
echo "3. Re-run tests after authentication to test full functionality" 