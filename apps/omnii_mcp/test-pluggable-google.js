// Test the pluggable Google services architecture
const {
  processGoogleMessage,
  hasActiveGoogleConnection,
} = require("./src/services/google-services-setup");

async function testPluggableGoogleServices() {
  console.log("🔌 Testing Pluggable Google Services Architecture...\n");

  const entityId = "edenchan717@gmail.com";
  const phoneNumber = "+16286885388";
  const userTimezone = "America/Los_Angeles";

  // Test different message types
  const testMessages = [
    {
      message: "Schedule a meeting tomorrow at 2pm",
      expectedService: "calendar",
      description: "Calendar event creation",
    },
    {
      message: "List my calendar events",
      expectedService: "calendar",
      description: "Calendar event listing",
    },
    {
      message: "Show my contacts",
      expectedService: "contacts",
      description: "Contacts listing (plugin not registered yet)",
    },
    {
      message: "Add task: buy groceries",
      expectedService: "tasks",
      description: "Task creation (plugin now registered!)",
    },
    {
      message: "List my tasks",
      expectedService: "tasks",
      description: "Task listing",
    },
    {
      message: "What's the weather?",
      expectedService: null,
      description: "Non-Google service message",
    },
  ];

  console.log("📱 Testing message detection and routing:\n");

  for (const test of testMessages) {
    console.log(`Message: "${test.message}"`);
    console.log(`Expected: ${test.expectedService || "none"} service`);
    console.log(`Test: ${test.description}`);

    try {
      const result = await processGoogleMessage(
        test.message,
        phoneNumber,
        entityId,
        userTimezone
      );

      console.log(`✅ Result: ${result.success ? "SUCCESS" : "FAILED"}`);
      console.log(`   Service: ${result.serviceType || "none detected"}`);
      console.log(
        `   Message: ${result.message.substring(0, 80)}${
          result.message.length > 80 ? "..." : ""
        }`
      );

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log(""); // Empty line
  }

  console.log("🔌 Architecture Benefits:\n");
  console.log("✅ CENTRALIZED AUTH LOGIC:");
  console.log("   - UnifiedGoogleManager handles all OAuth flows");
  console.log("   - Composio integration management in one place");
  console.log("   - SMS delivery of redirect URLs");
  console.log("   - Connection status tracking");
  console.log("");
  console.log("✅ PLUGGABLE SERVICE LOGIC:");
  console.log("   - Each service implements GoogleServicePlugin interface");
  console.log("   - Service-specific message detection");
  console.log("   - Service-specific processing (with active connection)");
  console.log("   - Easy to add new services (contacts, tasks, etc.)");
  console.log("");
  console.log("✅ CLEAN SEPARATION:");
  console.log("   - Auth logic: UnifiedGoogleManager (painful stuff)");
  console.log("   - Business logic: Service plugins (fun stuff)");
  console.log("   - Integration: Simple registerPlugin() calls");
  console.log("");
  console.log("🚀 TO ADD A NEW SERVICE:");
  console.log("   1. Create class implementing GoogleServicePlugin");
  console.log("   2. Add integration ID to UnifiedGoogleManager");
  console.log("   3. Register plugin in google-services-setup.ts");
  console.log("   4. Done! Auth is handled automatically.");
}

testPluggableGoogleServices().catch(console.error);
