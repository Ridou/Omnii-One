import { describe, test, expect, beforeAll } from "bun:test";
import { SimpleSMSAI } from "../../src/services/sms-ai-simple";

describe("SMS RDF Error Handling & Resilience", () => {
  let smsAI: SimpleSMSAI;
  
  beforeAll(() => {
    smsAI = new SimpleSMSAI();
  });

  test("should fallback gracefully when RDF fails for SMS", async () => {
    // Mock RDF failure
    const originalMethod = smsAI['rdfService']?.processHumanInputToOmniiMCP;
    if (smsAI['rdfService']) {
      smsAI['rdfService'].processHumanInputToOmniiMCP = () => {
        throw new Error("RDF failed");
      };
    }
    
    const result = await smsAI.processMessage(
      "Test message",
      "+18582260766"
    );
    
    expect(result.success).toBe(true); // Should still succeed
    expect(result.rdfEnhancement?.reasoning_applied).toBe(false);
    
    // Restore original method
    if (smsAI['rdfService'] && originalMethod) {
      smsAI['rdfService'].processHumanInputToOmniiMCP = originalMethod;
    }
  });

  test("should preserve existing SMS functionality when RDF is disabled", async () => {
    // Test that we can disable RDF processing
    const originalRDFService = smsAI['rdfService'];
    smsAI['rdfService'] = null;
    
    const result = await smsAI.processMessage(
      "Hello there",
      "+18582260766"
    );
    
    expect(result.success).toBe(true);
    // Should not have RDF enhancement but still work
    expect(result.rdfEnhancement).toBeUndefined();
    
    // Restore
    smsAI['rdfService'] = originalRDFService;
  });

  test("should handle malformed RDF responses gracefully", async () => {
    // Mock malformed RDF response
    const originalMethod = smsAI['rdfService']?.processHumanInputToOmniiMCP;
    if (smsAI['rdfService']) {
      smsAI['rdfService'].processHumanInputToOmniiMCP = () => {
        return null; // Malformed response
      };
    }
    
    const result = await smsAI.processMessage(
      "Test malformed response",
      "+18582260766"
    );
    
    expect(result.success).toBe(true);
    expect(result.rdfEnhancement?.reasoning_applied).toBe(false);
    
    // Restore original method
    if (smsAI['rdfService'] && originalMethod) {
      smsAI['rdfService'].processHumanInputToOmniiMCP = originalMethod;
    }
  });

  test("should handle empty or undefined SMS input gracefully", async () => {
    const emptyResult = await smsAI.processMessage(
      "",
      "+18582260766"
    );
    
    expect(emptyResult.success).toBe(true);
    
    const undefinedResult = await smsAI.processMessage(
      undefined as any,
      "+18582260766"
    );
    
    expect(undefinedResult.success).toBe(true);
  });

  test("should handle invalid phone numbers gracefully", async () => {
    const result = await smsAI.processMessage(
      "Test message with invalid phone",
      "not-a-phone-number"
    );
    
    expect(result.success).toBe(true);
    // Should still process the message even with invalid phone
  });
}); 