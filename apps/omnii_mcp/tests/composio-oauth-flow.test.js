/**
 * Composio OAuth Flow End-to-End Tests
 *
 * Tests the complete OAuth authentication flow from initiation to completion
 * Simulates user interactions and callback handling
 */

import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { USER_ID, colors, log } from "./constants.js";

// Mock OAuth flow states and responses
const mockOAuthFlow = {
  states: {
    initiated: "oauth_state_abc123",
    completed: "oauth_state_abc123_completed",
  },

  responses: {
    initiate: {
      redirectUrl:
        "https://accounts.google.com/oauth/authorize?client_id=test&redirect_uri=https://auth.composio.dev/callback&scope=calendar&state=oauth_state_abc123",
      connectionId: "conn_oauth_123",
      status: "INITIATED",
      state: "oauth_state_abc123",
    },

    callback: {
      code: "oauth_authorization_code_xyz",
      state: "oauth_state_abc123",
      scope: "https://www.googleapis.com/auth/calendar",
    },

    tokenExchange: {
      access_token: "ya29.mock_access_token",
      refresh_token: "mock_refresh_token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "https://www.googleapis.com/auth/calendar",
    },

    connectionActive: {
      id: "conn_oauth_123",
      status: "ACTIVE",
      entityId: USER_ID,
      integrationId: "google-calendar-integration",
      tokenInfo: {
        hasValidToken: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    },
  },
};

// Mock Composio SDK for OAuth flow testing
const mockComposioOAuthSDK = {
  OpenAIToolSet: class {
    constructor(config) {
      this.apiKey = config.apiKey;
      this.connectedAccounts = {
        initiate: mock(async (params) => {
          // Simulate OAuth initiation
          await new Promise((resolve) => setTimeout(resolve, 50));
          return mockOAuthFlow.responses.initiate;
        }),

        waitUntilActive: mock(async (connectionId, timeout = 180) => {
          // Simulate OAuth completion delay
          await new Promise((resolve) => setTimeout(resolve, 200));

          if (connectionId === "timeout-connection") {
            throw new Error("Connection timeout after 180 seconds");
          }

          if (connectionId === "user-cancelled") {
            throw new Error("User cancelled OAuth flow");
          }

          return mockOAuthFlow.responses.connectionActive;
        }),

        handleCallback: mock(async (callbackData) => {
          // Simulate callback processing
          if (callbackData.error) {
            throw new Error(`OAuth error: ${callbackData.error}`);
          }

          if (callbackData.state !== mockOAuthFlow.states.initiated) {
            throw new Error("Invalid OAuth state parameter");
          }

          return {
            success: true,
            connectionId: "conn_oauth_123",
            status: "PROCESSING",
          };
        }),
      };
    }

    async executeAction(params) {
      // Mock calendar API calls after OAuth success
      if (params.actionName === "GOOGLECALENDAR_GET_PROFILE") {
        return {
          successful: true,
          data: {
            email: "test@example.com",
            name: "Test User",
            timezone: "America/New_York",
          },
        };
      }

      return { successful: false, error: "Action not implemented in mock" };
    }
  },
};

// Mock the module
mock.module("composio-core", () => mockComposioOAuthSDK);

// OAuth Flow Manager implementation
class ComposioOAuthFlowManager {
  constructor() {
    this.toolset = new mockComposioOAuthSDK.OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY || "test-api-key",
    });
    this.integrationId =
      process.env.GOOGLE_CALENDAR_INTEGRATION_ID || "test-integration-id";
    this.activeFlows = new Map(); // Track active OAuth flows
  }

  async startOAuthFlow(entityId, options = {}) {
    try {
      const connectionRequest = await this.toolset.connectedAccounts.initiate({
        integrationId: this.integrationId,
        entityId: entityId,
        redirectUri:
          options.redirectUri ||
          `${process.env.BASE_URL || "http://localhost:8080"}/oauth/callback`,
        scopes: options.scopes || ["calendar"],
      });

      // Store flow state for tracking
      this.activeFlows.set(entityId, {
        connectionId: connectionRequest.connectionId,
        state: connectionRequest.state,
        startedAt: new Date(),
        status: "INITIATED",
      });

      return connectionRequest;
    } catch (error) {
      throw new Error(`Failed to start OAuth flow: ${error.message}`);
    }
  }

  async handleOAuthCallback(callbackData) {
    try {
      const result = await this.toolset.connectedAccounts.handleCallback(
        callbackData
      );

      // Update flow state
      const entityId = this.findEntityByState(callbackData.state);
      if (entityId && this.activeFlows.has(entityId)) {
        const flow = this.activeFlows.get(entityId);
        flow.status = "PROCESSING";
        flow.callbackReceivedAt = new Date();
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to handle OAuth callback: ${error.message}`);
    }
  }

  async waitForOAuthCompletion(entityId, timeout = 180) {
    try {
      const flow = this.activeFlows.get(entityId);
      if (!flow) {
        throw new Error("No active OAuth flow found for entity");
      }

      const activeConnection =
        await this.toolset.connectedAccounts.waitUntilActive(
          flow.connectionId,
          timeout
        );

      // Update flow state
      flow.status = "COMPLETED";
      flow.completedAt = new Date();

      // Clean up completed flow
      this.activeFlows.delete(entityId);

      return activeConnection;
    } catch (error) {
      // Clean up failed flow
      this.activeFlows.delete(entityId);
      throw new Error(`OAuth flow completion failed: ${error.message}`);
    }
  }

  async testConnectionAfterOAuth(entityId) {
    try {
      const result = await this.toolset.executeAction({
        actionName: "GOOGLECALENDAR_GET_PROFILE",
        params: {},
        entityId: entityId,
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to test connection: ${error.message}`);
    }
  }

  getFlowStatus(entityId) {
    return this.activeFlows.get(entityId) || null;
  }

  findEntityByState(state) {
    for (const [entityId, flow] of this.activeFlows.entries()) {
      if (flow.state === state) {
        return entityId;
      }
    }
    return null;
  }

  getActiveFlows() {
    return Array.from(this.activeFlows.entries()).map(([entityId, flow]) => ({
      entityId,
      ...flow,
    }));
  }
}

