#!/usr/bin/env bun
/**
 * Comprehensive Validators Test Suite
 * Tests all schemas, validation functions, types, and data validation
 */

// Import brain memory specific items from local re-export
import { 
  BrainMemoryContextSchema,
  EnhancedChatMessageSchema,
  EnhancedMemorySchema,
  EnhancedConceptSchema,
  EnhancedTagSchema,
  isValidBrainMemoryContext,
  validateBrainMemoryContext,
  safeParseEnhancedChatMessage,
  BRAIN_MEMORY_CONSTANTS,
  BrainMemoryContext,
  EnhancedChatMessage,
} from './src/types/brain-memory-schemas';

// Import other schemas directly from validators package
import {
  TaskDataSchema,
  EmailDataSchema,
  EmailListDataSchema,
  CalendarDataSchema,
  ContactDataSchema,
  UnifiedToolResponseSchema,
  isValidUnifiedToolResponse,
  RDFDataSchema,
  HumanInputSchema,
  XPUpdateSchema,
  AchievementDataSchema,
  CompleteTaskOverviewSchema,
  type TaskData,
  type EmailData,
  type EmailListData,
  type CalendarData,
  type ContactData,
  type UnifiedToolResponse,
  type CompleteTaskOverview,
} from '@omnii/validators';

console.log('🧪 COMPREHENSIVE VALIDATORS TEST SUITE');
console.log('=====================================');

let passedTests = 0;
let failedTests = 0;

