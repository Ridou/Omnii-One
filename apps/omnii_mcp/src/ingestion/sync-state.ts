/**
 * Sync State Service
 *
 * Manages persistence of sync tokens and history IDs for incremental sync.
 * Uses Supabase for storage with per-user isolation via RLS.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Sync sources matching the database enum
 */
export type SyncSource =
  | "google_calendar"
  | "google_tasks"
  | "google_gmail"
  | "google_contacts";

/**
 * Sync status matching the database enum
 */
export type SyncStatus = "idle" | "syncing" | "error" | "rate_limited";

/**
 * Sync state record structure
 */
export interface SyncState {
  id: string;
  user_id: string;
  source: SyncSource;
  sync_token: string | null;
  history_id: string | null;
  updated_min: string | null;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  status: SyncStatus;
  error_message: string | null;
  items_synced: number;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating/updating sync state
 */
export interface SyncStateUpdate {
  sync_token?: string | null;
  history_id?: string | null;
  updated_min?: string | null;
  status?: SyncStatus;
  error_message?: string | null;
  items_synced?: number;
  last_sync_at?: string;
  last_successful_sync_at?: string;
}

/**
 * SyncStateService manages sync token persistence for incremental sync.
 *
 * Usage:
 * ```typescript
 * const syncState = new SyncStateService();
 *
 * // Get current sync state for user
 * const state = await syncState.getState(userId, "google_calendar");
 *
 * // Update after successful sync
 * await syncState.updateState(userId, "google_calendar", {
 *   sync_token: nextSyncToken,
 *   status: "idle",
 *   last_successful_sync_at: new Date().toISOString(),
 * });
 *
 * // Clear token on 410 error (expired)
 * await syncState.clearSyncToken(userId, "google_calendar");
 * ```
 */
export class SyncStateService {
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.OMNII_SUPABASE_URL;
    const key = process.env.OMNII_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "OMNII_SUPABASE_URL and OMNII_SUPABASE_SERVICE_ROLE_KEY required for SyncStateService"
      );
    }

    // Use service role key for background job access (bypasses RLS)
    this.supabase = createClient(url, key);
  }

  /**
   * Get sync state for a user and source.
   * Returns null if no sync has occurred yet.
   */
  async getState(
    userId: string,
    source: SyncSource
  ): Promise<SyncState | null> {
    const { data, error } = await this.supabase
      .from("sync_state")
      .select("*")
      .eq("user_id", userId)
      .eq("source", source)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw new Error(`Failed to get sync state: ${error.message}`);
    }

    return data as SyncState | null;
  }

  /**
   * Create or update sync state for a user and source.
   * Uses upsert to handle both create and update in one call.
   */
  async updateState(
    userId: string,
    source: SyncSource,
    updates: SyncStateUpdate
  ): Promise<SyncState> {
    const { data, error } = await this.supabase
      .from("sync_state")
      .upsert(
        {
          user_id: userId,
          source,
          ...updates,
        },
        {
          onConflict: "user_id,source",
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update sync state: ${error.message}`);
    }

    return data as SyncState;
  }

  /**
   * Mark sync as started.
   * Sets status to "syncing" and updates last_sync_at.
   */
  async markSyncStarted(userId: string, source: SyncSource): Promise<void> {
    await this.updateState(userId, source, {
      status: "syncing",
      last_sync_at: new Date().toISOString(),
      error_message: null,
    });
  }

  /**
   * Mark sync as completed successfully.
   * Updates sync token and status.
   */
  async markSyncCompleted(
    userId: string,
    source: SyncSource,
    syncData: {
      syncToken?: string;
      historyId?: string;
      updatedMin?: string;
      itemsSynced: number;
    }
  ): Promise<void> {
    await this.updateState(userId, source, {
      sync_token: syncData.syncToken ?? null,
      history_id: syncData.historyId ?? null,
      updated_min: syncData.updatedMin ?? null,
      status: "idle",
      items_synced: syncData.itemsSynced,
      last_successful_sync_at: new Date().toISOString(),
    });
  }

  /**
   * Mark sync as failed with error.
   */
  async markSyncFailed(
    userId: string,
    source: SyncSource,
    errorMessage: string
  ): Promise<void> {
    await this.updateState(userId, source, {
      status: "error",
      error_message: errorMessage,
    });
  }

  /**
   * Mark sync as rate limited.
   * Background job should wait before retrying.
   */
  async markRateLimited(userId: string, source: SyncSource): Promise<void> {
    await this.updateState(userId, source, {
      status: "rate_limited",
      error_message: "API rate limit exceeded",
    });
  }

  /**
   * Clear sync token to trigger full sync.
   * Used when receiving 410 Gone (Calendar/Contacts) or 404 (Gmail historyId expired).
   */
  async clearSyncToken(userId: string, source: SyncSource): Promise<void> {
    await this.updateState(userId, source, {
      sync_token: null,
      history_id: null,
      updated_min: null,
    });
  }

  /**
   * Get all users with a specific source that need sync.
   * Used by background job scheduler to batch sync operations.
   */
  async getUsersNeedingSync(
    source: SyncSource,
    staleMinutes: number = 15
  ): Promise<string[]> {
    const staleTime = new Date(Date.now() - staleMinutes * 60 * 1000);

    const { data, error } = await this.supabase
      .from("sync_state")
      .select("user_id")
      .eq("source", source)
      .eq("status", "idle")
      .or(`last_sync_at.is.null,last_sync_at.lt.${staleTime.toISOString()}`);

    if (error) {
      throw new Error(`Failed to get users needing sync: ${error.message}`);
    }

    return (data ?? []).map((row) => row.user_id);
  }
}

// Singleton instance
let _syncStateService: SyncStateService | null = null;

/**
 * Get singleton SyncStateService instance.
 */
export function getSyncStateService(): SyncStateService {
  if (!_syncStateService) {
    _syncStateService = new SyncStateService();
  }
  return _syncStateService;
}
