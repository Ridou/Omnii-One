# n8n Cloud Configuration

## Overview
The omnii_mcp server has been configured to use your n8n cloud instance instead of the Railway deployment.

## Configuration Changes

### Environment Variables
Added to `.env`:
```bash
# n8n Agent Swarm Configuration
N8N_AGENT_SWARM_URL=https://santino62.app.n8n.cloud
N8N_AGENT_ENABLED=true
N8N_AGENT_TIMEOUT=600000
N8N_FALLBACK_ENABLED=true
N8N_ENABLED_AGENTS=email,calendar,contact,web,youtube
```

### How It Works
1. The server constructs webhook URLs by appending `/webhook/agent-input` to the base URL
2. Agent requests are sent to: `https://santino62.app.n8n.cloud/webhook/agent-input`
3. The n8n cloud instance processes the requests and returns responses

## Testing

### Health Check
```bash
curl http://localhost:8000/api/n8n/health
```

### Direct n8n Chat Test
```bash
curl -X POST http://localhost:8000/api/chat/n8n-direct \
-H "Content-Type: application/json" \
-d '{
  "userId": "test-user-123",
  "message": "What is the weather today?"
}'
```

## Benefits
- **No Railway Dependency**: Using your own n8n cloud instance
- **Direct Control**: You can modify workflows in your n8n editor
- **Same API**: No code changes needed, just environment configuration

## n8n Workflow
Your workflow is accessible at: https://santino62.app.n8n.cloud/workflow/didIAGsrWytirrV9

## Troubleshooting
If you encounter issues:
1. Verify your n8n workflow is active and the webhook is enabled
2. Check the webhook URL in n8n matches the expected path
3. Ensure CORS is configured if needed
4. Review server logs for connection errors

## Next Steps
- Test all agent types (email, calendar, contacts, etc.)
- Monitor performance and adjust timeout if needed
- Configure any additional webhook security if required
