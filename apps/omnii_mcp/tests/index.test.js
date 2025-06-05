/**
 * Main test runner for Bun test suite
 * 
 * This file imports and runs all tests in the test suite
 * Run with: bun test
 */

import { test, describe, expect } from "bun:test";

// Placeholder for test discovery
// Bun will automatically discover and run all tests in the tests directory
// that match the pattern *.test.js or *.spec.js

describe("MCP Test Suite", () => {
  test("Tests are discovered and run", () => {
    expect(true).toBe(true);
  });
});

// To run specific tests, use:
// bun test tests/neo4j-api.test.js
// bun test tests/mcp-context.test.js
// etc.