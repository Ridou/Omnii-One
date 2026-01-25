/**
 * Composio Client Singleton
 *
 * Provides a lazily-initialized Composio client for Google OAuth abstraction.
 * Used across all ingestion services (Calendar, Tasks, Gmail, Contacts).
 */

import { Composio } from "composio-core";

let _client: Composio | null = null;

/**
 * Get the singleton Composio client instance.
 * Creates the client on first use (lazy initialization).
 *
 * @throws Error if COMPOSIO_API_KEY is not set in environment
 * @returns Composio client instance
 */
export function getComposioClient(): Composio {
  if (!_client) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY not set in environment");
    }
    _client = new Composio({ apiKey });
  }
  return _client;
}

/**
 * Type alias for the Composio client.
 * Export for consumers that need to type-hint the client.
 */
export type ComposioClient = Composio;
