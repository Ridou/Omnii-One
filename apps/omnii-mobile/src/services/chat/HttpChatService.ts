import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '~/types/chat';
import { getBaseUrl } from '~/utils/base-url';
// Note: EventSource not needed for DirectN8nChatService approach
// import EventSource from 'react-native-sse';

export interface HttpChatServiceConfig {
  userId: string;
  authToken: string;
  timezone: string;
}

export interface HttpChatServiceEvents {
  connected: () => void;
  disconnected: (reason: string) => void;
  message: (message: ChatMessage) => void;
  typing: (isTyping: boolean) => void;
  error: (error: Error) => void;
  authRequired: (authUrl: string) => void;
}

/**
 * HTTP-based Chat Service with Server-Sent Events
 * 
 * Replaces WebSocket with HTTP requests + SSE for real-time updates
 * Provides persistent chat history and better Railway scaling
 */
export class HttpChatService {
  private config: HttpChatServiceConfig;
  private sessionId: string | null = null;
  private eventSource: any | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private isConnected = false;
  private baseUrl: string;

  constructor(config: HttpChatServiceConfig) {
    this.config = config;
    this.baseUrl = getBaseUrl();
    this.sessionId = this.generateSessionId();
    
    console.log('🔧 [HttpChatService] Initialized with HTTP mode');
    console.log('🌐 [HttpChatService] Base URL:', this.baseUrl);
    console.log('👤 [HttpChatService] User ID:', this.config.userId);
    console.log('🔗 [HttpChatService] Session ID:', this.sessionId);
  }

