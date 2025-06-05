const { OpenAIToolSet } = require("composio-core");

async function testUnifiedGoogleManager() {
  console.log("Testing Unified Google Manager...");

  try {
    const toolset = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY || "exby0bz32hpz8nmmahu3o",
    });

    const entityId = "santino62@gmail.com";
    console.log(`\n🔗 Checking connections for entity: ${entityId}`);

    const connections = await toolset.connectedAccounts.list({
      entityId: entityId,
    });

    console.log(`Found ${connections.items?.length || 0} connections:`);
    connections.items?.forEach((conn, index) => {
      console.log(
        `  ${index + 1}. ${conn.appName} - ${conn.status} (ID: ${conn.id})`
      );
    });

    // Test all three Google services
    const services = [
      {
        name: "Google Calendar",
        integrationId: "6bdc82b8-303c-4142-a0a0-2d09c9d50d8c",
        appName: "googlecalendar",
      },
      {
        name: "Google Contacts",
        integrationId: "010c8b01-366a-4880-bcb4-44c7219dcc6f",
        appName: "googlecontacts",
      },
      {
        name: "Google Tasks",
        integrationId: "0e31d0bb-cf27-49d9-9ff1-83bab06829df",
        appName: "googletasks",
      },
    ];

    for (const service of services) {
      console.log(`\n📋 Testing ${service.name}...`);

      try {
        // Test integration details
        const integration = await toolset.integrations.get({
          integrationId: service.integrationId,
        });

        console.log(
          `✅ Integration: ${integration.name} (${integration.appName})`
        );

        // Test required params
        if (integration.id) {
          const expectedInputFields =
            await toolset.integrations.getRequiredParams({
              integrationId: integration.id,
            });
          console.log(
            `   Required fields: ${expectedInputFields?.length || 0}`
          );
        }

        // Check for existing connection
        const activeConnection = connections.items?.find(
          (conn) =>
            conn.appName?.toLowerCase() === service.appName.toLowerCase() &&
            conn.status?.toLowerCase() === "active"
        );

        if (activeConnection) {
          console.log(`   ✅ Active connection found: ${activeConnection.id}`);

          // Test getting tools
          try {
            const tools = await toolset.getTools({
              apps: [service.appName],
            });
            console.log(`   🛠️ Available tools: ${tools.length}`);
          } catch (toolError) {
            console.log(`   ❌ Error getting tools: ${toolError.message}`);
          }
        } else {
          console.log(`   ❌ No active connection found`);

          // Test OAuth setup (but don't actually initiate)
          console.log(`   🔗 OAuth setup would use: ${service.integrationId}`);
        }
      } catch (serviceError) {
        console.log(
          `   ❌ Error testing ${service.name}: ${serviceError.message}`
        );
      }
    }

    console.log("\n📝 Summary:");
    console.log("✅ Unified Google Manager supports:");
    console.log("   - Google Calendar (events, meetings)");
    console.log("   - Google Contacts (people, phone numbers)");
    console.log("   - Google Tasks (todo lists, reminders)");
    console.log("");
    console.log("🔄 Consistent OAuth flow:");
    console.log("   1. Composio generates redirectUrl");
    console.log("   2. SMS delivers OAuth link to user");
    console.log("   3. User authorizes on phone");
    console.log("   4. Google redirects to callback");
    console.log('   5. Connection becomes "active"');
    console.log("");
    console.log("📱 Phone mapping: +18582260766 → santino62@gmail.com");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testUnifiedGoogleManager();
