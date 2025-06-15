#!/bin/bash

# Start script for local Python RDF service on port 8001

echo "🐍 Starting Python RDF service on port 8001..."
echo "📍 Redis will use local instance (localhost:6379) unless REDIS_URL is set"
echo "📍 MCP service should be running on port 8000"
echo ""

# Set port to 8001 for local testing
export PORT=8001

# Optional: Set local Redis URL if needed (defaults to localhost:6379)
# export REDIS_URL=redis://localhost:6379

# Start the service
cd "$(dirname "$0")"
python app/main.py