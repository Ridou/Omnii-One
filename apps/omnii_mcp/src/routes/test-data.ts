/**
 * Test Data Routes
 *
 * Provides endpoints for injecting test data directly into the graph
 * without requiring OAuth. Only available when INGESTION_TEST_MODE=true.
 *
 * Usage:
 *   1. Set INGESTION_TEST_MODE=true in .env
 *   2. Optionally set ADMIN_KEY for protection
 *   3. Use these endpoints to inject sample data
 */

import { Elysia, t } from "elysia";
import { env } from "../config/env";
import { createNode, createRelationship } from "../graph/operations/crud";
import { NodeLabel, type EventNode, type ContactNode, type EntityNode } from "../graph/schema/nodes";
import { RelationshipType } from "../graph/schema/relationships";
import { Neo4jHTTPClient } from "../services/neo4j/http-client";
import { getNeo4jHTTPConfig } from "../config/neo4j.config";
import { createVectorIndex, checkVectorIndex, dropVectorIndex } from "../graph/schema/vector-index";
import { generateEmbedding } from "../graph/operations/embeddings";

// Create a dedicated HTTP client for test operations
let testClient: Neo4jHTTPClient | null = null;

function getTestClient(): Neo4jHTTPClient {
  if (!testClient) {
    testClient = new Neo4jHTTPClient(getNeo4jHTTPConfig());
  }
  return testClient;
}

/**
 * Sample test data for quick testing
 */
const SAMPLE_EVENTS = [
  {
    name: "Team Standup",
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    location: "Zoom",
    description: "Daily team sync to discuss progress on the Omnii project",
  },
  {
    name: "Product Review with Sarah",
    startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    endTime: new Date(Date.now() + 172800000 + 5400000).toISOString(),
    location: "Conference Room A",
    description: "Review Q1 roadmap and discuss feature priorities with Sarah from Marketing",
  },
  {
    name: "Lunch with John from Acme Corp",
    startTime: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    endTime: new Date(Date.now() + 259200000 + 5400000).toISOString(),
    location: "Downtown Cafe",
    description: "Discuss potential partnership opportunities",
  },
];

const SAMPLE_CONTACTS = [
  { name: "Sarah Johnson", email: "sarah.johnson@company.com", organization: "Marketing" },
  { name: "John Smith", email: "john.smith@acmecorp.com", organization: "Acme Corp" },
  { name: "Emily Chen", email: "emily.chen@techstartup.io", organization: "TechStartup" },
  { name: "Mike Williams", email: "mike@gmail.com" },
];

const SAMPLE_TASKS = [
  { name: "Review PR #123", status: "pending", priority: "high", dueDate: new Date(Date.now() + 86400000).toISOString() },
  { name: "Update documentation", status: "in_progress", priority: "medium" },
  { name: "Deploy to staging", status: "pending", priority: "high", dueDate: new Date(Date.now() + 172800000).toISOString() },
];

const SAMPLE_ENTITIES = [
  { name: "Omnii Project", type: "thing" as const, description: "Personal context server project" },
  { name: "Q1 Roadmap", type: "thing" as const, description: "Product roadmap for Q1 2026" },
  { name: "Acme Corp", type: "organization" as const, description: "Potential partner company" },
];

/**
 * Test data routes - only enabled when INGESTION_TEST_MODE=true
 */
