// tests/integration/contact-resolution-integration.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { RDFContactAnalyzer } from '../../src/services/rdf-contact-analyzer';
import { ContactConfidenceBooster } from '../../src/services/contact-confidence-booster';
import { Contact, TemporalContactContext, CommunicationPatterns, BrainMemoryContext } from '../../src/types/contact-resolution';

describe('RDF Contact Resolution Integration', () => {
  let analyzer: RDFContactAnalyzer;
  let booster: ContactConfidenceBooster;

  beforeEach(() => {
    analyzer = new RDFContactAnalyzer();
    booster = new ContactConfidenceBooster();
  });

  test('should resolve business contact with high confidence', async () => {
    // Step 1: Analyze business message
    const message = "Send Eden an email about the quarterly report";
    const messageAnalysis = await analyzer.analyzeMessage(message);

    expect(messageAnalysis.primary_contact).toBe("Eden");
    expect(messageAnalysis.intent).toBe("send_email");
    expect(messageAnalysis.formality).toBe("business");

    // Step 2: Get name variations
    const variations = await analyzer.expandContactName("Eden", messageAnalysis);
    expect(variations[0].name).toBe("Eden");
    expect(variations[0].type).toBe("exact");

    // Step 3: Simulate contacts found
    const foundContacts: Contact[] = [
      {
        name: 'Eden Chen',
        email: 'eden.chen@company.com',
        title: 'Product Manager'
      },
      {
        name: 'Eden Martinez',
        email: 'eden.martinez@personal.com'
      }
    ];

    // Step 4: Resolve best match
    const resolution = await analyzer.resolveContact(foundContacts, messageAnalysis);
    
    expect(resolution.success).toBe(true);
    expect(resolution.resolved_contact?.contact.name).toBe('Eden Chen');
    expect(resolution.confidence).toBeGreaterThan(0.8);

    // Step 5: Brain memory boost
    const temporalContext: TemporalContactContext = {
      past_week: { 
        interactions: [],
        interaction_count: 3,
        average_sentiment: 0.8,
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
      preferred_channels: [{ channel: 'email', usage_percentage: 0.9, avg_importance: 0.8 }],
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

    const enhancedConfidence = booster.calculateEnhancedConfidence(
      resolution.confidence,
      temporalContext,
      communicationPatterns,
      brainMemoryContext
    );

    expect(enhancedConfidence.enhanced_confidence).toBeGreaterThan(0.85);
    expect(enhancedConfidence.boost_factors.length).toBeGreaterThan(0);
  });

  test('should handle ambiguous contact gracefully', async () => {
    // Ambiguous message
    const message = "Send a message to Pat";
    const messageAnalysis = await analyzer.analyzeMessage(message);

    expect(messageAnalysis.primary_contact).toBe("Pat");

    // Multiple potential matches
    const foundContacts: Contact[] = [
      { name: 'Patricia Johnson', email: 'patricia@work.com' },
      { name: 'Patrick Smith', email: 'patrick@personal.com' },
      { name: 'Pat Williams', phone: '+1234567890' }
    ];

    const resolution = await analyzer.resolveContact(foundContacts, messageAnalysis);

    // Should not auto-resolve due to ambiguity
    expect(resolution.success).toBe(false);
    expect(resolution.alternatives).toHaveLength(3);
    expect(resolution.confidence).toBeLessThan(0.8);
  });
}); 