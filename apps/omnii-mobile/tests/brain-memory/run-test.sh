#!/bin/bash

# 🧠 Brain Memory Cache Test Runner
# Quick script to run the comprehensive integration test

echo "🧠 Starting Brain Memory Cache Integration Test..."
echo "📋 Prerequisites:"
echo "   • Local server should be running on http://localhost:8000"
echo "   • Supabase credentials should be configured in .env"
echo ""

# Check if local server is running
echo "🔍 Checking local server..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Local server is running on port 8000"
else
    echo "❌ Local server is not running!"
    echo "   Please start it with: cd apps/omnii_mcp && bun run dev"
    exit 1
fi

echo ""
echo "🚀 Running comprehensive brain memory test..."
echo ""

# Run the test from the root directory to ensure proper environment loading
cd ../../../../ && npx tsx apps/omnii-mobile/tests/brain-memory/comprehensive-integration.test.ts

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "🎉 Brain Memory Cache Test Completed Successfully!"
    echo "✅ System is ready for production deployment"
else
    echo "❌ Brain Memory Cache Test Failed"
    echo "🔧 Please check the errors above and fix any issues"
fi

exit $exit_code 