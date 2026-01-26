/**
 * PowerSync Routes
 *
 * HTTP endpoints for PowerSync mobile sync operations.
 * Provides change-based sync, upload handling, and data population from Neo4j.
 */

import { Elysia, t } from "elysia";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Get Supabase admin client (service role for bypassing RLS)
function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.OMNII_SUPABASE_URL;
  const key = process.env.OMNII_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "OMNII_SUPABASE_URL and OMNII_SUPABASE_SERVICE_ROLE_KEY required"
    );
  }

  return createClient(url, key);
}

/**
 * Validate authorization header and extract user ID
 */
async function validateAuth(
  authHeader: string | undefined
): Promise<{ userId: string } | { error: string }> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7);
  const supabaseUrl = process.env.OMNII_SUPABASE_URL;
  const supabaseAnonKey = process.env.OMNII_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase configuration missing" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: "Invalid or expired token" };
  }

  return { userId: user.id };
}

/**
 * Valid table names for sync operations
 */
const VALID_TABLES = ["sync_entities", "sync_events", "sync_relationships"];

/**
 * PowerSync routes for mobile sync operations
 */
export const powerSyncRoutes = new Elysia({ prefix: "/powersync" })
  /**
   * Health check endpoint
   * GET /api/powersync/health
   */
  .get("/health", async ({ headers, set }) => {
    const authResult = await validateAuth(headers.authorization);

    if ("error" in authResult) {
      set.status = 401;
      return { error: "Unauthorized", message: authResult.error };
    }

    return {
      status: "ok",
      userId: authResult.userId,
      timestamp: new Date().toISOString(),
    };
  })

  /**
   * Main sync endpoint - returns changes since last sync timestamp
   * GET /api/powersync/sync?since=<ISO8601>&tables=<comma-separated>&limit=<number>
   *
   * @param since - ISO8601 timestamp, returns changes after this time
   * @param tables - Comma-separated list of tables to sync (default: all)
   * @param limit - Max records per table (default: 1000, max: 5000)
   */
  .get(
    "/sync",
    async ({ query, headers, set }) => {
      const authResult = await validateAuth(headers.authorization);

      if ("error" in authResult) {
        set.status = 401;
        return { error: "Unauthorized", message: authResult.error };
      }

      const { userId } = authResult;
      const { since, tables, limit = "1000" } = query;

      const sinceDate = since ? new Date(since) : new Date(0);
      const tableList = tables
        ? tables.split(",").filter((t) => VALID_TABLES.includes(t))
        : VALID_TABLES;
      const limitNum = Math.min(parseInt(limit, 10) || 1000, 5000);

      const supabaseAdmin = getSupabaseAdmin();
      const changes: Record<string, unknown[]> = {};

      for (const table of tableList) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select("*")
          .eq("user_id", userId)
          .gt("updated_at", sinceDate.toISOString())
          .order("updated_at", { ascending: true })
          .limit(limitNum);

        if (!error && data) {
          changes[table] = data;
        }
      }

      return {
        changes,
        timestamp: new Date().toISOString(),
        hasMore: Object.values(changes).some((arr) => arr.length >= limitNum),
      };
    },
    {
      query: t.Object({
        since: t.Optional(t.String()),
        tables: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get changes since timestamp",
        description:
          "Returns all changes to sync tables since the given timestamp for PowerSync",
      },
    }
  )

  /**
   * Upload endpoint - receive changes from mobile
   * POST /api/powersync/upload
   *
   * Body: { changes: { [table]: [{ type: 'PUT' | 'DELETE', data?: object, id?: string }] } }
   */
  .post(
    "/upload",
    async ({ body, headers, set }) => {
      const authResult = await validateAuth(headers.authorization);

      if ("error" in authResult) {
        set.status = 401;
        return { error: "Unauthorized", message: authResult.error };
      }

      const { userId } = authResult;
      const { changes } = body as { changes: Record<string, unknown[]> };

      const supabaseAdmin = getSupabaseAdmin();
      const results: Record<string, { success: number; errors: string[] }> = {};

      for (const [table, operations] of Object.entries(changes)) {
        // Validate table name
        if (!VALID_TABLES.includes(table)) {
          results[table] = { success: 0, errors: [`Invalid table: ${table}`] };
          continue;
        }

        results[table] = { success: 0, errors: [] };

        for (const op of operations as Array<{
          type: string;
          data?: Record<string, unknown>;
          id?: string;
        }>) {
          try {
            switch (op.type) {
              case "PUT":
                if (op.data) {
                  await supabaseAdmin.from(table).upsert({
                    ...op.data,
                    user_id: userId,
                    updated_at: new Date().toISOString(),
                  });
                  results[table].success++;
                }
                break;
              case "DELETE":
                if (op.id) {
                  await supabaseAdmin
                    .from(table)
                    .delete()
                    .eq("id", op.id)
                    .eq("user_id", userId);
                  results[table].success++;
                }
                break;
              default:
                results[table].errors.push(`Unknown operation type: ${op.type}`);
            }
          } catch (err) {
            results[table].errors.push(
              err instanceof Error ? err.message : String(err)
            );
          }
        }
      }

      return { results, timestamp: new Date().toISOString() };
    },
    {
      body: t.Object({
        changes: t.Record(t.String(), t.Array(t.Any())),
      }),
      detail: {
        summary: "Upload changes from mobile",
        description:
          "Receive PUT and DELETE operations from mobile PowerSync client",
      },
    }
  )

  /**
   * Populate sync tables from Neo4j graph data
   * POST /api/powersync/populate
   *
   * Syncs current Neo4j graph data to Supabase sync tables.
   * Typically called after initial setup or manual refresh.
   */
  .post(
    "/populate",
    async ({ headers, set }) => {
      const authResult = await validateAuth(headers.authorization);

      if ("error" in authResult) {
        set.status = 401;
        return { error: "Unauthorized", message: authResult.error };
      }

      const { userId } = authResult;

      // Import graph services dynamically to avoid circular dependencies
      const { createClientForUser } = await import(
        "../services/neo4j/http-client"
      );

      const supabaseAdmin = getSupabaseAdmin();

      let entitiesSynced = 0;
      let eventsSynced = 0;
      let relationshipsSynced = 0;

      try {
        // Get user's Neo4j client
        let neo4jClient;
        try {
          neo4jClient = await createClientForUser(userId);
        } catch (clientError) {
          set.status = 400;
          return {
            success: false,
            error: "User database not provisioned",
            message:
              clientError instanceof Error
                ? clientError.message
                : String(clientError),
          };
        }

        // 1. Sync Entity nodes (tasks, emails, etc.)
        const entities = await neo4jClient.listNodes("Entity", 500);
        for (const entity of entities) {
          await supabaseAdmin.from("sync_entities").upsert(
            {
              id: entity.id,
              user_id: userId,
              entity_type: entity.properties?.entity_type || "entity",
              name:
                entity.properties?.name ||
                entity.properties?.title ||
                "Unnamed",
              properties: entity.properties || {},
              source_id:
                entity.properties?.google_task_id ||
                entity.properties?.gmail_message_id ||
                entity.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          entitiesSynced++;
        }

        // 2. Sync Contact nodes
        const contacts = await neo4jClient.listNodes("Contact", 500);
        for (const contact of contacts) {
          await supabaseAdmin.from("sync_entities").upsert(
            {
              id: contact.id,
              user_id: userId,
              entity_type: "contact",
              name:
                contact.properties?.name ||
                contact.properties?.email ||
                "Unknown",
              properties: contact.properties || {},
              source_id:
                contact.properties?.google_contact_id || contact.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          entitiesSynced++;
        }

        // 3. Sync Concept nodes
        const concepts = await neo4jClient.listNodes("Concept", 500);
        for (const concept of concepts) {
          await supabaseAdmin.from("sync_entities").upsert(
            {
              id: concept.id,
              user_id: userId,
              entity_type: "concept",
              name: concept.properties?.name || "Unnamed Concept",
              properties: concept.properties || {},
              source_id: concept.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          entitiesSynced++;
        }

        // 4. Sync Event nodes
        const events = await neo4jClient.listNodes("Event", 500);
        for (const event of events) {
          await supabaseAdmin.from("sync_events").upsert(
            {
              id: event.id,
              user_id: userId,
              summary:
                event.properties?.summary ||
                event.properties?.title ||
                "Untitled",
              description: event.properties?.description,
              start_time: event.properties?.start_time,
              end_time: event.properties?.end_time,
              location: event.properties?.location,
              google_event_id: event.properties?.google_event_id,
              attendees: event.properties?.attendees || [],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          eventsSynced++;
        }

        return {
          success: true,
          synced: {
            entities: entitiesSynced,
            events: eventsSynced,
            relationships: relationshipsSynced,
          },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          synced: {
            entities: entitiesSynced,
            events: eventsSynced,
            relationships: relationshipsSynced,
          },
        };
      }
    },
    {
      detail: {
        summary: "Populate sync tables from Neo4j graph",
        description:
          "Copies graph data to Supabase tables for mobile PowerSync",
      },
    }
  );
