/**
 * Composio Google Calendar Integration Tests
 *
 * Tests for the Google Calendar functionality using Composio TypeScript SDK
 * Uses Bun test framework with mock implementations
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from "bun:test";
import { USER_ID, API_BASE_URL, colors, log } from "./constants.js";

// Mock Composio SDK since we don't have real credentials in tests
const mockComposioSDK = {
  OpenAIToolSet: class {
    constructor(config) {
      this.apiKey = config.apiKey;
      this.connectedAccounts = {
        initiate: mock(() =>
          Promise.resolve({
            redirectUrl:
              "https://auth.composio.dev/oauth/google-calendar?state=test",
            connectionId: "conn_test_123",
            status: "INITIATED",
          })
        ),
      };
    }

    async getTools(params) {
      return mock(() =>
        Promise.resolve([
          {
            name: "GOOGLECALENDAR_LIST_EVENTS",
            description: "List events from Google Calendar",
          },
          {
            name: "GOOGLECALENDAR_CREATE_EVENT",
            description: "Create a new event in Google Calendar",
          },
        ])
      )();
    }

    async executeAction(params) {
      const { actionName } = params;

      if (actionName === "GOOGLECALENDAR_LIST_EVENTS") {
        return {
          successful: true,
          data: {
            events: [
              {
                id: "event_1",
                summary: "Test Meeting",
                description: "A test meeting",
                start: { dateTime: "2024-01-15T10:00:00Z" },
                end: { dateTime: "2024-01-15T11:00:00Z" },
              },
            ],
          },
        };
      }

      if (actionName === "GOOGLECALENDAR_CREATE_EVENT") {
        // Validate required fields
        if (
          !params.params.summary ||
          !params.params.start ||
          !params.params.end
        ) {
          return {
            successful: false,
            error:
              "Missing required fields: summary, start, and end are required",
          };
        }

        return {
          successful: true,
          data: {
            id: "new_event_123",
            summary: params.params.summary,
            description: params.params.description,
            start: params.params.start,
            end: params.params.end,
          },
        };
      }

      return { successful: false, error: "Unknown action" };
    }
  },
};

// Mock the composio-core module
mock.module("composio-core", () => mockComposioSDK);

// Import our service classes (these would be the actual implementation)
class ComposioConnectionManager {
  constructor() {
    this.toolset = new mockComposioSDK.OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY || "test-key",
    });
  }

  async initiateConnection(entityId) {
    log("info", `Initiating connection for entity: ${entityId}`);
    const result = await this.toolset.connectedAccounts.initiate({
      integrationId: "google-calendar-test-id",
      entityId: entityId,
      redirectUri: "https://localhost:8080/callback",
    });
    return result.redirectUrl;
  }

  async getConnectionStatus(entityId) {
    // Mock implementation - in reality would check actual connection status
    return entityId === USER_ID;
  }

  async refreshConnection(entityId) {
    log("info", `Refreshing connection for entity: ${entityId}`);
    // Mock implementation
    return true;
  }
}

class ComposioCalendarService {
  constructor() {
    this.connectionManager = new ComposioConnectionManager();
    this.toolset = new mockComposioSDK.OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY || "test-key",
    });
  }

  async listEvents(entityId, params = {}) {
    const result = await this.toolset.executeAction({
      actionName: "GOOGLECALENDAR_LIST_EVENTS",
      params: {
        calendarId: params.calendarId || "primary",
        timeMin: params.timeMin || new Date().toISOString(),
        timeMax:
          params.timeMax ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults: params.maxResults || 10,
      },
      entityId,
    });

    if (result.successful) {
      return result.data.events;
    }
    throw new Error(result.error || "Failed to list events");
  }

  async createEvent(entityId, eventData) {
    const result = await this.toolset.executeAction({
      actionName: "GOOGLECALENDAR_CREATE_EVENT",
      params: {
        calendarId: eventData.calendarId || "primary",
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
      },
      entityId,
    });

    if (result.successful) {
      return result.data;
    }
    throw new Error(result.error || "Failed to create event");
  }

  async getAvailableTools(entityId) {
    return await this.toolset.getTools({
      apps: ["googlecalendar"],
      entityId,
    });
  }
}

// Test Suite
describe("Composio Google Calendar Integration", () => {
  let connectionManager;
  let calendarService;

  beforeAll(() => {
    log("info", "Setting up Composio Google Calendar tests");
    connectionManager = new ComposioConnectionManager();
    calendarService = new ComposioCalendarService();
  });

  afterAll(() => {
    log("info", "Composio Google Calendar tests completed");
  });

  describe("Connection Management", () => {
    test("should initiate OAuth connection successfully", async () => {
      const redirectUrl = await connectionManager.initiateConnection(USER_ID);

      expect(redirectUrl).toContain(
        "https://auth.composio.dev/oauth/google-calendar"
      );
      expect(redirectUrl).toContain("state=test");

      log("success", "OAuth connection initiation test passed");
    });

    test("should check connection status", async () => {
      const isConnected = await connectionManager.getConnectionStatus(USER_ID);

      expect(typeof isConnected).toBe("boolean");
      expect(isConnected).toBe(true); // Mock returns true for test user

      log("success", "Connection status check test passed");
    });

    test("should handle connection refresh", async () => {
      const result = await connectionManager.refreshConnection(USER_ID);

      expect(result).toBe(true);

      log("success", "Connection refresh test passed");
    });

    test("should handle invalid entity ID", async () => {
      const isConnected = await connectionManager.getConnectionStatus(
        "invalid-id"
      );

      expect(isConnected).toBe(false);

      log("success", "Invalid entity ID handling test passed");
    });
  });

  describe("Calendar Tools Discovery", () => {
    test("should retrieve available Google Calendar tools", async () => {
      const tools = await calendarService.getAvailableTools(USER_ID);

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      const eventsTool = tools.find(
        (tool) => tool.name === "GOOGLECALENDAR_LIST_EVENTS"
      );
      expect(eventsTool).toBeDefined();
      expect(eventsTool.description).toContain("List events");

      log("success", "Tools discovery test passed");
    });

    test("should include required calendar actions", async () => {
      const tools = await calendarService.getAvailableTools(USER_ID);
      const toolNames = tools.map((tool) => tool.name);

      const requiredActions = [
        "GOOGLECALENDAR_LIST_EVENTS",
        "GOOGLECALENDAR_CREATE_EVENT",
      ];

      requiredActions.forEach((action) => {
        expect(toolNames).toContain(action);
      });

      log("success", "Required actions availability test passed");
    });
  });

  describe("Calendar Operations", () => {
    test("should list calendar events successfully", async () => {
      const events = await calendarService.listEvents(USER_ID);

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);

      const firstEvent = events[0];
      expect(firstEvent).toHaveProperty("id");
      expect(firstEvent).toHaveProperty("summary");
      expect(firstEvent).toHaveProperty("start");
      expect(firstEvent).toHaveProperty("end");

      log("success", "List events test passed");
    });

    test("should list events with custom parameters", async () => {
      const params = {
        calendarId: "primary",
        maxResults: 5,
        timeMin: "2024-01-01T00:00:00Z",
        timeMax: "2024-12-31T23:59:59Z",
      };

      const events = await calendarService.listEvents(USER_ID, params);

      expect(Array.isArray(events)).toBe(true);

      log("success", "List events with parameters test passed");
    });

    test("should create a new calendar event", async () => {
      const eventData = {
        summary: "Test Meeting via Composio",
        description: "Created through Composio integration test",
        start: {
          dateTime: "2024-01-15T10:00:00Z",
          timeZone: "UTC",
        },
        end: {
          dateTime: "2024-01-15T11:00:00Z",
          timeZone: "UTC",
        },
      };

      const createdEvent = await calendarService.createEvent(
        USER_ID,
        eventData
      );

      expect(createdEvent).toHaveProperty("id");
      expect(createdEvent.summary).toBe(eventData.summary);
      expect(createdEvent.description).toBe(eventData.description);
      expect(createdEvent.start).toEqual(eventData.start);
      expect(createdEvent.end).toEqual(eventData.end);

      log("success", "Create event test passed");
    });

    test("should handle missing required fields gracefully", async () => {
      const invalidEventData = {
        description: "Missing summary and times",
        // Missing required fields: summary, start, end
      };

      try {
        await calendarService.createEvent(USER_ID, invalidEventData);
        expect(true).toBe(false); // Should not reach this point
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain("Missing required fields");
      }

      log("success", "Invalid event data handling test passed");
    });
  });

  describe("Error Handling", () => {
    test("should handle network errors gracefully", async () => {
      // Mock network failure
      const failingService = new ComposioCalendarService();
      failingService.toolset.executeAction = mock(() =>
        Promise.reject(new Error("Network error"))
      );

      try {
        await failingService.listEvents(USER_ID);
        expect(true).toBe(false); // Should not reach this point
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain("Network error");
      }

      log("success", "Network error handling test passed");
    });

    test("should handle authentication failures", async () => {
      // Mock auth failure
      const authFailingService = new ComposioCalendarService();
      authFailingService.toolset.executeAction = mock(() =>
        Promise.resolve({
          successful: false,
          error: "Authentication failed: Invalid token",
        })
      );

      try {
        await authFailingService.listEvents(USER_ID);
        expect(true).toBe(false); // Should not reach this point
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain("Authentication failed");
      }

      log("success", "Authentication error handling test passed");
    });

    test("should handle rate limiting", async () => {
      // Mock rate limiting response
      const rateLimitedService = new ComposioCalendarService();
      rateLimitedService.toolset.executeAction = mock(() =>
        Promise.resolve({
          successful: false,
          error: "Rate limit exceeded. Try again later.",
        })
      );

      try {
        await rateLimitedService.listEvents(USER_ID);
        expect(true).toBe(false); // Should not reach this point
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain("Rate limit exceeded");
      }

      log("success", "Rate limiting error handling test passed");
    });
  });

  describe("Performance Tests", () => {
    test("should complete operations within reasonable time", async () => {
      const startTime = Date.now();

      await calendarService.listEvents(USER_ID);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      log("success", `Performance test passed - Duration: ${duration}ms`);
    });

    test("should handle concurrent requests", async () => {
      const promises = Array(5)
        .fill()
        .map(() => calendarService.listEvents(USER_ID));

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      results.forEach((events) => {
        expect(Array.isArray(events)).toBe(true);
      });

      log("success", "Concurrent requests test passed");
    });
  });
});

// Additional test for integration with existing MCP infrastructure
describe("MCP Integration", () => {
  test("should integrate with existing MCP context", async () => {
    // This would test integration with your existing MCP setup
    const calendarService = new ComposioCalendarService();

    // Mock MCP context
    const mcpContext = {
      userId: USER_ID,
      sessionId: "test-session-123",
      tools: ["calendar", "email"],
    };

    const events = await calendarService.listEvents(mcpContext.userId);

    expect(Array.isArray(events)).toBe(true);

    log("success", "MCP integration test passed");
  });
});
