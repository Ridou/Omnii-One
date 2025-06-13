// tests/unit/contact-confidence-booster.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { ContactConfidenceBooster } from '../../src/services/contact-confidence-booster';
import { TemporalContactContext, CommunicationPatterns, BrainMemoryContext } from '../../src/types/contact-resolution';

describe('ContactConfidenceBooster', () => {
  let booster: ContactConfidenceBooster;

  beforeEach(() => {
    booster = new ContactConfidenceBooster();
  });

  test('should boost confidence based on recent communication', () => {
    const baseConfidence = 0.6;
    const temporalContext: TemporalContactContext = {
      past_week: { 
        interactions: [],
        interaction_count: 3,
        average_sentiment: 0.8,
        primary_channels: ['email'],
        topics: ['work', 'meeting']
      },
      current_week: { 
        interactions: [],
        active_conversations: 1,
        frequency_trend: 'stable'
      },
      future_week: { 
        scheduled_interactions: [],
        upcoming_events: []
      }
    };
    const communicationPatterns: CommunicationPatterns = {
      preferred_channels: [{ channel: 'email', usage_percentage: 0.8, avg_importance: 0.7 }],
      interaction_frequency: 5,
      relationship_indicators: { 
        context_match: 0.9, 
        primary_context: 'professional' 
      }
    };
    const brainMemoryContext: BrainMemoryContext = {
      working_memory: {
        recent_messages: [],
        active_concepts: []
      },
      episodic_memory: {
        conversation_threads: [],
        related_episodes: []
      },
      semantic_memory: { 
        activated_concepts: [{ 
          concept: { concept_name: 'work' },
          activation_strength: 0.8,
          related_concepts: []
        }],
        concept_associations: []
      },
      consolidation_metadata: {
        memory_strength: 0.8,
        consolidation_score: 0.7
      }
    };

    const result = booster.calculateEnhancedConfidence(
      baseConfidence,
      temporalContext,
      communicationPatterns,
      brainMemoryContext
    );

    expect(result.enhanced_confidence).toBeGreaterThan(baseConfidence);
    expect(result.total_boost).toBeGreaterThan(0);
    expect(result.boost_factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'recent_communication' }),
        expect.objectContaining({ type: 'current_activity' }),
        expect.objectContaining({ type: 'relationship_context' })
      ])
    );
  });

  test('should cap enhanced confidence at 0.95', () => {
    const baseConfidence = 0.8;
    const temporalContext: TemporalContactContext = {
      past_week: { 
        interactions: [],
        interaction_count: 10, // Very high interaction
        average_sentiment: 0.9,
        primary_channels: ['email'],
        topics: ['work']
      },
      current_week: { 
        interactions: [],
        active_conversations: 5,
        frequency_trend: 'increasing'
      },
      future_week: { 
        scheduled_interactions: [1, 2, 3],
        upcoming_events: []
      }
    };

    const communicationPatterns: CommunicationPatterns = {
      preferred_channels: [{ channel: 'email', usage_percentage: 0.9, avg_importance: 0.8 }],
      interaction_frequency: 20,
      relationship_indicators: { 
        context_match: 0.95, 
        primary_context: 'professional' 
      }
    };

    const brainMemoryContext: BrainMemoryContext = {
      working_memory: {
        recent_messages: [],
        active_concepts: []
      },
      episodic_memory: {
        conversation_threads: [],
        related_episodes: []
      },
      semantic_memory: { 
        activated_concepts: [{ 
          concept: { concept_name: 'work' },
          activation_strength: 0.9,
          related_concepts: []
        }],
        concept_associations: []
      },
      consolidation_metadata: {
        memory_strength: 0.9,
        consolidation_score: 0.8
      }
    };

    const result = booster.calculateEnhancedConfidence(
      baseConfidence,
      temporalContext,
      communicationPatterns,
      brainMemoryContext
    );

    expect(result.enhanced_confidence).toBeLessThanOrEqual(0.95);
  });

  test('should not boost confidence when no recent communication', () => {
    const baseConfidence = 0.6;
    const temporalContext: TemporalContactContext = {
      past_week: { 
        interactions: [],
        interaction_count: 0,
        average_sentiment: 0,
        primary_channels: [],
        topics: []
      },
      current_week: { 
        interactions: [],
        active_conversations: 0,
        frequency_trend: 'none'
      },
      future_week: { 
        scheduled_interactions: [],
        upcoming_events: []
      }
    };

    const communicationPatterns: CommunicationPatterns = {
      preferred_channels: [],
      interaction_frequency: 0,
      relationship_indicators: { 
        context_match: 0.1, 
        primary_context: 'unknown' 
      }
    };

    const brainMemoryContext: BrainMemoryContext = {
      working_memory: {
        recent_messages: [],
        active_concepts: []
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
        memory_strength: 0.1,
        consolidation_score: 0.1
      }
    };

    const result = booster.calculateEnhancedConfidence(
      baseConfidence,
      temporalContext,
      communicationPatterns,
      brainMemoryContext
    );

    // Should have minimal or no boost
    expect(result.total_boost).toBeLessThan(0.1);
    expect(result.enhanced_confidence).toBeCloseTo(baseConfidence, 1);
  });

  test('should provide clear reasoning for confidence boosts', () => {
    const baseConfidence = 0.6;
    const temporalContext: TemporalContactContext = {
      past_week: { 
        interactions: [],
        interaction_count: 2,
        average_sentiment: 0.7,
        primary_channels: ['email'],
        topics: ['work']
      },
      current_week: { 
        interactions: [],
        active_conversations: 1,
        frequency_trend: 'stable'
      },
      future_week: { 
        scheduled_interactions: [],
        upcoming_events: []
      }
    };

    const communicationPatterns: CommunicationPatterns = {
      preferred_channels: [{ channel: 'email', usage_percentage: 0.8, avg_importance: 0.7 }],
      interaction_frequency: 3,
      relationship_indicators: { 
        context_match: 0.8, 
        primary_context: 'professional' 
      }
    };

    const brainMemoryContext: BrainMemoryContext = {
      working_memory: {
        recent_messages: [],
        active_concepts: []
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
        memory_strength: 0.6,
        consolidation_score: 0.6
      }
    };

    const result = booster.calculateEnhancedConfidence(
      baseConfidence,
      temporalContext,
      communicationPatterns,
      brainMemoryContext
    );

    expect(result.confidence_explanation).toContain('Recent interactions');
    expect(result.boost_factors.length).toBeGreaterThan(0);
    expect(result.boost_factors[0]).toHaveProperty('reasoning');
  });
}); 