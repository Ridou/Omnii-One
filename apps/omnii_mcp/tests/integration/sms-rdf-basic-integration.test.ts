import { describe, test, expect, beforeAll } from "bun:test";
import { SimpleSMSAI } from "../../src/services/sms-ai-simple";

describe("SMS Basic Integration (RDF Disabled)", () => {
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

  test("should process SMS input without RDF (standard processing)", async () => {
    const result = await smsAI.processMessage(
      "I should probably call Richard about that project",
      "+18582260766" // santino's test phone
    );

    expect(result.success).toBe(true);
    // RDF should be disabled for SMS
    expect(result.rdfEnhancement).toBeDefined();
    expect(result.rdfEnhancement.reasoning_applied).toBe(false);
    expect(result.rdfEnhancement.analysis_depth).toBe('disabled');
  });

  test("should include RDF processing metadata showing disabled state", async () => {
    const result = await smsAI.processMessage(
      "Book a flight to Paris",
      "+18582260766"
    );

    expect(result.rdfEnhancement?.processing_metadata).toBeDefined();
    expect(result.rdfEnhancement.processing_metadata.processing_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.rdfEnhancement.processing_metadata.analysis_depth).toBe('disabled');
    expect(result.rdfEnhancement.processing_metadata.concepts_extracted).toBe(0);
  });

  test("should handle SMS without RDF enhancement", async () => {
    const result = await smsAI.processMessage(
      "Send email to Richard about tomorrow's meeting",
      "+18582260766"
    );

    expect(result.rdfEnhancement?.reasoning_applied).toBe(false);
    expect(result.rdfEnhancement?.intent_analysis).toBeDefined();
    expect(result.rdfEnhancement?.intent_analysis.primary_intent).toBe('unknown');
    expect(result.rdfEnhancement?.extracted_concepts).toEqual([]);
    
    // Should still process the message successfully even without RDF
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });

  test("should use standard entity resolution without RDF", async () => {
    const result = await smsAI.processMessage(
      "Create a task to follow up with Sarah",
      "+18582260766"
    );

    // Should still work without RDF - uses EntityManager directly
    expect(result.success).toBe(true);
    expect(result.rdfEnhancement.reasoning_applied).toBe(false);
    
    // But still should have some processing metadata
    expect(result.rdfEnhancement.processing_metadata.processing_time_ms).toBeGreaterThanOrEqual(0);
  });
}); 