import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';
import { Driver, Session, Transaction } from 'neo4j-driver';
import { redisCache } from './redis-cache';
import { 
  EnhancedChatMessage, 
  EnhancedChatMessageSchema,
  EnhancedMemory,
  EnhancedMemorySchema,
  EnhancedConcept,
  EnhancedConceptSchema,
  EnhancedTag,
  EnhancedTagSchema,
  BrainMemoryContext, 
  BrainMemoryContextSchema,
  EnhancedRelationship,
  ComposioMemoryEnhancement,
  BRAIN_MEMORY_CONSTANTS
} from '../types/brain-memory-schemas';
import { TimeMemoryHelpers } from '../utils/time-memory-helpers';
import { getNeo4jDriver } from '../config/neo4j.config';

/**
 * Enhanced BrainConversationManager that mimics human memory patterns
 * Uses existing ChatMessage, Memory, Concept, and Tag schemas with brain-like enhancements
 */
export class BrainConversationManager {
  private driver: Driver;
  private openai: OpenAI;
  private timeMemoryHelpers: TimeMemoryHelpers;
  
  // Brain-like memory constants (Enhanced with time-based working memory)
  private readonly WORKING_MEMORY_SIZE = BRAIN_MEMORY_CONSTANTS.WORKING_MEMORY_SIZE;
  private readonly WORKING_MEMORY_TIME_WINDOW_DAYS = BRAIN_MEMORY_CONSTANTS.WORKING_MEMORY_TIME_WINDOW_DAYS;
  private readonly EPISODIC_MEMORY_WINDOW_HOURS = BRAIN_MEMORY_CONSTANTS.EPISODIC_MEMORY_WINDOW_HOURS;
  private readonly SEMANTIC_ACTIVATION_THRESHOLD = BRAIN_MEMORY_CONSTANTS.SEMANTIC_ACTIVATION_THRESHOLD;
  private readonly MEMORY_CONSOLIDATION_HOURS = BRAIN_MEMORY_CONSTANTS.MEMORY_CONSOLIDATION_HOURS;
  private readonly CACHE_TTL = BRAIN_MEMORY_CONSTANTS.CACHE_TTL_SECONDS;
  private readonly RECENT_MODIFICATION_HOURS = BRAIN_MEMORY_CONSTANTS.RECENT_MODIFICATION_HOURS;

  constructor(driver?: Driver, openai?: OpenAI, mockRedisCache?: any) {
    // 🔧 CONSOLIDATED: Use the shared production-ready driver from neo4j.config.ts
    this.driver = driver || getNeo4jDriver();

    this.openai = openai || new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.timeMemoryHelpers = new TimeMemoryHelpers(this.driver);
    
    console.log('🧠 BrainConversationManager initialized with consolidated Neo4j driver');
  }

  /**
   * Store SMS conversation using existing ChatMessage nodes (hippocampus-like processing)
   * Enhances existing ChatMessage schema with brain-like properties
   */
  async storeSMSConversation(data: {
    user_id: string;
    content: string;
    phone_number: string;
    is_incoming: boolean;
    local_datetime?: string;
    google_service_context?: {
      service_type?: 'calendar' | 'tasks' | 'contacts' | 'email';
      operation?: string;
      entity_ids?: string[];
    };
  }): Promise<EnhancedChatMessage> {
    console.log(`[BrainMemory] 💾 Storing SMS conversation (hippocampus-like processing) for user: ${data.user_id}`);
    
    const session = this.driver.session();
    
    try {
      const messageId = uuidv4();
      
      // Brain-like content analysis (intent, sentiment, importance)
      const insights = await this.analyzeLikeBrain(data.content, data.is_incoming, 'sms');
      
      // Create enhanced ChatMessage node with brain properties and time-based tracking
      const result = await session.run(`
        // Create ChatMessage node with brain-like properties and time tracking
        CREATE (msg:ChatMessage {
          id: $id,
          content: $content,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          last_modified: datetime($timestamp),
          modification_reason: 'created',
          channel: $channel,
          source_identifier: $source_identifier,
          intent: $intent,
          sentiment: $sentiment,
          importance_score: $importance_score,
          sms_metadata: $sms_metadata,
          google_service_context: $google_service_context
        })
        
        // Link to User via existing OWNS relationship
        WITH msg
        MATCH (user:User {id: $user_id})
        CREATE (user)-[:OWNS]->(msg)
        
        // Create episodic Memory node and link via existing HAS_MEMORY relationship
        CREATE (memory:Memory {
          id: $memory_id,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          memory_type: 'episodic',
          consolidation_status: 'fresh',
          episode_type: 'conversation',
          channel: $channel,
          original_message_id: $id,
          importance_score: $importance_score
        })
        
        CREATE (msg)-[:HAS_MEMORY]->(memory)
        
        RETURN msg, memory
      `, {
        id: messageId,
        content: data.content,
        timestamp: new Date().toISOString(),
        channel: 'sms',
        source_identifier: data.phone_number,
        intent: insights.intent,
        sentiment: insights.sentiment,
        importance_score: insights.importance_score,
        sms_metadata: JSON.stringify({
          phone_number: data.phone_number,
          is_incoming: data.is_incoming,
          local_datetime: data.local_datetime
        }),
        google_service_context: data.google_service_context ? JSON.stringify(data.google_service_context) : null,
        user_id: data.user_id,
        memory_id: uuidv4()
      });

      // Extract and link to existing Concept nodes (semantic memory)
      await this.extractAndLinkConcepts(session, messageId, data.content, data.user_id);
      
      // Create/update existing Tag nodes (categorization)
      await this.createSemanticTags(session, messageId, data.content, data.user_id, 'sms');
      
      // Create associative links with existing ChatMessage nodes via RELATED_TO
      await this.createAssociativeLinks(session, messageId, data.user_id, 'sms');
      
      // Link to Google services via existing relationships
      if (data.google_service_context) {
        await this.linkToGoogleServices(session, messageId, data.google_service_context);
      }
      
      console.log(`[BrainMemory] ✅ Stored SMS conversation with brain-like processing: ${messageId}`);
      
      // Return enhanced ChatMessage data
      return EnhancedChatMessageSchema.parse({
        id: messageId,
        content: data.content,
        timestamp: new Date().toISOString(),
        user_id: data.user_id,
        channel: 'sms',
        source_identifier: data.phone_number,
        intent: insights.intent,
        sentiment: insights.sentiment,
        importance_score: insights.importance_score,
        sms_metadata: {
          phone_number: data.phone_number,
          is_incoming: data.is_incoming,
          local_datetime: data.local_datetime
        },
        google_service_context: data.google_service_context
      });
      
    } finally {
      await session.close();
    }
  }

