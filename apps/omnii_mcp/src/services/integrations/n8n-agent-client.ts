/**
 * n8n Agent Swarm Client
 * 
 * Client service for communicating with the deployed n8n Agent Swarm on Railway
 * Handles request formatting, retry logic, error handling, and response parsing
 */

import { n8nAgentConfig, N8nConfigManager } from '../../config/n8n-agent.config';
import { ExecutionContext } from '../../types/action-planning.types';
import { CachedEntity } from '../../types/entity.types';

export interface N8nAgentRequest {
  message: string;
  user_id: string;
  agent_type?: 'email' | 'calendar' | 'contact' | 'web' | 'youtube' | 'auto';
  context?: {
    userTimezone?: string;
    localDatetime?: string;
    entities?: CachedEntity[];
    rdfInsights?: any;
    executionContext?: Partial<ExecutionContext>;
    brainMemoryContext?: any;
  };
  metadata?: {
    requestId?: string;
    priority?: 'low' | 'normal' | 'high';
    timeout?: number;
    sessionId?: string;
  };
}

export interface N8nAgentResponse {
  success: boolean;
  agent: string;
  action: string;
  result: any;
  execution_time: string;
  error?: string;
  metadata?: {
    operationId?: string;
    tokensUsed?: number;
    confidence?: number;
    requestId?: string;
  };
}

export interface N8nHealthStatus {
  healthy: boolean;
  responseTime: number;
  lastChecked: number;
  error?: string;
}

