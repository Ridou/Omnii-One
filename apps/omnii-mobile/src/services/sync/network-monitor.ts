import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoStateType;
  quality: NetworkQuality;
  cellularGeneration: string | null;
}

function determineQuality(state: NetInfoState): NetworkQuality {
  if (!state.isConnected || state.isInternetReachable === false) {
    return 'offline';
  }

  if (state.type === 'wifi') {
    return 'excellent';
  }

  if (state.type === 'cellular') {
    const details = state.details as any;
    const generation = details?.cellularGeneration;

    if (generation === '5g' || generation === '4g') {
      return 'good';
    }
    return 'poor';
  }

  // Ethernet or other
  return 'good';
}

function mapToNetworkState(state: NetInfoState): NetworkState {
  const details = state.details as any;

  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
    quality: determineQuality(state),
    cellularGeneration: details?.cellularGeneration ?? null,
  };
}

export class NetworkMonitor {
  private listeners: Set<(state: NetworkState) => void> = new Set();
  private currentState: NetworkState | null = null;
  private unsubscribe: (() => void) | null = null;

  start(): void {
    this.unsubscribe = NetInfo.addEventListener((state) => {
      this.currentState = mapToNetworkState(state);
      this.listeners.forEach((listener) => listener(this.currentState!));
    });

    // Get initial state
    NetInfo.fetch().then((state) => {
      this.currentState = mapToNetworkState(state);
      this.listeners.forEach((listener) => listener(this.currentState!));
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener);

    // Send current state immediately if available
    if (this.currentState) {
      listener(this.currentState);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): NetworkState | null {
    return this.currentState;
  }
}

// Singleton instance
let networkMonitor: NetworkMonitor | null = null;

export function getNetworkMonitor(): NetworkMonitor {
  if (!networkMonitor) {
    networkMonitor = new NetworkMonitor();
  }
  return networkMonitor;
}

// React hook for network state
export function useNetworkState(): NetworkState | null {
  const [state, setState] = useState<NetworkState | null>(null);

  useEffect(() => {
    const monitor = getNetworkMonitor();
    monitor.start();

    const unsubscribe = monitor.subscribe(setState);

    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}
