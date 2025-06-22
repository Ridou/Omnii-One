import { Elysia, t } from 'elysia';
import { productionBrainService, neo4jService } from '../config/neo4j.config';

// Define schemas for brain-enhanced endpoints
const SearchQuery = t.Object({
  user_id: t.String(),
  q: t.String(),
  limit: t.Optional(t.Numeric())
});

const ListQuery = t.Object({
  user_id: t.String(),
  limit: t.Optional(t.Numeric()),
  filter: t.Optional(t.String())
});

const BrainMemoryQuery = t.Object({
  user_id: t.String(),
  current_message: t.String(),
  channel: t.Union([t.Literal('sms'), t.Literal('chat')]),
  source_identifier: t.String(),
  working_memory_size: t.Optional(t.Numeric()),
  episodic_window_hours: t.Optional(t.Numeric())
});

const StoreConversationBody = t.Object({
  user_id: t.String(),
  content: t.String(),
  channel: t.Union([t.Literal('sms'), t.Literal('chat')]),
  phone_number: t.Optional(t.String()),
  chat_id: t.Optional(t.String()),
  is_incoming: t.Boolean(),
  websocket_session_id: t.Optional(t.String()),
  is_group_chat: t.Optional(t.Boolean()),
  participants: t.Optional(t.Array(t.String())),
  google_service_context: t.Optional(t.Object({
    service_type: t.Optional(t.Union([
      t.Literal('calendar'), 
      t.Literal('tasks'), 
      t.Literal('contacts'), 
      t.Literal('email')
    ])),
    operation: t.Optional(t.String()),
    entity_ids: t.Optional(t.Array(t.String()))
  }))
});

const ErrorResponse = t.Object({
  error: t.String(),
  details: t.Optional(t.String())
});

