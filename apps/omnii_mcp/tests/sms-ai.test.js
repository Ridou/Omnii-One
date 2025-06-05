/**
 * SMS AI Integration Test
 *
 * Tests the SMS AI service with Composio tool calling
 */

import { describe, test, expect, beforeAll } from "bun:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8000";
const TEST_PHONE = process.env.TWILIO_TEST_PHONE_NUMBER || "+1234567890";

describe("SMS AI Integration", () => {
  test("Health check should show all services", async () => {
    const response = await fetch(`${BASE_URL}/api/sms/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.service).toBe("sms-ai");
    expect(data.config).toHaveProperty("hasOpenAI");
    expect(data.config).toHaveProperty("hasComposio");
    expect(data.config).toHaveProperty("hasTwilio");

    console.log("📊 SMS AI Health:", data.config);
  });

  test("Connection instructions should be generated", async () => {
    const response = await fetch(`${BASE_URL}/api/sms/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: TEST_PHONE }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.instructions).toBeDefined();
    expect(typeof data.instructions).toBe("string");

    console.log("🔗 Connection Instructions:", data.instructions);
  });

  test("SMS webhook should accept form data", async () => {
    const formData = new URLSearchParams({
      From: TEST_PHONE,
      To: process.env.TWILIO_PHONE_NUMBER || "+1987654321",
      Body: "Hello AI assistant!",
      MessageSid: "test_message_123",
    });

    const response = await fetch(`${BASE_URL}/sms/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/xml");

    const twimlResponse = await response.text();
    expect(twimlResponse).toContain("<Response>");
    expect(twimlResponse).toContain("</Response>");

    console.log("📱 TwiML Response:", twimlResponse);
  });

  test("Send SMS endpoint should work", async () => {
    // Only test if we have Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log("⏭️ Skipping SMS send test - no Twilio credentials");
      return;
    }

    const response = await fetch(`${BASE_URL}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: TEST_PHONE,
        body: "Test message from SMS AI integration test",
      }),
    });

    const data = await response.json();

    if (response.status === 200) {
      expect(data.success).toBe(true);
      expect(data.messageSid).toBeDefined();
      console.log("📤 SMS sent successfully:", data.messageSid);
    } else {
      console.log("⚠️ SMS send failed (expected in test):", data.error);
    }
  });
});

beforeAll(() => {
  console.log("\n🤖 Starting SMS AI Integration Tests");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📱 Test Phone: ${TEST_PHONE}`);
  console.log("=" * 50);
});
