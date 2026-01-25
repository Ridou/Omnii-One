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
// Note: BrainConversationManager requires TCP driver (deprecated)
// Legacy chat routes will not function until migrated to HTTP client
let brainManager: BrainConversationManager | null = null;
try {
  // BrainConversationManager is deprecated - requires TCP driver which is broken with Bun
  // Skip initialization for now - chat routes will return 503
  console.log('⚠️  BrainConversationManager skipped (requires deprecated TCP driver)');
} catch (e) {
  console.log('⚠️  BrainConversationManager initialization skipped:', e);
}

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

            console.log(`🚀 [HTTP Chat] === PROCESSING MESSAGE ===`);
            console.log(`👤 User ID: ${userId}`);
            console.log(`💬 Message: "${message}"`);
            console.log(`🔗 Session ID: ${actualSessionId}`);
            console.log(`📝 Body received:`, JSON.stringify(body, null, 2));

            // Store user message in existing Supabase messages table
            console.log(`💾 [HTTP Chat] Storing user message in Supabase...`);
            const { data: insertData, error: insertError } = await supabase
              .from('messages')
              .insert({
                chat_id: actualSessionId,
                user_id: userId,
                content: message,
                role: 'user'
              })
              .select();

            if (insertError) {
              console.error(`❌ [HTTP Chat] Supabase insert error:`, insertError);
              throw insertError;
            }

            console.log(`✅ [HTTP Chat] User message stored successfully:`, insertData);

            // Process message through existing enhanced WebSocket handler logic
            console.log(`🧠 [HTTP Chat] Processing through ActionPlanner...`);
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

            console.log(`📦 [HTTP Chat] Mock WebSocket message:`, JSON.stringify(mockWebSocketMessage, null, 2));

            // Create a mock WebSocket for the handler
            const mockWs = {
              send: (data: string) => {
                console.log(`📤 [HTTP Chat] Mock WebSocket send called with:`, data);
                // Parse the response and store it
                try {
                  const response = JSON.parse(data);
                  console.log(`🔄 [HTTP Chat] Parsed response:`, JSON.stringify(response, null, 2));
                  handleAIResponse(userId, actualSessionId, response);
                } catch (error) {
                  console.error('❌ [HTTP Chat] Error parsing WebSocket response:', error);
                }
              },
              readyState: 1 // OPEN
            };

            console.log(`⚡ [HTTP Chat] Calling enhancedHandler.processMessage...`);
            // Process through existing handler (this handles ActionPlanner, n8n routing, etc.)
            const result = await enhancedHandler.processMessage(mockWebSocketMessage, mockWs as any);
            console.log(`✅ [HTTP Chat] Handler result:`, JSON.stringify(result, null, 2));

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
    console.log(`🤖 [HTTP Chat] === HANDLING AI RESPONSE ===`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`🔗 Session ID: ${sessionId}`);
    console.log(`📝 Response data:`, JSON.stringify(response, null, 2));

    const aiMessage = response.data?.message || JSON.stringify(response);
    console.log(`💬 AI Message content: "${aiMessage}"`);

    // Store AI response in existing Supabase messages table
    console.log(`💾 [HTTP Chat] Storing AI response in Supabase...`);
    const { data: aiInsertData, error: aiInsertError } = await supabase
      .from('messages')
      .insert({
        chat_id: sessionId,
        user_id: userId,
        content: aiMessage,
        role: 'assistant'
      })
      .select();

    if (aiInsertError) {
      console.error(`❌ [HTTP Chat] AI message Supabase insert error:`, aiInsertError);
      throw aiInsertError;
    }

    console.log(`✅ [HTTP Chat] AI response stored successfully:`, aiInsertData);

    // Send real-time update via SSE
    console.log(`📡 [HTTP Chat] Sending SSE update...`);
    const controller = sseConnections.get(sessionId);
    console.log(`🔌 [HTTP Chat] SSE controller found:`, !!controller);
    
    if (controller) {
      const sseMessage = {
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
      };
      
      console.log(`📤 [HTTP Chat] Sending SSE message:`, JSON.stringify(sseMessage, null, 2));
      controller.enqueue(`data: ${JSON.stringify(sseMessage)}\n\n`);
      console.log(`✅ [HTTP Chat] SSE message sent successfully`);
    } else {
      console.log(`⚠️ [HTTP Chat] No SSE controller found for session: ${sessionId}`);
    }

    console.log(`🎉 [HTTP Chat] AI response processing complete for session: ${sessionId}`);

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
