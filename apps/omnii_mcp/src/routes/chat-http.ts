import { Elysia, t } from 'elysia';
import { EnhancedWebSocketHandler } from '../services/core/enhanced-websocket-handler';
import { BrainConversationManager } from '../services/core/brain-conversation-manager';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client using existing environment variables
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Request/Response schemas
const SendMessageBody = t.Object({
  userId: t.String(),
  message: t.String(),
  sessionId: t.Optional(t.String())
});

const ChatHistoryParams = t.Object({
  userId: t.String()
});

const StreamParams = t.Object({
  sessionId: t.String()
});

const ErrorResponse = t.Object({
  error: t.String(),
  details: t.Optional(t.String())
});

// Initialize services (reuse existing logic)
const enhancedHandler = new EnhancedWebSocketHandler();
const brainManager = new BrainConversationManager();

// Store for Server-Sent Events connections
const sseConnections = new Map<string, ReadableStreamDefaultController>();

/**
 * HTTP Chat Routes - Stateless alternative to WebSocket
 * 
 * Reuses existing ActionPlanner, BrainConversationManager, and n8n integration logic
 * while providing persistent chat history and Railway-friendly scaling
 */
export default (app: Elysia) =>
  app.group('/chat', (app) =>
    app
      // Send message endpoint - processes through existing ActionPlanner
      .post(
        '/send',
        async ({ body, set }) => {
          try {
            const { userId, message, sessionId } = body;
            const actualSessionId = sessionId || uuidv4();

            console.log(`[HTTP Chat] Processing message for user: ${userId}`);

            // Store user message in existing Supabase messages table
            await supabase
              .from('messages')
              .insert({
                chat_id: actualSessionId,
                user_id: userId,
                content: message,
                role: 'user'
              });

            console.log(`[HTTP Chat] User message stored: ${message}`);

            // Process message through existing enhanced WebSocket handler logic
            // This reuses all your ActionPlanner, n8n routing, and brain memory logic
            const mockWebSocketMessage = {
              type: 'command' as const,
              payload: {
                commandType: 'text_command' as const,
                message: message,
                userId: userId,
                userTimezone: 'America/Los_Angeles' // Could be passed from client
              },
              timestamp: Date.now()
            };

            // Create a mock WebSocket for the handler
            const mockWs = {
              send: (data: string) => {
                // Parse the response and store it
                try {
                  const response = JSON.parse(data);
                  handleAIResponse(userId, actualSessionId, response);
                } catch (error) {
                  console.error('[HTTP Chat] Error parsing WebSocket response:', error);
                }
              },
              readyState: 1 // OPEN
            };

            // Process through existing handler (this handles ActionPlanner, n8n routing, etc.)
            const result = await enhancedHandler.processMessage(mockWebSocketMessage, mockWs as any);

            // Store the conversation in brain memory (existing system)
            await brainManager.storeChatConversation({
              user_id: userId,
              content: message,
              chat_id: actualSessionId,
              is_incoming: true,
              websocket_session_id: actualSessionId
            });

            return { 
              success: true, 
              sessionId: actualSessionId,
              message: 'Message processed successfully'
            };

          } catch (error) {
            console.error('[HTTP Chat] Error processing message:', error);
            set.status = 500;
            return { 
              error: 'Failed to process message',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          body: SendMessageBody,
          response: {
            200: t.Object({
              success: t.Boolean(),
              sessionId: t.String(),
              message: t.String()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Send chat message',
            description: 'Send a message and process it through the AI system',
            tags: ['Chat']
          }
        }
      )

      // Get chat history endpoint
      .get(
        '/history/:userId',
        async ({ params, query, set }) => {
          try {
            const { userId } = params;
            const limit = query.limit ? parseInt(query.limit as string) : 50;

            console.log(`[HTTP Chat] Loading history for user: ${userId}`);

            // Get chat history from existing Supabase messages table
            const { data: messages, error } = await supabase
              .from('messages')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(limit);

            if (error) {
              throw error;
            }

            // Reverse to get chronological order (oldest first)
            const chronologicalMessages = (messages || []).reverse().map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.role === 'user' ? 'user' : 'ai',
              timestamp: msg.created_at,
              type: 'text',
              metadata: {}
            }));

            return { 
              messages: chronologicalMessages,
              total: chronologicalMessages.length
            };

          } catch (error) {
            console.error('[HTTP Chat] Error loading history:', error);
            set.status = 500;
            return { 
              error: 'Failed to load chat history',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          params: ChatHistoryParams,
          query: t.Object({
            limit: t.Optional(t.String())
          }),
          response: {
            200: t.Object({
              messages: t.Array(t.Object({
                id: t.String(),
                content: t.String(),
                sender: t.String(),
                timestamp: t.String(),
                type: t.String(),
                metadata: t.Any()
              })),
              total: t.Number()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Get chat history',
            description: 'Retrieve chat message history for a user',
            tags: ['Chat']
          }
        }
      )

      // Server-Sent Events endpoint for real-time updates
      .get(
        '/stream/:sessionId',
        async ({ params, set }) => {
          const { sessionId } = params;

          console.log(`[HTTP Chat] Starting SSE stream for session: ${sessionId}`);

          // Set SSE headers
          set.headers['Content-Type'] = 'text/event-stream';
          set.headers['Cache-Control'] = 'no-cache';
          set.headers['Connection'] = 'keep-alive';
          set.headers['Access-Control-Allow-Origin'] = '*';

          // Create SSE stream
          const stream = new ReadableStream({
            start(controller) {
              // Store connection for sending updates
              sseConnections.set(sessionId, controller);

              // Send initial connection confirmation
              controller.enqueue(`data: ${JSON.stringify({
                type: 'connected',
                sessionId,
                timestamp: Date.now()
              })}\n\n`);

              // Heartbeat to keep connection alive
              const heartbeat = setInterval(() => {
                try {
                  controller.enqueue(`data: ${JSON.stringify({
                    type: 'heartbeat',
                    timestamp: Date.now()
                  })}\n\n`);
                } catch (error) {
                  clearInterval(heartbeat);
                  sseConnections.delete(sessionId);
                }
              }, 30000); // 30 seconds

              // Cleanup on close
              return () => {
                clearInterval(heartbeat);
                sseConnections.delete(sessionId);
                console.log(`[HTTP Chat] SSE stream closed for session: ${sessionId}`);
              };
            }
          });

          return new Response(stream);
        },
        {
          params: StreamParams,
          detail: {
            summary: 'Server-Sent Events stream',
            description: 'Real-time updates for chat messages and progress',
            tags: ['Chat', 'SSE']
          }
        }
      )
  );

/**
 * Handle AI response and send via SSE
 */
async function handleAIResponse(userId: string, sessionId: string, response: any) {
  try {
    // Store AI response in existing Supabase messages table
    await supabase
      .from('messages')
      .insert({
        chat_id: sessionId,
        user_id: userId,
        content: response.data?.message || JSON.stringify(response),
        role: 'assistant'
      });

    console.log(`[HTTP Chat] AI response stored: ${response.data?.message || 'response received'}`);

    // Send real-time update via SSE
    const controller = sseConnections.get(sessionId);
    if (controller) {
      controller.enqueue(`data: ${JSON.stringify({
        type: 'message',
        message: {
          id: uuidv4(),
          content: response.data?.message || JSON.stringify(response),
          sender: 'ai',
          timestamp: new Date().toISOString(),
          type: 'text',
          metadata: {
            category: response.data?.category || 'general',
            action: response.data?.action || 'response'
          }
        },
        timestamp: Date.now()
      })}\n\n`);
    }

    console.log(`[HTTP Chat] AI response processed and sent via SSE for session: ${sessionId}`);

  } catch (error) {
    console.error('[HTTP Chat] Error handling AI response:', error);
  }
}

/**
 * Send progress update via SSE (for n8n integration)
 */
export function sendProgressUpdate(sessionId: string, progress: number, message: string) {
  const controller = sseConnections.get(sessionId);
  if (controller) {
    controller.enqueue(`data: ${JSON.stringify({
      type: 'progress',
      progress,
      message,
      timestamp: Date.now()
    })}\n\n`);
  }
}

/**
 * Send n8n response via SSE
 */
export function sendN8nResponse(sessionId: string, response: any) {
  const controller = sseConnections.get(sessionId);
  if (controller) {
    controller.enqueue(`data: ${JSON.stringify({
      type: 'n8n_response',
      response,
      timestamp: Date.now()
    })}\n\n`);
  }
}
