/**
 * SyncContext - React Context for PowerSync Sync State
 *
 * Manages PowerSync lifecycle and exposes sync state to all components.
 *
 * Features:
 * - Initializes PowerSync when user is authenticated
 * - Cleans up when user logs out
 * - Provides sync status, connection state, and actions
 * - Wraps children with PowerSyncContext when database is ready
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/react-native';
import {
  getPowerSync,
  resetPowerSync,
} from '~/lib/powersync';
import {
  getConnector,
  resetConnector,
} from '~/lib/powersync/connector';
import { useAuth } from './AuthContext';

/**
 * Sync status values
 */
export type SyncStatus =
  | 'offline'
  | 'connecting'
  | 'syncing'
  | 'synced'
  | 'error';

/**
 * Sync state interface
 */
export interface SyncState {
  /** Whether PowerSync database is initialized */
  isInitialized: boolean;
  /** Whether connected to sync backend */
  isConnected: boolean;
  /** Whether actively syncing data */
  isSyncing: boolean;
  /** Current sync status */
  status: SyncStatus;
  /** Number of pending local changes */
  pendingChanges: number;
  /** Last successful sync timestamp */
  lastSyncedAt: Date | null;
  /** Error message if status is 'error' */
  error: string | null;
}

/**
 * Sync context value with state and actions
 */
interface SyncContextValue extends SyncState {
  /** Trigger a manual sync with the backend */
  triggerSync: () => Promise<void>;
  /** Disconnect from sync backend */
  disconnect: () => Promise<void>;
  /** Clear local data and reconnect (for troubleshooting) */
  clearAndReconnect: () => Promise<void>;
}

const defaultSyncState: SyncState = {
  isInitialized: false,
  isConnected: false,
  isSyncing: false,
  status: 'offline',
  pendingChanges: 0,
  lastSyncedAt: null,
  error: null,
};

const SyncStateContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
}

/**
 * SyncProvider - Manages PowerSync lifecycle based on auth state
 *
 * Must be used inside AuthProvider (depends on useAuth hook).
 */
export const SyncProvider = ({ children }: SyncProviderProps) => {
  const { user, isInitialized: authInitialized } = useAuth();
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(defaultSyncState);

  // Initialize PowerSync when user is authenticated
  useEffect(() => {
    if (!authInitialized) return;

    let mounted = true;

    const initialize = async () => {
      if (!user) {
        // User logged out - cleanup
        if (db) {
          console.log('[SyncProvider] User logged out, cleaning up PowerSync');
          await resetPowerSync();
          resetConnector();
          setDb(null);
          setSyncState(defaultSyncState);
        }
        return;
      }

      try {
        setSyncState((prev) => ({
          ...prev,
          status: 'connecting',
          error: null,
        }));

        const database = getPowerSync();
        await database.init();

        if (!mounted) return;

        // Set up status listener
        database.registerListener({
          statusChanged: (status) => {
            if (!mounted) return;

            const isUploading = status.dataFlowStatus?.uploading ?? false;
            const isDownloading = status.dataFlowStatus?.downloading ?? false;
            const isConnected = status.connected ?? false;

            const newStatus: SyncStatus =
              isUploading || isDownloading
                ? 'syncing'
                : isConnected
                  ? 'synced'
                  : 'offline';

            setSyncState((prev) => ({
              ...prev,
              isConnected,
              isSyncing: isUploading || isDownloading,
              status: newStatus,
              lastSyncedAt: status.lastSyncedAt
                ? new Date(status.lastSyncedAt)
                : null,
            }));
          },
        });

        // Connect with our connector
        const connector = getConnector();
        await database.connect(connector);

        if (!mounted) return;

        setDb(database);
        setSyncState((prev) => ({
          ...prev,
          isInitialized: true,
          isConnected: true,
          status: 'synced',
        }));

        console.log('[SyncProvider] PowerSync initialized and connected');
      } catch (error: any) {
        console.error('[SyncProvider] Initialization error:', error);
        if (mounted) {
          setSyncState((prev) => ({
            ...prev,
            isInitialized: true,
            status: 'error',
            error: error.message,
          }));
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [authInitialized, user?.id]);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    if (!db) return;

    try {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: true,
        status: 'syncing',
      }));

      // Use connector to fetch changes from backend
      const connector = getConnector();
      const lastSync = syncState.lastSyncedAt?.toISOString() || null;
      const result = await connector.fetchChanges(lastSync);

      // Apply changes to local database
      for (const [table, records] of Object.entries(result.changes)) {
        for (const record of records as Record<string, unknown>[]) {
          const keys = Object.keys(record).filter((k) => k !== 'id');
          const values = keys.map((k) => record[k]);

          await db.execute(
            `INSERT OR REPLACE INTO ${table} (id, ${keys.join(', ')})
             VALUES (?, ${keys.map(() => '?').join(', ')})`,
            [record.id, ...values]
          );
        }
      }

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        status: 'synced',
        lastSyncedAt: new Date(result.timestamp),
      }));

      console.log('[SyncProvider] Manual sync complete');
    } catch (error: any) {
      console.error('[SyncProvider] Sync error:', error);
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        status: 'error',
        error: error.message,
      }));
    }
  }, [db, syncState.lastSyncedAt]);

  // Disconnect from sync backend
  const disconnect = useCallback(async () => {
    if (db) {
      await db.disconnect();
      setSyncState((prev) => ({
        ...prev,
        isConnected: false,
        status: 'offline',
      }));
      console.log('[SyncProvider] Disconnected');
    }
  }, [db]);

  // Clear data and reconnect (for troubleshooting)
  const clearAndReconnect = useCallback(async () => {
    console.log('[SyncProvider] Clearing data and reconnecting');
    await resetPowerSync();
    resetConnector();
    setDb(null);
    setSyncState(defaultSyncState);
    // Will re-initialize on next render due to user dependency
  }, []);

  const contextValue: SyncContextValue = {
    ...syncState,
    triggerSync,
    disconnect,
    clearAndReconnect,
  };

  // Render without PowerSync context if not initialized
  if (!db) {
    return (
      <SyncStateContext.Provider value={contextValue}>
        {children}
      </SyncStateContext.Provider>
    );
  }

  // Wrap with PowerSync context when database is ready
  // PowerSyncContext expects the database directly, not { db }
  return (
    <PowerSyncContext.Provider value={db}>
      <SyncStateContext.Provider value={contextValue}>
        {children}
      </SyncStateContext.Provider>
    </PowerSyncContext.Provider>
  );
};

/**
 * Hook to access sync state and actions
 *
 * @throws Error if used outside SyncProvider
 */
export const useSyncState = (): SyncContextValue => {
  const context = useContext(SyncStateContext);
  if (!context) {
    throw new Error('useSyncState must be used within a SyncProvider');
  }
  return context;
};

// Default export for convenience
export default SyncProvider;
