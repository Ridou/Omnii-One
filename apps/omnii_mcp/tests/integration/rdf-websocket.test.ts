import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { WebSocketHandlerService } from "../../src/services/websocket-handler.service";
import { rdfServiceClient } from "../../src/services/rdf-client";
import { RDF_ACTION_TYPES } from "@omnii/validators";

describe("WebSocketHandler RDF Integration", () => {
  let handler: WebSocketHandlerService;
  let mockWebSocket: any;
  
  beforeAll(() => {
    handler = new WebSocketHandlerService();
    mockWebSocket = { 
      send: () => {},  // Simple mock function
      readyState: 1, 
      id: 'test-ws' 
    };
  });

  test("should integrate RDF service into WebSocketHandler", () => {
    // Check that the WebSocket handler has RDF service integration
    expect(handler['rdfService']).toBeDefined();
    expect(typeof handler['rdfService'].processHumanInputToOmniiMCP).toBe('function');
  });

  test("should process vague input with RDF enhancement", async () => {
    const vagueInput = "I should probably call papi about dinner plans";
    
    const result = await handler.processMessage({
      type: 'command',
      payload: {
        userId: 'test-user',
        message: vagueInput,
        commandType: 'chat'
      }
    }, mockWebSocket);
    
    expect(result.success).toBe(true);
    expect(result.data?.structured?.rdf_enhancement).toBeDefined();
    expect(result.data.structured.rdf_enhancement.reasoning_applied).toBe(true);
  });

  test("should enhance context with RDF insights", async () => {
    const input = "The team needs to know about the update";
    
    const result = await handler.processMessage({
      type: 'command',
      payload: { userId: 'test-user', message: input }
    }, mockWebSocket);
    
    expect(result.data?.structured?.rdf_enhancement?.extracted_concepts).toBeDefined();
    expect(result.data.structured.rdf_enhancement.intent_analysis).toBeDefined();
  });

  test("should fallback gracefully when RDF fails", async () => {
    // Mock RDF service failure
    const originalRDFService = handler['rdfService'];
    handler['rdfService'] = { 
      processHumanInputToOmniiMCP: () => { throw new Error('RDF failed'); }
    };
    
    const result = await handler.processMessage({
      type: 'command',
      payload: { userId: 'test-user', message: "Test message" }
    }, mockWebSocket);
    
    expect(result.success).toBe(true); // Should still succeed
    expect(result.data?.structured?.rdf_enhancement?.reasoning_applied).toBe(false);
    
    // Restore
    handler['rdfService'] = originalRDFService;
  });

  test("should include RDF processing time in metadata", async () => {
    const result = await handler.processMessage({
      type: 'command',
      payload: { userId: 'test-user', message: "Schedule a meeting" }
    }, mockWebSocket);
    
    expect(result.data?.structured?.rdf_enhancement?.processing_metadata).toBeDefined();
    expect(result.data.structured.rdf_enhancement.processing_metadata.processing_time_ms).toBeGreaterThan(0);
  });

  test("should preserve existing functionality when RDF is disabled", async () => {
    // Test that we can disable RDF processing
    const originalRDFService = handler['rdfService'];
    handler['rdfService'] = null;
    
    const result = await handler.processMessage({
      type: 'command',
      payload: { userId: 'test-user', message: "Hello there" } // Use simple message that won't trigger intervention
    }, mockWebSocket);
    
    expect(result.success).toBe(true);
    // Should not have RDF enhancement but still work
    expect(result.data?.structured?.rdf_enhancement).toBeUndefined();
    
    // Restore
    handler['rdfService'] = originalRDFService;
  });
}); 