  /**
   * Store chat conversation using existing ChatMessage nodes (real-time hippocampus processing)
   * Enhances existing ChatMessage schema with brain-like properties for real-time chat
   */
  async storeChatConversation(data: {
    user_id: string;
    content: string;
    chat_id: string;
    is_incoming: boolean;
    websocket_session_id?: string;
    thread_id?: string;
    is_group_chat?: boolean;
    participants?: string[];
    reply_to_message_id?: string;
    message_sequence?: number;
    google_service_context?: {
      service_type?: 'calendar' | 'tasks' | 'contacts' | 'email';
      operation?: string;
      entity_ids?: string[];
    };
  }): Promise<EnhancedChatMessage> {
    console.log(`[BrainMemory] 💬 Storing chat conversation (real-time hippocampus processing) for user: ${data.user_id}`);
    
    const session = this.driver.session();
    
    try {
      const messageId = uuidv4();
      
      // Brain-like content analysis (enhanced for chat context)
      const insights = await this.analyzeLikeBrain(data.content, data.is_incoming, 'chat', {
        isGroupChat: data.is_group_chat,
        participants: data.participants
      });
      
      // Create enhanced ChatMessage node with chat-specific brain properties and time tracking
      const result = await session.run(`
        // Create ChatMessage node with brain-like properties and time tracking
        CREATE (msg:ChatMessage {
          id: $id,
          content: $content,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          last_modified: datetime($timestamp),
          modification_reason: 'created',
          channel: $channel,
          source_identifier: $source_identifier,
          intent: $intent,
          sentiment: $sentiment,
          importance_score: $importance_score,
          chat_metadata: $chat_metadata,
          google_service_context: $google_service_context
        })
        
        // Link to User via existing OWNS relationship
        WITH msg
        MATCH (user:User {id: $user_id})
        CREATE (user)-[:OWNS]->(msg)
        
        // Create episodic Memory node with real-time context
        CREATE (memory:Memory {
          id: $memory_id,
          timestamp: datetime($timestamp),
          user_id: $user_id,
          memory_type: 'episodic',
          consolidation_status: 'fresh',
          episode_type: 'conversation',
          channel: $channel,
          original_message_id: $id,
          importance_score: $importance_score,
          real_time_context: true
        })
        
        CREATE (msg)-[:HAS_MEMORY]->(memory)
        
        RETURN msg, memory
      `, {
        id: messageId,
        content: data.content,
        timestamp: new Date().toISOString(),
        channel: 'chat',
        source_identifier: data.chat_id,
        intent: insights.intent,
        sentiment: insights.sentiment,
        importance_score: insights.importance_score,
        chat_metadata: JSON.stringify({
          chat_id: data.chat_id,
          websocket_session_id: data.websocket_session_id,
          is_group_chat: data.is_group_chat || false,
          participants: data.participants || [],
          thread_id: data.thread_id,
          reply_to_message_id: data.reply_to_message_id,
          message_sequence: data.message_sequence
        }),
        google_service_context: data.google_service_context ? JSON.stringify(data.google_service_context) : null,
        user_id: data.user_id,
        memory_id: uuidv4()
      });

      // Same brain-like processing as SMS
      await this.extractAndLinkConcepts(session, messageId, data.content, data.user_id);
      await this.createSemanticTags(session, messageId, data.content, data.user_id, 'chat');
      await this.createAssociativeLinks(session, messageId, data.user_id, 'chat');
      
      if (data.google_service_context) {
        await this.linkToGoogleServices(session, messageId, data.google_service_context);
      }
      
      // Chat-specific: Link to other participants if group chat
      if (data.is_group_chat && data.participants?.length) {
        await this.linkGroupChatParticipants(session, messageId, data.participants);
      }
      
      console.log(`[BrainMemory] ✅ Stored chat conversation with brain-like processing: ${messageId}`);
      
      // Return enhanced ChatMessage data
      return EnhancedChatMessageSchema.parse({
        id: messageId,
        content: data.content,
        timestamp: new Date().toISOString(),
        user_id: data.user_id,
        channel: 'chat',
        source_identifier: data.chat_id,
        intent: insights.intent,
        sentiment: insights.sentiment,
        importance_score: insights.importance_score,
        chat_metadata: {
          chat_id: data.chat_id,
          websocket_session_id: data.websocket_session_id,
          is_group_chat: data.is_group_chat || false,
          participants: data.participants || []
        },
        google_service_context: data.google_service_context
      });
      
    } finally {
      await session.close();
    }
  }

