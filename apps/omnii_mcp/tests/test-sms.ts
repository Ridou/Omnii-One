import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

// Load environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = process.env.TWILIO_TEST_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber || !toNumber) {
  console.error("Missing required environment variables");
  console.log("Required variables:");
  console.log("- TWILIO_ACCOUNT_SID:", !!accountSid);
  console.log("- TWILIO_AUTH_TOKEN:", !!authToken);
  console.log("- TWILIO_PHONE_NUMBER:", !!fromNumber);
  console.log("- TWILIO_TEST_PHONE_NUMBER:", !!toNumber);
  process.exit(1);
}

// Initialize Twilio client
const client = twilio(accountSid, authToken);

async function sendTestSms() {
  try {
    console.log("Sending test SMS...");
    console.log("From:", fromNumber);
    console.log("To:", toNumber);

    const message = await client.messages.create({
      body: "🚀 This is a test message from Omnii MCP",
      from: fromNumber,
      to: toNumber || "",
    });

    console.log("✅ SMS sent successfully!");
    console.log("Message SID:", message.sid);
    console.log("Status:", message.status);

    return message;
  } catch (error) {
    console.error("❌ Failed to send SMS:");
    if (error instanceof Error) {
      console.error("Error:", error.message);
      if ("moreInfo" in error) {
        console.error("More Info:", error.moreInfo);
      }
    } else {
      console.error("Unknown error:", error);
    }
    throw error;
  }
}

// Run the test
sendTestSms()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
