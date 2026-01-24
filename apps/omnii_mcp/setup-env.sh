#!/bin/bash

# Omnii MCP Environment Setup Script (Updated for Production)
# This script helps you create a .env file with the required environment variables

echo "🔧 Setting up Omnii MCP Environment Variables (Production Ready)"
echo "=================================================================="

# Create .env file with production-ready defaults
cat > .env << 'EOF'
# Environment Configuration for Omnii MCP
# Configure your actual values below

# Node.js Environment
NODE_ENV=development
PORT=8000

# Production Backend URL (UPDATE THIS FOR YOUR DEPLOYMENT)
BASE_URL=https://omniimcp-production.up.railway.app
PUBLIC_URL=https://omniimcp-production.up.railway.app

# Supabase Configuration (CRITICAL - GET THESE FROM YOUR SUPABASE DASHBOARD)
SUPABASE_URL=https://auth.omnii.net
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Neo4j AuraDB Configuration (CRITICAL - DIRECT CONNECTION TO YOUR PAID INSTANCE)
NEO4J_URI=neo4j+s://your-instance-id.databases.neo4j.io
NEO4J_USER=neo4j  
NEO4J_PASSWORD=your_auradb_password_here
NEO4J_DATABASE=neo4j

# OpenAI Integration (CRITICAL)
OPENAI_API_KEY=your_openai_api_key_here

# Composio API (for Google integrations)
COMPOSIO_API_KEY=exby0bz32hpz8nmmahu3o

# Google OAuth Configuration (Required for Google services)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://omniimcp-production.up.railway.app/oauth/google/callback

# Twilio SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Redis Cache (Production Railway URL)  
REDIS_URL=redis://default:udnAmLnQiUKdYkNFYIlrOpJmKzTtYlpm@redis-production-7aec.up.railway.app:6379

# RDF Python Service (Production Railway Internal URL)
RDF_PYTHON_SERVICE_URL=http://omnii-rdf-python-production.railway.internal:8000

# Security Configuration (CRITICAL - GENERATE SECURE KEYS)
JWT_SECRET=your_jwt_secret_minimum_32_characters_long_use_openssl_rand_hex_32
OAUTH_ENCRYPTION_KEY=your_oauth_encryption_key_64_characters_minimum_use_openssl_rand_hex_64

# CORS Configuration (Update for your frontend domains)
CORS_ORIGINS=http://localhost:3000,http://localhost:4173,http://localhost:8000,https://omnii.net,https://auth.omnii.net

# Feature Flags & Performance
DISABLE_REDIS=false
MEMORY_BRIDGE_ENABLED=true
MEMORY_CACHE_TTL=300
CONTEXT_RETRIEVAL_TIMEOUT=2000

# Development/Testing Configuration
OMNII_TEST_ENV=LOCAL
TEST_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/callback

# Google Services Configuration (Optional)
GOOGLE_CREDENTIALS_PATH=./google-service-account.json
EOF

echo "✅ Created production-ready .env file"
echo ""
echo "🌐 PRODUCTION CONFIGURATION READY:"
echo "   - Backend URL: https://omniimcp-production.up.railway.app"
echo "   - Redis: Production Railway instance configured"
echo "   - RDF Service: Production Railway internal URL"
echo "   - Google OAuth: Production callback URLs"
echo ""
echo "🔑 CRITICAL: You MUST configure these environment variables:"
echo ""
echo "1. 🔐 SUPABASE CONFIGURATION:"
echo "   SUPABASE_URL - Your Supabase project URL"
echo "   SUPABASE_ANON_KEY - Public/anon key from Supabase dashboard" 
echo "   SUPABASE_SERVICE_ROLE_KEY - Service role key (admin privileges)"
echo "   → Get from: https://supabase.com/dashboard/project/[your-project]/settings/api"
echo ""
echo "2. 🤖 OPENAI_API_KEY:"
echo "   → Get from: https://platform.openai.com/api-keys"
echo ""
echo "3. 📊 NEO4J AURADB CONFIGURATION (DIRECT CONNECTION):"
echo "   NEO4J_URI - Your AuraDB connection string"
echo "   NEO4J_PASSWORD - Your AuraDB password"
echo "   → Get from: https://console.neo4j.io/"
echo "   → Format: neo4j+s://your-instance-id.databases.neo4j.io"
echo "   → Use DIRECT connection - no intermediary services needed!"
echo ""
echo "4. 🔒 SECURITY KEYS (Generate secure random strings):"
echo "   JWT_SECRET - Run: openssl rand -hex 32"
echo "   OAUTH_ENCRYPTION_KEY - Run: openssl rand -hex 64"
echo ""
echo "5. 🌐 GOOGLE OAUTH (Optional but recommended):"
echo "   GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET"
echo "   → Get from: https://console.developers.google.com/"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env file with your actual credentials"
echo "2. For mobile app, also set EXPO_PUBLIC_BACKEND_BASE_URL:"
echo "   export EXPO_PUBLIC_BACKEND_BASE_URL=\"https://omniimcp-production.up.railway.app\""
echo ""
echo "🚀 Start development server:"
echo "   bun run dev"
echo ""
echo "🧪 Test your configuration:"
echo "   curl https://omniimcp-production.up.railway.app/health"
echo ""
echo "✅ Privacy Protection: All Neo4j operations now enforce user_id for data isolation!" 