// Enhanced routes with brain-like memory integration
export default (app: Elysia) =>
  app.group('/neo4j', (app) =>
    app
      // Health check endpoint
      .get(
        '/health',
        async ({ set }) => {
          try {
            const health = await neo4jService.healthCheck();
            return { ...health };
          } catch (error) {
            console.error('[Neo4j] Health check failed:', error);
            set.status = 500;
            return { 
              status: 'error',
              error: 'Neo4j health check failed',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          detail: {
            summary: 'Neo4j health check',
            description: 'Check Neo4j brain memory system status',
            tags: ['Neo4j', 'Health']
          }
        }
      )

      // Brain-enhanced concept search
      .get(
        '/concepts/search',
        async ({ query, set }) => {
          try {
            const results = await neo4jService.searchSimilarConcepts(
              query.user_id,
              query.q,
              query.limit ? Number(query.limit) : 5
            );
            return { data: results };
          } catch (error) {
            console.error('[Neo4j] Error searching concepts:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          query: SearchQuery,
          response: {
            200: t.Object({
              data: t.Array(t.Any())
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Search similar concepts',
            description: 'Search for concepts similar to the provided query using brain-like semantic memory',
            tags: ['Neo4j', 'Brain Memory']
          }
        }
      )
      
      // Brain-enhanced concept listing
      .get(
        '/concepts',
        async ({ query, set }) => {
          try {
            const concepts = await neo4jService.listNodes(
              query.user_id,
              'Concept',
              query.limit ? Number(query.limit) : 100,
              query.filter
            );
            return { data: concepts };
          } catch (error) {
            console.error('[Neo4j] Error listing concepts:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          query: ListQuery,
          response: {
            200: t.Object({
              data: t.Array(t.Any())
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'List concepts',
            description: 'List all concepts with optional filtering using brain memory system',
            tags: ['Neo4j', 'Brain Memory']
          }
        }
      )

      // Get AI context with brain-like memory retrieval
      .get(
        '/context',
        async ({ query, set }) => {
          try {
            const context = await neo4jService.getContextForQuery(
              query.user_id,
              query.q,
              query.limit ? Number(query.limit) : 3
            );
            return { data: context };
          } catch (error) {
            console.error('[Neo4j] Error getting context:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          query: SearchQuery,
          response: {
            200: t.Object({
              data: t.Object({
                nodes: t.Array(t.Any()),
                relationships: t.Array(t.Any())
              })
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Get AI context',
            description: 'Retrieve contextual information for AI queries using brain memory',
            tags: ['Neo4j', 'Brain Memory', 'AI Context']
          }
        }
      )

      // Get node context with relationships
      .get(
        '/nodes/:nodeId/context',
        async ({ params, query, set }) => {
          try {
            // For now, return the node itself - this could be enhanced with brain context
            const nodes = await neo4jService.listNodes(
              query.user_id,
              'Concept',
              1
            );
            
            const targetNode = nodes.find((n: any) => n.id === params.nodeId);
            if (!targetNode) {
              set.status = 404;
              return { error: 'Node not found' };
            }

            return { 
              data: {
                nodes: [targetNode],
                relationships: []
              }
            };
          } catch (error) {
            console.error('[Neo4j] Error getting node context:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          params: t.Object({
            nodeId: t.String()
          }),
          query: t.Object({
            user_id: t.String()
          }),
          response: {
            200: t.Object({
              data: t.Object({
                nodes: t.Array(t.Any()),
                relationships: t.Array(t.Any())
              })
            }),
            404: ErrorResponse,
            500: ErrorResponse
          },
          detail: {
            summary: 'Get node context',
            description: 'Retrieve a specific node and its connected context',
            tags: ['Neo4j', 'Brain Memory']
          }
        }
      )

      // NEW: Brain Memory Context endpoint
      .get(
        '/brain-memory-context',
        async ({ query, set }) => {
          try {
            console.log(`[Neo4j] 🧠 Getting brain memory context for user: ${query.user_id}`);
            
            const brainContext = await neo4jService.getBrainMemoryContext(
              query.user_id,
              query.current_message,
              query.channel,
              query.source_identifier
            );

            console.log(`[Neo4j] ✅ Retrieved brain memory context`);
            
            return { 
              data: brainContext,
              metadata: {
                memory_strength: brainContext.consolidation_metadata?.memory_strength || 0.5,
                working_memory_count: brainContext.working_memory?.recent_messages?.length || 0,
                episodic_threads: brainContext.episodic_memory?.conversation_threads?.length || 0,
                semantic_concepts: brainContext.semantic_memory?.activated_concepts?.length || 0
              }
            };
          } catch (error) {
            console.error('[Neo4j] Error getting brain memory context:', error);
            set.status = 500;
            return { 
              error: 'Failed to retrieve brain memory context',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          query: BrainMemoryQuery,
          response: {
            200: t.Object({
              data: t.Any(), // BrainMemoryContext - complex schema
              metadata: t.Object({
                memory_strength: t.Number(),
                working_memory_count: t.Number(),
                episodic_threads: t.Number(),
                semantic_concepts: t.Number()
              })
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Get brain memory context',
            description: 'Retrieve brain-like memory context for SMS/Chat conversations',
            tags: ['Neo4j', 'Brain Memory', 'AI Context']
          }
        }
      )

      // NEW: Store conversation with brain processing
      .post(
        '/store-conversation',
        async ({ body, set }) => {
          try {
            console.log(`[Neo4j] 💾 Storing ${body.channel} conversation for user: ${body.user_id}`);
            
            let result;
            
            if (body.channel === 'sms') {
              if (!body.phone_number) {
                set.status = 400;
                return { error: 'phone_number is required for SMS conversations' };
              }
              
              result = await productionBrainService.manager.storeSMSConversation({
                user_id: body.user_id,
                content: body.content,
                phone_number: body.phone_number,
                is_incoming: body.is_incoming,
                google_service_context: body.google_service_context
              });
            } else if (body.channel === 'chat') {
              if (!body.chat_id) {
                set.status = 400;
                return { error: 'chat_id is required for chat conversations' };
              }
              
              result = await productionBrainService.manager.storeChatConversation({
                user_id: body.user_id,
                content: body.content,
                chat_id: body.chat_id,
                is_incoming: body.is_incoming,
                websocket_session_id: body.websocket_session_id,
                is_group_chat: body.is_group_chat || false,
                participants: body.participants || [],
                google_service_context: body.google_service_context
              });
            } else {
              set.status = 400;
              return { error: 'Invalid channel. Must be "sms" or "chat"' };
            }

            console.log(`[Neo4j] ✅ Stored ${body.channel} conversation: ${result.id}`);
            
            return { 
              data: result,
              message: `${body.channel} conversation stored with brain-like processing`
            };
          } catch (error) {
            console.error('[Neo4j] Error storing conversation:', error);
            set.status = 500;
            return { 
              error: 'Failed to store conversation',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          body: StoreConversationBody,
          response: {
            200: t.Object({
              data: t.Any(), // EnhancedChatMessage
              message: t.String()
            }),
            400: ErrorResponse,
            500: ErrorResponse
          },
          detail: {
            summary: 'Store conversation with brain processing',
            description: 'Store SMS or chat conversation with brain-like memory processing',
            tags: ['Neo4j', 'Brain Memory', 'Storage']
          }
        }
      )

      // NEW: Simple health endpoint for quick testing
      .get(
        '/ping',
        async () => {
          return { 
            status: 'ok', 
            message: 'Neo4j brain memory system is running',
            timestamp: new Date().toISOString()
          };
        },
        {
          detail: {
            summary: 'Simple ping endpoint',
            description: 'Quick health check for Neo4j brain memory system',
            tags: ['Neo4j', 'Health']
          }
        }
      )
  );
