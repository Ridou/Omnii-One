/**
 * Composio Integration Tests - Real Endpoint Testing
 *
 * Tests hit actual dev server endpoints without mocking
 * Tests both Google Calendar and Google Tasks integrations
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8080";
const TEST_ENTITY_ID = "edenchan717@@gmail.com";
const TEST_TIMEOUT = 30000; // 30 seconds for OAuth flows

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`🔄 API Call: ${options.method || "GET"} ${url}`);

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(
      `❌ API Error: ${response.status} ${response.statusText}`,
      data
    );
  } else {
    console.log(`✅ API Success: ${response.status}`, data.message || "OK");
  }

  return { response, data };
}

// Test data generators
const generateTestEvent = () => ({
  summary: `Test Event ${Date.now()}`,
  description: `Integration test event created at ${new Date().toISOString()}`,
  start: {
    dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    timeZone: "America/New_York",
  },
  end: {
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    timeZone: "America/New_York",
  },
  location: "Test Location",
  attendees: [],
});

const generateTestTaskList = () => ({
  title: `Test Task List ${Date.now()}`,
});

const generateTestTask = () => ({
  title: `Test Task ${Date.now()}`,
  notes: `Integration test task created at ${new Date().toISOString()}`,
  due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  status: "needsAction",
});

describe("🏥 Health Checks", () => {
  test("Calendar service health check", async () => {
    const { response, data } = await apiCall("/api/composio/calendar/health");

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.service).toBe("composio-calendar");
    expect(data.status).toBe("healthy");
  });

  test("Server is running and responding", async () => {
    const { response } = await apiCall("/");
    expect(response.status).toBeLessThan(500); // Any response means server is up
  });
});

describe("🔗 Google Calendar - Connection Management", () => {
  test("Check initial connection status", async () => {
    const { response, data } = await apiCall(
      `/api/composio/calendar/status/${TEST_ENTITY_ID}`
    );

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("data");

    console.log("📊 Initial connection status:", data.data);
  });

  test("Initiate OAuth connection", async () => {
    const { response, data } = await apiCall(
      `/api/composio/calendar/connect/${TEST_ENTITY_ID}`,
      {
        method: "POST",
        body: JSON.stringify({
          redirectUri: `${BASE_URL}/api/composio/calendar/callback`,
          scopes: ["https://www.googleapis.com/auth/calendar"],
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty("redirectUrl");
    expect(data.data).toHaveProperty("connectedAccountId");

    console.log("🔗 OAuth URL:", data.data.redirectUrl);
    console.log("🆔 Connection ID:", data.data.connectedAccountId);
  });

  test("Test OAuth callback endpoint", async () => {
    const { response, data } = await apiCall(
      "/api/composio/calendar/callback?code=test_code&state=test_state"
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("OAuth callback received");
  });

  test("Test OAuth callback with error", async () => {
    const { response, data } = await apiCall(
      "/api/composio/calendar/callback?error=access_denied&state=test_state"
    );

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("OAuth error: access_denied");
  });
});

describe("📅 Google Calendar - Event Operations", () => {
  test("List calendar events", async () => {
    const { response, data } = await apiCall(
      `/api/composio/calendar/events/${TEST_ENTITY_ID}`
    );

    // This might fail if not connected, which is expected
    if (response.status === 401) {
      console.log("⚠️  Expected: No active connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      console.log(`📋 Found ${data.count} events`);
    }
  });

  test("Create calendar event", async () => {
    const eventData = generateTestEvent();
    const { response, data } = await apiCall(
      `/api/composio/calendar/events/${TEST_ENTITY_ID}`,
      {
        method: "POST",
        body: JSON.stringify(eventData),
      }
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("id");
      expect(data.data.summary).toBe(eventData.summary);
      console.log("✨ Created event:", data.data.id);
    }
  });

  test("Search calendar events", async () => {
    const { response, data } = await apiCall(
      `/api/composio/calendar/search/${TEST_ENTITY_ID}?q=meeting`
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else if (response.status === 400) {
      // Test without query parameter
      const { response: badResponse, data: badData } = await apiCall(
        `/api/composio/calendar/search/${TEST_ENTITY_ID}`
      );
      expect(badResponse.status).toBe(400);
      expect(badData.code).toBe("MISSING_QUERY");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      console.log(`🔍 Found ${data.count} events matching 'meeting'`);
    }
  });

  test("List calendars", async () => {
    const { response, data } = await apiCall(
      `/api/composio/calendar/calendars/${TEST_ENTITY_ID}`
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      console.log(`📚 Found ${data.count} calendars`);
    }
  });

  test("Get user profile", async () => {
    const { response, data } = await apiCall(
      `/api/composio/calendar/profile/${TEST_ENTITY_ID}`
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      console.log("👤 User profile:", data.data?.email || "Profile data");
    }
  });

  test("Get available tools", async () => {
    const { response, data } = await apiCall(
      `/api/composio/calendar/tools/${TEST_ENTITY_ID}`
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    console.log(`🛠️  Available tools: ${data.count}`);
  });
});

describe("✅ Google Tasks - Connection Management", () => {
  test("Check Tasks connection status", async () => {
    const { response, data } = await apiCall(
      `/api/composio/tasks/status/${TEST_ENTITY_ID}`
    );

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("data");

    console.log("📊 Tasks connection status:", data.data);
  });

  test("Initiate Tasks OAuth connection", async () => {
    const { response, data } = await apiCall(
      `/api/composio/tasks/connect/${TEST_ENTITY_ID}`,
      {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: `${BASE_URL}/api/composio/tasks/callback`,
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty("redirectUrl");
    expect(data.data).toHaveProperty("connectedAccountId");

    console.log("🔗 Tasks OAuth URL:", data.data.redirectUrl);
    console.log("🆔 Tasks Connection ID:", data.data.connectedAccountId);
  });

  test("Test Tasks OAuth callback", async () => {
    const { response, data } = await apiCall(
      "/api/composio/tasks/callback?code=test_code&state=test_state"
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("OAuth callback received");
  });
});

describe("📝 Google Tasks - Task List Operations", () => {
  let testTaskListId = null;

  test("List task lists", async () => {
    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists`
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active Tasks connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      console.log(`📋 Found ${data.data.length} task lists`);
    }
  });

  test("Create task list", async () => {
    const taskListData = generateTestTaskList();
    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists`,
      {
        method: "POST",
        body: JSON.stringify(taskListData),
      }
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active Tasks connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("id");
      expect(data.data.title).toBe(taskListData.title);
      testTaskListId = data.data.id;
      console.log("✨ Created task list:", data.data.id);
    }
  });

  test("Get specific task list", async () => {
    if (!testTaskListId) {
      console.log("⏭️  Skipping: No task list ID from previous test");
      return;
    }

    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists/${testTaskListId}`
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(testTaskListId);
    console.log("📄 Retrieved task list:", data.data.title);
  });

  test("Update task list", async () => {
    if (!testTaskListId) {
      console.log("⏭️  Skipping: No task list ID from previous test");
      return;
    }

    const updatedTitle = `Updated Task List ${Date.now()}`;
    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists/${testTaskListId}`,
      {
        method: "PUT",
        body: JSON.stringify({ title: updatedTitle }),
      }
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe(updatedTitle);
    console.log("📝 Updated task list title:", updatedTitle);
  });
});

describe("📋 Google Tasks - Task Operations", () => {
  const DEFAULT_TASK_LIST = "@default";
  let testTaskId = null;

  test("List tasks in default task list", async () => {
    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists/${DEFAULT_TASK_LIST}/tasks`
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active Tasks connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      console.log(`📋 Found ${data.data.length} tasks in default list`);
    }
  });

  test("Create task", async () => {
    const taskData = generateTestTask();
    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists/${DEFAULT_TASK_LIST}/tasks`,
      {
        method: "POST",
        body: JSON.stringify(taskData),
      }
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active Tasks connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("id");
      expect(data.data.title).toBe(taskData.title);
      testTaskId = data.data.id;
      console.log("✨ Created task:", data.data.id);
    }
  });

  test("Get specific task", async () => {
    if (!testTaskId) {
      console.log("⏭️  Skipping: No task ID from previous test");
      return;
    }

    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists/${DEFAULT_TASK_LIST}/tasks/${testTaskId}`
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(testTaskId);
    console.log("📄 Retrieved task:", data.data.title);
  });

  test("Update task", async () => {
    if (!testTaskId) {
      console.log("⏭️  Skipping: No task ID from previous test");
      return;
    }

    const updates = {
      title: `Updated Task ${Date.now()}`,
      status: "completed",
      completed: new Date().toISOString(),
    };

    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists/${DEFAULT_TASK_LIST}/tasks/${testTaskId}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      }
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe(updates.title);
    expect(data.data.status).toBe("completed");
    console.log("📝 Updated task:", updates.title);
  });

  test("Move task", async () => {
    if (!testTaskId) {
      console.log("⏭️  Skipping: No task ID from previous test");
      return;
    }

    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists/${DEFAULT_TASK_LIST}/tasks/${testTaskId}/move`,
      {
        method: "POST",
        body: JSON.stringify({
          parent: null,
          previous: null,
        }),
      }
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active Tasks connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      console.log("🔄 Moved task to top of list");
    }
  });

  test("Clear completed tasks", async () => {
    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists/${DEFAULT_TASK_LIST}/clear`,
      {
        method: "POST",
      }
    );

    if (response.status === 401) {
      console.log("⚠️  Expected: No active Tasks connection found");
      expect(data.code).toBe("CONNECTION_ERROR");
    } else {
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      console.log("🧹 Cleared completed tasks");
    }
  });

  test("Delete task", async () => {
    if (!testTaskId) {
      console.log("⏭️  Skipping: No task ID from previous test");
      return;
    }

    const { response, data } = await apiCall(
      `/api/composio/tasks/${TEST_ENTITY_ID}/tasklists/${DEFAULT_TASK_LIST}/tasks/${testTaskId}`,
      {
        method: "DELETE",
      }
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    console.log("🗑️  Deleted task:", testTaskId);
  });
});

describe("🔧 Error Handling Tests", () => {
  test("Invalid entity ID format", async () => {
    const { response, data } = await apiCall(
      "/api/composio/calendar/events/invalid-entity"
    );

    // Should either work or return a connection error
    expect([200, 401, 400, 500]).toContain(response.status);
    console.log(
      "🔍 Invalid entity response:",
      response.status,
      data.code || "OK"
    );
  });

  test("Missing required parameters", async () => {
    const { response, data } = await apiCall(
      `/api/composio/calendar/events/${TEST_ENTITY_ID}`,
      {
        method: "POST",
        body: JSON.stringify({}), // Empty body
      }
    );

    // Should return validation error
    expect([400, 401]).toContain(response.status);
    console.log(
      "🔍 Missing params response:",
      response.status,
      data.error || data.code
    );
  });

  test("Nonexistent endpoints", async () => {
    const { response } = await apiCall("/api/composio/nonexistent");

    expect(response.status).toBe(404);
    console.log("🔍 404 for nonexistent endpoint - OK");
  });
});

describe("📊 Performance Tests", () => {
  test("Health check response time", async () => {
    const start = Date.now();
    const { response } = await apiCall("/api/composio/calendar/health");
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    console.log(`⚡ Health check took ${duration}ms`);
  });

  test("Connection status response time", async () => {
    const start = Date.now();
    const { response } = await apiCall(
      `/api/composio/calendar/status/${TEST_ENTITY_ID}`
    );
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000); // Should respond within 10 seconds
    console.log(`⚡ Connection status took ${duration}ms`);
  });
});

// Test configuration output
beforeAll(() => {
  console.log("\n🚀 Starting Composio Integration Tests");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👤 Test Entity: ${TEST_ENTITY_ID}`);
  console.log(`⏱️  Timeout: ${TEST_TIMEOUT}ms`);
  console.log("=" * 60);
});

afterAll(() => {
  console.log("\n" + "=" * 60);
  console.log("✅ Composio Integration Tests Complete");
  console.log("\n📝 Notes:");
  console.log("- Connection errors are expected if OAuth not completed");
  console.log("- Complete OAuth flow manually to test authenticated endpoints");
  console.log("- Check server logs for detailed error information");
});
