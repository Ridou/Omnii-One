import { 
  TemporalContactContext, 
  CommunicationPatterns, 
  BrainMemoryContext, 
  EnhancedConfidenceResult,
  ConfidenceBoost
} from '../types/contact-resolution';

export class ContactConfidenceBooster {
  
  /**
   * Calculate enhanced confidence score using brain memory context
   */
  calculateEnhancedConfidence(
    baseConfidence: number,
    temporalContext: TemporalContactContext,
    communicationPatterns: CommunicationPatterns,
    brainMemoryContext: BrainMemoryContext
  ): EnhancedConfidenceResult {
    
    let enhancedConfidence = baseConfidence;
    const boostFactors: ConfidenceBoost[] = [];
    
    // 1. Recent Communication Boost (Past Week)
    if (temporalContext.past_week.interaction_count > 0) {
      const recentBoost = Math.min(temporalContext.past_week.interaction_count * 0.1, 0.3);
      enhancedConfidence += recentBoost;
      boostFactors.push({
        type: 'recent_communication',
        boost: recentBoost,
        reasoning: `Recent interactions: ${temporalContext.past_week.interaction_count} in past week`
      });
    }
    
    // 2. Current Week Activity Boost
    if (temporalContext.current_week.active_conversations > 0) {
      const currentBoost = Math.min(temporalContext.current_week.active_conversations * 0.15, 0.25);
      enhancedConfidence += currentBoost;
      boostFactors.push({
        type: 'current_activity',
        boost: currentBoost, 
        reasoning: `Active conversations this week: ${temporalContext.current_week.active_conversations}`
      });
    }
    
    // 3. Communication Channel Alignment Boost
    const preferredChannel = communicationPatterns.preferred_channels[0];
    if (preferredChannel && this.channelAlignmentScore(preferredChannel, brainMemoryContext) > 0.7) {
      const channelBoost = 0.2;
      enhancedConfidence += channelBoost;
      boostFactors.push({
        type: 'channel_alignment',
        boost: channelBoost,
        reasoning: `Communication typically via ${preferredChannel.channel}`
      });
    }
    
    // 4. Relationship Context Boost
    if (communicationPatterns.relationship_indicators.context_match > 0.8) {
      const relationshipBoost = 0.25;
      enhancedConfidence += relationshipBoost;
      boostFactors.push({
        type: 'relationship_context',
        boost: relationshipBoost,
        reasoning: `Strong relationship context match: ${communicationPatterns.relationship_indicators.primary_context}`
      });
    }
    
    // 5. Semantic Memory Activation Boost
    const semanticBoost = this.calculateSemanticBoost(brainMemoryContext.semantic_memory);
    if (semanticBoost > 0) {
      enhancedConfidence += semanticBoost;
      boostFactors.push({
        type: 'semantic_activation',
        boost: semanticBoost,
        reasoning: `Strong semantic associations in memory`
      });
    }
    
    // 6. Future Context Boost (scheduled interactions)
    if (temporalContext.future_week.scheduled_interactions.length > 0) {
      const futureBoost = 0.15;
      enhancedConfidence += futureBoost;
      boostFactors.push({
        type: 'future_context',
        boost: futureBoost,
        reasoning: `Upcoming interactions scheduled`
      });
    }
    
    // Cap at 0.95 (leave room for uncertainty)
    enhancedConfidence = Math.min(enhancedConfidence, 0.95);
    
    return {
      original_confidence: baseConfidence,
      enhanced_confidence: enhancedConfidence,
      total_boost: enhancedConfidence - baseConfidence,
      boost_factors: boostFactors,
      confidence_explanation: this.generateConfidenceExplanation(boostFactors)
    };
  }

  /**
   * Calculate semantic boost from activated concepts
   */
  private calculateSemanticBoost(semanticMemory: any): number {
    const activatedConcepts = semanticMemory.activated_concepts || [];
    const strongActivations = activatedConcepts.filter((c: any) => c.activation_strength > 0.7);
    return Math.min(strongActivations.length * 0.05, 0.15);
  }

  /**
   * Calculate channel alignment score
   */
  private channelAlignmentScore(preferredChannel: any, brainMemoryContext: BrainMemoryContext): number {
    // Check if current action aligns with preferred communication channel
    const recentChannels = brainMemoryContext.working_memory.recent_messages
      .map((msg: any) => msg.channel)
      .slice(0, 5);
    
    if (recentChannels.length === 0) {
      return 0.5; // Neutral score if no recent messages
    }
    
    const channelMatchCount = recentChannels.filter(ch => ch === preferredChannel.channel).length;
    return channelMatchCount / recentChannels.length;
  }

  /**
   * Generate human-readable confidence explanation
   */
  private generateConfidenceExplanation(boostFactors: ConfidenceBoost[]): string {
    return boostFactors
      .filter(bf => bf.boost > 0.05) // Only significant boosts
      .map(bf => bf.reasoning)
      .join('; ');
  }
} 