// Test Suite
describe("Composio OAuth Flow End-to-End", () => {
  let oauthManager;

  beforeAll(() => {
    log("info", "Setting up Composio OAuth Flow tests");
    oauthManager = new ComposioOAuthFlowManager();
  });

  afterAll(() => {
    log("info", "Composio OAuth Flow tests completed");
  });

  describe("OAuth Flow Initiation", () => {
    test("should start OAuth flow successfully", async () => {
      const result = await oauthManager.startOAuthFlow(USER_ID);

      expect(result).toHaveProperty("redirectUrl");
      expect(result).toHaveProperty("connectionId");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("INITIATED");
      expect(result.redirectUrl).toContain(
        "https://accounts.google.com/oauth/authorize"
      );

      // Check flow tracking
      const flowStatus = oauthManager.getFlowStatus(USER_ID);
      expect(flowStatus).toBeDefined();
      expect(flowStatus.status).toBe("INITIATED");

      log("success", "OAuth flow initiation test passed");
    });

    test("should include correct OAuth parameters in redirect URL", async () => {
      const result = await oauthManager.startOAuthFlow(USER_ID);
      const url = new URL(result.redirectUrl);

      expect(url.searchParams.get("client_id")).toBeDefined();
      expect(url.searchParams.get("redirect_uri")).toContain(
        "auth.composio.dev/callback"
      );
      expect(url.searchParams.get("scope")).toContain("calendar");
      expect(url.searchParams.get("state")).toBeDefined();

      log("success", "OAuth parameters validation test passed");
    });

    test("should handle custom redirect URI", async () => {
      const customRedirectUri = "https://myapp.com/oauth/callback";
      const result = await oauthManager.startOAuthFlow(USER_ID, {
        redirectUri: customRedirectUri,
      });

      expect(result.redirectUrl).toBeDefined();

      log("success", "Custom redirect URI test passed");
    });

    test("should handle custom scopes", async () => {
      const customScopes = ["calendar", "calendar.events"];
      const result = await oauthManager.startOAuthFlow(USER_ID, {
        scopes: customScopes,
      });

      expect(result.redirectUrl).toBeDefined();

      log("success", "Custom scopes test passed");
    });
  });

  describe("OAuth Callback Handling", () => {
    test("should handle successful OAuth callback", async () => {
      // First start the flow
      await oauthManager.startOAuthFlow(USER_ID);

      // Simulate callback
      const callbackData = {
        code: mockOAuthFlow.responses.callback.code,
        state: mockOAuthFlow.states.initiated,
        scope: mockOAuthFlow.responses.callback.scope,
      };

      const result = await oauthManager.handleOAuthCallback(callbackData);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("connectionId");
      expect(result.success).toBe(true);

      // Check flow state update
      const flowStatus = oauthManager.getFlowStatus(USER_ID);
      expect(flowStatus.status).toBe("PROCESSING");

      log("success", "OAuth callback handling test passed");
    });

    test("should reject callback with invalid state", async () => {
      await oauthManager.startOAuthFlow(USER_ID);

      const invalidCallbackData = {
        code: "valid_code",
        state: "invalid_state_parameter",
        scope: "calendar",
      };

      try {
        await oauthManager.handleOAuthCallback(invalidCallbackData);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Invalid OAuth state parameter");
      }

      log("success", "Invalid state rejection test passed");
    });

    test("should handle OAuth errors in callback", async () => {
      await oauthManager.startOAuthFlow(USER_ID);

      const errorCallbackData = {
        error: "access_denied",
        error_description: "User denied access",
        state: mockOAuthFlow.states.initiated,
      };

      try {
        await oauthManager.handleOAuthCallback(errorCallbackData);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("OAuth error: access_denied");
      }

      log("success", "OAuth error handling test passed");
    });
  });

  describe("OAuth Flow Completion", () => {
    test("should complete OAuth flow successfully", async () => {
      // Start flow
      await oauthManager.startOAuthFlow(USER_ID);

      // Handle callback
      await oauthManager.handleOAuthCallback({
        code: mockOAuthFlow.responses.callback.code,
        state: mockOAuthFlow.states.initiated,
        scope: mockOAuthFlow.responses.callback.scope,
      });

      // Wait for completion
      const activeConnection = await oauthManager.waitForOAuthCompletion(
        USER_ID
      );

      expect(activeConnection).toHaveProperty("id");
      expect(activeConnection).toHaveProperty("status");
      expect(activeConnection.status).toBe("ACTIVE");
      expect(activeConnection.entityId).toBe(USER_ID);

      // Flow should be cleaned up
      const flowStatus = oauthManager.getFlowStatus(USER_ID);
      expect(flowStatus).toBeNull();

      log("success", "OAuth flow completion test passed");
    });

    test("should handle completion timeout", async () => {
      // Start a flow that will timeout
      await oauthManager.startOAuthFlow("timeout-user");

      try {
        // Use a connection ID that triggers timeout
        oauthManager.activeFlows.set("timeout-user", {
          connectionId: "timeout-connection",
          state: "test-state",
          startedAt: new Date(),
          status: "INITIATED",
        });

        await oauthManager.waitForOAuthCompletion("timeout-user", 1); // 1 second timeout
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("OAuth flow completion failed");
      }

      // Flow should be cleaned up even on failure
      const flowStatus = oauthManager.getFlowStatus("timeout-user");
      expect(flowStatus).toBeNull();

      log("success", "OAuth timeout handling test passed");
    });

    test("should handle user cancellation", async () => {
      await oauthManager.startOAuthFlow("cancelled-user");

      try {
        oauthManager.activeFlows.set("cancelled-user", {
          connectionId: "user-cancelled",
          state: "test-state",
          startedAt: new Date(),
          status: "INITIATED",
        });

        await oauthManager.waitForOAuthCompletion("cancelled-user");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("User cancelled OAuth flow");
      }

      log("success", "User cancellation handling test passed");
    });
  });

  describe("Post-OAuth Connection Testing", () => {
    test("should test connection after successful OAuth", async () => {
      // Complete OAuth flow first
      await oauthManager.startOAuthFlow(USER_ID);
      await oauthManager.handleOAuthCallback({
        code: mockOAuthFlow.responses.callback.code,
        state: mockOAuthFlow.states.initiated,
        scope: mockOAuthFlow.responses.callback.scope,
      });
      await oauthManager.waitForOAuthCompletion(USER_ID);

      // Test the connection
      const testResult = await oauthManager.testConnectionAfterOAuth(USER_ID);

      expect(testResult.successful).toBe(true);
      expect(testResult.data).toHaveProperty("email");
      expect(testResult.data).toHaveProperty("name");
      expect(testResult.data.email).toBe("test@example.com");

      log("success", "Post-OAuth connection test passed");
    });

    test("should handle connection test failures", async () => {
      // Mock a failed connection test
      const failingManager = new ComposioOAuthFlowManager();
      failingManager.toolset.executeAction = mock(() =>
        Promise.resolve({ successful: false, error: "Invalid credentials" })
      );

      try {
        await failingManager.testConnectionAfterOAuth(USER_ID);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Failed to test connection");
      }

      log("success", "Connection test failure handling test passed");
    });
  });

  describe("Flow State Management", () => {
    test("should track multiple concurrent OAuth flows", async () => {
      const user1 = "user_1";
      const user2 = "user_2";

      // Start flows for multiple users
      await oauthManager.startOAuthFlow(user1);
      await oauthManager.startOAuthFlow(user2);

      const activeFlows = oauthManager.getActiveFlows();
      expect(activeFlows.length).toBe(2);

      const user1Flow = activeFlows.find((flow) => flow.entityId === user1);
      const user2Flow = activeFlows.find((flow) => flow.entityId === user2);

      expect(user1Flow).toBeDefined();
      expect(user2Flow).toBeDefined();
      expect(user1Flow.status).toBe("INITIATED");
      expect(user2Flow.status).toBe("INITIATED");

      log("success", "Multiple concurrent flows test passed");
    });

    test("should find entity by OAuth state", async () => {
      await oauthManager.startOAuthFlow(USER_ID);

      const foundEntity = oauthManager.findEntityByState(
        mockOAuthFlow.states.initiated
      );
      expect(foundEntity).toBe(USER_ID);

      const notFoundEntity = oauthManager.findEntityByState("invalid-state");
      expect(notFoundEntity).toBeNull();

      log("success", "Entity lookup by state test passed");
    });

    test("should handle flow without prior initiation", async () => {
      try {
        await oauthManager.waitForOAuthCompletion("non-existent-user");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain(
          "No active OAuth flow found for entity"
        );
      }

      log("success", "Missing flow handling test passed");
    });
  });

  describe("OAuth Flow Timing and Performance", () => {
    test("should complete OAuth flow within reasonable time", async () => {
      const startTime = Date.now();

      await oauthManager.startOAuthFlow(USER_ID);
      await oauthManager.handleOAuthCallback({
        code: mockOAuthFlow.responses.callback.code,
        state: mockOAuthFlow.states.initiated,
        scope: mockOAuthFlow.responses.callback.scope,
      });
      await oauthManager.waitForOAuthCompletion(USER_ID);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      log("success", `OAuth flow timing test passed - Duration: ${duration}ms`);
    });

    test("should handle rapid successive OAuth attempts", async () => {
      const attempts = Array(3)
        .fill()
        .map(async (_, index) => {
          const entityId = `rapid_user_${index}`;
          await oauthManager.startOAuthFlow(entityId);
          return entityId;
        });

      const results = await Promise.all(attempts);
      expect(results.length).toBe(3);

      const activeFlows = oauthManager.getActiveFlows();
      expect(activeFlows.length).toBe(3);

      log("success", "Rapid successive attempts test passed");
    });
  });
});
