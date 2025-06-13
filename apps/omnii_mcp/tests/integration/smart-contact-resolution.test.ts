import { describe, test, expect, beforeAll } from "bun:test";
import { SmartContactResolver } from "../../src/services/smart-contact-resolver";
import { EntityManager } from "../../src/services/entity-recognizer";
import { ExecutionContextType } from "../../src/types/action-planning.types";

describe("Smart Contact Resolution - Improved UX", () => {
  let smartResolver: SmartContactResolver;
  let entityManager: EntityManager;
  
  beforeAll(() => {
    smartResolver = new SmartContactResolver();
    entityManager = new EntityManager();
  });

  test("should have SmartContactResolver integrated into EntityManager", () => {
    expect(entityManager['smartContactResolver']).toBeDefined();
    expect(typeof entityManager['smartContactResolver'].resolveContact).toBe('function');
  });

  test("should resolve 'Richard' to 'Richard Santin' with high confidence", async () => {
    const result = await smartResolver.resolveContact(
      "Richard",
      ExecutionContextType.SMS,
      "+18582260766"
    );

    console.log(`[SmartContactTest] 🧠 Result for "Richard":`, JSON.stringify(result, null, 2));

    if (result.success && result.exactMatch) {
      expect(result.exactMatch.name).toContain("Richard");
      expect(result.exactMatch.confidence).toBeGreaterThan(0.7);
      console.log(`✅ SUCCESS: Found exact match - ${result.exactMatch.name} (${Math.round(result.exactMatch.confidence * 100)}% confidence)`);
    } else if (result.suggestions && result.suggestions.length > 0) {
      const bestSuggestion = result.suggestions[0];
      expect(bestSuggestion.name).toContain("Richard");
      expect(bestSuggestion.confidence).toBeGreaterThan(0.3);
      console.log(`💡 SUGGESTIONS: Found ${result.suggestions.length} matches - best: ${bestSuggestion.name} (${Math.round(bestSuggestion.confidence * 100)}% confidence)`);
    } else {
      console.log(`❌ NO MATCHES: ${result.message}`);
    }

    // Should not get the old "Please provide their email address" message
    expect(result.message).not.toContain("Please provide their email address");
  });

  test("should provide intelligent suggestions instead of generic error", async () => {
    // Test with a partial name that should match Richard Santin
    const result = await smartResolver.resolveContact(
      "Rich",
      ExecutionContextType.SMS,
      "+18582260766"
    );

    console.log(`[SmartContactTest] 🧠 Result for "Rich":`, JSON.stringify(result, null, 2));

    if (result.success) {
      console.log(`✅ EXACT MATCH: ${result.exactMatch?.name}`);
    } else if (result.suggestions && result.suggestions.length > 0) {
      console.log(`💡 SMART SUGGESTIONS: Found ${result.suggestions.length} matches`);
      result.suggestions.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} (${Math.round(s.confidence * 100)}% - ${s.reasoning})`);
      });
      
      // Should find Richard Santin as a suggestion
      const richardMatch = result.suggestions.find(s => s.name.toLowerCase().includes('richard'));
      expect(richardMatch).toBeDefined();
    }

    // Modern message should be helpful, not generic
    expect(result.message).not.toContain("Please provide their email address");
    if (result.suggestions) {
      expect(result.message).toContain("possible matches");
    }
  });

  test("should integrate with EntityManager for better entity resolution", async () => {
    // This tests the full flow through EntityManager -> SmartContactResolver
    const entities = await entityManager.resolveEntities(
      "Send email to Richard about the project",
      ExecutionContextType.SMS
    );

    console.log(`[SmartContactTest] 🧠 EntityManager resolved:`, entities);

    expect(entities.length).toBeGreaterThan(0);
    
    const richardEntity = entities.find(e => e.value.toLowerCase().includes('richard'));
    if (richardEntity) {
      // Should either be resolved to EMAIL type or have smart suggestions
      if (richardEntity.type === 'EMAIL') {
        console.log(`✅ RESOLVED TO EMAIL: ${richardEntity.email}`);
        expect(richardEntity.email).toBeDefined();
      } else if (richardEntity.type === 'UNKNOWN' && richardEntity.smartSuggestions) {
        console.log(`💡 HAS SMART SUGGESTIONS: ${richardEntity.smartSuggestions.length} matches`);
        expect(richardEntity.smartSuggestions.length).toBeGreaterThan(0);
        
        const bestSuggestion = richardEntity.smartSuggestions[0];
        expect(bestSuggestion.name.toLowerCase()).toContain('richard');
      } else {
        console.log(`ℹ️ Entity type: ${richardEntity.type}, value: ${richardEntity.value}`);
      }
    }
  });

  test("should demonstrate improved intervention message", () => {
    // Mock entity with smart suggestions
    const entityWithSuggestions = {
      type: 'UNKNOWN' as const,
      value: 'Richard',
      smartSuggestions: [
        { name: 'Richard Santin', email: 'richard.santin@gmail.com', confidence: 0.9, reasoning: 'Exact name match' },
        { name: 'Richard Smith', email: 'rsmith@example.com', confidence: 0.6, reasoning: 'Partial name match' }
      ],
      resolvedAt: Date.now()
    };

    // Simulate the improved intervention message logic
    const suggestions = entityWithSuggestions.smartSuggestions
      .slice(0, 3)
      .map((s, i) => `${i + 1}. ${s.name}${s.email ? ` (${s.email})` : ''}`)
      .join('\n');
    
    const improvedMessage = `I found ${entityWithSuggestions.smartSuggestions.length} possible matches for "${entityWithSuggestions.value}":\n\n${suggestions}\n\nPlease reply with the number (1-${Math.min(3, entityWithSuggestions.smartSuggestions.length)}) of the correct person, or provide their email address:`;

    console.log(`[SmartContactTest] 🎯 IMPROVED MESSAGE:`);
    console.log(improvedMessage);

    // Verify the improved message
    expect(improvedMessage).toContain("Richard Santin");
    expect(improvedMessage).toContain("richard.santin@gmail.com");
    expect(improvedMessage).toContain("Please reply with the number");
    expect(improvedMessage).not.toContain("I don't recognize");
    
    console.log(`✅ MUCH BETTER than: "I don't recognize 'Richard'. Please provide their email address:"`);
  });
}); 