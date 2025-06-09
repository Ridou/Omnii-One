import { mock } from 'bun:test';

export class MockComposioService {
  private mockExecutions: Map<string, any> = new Map();
  private mockTools: Map<string, any> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks() {
    // Mock calendar tool execution
    this.mockExecutions.set('GOOGLECALENDAR_CREATE_EVENT', {
      success: true,
      data: {
        id: 'event-123',
        summary: 'Test Meeting',
        start: { dateTime: '2024-01-15T14:00:00Z' },
        end: { dateTime: '2024-01-15T15:00:00Z' }
      }
    });

    this.mockExecutions.set('GOOGLECALENDAR_LIST_EVENTS', {
      success: true,
      data: {
        items: [
          {
            id: 'event-123',
            summary: 'Test Meeting',
            start: { dateTime: '2024-01-15T14:00:00Z' }
          }
        ]
      }
    });

    // Mock tasks tool execution
    this.mockExecutions.set('GOOGLETASKS_INSERT_TASK', {
      success: true,
      data: {
        id: 'task-123',
        title: 'Test Task',
        status: 'needsAction'
      }
    });

    this.mockExecutions.set('GOOGLETASKS_LIST_TASKS', {
      success: true,
      data: {
        items: [
          {
            id: 'task-123',
            title: 'Test Task',
            status: 'needsAction'
          }
        ]
      }
    });

    // Mock email tool execution
    this.mockExecutions.set('GMAIL_SEND_MESSAGE', {
      success: true,
      data: {
        id: 'msg-123',
        threadId: 'thread-123'
      }
    });

    // Mock contacts tool execution
    this.mockExecutions.set('GOOGLECONTACTS_LIST_CONTACTS', {
      success: true,
      data: {
        connections: [
          {
            resourceName: 'people/123',
            names: [{ displayName: 'Test Contact' }],
            emailAddresses: [{ value: 'test@example.com' }]
          }
        ]
      }
    });
  }

  async executeAction(params: {
    actionName: string;
    requestBody: {
      input: any;
      appName: string;
      authConfig?: any;
    };
  }): Promise<any> {
    console.log(`[MockComposio] Executing ${params.actionName} with auth config:`, !!params.requestBody.authConfig);
    
    const mockResult = this.mockExecutions.get(params.actionName);
    
    if (!mockResult) {
      throw new Error(`Mock not found for action: ${params.actionName}`);
    }

    // Simulate memory enhancement tracking
    return {
      ...mockResult,
      memoryEnhanced: !!params.requestBody.input.memory_context,
      executedWith: {
        actionName: params.actionName,
        input: params.requestBody.input,
        appName: params.requestBody.appName,
        hasCustomAuth: !!params.requestBody.authConfig
      }
    };
  }

  async getTools(params: { actions: string[] }): Promise<any[]> {
    const tools = params.actions.map(action => ({
      type: 'function',
      function: {
        name: action,
        description: `Mock tool for ${action}`,
        parameters: {
          type: 'object',
          properties: {
            input: {
              type: 'object',
              description: 'Tool input parameters'
            }
          }
        }
      }
    }));

    return tools;
  }

  // Helper methods for testing
  setMockResponse(actionName: string, response: any) {
    this.mockExecutions.set(actionName, response);
  }

  getMockExecutions(): string[] {
    return Array.from(this.mockExecutions.keys());
  }

  clearMockExecutions() {
    this.mockExecutions.clear();
    this.setupDefaultMocks();
  }

  // Mock client property for compatibility
  get client() {
    return {
      actions: {
        execute: this.executeAction.bind(this)
      }
    };
  }
}

// Mock OpenAI service for brain analysis
export class MockOpenAIService {
  private mockResponses: Map<string, any> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks() {
    // Default brain analysis response
    this.mockResponses.set('brain_analysis', {
      choices: [{
        message: {
          content: JSON.stringify({
            intent: 'question',
            sentiment: 0.2,
            importance_score: 0.7
          })
        }
      }]
    });

    // Concept extraction response
    this.mockResponses.set('concept_extraction', {
      choices: [{
        message: {
          content: JSON.stringify({
            concepts: ['meeting', 'schedule', 'work', 'calendar']
          })
        }
      }]
    });

    // Enhanced tool response
    this.mockResponses.set('tool_enhancement', {
      choices: [{
        message: {
          content: 'Enhanced response with memory context',
          tool_calls: [{
            function: {
              name: 'GOOGLECALENDAR_CREATE_EVENT',
              arguments: JSON.stringify({
                summary: 'Memory-enhanced meeting',
                description: 'Related to previous conversations about quarterly planning'
              })
            }
          }]
        }
      }]
    });
  }

  async create(params: {
    model: string;
    messages: any[];
    response_format?: any;
    tools?: any[];
    tool_choice?: string;
    max_tokens?: number;
  }): Promise<any> {
    const messageContent = params.messages[params.messages.length - 1]?.content || '';
    
    // Determine which mock response to use based on content
    let mockKey = 'brain_analysis';
    if (messageContent.includes('Extract') && messageContent.includes('concepts')) {
      mockKey = 'concept_extraction';
    } else if (params.tools && params.tools.length > 0) {
      mockKey = 'tool_enhancement';
    }

    const mockResponse = this.mockResponses.get(mockKey);
    
    if (!mockResponse) {
      throw new Error(`Mock OpenAI response not found for key: ${mockKey}`);
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 10));

    return mockResponse;
  }

  // Mock chat completions
  get chat() {
    return {
      completions: {
        create: this.create.bind(this)
      }
    };
  }

  // Helper methods for testing
  setMockResponse(key: string, response: any) {
    this.mockResponses.set(key, response);
  }

  getMockResponses(): string[] {
    return Array.from(this.mockResponses.keys());
  }
}

// Mock Redis cache for testing
export class MockRedisCache {
  private cache: Map<string, any> = new Map();
  private ttl: Map<string, number> = new Map();

  async get(key: string): Promise<any> {
    const value = this.cache.get(key);
    const expiry = this.ttl.get(key);
    
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    
    return value ? JSON.parse(value) : null;
  }

  async setex(key: string, ttlSeconds: number, value: any): Promise<void> {
    this.cache.set(key, JSON.stringify(value));
    this.ttl.set(key, Date.now() + (ttlSeconds * 1000));
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  async flushall(): Promise<void> {
    this.cache.clear();
    this.ttl.clear();
  }

  // Helper methods for testing
  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export mock instances for easy use in tests
export const mockComposio = new MockComposioService();
export const mockOpenAI = new MockOpenAIService();
export const mockRedisCache = new MockRedisCache(); 