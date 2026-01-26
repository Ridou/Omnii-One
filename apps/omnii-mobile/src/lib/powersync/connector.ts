/**
 * OmniiConnector - PowerSync Backend Connector
 *
 * Connects PowerSync to the MCP backend for sync operations.
 *
 * Responsibilities:
 * 1. fetchCredentials - Gets Supabase JWT for authentication
 * 2. uploadData - Sends local changes to backend
 * 3. fetchChanges - Custom HTTP polling for changes (instead of WebSocket)
 */

import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';
import { supabase } from '../supabase';
import Constants from 'expo-constants';

// Get MCP backend URL from config
const getMcpBaseUrl = (): string => {
  const url =
    Constants.expoConfig?.extra?.mcpBaseUrl ||
    process.env.EXPO_PUBLIC_MCP_BASE_URL ||
    'http://localhost:3001';
  return url.replace(/\/$/, ''); // Remove trailing slash
};

/**
 * Credentials returned by fetchCredentials
 */
export interface SyncCredentials {
  endpoint: string;
  token: string;
}

/**
 * Result from fetchChanges
 */
export interface ChangesResult {
  changes: Record<string, any[]>;
  timestamp: string;
  hasMore: boolean;
}

/**
 * OmniiConnector - PowerSync backend connector for MCP server
 *
 * Uses the existing Supabase auth token to authenticate
 * with the MCP backend's PowerSync endpoints.
 */
export class OmniiConnector implements PowerSyncBackendConnector {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getMcpBaseUrl();
    console.log('[OmniiConnector] Initialized with base URL:', this.baseUrl);
  }

  /**
   * Get credentials for PowerSync connection.
   *
   * Uses Supabase session token for authentication.
   * PowerSync will call this periodically to refresh credentials.
   */
  async fetchCredentials(): Promise<SyncCredentials> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      console.error(
        '[OmniiConnector] No session for credentials:',
        error?.message
      );
      throw new Error('Not authenticated');
    }

    return {
      endpoint: `${this.baseUrl}/api/powersync`,
      token: session.access_token,
    };
  }

  /**
   * Upload local changes to the backend.
   *
   * PowerSync calls this when there are pending local changes.
   * We batch them and send to the /upload endpoint.
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return; // No pending changes
    }

    try {
      const { endpoint, token } = await this.fetchCredentials();

      // Group operations by table
      const changes: Record<
        string,
        Array<{ type: string; id: string; data?: Record<string, unknown> }>
      > = {};

      for (const op of transaction.crud) {
        const table = op.table;
        if (!changes[table]) {
          changes[table] = [];
        }

        switch (op.op) {
          case UpdateType.PUT:
            changes[table].push({
              type: 'PUT',
              id: op.id,
              data: op.opData,
            });
            break;
          case UpdateType.PATCH:
            changes[table].push({
              type: 'PUT', // Treat PATCH as upsert
              id: op.id,
              data: op.opData,
            });
            break;
          case UpdateType.DELETE:
            changes[table].push({
              type: 'DELETE',
              id: op.id,
            });
            break;
        }
      }

      // Send to backend
      const response = await fetch(`${endpoint}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ changes }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[OmniiConnector] Upload complete:', result);

      // Mark transaction as complete
      await transaction.complete();
    } catch (error) {
      console.error('[OmniiConnector] Upload error:', error);
      // Don't mark complete - PowerSync will retry
      throw error;
    }
  }

  /**
   * Fetch changes from backend (custom implementation)
   *
   * PowerSync's default streaming sync uses WebSockets.
   * Our backend uses HTTP polling, so we implement custom fetch.
   */
  async fetchChanges(lastSyncTimestamp: string | null): Promise<ChangesResult> {
    const { endpoint, token } = await this.fetchCredentials();

    const params = new URLSearchParams();
    if (lastSyncTimestamp) {
      params.set('since', lastSyncTimestamp);
    }

    const response = await fetch(`${endpoint}/sync?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch changes failed: ${response.status}`);
    }

    return response.json();
  }
}

// Singleton connector instance
let connectorInstance: OmniiConnector | null = null;

/**
 * Get or create the connector singleton.
 *
 * @returns OmniiConnector instance
 */
export const getConnector = (): OmniiConnector => {
  if (!connectorInstance) {
    connectorInstance = new OmniiConnector();
  }
  return connectorInstance;
};

/**
 * Reset the connector instance.
 *
 * Call this when user logs out to clear any cached state.
 */
export const resetConnector = (): void => {
  connectorInstance = null;
};
