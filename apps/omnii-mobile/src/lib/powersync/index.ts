/**
 * PowerSync Database Factory
 *
 * Provides singleton database instance with OP-SQLite backend
 * for optimal performance on React Native.
 *
 * Usage:
 * ```typescript
 * import { getPowerSync, AppSchema } from '~/lib/powersync';
 *
 * const db = getPowerSync();
 * await db.init();
 * // Use db for queries
 * ```
 */

import { PowerSyncDatabase } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { AppSchema } from './schema';

// Re-export schema and types
export { AppSchema } from './schema';
export type {
  Database,
  EntityType,
  SyncEntity,
  SyncEvent,
  SyncRelationship,
} from './schema';
export { parseProperties, parseAttendees, isEntityType } from './schema';

// Re-export React hooks from @powersync/react
export {
  PowerSyncContext,
  usePowerSync,
  usePowerSyncQuery,
  usePowerSyncWatchedQuery,
  usePowerSyncStatus,
} from '@powersync/react';

// Database filename for SQLite
const DB_FILENAME = 'omnii-powersync.db';

// Singleton database instance
let dbInstance: PowerSyncDatabase | null = null;

/**
 * Get or create the PowerSync database instance.
 *
 * This creates a local SQLite database that PowerSync will sync
 * with the backend. The database persists across app restarts.
 *
 * Note: Call db.init() before using the database.
 * Note: Call db.connect(connector) to enable sync.
 *
 * @returns PowerSyncDatabase instance
 */
export const getPowerSync = (): PowerSyncDatabase => {
  if (dbInstance) {
    return dbInstance;
  }

  // Create database with OP-SQLite for best performance
  dbInstance = new PowerSyncDatabase({
    schema: AppSchema,
    database: new OPSqliteOpenFactory({
      dbFilename: DB_FILENAME,
    }),
  });

  return dbInstance;
};

/**
 * Reset the database instance.
 *
 * Use this for:
 * - User logout (clear local data)
 * - Testing (clean slate between tests)
 * - Error recovery (corrupted database)
 *
 * After calling this, getPowerSync() will create a fresh instance.
 */
export const resetPowerSync = async (): Promise<void> => {
  if (dbInstance) {
    try {
      await dbInstance.disconnectAndClear();
    } catch (error) {
      // Log but don't throw - we're resetting anyway
      console.warn('Error during PowerSync reset:', error);
    }
    dbInstance = null;
  }
};

/**
 * Check if database is initialized and connected.
 *
 * Useful for:
 * - Showing sync status indicators
 * - Conditional rendering of offline-aware components
 * - Debugging sync issues
 *
 * @returns true if database is ready for sync operations
 */
export const isPowerSyncReady = (): boolean => {
  return dbInstance !== null && dbInstance.connected;
};

/**
 * Check if database instance exists (may not be connected).
 *
 * @returns true if database has been initialized
 */
export const isPowerSyncInitialized = (): boolean => {
  return dbInstance !== null;
};

/**
 * Get the current database instance without creating one.
 *
 * Useful for checking state without side effects.
 *
 * @returns PowerSyncDatabase instance or null if not initialized
 */
export const getPowerSyncInstance = (): PowerSyncDatabase | null => {
  return dbInstance;
};
