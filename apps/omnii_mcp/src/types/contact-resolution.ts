// Contact Resolution Types for RDF-driven system
export interface MessageAnalysis {
  primary_contact: string;
  intent: string;
  context_clues: string[];
  formality: 'casual' | 'neutral' | 'business' | 'formal';
  urgency: 'low' | 'normal' | 'urgent';
  additional_context: string;
  confidence: number;
}

export interface NameVariation {
  name: string;
  confidence: number;
  type: 'exact' | 'phonetic' | 'similar' | 'similar_sound' | 'cultural' | 'nickname';
}

export interface Contact {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
}

export interface ContactWithMatch extends Contact {
  matchedVariation?: NameVariation;
  searchConfidence?: number;
}

export interface ContactAlternative {
  contact: Contact;
  confidence: number;
  reasoning: string;
}

export interface ContactResolution {
  resolved_contact?: {
    contact: Contact;
    confidence: number;
    reasoning: string;
  };
  alternatives?: ContactAlternative[];
  success: boolean;
  confidence: number;
}

export interface SmartContactResult {
  success: boolean;
  confidence: number;
  contact?: Contact;
  alternatives?: ContactAlternative[];
  reasoning?: string;
}

// Brain Memory Context Types
export interface TemporalContactContext {
  past_week: {
    interactions: any[];
    interaction_count: number;
    average_sentiment: number;
    primary_channels: string[];
    topics: string[];
  };
  current_week: {
    interactions: any[];
    active_conversations: number;
    frequency_trend: string;
    recent_intent?: string;
  };
  future_week: {
    scheduled_interactions: any[];
    upcoming_events: any[];
  };
}

export interface CommunicationPatterns {
  preferred_channels: Array<{
    channel: string;
    usage_percentage: number;
    avg_importance: number;
  }>;
  interaction_frequency: number;
  relationship_indicators: {
    primary_context: string;
    context_match: number;
  };
}

export interface ConfidenceBoost {
  type: string;
  boost: number;
  reasoning: string;
}

export interface EnhancedConfidenceResult {
  original_confidence: number;
  enhanced_confidence: number;
  total_boost: number;
  boost_factors: ConfidenceBoost[];
  confidence_explanation: string;
}

export interface PersonalizedCommunicationStyle {
  formality_level: string;
  preferred_greeting: string;
  typical_message_length: string;
  tone_indicators: string[];
  timing_preferences: any;
  personalization_suggestions?: string[];
}

export interface BrainMemoryContext {
  working_memory: {
    recent_messages: any[];
    active_concepts: string[];
    current_intent?: string;
  };
  episodic_memory: {
    conversation_threads: any[];
    related_episodes: string[];
  };
  semantic_memory: {
    activated_concepts: Array<{
      concept: { concept_name: string };
      activation_strength: number;
      related_concepts: string[];
    }>;
    concept_associations: any[];
  };
  consolidation_metadata: {
    memory_strength: number;
    consolidation_score: number;
  };
} 