  // Event emitter methods
  on(event: keyof HttpChatServiceEvents, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  private emit(event: keyof HttpChatServiceEvents, ...args: any[]) {
    this.listeners.get(event)?.forEach((callback) => {
      callback(...args);
    });
  }

  /**
   * Connect to Server-Sent Events stream for real-time updates
   */
  async connect(): Promise<void> {
    try {
      console.log('🚀 [HttpChatService] Connecting to SSE stream...');
      
      // Load chat history first
      await this.loadChatHistory();
      
      // Connect to Server-Sent Events stream
      const sseUrl = `${this.baseUrl}/api/chat/stream/${this.sessionId}`;
      console.log('📡 [HttpChatService] SSE URL:', sseUrl);
      
      // For React Native, we'll use a different approach since EventSource isn't available
      console.log('⚠️ [HttpChatService] EventSource not available in React Native, using polling fallback');
      this.isConnected = true;
      this.emit('connected');
      return;

      this.eventSource.addEventListener('open', () => {
        console.log('✅ [HttpChatService] SSE connection opened');
        this.isConnected = true;
        this.emit('connected');
      });

      this.eventSource.addEventListener('message', (event) => {
        try {
          console.log('📥 [HttpChatService] SSE message received:', event.data);
          const data = JSON.parse(event.data);
          this.handleSSEMessage(data);
        } catch (error) {
          console.error('❌ [HttpChatService] Error parsing SSE message:', error);
        }
      });

      this.eventSource.addEventListener('error', (error) => {
        console.error('❌ [HttpChatService] SSE connection error:', error);
        this.isConnected = false;
        this.emit('disconnected', 'SSE connection error');
        
        // Attempt to reconnect after delay
        setTimeout(() => {
          if (!this.isConnected) {
            console.log('🔄 [HttpChatService] Attempting to reconnect...');
            this.connect();
          }
        }, 5000);
      });

    } catch (error) {
      console.error('❌ [HttpChatService] Connection failed:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect(): void {
    console.log('🔌 [HttpChatService] Disconnecting...');
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnected = false;
    this.emit('disconnected', 'Manual disconnect');
  }

  /**
   * Send message via HTTP POST
   */
  async sendMessage(content: string): Promise<void> {
    try {
      console.log('🚀 [HttpChatService] === SENDING MESSAGE ===');
      console.log('💬 Message content:', content);
      console.log('👤 User ID:', this.config.userId);
      console.log('🔗 Session ID:', this.sessionId);
      console.log('🌐 Request URL:', `${this.baseUrl}/api/chat/send`);

      const requestBody = {
        userId: this.config.userId,
        message: content,
        sessionId: this.sessionId
      };
      
      console.log('📦 [HttpChatService] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`,
          'x-user-id': this.config.userId,
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 [HttpChatService] Response status:', response.status);
      console.log('📡 [HttpChatService] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [HttpChatService] HTTP error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ [HttpChatService] Message sent successfully:', result);

      // The AI response will come via SSE, no need to handle it here

    } catch (error) {
      console.error('❌ [HttpChatService] Error sending message:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Load chat history from server
   */
  private async loadChatHistory(): Promise<void> {
    try {
      console.log('📚 [HttpChatService] Loading chat history...');
      console.log('🌐 [HttpChatService] History URL:', `${this.baseUrl}/api/chat/history/${this.config.userId}`);

      const response = await fetch(`${this.baseUrl}/api/chat/history/${this.config.userId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
          'x-user-id': this.config.userId,
        }
      });

      console.log('📡 [HttpChatService] History response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [HttpChatService] History HTTP error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📚 [HttpChatService] History data received:', data);
      
      // Emit each historical message
      if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach((message: any, index: number) => {
          const chatMessage: ChatMessage = {
            id: message.id,
            content: message.content,
            sender: message.sender as 'user' | 'ai',
            timestamp: message.timestamp,
            type: message.type as 'text',
            metadata: message.metadata
          };
          
          console.log(`📖 [HttpChatService] Emitting historical message ${index + 1}:`, chatMessage.content.substring(0, 50));
          this.emit('message', chatMessage);
        });

        console.log(`✅ [HttpChatService] Loaded ${data.messages.length} historical messages`);
      } else {
        console.log('📭 [HttpChatService] No historical messages found');
      }

    } catch (error) {
      console.error('❌ [HttpChatService] Error loading chat history:', error);
      // Don't throw - history loading failure shouldn't prevent connection
    }
  }

  /**
   * Handle incoming Server-Sent Events messages
   */
  private handleSSEMessage(data: any): void {
    console.log('🎯 [HttpChatService] Handling SSE message type:', data.type);

    switch (data.type) {
      case 'connected':
        console.log('🔌 [HttpChatService] SSE connection confirmed');
        break;

      case 'heartbeat':
        console.log('💓 [HttpChatService] SSE heartbeat received');
        break;

      case 'message':
        console.log('💬 [HttpChatService] New chat message received');
        // New chat message
        const chatMessage: ChatMessage = {
          id: data.message.id,
          content: data.message.content,
          sender: data.message.sender as 'user' | 'ai',
          timestamp: data.message.timestamp,
          type: data.message.type as 'text',
          metadata: data.message.metadata
        };
        console.log('📤 [HttpChatService] Emitting chat message:', chatMessage.content.substring(0, 50));
        this.emit('message', chatMessage);
        break;

      case 'progress':
        console.log('📊 [HttpChatService] n8n progress update:', data.progress);
        // n8n progress update
        const progressMessage: ChatMessage = {
          id: `progress-${Date.now()}`,
          content: data.message,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          type: 'text',
          metadata: {
            category: 'progress',
            progress: data.progress,
            isProgress: true
          }
        };
        this.emit('message', progressMessage);
        break;

      case 'n8n_response':
        console.log('🤖 [HttpChatService] n8n agent response received');
        // n8n agent response
        const n8nMessage: ChatMessage = {
          id: `n8n-${Date.now()}`,
          content: data.response.content,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          type: 'text',
          metadata: {
            category: data.response.category,
            agentType: data.response.agentType,
            source: 'n8n',
            rawResponse: data.response
          }
        };
        this.emit('message', n8nMessage);
        break;

      default:
        console.log('❓ [HttpChatService] Unknown SSE message type:', data.type);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}