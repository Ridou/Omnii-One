import { describe, test, expect, beforeAll } from "bun:test";
import { WebSocketHandlerService } from "../../src/services/websocket-handler.service";

describe("WebSocket RDF Fallback & Resilience", () => {
  let wsHandler: WebSocketHandlerService;
  const REAL_USER_ID = "cd9bdc60-35af-4bb6-b87e-1932e96fb354"; // Richard's real UUID
  
  beforeAll(() => {
    // Create WebSocketHandlerService with RDF integration
    wsHandler = new WebSocketHandlerService();
  });

  test("should fallback gracefully when RDF fails for WebSocket", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    // Mock RDF failure
    const originalMethod = wsHandler['rdfService']?.processHumanInputToOmniiMCP;
    if (wsHandler['rdfService']) {
      wsHandler['rdfService'].processHumanInputToOmniiMCP = () => {
        throw new Error("RDF failed");
      };
    }
    
    const result = await wsHandler['handleWithActionPlanner'](
      "Test message",
      REAL_USER_ID,
      mockWs as any
    );
    
    expect(result.success).toBe(true); // Should still succeed
    expect(result.rdfEnhancement?.reasoning_applied).toBe(false);
    
    // Restore original method
    if (wsHandler['rdfService'] && originalMethod) {
      wsHandler['rdfService'].processHumanInputToOmniiMCP = originalMethod;
    }
  });

  test("should preserve existing WebSocket functionality when RDF is disabled", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    // Test that we can disable RDF processing
    const originalRDFService = wsHandler['rdfService'];
    wsHandler['rdfService'] = null;
    
    const result = await wsHandler['handleWithActionPlanner'](
      "Hello there",
      REAL_USER_ID,
      mockWs as any
    );
    
    expect(result.success).toBe(true);
    // Should not have RDF enhancement but still work
    expect(result.rdfEnhancement).toBeUndefined();
    
    // Restore
    wsHandler['rdfService'] = originalRDFService;
  });

  test("should handle empty messages gracefully", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    const result = await wsHandler['handleWithActionPlanner'](
      "",
      REAL_USER_ID,
      mockWs as any
    );

    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });

  test("should handle very long messages without breaking", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    const longMessage = "This is a very long message that tests the system's ability to handle extensive input without breaking or causing performance issues. ".repeat(10);

    const result = await wsHandler['handleWithActionPlanner'](
      longMessage,
      REAL_USER_ID,
      mockWs as any
    );

    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });
}); 