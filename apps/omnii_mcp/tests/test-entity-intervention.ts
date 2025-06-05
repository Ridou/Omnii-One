import { SimpleSMSAI } from "../src/services/sms-ai-simple";
import { redisCache } from "../src/services/redis-cache";

// Test the entity resolution and user intervention flow
async function testEntityIntervention() {
  console.log("🧪 Testing Entity Resolution & User Intervention Flow\n");

  const smsAI = new SimpleSMSAI();
  const testPhoneNumber = "+16286885388"; // Eden's test number

  try {
    // Test 1: Message with unknown entity
    console.log("📱 Test 1: Sending message with unknown entity");
    console.log("User: 'Send an email to Zogblar about the meeting'\n");

    const response1 = await smsAI.processMessage(
      "Send an email to Zogblar about the meeting",
      testPhoneNumber,
      "2024-01-15 10:30 AM PST"
    );

    console.log("🤖 System response:");
    console.log(`Success: ${response1.success}`);
    console.log(`Message: ${response1.message}\n`);

    // Simulate a 2-second delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 2: User provides email for unknown entity
    console.log("📱 Test 2: User provides email address");
    console.log("User: 'zogblar@alien.com'\n");

    const response2 = await smsAI.processMessage(
      "zogblar@alien.com",
      testPhoneNumber,
      "2024-01-15 10:31 AM PST"
    );

    console.log("🤖 System response:");
    console.log(`Success: ${response2.success}`);
    console.log(`Message: ${response2.message}\n`);

    // Wait for the workflow to complete
    console.log("⏳ Waiting for workflow to complete...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Test 3: Try the same entity again (should be cached)
    console.log("📱 Test 3: Sending message with previously unknown entity");
    console.log("User: 'Send another email to Zogblar about the project'\n");

    const response3 = await smsAI.processMessage(
      "Send another email to Zogblar about the project",
      testPhoneNumber,
      "2024-01-15 10:32 AM PST"
    );

    console.log("🤖 System response:");
    console.log(`Success: ${response3.success}`);
    console.log(`Message: ${response3.message}\n`);

    // Check cache
    console.log("🔍 Checking Redis cache:");
    const cacheKey = `entity:${testPhoneNumber}:PERSON:Zogblar`;
    const cachedEntity = await redisCache.get(cacheKey);
    console.log(`Cache key: ${cacheKey}`);
    console.log(`Cached value:`, cachedEntity);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  // Clean up
  console.log("\n🧹 Test complete");
  process.exit(0);
}

// Run the test
testEntityIntervention().catch(console.error);
