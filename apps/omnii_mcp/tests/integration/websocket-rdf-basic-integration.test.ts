import { describe, test, expect, beforeAll } from "bun:test";
import { WebSocketHandlerService } from "../../src/services/websocket-handler.service";

describe("WebSocket RDF Basic Integration", () => {
  let wsHandler: WebSocketHandlerService;
  const REAL_USER_ID = "cd9bdc60-35af-4bb6-b87e-1932e96fb354"; // Richard's real UUID
  
  beforeAll(() => {
    // Create WebSocketHandlerService with RDF integration
    wsHandler = new WebSocketHandlerService();
  });

  test("should have RDF service integrated into WebSocketHandlerService", () => {
    expect(wsHandler['rdfService']).toBeDefined();
    expect(typeof wsHandler['rdfService'].processHumanInputToOmniiMCP).toBe('function');
  });

  test("should process basic message successfully", async () => {
    const mockWs = {
      send: () => {},
      readyState: 1
    };

    const result = await wsHandler['handleWithActionPlanner'](
      "Hello world",
      REAL_USER_ID,
      mockWs as any
    );

    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });
}); 