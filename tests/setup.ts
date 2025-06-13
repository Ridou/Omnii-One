// Test setup
console.log("🧪 Loading test setup");

// Set required environment variables for tests
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-api-key";
process.env.COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || "test-composio-key";

// Mock external services for testing
if (process.env.NODE_ENV === 'test') {
  console.log("🧪 Test environment detected - setting up mocks");
} 