import { NetworkMonitor, NetworkState, NetworkQuality, getNetworkMonitor } from './network-monitor';
import { AppState, AppStateStatus } from 'react-native';

export type SyncFrequency = 'realtime' | 'frequent' | 'conservative' | 'paused';

export interface AdaptiveSyncConfig {
  // Intervals in milliseconds
  frequentInterval: number;      // Good network: 30s
  conservativeInterval: number;  // Poor network: 5 min
}

const DEFAULT_CONFIG: AdaptiveSyncConfig = {
  frequentInterval: 30_000,       // 30 seconds
  conservativeInterval: 300_000,  // 5 minutes
};

export class AdaptiveSyncController {
  private config: AdaptiveSyncConfig;
  private onSync: () => Promise<void>;
  private currentFrequency: SyncFrequency = 'paused';
  private syncTimer: NodeJS.Timeout | null = null;
  private networkUnsubscribe: (() => void) | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private isAppActive = true;

  constructor(onSync: () => Promise<void>, config: Partial<AdaptiveSyncConfig> = {}) {
    this.onSync = onSync;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    const monitor = getNetworkMonitor();
    monitor.start();

    // Subscribe to network changes
    this.networkUnsubscribe = monitor.subscribe(this.handleNetworkChange);

    // Subscribe to app state (foreground/background)
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    console.log('[AdaptiveSync] Controller started');
  }

  stop(): void {
    this.networkUnsubscribe?.();
    this.appStateSubscription?.remove();
    this.clearSyncTimer();
    this.currentFrequency = 'paused';

    console.log('[AdaptiveSync] Controller stopped');
  }

  getFrequency(): SyncFrequency {
    return this.currentFrequency;
  }

  // Force a sync regardless of frequency
  async forceSync(): Promise<void> {
    console.log('[AdaptiveSync] Forcing sync');
    await this.onSync();
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    this.isAppActive = nextAppState === 'active';

    if (this.isAppActive) {
      // App came to foreground - resume sync
      console.log('[AdaptiveSync] App foregrounded, resuming sync');
      this.adjustSyncBehavior();
    } else {
      // App went to background - pause to save battery
      console.log('[AdaptiveSync] App backgrounded, pausing sync');
      this.clearSyncTimer();
    }
  };

  private handleNetworkChange = (state: NetworkState): void => {
    const newFrequency = this.determineFrequency(state.quality);

    if (newFrequency !== this.currentFrequency) {
      console.log(`[AdaptiveSync] Frequency change: ${this.currentFrequency} -> ${newFrequency}`);
      this.currentFrequency = newFrequency;

      if (this.isAppActive) {
        this.adjustSyncBehavior();
      }
    }
  };

  private determineFrequency(quality: NetworkQuality): SyncFrequency {
    switch (quality) {
      case 'excellent':
        return 'realtime';
      case 'good':
        return 'frequent';
      case 'poor':
        return 'conservative';
      case 'offline':
        return 'paused';
    }
  }

  private adjustSyncBehavior(): void {
    this.clearSyncTimer();

    switch (this.currentFrequency) {
      case 'realtime':
        // For realtime, trigger immediate sync and let PowerSync stream
        console.log('[AdaptiveSync] Realtime mode - triggering sync');
        this.onSync().catch(console.error);
        break;

      case 'frequent':
        console.log(`[AdaptiveSync] Frequent mode - ${this.config.frequentInterval}ms intervals`);
        this.startPolling(this.config.frequentInterval);
        break;

      case 'conservative':
        console.log(`[AdaptiveSync] Conservative mode - ${this.config.conservativeInterval}ms intervals`);
        this.startPolling(this.config.conservativeInterval);
        break;

      case 'paused':
        console.log('[AdaptiveSync] Paused - waiting for connection');
        // Don't sync, just wait for reconnection
        break;
    }
  }

  private startPolling(interval: number): void {
    // Trigger immediate sync
    this.onSync().catch(console.error);

    // Then start interval
    this.syncTimer = setInterval(() => {
      this.onSync().catch(console.error);
    }, interval);
  }

  private clearSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}