export class N8nAgentClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private healthStatus: N8nHealthStatus;
  private requestCount: number = 0;
  private lastHealthCheck: number = 0;

  constructor() {
    this.baseUrl = n8nAgentConfig.baseUrl;
    this.timeout = n8nAgentConfig.timeout;
    this.retryAttempts = n8nAgentConfig.retryAttempts;
    this.healthStatus = {
      healthy: true,
      responseTime: 0,
      lastChecked: 0,
    };
    
    console.log(`[N8nAgentClient] 🤖 Initialized with URL: ${this.baseUrl}`);
    console.log(`[N8nAgentClient] ⏱️ Timeout: ${this.timeout}ms, Retries: ${this.retryAttempts}`);
  }

  /**
   * Send request to n8n Agent Swarm with full error handling
   */
  async sendToAgentSwarm(request: N8nAgentRequest): Promise<N8nAgentResponse> {
    const startTime = Date.now();
    console.log(`[N8nAgentClient] 🤖 Sending request to Agent Swarm: "${request.message.substring(0, 50)}..."`);
    console.log(`[N8nAgentClient] 👤 User: ${request.user_id}, Agent: ${request.agent_type || 'auto'}`);
    console.log(`[N8nAgentClient] 📤 Full request:`, JSON.stringify(request, null, 2));
    
    // Validate configuration
    if (!N8nConfigManager.validateConfig()) {
      throw new Error('Invalid n8n agent configuration');
    }
    
    // Check if service is healthy (with cache)
    if (Date.now() - this.lastHealthCheck > n8nAgentConfig.healthCheckInterval) {
      await this.checkHealth();
    }
    
    if (!this.healthStatus.healthy) {
      throw new Error(`n8n Agent service unhealthy: ${this.healthStatus.error}`);
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      // Prepare request with enhanced context
      const enhancedRequest = this.enhanceRequest(request);
      
      const response = await fetch(`${this.baseUrl}/webhook/agent-input`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'omnii-mcp/1.0.0',
          'X-Request-ID': request.metadata?.requestId || this.generateRequestId(),
          'X-User-ID': request.user_id,
        },
        body: JSON.stringify(enhancedRequest),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      const executionTime = Date.now() - startTime;
      
      console.log(`[N8nAgentClient] ✅ Agent Swarm response received from ${result.agent} in ${executionTime}ms`);
      
      // Update health status
      this.updateHealthStatus(true, executionTime);
      this.requestCount++;
      
      return this.parseAgentResponse(result, request.metadata?.requestId);
      
    } catch (error) {
      clearTimeout(timeoutId);
      const executionTime = Date.now() - startTime;
      
      console.error(`[N8nAgentClient] ❌ Agent Swarm request failed after ${executionTime}ms:`, error);
      
      // Update health status
      this.updateHealthStatus(false, executionTime, error.message);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Error('n8n Agent request timeout after 10 minutes');
      }
      
      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Authentication failed - user may need to reconnect Google account');
      }
      
      if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded - please wait before making another request');
      }
      
      throw error;
    }
  }

  /**
   * Execute request with retry logic and exponential backoff
   */
  async executeWithRetry(request: N8nAgentRequest): Promise<N8nAgentResponse> {
    let lastError;
    
    for (let i = 0; i < this.retryAttempts; i++) {
      try {
        return await this.sendToAgentSwarm(request);
      } catch (error) {
        lastError = error;
        
        // Don't retry on auth errors
        if (error.message.includes('Authentication failed') || 
            error.message.includes('401') || 
            error.message.includes('403')) {
          console.log(`[N8nAgentClient] 🚫 Non-retryable auth error: ${error.message}`);
          throw error;
        }
        
        // Don't retry on user input errors
        if (error.message.includes('400')) {
          console.log(`[N8nAgentClient] 🚫 Non-retryable user error: ${error.message}`);
          throw error;
        }
        
        // Don't retry on rate limit errors (should queue instead)
        if (error.message.includes('Rate limit exceeded')) {
          console.log(`[N8nAgentClient] 🚫 Rate limit error: ${error.message}`);
          throw error;
        }
        
        // Exponential backoff for retryable errors
        if (i < this.retryAttempts - 1) {
          const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
          console.log(`[N8nAgentClient] ⏳ Retrying in ${delay}ms (attempt ${i + 1}/${this.retryAttempts})`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    
    console.error(`[N8nAgentClient] ❌ All retry attempts failed for request: ${request.message.substring(0, 50)}...`);
    throw lastError;
  }

  /**
   * Check health of n8n agent service
   */
  async checkHealth(): Promise<N8nHealthStatus> {
    const startTime = Date.now();
    this.lastHealthCheck = startTime;
    
    try {
      // Simple health check with test message
      const testRequest: N8nAgentRequest = {
        message: "Health check - what is 2+2?",
        user_id: "cd9bdc60-35af-4bb6-b87e-1932e96fb354", // Test user
        agent_type: 'auto',
        metadata: {
          requestId: 'health-check',
          priority: 'low',
          timeout: 30000, // 30 second timeout for health checks
        }
      };
      
      const response = await this.sendToAgentSwarm(testRequest);
      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        healthy: response.success,
        responseTime,
        lastChecked: startTime,
        error: response.success ? undefined : response.error,
      };
      
      console.log(`[N8nAgentClient] 💚 Health check ${response.success ? 'passed' : 'failed'} in ${responseTime}ms`);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        healthy: false,
        responseTime,
        lastChecked: startTime,
        error: error.message,
      };
      
      console.log(`[N8nAgentClient] 💔 Health check failed in ${responseTime}ms: ${error.message}`);
    }
    
    return this.healthStatus;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): N8nHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      lastHealthCheck: this.lastHealthCheck,
      healthStatus: this.healthStatus,
      config: {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        retryAttempts: this.retryAttempts,
      }
    };
  }

  /**
   * Enhance request with additional context and metadata
   */
  private enhanceRequest(request: N8nAgentRequest): N8nAgentRequest {
    return {
      ...request,
      context: {
        ...request.context,
        // Add omnii-specific context
        source: 'omnii-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        // Include RDF insights for better agent routing
        semanticAnalysis: request.context?.rdfInsights ? {
          primaryIntent: request.context.rdfInsights.ai_reasoning?.intent_analysis?.primary_intent,
          confidence: request.context.rdfInsights.ai_reasoning?.intent_analysis?.confidence,
          urgencyLevel: request.context.rdfInsights.ai_reasoning?.intent_analysis?.urgency_level,
          extractedConcepts: request.context.rdfInsights.ai_reasoning?.extracted_concepts,
        } : undefined,
      },
      metadata: {
        ...request.metadata,
        requestId: request.metadata?.requestId || this.generateRequestId(),
        timestamp: Date.now(),
        source: 'omnii-websocket',
      }
    };
  }

  /**
   * Parse n8n agent response and ensure proper format
   */
  private parseAgentResponse(response: any, requestId?: string): N8nAgentResponse {
    // Ensure response matches expected n8n agent format
    const parsed: N8nAgentResponse = {
      success: response.success || false,
      agent: response.agent || 'Unknown Agent',
      action: response.action || 'Unknown Action', 
      result: response.result || {},
      execution_time: response.execution_time || '0s',
      error: response.error,
      metadata: {
        ...response.metadata,
        requestId,
        operationId: response.operationId,
        tokensUsed: response.tokensUsed,
        confidence: response.confidence,
      }
    };
    
    // Validate response structure
    if (!parsed.agent || !parsed.action) {
      console.warn(`[N8nAgentClient] ⚠️ Invalid response structure from n8n agent:`, response);
    }
    
    return parsed;
  }

  /**
   * Update health status tracking
   */
  private updateHealthStatus(healthy: boolean, responseTime: number, error?: string): void {
    this.healthStatus = {
      healthy,
      responseTime,
      lastChecked: Date.now(),
      error,
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `n8n-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if n8n agent service is available
   */
  isAvailable(): boolean {
    return this.healthStatus.healthy && 
           (Date.now() - this.lastHealthCheck) < n8nAgentConfig.healthCheckInterval;
  }

  /**
   * Get webhook URL
   */
  getWebhookUrl(): string {
    return N8nConfigManager.getWebhookUrl();
  }
}

// Singleton instance
export const n8nAgentClient = new N8nAgentClient();

// Export types for external use
export type { N8nAgentRequest, N8nAgentResponse, N8nHealthStatus };
