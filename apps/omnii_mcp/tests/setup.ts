// Global test setup for Bun
import { beforeAll, afterAll } from "bun:test";

// Global test configuration
beforeAll(() => {
  console.log("🧪 Starting RDF Contact Resolution Test Suite");
  // Setup global mocks, test databases, etc.
});

afterAll(() => {
  console.log("✅ Test suite completed");
  // Cleanup global resources
}); 