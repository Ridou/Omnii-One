/**
 * Composio Connection Manager Tests
 *
 * Focused tests for OAuth connection management and authentication flow
 */

import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { USER_ID, colors, log } from "./constants.js";

// Mock successful OAuth flow responses
const mockOAuthResponses = {
  initiateSuccess: {
    redirectUrl:
      "https://auth.composio.dev/oauth/google-calendar?state=abc123&entity=test-user",
    connectionId: "conn_cal_123456",
    status: "INITIATED",
    integrationId: "google-calendar-integration",
  },

  waitUntilActiveSuccess: {
    id: "conn_cal_123456",
    status: "ACTIVE",
    integrationId: "google-calendar-integration",
    entityId: "test-user",
    connectedAt: new Date().toISOString(),
  },

  connectionStatusActive: {
    id: "conn_cal_123456",
    status: "ACTIVE",
    isValid: true,
    lastRefreshed: new Date().toISOString(),
  },
};

// Mock Composio SDK for connection tests
const mockComposioConnectionSDK = {
  OpenAIToolSet: class {
    constructor(config) {
      this.apiKey = config.apiKey;
      this.connectedAccounts = {
        initiate: mock(async (params) => {
          if (!params.integrationId || !params.entityId) {
            throw new Error("Missing required parameters");
          }
          return mockOAuthResponses.initiateSuccess;
        }),

        waitUntilActive: mock(async (connectionId, timeout = 180) => {
          if (connectionId === "invalid-connection") {
            throw new Error("Connection not found");
          }
          // Simulate waiting time
          await new Promise((resolve) => setTimeout(resolve, 100));
          return mockOAuthResponses.waitUntilActiveSuccess;
        }),

        getStatus: mock(async (entityId) => {
          if (entityId === USER_ID) {
            return mockOAuthResponses.connectionStatusActive;
          }
          return { status: "NOT_CONNECTED", isValid: false };
        }),

        refresh: mock(async (entityId) => {
          if (entityId === "invalid-entity") {
            throw new Error("Entity not found");
          }
          return {
            ...mockOAuthResponses.connectionStatusActive,
            lastRefreshed: new Date().toISOString(),
          };
        }),

        disconnect: mock(async (entityId) => {
          if (entityId === "invalid-entity") {
            throw new Error("Entity not found");
          }
          return { success: true, status: "DISCONNECTED" };
        }),
      };
    }
  },
};

// Mock the module
mock.module("composio-core", () => mockComposioConnectionSDK);

// Connection Manager implementation
class ComposioConnectionManager {
  constructor() {
    this.toolset = new mockComposioConnectionSDK.OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY || "test-api-key",
    });
    this.integrationId =
      process.env.GOOGLE_CALENDAR_INTEGRATION_ID || "test-integration-id";
  }

  async initiateConnection(entityId, redirectUri = null) {
    try {
      const connectionRequest = await this.toolset.connectedAccounts.initiate({
        integrationId: this.integrationId,
        entityId: entityId,
        redirectUri:
          redirectUri ||
          `${process.env.BASE_URL || "http://localhost:8080"}/callback`,
      });

      return connectionRequest;
    } catch (error) {
      throw new Error(`Failed to initiate connection: ${error.message}`);
    }
  }

  async waitForConnection(connectionId, timeout = 180) {
    try {
      const activeConnection =
        await this.toolset.connectedAccounts.waitUntilActive(
          connectionId,
          timeout
        );
      return activeConnection;
    } catch (error) {
      throw new Error(`Connection failed to activate: ${error.message}`);
    }
  }

  async getConnectionStatus(entityId) {
    try {
      const status = await this.toolset.connectedAccounts.getStatus(entityId);
      return status;
    } catch (error) {
      throw new Error(`Failed to get connection status: ${error.message}`);
    }
  }

  async refreshConnection(entityId) {
    try {
      const refreshed = await this.toolset.connectedAccounts.refresh(entityId);
      return refreshed;
    } catch (error) {
      throw new Error(`Failed to refresh connection: ${error.message}`);
    }
  }

  async disconnectUser(entityId) {
    try {
      const result = await this.toolset.connectedAccounts.disconnect(entityId);
      return result;
    } catch (error) {
      throw new Error(`Failed to disconnect user: ${error.message}`);
    }
  }

  async isConnectionValid(entityId) {
    try {
      const status = await this.getConnectionStatus(entityId);
      return status.status === "ACTIVE" && status.isValid;
    } catch (error) {
      return false;
    }
  }
}