  /**
   * Retrieve brain-like memory context for SMS/Chat (mimics human memory retrieval)
   * Uses existing ChatMessage nodes with working memory + episodic + semantic patterns
   */
  async getBrainMemoryContext(
    userId: string,
    currentMessage: string,
    channel: 'sms' | 'chat',
    sourceIdentifier: string, // phone number or chat ID
    options: {
      workingMemorySize?: number;
      episodicWindowHours?: number;
      semanticActivationThreshold?: number;
      includeGoogleServices?: boolean;
    } = {}
  ): Promise<BrainMemoryContext> {
    const {
      workingMemorySize = this.WORKING_MEMORY_SIZE,
      episodicWindowHours = this.EPISODIC_MEMORY_WINDOW_HOURS,
      semanticActivationThreshold = this.SEMANTIC_ACTIVATION_THRESHOLD,
      includeGoogleServices = true
    } = options;

    const cacheKey = `brain_memory_context:${userId}:${channel}:${sourceIdentifier}:${JSON.stringify(options)}`;
    
    // Check cache first (shorter TTL for brain-like responsiveness)
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      console.log(`[BrainMemory] 🧠 Cache hit for ${channel}:${sourceIdentifier}`);
      return BrainMemoryContextSchema.parse(cached);
    }

    console.log(`[BrainMemory] 🧠 Building brain-like memory context for ${channel}:${sourceIdentifier}`);
    
    // Extract relevant topics from current message (for semantic activation)
    const currentTopics = await this.extractQuickTopics(currentMessage);
    
