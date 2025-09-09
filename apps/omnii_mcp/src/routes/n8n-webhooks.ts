import { Elysia, t } from 'elysia';
import { sendProgressUpdate, sendN8nResponse } from './chat-http';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client using existing environment variables
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Request schemas for n8n webhooks
const N8nProgressBody = t.Object({
  sessionId: t.String(),
  progress: t.Number(),
  message: t.String(),
  userId: t.Optional(t.String())
});

const N8nResponseBody = t.Object({
  sessionId: t.String(),
  userId: t.String(),
  response: t.String(),
  status: t.Union([t.Literal('success'), t.Literal('error'), t.Literal('partial')]),
  metadata: t.Optional(t.Any()),
  agentType: t.Optional(t.String()) // 'web_research', 'youtube_search', etc.
});

const ErrorResponse = t.Object({
  error: t.String(),
  details: t.Optional(t.String())
});

/**
 * n8n Webhook Routes for Progress Updates and Responses
 * 
 * These endpoints allow n8n Agent Swarm to send progress updates and final responses
 * back to the chat system via Server-Sent Events
 */
export default (app: Elysia) =>
  app.group('/n8n', (app) =>
    app
      // Progress update webhook - n8n can send progress updates during long tasks
      .post(
        '/progress/:sessionId',
        async ({ params, body, set }) => {
          try {
            const { sessionId } = params;
            const { progress, message, userId } = body;

            console.log(`[n8n Webhook] Progress update for session ${sessionId}: ${progress}% - ${message}`);

            // Send progress update via Server-Sent Events
            sendProgressUpdate(sessionId, progress, message);

            // Store progress in existing Supabase messages table
            if (userId) {
              await supabase
                .from('messages')
                .insert({
                  chat_id: sessionId,
                  user_id: userId,
                  content: `Progress: ${progress}% - ${message}`,
                  role: 'assistant'
                });
            }
            console.log(`[n8n Webhook] Progress stored: ${progress}% for user ${userId}`);

            return { success: true, message: 'Progress update sent' };

          } catch (error) {
            console.error('[n8n Webhook] Error processing progress update:', error);
            set.status = 500;
            return { 
              error: 'Failed to process progress update',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          params: t.Object({ sessionId: t.String() }),
          body: N8nProgressBody,
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'n8n progress update',
            description: 'Receive progress updates from n8n agents during task execution',
            tags: ['n8n', 'Webhooks']
          }
        }
      )

      // Final response webhook - n8n sends the completed result
      .post(
        '/response/:sessionId',
        async ({ params, body, set }) => {
          try {
            const { sessionId } = params;
            const { userId, response, status, metadata, agentType } = body;

            console.log(`[n8n Webhook] Final response for session ${sessionId} from ${agentType || 'unknown'} agent: ${status}`);

            // Store the n8n response in existing Supabase messages table
            await supabase
              .from('messages')
              .insert({
                chat_id: sessionId,
                user_id: userId,
                content: response,
                role: 'assistant'
              });

            console.log(`[n8n Webhook] Response stored for user ${userId}: ${status}`);

            // Send the response via Server-Sent Events
            sendN8nResponse(sessionId, {
              content: response,
              status,
              agentType,
              metadata,
              category: mapAgentTypeToCategory(agentType)
            });

            return { success: true, message: 'Response processed and sent' };

          } catch (error) {
            console.error('[n8n Webhook] Error processing response:', error);
            set.status = 500;
            return { 
              error: 'Failed to process n8n response',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          params: t.Object({ sessionId: t.String() }),
          body: N8nResponseBody,
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'n8n final response',
            description: 'Receive final response from n8n agents after task completion',
            tags: ['n8n', 'Webhooks']
          }
        }
      )

      // Health check for n8n integration
      .get(
        '/health',
        async () => {
          return {
            status: 'ok',
            service: 'n8n-webhooks',
            timestamp: new Date().toISOString(),
            endpoints: {
              progress: '/api/n8n/progress/:sessionId',
              response: '/api/n8n/response/:sessionId'
            }
          };
        },
        {
          response: {
            200: t.Object({
              status: t.String(),
              service: t.String(),
              timestamp: t.String(),
              endpoints: t.Object({
                progress: t.String(),
                response: t.String()
              })
            })
          },
          detail: {
            summary: 'n8n webhooks health check',
            description: 'Check if n8n webhook endpoints are operational',
            tags: ['n8n', 'Health']
          }
        }
      )
  );

/**
 * Map n8n agent type to response category for mobile app
 */
function mapAgentTypeToCategory(agentType?: string): string {
  switch (agentType) {
    case 'web_research':
      return 'WEB_RESEARCH';
    case 'youtube_search':
      return 'YOUTUBE_SEARCH';
    case 'email_agent':
      return 'AGENT_AUTOMATION';
    case 'calendar_agent':
      return 'AGENT_AUTOMATION';
    case 'workflow_coordinator':
      return 'WORKFLOW_COORDINATION';
    default:
      return 'N8N_AGENT_RESPONSE';
  }
}
