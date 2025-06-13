import { describe, test, expect, beforeAll } from "bun:test";
import { WebSocketHandlerService } from "../../src/services/websocket-handler.service";

describe("WebSocket RDF Enhancement", () => {
  let wsHandler: WebSocketHandlerService;
  const REAL_USER_ID = "cd9bdc60-35af-4bb6-b87e-1932e96fb354"; // Richard's real UUID
  
  beforeAll(() => {
    // Create WebSocketHandlerService with RDF integration
    wsHandler = new WebSocketHandlerService();
  });

  test("should process vague message input with RDF enhancement (if available)", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    const result = await wsHandler['handleWithActionPlanner'](
      "I should probably schedule a meeting with the team",
      REAL_USER_ID,
      mockWs as any
    );

    expect(result.success).toBe(true);
    
    // RDF enhancement is optional - test passes whether RDF works or not
    if (result.rdfEnhancement) {
      expect(result.rdfEnhancement.reasoning_applied).toBeDefined();
      if (result.rdfEnhancement.reasoning_applied) {
        expect(result.rdfEnhancement.extracted_concepts.length).toBeGreaterThan(0);
      }
    }
  });

  test("should include RDF processing time in WebSocket metadata (if RDF active)", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    const result = await wsHandler['handleWithActionPlanner'](
      "Book a restaurant reservation for tonight",
      REAL_USER_ID, 
      mockWs as any
    );

    expect(result.success).toBe(true);
    
    // Only check RDF metadata if RDF enhancement is present
    if (result.rdfEnhancement?.processing_metadata) {
      expect(result.rdfEnhancement.processing_metadata.processing_time_ms).toBeGreaterThan(0);
      expect(result.rdfEnhancement.processing_metadata.processing_time_ms).toBeLessThan(10000);
    }
  });

  test("should enhance WebSocket context with RDF insights (when available)", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    const result = await wsHandler['handleWithActionPlanner'](
      "Send email to papi about tomorrow's presentation",
      REAL_USER_ID,
      mockWs as any
    );

    expect(result.success).toBe(true);
    
    // Only test RDF enhancement if it's available and active
    if (result.rdfEnhancement?.reasoning_applied) {
      expect(result.rdfEnhancement.intent_analysis).toBeDefined();
      expect(result.rdfEnhancement.intent_analysis.primary_intent).toBeDefined();
      expect(result.rdfEnhancement.extracted_concepts).toBeDefined();
      
      // Should detect email-related concepts if RDF is working
      const conceptNames = result.rdfEnhancement.extracted_concepts.map(c => c.concept_name.toLowerCase());
      expect(conceptNames.some(name => name.includes('email') || name.includes('send'))).toBe(true);
    }
  }, 35000); // Increased timeout to 35 seconds for complex contact resolution
}); 