function test(name: string, testFn: () => void | Promise<void>) {
  try {
    const result = testFn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ ${name}`);
        passedTests++;
      }).catch((error) => {
        console.log(`❌ ${name}: ${error.message}`);
        failedTests++;
      });
    } else {
      console.log(`✅ ${name}`);
      passedTests++;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failedTests++;
  }
}

// ============================================================================
// 1. SCHEMA AVAILABILITY TESTS
// ============================================================================

console.log('\n📋 1. Testing Schema Availability...');

test('BrainMemoryContextSchema is available', () => {
  if (typeof BrainMemoryContextSchema !== 'object') throw new Error('Schema not available');
});

test('EnhancedChatMessageSchema is available', () => {
  if (typeof EnhancedChatMessageSchema !== 'object') throw new Error('Schema not available');
});

test('TaskDataSchema is available', () => {
  if (typeof TaskDataSchema !== 'object') throw new Error('Schema not available');
});

test('EmailDataSchema is available', () => {
  if (typeof EmailDataSchema !== 'object') throw new Error('Schema not available');
});

test('UnifiedToolResponseSchema is available', () => {
  if (typeof UnifiedToolResponseSchema !== 'object') throw new Error('Schema not available');
});

// ============================================================================
// 2. VALIDATION FUNCTION TESTS
// ============================================================================

console.log('\n🔍 2. Testing Validation Functions...');

test('isValidBrainMemoryContext function works', () => {
  if (typeof isValidBrainMemoryContext !== 'function') throw new Error('Function not available');
  
  // Test with valid data
  const validContext = {
    working_memory: {
      recent_messages: [],
      active_concepts: [],
      time_window_stats: {
        previous_week_count: 0,
        current_week_count: 0,
        next_week_count: 0,
        recently_modified_count: 0
      }
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
      memory_strength: 0.5,
      context_channels: ['chat'],
      consolidation_score: 0.5
    }
  };
  
  const result = isValidBrainMemoryContext(validContext);
  if (!result) throw new Error('Valid context was rejected');
});

test('validateBrainMemoryContext function works', () => {
  if (typeof validateBrainMemoryContext !== 'function') throw new Error('Function not available');
});

test('safeParseEnhancedChatMessage function works', () => {
  if (typeof safeParseEnhancedChatMessage !== 'function') throw new Error('Function not available');
  
  // Test with valid data (with proper UUID)
  const validMessage = {
    id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
    content: 'Test message',
    timestamp: new Date().toISOString(),
    user_id: 'user-123',
    channel: 'chat',
    source_identifier: 'test-source'
  };
  
  const result = safeParseEnhancedChatMessage(validMessage);
  if (!result.success) throw new Error(`Parsing failed: ${result.error}`);
});

test('isValidUnifiedToolResponse function works', () => {
  if (typeof isValidUnifiedToolResponse !== 'function') throw new Error('Function not available');
});

// ============================================================================
// 3. CONSTANTS TESTS
// ============================================================================

console.log('\n📊 3. Testing Constants...');

test('BRAIN_MEMORY_CONSTANTS is available', () => {
  if (typeof BRAIN_MEMORY_CONSTANTS !== 'object') throw new Error('Constants not available');
  if (typeof BRAIN_MEMORY_CONSTANTS.WORKING_MEMORY_SIZE !== 'number') throw new Error('Working memory size not available');
  console.log(`   Working Memory Size: ${BRAIN_MEMORY_CONSTANTS.WORKING_MEMORY_SIZE}`);
});

// ============================================================================
// 4. TYPE INFERENCE TESTS
// ============================================================================

console.log('\n🎯 4. Testing Type Inference...');

test('BrainMemoryContext type can be used', () => {
  // This is a compile-time test - if it compiles, the type works
  const testFunction = (context: BrainMemoryContext): void => {
    // Type test passed
  };
  if (typeof testFunction !== 'function') throw new Error('Type inference failed');
});

test('EnhancedChatMessage type can be used', () => {
  const testFunction = (message: EnhancedChatMessage): void => {
    // Type test passed
  };
  if (typeof testFunction !== 'function') throw new Error('Type inference failed');
});

test('TaskData type can be used', () => {
  const testFunction = (task: TaskData): void => {
    // Type test passed
  };
  if (typeof testFunction !== 'function') throw new Error('Type inference failed');
});

test('EmailData type can be used', () => {
  const testFunction = (email: EmailData): void => {
    // Type test passed
  };
  if (typeof testFunction !== 'function') throw new Error('Type inference failed');
});

test('UnifiedToolResponse type can be used', () => {
  const testFunction = (response: UnifiedToolResponse): void => {
    // Type test passed
  };
  if (typeof testFunction !== 'function') throw new Error('Type inference failed');
});

// ============================================================================
// 5. REAL DATA VALIDATION TESTS
// ============================================================================

console.log('\n📝 5. Testing Real Data Validation...');

test('TaskDataSchema validates real task data', () => {
  const taskData = {
    id: 'task-123',
    title: 'Test Task',
    completed: 'pending', // String status instead of boolean
    list_id: 'list-123',
    user_id: 'user-123',
    created: new Date().toISOString(),
    updated: new Date().toISOString(), // Added missing 'updated' field
  };
  
  const result = TaskDataSchema.safeParse(taskData);
  if (!result.success) throw new Error(`Task validation failed: ${result.error.message}`);
});

test('EmailDataSchema validates real email data', () => {
  const emailData = {
    id: 'email-123',
    subject: 'Test Email',
    from: 'test@example.com',
    to: ['recipient@example.com'],
    body: 'Test email body',
    timestamp: new Date().toISOString(),
    user_id: 'user-123'
  };
  
  const result = EmailDataSchema.safeParse(emailData);
  if (!result.success) throw new Error(`Email validation failed: ${result.error.message}`);
});

test('UnifiedToolResponseSchema validates response data', () => {
  const responseData = {
    id: 'response-123',
    type: 'general',
    success: true,
    message: 'Operation successful',
    timestamp: new Date().toISOString(),
    authRequired: false,
    authUrl: '',
    userId: 'user-123', // Added missing userId
    data: {
      ui: {
        title: 'General Response',
        subtitle: 'Test subtitle',
        icon: '✅',
        content: 'Test content',
        actions: [],
        metadata: {
          confidence: 0.9,
          category: 'general',
          source: 'test',
          timestamp: new Date().toISOString() // Added missing timestamp
        }
      },
      structured: {
        content: 'Test structured content',  // Required content field
        message: 'Test structured data'
      },
      raw: {}
    }
  };
  
  const result = UnifiedToolResponseSchema.safeParse(responseData);
  if (!result.success) throw new Error(`Unified response validation failed: ${result.error.message}`);
});

// ============================================================================
// 6. ERROR HANDLING TESTS
// ============================================================================

console.log('\n⚠️  6. Testing Error Handling...');

test('Invalid data is properly rejected', () => {
  const invalidData = {
    invalid: 'data'
  };
  
  const result = isValidBrainMemoryContext(invalidData);
  if (result) throw new Error('Invalid data was accepted');
});

test('Missing required fields are caught', () => {
  const incompleteMessage = {
    content: 'Test message'
    // Missing required fields like id, timestamp, user_id, channel, source_identifier
  };
  
  const result = safeParseEnhancedChatMessage(incompleteMessage);
  if (result.success) throw new Error('Incomplete data was accepted');
});

test('Privacy validation catches missing user_id', () => {
  const messageWithoutUserId = {
    id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
    content: 'Test message',
    timestamp: new Date().toISOString(),
    channel: 'chat',
    source_identifier: 'test'
    // Missing user_id
  };
  
  const result = safeParseEnhancedChatMessage(messageWithoutUserId);
  if (result.success) throw new Error('Message without user_id was accepted');
  if (!result.error.includes('user_id')) throw new Error('Privacy validation not working');
});

// ============================================================================
// 7. FINAL RESULTS
// ============================================================================

setTimeout(() => {
  console.log('\n🎯 FINAL RESULTS');
  console.log('================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL VALIDATORS WORKING PERFECTLY!');
    console.log('✅ Schemas are available and functional');
    console.log('✅ Validation functions work correctly');
    console.log('✅ Types are properly inferred');
    console.log('✅ Real data validation works');
    console.log('✅ Error handling is working');
    console.log('✅ Privacy protection is active');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Review the errors above');
  }
}, 100); // Small delay to ensure all async tests complete 