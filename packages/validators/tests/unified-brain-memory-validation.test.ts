import { describe, test, expect } from 'bun:test';
import {
  // Schemas
  EnhancedChatMessageSchema,
  EnhancedMemorySchema,
  EnhancedConceptSchema,
  EnhancedTagSchema,
  BrainMemoryContextSchema,
  EnhancedRelationshipSchema,
  TimeWindowSchema,
  MemoryStrengthCalculationSchema,
  ComposioMemoryEnhancementSchema,
  
  // Constants
  BRAIN_MEMORY_CONSTANTS,
  
  // Validation functions
  isValidBrainMemoryContext,
  validateBrainMemoryContext,
  safeParseEnhancedChatMessage,
  
  // 🛡️ New Privacy Validation Functions
  validateChatMessageWithUserId,
  validateMemoryWithUserId,
  validateConceptWithUserId,
  validateTagWithUserId,
  
  // Types
  type EnhancedChatMessage,
  type EnhancedMemory,
  type EnhancedConcept,
  type EnhancedTag,
  type BrainMemoryContext,
  type EnhancedRelationship,
  type TimeWindow,
  type MemoryStrengthCalculation,
  type ComposioMemoryEnhancement
} from '../src/index';

describe('Unified Brain Memory Schema Validation', () => {
  
  test('should export all brain memory schemas correctly', () => {
    console.log('🧠 Testing unified brain memory schema exports...');
    
    // Test schema exports
    expect(EnhancedChatMessageSchema).toBeDefined();
    expect(EnhancedMemorySchema).toBeDefined();
    expect(EnhancedConceptSchema).toBeDefined();
    expect(EnhancedTagSchema).toBeDefined();
    expect(BrainMemoryContextSchema).toBeDefined();
    expect(EnhancedRelationshipSchema).toBeDefined();
    expect(TimeWindowSchema).toBeDefined();
    expect(MemoryStrengthCalculationSchema).toBeDefined();
    expect(ComposioMemoryEnhancementSchema).toBeDefined();
    
    // Test constants
    expect(BRAIN_MEMORY_CONSTANTS).toBeDefined();
    expect(BRAIN_MEMORY_CONSTANTS.WORKING_MEMORY_SIZE).toBe(7);
    expect(BRAIN_MEMORY_CONSTANTS.WORKING_MEMORY_TIME_WINDOW_DAYS).toBe(21);
    
    // Test validation functions
    expect(isValidBrainMemoryContext).toBeDefined();
    expect(validateBrainMemoryContext).toBeDefined();
    expect(safeParseEnhancedChatMessage).toBeDefined();
    
    console.log('✅ All brain memory schemas exported correctly');
  });
  
  test('should validate enhanced chat message correctly', () => {
    console.log('💬 Testing EnhancedChatMessage validation...');
    
    const validMessage: EnhancedChatMessage = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Schedule a meeting with John tomorrow at 2pm',
      timestamp: new Date().toISOString(),
      user_id: 'test-user-123', // 🛡️ Required for privacy protection
      channel: 'sms',
      source_identifier: '+18582260766',
      intent: 'request',
      sentiment: 0.2,
      importance_score: 0.8,
      last_modified: new Date().toISOString(),
      modification_reason: 'concept_update',
      sms_metadata: {
        phone_number: '+18582260766',
        is_incoming: true,
        local_datetime: new Date().toISOString()
      },
      google_service_context: {
        service_type: 'calendar',
        operation: 'create_event',
        success: true
      }
    };
    
    const result = safeParseEnhancedChatMessage(validMessage);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.channel).toBe('sms');
      expect(result.data.intent).toBe('request');
      expect(result.data.importance_score).toBe(0.8);
    }
    
    console.log('✅ EnhancedChatMessage validation successful');
  });
  
  test('should validate brain memory context correctly', () => {
    console.log('🧠 Testing BrainMemoryContext validation...');
    
    const validContext: BrainMemoryContext = {
      working_memory: {
        recent_messages: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            content: 'Test message',
            timestamp: new Date().toISOString(),
            user_id: 'test-user-123', // 🛡️ Required for privacy protection
            channel: 'chat',
            source_identifier: 'websocket-123'
          }
        ],
        active_concepts: ['concept1', 'concept2'],
        current_intent: 'conversation',
        time_window_stats: {
          previous_week_count: 5,
          current_week_count: 8,
          next_week_count: 2,
          recently_modified_count: 3
        }
      },
      episodic_memory: {
        conversation_threads: [
          {
            thread_id: 'thread_123',
            semantic_weight: 0.75,
            memory_node_id: '550e8400-e29b-41d4-a716-446655440001'
          }
        ],
        related_episodes: ['episode1', 'episode2']
      },
      semantic_memory: {
        activated_concepts: [
          {
            concept: {
              id: '550e8400-e29b-41d4-a716-446655440002',
              name: 'meeting',
              activation_strength: 0.9,
              mention_count: 5,
              semantic_weight: 0.8,
              user_id: 'user123'
            },
            activation_strength: 0.9,
            related_concepts: ['calendar', 'schedule']
          }
        ],
        concept_associations: [
          {
            from_concept: 'concept1',
            to_concept: 'concept2',
            association_strength: 0.7,
            relationship_type: 'RELATED_TO'
          }
        ]
      },
      consolidation_metadata: {
        retrieval_timestamp: new Date().toISOString(),
        memory_strength: 0.85,
        context_channels: ['sms', 'chat'],
        memory_age_hours: 24,
        consolidation_score: 0.75,
        working_memory_limit: 7,
        episodic_window_hours: 168,
        semantic_activation_threshold: 0.3,
        sms_optimization: {
          character_budget: 1500,
          suggested_response_length: 'normal'
        }
      }
    };
    
    // Test validation function
    expect(isValidBrainMemoryContext(validContext)).toBe(true);
    
    // Test parse function (should not throw)
    const validated = validateBrainMemoryContext(validContext);
    expect(validated).toBeDefined();
    expect(validated.working_memory.recent_messages.length).toBe(1);
    expect(validated.semantic_memory.activated_concepts.length).toBe(1);
    expect(validated.consolidation_metadata.memory_strength).toBe(0.85);
    
    console.log('✅ BrainMemoryContext validation successful');
  });
  
  test('should validate composio memory enhancement correctly', () => {
    console.log('🔧 Testing ComposioMemoryEnhancement validation...');
    
    const validEnhancement: ComposioMemoryEnhancement = {
      tool_name: 'calendar_create_event',
      original_params: {
        title: 'Meeting',
        start_time: '2024-02-15T14:00:00Z'
      },
      memory_enhanced_params: {
        title: 'Meeting with John - discussed in SMS',
        start_time: '2024-02-15T14:00:00Z',
        description: 'Context from SMS conversation about project planning'
      },
      memory_insights: [
        'User frequently schedules meetings on Tuesdays',
        'John is a frequent contact in recent conversations'
      ],
      concepts_used: ['meeting', 'john', 'project'],
      episodic_context_used: ['recent_sms_conversation'],
      enhancement_confidence: 0.82
    };
    
    const result = ComposioMemoryEnhancementSchema.safeParse(validEnhancement);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.tool_name).toBe('calendar_create_event');
      expect(result.data.enhancement_confidence).toBe(0.82);
      expect(result.data.memory_insights.length).toBe(2);
    }
    
    console.log('✅ ComposioMemoryEnhancement validation successful');
  });
  
  test('should handle error cases correctly', () => {
    console.log('🚨 Testing error handling...');
    
    // Invalid chat message (missing required fields)
    const invalidMessage = {
      id: 'invalid-uuid',
      content: '',
      channel: 'invalid_channel'
    };
    
    const messageResult = safeParseEnhancedChatMessage(invalidMessage);
    expect(messageResult.success).toBe(false);
    
    // Invalid brain memory context
    const invalidContext = {
      working_memory: {},
      episodic_memory: {},
      semantic_memory: {}
      // Missing consolidation_metadata
    };
    
    expect(isValidBrainMemoryContext(invalidContext)).toBe(false);
    
    console.log('✅ Error handling working correctly');
  });

  // 🛡️ NEW PRIVACY VALIDATION TESTS
  test('should enforce user_id privacy protection in ChatMessage', () => {
    console.log('🛡️ Testing ChatMessage privacy enforcement...');
    
    // Test 1: Valid message with user_id should pass
    const validMessage = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Valid message with user ID',
      timestamp: new Date().toISOString(),
      user_id: 'test-user-123', // ✅ Required
      channel: 'sms' as const,
      source_identifier: '+1234567890'
    };
    
    expect(() => validateChatMessageWithUserId(validMessage)).not.toThrow();
    const result = safeParseEnhancedChatMessage(validMessage);
    expect(result.success).toBe(true);
    
    // Test 2: Message without user_id should fail
    const messageWithoutUserId = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      content: 'Message without user ID',
      timestamp: new Date().toISOString(),
      // ❌ Missing user_id
      channel: 'sms' as const,
      source_identifier: '+1234567890'
    };
    
    expect(() => validateChatMessageWithUserId(messageWithoutUserId)).toThrow('PRIVACY VIOLATION');
    const badResult = safeParseEnhancedChatMessage(messageWithoutUserId);
    expect(badResult.success).toBe(false);
    if (!badResult.success) {
      expect(badResult.error).toContain('user_id');
    }
    
    console.log('✅ ChatMessage privacy enforcement working correctly');
  });

  test('should enforce user_id privacy protection in Memory', () => {
    console.log('🛡️ Testing Memory privacy enforcement...');
    
    // Test 1: Valid memory with user_id should pass
    const validMemory = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: new Date().toISOString(),
      user_id: 'test-user-123', // ✅ Required
      memory_type: 'episodic' as const,
      consolidation_status: 'fresh' as const
    };
    
    expect(() => validateMemoryWithUserId(validMemory)).not.toThrow();
    
    // Test 2: Memory without user_id should fail
    const memoryWithoutUserId = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      timestamp: new Date().toISOString(),
      // ❌ Missing user_id
      memory_type: 'episodic' as const,
      consolidation_status: 'fresh' as const
    };
    
    expect(() => validateMemoryWithUserId(memoryWithoutUserId)).toThrow('PRIVACY VIOLATION');
    
    console.log('✅ Memory privacy enforcement working correctly');
  });

  test('should enforce user_id privacy protection in Concept', () => {
    console.log('🛡️ Testing Concept privacy enforcement...');
    
    // Test 1: Valid concept with user_id should pass
    const validConcept = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'meeting',
      user_id: 'test-user-123', // ✅ Required
      activation_strength: 0.8,
      mention_count: 5,
      semantic_weight: 0.7
    };
    
    expect(() => validateConceptWithUserId(validConcept)).not.toThrow();
    
    // Test 2: Concept without user_id should fail
    const conceptWithoutUserId = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'project',
      // ❌ Missing user_id
      activation_strength: 0.6,
      mention_count: 3,
      semantic_weight: 0.5
    };
    
    expect(() => validateConceptWithUserId(conceptWithoutUserId)).toThrow('PRIVACY VIOLATION');
    
    console.log('✅ Concept privacy enforcement working correctly');
  });

  test('should enforce user_id privacy protection in Tag', () => {
    console.log('🛡️ Testing Tag privacy enforcement...');
    
    // Test 1: Valid tag with user_id should pass
    const validTag = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'work',
      user_id: 'test-user-123', // ✅ Required
      usage_count: 10,
      category: 'topic' as const
    };
    
    expect(() => validateTagWithUserId(validTag)).not.toThrow();
    
    // Test 2: Tag without user_id should fail
    const tagWithoutUserId = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'personal',
      // ❌ Missing user_id
      usage_count: 5,
      category: 'topic' as const
    };
    
    expect(() => validateTagWithUserId(tagWithoutUserId)).toThrow('PRIVACY VIOLATION');
    
    console.log('✅ Tag privacy enforcement working correctly');
  });

  test('should enforce user_id privacy in BrainMemoryContext', () => {
    console.log('🛡️ Testing BrainMemoryContext privacy enforcement...');
    
    // Test 1: Valid context with user_id in all messages should pass
    const validContextWithUserId = {
      working_memory: {
        recent_messages: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            content: 'Message with user ID',
            timestamp: new Date().toISOString(),
            user_id: 'test-user-123', // ✅ Required
            channel: 'sms' as const,
            source_identifier: '+1234567890'
          }
        ],
        active_concepts: ['concept1'],
        current_intent: 'test'
      },
      episodic_memory: {
        conversation_threads: [],
        related_episodes: []
      },
      semantic_memory: {
        activated_concepts: [],
        concept_associations: []
      },
      consolidation_metadata: {
        retrieval_timestamp: new Date().toISOString(),
        memory_strength: 0.8,
        context_channels: ['sms' as const],
        consolidation_score: 0.7
      }
    };
    
    expect(() => validateBrainMemoryContext(validContextWithUserId)).not.toThrow();
    
    // Test 2: Context with message missing user_id should fail
    const contextWithMissingUserId = {
      working_memory: {
        recent_messages: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            content: 'Message without user ID',
            timestamp: new Date().toISOString(),
            // ❌ Missing user_id
            channel: 'sms' as const,
            source_identifier: '+1234567890'
          }
        ],
        active_concepts: ['concept1'],
        current_intent: 'test'
      },
      episodic_memory: {
        conversation_threads: [],
        related_episodes: []
      },
      semantic_memory: {
        activated_concepts: [],
        concept_associations: []
      },
      consolidation_metadata: {
        retrieval_timestamp: new Date().toISOString(),
        memory_strength: 0.8,
        context_channels: ['sms' as const],
        consolidation_score: 0.7
      }
    };
    
    expect(() => validateBrainMemoryContext(contextWithMissingUserId)).toThrow();
    
    console.log('✅ BrainMemoryContext privacy enforcement working correctly');
  });

  test('should demonstrate complete privacy protection flow', () => {
    console.log('🛡️ Testing complete privacy protection flow...');
    
    // Simulate a real-world scenario where all nodes must have user_id
    const userId = 'production-user-456';
    
    // 1. Create a message
    const secureMessage = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Schedule a secure meeting',
      timestamp: new Date().toISOString(),
      user_id: userId, // 🔒 Privacy protected
      channel: 'chat' as const,
      source_identifier: 'secure-chat-123'
    };
    
    // 2. Create related memory
    const secureMemory = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      timestamp: new Date().toISOString(),
      user_id: userId, // 🔒 Privacy protected
      memory_type: 'episodic' as const,
      consolidation_status: 'fresh' as const
    };
    
    // 3. Create related concept
    const secureConcept = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'secure-meeting',
      user_id: userId, // 🔒 Privacy protected
      activation_strength: 0.9,
      mention_count: 1,
      semantic_weight: 0.8
    };
    
    // 4. Create related tag
    const secureTag = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'security',
      user_id: userId, // 🔒 Privacy protected
      usage_count: 1,
      category: 'topic' as const
    };
    
    // All validations should pass
    expect(() => validateChatMessageWithUserId(secureMessage)).not.toThrow();
    expect(() => validateMemoryWithUserId(secureMemory)).not.toThrow();
    expect(() => validateConceptWithUserId(secureConcept)).not.toThrow();
    expect(() => validateTagWithUserId(secureTag)).not.toThrow();
    
    // Create a complete brain context
    const secureBrainContext = {
      working_memory: {
        recent_messages: [secureMessage],
        active_concepts: [secureConcept.id],
        current_intent: 'secure_scheduling'
      },
      episodic_memory: {
        conversation_threads: [{
          thread_id: 'secure-thread-1',
          semantic_weight: 0.9,
          memory_node_id: secureMemory.id
        }],
        related_episodes: []
      },
      semantic_memory: {
        activated_concepts: [{
          concept: secureConcept,
          activation_strength: 0.9,
          related_concepts: ['meeting', 'privacy']
        }],
        concept_associations: []
      },
      consolidation_metadata: {
        retrieval_timestamp: new Date().toISOString(),
        memory_strength: 0.95,
        context_channels: ['chat' as const],
        consolidation_score: 0.9
      }
    };
    
    expect(() => validateBrainMemoryContext(secureBrainContext)).not.toThrow();
    
    console.log('✅ Complete privacy protection flow validated');
    console.log(`🔒 All nodes properly secured for user: ${userId}`);
  });
  
  test('should validate brain memory constants correctly', () => {
    console.log('📊 Testing brain memory constants...');
    
    expect(BRAIN_MEMORY_CONSTANTS.WORKING_MEMORY_SIZE).toBe(7);
    expect(BRAIN_MEMORY_CONSTANTS.WORKING_MEMORY_TIME_WINDOW_DAYS).toBe(21);
    expect(BRAIN_MEMORY_CONSTANTS.EPISODIC_MEMORY_WINDOW_HOURS).toBe(168);
    expect(BRAIN_MEMORY_CONSTANTS.SEMANTIC_ACTIVATION_THRESHOLD).toBe(0.3);
    expect(BRAIN_MEMORY_CONSTANTS.MEMORY_CONSOLIDATION_HOURS).toBe(24);
    expect(BRAIN_MEMORY_CONSTANTS.RECENT_MODIFICATION_HOURS).toBe(2);
    expect(BRAIN_MEMORY_CONSTANTS.CACHE_TTL_SECONDS).toBe(1800);
    
    // Test time distribution bonuses
    expect(BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.PREVIOUS_WEEK).toBe(0.1);
    expect(BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.CURRENT_WEEK).toBe(0.2);
    expect(BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.NEXT_WEEK).toBe(0.05);
    expect(BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.RECENT_MODIFICATION).toBe(0.3);
    
    console.log('✅ Brain memory constants validation successful');
  });
  
  test('should demonstrate omnii_mcp + omnii-rdf unified integration', () => {
    console.log('🌐 Testing unified integration scenario...');
    
    // Simulate a complete flow: SMS → Brain Memory → RDF → omnii_mcp
    const smsMessage: EnhancedChatMessage = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Book a flight to Italy next month for my vacation',
      timestamp: new Date().toISOString(),
      user_id: 'test-user-123', // 🛡️ Required for privacy protection
      channel: 'sms',
      source_identifier: '+18582260766',
      intent: 'request',
      importance_score: 0.9
    };
    
    const brainContext: BrainMemoryContext = {
      working_memory: {
        recent_messages: [smsMessage],
        active_concepts: ['travel', 'italy', 'vacation'],
        current_intent: 'booking_request'
      },
      episodic_memory: {
        conversation_threads: [],
        related_episodes: []
      },
      semantic_memory: {
        activated_concepts: [
          {
            concept_name: 'travel',
            activation_strength: 0.9,
            related_concepts: ['flights', 'hotels', 'vacation']
          }
        ],
        concept_associations: []
      },
      consolidation_metadata: {
        retrieval_timestamp: new Date().toISOString(),
        memory_strength: 0.9,
        context_channels: ['sms'],
        consolidation_score: 0.8
      }
    };
    
    // Validate the complete flow
    expect(safeParseEnhancedChatMessage(smsMessage).success).toBe(true);
    expect(isValidBrainMemoryContext(brainContext)).toBe(true);
    
    // This would be processed by RDF service and handed off to omnii_mcp
    const composioEnhancement: ComposioMemoryEnhancement = {
      tool_name: 'book_flight',
      original_params: { destination: 'Italy' },
      memory_enhanced_params: { 
        destination: 'Italy',
        context: 'Vacation trip mentioned in SMS',
        preferred_month: 'next_month'
      },
      memory_insights: ['User frequently travels in summer', 'Italy mentioned in previous conversations'],
      concepts_used: ['travel', 'italy', 'vacation'],
      episodic_context_used: ['recent_sms'],
      enhancement_confidence: 0.85
    };
    
    expect(ComposioMemoryEnhancementSchema.safeParse(composioEnhancement).success).toBe(true);
    
    console.log('✅ Unified integration scenario validated');
    console.log('🎉 SMS → Brain Memory → RDF → omnii_mcp flow working correctly!');
  });
}); 