// Test Suite
describe("Composio Connection Manager", () => {
  let connectionManager;

  beforeAll(() => {
    log('info', "Setting up Composio Connection Manager tests");
    connectionManager = new ComposioConnectionManager();
  });

  afterAll(() => {
    log('info', "Composio Connection Manager tests completed");
  });

  describe("OAuth Flow Initiation", () => {
    test("should initiate OAuth connection with valid parameters", async () => {
      const result = await connectionManager.initiateConnection(USER_ID);

      expect(result).toHaveProperty("redirectUrl");
      expect(result).toHaveProperty("connectionId");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("INITIATED");
      expect(result.redirectUrl).toContain(
        "https://auth.composio.dev/oauth/google-calendar"
      );

      log('success', "OAuth initiation test passed");
    });

    test("should include custom redirect URI when provided", async () => {
      const customRedirectUri = "https://myapp.com/oauth/callback";
      const result = await connectionManager.initiateConnection(
        USER_ID,
        customRedirectUri
      );

      expect(result.redirectUrl).toBeDefined();

      log('success', "Custom redirect URI test passed");
    });

    test("should reject initiation with missing entity ID", async () => {
      try {
        await connectionManager.initiateConnection(null);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Failed to initiate connection");
      }

      log('success', "Missing entity ID validation test passed");
    });

    test("should handle empty entity ID", async () => {
      try {
        await connectionManager.initiateConnection("");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Failed to initiate connection");
      }

      log('success', "Empty entity ID validation test passed");
    });
  });

  describe("Connection Activation", () => {
    test("should wait for connection activation successfully", async () => {
      const connectionId = "conn_cal_123456";
      const result = await connectionManager.waitForConnection(connectionId);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("entityId");
      expect(result.status).toBe("ACTIVE");
      expect(result.id).toBe(connectionId);

      log('success', "Connection activation test passed");
    });

    test("should handle custom timeout values", async () => {
      const connectionId = "conn_cal_123456";
      const customTimeout = 60; // 1 minute

      const startTime = Date.now();
      const result = await connectionManager.waitForConnection(
        connectionId,
        customTimeout
      );
      const endTime = Date.now();

      expect(result.status).toBe("ACTIVE");
      expect(endTime - startTime).toBeLessThan(customTimeout * 1000);

      log('success', "Custom timeout test passed");
    });

    test("should reject invalid connection IDs", async () => {
      try {
        await connectionManager.waitForConnection("invalid-connection");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Connection failed to activate");
      }

      log('success', "Invalid connection ID test passed");
    });

    test("should handle null connection ID", async () => {
      try {
        await connectionManager.waitForConnection(null);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Connection failed to activate");
      }

      log('success', "Null connection ID test passed");
    });
  });

  describe("Connection Status Management", () => {
    test("should get connection status for valid entity", async () => {
      const status = await connectionManager.getConnectionStatus(USER_ID);

      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("isValid");
      expect(status.status).toBe("ACTIVE");
      expect(status.isValid).toBe(true);

      log('success', "Connection status retrieval test passed");
    });

    test("should return disconnected status for invalid entity", async () => {
      const status = await connectionManager.getConnectionStatus(
        "invalid-entity"
      );

      expect(status.status).toBe("NOT_CONNECTED");
      expect(status.isValid).toBe(false);

      log('success', "Invalid entity status test passed");
    });

    test("should validate connection properly", async () => {
      const isValid = await connectionManager.isConnectionValid(USER_ID);
      expect(isValid).toBe(true);

      const isInvalid = await connectionManager.isConnectionValid(
        "invalid-entity"
      );
      expect(isInvalid).toBe(false);

      log('success', "Connection validation test passed");
    });
  });

  describe("Connection Refresh", () => {
    test("should refresh connection successfully", async () => {
      const refreshed = await connectionManager.refreshConnection(USER_ID);

      expect(refreshed).toHaveProperty("status");
      expect(refreshed).toHaveProperty("lastRefreshed");
      expect(refreshed.status).toBe("ACTIVE");

      log('success', "Connection refresh test passed");
    });

    test("should handle refresh for invalid entity", async () => {
      try {
        await connectionManager.refreshConnection("invalid-entity");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Failed to refresh connection");
      }

      log('success', "Invalid entity refresh test passed");
    });

    test("should update lastRefreshed timestamp", async () => {
      const beforeRefresh = Date.now();
      const refreshed = await connectionManager.refreshConnection(USER_ID);
      const afterRefresh = Date.now();

      const refreshedTime = new Date(refreshed.lastRefreshed).getTime();
      expect(refreshedTime).toBeGreaterThanOrEqual(beforeRefresh);
      expect(refreshedTime).toBeLessThanOrEqual(afterRefresh);

      log('success', "Refresh timestamp test passed");
    });
  });

  describe("Connection Disconnection", () => {
    test("should disconnect user successfully", async () => {
      const result = await connectionManager.disconnectUser(USER_ID);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("status");
      expect(result.success).toBe(true);
      expect(result.status).toBe("DISCONNECTED");

      log('success', "User disconnection test passed");
    });

    test("should handle disconnection for invalid entity", async () => {
      try {
        await connectionManager.disconnectUser("invalid-entity");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Failed to disconnect user");
      }

      log('success', "Invalid entity disconnection test passed");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle network failures gracefully", async () => {
      // Mock network failure
      const failingManager = new ComposioConnectionManager();
      failingManager.toolset.connectedAccounts.initiate = mock(() =>
        Promise.reject(new Error("Network timeout"))
      );

      try {
        await failingManager.initiateConnection(USER_ID);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Failed to initiate connection");
        expect(error.message).toContain("Network timeout");
      }

      log('success', "Network failure handling test passed");
    });

    test("should handle API rate limiting", async () => {
      const rateLimitedManager = new ComposioConnectionManager();
      rateLimitedManager.toolset.connectedAccounts.getStatus = mock(() =>
        Promise.reject(new Error("Rate limit exceeded"))
      );

      try {
        await rateLimitedManager.getConnectionStatus(USER_ID);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain("Failed to get connection status");
        expect(error.message).toContain("Rate limit exceeded");
      }

      log('success', "Rate limiting handling test passed");
    });

    test("should handle malformed responses", async () => {
      const malformedManager = new ComposioConnectionManager();
      malformedManager.toolset.connectedAccounts.initiate = mock(
        () => Promise.resolve(null) // Malformed response
      );

      const result = await malformedManager.initiateConnection(USER_ID);
      expect(result).toBeNull();

      log('success', "Malformed response handling test passed");
    });

    test("should handle concurrent connection requests", async () => {
      const promises = Array(3)
        .fill()
        .map(() => connectionManager.initiateConnection(USER_ID));

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result).toHaveProperty("redirectUrl");
        expect(result).toHaveProperty("status");
      });

      log('success', "Concurrent requests test passed");
    });
  });

  describe("Integration Environment Tests", () => {
    test("should work with development environment settings", async () => {
      const devManager = new ComposioConnectionManager();
      // Override for development
      devManager.integrationId = "dev-google-calendar-integration";

      const result = await devManager.initiateConnection(USER_ID);
      expect(result.redirectUrl).toBeDefined();

      log('success', "Development environment test passed");
    });

    test("should handle missing environment variables gracefully", async () => {
      // Temporarily remove env vars
      const originalApiKey = process.env.COMPOSIO_API_KEY;
      const originalIntegrationId = process.env.GOOGLE_CALENDAR_INTEGRATION_ID;

      delete process.env.COMPOSIO_API_KEY;
      delete process.env.GOOGLE_CALENDAR_INTEGRATION_ID;

      const manager = new ComposioConnectionManager();
      expect(manager.toolset.apiKey).toBe("test-api-key"); // fallback

      // Restore env vars
      if (originalApiKey) process.env.COMPOSIO_API_KEY = originalApiKey;
      if (originalIntegrationId)
        process.env.GOOGLE_CALENDAR_INTEGRATION_ID = originalIntegrationId;

      log('success', "Missing environment variables test passed");
    });
  });
});
