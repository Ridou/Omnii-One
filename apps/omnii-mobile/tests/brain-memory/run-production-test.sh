#!/bin/bash

# 🧠 Brain Memory Cache Production Test Runner
# Tests the brain memory system on Railway production deployment

echo "🧠 Starting Brain Memory Cache Production Test..."
echo "📋 Prerequisites:"
echo "   • Production server deployed to Railway"
echo "   • Supabase credentials configured in production"
echo "   • Latest code pushed to production branch"
echo ""

# Check if production server is accessible
echo "🔍 Checking production server..."
if curl -s https://omniimcp-production.up.railway.app/health > /dev/null; then
    echo "✅ Production server is accessible"
else
    echo "❌ Production server is not accessible!"
    echo "   Please check Railway deployment status"
    exit 1
fi

echo ""
echo "🚀 Running comprehensive production test..."
echo ""

# Run the production test from the root directory
cd ../../../../ && npx tsx apps/omnii-mobile/tests/brain-memory/comprehensive-production.test.ts

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "🎉 Production Brain Memory Cache Test Completed Successfully!"
    echo "✅ Production deployment is ready for users"
    echo "🌐 Live at: https://omniimcp-production.up.railway.app"
else
    echo "❌ Production Brain Memory Cache Test Failed"
    echo "🔧 Please check the errors above and fix any production issues"
fi

exit $exit_code 