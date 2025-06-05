#!/bin/bash
# Test Docker deployment script

echo "🧪 Testing Docker deployment..."

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -s http://localhost:8000/health | grep -q "ok"; then
  echo "✅ Health endpoint is working"
else
  echo "❌ Health endpoint failed"
  exit 1
fi

# Test Neo4j API endpoint
echo "🔗 Testing Neo4j API endpoint..."
if curl -s http://localhost:8000/api/neo4j/health | grep -q "ok"; then
  echo "✅ Neo4j API endpoint is working"
else
  echo "❌ Neo4j API endpoint failed"
  exit 1
fi

# Test MCP endpoint
echo "🤖 Testing MCP endpoint..."
if curl -s http://localhost:8000/mcp/health | grep -q "ok"; then
  echo "✅ MCP endpoint is working"
else
  echo "❌ MCP endpoint failed"
  exit 1
fi

echo "🎉 All tests passed!"
echo "💡 Services are running on port 8000"

# Show running containers
echo "📋 Running containers:"
docker-compose ps 