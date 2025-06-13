import { describe, test, expect, beforeAll } from "bun:test";
import { SimpleSMSAI } from "../../src/services/sms-ai-simple";

describe("SMS RDF Basic Integration", () => {
  let smsAI: SimpleSMSAI;
  
  beforeAll(() => {
    smsAI = new SimpleSMSAI();
    
    // Set up proper UUID mapping to fix phone number → UUID issue
    smsAI['phoneToUUIDMap'] = {
      "+18582260766": "cd9bdc60-35af-4bb6-b87e-1932e96fb354"
    };
    
    // Also ensure email mapping is set
    smsAI['phoneToEmailMap'] = {
      "+18582260766": "santino62@gmail.com"
    };
  });

  test("should integrate RDF service into SimpleSMSAI", () => {
    // This test validates that RDF service is properly integrated
    expect(smsAI['rdfService']).toBeDefined();
    expect(typeof smsAI['rdfService'].processHumanInputToOmniiMCP).toBe('function');
  });

  test("should process vague SMS input with RDF enhancement", async () => {
    const result = await smsAI.processMessage(
      "I should probably call Richard about that project",
      "+18582260766" // santino's test phone
    );

    expect(result.success).toBe(true);
    // Should include RDF enhancement in response metadata
    expect(result.rdfEnhancement).toBeDefined();
    expect(result.rdfEnhancement.reasoning_applied).toBe(true);
    expect(result.rdfEnhancement.extracted_concepts.length).toBeGreaterThan(0);
  });

  test("should include RDF processing time in SMS metadata", async () => {
    const result = await smsAI.processMessage(
      "Book a flight to Paris",
      "+18582260766"
    );

    expect(result.rdfEnhancement?.processing_metadata).toBeDefined();
    expect(result.rdfEnhancement.processing_metadata.processing_time_ms).toBeGreaterThan(0);
    expect(result.rdfEnhancement.processing_metadata.processing_time_ms).toBeLessThan(10000); // Reasonable time
  });

  test("should enhance SMS context with RDF insights", async () => {
    const result = await smsAI.processMessage(
      "Send email to Richard about tomorrow's meeting",
      "+18582260766"
    );

    expect(result.rdfEnhancement?.reasoning_applied).toBe(true);
    expect(result.rdfEnhancement?.intent_analysis).toBeDefined();
    expect(result.rdfEnhancement?.intent_analysis.primary_intent).toBeDefined();
    expect(result.rdfEnhancement?.extracted_concepts).toBeDefined();
    
    // Should detect email-related concepts
    const conceptNames = result.rdfEnhancement.extracted_concepts.map(c => c.concept_name.toLowerCase());
    expect(conceptNames.some(name => name.includes('email') || name.includes('send'))).toBe(true);
  });
}); 