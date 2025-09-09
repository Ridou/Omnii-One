import { ChatMessage } from '~/types/chat';
import { getBaseUrl } from '~/utils/base-url';

export interface DirectN8nChatServiceConfig {
  userId: string;
  authToken: string;
  timezone: string;
}

export interface DirectN8nChatServiceEvents {
  connected: () => void;
  disconnected: (reason: string) => void;
  message: (message: ChatMessage) => void;
  typing: (isTyping: boolean) => void;
  error: (error: Error) => void;
  authRequired: (authUrl: string) => void;
}

/**
 * Direct n8n Chat Service
 * 
 * Sends all chat messages directly to n8n Agent Swarm
 * This bypasses the executive assistant flow and provides real structured data
 */
export class DirectN8nChatService {
  private config: DirectN8nChatServiceConfig;
  private listeners: Map<string, Set<Function>> = new Map();
  private isConnected = true; // Always connected for HTTP
  private baseUrl: string;

  constructor(config: DirectN8nChatServiceConfig) {
    this.config = config;
    this.baseUrl = getBaseUrl();
    
    console.log('🤖 [DirectN8nChatService] Initialized with direct n8n mode');
    console.log('🌐 [DirectN8nChatService] Base URL:', this.baseUrl);
    console.log('👤 [DirectN8nChatService] User ID:', this.config.userId);
  }

  // Event emitter methods
  on(event: keyof DirectN8nChatServiceEvents, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  private emit(event: keyof DirectN8nChatServiceEvents, ...args: any[]) {
    this.listeners.get(event)?.forEach((callback) => {
      callback(...args);
    });
  }

  /**
   * Connect (immediate for HTTP)
   */
  async connect(): Promise<void> {
    console.log('🚀 [DirectN8nChatService] Connected (HTTP mode)');
    this.isConnected = true;
    this.emit('connected');
    
    // Load welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome-n8n',
      content: "Hello! I'm your AI assistant powered by n8n Agent Swarm. I can help you with emails, calendar, tasks, and more with real-time data. What would you like to do?",
      sender: 'ai',
      timestamp: new Date().toISOString(),
      type: 'text',
      metadata: {
        category: 'n8n_agent_response',
        source: 'welcome'
      }
    };
    
    this.emit('message', welcomeMessage);
  }

  /**
   * Disconnect (no-op for HTTP)
   */
  disconnect(): void {
    console.log('🔌 [DirectN8nChatService] Disconnected');
    this.isConnected = false;
    this.emit('disconnected', 'Manual disconnect');
  }

  /**
   * Send message directly to n8n Agent Swarm
   */
  async sendMessage(content: string): Promise<void> {
    try {
      console.log('🚀 [DirectN8nChatService] === SENDING TO N8N AGENT SWARM ===');
      console.log('💬 Message:', content);
      console.log('👤 User ID:', this.config.userId);

      // Show typing indicator
      this.emit('typing', true);

      // Send directly to n8n via our backend endpoint
      const response = await fetch(`${this.baseUrl}/api/chat/n8n-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`,
          'x-user-id': this.config.userId,
        },
        body: JSON.stringify({
          userId: this.config.userId,
          message: content
        })
      });

      console.log('📡 [DirectN8nChatService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DirectN8nChatService] HTTP error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ [DirectN8nChatService] n8n response:', JSON.stringify(result, null, 2));

      // Stop typing indicator
      this.emit('typing', false);

      // Create chat message from n8n response
      const aiMessage: ChatMessage = {
        id: `n8n-${Date.now()}`,
        content: this.parseN8nContent(result.data?.message),
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'text',
        metadata: {
          category: result.data?.category || 'n8n_agent_response',
          action: result.data?.action || 'n8n_agent_response',
          agentType: result.data?.agentType || 'unknown',
          executionTime: result.data?.executionTime || '0s',
          source: 'n8n',
          rawResponse: result.data?.rawResponse,
          // Parse structured data if available
          componentData: this.parseN8nStructuredData(result.data?.message)
        }
      };

      console.log('📤 [DirectN8nChatService] Emitting AI message:', aiMessage.content.substring(0, 100));
      this.emit('message', aiMessage);

    } catch (error) {
      console.error('❌ [DirectN8nChatService] Error sending message:', error);
      this.emit('typing', false);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Parse n8n content to extract readable message
   */
  private parseN8nContent(rawMessage: string): string {
    try {
      // n8n often returns JSON strings, try to parse and format them
      if (rawMessage.startsWith('[') || rawMessage.startsWith('{')) {
        const parsed = JSON.parse(rawMessage);
        
        if (Array.isArray(parsed) && parsed[0]?.messages) {
          // Email data format
          const emailCount = parsed[0].messages.length;
          return `I found ${emailCount} recent emails in your inbox. Here are the latest messages with their thread IDs for reference.`;
        }
        
        if (parsed.events) {
          // Calendar data format
          const eventCount = parsed.events.length;
          return `I found ${eventCount} events in your calendar. Here are your upcoming schedule items.`;
        }
        
        if (parsed.tasks) {
          // Task data format
          const taskCount = parsed.tasks.length;
          return `I found ${taskCount} tasks. Here's your current task list with priorities and due dates.`;
        }
      }
      
      return rawMessage;
    } catch {
      return rawMessage;
    }
  }

  /**
   * Parse n8n structured data for rich components
   */
  private parseN8nStructuredData(rawMessage: string): any {
    try {
      if (rawMessage.startsWith('[') || rawMessage.startsWith('{')) {
        const parsed = JSON.parse(rawMessage);
        
        if (Array.isArray(parsed) && parsed[0]?.messages) {
          // Email data format - transform to expected structure
          return {
            emails: parsed[0].messages.map((email: any) => ({
              id: email.id,
              threadId: email.threadId,
              subject: `Email Thread ${email.threadId}`,
              from: 'Unknown Sender',
              snippet: `Thread ID: ${email.threadId}`,
              isRead: false,
              timestamp: new Date().toISOString()
            })),
            totalCount: parsed[0].messages.length,
            unreadCount: parsed[0].messages.length,
            hasMore: false
          };
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
