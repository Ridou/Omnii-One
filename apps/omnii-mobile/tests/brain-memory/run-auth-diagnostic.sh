#!/bin/bash

# 🔍 Production Authentication Diagnostic Runner
# Analyzes why cached data isn't showing up in production

echo "🔍 Starting Production Authentication Diagnostic..."
echo "📋 Goal: Understand why cached data shows empty in mobile app"
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
echo "🚀 Running authentication diagnostic..."
echo ""

# Run the diagnostic from the root directory
cd ../../../../ && npx tsx apps/omnii-mobile/tests/brain-memory/production-auth-diagnostic.test.ts

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "🎉 Authentication Diagnostic Completed!"
    echo "✅ Check the results above to understand the authentication state"
else
    echo "❌ Authentication Diagnostic Failed"
    echo "🔧 Please check the errors above"
fi

exit $exit_code 