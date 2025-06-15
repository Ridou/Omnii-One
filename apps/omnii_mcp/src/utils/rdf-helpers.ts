// =======================================================================
// RDF HELPER UTILITIES
// Helper functions for RDF reasoning and brain memory integration
// =======================================================================

import crypto from 'crypto';
import { RDF_ACTION_TYPES, RDF_ACTION_TYPE_VALUES } from '@omnii/validators';
import { HumanInput, RDFProcessing } from '../types/rdf-schemas';

/**
 * Extract key concepts from text using basic NLP
 * This can be enhanced with more sophisticated NLP libraries
 */
export function extractBasicConcepts(text: string): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5); // Limit to 5 concepts to avoid confidence issues

  return [...new Set(words)]; // Remove duplicates
}

/**
 * Analyze sentiment of text (basic implementation)
 */
export function analyzeBasicSentiment(text: string): number {
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'love', 'like', 'enjoy', 'happy', 'pleased', 'excited', 'thanks'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry',
    'frustrated', 'disappointed', 'sad', 'upset', 'annoyed', 'problem'
  ];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });

  // Normalize to -1 to 1 range
  const maxWords = words.length;
  return maxWords > 0 ? Math.max(-1, Math.min(1, score / maxWords * 10)) : 0;
}

/**
 * Detect intent from text (basic rule-based)
 */
export function detectBasicIntent(text: string): string {
  const lower = text.toLowerCase();
  
  // Travel and booking intents
  if (lower.includes('flight') || lower.includes('book') || lower.includes('travel') || 
      lower.includes('vacation') || lower.includes('trip')) {
    return 'travel_booking';
  }
  
  // Task and reminder intents
  if (lower.includes('remind') || lower.includes('task') || lower.includes('todo') ||
      lower.includes('schedule') || lower.includes('meeting')) {
    return 'task_creation';
  }
  
  // Information seeking
  if (lower.includes('what') || lower.includes('how') || lower.includes('when') ||
      lower.includes('where') || lower.includes('who') || lower.includes('?')) {
    return 'information_seeking';
  }
  
  // Email intents
  if (lower.includes('email') || lower.includes('send') || lower.includes('message')) {
    return 'email_communication';
  }
  
  // Calendar intents
  if (lower.includes('calendar') || lower.includes('appointment') || lower.includes('event')) {
    return 'calendar_management';
  }
  
  return 'general';
}

/**
 * Calculate confidence score based on text analysis
 */
export function calculateConfidenceScore(text: string, concepts: string[]): number {
  const textLength = text.length;
  const conceptDensity = concepts.length / Math.max(1, textLength / 50); // concepts per 50 chars
  const hasQuestionMarks = (text.match(/\?/g) || []).length;
  const hasExclamation = (text.match(/!/g) || []).length;
  
  let confidence = 0.5; // Base confidence
  
  // More concepts = higher confidence (up to a point)
  confidence += Math.min(0.3, conceptDensity * 0.1);
  
  // Questions typically have clearer intent
  confidence += hasQuestionMarks * 0.1;
  
  // Exclamation suggests emotional content
  confidence += hasExclamation * 0.05;
  
  // Longer messages might have more context
  if (textLength > 50) confidence += 0.1;
  if (textLength > 200) confidence += 0.1;
  
  return Math.min(0.9, Math.max(0, confidence)); // Cap at 0.9 to be very safe
}

/**
 * Generate temporal patterns from text
 */
export function extractTemporalPatterns(text: string): Array<{
  type: string;
  confidence: number;
  temporal_context: string;
}> {
  const patterns: Array<{
    type: string;
    confidence: number;
    temporal_context: string;
  }> = [];
  const lower = text.toLowerCase();
  
  // Time indicators
  const timeIndicators = [
    { pattern: /tomorrow|next day/, type: 'future_immediate', context: 'next_day' },
    { pattern: /next week/, type: 'future_short', context: 'next_week' },
    { pattern: /next month/, type: 'future_medium', context: 'next_month' },
    { pattern: /yesterday|last|previous/, type: 'past', context: 'previous_period' },
    { pattern: /now|today|current/, type: 'present', context: 'current_time' },
    { pattern: /urgent|asap|immediately/, type: 'urgent', context: 'immediate_action' }
  ];
  
  timeIndicators.forEach(indicator => {
    if (indicator.pattern.test(lower)) {
      patterns.push({
        type: indicator.type,
        confidence: 0.8,
        temporal_context: indicator.context
      });
    }
  });
  
  return patterns;
}

/**
 * Create semantic connections between concepts
 */
export function createSemanticConnections(concepts: string[]): Array<{
  from_concept: string;
  to_concept: string;
  connection_type: string;
  strength: number;
}> {
  const connections = [];
  
  // Create connections between related concepts
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const concept1 = concepts[i];
      const concept2 = concepts[j];
      
      // Calculate semantic similarity (basic implementation)
      const similarity = calculateSemanticSimilarity(concept1, concept2);
      
      if (similarity > 0.3) {
        connections.push({
          from_concept: concept1,
          to_concept: concept2,
          connection_type: 'semantic_similarity',
          strength: similarity
        });
      }
    }
  }
  
  return connections;
}

/**
 * Basic semantic similarity calculation
 */
