/**
 * Data Ingestion Routes
 *
 * Handles Google OAuth connection and data sync operations.
 * Uses Composio for OAuth abstraction and credential management.
 */

import { Elysia, t } from "elysia";
import { getComposioClient } from "../../ingestion/composio-client";

/**
 * Google service to Composio integration mapping
 */
const GOOGLE_INTEGRATIONS: Record<string, string> = {
  calendar: "googlecalendar",
  tasks: "googletasks",
  gmail: "gmail",
  contacts: "googlecontacts",
};

/** Service type for type-safe body parsing */
type GoogleService = "calendar" | "tasks" | "gmail" | "contacts";

/** Connect request body type */
interface ConnectBody {
  service: GoogleService;
  userId: string;
  redirectUrl?: string;
}

/** Disconnect request body type */
interface DisconnectBody {
  service: GoogleService;
  userId: string;
}

/**
 * Ingestion routes for OAuth and sync management
 */
export const ingestionRoutes = new Elysia({ prefix: "/ingestion" })
  /**
   * Initiate Google OAuth connection
   *
   * POST /api/ingestion/connect
   * Body: { service: "calendar" | "tasks" | "gmail" | "contacts", redirectUrl?: string }
   *
   * Returns redirect URL for user to authorize Google account.
   * After authorization, Composio stores credentials securely.
   */
  .post(
    "/connect",
    async ({ body, set }) => {
      const { service, userId, redirectUrl } = body as ConnectBody;

      const integration = GOOGLE_INTEGRATIONS[service];
      if (!integration) {
        set.status = 400;
        return {
          error: "Invalid service",
          validServices: Object.keys(GOOGLE_INTEGRATIONS),
        };
      }

      try {
        const composio = getComposioClient();

        // Initiate OAuth connection via Composio
        // The entityId should be the user's ID for per-user connections
        const connectionRequest = await composio.getEntity(userId).initiateConnection({
          appName: integration,
          redirectUri: redirectUrl || `${process.env.MCP_BASE_URL}/api/ingestion/callback`,
        });

        return {
          success: true,
          redirectUrl: connectionRequest.redirectUrl,
          connectedAccountId: connectionRequest.connectedAccountId,
          message: `Redirect user to authorize ${service} access`,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to initiate OAuth connection",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        service: t.Union([
          t.Literal("calendar"),
          t.Literal("tasks"),
          t.Literal("gmail"),
          t.Literal("contacts"),
        ]),
        userId: t.String({ minLength: 1 }),
        redirectUrl: t.Optional(t.String()),
      }),
    }
  )

  /**
   * OAuth callback handler
   *
   * GET /api/ingestion/callback
   *
   * Composio redirects here after user authorizes.
   * We verify the connection and redirect to success page.
   */
  .get(
    "/callback",
    async ({ query, set }) => {
      // Composio handles token exchange automatically
      // We just need to acknowledge and redirect user
      const { connection_id, status, error: errorParam } = query as {
        connection_id?: string;
        status?: string;
        error?: string;
      };

      if (status === "success" && connection_id) {
        // Redirect to success page or return success response
        set.redirect = `${process.env.MCP_BASE_URL || ""}/connection-success?id=${connection_id}`;
        return;
      }

      // Handle failure
      set.redirect = `${process.env.MCP_BASE_URL || ""}/connection-failed?error=${errorParam || "unknown"}`;
    },
    {
      query: t.Object({
        connection_id: t.Optional(t.String()),
        status: t.Optional(t.String()),
        error: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Check connection status for a user
   *
   * GET /api/ingestion/status/:userId
   *
   * Returns which Google services are connected for the user.
   */
  .get(
    "/status/:userId",
    async ({ params, set }) => {
      const { userId } = params as { userId: string };

      try {
        const composio = getComposioClient();
        const entity = composio.getEntity(userId);

        // Check connection status for each Google service
        const connections = await Promise.all(
          Object.entries(GOOGLE_INTEGRATIONS).map(async ([service, integration]) => {
            try {
              const connection = await entity.getConnection({ app: integration });
              return {
                service,
                connected: connection?.status === "ACTIVE",
                connectionId: connection?.id,
              };
            } catch {
              return {
                service,
                connected: false,
                connectionId: null,
              };
            }
          })
        );

        return {
          userId,
          connections,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to get connection status",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      params: t.Object({
        userId: t.String({ minLength: 1 }),
      }),
    }
  )

  /**
   * Disconnect a Google service
   *
   * DELETE /api/ingestion/disconnect
   *
   * Removes OAuth connection for a specific service.
   */
  .delete(
    "/disconnect",
    async ({ body, set }) => {
      const { service, userId } = body as DisconnectBody;

      const integration = GOOGLE_INTEGRATIONS[service];
      if (!integration) {
        set.status = 400;
        return {
          error: "Invalid service",
          validServices: Object.keys(GOOGLE_INTEGRATIONS),
        };
      }

      try {
        const composio = getComposioClient();
        const entity = composio.getEntity(userId);

        // Get and delete the connection
        const connection = await entity.getConnection({ app: integration });
        if (connection) {
          await composio.connectedAccounts.delete({ connectedAccountId: connection.id });
        }

        return {
          success: true,
          message: `${service} disconnected successfully`,
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to disconnect service",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        service: t.Union([
          t.Literal("calendar"),
          t.Literal("tasks"),
          t.Literal("gmail"),
          t.Literal("contacts"),
        ]),
        userId: t.String({ minLength: 1 }),
      }),
    }
  );