    try {
      // Step 1: Get time-based working memory (3-week window + recently modified)
      const timeBasedMemory = await this.timeMemoryHelpers.getMessagesInTimeWindow(
        userId, channel, sourceIdentifier
      );

      const recentlyModified = await this.timeMemoryHelpers.getRecentlyModifiedMessages(
        userId, channel
      );

      // Step 2: Get episodic memory threads via existing Memory nodes
      const episodicMemory = await this.getEpisodicMemoryThreads(userId, channel, episodicWindowHours);

      // Step 3: Get semantic memory via existing Concept nodes
      const semanticMemory = await this.getSemanticMemoryContext(userId, currentTopics, semanticActivationThreshold);

      // Step 4: Calculate memory strength using time-based helpers
      const memoryStrength = this.calculateOverallMemoryStrength(
        timeBasedMemory.messages.length,
        episodicMemory.length,
        semanticMemory.length
      );

      // Build brain-like memory context
      const brainContext: BrainMemoryContext = BrainMemoryContextSchema.parse({
        working_memory: {
          recent_messages: timeBasedMemory.messages.slice(0, workingMemorySize),
          time_window_messages: timeBasedMemory.messages,
          recently_modified_messages: recentlyModified.messages,
          active_concepts: semanticMemory.slice(0, 5).map(s => s.concept.id),
          current_intent: await this.inferCurrentIntent(currentMessage),
          time_window_stats: {
            ...timeBasedMemory.stats,
            recently_modified_count: recentlyModified.totalCount
          }
        },
        episodic_memory: {
          conversation_threads: episodicMemory,
          related_episodes: episodicMemory.map(e => e.memory_node_id || e.thread_id)
        },
        semantic_memory: {
          activated_concepts: semanticMemory,
          concept_associations: await this.getConceptAssociations(userId, semanticMemory.map(s => s.concept.id))
        },
        consolidation_metadata: {
          retrieval_timestamp: new Date().toISOString(),
          memory_strength: memoryStrength,
          context_channels: [channel],
          memory_age_hours: episodicWindowHours,
          consolidation_score: this.calculateConsolidationScore(episodicMemory, semanticMemory),
          working_memory_limit: workingMemorySize,
          episodic_window_hours: episodicWindowHours,
          semantic_activation_threshold: semanticActivationThreshold,
          sms_optimization: channel === 'sms' ? {
            character_budget: 1500,
            suggested_response_length: timeBasedMemory.messages.length > 3 ? 'brief' : 'normal'
          } : undefined,
          chat_optimization: channel === 'chat' ? {
            max_message_length: 4000,
            supports_rich_content: true,
            real_time_context: true,
            thread_aware: true
          } : undefined
        }
      });

      // Cache with brain-appropriate TTL
      await redisCache.set(cacheKey, JSON.stringify(brainContext), this.CACHE_TTL);

      console.log(`[BrainMemory] ✅ Built brain-like memory context: ${timeBasedMemory.messages.length} working + ${episodicMemory.length} episodic + ${semanticMemory.length} semantic, strength: ${memoryStrength.toFixed(2)}`);
      return brainContext;
      
    } catch (error) {
      console.error(`[BrainMemory] ❌ Failed to build memory context:`, error);
      throw error;
    }
  }

  /**
   * Execute Composio tool with memory enhancement
   * Integrates brain-like memory context with Composio operations
   */
  async executeComposioToolWithMemory(
    userId: string,
    toolCall: any,
    composio: any, // OpenAIToolSet from composio-core
    brainMemoryContext: BrainMemoryContext,
    channel: 'sms' | 'chat',
    sourceIdentifier: string
  ): Promise<{
    success: boolean;
    result: any;
    memoryEnhanced: boolean;
    memoryInsights?: string[];
  }> {
    console.log(`[BrainMemory] 🧠🔧 Executing Composio tool with memory context: ${toolCall.function.name}`);
    
    try {
      // Step 1: Enhance tool parameters with memory context
      const enhancedParams = await this.enhanceToolParamsWithMemory(
        toolCall,
        brainMemoryContext,
        userId
      );

      // Step 2: Execute the Composio tool with enhanced parameters
      const toolResult = await composio.client.actions.execute({
        actionName: toolCall.function.name,
        requestBody: {
          input: enhancedParams,
          appName: this.getAppNameForTool(toolCall.function.name),
          authConfig: await this.getCustomAuthConfig(userId) // Uses existing Supabase OAuth
        }
      });

      // Step 3: Store the tool execution result in brain memory
      await this.storeComposioResultInMemory(
        userId, 
        toolCall,
        toolResult,
        channel,
        sourceIdentifier,
        brainMemoryContext
      );

      // Step 4: Update semantic concepts based on tool usage
      await this.updateSemanticConceptsFromTool(
        userId,
        toolCall,
        toolResult
      );

      return {
        success: true,
        result: toolResult,
        memoryEnhanced: true,
        memoryInsights: this.generateMemoryInsights(brainMemoryContext, toolCall)
      };

    } catch (error) {
      console.error(`[BrainMemory] ❌ Memory-enhanced Composio execution failed:`, error);
      
      // Fallback to standard execution without memory enhancement
      try {
        const standardResult = await composio.client.actions.execute({
          actionName: toolCall.function.name,
          requestBody: {
            input: JSON.parse(toolCall.function.arguments),
            appName: this.getAppNameForTool(toolCall.function.name),
            authConfig: await this.getCustomAuthConfig(userId)
          }
        });

        return {
          success: true,
          result: standardResult,
          memoryEnhanced: false
        };
      } catch (fallbackError) {
        return {
          success: false,
          result: null,
          memoryEnhanced: false
        };
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
    }
  }

  // ============================================================================
  // BRAIN-LIKE HELPER METHODS
  // ============================================================================

  /**
   * Analyze content like brain's initial processing (hippocampus-like)
   */
  private async analyzeLikeBrain(
    content: string, 
    isIncoming: boolean, 
    channel: 'sms' | 'chat',
    context?: {
      isGroupChat?: boolean;
      participants?: string[];
    }
  ): Promise<{
    intent: string;
    sentiment: number;
    importance_score: number;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Analyze this ${channel} message like a brain would process it:
"${content}"

Direction: ${isIncoming ? 'Incoming' : 'Outgoing'}
Channel: ${channel}
${context?.isGroupChat ? `Group chat with ${context.participants?.length || 0} participants` : 'Individual conversation'}

Return JSON with:
- intent: main intent/purpose (question, request, info, social, task, calendar, email, contact, etc.)
- sentiment: number -1 to 1 (emotional valence)
- importance_score: 0 to 1 (how important/memorable this is)

Consider:
- Emotional significance
- Actionability 
- Information density
- Social context
- Urgency indicators
- Tool/service requests`
        }],
        response_format: { type: 'json_object' },
        max_tokens: 200
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        intent: analysis.intent || 'unknown',
        sentiment: analysis.sentiment || 0,
        importance_score: analysis.importance_score || (isIncoming ? 0.6 : 0.4)
      };
    } catch (error) {
      console.warn(`[BrainMemory] AI analysis failed, using defaults:`, error);
      return {
        intent: 'unknown',
        sentiment: 0,
        importance_score: isIncoming ? 0.6 : 0.4
      };
    }
  }

  /**
   * Extract and link to existing Concept nodes (semantic memory)
   */
  private async extractAndLinkConcepts(
    session: Session,
    messageId: string,
    content: string,
    userId: string
  ): Promise<void> {
    const concepts = await this.extractKeyConceptsFromContent(content);
    
    for (const conceptText of concepts) {
      await session.run(`
        // Find or create Concept node
        MERGE (concept:Concept {name: $conceptText, user_id: $userId})
        ON CREATE SET concept.activation_strength = 0.5,
                      concept.mention_count = 1,
                      concept.last_mentioned = datetime(),
                      concept.semantic_weight = 0.5
        ON MATCH SET concept.last_mentioned = datetime(),
                     concept.mention_count = COALESCE(concept.mention_count, 0) + 1,
                     concept.activation_strength = COALESCE(concept.activation_strength, 0) + 0.1
        
        // Link message to concept via MENTIONS relationship
        WITH concept
        MATCH (msg:ChatMessage {id: $messageId})
        MERGE (msg)-[:MENTIONS]->(concept)
        
        // Update last_modified to pull message back into working memory when concepts change
        SET msg.last_modified = datetime(),
            msg.modification_reason = 'concept_linked'
      `, { conceptText, userId, messageId });
    }
  }

  /**
   * Create/update existing Tag nodes (categorization)
   */
  private async createSemanticTags(
    session: Session,
    messageId: string,
    content: string,
    userId: string,
    channel: string
  ): Promise<void> {
    const tags = await this.generateSemanticTags(content, channel);
    
    for (const tagName of tags) {
      await session.run(`
        // Find or create Tag node
        MERGE (tag:Tag {name: $tagName, user_id: $userId})
        ON CREATE SET tag.usage_count = 1,
                      tag.last_used = datetime(),
                      tag.channel_origin = $channel,
                      tag.category = 'auto_generated'
        ON MATCH SET tag.last_used = datetime(),
                     tag.usage_count = COALESCE(tag.usage_count, 0) + 1
        
        // Link message to tag via HAS_TAG relationship
        WITH tag
        MATCH (msg:ChatMessage {id: $messageId})
        MERGE (msg)-[:HAS_TAG]->(tag)
        
        // Update last_modified to pull message back into working memory when tags change
        SET msg.last_modified = datetime(),
            msg.modification_reason = 'tag_added'
      `, { tagName, userId, messageId, channel });
    }
  }

  /**
   * Create associative links between related conversations (RELATED_TO relationships)
   */
  private async createAssociativeLinks(
    session: Session,
    messageId: string,
    userId: string,
    channel: string
  ): Promise<void> {
    // Find related messages through shared concepts/tags
    await session.run(`
      MATCH (newMsg:ChatMessage {id: $messageId})-[:MENTIONS|:HAS_TAG]->(shared)
      <-[:MENTIONS|:HAS_TAG]-(relatedMsg:ChatMessage)
      <-[:OWNS]-(user:User {id: $userId})
      WHERE relatedMsg.timestamp > datetime() - duration({days: 7})
      AND relatedMsg.id <> $messageId
      
      // Create or strengthen associative link
      MERGE (newMsg)-[rel:RELATED_TO]-(relatedMsg)
      ON CREATE SET rel.strength = 0.3,
                    rel.last_activated = datetime(),
                    rel.association_type = 'semantic',
                    rel.activation_count = 1
      ON MATCH SET rel.strength = COALESCE(rel.strength, 0) + 0.1,
                   rel.last_activated = datetime(),
                   rel.activation_count = COALESCE(rel.activation_count, 0) + 1
      
      // Update last_modified on related messages to pull them into working memory
      WITH relatedMsg
      SET relatedMsg.last_modified = datetime(),
          relatedMsg.modification_reason = 'associative_link_created'
    `, { messageId, userId });
  }

  /**
   * Link to Google services via existing relationships
   */
  private async linkToGoogleServices(
    session: Session,
    messageId: string,
    serviceContext: any
  ): Promise<void> {
    if (!serviceContext.service_type) return;
    
    await session.run(`
      MATCH (msg:ChatMessage {id: $messageId})
      MATCH (token:OAuthToken)
      WHERE token.service = $serviceType OR token.provider = 'google'
      
      // Create service relationship
      MERGE (msg)-[rel:TRIGGERED_SERVICE]->(token)
      ON CREATE SET rel.operation = $operation,
                    rel.success = $success,
                    rel.timestamp = datetime()
      ON MATCH SET rel.operation = $operation,
                   rel.success = $success,
                   rel.last_used = datetime()
    `, {
      messageId,
      serviceType: serviceContext.service_type,
      operation: serviceContext.operation || 'unknown',
      success: serviceContext.success !== false
    });
  }

  /**
   * Link group chat participants
   */
  private async linkGroupChatParticipants(
    session: Session,
    messageId: string,
    participants: string[]
  ): Promise<void> {
    for (const participant of participants) {
      await session.run(`
        MATCH (msg:ChatMessage {id: $messageId})
        MERGE (participant:User {id: $participant})
        MERGE (msg)-[:INCLUDES_PARTICIPANT]->(participant)
      `, { messageId, participant });
    }
  }

  /**
   * Get episodic memory threads
   */
  private async getEpisodicMemoryThreads(
    userId: string,
    channel: string,
    episodicWindowHours: number
  ): Promise<any[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(`
        MATCH (user:User {id: $userId})-[:OWNS]->(msg:ChatMessage)-[:HAS_MEMORY]->(memory:Memory)
        WHERE msg.timestamp > datetime() - duration({hours: $episodicWindowHours})
        AND (msg.channel = $channel OR memory.memory_type = 'cross_channel')
        
        // Get related conversations through semantic links (existing RELATED_TO relationships)
        OPTIONAL MATCH (msg)-[:RELATED_TO]-(relatedMsg:ChatMessage)
        WHERE relatedMsg.timestamp > datetime() - duration({hours: $episodicWindowHours})
        
        WITH msg, memory, collect(DISTINCT relatedMsg) as relatedMessages
        RETURN msg, memory, relatedMessages
        ORDER BY msg.timestamp DESC
        LIMIT 10
      `, { userId, channel, episodicWindowHours });

      return result.records.map(record => {
        const msg = record.get('msg').properties;
        const memory = record.get('memory').properties;
        const relatedMessages = record.get('relatedMessages') || [];
        
        return {
          thread_id: memory.id,
          messages: [this.nodeToEnhancedChatMessage(msg)],
          semantic_weight: this.calculateSemanticWeight(msg, relatedMessages),
          memory_node_id: memory.id
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get semantic memory context via existing Concept nodes
   */
  private async getSemanticMemoryContext(
    userId: string,
    currentTopics: string[],
    semanticActivationThreshold: number
  ): Promise<any[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(`
        // Find concepts mentioned in current message (enhanced with existing MENTIONS relationships)
        MATCH (user:User {id: $userId})-[:OWNS]->(msg:ChatMessage)-[:MENTIONS]->(concept:Concept)
        WHERE msg.timestamp > datetime() - duration({hours: 168})
        
        // Get related concepts through existing RELATED_TO relationships
        OPTIONAL MATCH (concept)-[:RELATED_TO]-(relatedConcept:Concept)
        WHERE relatedConcept.user_id = $userId
        
        WITH concept, collect(DISTINCT relatedConcept) as relatedConcepts,
             count(msg) as conceptFrequency
        WHERE conceptFrequency >= 2 // Only concepts mentioned multiple times
        
        RETURN concept, relatedConcepts, conceptFrequency
        ORDER BY conceptFrequency DESC
        LIMIT 20
      `, { userId });

      return result.records.map(record => {
        const concept = record.get('concept').properties;
        const relatedConcepts = record.get('relatedConcepts') || [];
        const frequency = record.get('conceptFrequency').toNumber();
        
        return {
          concept: this.nodeToEnhancedConcept(concept),
          activation_strength: Math.min(frequency / 10, 1.0), // Normalize frequency
          related_concepts: relatedConcepts.map((c: any) => c.properties.id)
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get concept associations
   */
  private async getConceptAssociations(userId: string, conceptIds: string[]): Promise<any[]> {
    if (conceptIds.length === 0) return [];
    
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (c1:Concept)-[:RELATED_TO]-(c2:Concept)
        WHERE c1.id IN $conceptIds AND c2.id IN $conceptIds
        AND c1.user_id = $userId AND c2.user_id = $userId
        RETURN c1.id as from_concept, c2.id as to_concept, 
               COALESCE(c1.mention_count, 1) + COALESCE(c2.mention_count, 1) as strength
      `, { conceptIds, userId });

      return result.records.map(record => ({
        from_concept: record.get('from_concept'),
        to_concept: record.get('to_concept'),
        association_strength: Math.min(record.get('strength').toNumber() / 20, 1.0),
        relationship_type: 'RELATED_TO'
      }));
    } finally {
      await session.close();
    }
  }

  // Additional helper methods

  private async extractQuickTopics(message: string): Promise<string[]> {
    const keywords = message.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'been', 'they', 'them', 'will', 'from', 'your', 'what', 'when', 'where'].includes(word))
      .slice(0, 5);
    
    return keywords;
  }

  private async extractKeyConceptsFromContent(content: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Extract 3-5 key concepts from this message: "${content}"
          
Return as JSON array of strings. Focus on:
- Important nouns and entities
- Action words  
- Topics/subjects
- Services mentioned (calendar, email, tasks, contacts)

Example: ["meeting", "calendar", "work", "schedule"]`
        }],
        response_format: { type: 'json_object' },
        max_tokens: 100
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.concepts || this.extractKeyConceptsBasic(content);
    } catch (error) {
      return this.extractKeyConceptsBasic(content);
    }
  }

  private extractKeyConceptsBasic(content: string): string[] {
    const words = content.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'been', 'they', 'them', 'will', 'from', 'your', 'what', 'when', 'where'].includes(word))
      .slice(0, 5);
    
    return words;
  }

  private async generateSemanticTags(content: string, channel: string): Promise<string[]> {
    const tags = [];
    const lower = content.toLowerCase();
    
    // Service-based tags
    if (lower.includes('meeting') || lower.includes('schedule') || lower.includes('calendar')) {
      tags.push('calendar');
    }
    if (lower.includes('task') || lower.includes('todo') || lower.includes('remind')) {
      tags.push('task_management');
    }
    if (lower.includes('email') || lower.includes('send') || lower.includes('gmail')) {
      tags.push('email');
    }
    if (lower.includes('contact') || lower.includes('phone') || lower.includes('@')) {
      tags.push('contact');
    }
    
    // Channel and time-based tags
    tags.push(channel);
    tags.push(`${channel}_${new Date().getHours() < 12 ? 'morning' : 'afternoon'}`);
    
    // Intent-based tags
    if (lower.includes('?')) tags.push('question');
    if (lower.includes('urgent') || lower.includes('asap')) tags.push('urgent');
    
    return tags;
  }

  private async inferCurrentIntent(message: string): Promise<string> {
    const msg = message.toLowerCase();
    
    if (msg.includes('?')) return 'question';
    if (msg.includes('schedule') || msg.includes('meeting') || msg.includes('calendar')) return 'calendar';
    if (msg.includes('send') || msg.includes('email') || msg.includes('gmail')) return 'email';
    if (msg.includes('task') || msg.includes('todo') || msg.includes('remind')) return 'task_management';
    if (msg.includes('find') || msg.includes('search') || msg.includes('contact')) return 'information_seeking';
    
    return 'general';
  }

  private calculateSemanticWeight(msg: any, relatedMessages: any[]): number {
    const baseWeight = msg.importance_score || 0.5;
    const relationshipBonus = Math.min(relatedMessages.length / 10, 0.3);
    const recencyBonus = this.calculateRecencyBonus(msg.timestamp);
    
    return Math.min(baseWeight + relationshipBonus + recencyBonus, 1.0);
  }

  private calculateRecencyBonus(timestamp: string): number {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    return Math.exp(-hoursDiff / 24) * 0.2;
  }

  private calculateOverallMemoryStrength(
    workingMemoryCount: number,
    episodicMemoryCount: number,
    semanticMemoryCount: number
  ): number {
    const workingWeight = Math.min(workingMemoryCount / this.WORKING_MEMORY_SIZE, 1.0) * 0.4;
    const episodicWeight = Math.min(episodicMemoryCount / 10, 1.0) * 0.4;
    const semanticWeight = Math.min(semanticMemoryCount / 20, 1.0) * 0.2;
    
    return workingWeight + episodicWeight + semanticWeight;
  }

  private calculateConsolidationScore(episodicMemory: any[], semanticMemory: any[]): number {
    const episodicConnections = episodicMemory.length;
    const semanticConnections = semanticMemory.reduce((sum, s) => sum + s.related_concepts.length, 0);
    
    return Math.min((episodicConnections + semanticConnections) / 50, 1.0);
  }

  private nodeToEnhancedChatMessage(node: any): EnhancedChatMessage {
    const smsMetadata = node.sms_metadata ? JSON.parse(node.sms_metadata) : undefined;
    const chatMetadata = node.chat_metadata ? JSON.parse(node.chat_metadata) : undefined;
    const googleServiceContext = node.google_service_context ? JSON.parse(node.google_service_context) : undefined;
    
    return {
      id: node.id,
      content: node.content,
      timestamp: node.timestamp,
      channel: node.channel,
      source_identifier: node.source_identifier,
      intent: node.intent,
      sentiment: node.sentiment,
      importance_score: node.importance_score,
      sms_metadata: smsMetadata,
      chat_metadata: chatMetadata,
      google_service_context: googleServiceContext
    };
  }

  private nodeToEnhancedConcept(node: any): EnhancedConcept {
    return {
      id: node.id,
      name: node.name,
      activation_strength: node.activation_strength || 0,
      mention_count: node.mention_count || 0,
      last_mentioned: node.last_mentioned,
      semantic_weight: node.semantic_weight || 0.5,
      user_id: node.user_id
    };
  }

  // Composio integration helper methods
  private async enhanceToolParamsWithMemory(
    toolCall: any,
    brainMemoryContext: BrainMemoryContext,
    userId: string
  ): Promise<any> {
    const originalParams = JSON.parse(toolCall.function.arguments);
    // Add memory context to tool parameters
    originalParams.memory_context = {
      working_memory_strength: brainMemoryContext.consolidation_metadata.memory_strength,
      recent_concepts: brainMemoryContext.working_memory.active_concepts.slice(0, 3),
      current_intent: brainMemoryContext.working_memory.current_intent
    };
    return originalParams;
  }

  private getAppNameForTool(toolName: string): string {
    const tool = toolName.toLowerCase();
    if (tool.includes('calendar')) return 'googlecalendar';
    if (tool.includes('task')) return 'googletasks';
    if (tool.includes('gmail') || tool.includes('email')) return 'gmail';
    if (tool.includes('contact')) return 'googlecontacts';
    return 'unknown';
  }

  private async getCustomAuthConfig(userId: string): Promise<any> {
    return {
      parameters: [
        {
          name: "Authorization",
          value: "Bearer YOUR_ACCESS_TOKEN", // Get from Supabase
          in: "header"
        }
      ]
    };
  }

  private generateMemoryInsights(brainMemoryContext: BrainMemoryContext, toolCall: any): string[] {
    const insights = [];
    
    if (brainMemoryContext.working_memory.recent_messages.length > 0) {
      insights.push(`Found ${brainMemoryContext.working_memory.recent_messages.length} recent related conversations`);
    }
    
    if (brainMemoryContext.semantic_memory.activated_concepts.length > 0) {
      insights.push(`Activated ${brainMemoryContext.semantic_memory.activated_concepts.length} related concepts`);
    }
    
    insights.push(`Memory strength: ${brainMemoryContext.consolidation_metadata.memory_strength.toFixed(2)}`);
    
    return insights;
  }

  private async storeComposioResultInMemory(
    userId: string,
    toolCall: any,
    toolResult: any,
    channel: 'sms' | 'chat',
    sourceIdentifier: string,
    brainMemoryContext: BrainMemoryContext
  ): Promise<void> {
    // Store tool execution results in brain memory
    console.log(`[BrainMemory] 🧠💾 Storing tool result in memory: ${toolCall.function.name}`);
  }

  private async updateSemanticConceptsFromTool(
    userId: string,
    toolCall: any,
    toolResult: any
  ): Promise<void> {
    // Update semantic concepts based on tool usage
    console.log(`[BrainMemory] 🧠📈 Updating semantic concepts from tool usage: ${toolCall.function.name}`);
  }

  /**
   * Consolidate memories older than specified hours (background process)
   */
  async consolidateMemories(options: {
    olderThanHours: number;
    batchSize: number;
    maxProcessingTime: number;
  }): Promise<void> {
    console.log(`[BrainMemory] 🧠 Starting memory consolidation (${options.olderThanHours}h+ old)`);
    
    const session = this.driver.session();
    const startTime = Date.now();
    
    try {
      // Find fresh memories older than threshold
      const result = await session.run(`
        MATCH (memory:Memory)
        WHERE memory.consolidation_status = 'fresh'
        AND memory.timestamp < datetime() - duration({hours: $olderThanHours})
        RETURN memory
        ORDER BY memory.timestamp ASC
        LIMIT $batchSize
      `, {
        olderThanHours: options.olderThanHours,
        batchSize: options.batchSize
      });

      let processedCount = 0;
      const maxTime = startTime + options.maxProcessingTime;

      for (const record of result.records) {
        if (Date.now() > maxTime) {
          console.log(`[BrainMemory] ⏱️ Memory consolidation timeout reached`);
          break;
        }

        const memory = record.get('memory').properties;
        
        // Update consolidation status
        await session.run(`
          MATCH (memory:Memory {id: $memoryId})
          SET memory.consolidation_status = 'consolidated',
              memory.consolidation_date = datetime()
        `, { memoryId: memory.id });

        processedCount++;
      }

      console.log(`[BrainMemory] ✅ Consolidated ${processedCount} memories in ${Date.now() - startTime}ms`);
      
    } finally {
      await session.close();
    }
  }

  /**
   * Update semantic activation strengths based on usage patterns
   */
  async updateSemanticActivation(options: {
    threshold: number;
    batchSize: number;
  }): Promise<void> {
    console.log(`[BrainMemory] 🧠 Updating semantic activation (threshold: ${options.threshold})`);
    
    const session = this.driver.session();
    
    try {
      // Update concept activation based on recent mentions
      await session.run(`
        MATCH (concept:Concept)
        WHERE concept.last_mentioned > datetime() - duration({hours: 24})
        SET concept.activation_strength = COALESCE(concept.activation_strength, 0) + 0.1,
            concept.semantic_weight = COALESCE(concept.semantic_weight, 0.5) + 0.05
        WITH concept
        WHERE concept.activation_strength > 1.0
        SET concept.activation_strength = 1.0
      `);

      // Decay old activations
      await session.run(`
        MATCH (concept:Concept)
        WHERE concept.last_mentioned < datetime() - duration({days: 7})
        SET concept.activation_strength = COALESCE(concept.activation_strength, 0) * 0.9
        WITH concept
        WHERE concept.activation_strength < 0.1
        SET concept.activation_strength = 0.0
      `);

      console.log(`[BrainMemory] ✅ Updated semantic activation strengths`);
      
    } finally {
      await session.close();
    }
  }
} 