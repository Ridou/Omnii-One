// Mock implementation of UnifiedGoogleManager for testing
export class MockUnifiedGoogleManager {
  async processMessage(message: string, userId: string, timezone?: string, messageHistory?: any, context?: string) {
    console.log(`[MockUnifiedGoogleManager] Processing message: "${message}" for user ${userId}`);
    
    // Return a mock response based on the message
    if (message.toLowerCase().includes('list') && message.toLowerCase().includes('contacts')) {
      return {
        success: true,
        data: {
          contacts: [
            { name: "Eden Chan", email: "edenchan717@gmail.com", phone: null, company: null },
            { name: "Alina Test", email: "alina@example.com", phone: null, company: null },
            { name: "Papi Test", email: "papi@example.com", phone: null, company: null }
          ]
        },
        rawData: [],
        tool: "CONTACTS",
        action: "LIST"
      };
    }
    
    // Default response
    return {
      success: false,
      data: null,
      rawData: null,
      tool: "UNKNOWN",
      action: "UNKNOWN",
      error: "Mock implementation - no matching response"
    };
  }

  async refreshOAuthTokenIfNeeded(userId: string, force: boolean = false) {
    console.log(`[MockUnifiedGoogleManager] Mock refresh OAuth token for user ${userId}`);
    return "mock-oauth-token";
  }
}

// Export a singleton instance
const mockUnifiedGoogleManager = new MockUnifiedGoogleManager();
export default mockUnifiedGoogleManager;