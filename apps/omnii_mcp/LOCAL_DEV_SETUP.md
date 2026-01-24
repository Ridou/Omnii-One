# Local Development Setup

## Quick Fix: Disable Neo4j for Local Development

Since you're running locally and don't have a Neo4j AuraDB instance, here are two options:

### Option 1: Minimal .env for Local Development

Create a new `.env` file with only the essentials:

```bash
# Core settings
NODE_ENV=development
PORT=8000
BASE_URL=http://localhost:8000
PUBLIC_URL=http://localhost:8000

# Required: OpenAI API Key
OPENAI_API_KEY=sk-... # Get from https://platform.openai.com/api-keys

# Required: Some fake keys to prevent crashes
JWT_SECRET=local_dev_secret_123456789
OAUTH_ENCRYPTION_KEY=local_dev_key_123456789
SUPABASE_URL=https://fake.supabase.co
SUPABASE_ANON_KEY=fake_key
SUPABASE_SERVICE_ROLE_KEY=fake_key

# Disable external services
DISABLE_REDIS=true
DISABLE_NEO4J=true  # We'll add support for this

# Neo4j placeholders (won't be used)
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# n8n Agent Swarm (keep this for chat routing)
N8N_AGENT_ENABLED=true
N8N_AGENT_SWARM_URL=https://santino62.app.n8n.cloud

# Optional services (already disabled via code changes)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Option 2: Use Local Neo4j with Docker

If you want Neo4j functionality locally:

```bash
# Run Neo4j locally with Docker
docker run -d \
  --name neo4j-local \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest

# Then update .env:
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j
```

### Option 3: Get Free Neo4j AuraDB Instance

1. Go to https://neo4j.com/cloud/aura-free/
2. Sign up for a free account
3. Create a free instance
4. Copy the connection details to your .env

## Current Status

Your server is running with:
- ✅ Health endpoint: http://localhost:8000/health
- ✅ WebSocket chat: ws://localhost:8000/ws
- ✅ Swagger docs: http://localhost:8000/swagger
- ⚠️ Neo4j endpoints: Will fail until configured
- ⚠️ SMS features: Disabled (Twilio not configured)

## What's Working Without Neo4j

- Basic chat functionality
- WebSocket connections
- n8n routing (to production n8n)
- Health checks
- API documentation

## What Needs Neo4j

- Brain memory features
- Concept storage
- Knowledge graph queries
- Memory context retrieval
