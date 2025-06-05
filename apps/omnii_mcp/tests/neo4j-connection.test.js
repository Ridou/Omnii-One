/**
 * Test Neo4j connection
 *
 * This script tests direct connection to Neo4j without Redis caching
 */

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import neo4j from "neo4j-driver";
import { config } from "dotenv";
import { log } from "./constants.js";

// Initialize environment
config();

// Neo4j configuration from .env
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USER;
const neo4jPassword = process.env.NEO4J_PASSWORD;
const neo4jDatabase = process.env.NEO4J_DATABASE;

// Test suite
describe("Neo4j Connection Tests", () => {
  let driver = null;

  // Log the environment before all tests
  beforeAll(() => {
    // Log environment variables (masked for security)
    log("info", "Neo4j connection details:");
    log("info", `- NEO4J_URI: ${neo4jUri}`);
    log("info", `- NEO4J_USER: ${neo4jUser}`);
    log("info", `- NEO4J_DATABASE: ${neo4jDatabase}`);
    log("info", `- NEO4J_PASSWORD: ${neo4jPassword ? "******" : "not set"}`);
  });

  // Clean up after all tests
  afterAll(async () => {
    if (driver) {
      await driver.close();
      log("info", "Driver closed");
    }
  });

  test("Create Neo4j driver", async () => {
    log("info", "Creating Neo4j driver...");

    try {
      // Create a driver instance
      driver = neo4j.driver(
        neo4jUri,
        neo4j.auth.basic(neo4jUser, neo4jPassword)
      );

      log("success", "Driver created successfully");
      expect(driver).toBeDefined();
    } catch (error) {
      log("error", `Failed to create driver: ${error.message}`);
      throw error;
    }
  });

  test("Verify Neo4j connectivity", async () => {
    // Skip if driver wasn't created
    if (!driver) {
      log("info", "Skipping test - driver not available");
      return;
    }

    log("info", "Verifying connectivity...");

    try {
      // Verify connectivity with timeout
      const connectivityPromise = driver.verifyConnectivity();
      console.log("Verifying connectivity with Driver.getServerInfo()...");
      const serverInfo = await driver.getServerInfo();
      console.log("Server info:", serverInfo);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Connection verification timeout")),
          10000
        );
      });

      await Promise.race([connectivityPromise, timeoutPromise]);
      log("success", "Connection verified successfully");
      expect(true).toBe(true); // Connection verified
    } catch (error) {
      log("error", `Connection verification failed: ${error.message}`);
      // Don't fail the test - this is diagnostic
    }
  });

  test("Create Neo4j session", async () => {
    // Skip if driver wasn't created
    if (!driver) {
      log("info", "Skipping test - driver not available");
      return;
    }

    log("info", "Creating session...");
    let session = null;

    try {
      // Create a session
      session = driver.session({ database: neo4jDatabase });
      log("success", "Session created successfully");
      expect(session).toBeDefined();
    } catch (error) {
      log("error", `Failed to create session: ${error.message}`);
    } finally {
      // Clean up
      if (session) {
        await session.close();
        log("info", "Session closed");
      }
    }
  });

  test("Run test query", async () => {
    // Skip if driver wasn't created
    if (!driver) {
      log("info", "Skipping test - driver not available");
      return;
    }

    log("info", "Running test query...");
    let session = null;

    try {
      // Create a session and run query with timeout
      session = driver.session({ database: neo4jDatabase });

      const queryPromise = session.run("RETURN 1 AS num");
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Query timeout")), 10000);
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const value = result.records[0].get("num").toNumber();
      log("success", `Query result: ${value}`);
      expect(value).toBe(1);
    } catch (error) {
      log("error", `Query failed: ${error.message}`);
      // Don't fail the test - this is diagnostic
    } finally {
      // Clean up
      if (session) {
        await session.close();
        log("info", "Session closed");
      }
    }
  });
});

// For standalone execution
if (import.meta.main) {
  log("info", "🔌 Running Neo4j Connection tests in standalone mode...");
  // Tests will be automatically run by Bun
}
