/**
 * n8n Agent Swarm Configuration
 * 
 * Configuration for integrating with the deployed n8n Agent Swarm on Railway
 * Provides intelligent routing, retry logic, and fallback mechanisms
 */

export interface N8nAgentConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  fallbackEnabled: boolean;
  enabledAgents: string[];
  healthCheckInterval: number;
  requestLogging: boolean;
  performanceTracking: boolean;
}

export const n8nAgentConfig: N8nAgentConfig = {
  baseUrl: process.env.N8N_AGENT_SWARM_URL || 'https://omnii-agent-swarm-production.up.railway.app',
  timeout: parseInt(process.env.N8N_AGENT_TIMEOUT || '600000'), // 10 minutes (matches n8n timeout)
  retryAttempts: parseInt(process.env.N8N_RETRY_ATTEMPTS || '3'),
  fallbackEnabled: process.env.N8N_FALLBACK_ENABLED !== 'false',
  enabledAgents: (process.env.N8N_ENABLED_AGENTS || 'email,calendar,contact,web,youtube').split(','),
  healthCheckInterval: parseInt(process.env.N8N_HEALTH_CHECK_INTERVAL || '300000'), // 5 minutes
  requestLogging: process.env.N8N_REQUEST_LOGGING !== 'false',
  performanceTracking: process.env.N8N_PERFORMANCE_TRACKING !== 'false',
};

export class N8nConfigManager {
  /**
   * Validate n8n agent configuration
   */
  static validateConfig(): boolean {
    try {
      const config = n8nAgentConfig;
      
      // Validate URL format
      new URL(config.baseUrl);
      
      // Validate timeout ranges
      if (config.timeout < 1000 || config.timeout > 600000) {
        throw new Error('N8N_AGENT_TIMEOUT must be between 1000ms and 600000ms');
      }
      
      // Validate retry attempts
      if (config.retryAttempts < 0 || config.retryAttempts > 10) {
        throw new Error('N8N_RETRY_ATTEMPTS must be between 0 and 10');
      }
      
      // Validate enabled agents
      const validAgents = ['email', 'calendar', 'contact', 'web', 'youtube'];
      const invalidAgents = config.enabledAgents.filter(agent => !validAgents.includes(agent));
      if (invalidAgents.length > 0) {
        throw new Error(`Invalid agents in N8N_ENABLED_AGENTS: ${invalidAgents.join(', ')}`);
      }
      
      console.log('✅ n8n Agent configuration validated successfully');
      console.log(`🤖 Agent Swarm URL: ${config.baseUrl}`);
      console.log(`⏱️ Timeout: ${config.timeout}ms`);
      console.log(`🔄 Retry attempts: ${config.retryAttempts}`);
      console.log(`🛡️ Fallback enabled: ${config.fallbackEnabled}`);
      console.log(`🎯 Enabled agents: ${config.enabledAgents.join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('❌ n8n Agent configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Get the webhook URL for agent requests
   */
  static getWebhookUrl(): string {
    return `${n8nAgentConfig.baseUrl}/webhook/agent-input`;
  }

  /**
   * Check if specific agent is enabled
   */
  static isAgentEnabled(agentType: string): boolean {
    return n8nAgentConfig.enabledAgents.includes(agentType);
  }

  /**
   * Get timeout for specific operation type
   */
  static getTimeoutForOperation(operationType: string): number {
    // Different timeouts for different operation types
    const timeouts = {
      'web_research': 120000, // 2 minutes for web research
      'youtube_search': 60000, // 1 minute for YouTube search
      'smart_email_compose': 180000, // 3 minutes for smart email
      'workflow_automation': 600000, // 10 minutes for complex workflows
      'default': n8nAgentConfig.timeout,
    };
    
    return timeouts[operationType] || timeouts.default;
  }

  /**
   * Get agent priority for request queuing
   */
  static getAgentPriority(agentType: string): 'low' | 'normal' | 'high' {
    const priorities = {
      'web': 'normal',
      'youtube': 'normal', 
      'email': 'high',
      'calendar': 'high',
      'contact': 'normal',
    };
    
    return priorities[agentType] || 'normal';
  }

  /**
   * Check if operation should fallback to local system
   */
  static shouldFallbackToLocal(operationType: string): boolean {
    if (!n8nAgentConfig.fallbackEnabled) return false;
    
    // Operations that have local equivalents
    const fallbackableOperations = [
      'send_email', 'fetch_emails', 'create_draft',
      'list_events', 'create_event',
      'search_contacts', 'get_all_contacts',
    ];
    
    return fallbackableOperations.includes(operationType);
  }

  /**
   * Get configuration object
   */
  static getConfig(): N8nAgentConfig {
    return { ...n8nAgentConfig };
  }
}

// Validate configuration on module load
N8nConfigManager.validateConfig();

// Export singleton instance
export const n8nConfig = N8nConfigManager;
