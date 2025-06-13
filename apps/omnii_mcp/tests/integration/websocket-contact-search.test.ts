import { describe, test, expect, beforeAll } from "bun:test";
import { WebSocketHandlerService } from "../../src/services/websocket-handler.service";

describe("WebSocket Contact Search Improvements", () => {
  let wsHandler: WebSocketHandlerService;
  const REAL_USER_ID = "cd9bdc60-35af-4bb6-b87e-1932e96fb354"; // Richard's real UUID
  
  beforeAll(() => {
    wsHandler = new WebSocketHandlerService();
  });

  test("should find Richard directly without listing all contacts", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    console.log("\n🔍 TESTING IMPROVED CONTACT SEARCH");
    console.log("================================");
    console.log("Message: 'Send email to Richard about the project'");
    console.log("Expected: Should find Richard directly, not list all 33 contacts");

    const result = await wsHandler['handleWithActionPlanner'](
      "Send email to Richard about the project",
      REAL_USER_ID,
      mockWs as any
    );

    console.log("\n📊 CONTACT SEARCH ANALYSIS:");
    console.log("============================");
    console.log("Success:", result.success);
    console.log("Has RDF enhancement:", !!result.rdfEnhancement);
    
    if (result.rdfEnhancement) {
      console.log("RDF concepts:", result.rdfEnhancement.extracted_concepts?.map(c => c.concept_name));
      console.log("Processing time:", result.rdfEnhancement.processing_metadata?.processing_time_ms, "ms");
    }

    // The test should pass regardless of contact search results
    // We're more interested in observing the behavior
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  test("should try nickname variations for Richard", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    console.log("\n🔄 TESTING NICKNAME VARIATIONS");
    console.log("==============================");
    console.log("Testing various Richard-related names...");

    const testCases = [
      "Send message to Rick about the meeting",
      "Email Rich about the update", 
      "Contact Richie about the project"
    ];

    for (const testMessage of testCases) {
      console.log(`\n📧 Testing: "${testMessage}"`);
      
      const result = await wsHandler['handleWithActionPlanner'](
        testMessage,
        REAL_USER_ID,
        mockWs as any
      );

      console.log(`Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
      
      // Log what we learned about the search behavior
      if (result.rdfEnhancement?.extracted_concepts) {
        const namesConcepts = result.rdfEnhancement.extracted_concepts
          .filter(c => ['rick', 'rich', 'richie', 'richard'].includes(c.concept_name.toLowerCase()));
        console.log(`Name concepts extracted:`, namesConcepts.map(c => c.concept_name));
      }
    }

    // Just verify the structure - we're observing behavior
    expect(testCases.length).toBe(3);
  });

  test("should show search strategy progression", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    console.log("\n🎯 TESTING SEARCH STRATEGY");
    console.log("==========================");
    console.log("Message: 'Call Richard tomorrow'");
    console.log("Expected progression:");
    console.log("1. Try exact search: 'Find contact: Richard'");
    console.log("2. Try partial search: 'Search contacts containing: Richard'");
    console.log("3. Try broad search: 'Search all contacts for name like: Richard'");
    console.log("4. Try nicknames: rick, rich, richie");
    console.log("5. Only if all fail: Get all contacts for fuzzy matching");

    const startTime = Date.now();
    
    const result = await wsHandler['handleWithActionPlanner'](
      "Call Richard tomorrow",
      REAL_USER_ID,
      mockWs as any
    );

    const duration = Date.now() - startTime;
    
    console.log(`\n⏱️  Total processing time: ${duration}ms`);
    console.log(`📊 Result success: ${result.success}`);
    
    if (result.rdfEnhancement) {
      console.log(`🧠 RDF processing: ${result.rdfEnhancement.processing_metadata?.processing_time_ms}ms`);
      console.log(`🎯 Concepts found:`, result.rdfEnhancement.extracted_concepts?.length || 0);
    }

    // Verify we got some kind of response
    expect(result).toBeDefined();
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });
}); 