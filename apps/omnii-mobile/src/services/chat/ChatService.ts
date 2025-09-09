import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WebSocketMessage,
  WebSocketMessageType,
  CommandType,
  WebSocketResponse,
  WebSocketResponseStatus,
  PingMessage,
} from '~/types/websocket.types';
import {
  ChatServiceConfig,
  ChatServiceEvents,
  QueuedMessage,
  OutgoingMessage,
  RequestContext,
  PriorityRequest,
  AIProgressStage,
  RequestPriority,
  RequestStatus,
  EnhancedChatServiceEvents,
  RequestResult,
} from '~/types/chat-service.types';
import { 
  isValidUnifiedToolResponse,
  validateUnifiedToolResponse,
  isEmailListData,
  isEmailData,
  isContactListData,
  isContactData,
  isCompleteTaskOverview,
  isTaskListWithTasks,
  isTaskData,
  type UnifiedToolResponse,
  type EmailListData,
  type EmailData,
  type ContactListData,
  type ContactData,
  type CompleteTaskOverview,
  type TaskListWithTasks,
  type TaskData
} from '@omnii/validators';



// ✅ TODO: Will import from local Zod validation file

// Simplified response categories for client-side handling
export enum ResponseCategory {
  TOOL_RESPONSE = 'tool_response', // Server-parsed tool responses
  GENERAL = 'general',
  ERROR = 'error',
  AUTH = 'auth',
  // NEW: Component-specific categories (building off existing TOOL_RESPONSE)
  EMAIL_SINGLE = 'email_single',
  EMAIL_LIST = 'email_list',
  CALENDAR_EVENT = 'calendar_event',
  CALENDAR_LIST = 'calendar_list',
  CONTACT_SINGLE = 'contact_single',
  CONTACT_LIST = 'contact_list',
  TASK_SINGLE = 'task_single',
  TASK_LIST = 'task_list',
  TASK_COMPLETE_OVERVIEW = 'task_complete_overview', // NEW: Complete task overview with all lists and tasks
  
  // n8n Agent categories
  N8N_AGENT_RESPONSE = 'n8n_agent_response',
  AGENT_AUTOMATION = 'agent_automation',
  WEB_RESEARCH = 'web_research',
  YOUTUBE_SEARCH = 'youtube_search',
  WORKFLOW_COORDINATION = 'workflow_coordination',
}

export enum ActionResult {
  SUCCESS = 'success',
  FAILED = 'failed',
  REQUIRES_AUTH = 'requires_auth',
  PROCESSING = 'processing',
}

export class ChatService {
  private ws: WebSocket | null = null;
  private config: ChatServiceConfig;
  private messageQueue: QueuedMessage[] = [];
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();
  private pingSequence = 0;
  
  // Enhanced Multi-Request Support
  private activeRequests: Map<string, RequestContext> = new Map();
  private requestQueue: PriorityRequest[] = [];
  private maxConcurrentRequests = 3;
  private currentProcessingStages: Map<string, AIProgressStage> = new Map();
  
  // Shape of AI - Progress Tracking
  private progressHistory: AIProgressStage[] = [];
  private isProcessingMultipleRequests = false;

  constructor(config: ChatServiceConfig) {
    // ChatService configuration logged for debugging
    this.config = config;
    this.loadQueuedMessages();
    this.loadRequestQueue(); // Enhanced: Load priority request queue
    
    // Enhanced: Setup cleanup interval
    setInterval(() => this.cleanupCompletedRequests(), 60000); // Every minute
    
  }

  // Event emitter methods
  on(event: keyof ChatServiceEvents, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: keyof ChatServiceEvents, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: keyof ChatServiceEvents, ...args: any[]) {
    this.listeners.get(event)?.forEach((callback) => {
      callback(...args);
    });
  }

