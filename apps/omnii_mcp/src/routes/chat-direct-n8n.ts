import { Elysia, t } from 'elysia';

// Request schema for direct n8n integration
const DirectN8nBody = t.Object({
  userId: t.String(),
  message: t.String()
});

const ErrorResponse = t.Object({
  error: t.String(),
  details: t.Optional(t.String())
});

/**
 * Direct n8n Agent Swarm Integration
 * 
 * Bypasses complex routing logic and sends requests directly to n8n Agent Swarm
 * This matches the working curl command provided by the user
 */
export default (app: Elysia) =>
  app.group('/chat', (app) =>
    app
      // Direct n8n endpoint - bypasses executive assistant flow
      .post(
        '/n8n-direct',
        async ({ body, set }) => {
          try {
            const { userId, message } = body;

            console.log(`🚀 [Direct n8n] === SENDING TO N8N AGENT SWARM ===`);
            console.log(`👤 User ID: ${userId}`);
            console.log(`💬 Message: "${message}"`);
            console.log(`🌐 n8n URL: https://omnii-agent-swarm-production.up.railway.app/webhook/agent-input`);

            // Call n8n Agent Swarm directly (exactly like the working curl command)
            const n8nResponse = await fetch('https://omnii-agent-swarm-production.up.railway.app/webhook/agent-input', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'omnii-mobile-chat'
              },
              body: JSON.stringify({
                message: message,
                user_id: userId
              })
            });

            console.log(`📡 [Direct n8n] n8n response status: ${n8nResponse.status}`);

            if (!n8nResponse.ok) {
              const errorText = await n8nResponse.text();
              console.error(`❌ [Direct n8n] n8n Agent Swarm error:`, errorText);
              throw new Error(`n8n Agent Swarm error: ${n8nResponse.status} - ${errorText}`);
            }

            const n8nData = await n8nResponse.json();
            console.log(`✅ [Direct n8n] n8n response received:`, JSON.stringify(n8nData, null, 2));

            // Transform n8n response to match mobile app expectations
            const transformedResponse = {
              success: n8nData.success || true,
              type: 'n8n_agent_response',
              data: {
                message: n8nData.data?.output || n8nData.output || n8nData.message || 'Response from n8n agent',
                category: 'n8n_agent_response',
                action: 'n8n_agent_response',
                agentType: n8nData.agent || 'unknown',
                executionTime: n8nData.execution_time || '0s',
                rawResponse: n8nData
              },
              timestamp: Date.now()
            };

            console.log(`🎯 [Direct n8n] Transformed response:`, JSON.stringify(transformedResponse, null, 2));

            return transformedResponse;

          } catch (error) {
            console.error('❌ [Direct n8n] Error calling n8n Agent Swarm:', error);
            set.status = 500;
            return { 
              error: 'Failed to process message via n8n Agent Swarm',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          body: DirectN8nBody,
          response: {
            200: t.Object({
              success: t.Boolean(),
              type: t.String(),
              data: t.Object({
                message: t.String(),
                category: t.String(),
                action: t.String(),
                agentType: t.String(),
                executionTime: t.String(),
                rawResponse: t.Any()
              }),
              timestamp: t.Number()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Direct n8n Agent Swarm integration',
            description: 'Send messages directly to n8n Agent Swarm bypassing local routing',
            tags: ['Chat', 'n8n']
          }
        }
      )

      // Health check for direct n8n integration
      .get(
        '/n8n-direct/health',
        async () => {
          try {
            // Test n8n Agent Swarm connectivity
            const testResponse = await fetch('https://omnii-agent-swarm-production.up.railway.app/webhook/agent-input', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: 'health check',
                user_id: 'health-check-user'
              })
            });

            const isHealthy = testResponse.ok;
            
            return {
              status: isHealthy ? 'healthy' : 'unhealthy',
              service: 'n8n-agent-swarm',
              url: 'https://omnii-agent-swarm-production.up.railway.app/webhook/agent-input',
              responseStatus: testResponse.status,
              timestamp: new Date().toISOString()
            };

          } catch (error) {
            return {
              status: 'unhealthy',
              service: 'n8n-agent-swarm',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            };
          }
        },
        {
          response: {
            200: t.Object({
              status: t.String(),
              service: t.String(),
              url: t.Optional(t.String()),
              responseStatus: t.Optional(t.Number()),
              error: t.Optional(t.String()),
              timestamp: t.String()
            })
          },
          detail: {
            summary: 'Direct n8n health check',
            description: 'Check connectivity to n8n Agent Swarm',
            tags: ['n8n', 'Health']
          }
        }
      )
  );
