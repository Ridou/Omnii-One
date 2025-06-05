#!/bin/bash
set -e

echo "📦 Deploying Omnii MCP to EC2..."

# Pull latest changes
echo "🔄 Pulling latest changes from Git..."
git pull

# Build and restart container
echo "🐳 Building and restarting Docker container..."
docker-compose down
docker-compose build
docker-compose up -d

# Check container status
echo "🔍 Checking container status..."
docker-compose ps

# Display logs
echo "📜 Recent logs:"
docker-compose logs --tail=20

echo "✅ Deployment complete!"
echo "💡 Health check: http://localhost:8000/health" 