  async connect(): Promise<void> {
    try {
      const wsUrl = `${this.config.url}?userId=${this.config.userId}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      
    } catch (error) {
      this.emit('error', error as Error);
      this.scheduleReconnect();
    }
  }

  private handleOpen = () => {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');
    // this.startHeartbeat();
    this.processQueuedMessages(); // Legacy queue
    this.processQueuedRequests(); // Enhanced priority queue
  };

  private handleMessage = (event: any) => {
    try {
      console.log('📥 [ChatService] === RECEIVED MESSAGE ===');
      console.log('📦 Raw event data:', event.data);
      
      const data = JSON.parse(event.data);
      console.log('🔍 [ChatService] Parsed data:', JSON.stringify(data, null, 2));

      // Handle ping/pong messages (filter out)
      if (data.data?.pong || data.type === WebSocketMessageType.PONG || 
          data.type === WebSocketMessageType.PING || data.type === 'ping') {
        return;
      }

      // ✅ NEW: Handle enhanced system messages for immediate responses and data updates
      if (data.type === 'system' && data.data?.action) {
        this.handleEnhancedSystemMessage(data);
        return;
      }
      
      // ✅ CRITICAL: First, let's see the exact structure we received

      // ✅ CRITICAL: Test if this looks like UnifiedToolResponse vs legacy format
      
      // ✅ CRITICAL: Check for legacy format indicators

      // ✅ CRITICAL DEBUG: Test validation step by step
      const isValidStep1 = data && typeof data.type === 'string';
      
      const isValidStep2 = isValidStep1 && ['email', 'calendar', 'contact', 'task', 'general'].includes(data.type);
      
      const isValidStep3 = isValidStep2 && typeof data.success === 'boolean';
      
      const isValidStep4 = isValidStep3 && data.data && data.data.ui;
      
      if (isValidStep4) {
      } else {
        if (data.data) {
        } else {
        }
      }

      // Check if this is a UnifiedToolResponse from the server
      const isUnified = this.isUnifiedToolResponse(data);
      
      if (isUnified) {
        this.handleUnifiedToolResponse(data);
        return;
      } else {
      }

      // Handle server response format: { status: "success", data: { message: "..." }, timestamp: ... }
      if (data.status && data.data) {
        const serverResponse: WebSocketResponse = {
          type: WebSocketMessageType.RESPONSE,
          status: data.status === 'success' ? WebSocketResponseStatus.SUCCESS : WebSocketResponseStatus.ERROR,
          data: {
            message: data.data.message || data.data.error || 'Response received',
            metadata: {
              success: data.data.success,
              userId: data.data.userId,
              processedAt: data.data.processedAt,
              ...data.data.metadata
            }
          },
          timestamp: data.timestamp || Date.now()
        };
        
        this.handleResponse(serverResponse);
        return;
      }

      // Handle different message types (fallback)
      if (data.type === WebSocketMessageType.RESPONSE || data.type === 'response') {
        this.handleResponse(data as WebSocketResponse);
      } else if (data.type === WebSocketMessageType.ERROR || data.type === 'error') {
        this.emit('error', new Error(data.error?.message || data.message || 'Unknown error'));
      } else if (data.type === 'message' || data.message) {
        const chatMessage = {
          id: Date.now().toString(),
          content: data.message || JSON.stringify(data),
          sender: 'ai' as const,
          timestamp: new Date().toISOString(),
          type: 'text' as const,
          metadata: { rawResponse: data },
        };
        this.emit('message', chatMessage);
      } else {
        
        if (data.message || data.data?.message) {
          const chatMessage = {
            id: Date.now().toString(),
            content: data.message || data.data?.message || 'Received response',
            sender: 'ai' as const,
            timestamp: new Date().toISOString(),
            type: 'text' as const,
            metadata: { rawResponse: data },
          };
          this.emit('message', chatMessage);
        }
      }
    } catch (error) {
      
      this.emit('error', new Error('Failed to parse WebSocket message'));
    }
  };

  // New method to check if response is UnifiedToolResponse
  private isUnifiedToolResponse(data: any): data is UnifiedToolResponse {
    // Use the detailed validation function that provides step-by-step debugging
    return isValidUnifiedToolResponse(data);
  }

  // New method to handle UnifiedToolResponse
  private handleUnifiedToolResponse(response: UnifiedToolResponse) {
    
    // NEW: Log structured data details for email responses
    if (response.type === 'email' && response.data.structured) {
      
      if ('emails' in response.data.structured) {
        const emailList = response.data.structured;
        
        if (emailList.emails && emailList.emails.length > 0) {
        
          
          // Enhanced field statistics calculated for email processing
        }
      }
    }

    // Unified response details logged for debugging

    // Check if OAuth is required
    if (response.authRequired && response.authUrl) {
      this.emit('authRequired', response.authUrl);
      return;
    }

    // Transform unified response to chat message
    const chatMessage = this.transformUnifiedResponse(response);
    
    // NEW: Log component data details for email
    if (chatMessage.metadata?.componentData && 'emails' in chatMessage.metadata.componentData) {
    }
    
    this.emit('message', chatMessage);
  }

  // Transform UnifiedToolResponse to chat message format
  private transformUnifiedResponse(response: UnifiedToolResponse) {
    const { data: { ui }, success, type, message } = response;


    // ✅ PHASE 2: Validate email data if present using static validation
    if (response.type === 'email' && response.data.structured) {
      if (isEmailListData(response.data.structured)) {
      } else if (isEmailData(response.data.structured)) {
      } else {
      }
    }

    // Use the server-parsed UI data directly
    const content = this.formatUnifiedContent(response);
    
    // ✅ PHASE 2: Static category detection based on structured data
    const category = this.detectComponentCategory(response);
    
    // ✅ PHASE 2: Log what we're setting as componentData
    if (response.data.structured) {
      
      if (type === 'email' && isEmailListData(response.data.structured)) {
      }
    }
    
    const chatMessage = {
      id: response.id,
      content,
      sender: 'ai' as const,
      timestamp: response.timestamp,
      type: 'unified_tool_response' as const,
      confidence: ui.metadata.confidence,
      sources: ui.metadata.source ? [{
        id: '1',
        name: ui.metadata.source,
        type: 'integration',
        confidence: 90,
      }] : [],
      metadata: {
        category, // ✅ Enhanced static category detection
        result: success ? ActionResult.SUCCESS : ActionResult.FAILED,
        reasoning: ui.metadata,
        context: response.data.structured,
        rawResponse: response.data.raw,
        
        // ✅ PHASE 2: Component data for rich rendering (preserved)
        componentData: response.data.structured, // ✅ Preserve structured data
        componentActions: ui.actions,
        
        // UI-ready data from server
        unifiedResponse: response,
        display: {
          categoryIcon: ui.icon,
          categoryName: ui.metadata.category,
          resultEmoji: success ? '✅' : '❌',
          resultName: success ? 'Completed' : 'Failed',
          hasResponse: true,
          title: ui.title,
          subtitle: ui.subtitle,
          actions: ui.actions,
        },
      },
    };
    
    
    return chatMessage;
  }

  // ✅ PHASE 2: Enhanced category detection based on structured data using static typing
  private detectComponentCategory(response: UnifiedToolResponse): string {
    const { type, data: { structured } } = response;
    
    
    if (!structured) {
      const category = type === 'email' ? ResponseCategory.TOOL_RESPONSE : ResponseCategory.GENERAL;
      return category;
    }
    
    
    // ✅ PHASE 2: Static type-based detection instead of runtime checking
    switch (type) {
      case 'email':
        // Use static type guards instead of runtime property checking
        if (isEmailListData(structured)) {
          return ResponseCategory.EMAIL_LIST;
        } else if (isEmailData(structured)) {
          return ResponseCategory.EMAIL_SINGLE;
        } else {
          return ResponseCategory.EMAIL_SINGLE; // Default for email type
        }
        
      case 'calendar':
        // Static detection for calendar data
        const isCalendarList = structured && 'events' in structured && Array.isArray(structured.events);
        const calendarCategory = isCalendarList ? ResponseCategory.CALENDAR_LIST : ResponseCategory.CALENDAR_EVENT;
        return calendarCategory;
        
      case 'contact':
        // Static detection for contact data using type guards
        if (isContactListData(structured)) {
          return ResponseCategory.CONTACT_LIST;
        } else if (isContactData(structured)) {
          return ResponseCategory.CONTACT_SINGLE;
        } else {
          return ResponseCategory.CONTACT_SINGLE; // Default for contact type
        }
        
      case 'task':
        // ✅ Use Zod type guards for task detection
        if (isCompleteTaskOverview(structured)) {
          return ResponseCategory.TASK_COMPLETE_OVERVIEW;
        } else if (isTaskListWithTasks(structured)) {
          return ResponseCategory.TASK_LIST;
        } else if (isTaskData(structured)) {
          return ResponseCategory.TASK_SINGLE;
        } else {
          return ResponseCategory.TASK_SINGLE; // Default for task type
        }
        
      default:
        return ResponseCategory.GENERAL;
    }
  }

  // Format content from unified response
  private formatUnifiedContent(response: UnifiedToolResponse): string {
    const { data: { ui }, success, type } = response;
    
    // Use server-formatted content with fallback structure
    let content = `${ui.icon} ${ui.title}`;
    
    if (ui.subtitle) {
      content += `\n${ui.subtitle}`;
    }
    
    if (ui.content) {
      content += `\n\n${ui.content}`;
    }
    
    // Add action buttons if available
    if (ui.actions.length > 0) {
      content += '\n\n' + ui.actions.map(action => 
        `• ${action.icon || '▶️'} ${action.label}`
      ).join('\n');
    }
    
    return content;
  }

  private handleResponse(response: WebSocketResponse) {

    // Check if OAuth is required
    if (response.data.requiresAuth && response.data.authUrl) {
      this.emit('authRequired', response.data.authUrl);
      return;
    }

    // Transform to chat message (legacy format)
    const chatMessage = this.transformLegacyResponse(response);
    this.emit('message', chatMessage);
  }

  private transformLegacyResponse(response: WebSocketResponse) {
    // Legacy response handling (simplified since server now does parsing)
    const content = response.data.message || 'Response received';

    return {
      id: Date.now().toString(),
      content,
      sender: 'ai' as const,
      timestamp: new Date().toISOString(),
      type: 'text' as const,
      confidence: 85,
      sources: [],
      metadata: {
        category: ResponseCategory.GENERAL,
        result: response.status === WebSocketResponseStatus.SUCCESS ? ActionResult.SUCCESS : ActionResult.FAILED,
        rawResponse: response.data,
        display: {
          categoryIcon: '💬',
          categoryName: 'General',
          resultEmoji: response.status === WebSocketResponseStatus.SUCCESS ? '✅' : '❌',
          resultName: response.status === WebSocketResponseStatus.SUCCESS ? 'Completed' : 'Failed',
          hasResponse: !!response.data,
        },
      },
    };
  }

  private handleError = (event: Event) => {
    this.emit('error', new Error('WebSocket connection error'));
  };

  private handleClose = (event: any) => {
    this.isConnected = false;
    this.stopHeartbeat();
    this.emit('disconnected', event.reason || 'Connection closed');

    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  };

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const ping: PingMessage = {
          type: WebSocketMessageType.PING,
          payload: {
            userId: this.config.userId,
            sequence: this.pingSequence++,
          },
          timestamp: Date.now(),
        };
        this.ws.send(JSON.stringify(ping));
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  async sendMessage(content: string, metadata?: any): Promise<void> {
    console.log('🚀 [ChatService] === SENDING MESSAGE ===');
    console.log('💬 Content:', content);
    console.log('📋 Metadata:', metadata);
    console.log('🔌 Is Connected:', this.isConnected);
    console.log('🌐 WebSocket URL:', this.config.url);
    console.log('👤 User ID:', this.config.userId);
    
    // Enhanced: Create request with priority
    const requestId = this.generateId();
    const priority = this.determinePriority(content, metadata);
    
    console.log('🆔 Request ID:', requestId);
    console.log('⚡ Priority:', priority);
    
    const request: RequestContext = {
      id: requestId,
      content,
      timestamp: Date.now(),
      priority,
      status: RequestStatus.QUEUED,
      metadata,
    };

    // Add to active requests tracking
    this.activeRequests.set(requestId, request);
    
    // Emit queue update
    this.emitQueueUpdate();

    const message: OutgoingMessage = {
      id: requestId,
      content,
      metadata: {
        ...metadata,
        requestId,
        priority,
      },
      timestamp: Date.now(),
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN && this.canProcessNewRequest()) {
      
      // Update request status
      request.status = RequestStatus.PROCESSING;
      this.activeRequests.set(requestId, request);
      
      // Start progress tracking
      this.startProgressTracking(requestId, content);
      
      const wsMessage: WebSocketMessage = {
        type: WebSocketMessageType.COMMAND,
        payload: {
          commandType: CommandType.TEXT_COMMAND,
          message: content,
          userId: this.config.userId,
          userTimezone: this.config.timezone,
          metadata: message.metadata,
        },
        timestamp: Date.now(),
      };

      console.log('📤 [ChatService] Sending WebSocket message:', JSON.stringify(wsMessage, null, 2));
      this.ws.send(JSON.stringify(wsMessage));
      console.log('✅ [ChatService] WebSocket message sent successfully');
      this.emit('typing', true);
    } else {
      await this.queuePriorityMessage(request);
    }
  }

  // Enhanced: Priority-based queueing
  private async queuePriorityMessage(request: RequestContext): Promise<void> {
    const priorityRequest: PriorityRequest = {
      id: request.id,
      content: request.content,
      priority: request.priority,
      timestamp: request.timestamp,
      metadata: request.metadata,
    };
    
    // Insert based on priority
    const insertIndex = this.requestQueue.findIndex(r => r.priority < priorityRequest.priority);
    if (insertIndex === -1) {
      this.requestQueue.push(priorityRequest);
    } else {
      this.requestQueue.splice(insertIndex, 0, priorityRequest);
    }
    
    await this.saveRequestQueue();
    this.emitQueueUpdate();
  }

  // Enhanced: Determine request priority
  private determinePriority(content: string, metadata?: any): RequestPriority {
    // High priority keywords
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'critical'];
    const highKeywords = ['important', 'deadline', 'meeting', 'schedule'];
    
    const lowerContent = content.toLowerCase();
    
    if (metadata?.priority) {
      return metadata.priority;
    }
    
    if (urgentKeywords.some(keyword => lowerContent.includes(keyword))) {
      return RequestPriority.URGENT;
    }
    
    if (highKeywords.some(keyword => lowerContent.includes(keyword))) {
      return RequestPriority.HIGH;
    }
    
    return RequestPriority.NORMAL;
  }

  // Enhanced: Check if we can process new requests
  private canProcessNewRequest(): boolean {
    const processingCount = Array.from(this.activeRequests.values())
      .filter(req => req.status === RequestStatus.PROCESSING).length;
    return processingCount < this.maxConcurrentRequests;
  }

  // Enhanced: Start progress tracking for a request
  private startProgressTracking(requestId: string, content: string): void {
    const initialStage: AIProgressStage = {
      stage: 'context_analysis',
      percentage: 10,
      details: 'Analyzing your request...',
      timestamp: Date.now(),
      requestId,
    };
    
    this.currentProcessingStages.set(requestId, initialStage);
    this.progressHistory.push(initialStage);
    this.emitProgress(initialStage);
    
    // Simulate progress updates (in real implementation, these would come from WebSocket)
    this.simulateProgressUpdates(requestId);
  }

  // Enhanced: Simulate progress updates (remove in production)
  private simulateProgressUpdates(requestId: string): void {
    const stages: Array<Partial<AIProgressStage>> = [
      { stage: 'context_analysis', percentage: 25, details: 'Context analysis complete...' },
      { stage: 'rdf_processing', percentage: 50, details: 'Processing knowledge graph...' },
      { stage: 'response_generation', percentage: 75, details: 'Generating AI response...' },
      { stage: 'task_creation', percentage: 90, details: 'Creating tasks and updates...' },
    ];
    
    stages.forEach((stageUpdate, index) => {
      setTimeout(() => {
        const currentStage = this.currentProcessingStages.get(requestId);
        if (currentStage) {
          const updatedStage: AIProgressStage = {
            ...currentStage,
            ...stageUpdate,
            timestamp: Date.now(),
          } as AIProgressStage;
          
          this.currentProcessingStages.set(requestId, updatedStage);
          this.progressHistory.push(updatedStage);
          this.emitProgress(updatedStage);
        }
      }, (index + 1) * 1500); // Stagger updates
    });
  }

  // Enhanced: Emit progress updates
  private emitProgress(stage: AIProgressStage): void {
    this.emit('progress' as any, stage);
  }

  // Enhanced: Emit queue updates
  private emitQueueUpdate(): void {
    const activeCount = Array.from(this.activeRequests.values())
      .filter(req => req.status === RequestStatus.PROCESSING).length;
    this.emit('queueUpdate' as any, this.requestQueue.length, activeCount);
  }

  // Enhanced: Save request queue
  private async saveRequestQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('chat_request_queue', JSON.stringify(this.requestQueue));
    } catch (error) {
    }
  }

  // Enhanced: Load request queue
  private async loadRequestQueue(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('chat_request_queue');
      if (data) {
        this.requestQueue = JSON.parse(data);
      }
    } catch (error) {
    }
  }

  // Enhanced: Process queued requests
  private async processQueuedRequests(): Promise<void> {
    while (this.requestQueue.length > 0 && this.canProcessNewRequest() && this.isConnected) {
      const priorityRequest = this.requestQueue.shift()!;
      
      // Convert back to full request context
      const request: RequestContext = {
        ...priorityRequest,
        status: RequestStatus.PROCESSING,
      };
      
      this.activeRequests.set(request.id, request);
      await this.sendMessage(request.content, request.metadata);
    }
    await this.saveRequestQueue();
  }

  // Enhanced: Get current progress for header
  getCurrentProgress(): AIProgressStage | undefined {
    const processingRequests = Array.from(this.currentProcessingStages.values());
    if (processingRequests.length === 0) return undefined;
    
    // Return the latest/highest percentage progress
    return processingRequests.reduce((latest, current) => 
      current.percentage > latest.percentage ? current : latest
    );
  }

  // Enhanced: Get progress history
  getProgressHistory(): AIProgressStage[] {
    return [...this.progressHistory];
  }

  // Enhanced: Clear completed requests
  private cleanupCompletedRequests(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, request] of this.activeRequests.entries()) {
      if (request.status === RequestStatus.COMPLETED && 
          now - request.timestamp > maxAge) {
        this.activeRequests.delete(id);
        this.currentProcessingStages.delete(id);
      }
    }
  }

  private async queueMessage(message: OutgoingMessage): Promise<void> {
    const queuedMessage: QueuedMessage = {
      ...message,
      retryCount: 0,
    };
    this.messageQueue.push(queuedMessage);
    await this.saveQueue();
  }

  private async loadQueuedMessages() {
    try {
      const data = await AsyncStorage.getItem('chat_queue');
      if (data) {
        this.messageQueue = JSON.parse(data);
      }
    } catch (error) {
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem('chat_queue', JSON.stringify(this.messageQueue));
    } catch (error) {
    }
  }

  private async processQueuedMessages() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift()!;
      await this.sendMessage(message.content, message.metadata);
    }
    await this.saveQueue();
  }

  disconnect() {
    this.isConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  get connected(): boolean {
    return this.isConnected;
  }

  // NEW: Helper methods for UI components to extract structured data
  
  /**
   * Extract email list data from a chat message
   * Usage: const emailData = chatService.getEmailListFromMessage(message);
   */
  getEmailListFromMessage(message: any): EmailListData | null {
    
    if (message.metadata?.category === ResponseCategory.EMAIL_LIST && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      
      if (isEmailListData(componentData)) {
        
        return componentData;
      } else {
        return null;
      }
    }
    
    return null;
  }

  /**
   * Extract a single email from a chat message
   * Usage: const emailData = chatService.getSingleEmailFromMessage(message);
   */
  getSingleEmailFromMessage(message: any): EmailData | null {
    if (message.metadata?.category === ResponseCategory.EMAIL_SINGLE && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      
      // Handle single email object
      if (componentData.subject && componentData.from) {
        return componentData as EmailData;
      }
      
      // Handle wrapped single email
      if (componentData.email && componentData.email.subject) {
        return componentData.email as EmailData;
      }
    }
    
    return null;
  }

  /**
   * Check if a message contains email list data
   * Usage: if (chatService.isEmailListMessage(message)) { ... }
   */
  isEmailListMessage(message: any): boolean {
    return message.metadata?.category === ResponseCategory.EMAIL_LIST && 
           !!this.getEmailListFromMessage(message);
  }

  /**
   * Check if a message contains single email data
   * Usage: if (chatService.isSingleEmailMessage(message)) { ... }
   */
  isSingleEmailMessage(message: any): boolean {
    return message.metadata?.category === ResponseCategory.EMAIL_SINGLE && 
           !!this.getSingleEmailFromMessage(message);
  }

  // ✅ NEW: Task-specific helper methods
  
  /**
   * Extract complete task overview data from a chat message
   * Usage: const taskOverview = chatService.getCompleteTaskOverviewFromMessage(message);
   */
  getCompleteTaskOverviewFromMessage(message: any): CompleteTaskOverview | null {
    
    if (message.metadata?.category === ResponseCategory.TASK_COMPLETE_OVERVIEW && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      
      if (isCompleteTaskOverview(componentData)) {
        
        return componentData;
      } else {
        return null;
      }
    }
    
    return null;
  }

  /**
   * Extract task list with tasks from a chat message
   * Usage: const taskList = chatService.getTaskListWithTasksFromMessage(message);
   */
  getTaskListWithTasksFromMessage(message: any): TaskListWithTasks | null {
    if (message.metadata?.category === ResponseCategory.TASK_LIST && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      
      if (isTaskListWithTasks(componentData)) {
        return componentData;
      }
    }
    
    return null;
  }

  /**
   * Extract a single task from a chat message
   * Usage: const task = chatService.getSingleTaskFromMessage(message);
   */
  getSingleTaskFromMessage(message: any): TaskData | null {
    if (message.metadata?.category === ResponseCategory.TASK_SINGLE && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      
      if (isTaskData(componentData)) {
        return componentData;
      }
    }
    
    return null;
  }

  /**
   * Check if a message contains complete task overview data
   * Usage: if (chatService.isCompleteTaskOverviewMessage(message)) { ... }
   */
  isCompleteTaskOverviewMessage(message: any): boolean {
    return message.metadata?.category === ResponseCategory.TASK_COMPLETE_OVERVIEW && 
           !!this.getCompleteTaskOverviewFromMessage(message);
  }

  /**
   * Check if a message contains task list data
   * Usage: if (chatService.isTaskListMessage(message)) { ... }
   */
  isTaskListMessage(message: any): boolean {
    return message.metadata?.category === ResponseCategory.TASK_LIST && 
           !!this.getTaskListWithTasksFromMessage(message);
  }

  /**
   * Check if a message contains single task data
   * Usage: if (chatService.isSingleTaskMessage(message)) { ... }
   */
  isSingleTaskMessage(message: any): boolean {
    return message.metadata?.category === ResponseCategory.TASK_SINGLE && 
           !!this.getSingleTaskFromMessage(message);
  }

  // ✅ NEW: Contact-specific helper methods
  
  /**
   * Extract contact list data from a chat message
   * Usage: const contactData = chatService.getContactListFromMessage(message);
   */
  getContactListFromMessage(message: any): ContactListData | null {
    
    if (message.metadata?.category === ResponseCategory.CONTACT_LIST && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      
      if (isContactListData(componentData)) {
        
        return componentData;
      } else {
        return null;
      }
    }
    
    return null;
  }

  /**
   * Extract a single contact from a chat message
   * Usage: const contactData = chatService.getSingleContactFromMessage(message);
   */
  getSingleContactFromMessage(message: any): ContactData | null {
    if (message.metadata?.category === ResponseCategory.CONTACT_SINGLE && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      
      if (isContactData(componentData)) {
        return componentData;
      }
      
      // Handle wrapped single contact
      if (componentData.contact && isContactData(componentData.contact)) {
        return componentData.contact;
      }
    }
    
    return null;
  }

  /**
   * Check if a message contains contact list data
   * Usage: if (chatService.isContactListMessage(message)) { ... }
   */
  isContactListMessage(message: any): boolean {
    return message.metadata?.category === ResponseCategory.CONTACT_LIST && 
           !!this.getContactListFromMessage(message);
  }

  /**
   * Check if a message contains single contact data
   * Usage: if (chatService.isSingleContactMessage(message)) { ... }
   */
  isSingleContactMessage(message: any): boolean {
    return message.metadata?.category === ResponseCategory.CONTACT_SINGLE && 
           !!this.getSingleContactFromMessage(message);
  }

  // ✅ NEW: tRPC Integration helpers
  
  /**
   * Send a direct tRPC command for tasks overview
   * This bypasses WebSocket and calls tRPC directly
   * Usage: const result = await chatService.sendTasksOverviewCommand();
   */
  async sendTasksOverviewCommand(): Promise<void> {
    // This would integrate with tRPC client directly
    // For now, send through WebSocket with special command
    await this.sendMessage('show my complete task overview', {
      command_type: 'direct_trpc',
      trpc_procedure: 'tasks.getCompleteOverview',
      bypass_websocket: false // Keep false to go through WebSocket for consistency
    });
  }

  /**
   * Check if a message should trigger a tRPC call
   * Usage: if (chatService.shouldUseTrpcForMessage(content)) { ... }
   */
  shouldUseTrpcForMessage(content: string): boolean {
    const taskKeywords = ['tasks', 'todo', 'task list', 'complete overview'];
    return taskKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  // ✅ ENHANCED tRPC Integration Methods
  
  /**
   * Add a message to chat indicating tRPC fetch is happening
   * Usage: chatService.notifyTRPCFetchStarted('tasks');
   */
  notifyTRPCFetchStarted(dataType: string): void {
    const message = {
      id: this.generateId(),
      content: `🔄 Fetching your ${dataType} via tRPC (direct API)...`,
      sender: 'ai' as const,
      timestamp: new Date().toISOString(),
      type: 'text' as const,
      metadata: {
        source: 'trpc',
        action: `${dataType}_fetch_initiated`,
        category: ResponseCategory.GENERAL
      }
    };
    
    this.addMessage(message);
  }

  /**
   * Add a success message when tRPC data is loaded
   * Usage: chatService.notifyTRPCDataLoaded('tasks', tasksOverview);
   */
  notifyTRPCDataLoaded(dataType: string, data: any): void {
    let summary = '';
    
    if (dataType === 'tasks' && data) {
      summary = `📊 **Summary:**\n• Total Tasks: ${data.totalTasks || 0}\n• Completed: ${data.totalCompleted || 0}\n• Pending: ${data.totalPending || 0}\n• Lists: ${data.totalLists || 0}`;
      
      if (data.totalOverdue > 0) {
        summary += `\n• ⚠️ Overdue: ${data.totalOverdue}`;
      }
    }
    
    const message = {
      id: this.generateId(),
      content: `✅ ${dataType.charAt(0).toUpperCase() + dataType.slice(1)} loaded successfully via tRPC!\n\n${summary}`,
      sender: 'ai' as const,
      timestamp: new Date().toISOString(),
      type: 'text' as const,
      metadata: {
        source: 'trpc',
        action: `${dataType}_loaded`,
        data: data,
        category: ResponseCategory.GENERAL
      }
    };
    
    this.addMessage(message);
  }

  /**
   * Add an error message when tRPC fetch fails
   * Usage: chatService.notifyTRPCError('tasks', error);
   */
  notifyTRPCError(dataType: string, error: any): void {
    const message = {
      id: this.generateId(),
      content: `❌ Failed to load ${dataType} via tRPC: ${error.message || 'Unknown error'}`,
      sender: 'ai' as const,
      timestamp: new Date().toISOString(),
      type: 'text' as const,
      metadata: {
        source: 'trpc',
        action: `${dataType}_error`,
        error: error,
        category: ResponseCategory.ERROR
      }
    };
    
    this.addMessage(message);
  }

  /**
   * Add a message to the chat
   * Usage: chatService.addMessage(message);
   */
  private addMessage(message: any): void {
    this.emit('message', message);
  }

  // ✅ NEW: Handle enhanced system messages from the new WebSocket handler
  private handleEnhancedSystemMessage(data: any) {
    console.log(`[ChatService] 💬 Handling enhanced system message:`, data.data.action);
    
    if (data.data.action === 'executive_response') {
      // Handle immediate executive assistant response (ChatGPT-like)
      const chatMessage = {
        id: `executive-${Date.now()}`,
        content: data.data.message || 'Let me help you with that strategically...',
        sender: 'assistant' as const,
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        metadata: {
          action: 'executive_response',
          responseType: 'executive_assistant',
          style: 'conversational_paragraph',
          priority: 'immediate',
          ...data.data.metadata
        },
      };
      
      console.log(`[ChatService] 🎯 Sending executive response:`, chatMessage.content.substring(0, 100));
      this.emit('message', chatMessage);
      
    } else if (data.data.action === 'context_dropdown') {
      // Handle context dropdown (collapsible, loads asynchronously)
      const chatMessage = {
        id: `context-${Date.now()}`,
        content: `Context: ${data.data.contextSummary.totalItems} relevant items found`,
        sender: 'assistant' as const,
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        metadata: {
          action: 'context_dropdown',
          responseType: 'context',
          style: 'collapsible_dropdown',
          priority: 'background',
          contextSummary: data.data.contextSummary,
          relevantContext: data.data.relevantContext,
          rdfInsights: data.data.rdfInsights,
          collapsed: true, // Start collapsed by default
          ...data.data.metadata
        },
      };
      
      console.log(`[ChatService] 📊 Sending context dropdown: ${data.data.contextSummary.totalItems} items`);
      this.emit('message', chatMessage);
      
    } else if (data.data.action === 'immediate_response') {
      // Handle legacy immediate conversational response
      const chatMessage = {
        id: `immediate-${Date.now()}`,
        content: data.data.message || 'Processing your request...',
        sender: 'assistant' as const,
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        metadata: {
          action: 'immediate_response',
          responseType: 'conversational',
          reasoning: data.data.reasoning,
          ...data.data.metadata
        },
      };
      
      console.log(`[ChatService] 💬 Sending immediate response message:`, chatMessage.content.substring(0, 100));
      this.emit('message', chatMessage);
      
    } else if (data.data.action === 'data_update') {
      // Handle legacy compact data update
      const chatMessage = {
        id: `data-update-${Date.now()}`,
        content: 'Here\'s the relevant information:',
        sender: 'assistant' as const,
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        metadata: {
          action: 'data_update',
          compactData: data.data.compactData,
          ...data.data.metadata
        },
      };
      
      console.log(`[ChatService] 📊 Sending data update message:`, data.data.compactData?.type);
      this.emit('message', chatMessage);
      
    } else {
      console.log(`[ChatService] ⚠️ Unknown system action:`, data.data.action);
    }
  }
}