function calculateSemanticSimilarity(word1: string, word2: string): number {
  // Very basic similarity - check for common characters and patterns
  const set1 = new Set(word1.toLowerCase());
  const set2 = new Set(word2.toLowerCase());
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  const jaccard = intersection.size / union.size;
  
  // Boost similarity for related words
  const relatedPairs = [
    ['flight', 'travel'], ['book', 'reserve'], ['meeting', 'schedule'],
    ['email', 'message'], ['task', 'todo'], ['calendar', 'event']
  ];
  
  for (const [w1, w2] of relatedPairs) {
    if ((word1.includes(w1) && word2.includes(w2)) || 
        (word1.includes(w2) && word2.includes(w1))) {
      return Math.max(jaccard, 0.7);
    }
  }
  
  return jaccard;
}

/**
 * Generate processing ID for RDF operations
 */
export function generateProcessingId(): string {
  return crypto.randomUUID();
}

/**
 * Create RDF processing config with defaults
 */
export function createRDFProcessingConfig(
  overrides: Partial<RDFProcessing> = {}
): RDFProcessing {
  return {
    processing_id: generateProcessingId(),
    stage: 'input',
    start_time: new Date().toISOString(),
    reasoning_depth: 'intermediate',
    brain_integration_active: true,
    context_window_size: 10,
    confidence_threshold: 0.7,
    ...overrides
  };
}

/**
 * Validate human input and enrich with metadata
 */
export function enrichHumanInput(input: Partial<HumanInput>): HumanInput {
  return {
    raw_message: input.raw_message || '',
    user_id: input.user_id || '',
    channel: input.channel || 'chat',
    timestamp: input.timestamp || new Date().toISOString(),
    metadata: {
      is_incoming: true,
      ...input.metadata
    }
  };
}

/**
 * Extract actionable items from text
 */
export function extractActionableItems(text: string): any[] {
  const lowerText = text.toLowerCase();
  const actions = [];
  
  // Map detected intents to valid action types
  if (lowerText.includes('email') || lowerText.includes('draft') || lowerText.includes('send')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.SEND_EMAIL,
      confidence: 0.85,
      parameters: { content_type: 'email_draft' }
    });
  }
  
  if (lowerText.includes('meeting') || lowerText.includes('schedule') || lowerText.includes('calendar')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.SCHEDULE_EVENT,
      confidence: 0.8,
      parameters: { event_type: 'meeting' }
    });
  }
  
  if (lowerText.includes('task') || lowerText.includes('todo') || lowerText.includes('review')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.CREATE_TASK,
      confidence: 0.75,
      parameters: { task_type: 'work_item' }
    });
  }
  
  if (lowerText.includes('contact') || lowerText.includes('add') || lowerText.includes('person')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.SEARCH_CONTACTS, // Changed from create_contact to valid enum
      confidence: 0.7,
      parameters: { contact_type: 'new_contact' }
    });
  }
  
  if (lowerText.includes('remind') || lowerText.includes('reminder')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.SET_REMINDER,
      confidence: 0.8,
      parameters: { reminder_type: 'general' }
    });
  }
  
  if (lowerText.includes('flight') || lowerText.includes('book') || lowerText.includes('travel')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.BOOK_FLIGHT,
      confidence: 0.9,
      parameters: { travel_type: 'flight_booking' }
    });
  }
  
  if (lowerText.includes('restaurant') || lowerText.includes('food') || lowerText.includes('dining')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.SEARCH_RESTAURANTS,
      confidence: 0.75,
      parameters: { dining_type: 'restaurant_search' }
    });
  }
  
  if (lowerText.includes('note') || lowerText.includes('write') || lowerText.includes('jot')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.CREATE_NOTE,
      confidence: 0.7,
      parameters: { note_type: 'general' }
    });
  }
  
  if (lowerText.includes('update') || lowerText.includes('modify') || lowerText.includes('concept')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.UPDATE_CONCEPT,
      confidence: 0.75,
      parameters: { update_type: 'concept_modification' }
    });
  }
  
  if (lowerText.includes('workflow') || lowerText.includes('trigger') || lowerText.includes('automation')) {
    actions.push({
      action_type: RDF_ACTION_TYPES.TRIGGER_WORKFLOW,
      confidence: 0.8,
      parameters: { workflow_type: 'automation' }
    });
  }
  
  // Ensure all confidence values are ≤ 0.9
  return actions.map(action => ({
    ...action,
    confidence: Math.min(action.confidence, 0.9)
  }));
}

function extractDestination(text: string): string {
  const destinations = ['italy', 'paris', 'london', 'tokyo', 'new york', 'berlin', 'madrid'];
  for (const dest of destinations) {
    if (text.toLowerCase().includes(dest)) {
      return dest.charAt(0).toUpperCase() + dest.slice(1);
    }
  }
  return 'Unknown';
}

function extractTimeframe(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('tomorrow')) return 'tomorrow';
  if (lower.includes('next week')) return 'next_week';
  if (lower.includes('next month')) return 'next_month';
  return 'flexible';
}

function extractMeetingTitle(text: string): string {
  // Extract potential meeting title from text
  const words = text.split(' ');
  if (words.length > 3) {
    return words.slice(0, 5).join(' '); // First 5 words as title
  }
  return 'Meeting';
}

// Return a reasonable number of concepts (limit to 5 for now)
export function getConcepts(text: string): string[] {
  const concepts = extractBasicConcepts(text);
  return concepts.slice(0, 5);
} 