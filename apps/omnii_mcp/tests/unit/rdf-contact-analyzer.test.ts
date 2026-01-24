// tests/unit/rdf-contact-analyzer.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { RDFContactAnalyzer } from '../../src/services/rdf-contact-analyzer';
import { MessageAnalysis } from '../../src/types/contact-resolution';

describe('RDFContactAnalyzer - Message Analysis', () => {
  let analyzer: RDFContactAnalyzer;
  
  beforeEach(() => {
    analyzer = new RDFContactAnalyzer();
  });

  describe('analyzeMessage', () => {
    test('should extract contact and intent from simple email request', async () => {
      const message = "Send Eden an email about the quarterly report";
      
      const result = await analyzer.analyzeMessage(message);
      
      expect(result).toEqual({
        primary_contact: "Eden",
        intent: "send_email",
        context_clues: expect.arrayContaining(["quarterly", "report"]),
        formality: "business",
        urgency: "normal",
        additional_context: expect.stringContaining("work-related"),
        confidence: expect.any(Number)
      });
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should handle casual text message requests', async () => {
      const message = "Text Mike about dinner tonight";
      
      const result = await analyzer.analyzeMessage(message);
      
      expect(result).toEqual({
        primary_contact: "Mike",
        intent: "send_text",
        context_clues: expect.arrayContaining(["dinner", "tonight"]),
        formality: "casual",
        urgency: "normal",
        additional_context: expect.stringContaining("personal"),
        confidence: expect.any(Number)
      });
    });

    test('should detect urgency indicators', async () => {
      const message = "URGENT: Call Dr. Smith immediately about test results";
      
      const result = await analyzer.analyzeMessage(message);
      
      expect(result.urgency).toBe("urgent");
      expect(result.intent).toBe("make_call");
      expect(result.formality).toBe("formal");
    });

    test('should handle ambiguous contact references', async () => {
      const message = "Remind me to follow up with J about the project";
      
      const result = await analyzer.analyzeMessage(message);
      
      expect(result.primary_contact).toBe("J");
      expect(result.confidence).toBeLessThan(0.6); // Low confidence for single letter
    });
  });
}); 