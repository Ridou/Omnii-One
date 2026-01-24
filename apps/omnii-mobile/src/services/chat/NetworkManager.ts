// Stub NetworkManager - NetInfo temporarily disabled to avoid accessibility issues
export class NetworkManager {
  private isOnline = true;
  
  constructor() {
  }
  
  on(event: string, callback: Function) {
    // Stub - do nothing
  }
  
  off(event: string, callback: Function) {
    // Stub - do nothing
  }
  
  get connected(): boolean {
    return this.isOnline;
  }
  
  async waitForConnection(timeout = 30000): Promise<boolean> {
    return true; // Always assume connected in stub mode
  }
  
  destroy() {
    // Stub - do nothing
  }
} 