import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

interface NetworkEvents {
  online: () => void;
  offline: () => void;
  connectionChange: (state: NetInfoState) => void;
}

export class NetworkManager {
  private isOnline = true;
  private unsubscribe?: NetInfoSubscription;
  private listeners: Map<keyof NetworkEvents, Set<Function>> = new Map();
  
  constructor() {
    this.init();
  }
  
  private async init() {
    // Get initial state
    const state = await NetInfo.fetch();
    this.updateConnectionState(state);
    
    // Subscribe to changes
    this.unsubscribe = NetInfo.addEventListener(state => {
      this.updateConnectionState(state);
    });
  }
  
  private updateConnectionState(state: NetInfoState) {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected && state.isInternetReachable !== false;
    
    if (wasOnline !== this.isOnline) {
      this.emit(this.isOnline ? 'online' : 'offline');
    }
    
    this.emit('connectionChange', state);
  }
  
  on(event: keyof NetworkEvents, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  off(event: keyof NetworkEvents, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }
  
  private emit(event: keyof NetworkEvents, ...args: any[]) {
    this.listeners.get(event)?.forEach(callback => callback(...args));
  }
  
  get connected(): boolean {
    return this.isOnline;
  }
  
  async waitForConnection(timeout = 30000): Promise<boolean> {
    if (this.isOnline) return true;
    
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.off('online', onOnline);
        resolve(false);
      }, timeout);
      
      const onOnline = () => {
        clearTimeout(timer);
        this.off('online', onOnline);
        resolve(true);
      };
      
      this.on('online', onOnline);
    });
  }
  
  destroy() {
    this.unsubscribe?.();
    this.listeners.clear();
  }
}