#!/bin/bash

# Omnii MCP Environment Setup Script
# This script helps you create a .env file with the required environment variables

echo "🔧 Setting up Omnii MCP Environment Variables"
echo "=============================================="

# Create .env file
cat > .env << 'EOF'
# Environment Configuration for Omnii MCP
# Configure your actual values below

# Node.js Environment
NODE_ENV=development
PORT=8000

# Supabase Configuration (CRITICAL)
SUPABASE_URL=https://aaxiawuatfajjpvwtjuz.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Neo4j Database Configuration (CRITICAL)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password_here
NEO4J_DATABASE=neo4j

# JWT/OAuth Security (CRITICAL)
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
OAUTH_ENCRYPTION_KEY=your_encryption_key_here_64_chars_minimum_length_for_security
JWT_ISSUER=omnii-client

# OpenAI Integration
OPENAI_API_KEY=your_openai_api_key_here

# Redis Cache (Railway Public URL)
REDIS_URL=redis://default:udnAmLnQiUKdYkNFYIlrOpJmKzTtYlpm@redis-production-7aec.up.railway.app:6379

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:4173,http://localhost:8000

# OAuth Provider Credentials (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Testing Configuration
OMNII_TEST_ENV=LOCAL
TEST_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/callback
EOF

echo "✅ Created .env file with default values"
echo ""
echo "🔑 IMPORTANT: You need to configure these critical environment variables:"
echo ""
echo "1. SUPABASE_ANON_KEY - Get this from your Supabase project dashboard"
echo "   → Go to: https://supabase.com/dashboard/project/[your-project]/settings/api"
echo ""
echo "2. NEO4J_PASSWORD - Your Neo4j database password"
echo "   → If using local Neo4j: set your password"
echo "   → If using Neo4j Aura: get from your Aura console"
echo ""
echo "3. JWT_SECRET - Generate a secure random string (32+ characters)"
echo "   → Run: openssl rand -hex 32"
echo ""
echo "4. OAUTH_ENCRYPTION_KEY - Generate a secure random string (64+ characters)"
echo "   → Run: openssl rand -hex 64"
echo ""
echo "5. OPENAI_API_KEY - Get from OpenAI dashboard"
echo "   → Go to: https://platform.openai.com/api-keys"
echo ""
echo "📝 Edit the .env file and replace the placeholder values with your actual credentials."
echo ""
echo "🚀 After configuring, restart your application:"
echo "   npm run dev"
echo ""
echo "🧪 Test your configuration:"
echo "   npm run test:endpoints" 