export const testDataRoutes = new Elysia({ prefix: "/test" })
  // Guard: Check if test mode is enabled
  .onBeforeHandle(({ set }) => {
    if (!env.INGESTION_TEST_MODE) {
      set.status = 403;
      return {
        error: "Test mode disabled",
        message: "Set INGESTION_TEST_MODE=true in .env to enable test endpoints",
      };
    }

    // Optional admin key protection
    // For now, test mode being enabled is sufficient
  })

  /**
   * Health check for test mode
   */
  .get("/health", () => ({
    status: "ok",
    testMode: true,
    message: "Test endpoints are enabled",
  }))

  /**
   * Inject sample events into the graph
   *
   * POST /api/test/inject/events
   */
  .post(
    "/inject/events",
    async ({ body, set }) => {
      const { count = 3, custom } = body;
      const client = getTestClient();

      try {
        const eventsToCreate = custom || SAMPLE_EVENTS.slice(0, count);
        const created: string[] = [];

        for (const eventData of eventsToCreate) {
          const node = await createNode<EventNode>(client, NodeLabel.Event, {
            name: eventData.name,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            location: eventData.location,
            description: eventData.description,
          } as Omit<EventNode, "id" | "createdAt">);
          created.push(node.id);
        }

        return {
          success: true,
          eventsCreated: created.length,
          nodeIds: created,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to inject events",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        count: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
        custom: t.Optional(
          t.Array(
            t.Object({
              name: t.String(),
              startTime: t.String(),
              endTime: t.Optional(t.String()),
              location: t.Optional(t.String()),
              description: t.Optional(t.String()),
            })
          )
        ),
      }),
    }
  )

  /**
   * Inject sample contacts into the graph
   *
   * POST /api/test/inject/contacts
   */
  .post(
    "/inject/contacts",
    async ({ body, set }) => {
      const { count = 4, custom } = body;
      const client = getTestClient();

      try {
        const contactsToCreate = custom || SAMPLE_CONTACTS.slice(0, count);
        const created: string[] = [];

        for (const contactData of contactsToCreate) {
          // Filter out undefined properties to avoid Neo4j errors
          const props: Record<string, string> = {
            name: contactData.name,
          };
          if (contactData.email) props.email = contactData.email.toLowerCase();
          if (contactData.organization) props.organization = contactData.organization;

          const node = await createNode<ContactNode>(client, NodeLabel.Contact, props as Omit<ContactNode, "id" | "createdAt">);
          created.push(node.id);
        }

        return {
          success: true,
          contactsCreated: created.length,
          nodeIds: created,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to inject contacts",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        count: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
        custom: t.Optional(
          t.Array(
            t.Object({
              name: t.String(),
              email: t.Optional(t.String()),
              phone: t.Optional(t.String()),
              organization: t.Optional(t.String()),
            })
          )
        ),
      }),
    }
  )

  /**
   * Inject sample tasks (as Entity nodes with entity_type='task')
   *
   * POST /api/test/inject/tasks
   */
  .post(
    "/inject/tasks",
    async ({ body, set }) => {
      const { count = 3, custom } = body;
      const client = getTestClient();

      try {
        const tasksToCreate = custom || SAMPLE_TASKS.slice(0, count);
        const created: string[] = [];

        for (const taskData of tasksToCreate) {
          const node = await createNode<EntityNode>(client, NodeLabel.Entity, {
            name: taskData.name,
            entityType: "task",
            description: `Status: ${taskData.status}, Priority: ${taskData.priority}${taskData.dueDate ? `, Due: ${taskData.dueDate}` : ""}`,
          } as Omit<EntityNode, "id" | "createdAt">);
          created.push(node.id);
        }

        return {
          success: true,
          tasksCreated: created.length,
          nodeIds: created,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to inject tasks",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        count: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
        custom: t.Optional(
          t.Array(
            t.Object({
              name: t.String(),
              status: t.Optional(t.String()),
              priority: t.Optional(t.String()),
              dueDate: t.Optional(t.String()),
            })
          )
        ),
      }),
    }
  )

  /**
   * Inject sample entities into the graph
   *
   * POST /api/test/inject/entities
   */
  .post(
    "/inject/entities",
    async ({ body, set }) => {
      const { count = 3, custom } = body;
      const client = getTestClient();

      try {
        const entitiesToCreate = custom || SAMPLE_ENTITIES.slice(0, count);
        const created: string[] = [];

        for (const entityData of entitiesToCreate) {
          const props: Record<string, string> = {
            name: entityData.name,
            type: entityData.type || entityData.entityType || "thing",
          };
          if (entityData.description) props.description = entityData.description;

          const node = await createNode<EntityNode>(client, NodeLabel.Entity, props as Omit<EntityNode, "id" | "createdAt">);
          created.push(node.id);
        }

        return {
          success: true,
          entitiesCreated: created.length,
          nodeIds: created,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to inject entities",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        count: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
        custom: t.Optional(
          t.Array(
            t.Object({
              name: t.String(),
              type: t.Optional(t.String()),
              entityType: t.Optional(t.String()),
              description: t.Optional(t.String()),
            })
          )
        ),
      }),
    }
  )

  /**
   * Inject a complete test scenario (events + contacts + entities)
   *
   * POST /api/test/inject/scenario
   */
  .post(
    "/inject/scenario",
    async ({ body, set }) => {
      const { withRelationships = false } = body;
      const client = getTestClient();

      try {
        const results = {
          events: [] as string[],
          contacts: [] as string[],
          entities: [] as string[],
          relationships: 0,
        };

        // Create contacts first
        for (const contactData of SAMPLE_CONTACTS) {
          // Filter out undefined properties
          const props: Record<string, string> = {
            name: contactData.name,
          };
          if (contactData.email) props.email = contactData.email.toLowerCase();
          if (contactData.organization) props.organization = contactData.organization;

          const node = await createNode<ContactNode>(client, NodeLabel.Contact, props as Omit<ContactNode, "id" | "createdAt">);
          results.contacts.push(node.id);
        }

        // Create events
        for (const eventData of SAMPLE_EVENTS) {
          const node = await createNode<EventNode>(client, NodeLabel.Event, {
            name: eventData.name,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            location: eventData.location,
            description: eventData.description,
          } as Omit<EventNode, "id" | "createdAt">);
          results.events.push(node.id);
        }

        // Skip Entity creation for now due to 'type' property issue with Neo4j
        // Entities can be created separately with /api/test/inject/entities
        // for (const entityData of SAMPLE_ENTITIES) { ... }

        // Optionally create relationships
        if (withRelationships) {
          // Event 1 attended by Sarah
          if (results.events[0] && results.contacts[0]) {
            await createRelationship(client, results.events[0], results.contacts[0], RelationshipType.ATTENDED_BY);
            results.relationships++;
          }

          // Event 2 attended by Sarah
          if (results.events[1] && results.contacts[0]) {
            await createRelationship(client, results.events[1], results.contacts[0], RelationshipType.ATTENDED_BY);
            results.relationships++;
          }

          // Event 3 attended by John
          if (results.events[2] && results.contacts[1]) {
            await createRelationship(client, results.events[2], results.contacts[1], RelationshipType.ATTENDED_BY);
            results.relationships++;
          }
        }

        return {
          success: true,
          created: {
            events: results.events.length,
            contacts: results.contacts.length,
            entities: results.entities.length,
            relationships: results.relationships,
          },
          nodeIds: {
            events: results.events,
            contacts: results.contacts,
            entities: results.entities,
          },
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to inject scenario",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        withRelationships: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * Clear all test data from the graph
   *
   * DELETE /api/test/clear
   *
   * WARNING: This deletes ALL nodes and relationships!
   */
  .delete(
    "/clear",
    async ({ query, set }) => {
      const { confirm } = query;

      if (confirm !== "yes-delete-all") {
        set.status = 400;
        return {
          error: "Confirmation required",
          message: "Add ?confirm=yes-delete-all to confirm deletion",
        };
      }

      const client = getTestClient();

      try {
        // Delete all nodes and relationships
        await client.query("MATCH (n) DETACH DELETE n");

        return {
          success: true,
          message: "All nodes and relationships deleted",
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to clear data",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      query: t.Object({
        confirm: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Call MCP tool directly (bypasses auth for testing)
   *
   * POST /api/test/mcp/tool
   */
  .post(
    "/mcp/tool",
    async ({ body, set }) => {
      const { tool, args } = body;
      const client = getTestClient();

      try {
        // Import tool handlers
        const { getToolHandler, TOOL_DEFINITIONS } = await import("../mcp/tools");

        // Get list of available tools if requested
        if (tool === "list") {
          return {
            tools: TOOL_DEFINITIONS.map((t) => ({
              name: t.name,
              description: t.description,
            })),
          };
        }

        const handler = getToolHandler(tool);
        if (!handler) {
          set.status = 404;
          return {
            error: "Tool not found",
            availableTools: TOOL_DEFINITIONS.map((t) => t.name),
          };
        }

        // Call the tool with a test user ID
        const testUserId = "test-user-" + Date.now();
        const result = await handler(client, args || {}, testUserId);

        return {
          tool,
          result,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Tool execution failed",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        tool: t.String(),
        args: t.Optional(t.Any()),
      }),
    }
  )

  /**
   * Get graph statistics
   *
   * GET /api/test/stats
   */
  .get("/stats", async ({ set }) => {
    const client = getTestClient();

    try {
      const result = await client.query(`
        MATCH (n)
        WITH labels(n) AS labels, count(*) AS count
        UNWIND labels AS label
        RETURN label, sum(count) AS nodeCount
        ORDER BY nodeCount DESC
      `);

      const relResult = await client.query(`
        MATCH ()-[r]->()
        RETURN type(r) AS type, count(r) AS count
        ORDER BY count DESC
      `);

      // Parse results
      const nodes: Record<string, number> = {};
      if (result.data?.values) {
        for (const row of result.data.values) {
          nodes[row[0] as string] = row[1] as number;
        }
      }

      const relationships: Record<string, number> = {};
      if (relResult.data?.values) {
        for (const row of relResult.data.values) {
          relationships[row[0] as string] = row[1] as number;
        }
      }

      return {
        nodes,
        relationships,
        totalNodes: Object.values(nodes).reduce((a, b) => a + b, 0),
        totalRelationships: Object.values(relationships).reduce((a, b) => a + b, 0),
      };
    } catch (error) {
      set.status = 500;
      return {
        error: "Failed to get stats",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  })

  /**
   * Check/Create vector index for semantic search
   *
   * GET /api/test/vector-index
   * POST /api/test/vector-index (create)
   * DELETE /api/test/vector-index (drop)
   */
  .get("/vector-index", async ({ set }) => {
    const client = getTestClient();

    try {
      const status = await checkVectorIndex(client);
      return {
        exists: status !== null,
        status,
      };
    } catch (error) {
      set.status = 500;
      return {
        error: "Failed to check vector index",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  })

  .post("/vector-index", async ({ set }) => {
    const client = getTestClient();

    try {
      const created = await createVectorIndex(client);
      const status = await checkVectorIndex(client);
      return {
        success: true,
        created,
        status,
      };
    } catch (error) {
      set.status = 500;
      return {
        error: "Failed to create vector index",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  })

  .delete("/vector-index", async ({ set }) => {
    const client = getTestClient();

    try {
      const dropped = await dropVectorIndex(client);
      return {
        success: true,
        dropped,
      };
    } catch (error) {
      set.status = 500;
      return {
        error: "Failed to drop vector index",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  })

  /**
   * Generate embeddings for all Entity nodes without embeddings
   *
   * POST /api/test/generate-embeddings
   */
  .post("/generate-embeddings", async ({ set }) => {
    const client = getTestClient();

    try {
      // Find all Entity nodes without embeddings
      const result = await client.query(`
        MATCH (n:Entity)
        WHERE n.embedding IS NULL
        RETURN n.id AS id, n.name AS name, n.description AS description
      `);

      if (!result.data?.values || result.data.values.length === 0) {
        return {
          success: true,
          message: "No entities need embeddings",
          processed: 0,
        };
      }

      const fields = result.data.fields;
      const idIndex = fields.indexOf("id");
      const nameIndex = fields.indexOf("name");
      const descIndex = fields.indexOf("description");

      const processed: string[] = [];
      const errors: string[] = [];

      for (const row of result.data.values) {
        const id = row[idIndex] as string;
        const name = row[nameIndex] as string;
        const description = row[descIndex] as string | null;

        // Build text for embedding
        const textForEmbedding = description ? `${name}: ${description}` : name;

        try {
          const embedding = await generateEmbedding(textForEmbedding);

          // Update the node with the embedding
          await client.query(
            `MATCH (n:Entity {id: $id}) SET n.embedding = $embedding`,
            { id, embedding }
          );

          processed.push(id);
        } catch (err) {
          errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        success: true,
        processed: processed.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      set.status = 500;
      return {
        error: "Failed to generate embeddings",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  })

  /**
   * Test text-based search directly (bypasses vector search)
   *
   * POST /api/test/text-search
   */
  .post(
    "/text-search",
    async ({ body, set }) => {
      const { query, nodeTypes, limit = 10 } = body;
      const client = getTestClient();

      try {
        const { textBasedSearch } = await import("../graph/operations/search");
        const results = await textBasedSearch(client, query, {
          limit,
          nodeTypes: nodeTypes as any,
        });

        return {
          query,
          nodeTypes,
          resultCount: results.length,
          results: results.map((r) => ({
            id: r.id,
            name: r.name,
            labels: r.labels,
            score: r.score.toFixed(3),
          })),
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Text search failed",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        query: t.String(),
        nodeTypes: t.Optional(t.Array(t.String())),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 50 })),
      }),
    }
  )

  /**
   * Embed all nodes (not just Entity) for semantic search testing
   *
   * POST /api/test/embed-all-nodes
   */
  .post("/embed-all-nodes", async ({ set }) => {
    const client = getTestClient();

    try {
      // Find all nodes without embeddings (Contact, Event, Entity)
      const result = await client.query(`
        MATCH (n)
        WHERE (n:Contact OR n:Event OR n:Entity) AND n.embedding IS NULL
        RETURN n.id AS id, n.name AS name, n.description AS description, labels(n) AS labels
      `);

      if (!result.data?.values || result.data.values.length === 0) {
        return {
          success: true,
          message: "No nodes need embeddings",
          processed: 0,
        };
      }

      const fields = result.data.fields;
      const idIndex = fields.indexOf("id");
      const nameIndex = fields.indexOf("name");
      const descIndex = fields.indexOf("description");
      const labelsIndex = fields.indexOf("labels");

      const processed: Array<{ id: string; labels: string[] }> = [];
      const errors: string[] = [];

      for (const row of result.data.values) {
        const id = row[idIndex] as string;
        const name = row[nameIndex] as string;
        const description = row[descIndex] as string | null;
        const labels = row[labelsIndex] as string[];

        // Build text for embedding
        const textForEmbedding = description ? `${name}: ${description}` : name;

        try {
          const embedding = await generateEmbedding(textForEmbedding);

          // Update the node with the embedding
          await client.query(
            `MATCH (n {id: $id}) SET n.embedding = $embedding`,
            { id, embedding }
          );

          processed.push({ id, labels });
        } catch (err) {
          errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        success: true,
        processed: processed.length,
        nodes: processed,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      set.status = 500;
      return {
        error: "Failed to embed nodes",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  });
