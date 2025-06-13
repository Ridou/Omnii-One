// tests/unit/contact-name-expansion.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { RDFContactAnalyzer } from '../../src/services/rdf-contact-analyzer';

describe('RDFContactAnalyzer - Name Expansion', () => {
  let analyzer: RDFContactAnalyzer;
  
  beforeEach(() => {
    analyzer = new RDFContactAnalyzer();
  });

  test('should generate comprehensive name variations', async () => {
    const contactName = "Eden";
    const messageContext = {
      primary_contact: "Eden",
      intent: "send_email",
      context_clues: ["quarterly", "report"],
      formality: "business" as const,
      urgency: "normal" as const,
      additional_context: "work-related communication",
      confidence: 0.9
    };
    
    const variations = await analyzer.expandContactName(contactName, messageContext);
    
    expect(variations).toEqual(
      expect.arrayContaining([
        { name: "Eden", confidence: 1.0, type: "exact" },
        { name: "Edan", confidence: expect.any(Number), type: "phonetic" },
        { name: "Aiden", confidence: expect.any(Number), type: "similar" },
        { name: "Ethan", confidence: expect.any(Number), type: "similar" }
      ])
    );
    
    // Verify exact match has highest confidence
    const exactMatch = variations.find(v => v.type === "exact");
    expect(exactMatch?.confidence).toBe(1.0);
    
    // Verify variations are sorted by confidence
    for (let i = 1; i < variations.length; i++) {
      expect(variations[i-1].confidence).toBeGreaterThanOrEqual(variations[i].confidence);
    }
  });

  test('should consider cultural and linguistic variations', async () => {
    const messageContext = {
      primary_contact: "Maria",
      intent: "send_email",
      context_clues: [],
      formality: "neutral" as const,
      urgency: "normal" as const,
      additional_context: "general communication",
      confidence: 0.8
    };

    const variations = await analyzer.expandContactName("Maria", messageContext);
    
    expect(variations.map(v => v.name)).toEqual(
      expect.arrayContaining(["Maria", "Marie", "Mary", "Mariah", "Mária"])
    );
  });

  test('should handle names with no variations gracefully', async () => {
    const messageContext = {
      primary_contact: "Zephyr",
      intent: "send_email",
      context_clues: [],
      formality: "neutral" as const,
      urgency: "normal" as const,
      additional_context: "general communication",
      confidence: 0.8
    };

    const variations = await analyzer.expandContactName("Zephyr", messageContext);
    
    // Should at least return the exact match
    expect(variations).toHaveLength(1);
    expect(variations[0]).toEqual({
      name: "Zephyr",
      confidence: 1.0,
      type: "exact"
    });
  });

  test('should limit variations to reasonable number', async () => {
    const messageContext = {
      primary_contact: "Maria",
      intent: "send_email",
      context_clues: [],
      formality: "neutral" as const,
      urgency: "normal" as const,
      additional_context: "general communication",
      confidence: 0.8
    };

    const variations = await analyzer.expandContactName("Maria", messageContext);
    
    // Should not return too many variations (max 10 is reasonable)
    expect(variations.length).toBeLessThanOrEqual(10);
  });
}); 