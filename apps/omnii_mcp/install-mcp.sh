#!/bin/bash
# MCP installation script

echo "📦 Installing MCP dependencies..."

# Install the MCP SDK
npm install @modelcontextprotocol/sdk

# Install Redis and related types
npm install redis@4.6.10
npm install -D @types/redis

# Make sure express types are installed
npm install -D @types/express

echo "✅ MCP dependencies installed!"
echo "🚀 Build the project with 'npm run build'"
echo "🏃‍♂️ Start the server with 'npm run dev' or 'npm start'" 