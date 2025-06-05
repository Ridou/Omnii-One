#!/bin/bash

echo "🌐 Testing Production Deployment Status"
echo "========================================"
echo ""

PROD_URL="https://omniimcp-production.up.railway.app"

echo "🔍 Testing production endpoints..."
echo ""

# Test main health endpoint
echo "1. Testing main health endpoint..."
echo "   URL: $PROD_URL/health"
if curl --max-time 15 -s "$PROD_URL/health" > /dev/null 2>&1; then
    echo "   ✅ Main health endpoint is responding"
    RESPONSE=$(curl --max-time 15 -s "$PROD_URL/health")
    echo "   Response: $RESPONSE"
else
    echo "   ❌ Main health endpoint is not responding (timeout/error)"
fi
echo ""

# Test Neo4j health endpoint
echo "2. Testing Neo4j health endpoint..."
echo "   URL: $PROD_URL/api/neo4j/health"
if curl --max-time 15 -s "$PROD_URL/api/neo4j/health" > /dev/null 2>&1; then
    echo "   ✅ Neo4j health endpoint is responding"
    RESPONSE=$(curl --max-time 15 -s "$PROD_URL/api/neo4j/health")
    echo "   Response: $RESPONSE"
else
    echo "   ❌ Neo4j health endpoint is not responding (timeout/error)"
fi
echo ""

# Test a simple Neo4j endpoint
echo "3. Testing Neo4j concepts endpoint..."
echo "   URL: $PROD_URL/api/neo4j/concepts?user_id=cd9bdc60-35af-4bb6-b87e-1932e96fb354&limit=1"
if curl --max-time 15 -s "$PROD_URL/api/neo4j/concepts?user_id=cd9bdc60-35af-4bb6-b87e-1932e96fb354&limit=1" > /dev/null 2>&1; then
    echo "   ✅ Neo4j concepts endpoint is responding"
    RESPONSE=$(curl --max-time 15 -s "$PROD_URL/api/neo4j/concepts?user_id=cd9bdc60-35af-4bb6-b87e-1932e96fb354&limit=1" | head -100)
    echo "   Response (first 100 chars): $RESPONSE"
else
    echo "   ❌ Neo4j concepts endpoint is not responding (timeout/error)"
fi
echo ""

# Test auth proxy endpoint
echo "4. Testing auth proxy health endpoint..."
echo "   URL: $PROD_URL/api/auth-proxy/health"
if curl --max-time 15 -s "$PROD_URL/api/auth-proxy/health" > /dev/null 2>&1; then
    echo "   ✅ Auth proxy health endpoint is responding"
    RESPONSE=$(curl --max-time 15 -s "$PROD_URL/api/auth-proxy/health")
    echo "   Response: $RESPONSE"
else
    echo "   ❌ Auth proxy health endpoint is not responding (timeout/error)"
fi
echo ""

echo "🔍 Checking DNS resolution..."
echo "   Resolving: omniimcp-production.up.railway.app"
if nslookup omniimcp-production.up.railway.app > /dev/null 2>&1; then
    echo "   ✅ DNS resolution successful"
    nslookup omniimcp-production.up.railway.app | grep "Address:" | head -3
else
    echo "   ❌ DNS resolution failed"
fi
echo ""

echo "🔍 Testing basic connectivity..."
echo "   Testing HTTPS connection..."
if curl --max-time 10 -I "$PROD_URL" > /dev/null 2>&1; then
    echo "   ✅ HTTPS connection successful"
    curl --max-time 10 -I "$PROD_URL" 2>/dev/null | head -5
else
    echo "   ❌ HTTPS connection failed"
fi
echo ""

echo "📊 Summary:"
echo "=========="
echo "If all endpoints are failing, the likely issues are:"
echo "1. 🚨 Application failed to start in production"
echo "2. 🚨 Missing environment variables in Railway"
echo "3. 🚨 Database connection issues (Redis/Neo4j/Supabase)"
echo "4. 🚨 Port configuration issues"
echo ""
echo "Next steps:"
echo "1. Check Railway deployment logs"
echo "2. Verify environment variables are set in Railway"
echo "3. Check if Redis/Neo4j/Supabase are accessible from Railway"
echo "4. Verify the application builds and starts correctly" 