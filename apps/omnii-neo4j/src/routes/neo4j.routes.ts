import { Elysia, t } from 'elysia';
import { neo4jService } from '../services/neo4j.service';

// Define schemas
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

const ContextQuery = t.Object({
  user_id: t.String(),
  query: t.String(),
  limit: t.Optional(t.Numeric())
});

const NodeContextParams = t.Object({
  nodeId: t.String()
});

const NodeContextQuery = t.Object({
  user_id: t.String()
});

const BrainMemoryQuery = t.Object({
  user_id: t.String(),
  message: t.String(),
  channel: t.Union([t.Literal('sms'), t.Literal('chat')]),
  source_identifier: t.String()
});

const ChatConversationBody = t.Object({
  user_id: t.String(),
  content: t.String(),
  chat_id: t.String(),
  is_incoming: t.Boolean(),
  websocket_session_id: t.Optional(t.String()),
  thread_id: t.Optional(t.String()),
  is_group_chat: t.Optional(t.Boolean()),
  participants: t.Optional(t.Array(t.String())),
  reply_to_message_id: t.Optional(t.String()),
  message_sequence: t.Optional(t.Number()),
  google_service_context: t.Optional(t.Object({
    service_type: t.Optional(t.Union([t.Literal('calendar'), t.Literal('tasks'), t.Literal('contacts'), t.Literal('email')])),
    operation: t.Optional(t.String()),
    entity_ids: t.Optional(t.Array(t.String()))
  }))
});

const SMSConversationBody = t.Object({
  user_id: t.String(),
  content: t.String(),
  phone_number: t.String(),
  is_incoming: t.Boolean(),
  local_datetime: t.Optional(t.String()),
  google_service_context: t.Optional(t.Any())
});

const BulkImportBody = t.Object({
  node_urls: t.Optional(t.Array(t.String())),
  relation_urls: t.Optional(t.Array(t.String()))
});

const ErrorResponse = t.Object({
  error: t.String(),
  details: t.Optional(t.String())
});

export const neo4jRoutes = (app: Elysia) =>
  app.group('/api', (app) =>
    app

      // Health check endpoint
      .get(
        '/health',
        async ({ set }) => {
          // Simple health check without Neo4j queries to avoid transaction issues
          return {
            status: 'healthy',
            service: 'Neo4j Service',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'production'
          };
        },
        {
          detail: {
            summary: 'Neo4j Health Check',
            description: 'Simple health check without Neo4j connectivity test',
            tags: ['Health']
          }
        }
      )

      // Search similar concepts
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
            description: 'Search for concepts similar to the provided query',
            tags: ['Concepts']
          }
        }
      )
      
      // List concepts
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
            description: 'List all concepts with optional filtering',
            tags: ['Concepts']
          }
        }
      )

      // Get AI context for query
      .get(
        '/context',
        async ({ query, set }) => {
          try {
            const context = await neo4jService.getContextForQuery(
              query.user_id,
              query.query,
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
          query: ContextQuery,
          response: {
            200: t.Object({
              data: t.Any()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Get AI context',
            description: 'Get relevant context for AI queries',
            tags: ['Context']
          }
        }
      )

      // Get node context by ID
      .get(
        '/nodes/:nodeId/context',
        async ({ params, query, set }) => {
          try {
            const context = await neo4jService.getNodeContext(
              params.nodeId,
              query.user_id
            );
            return { data: context };
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
          params: NodeContextParams,
          query: NodeContextQuery,
          response: {
            200: t.Object({
              data: t.Any()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Get node context',
            description: 'Get context for a specific node by ID',
            tags: ['Context']
          }
        }
      )

      // Get brain memory context
      .get(
        '/brain/memory-context',
        async ({ query, set }) => {
          try {
            const context = await neo4jService.getBrainMemoryContext(
              query.user_id,
              query.message,
              query.channel,
              query.source_identifier
            );
            return { data: context };
          } catch (error) {
            console.error('[Neo4j] Error getting brain memory context:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          query: BrainMemoryQuery,
          response: {
            200: t.Object({
              data: t.Any()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Get brain memory context',
            description: 'Get brain-like memory context for AI processing',
            tags: ['Brain Memory']
          }
        }
      )

      // Backward compatibility: Get concepts for context
      .get(
        '/concepts/context',
        async ({ query, set }) => {
          try {
            const result = await neo4jService.getConceptsForContext(
              query.user_id,
              query.query,
              query.limit ? Number(query.limit) : 3
            );
            return { data: result };
          } catch (error) {
            console.error('[Neo4j] Error getting concepts for context:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          query: ContextQuery,
          response: {
            200: t.Object({
              data: t.Any()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Get concepts for context (legacy)',
            description: 'Legacy endpoint for getting concepts context',
            tags: ['Concepts', 'Legacy']
          }
        }
      )

      // Railway template bulk import feature
      .post(
        '/bulk-import',
        async ({ body, set }) => {
          try {
            const result = await neo4jService.bulkImportFromCSV(
              body.node_urls,
              body.relation_urls
            );
            return { data: result };
          } catch (error) {
            console.error('[Neo4j] Error in bulk import:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          body: BulkImportBody,
          response: {
            200: t.Object({
              data: t.Any()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Bulk import from CSV',
            description: 'Import nodes and relationships from CSV URLs (Railway template feature)',
            tags: ['Import', 'Railway']
          }
        }
      )

      // List nodes of any type
      .get(
        '/nodes',
        async ({ query, set }) => {
          try {
            const nodeType = (query as any).type || 'Concept';
            const nodes = await neo4jService.listNodes(
              query.user_id,
              nodeType,
              query.limit ? Number(query.limit) : 100,
              query.filter
            );
            return { data: nodes };
          } catch (error) {
            console.error('[Neo4j] Error listing nodes:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          query: t.Object({
            user_id: t.String(),
            type: t.Optional(t.String()),
            limit: t.Optional(t.Numeric()),
            filter: t.Optional(t.String())
          }),
          response: {
            200: t.Object({
              data: t.Array(t.Any())
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'List nodes',
            description: 'List nodes of any type with optional filtering',
            tags: ['Nodes']
          }
        }
      )

      // ✅ CRITICAL: Store chat conversation (enables chat->Neo4j pipeline)
      .post(
        '/brain/store-chat',
        async ({ body, set }) => {
          try {
            const result = await neo4jService.storeChatConversation(body);
            return { data: result };
          } catch (error) {
            console.error('[Neo4j] Error storing chat conversation:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          body: ChatConversationBody,
          response: {
            200: t.Object({
              data: t.Any()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Store chat conversation',
            description: 'Store chat conversation as ChatMessage and Memory nodes (enables chat->Neo4j pipeline)',
            tags: ['Brain Memory', 'Chat']
          }
        }
      )

      // ✅ CRITICAL: Store SMS conversation (enables SMS->Neo4j pipeline)
      .post(
        '/brain/store-sms',
        async ({ body, set }) => {
          try {
            const result = await neo4jService.storeSMSConversation(body);
            return { data: result };
          } catch (error) {
            console.error('[Neo4j] Error storing SMS conversation:', error);
            set.status = 500;
            return { 
              error: 'Internal server error',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        },
        {
          body: SMSConversationBody,
          response: {
            200: t.Object({
              data: t.Any()
            }),
            500: ErrorResponse
          },
          detail: {
            summary: 'Store SMS conversation',
            description: 'Store SMS conversation as ChatMessage and Memory nodes (enables SMS->Neo4j pipeline)',
            tags: ['Brain Memory', 'SMS']
          }
        }
      )

  ); 