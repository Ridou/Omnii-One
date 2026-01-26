/**
 * SyncContext - React context for PowerSync sync state
 *
 * Manages:
 * - PowerSync database lifecycle (init, connect, disconnect)
 * - Sync state (status, connected, syncing, error)
 * - User authentication integration
 *
 * Usage:
 * ```tsx
 * import { useSyncState } from '~/context/SyncContext';
 *
 * const { status, isSyncing, triggerSync } = useSyncState();
 * ```
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/react-native';
import { getPowerSync, resetPowerSync } from '~/lib/powersync';
import { getConnector, resetConnector } from '~/lib/powersync/connector';
import { useAuth } from './AuthContext';
import { AdaptiveSyncController, useNetworkState, type SyncFrequency, type NetworkState } from '~/services/sync';

// Sync state types
export type SyncStatus = 'offline' | 'connecting' | 'syncing' | 'synced' | 'error';

export interface SyncState {
  isInitialized: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  status: SyncStatus;
  pendingChanges: number;
  lastSyncedAt: Date | null;
  error: string | null;
  networkState: NetworkState | null;
  syncFrequency: SyncFrequency;
}

interface SyncContextValue extends SyncState {
  // Actions
  triggerSync: () => Promise<void>;
  disconnect: () => Promise<void>;
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
  networkState: null,
  syncFrequency: 'paused',
};

const SyncStateContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider = ({ children }: SyncProviderProps) => {
  const { user, isInitialized: authInitialized } = useAuth();
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(defaultSyncState);
  const adaptiveSyncRef = useRef<AdaptiveSyncController | null>(null);
  const networkState = useNetworkState();

  // Initialize PowerSync when user is authenticated
  useEffect(() => {
    if (!authInitialized) return;

    let mounted = true;

    const initialize = async () => {
      if (!user) {
        // User logged out - cleanup
        if (db) {
          try {
            // Stop adaptive sync controller
            adaptiveSyncRef.current?.stop();
            adaptiveSyncRef.current = null;

            await resetPowerSync();
            resetConnector();
          } catch (error) {
            console.warn('[SyncProvider] Cleanup error:', error);
          }
          setDb(null);
          setSyncState(defaultSyncState);
        }
        return;
      }

      try {
        setSyncState((prev) => ({ ...prev, status: 'connecting', error: null }));

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
              lastSyncedAt: status.lastSyncedAt ? new Date(status.lastSyncedAt) : prev.lastSyncedAt,
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

        // Initialize adaptive sync controller
        if (!adaptiveSyncRef.current) {
          adaptiveSyncRef.current = new AdaptiveSyncController(async () => {
            // Trigger PowerSync sync
            const conn = getConnector();
            await database.connect(conn);
          });
          adaptiveSyncRef.current.start();
          console.log('[SyncProvider] AdaptiveSyncController started');
        }

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
      setSyncState((prev) => ({ ...prev, isSyncing: true, status: 'syncing' }));

      // Fetch changes from backend via connector
      const connector = getConnector();
      const lastSync = syncState.lastSyncedAt?.toISOString() || null;
      const result = await connector.fetchChanges(lastSync);

      // Apply changes to local database
      for (const [table, records] of Object.entries(result.changes)) {
        for (const record of records as any[]) {
          const keys = Object.keys(record).filter((k) => k !== 'id');
          const columns = keys.join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map((k) => record[k]);

          await db.execute(
            `INSERT OR REPLACE INTO ${table} (id, ${columns}) VALUES (?, ${placeholders})`,
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

  // Disconnect
  const disconnect = useCallback(async () => {
    if (db) {
      await db.disconnect();
      setSyncState((prev) => ({ ...prev, isConnected: false, status: 'offline' }));
    }
  }, [db]);

  // Clear data and reconnect (for troubleshooting)
  const clearAndReconnect = useCallback(async () => {
    await resetPowerSync();
    resetConnector();
    setDb(null);
    setSyncState(defaultSyncState);
    // Will re-initialize on next render due to user dependency
  }, []);

  const contextValue: SyncContextValue = {
    ...syncState,
    networkState,
    syncFrequency: adaptiveSyncRef.current?.getFrequency() ?? 'paused',
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
  // Note: PowerSyncContext expects AbstractPowerSyncDatabase directly
  return (
    <PowerSyncContext.Provider value={db}>
      <SyncStateContext.Provider value={contextValue}>
        {children}
      </SyncStateContext.Provider>
    </PowerSyncContext.Provider>
  );
};

/**
 * Hook to use sync state
 *
 * @returns SyncContextValue with status, actions, and state
 * @throws Error if used outside SyncProvider
 */
export const useSyncState = (): SyncContextValue => {
  const context = useContext(SyncStateContext);
  if (!context) {
    throw new Error('useSyncState must be used within a SyncProvider');
  }
  return context;
};

// Convenience exports
export default SyncProvider;
