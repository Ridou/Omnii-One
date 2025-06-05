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
} from '~/types/unified-response.validation';

// Also import from chat types for complete EmailData definition
import type { 
  EmailData as EnhancedEmailData,
  EmailListData as EnhancedEmailListData 
} from '~/types/chat';

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

  constructor(config: ChatServiceConfig) {
    console.log('🏗️ [ChatService] *** CONSTRUCTOR CALLED ***');
    console.log('[ChatService] Config:', {
      url: config.url,
      userId: config.userId,
      hasAuthToken: !!config.authToken,
      timezone: config.timezone
    });
    this.config = config;
    this.loadQueuedMessages();
    console.log('✅ [ChatService] Constructor completed');
  }

  // Event emitter methods
  on(event: keyof ChatServiceEvents, callback: Function) {
    console.log(`🔗 [ChatService] Setting up event listener for: ${event}`);
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    console.log(`✅ [ChatService] Event listener added for: ${event}`);
  }

  off(event: keyof ChatServiceEvents, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: keyof ChatServiceEvents, ...args: any[]) {
    console.log(`📢 [ChatService] *** EMITTING EVENT: ${event} ***`);
    console.log(`[ChatService] Event listeners for ${event}:`, this.listeners.get(event)?.size || 0);
    this.listeners.get(event)?.forEach((callback) => {
      console.log(`[ChatService] Calling callback for ${event}`);
      callback(...args);
    });
    console.log(`✅ [ChatService] Event ${event} emission complete`);
  }

  async connect(): Promise<void> {
    try {
      console.log('🌐 [ChatService] *** CONNECT METHOD CALLED ***');
      const wsUrl = `${this.config.url}?userId=${this.config.userId}`;
      console.log('[ChatService] Attempting to connect to:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      console.log('🔌 [ChatService] WebSocket object created:', !!this.ws);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      
      console.log('✅ [ChatService] Event handlers assigned to WebSocket');
    } catch (error) {
      console.error('❌ [ChatService] Error in connect method:', error);
      this.emit('error', error as Error);
      this.scheduleReconnect();
    }
  }

  private handleOpen = () => {
    console.log('🎉 [ChatService] *** WEBSOCKET OPENED ***');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');
    // this.startHeartbeat();
    this.processQueuedMessages();
    console.log('✅ [ChatService] handleOpen complete');
  };

  private handleMessage = (event: MessageEvent) => {
    try {
      console.log('🚀 [ChatService] *** RAW MESSAGE RECEIVED ***');
      console.log('[ChatService] Raw WebSocket event.data (first 500 chars):', event.data.substring(0, 500));
      
      const data = JSON.parse(event.data);

      // Handle ping/pong messages (filter out)
      if (data.data?.pong || data.type === WebSocketMessageType.PONG || 
          data.type === WebSocketMessageType.PING || data.type === 'ping') {
        console.log('[ChatService] 🏓 Ping/pong message - ignoring');
        return;
      }

      console.log('[ChatService] Parsed data type:', typeof data);
      console.log('[ChatService] Parsed data keys:', Object.keys(data || {}));
      
      // ✅ CRITICAL: First, let's see the exact structure we received
      console.log('[ChatService] 📄 *** COMPLETE RAW RESPONSE STRUCTURE ***');
      console.log('[ChatService] Raw data stringified:', JSON.stringify(data, null, 2));

      // ✅ CRITICAL: Test if this looks like UnifiedToolResponse vs legacy format
      console.log('[ChatService] 🔍 *** STRUCTURE ANALYSIS ***');
      console.log('[ChatService] - Has "type" field:', 'type' in data, '| Value:', data.type);
      console.log('[ChatService] - Has "success" field:', 'success' in data, '| Value:', data.success);
      console.log('[ChatService] - Has "data" field:', 'data' in data);
      console.log('[ChatService] - Has "data.ui" field:', data.data?.ui ? true : false);
      console.log('[ChatService] - Has "data.structured" field:', data.data?.structured ? true : false);
      console.log('[ChatService] - Has "message" field:', 'message' in data, '| Value:', data.message);
      console.log('[ChatService] - Has "id" field:', 'id' in data, '| Value:', data.id);
      console.log('[ChatService] - Has "userId" field:', 'userId' in data, '| Value:', data.userId);
      console.log('[ChatService] - Has "timestamp" field:', 'timestamp' in data, '| Value:', data.timestamp);
      
      // ✅ CRITICAL: Check for legacy format indicators
      console.log('[ChatService] 🔍 *** LEGACY FORMAT CHECK ***');
      console.log('[ChatService] - Has "status" field:', 'status' in data, '| Value:', data.status);
      console.log('[ChatService] - Has "data.message" field:', data.data?.message ? true : false);
      console.log('[ChatService] - Has "data.metadata" field:', data.data?.metadata ? true : false);

      // ✅ CRITICAL DEBUG: Test validation step by step
      console.log('[ChatService] 🧪 *** STEP-BY-STEP VALIDATION TEST ***');
      const isValidStep1 = data && typeof data.type === 'string';
      console.log('[ChatService] Step 1 - Basic data + type string:', isValidStep1);
      
      const isValidStep2 = isValidStep1 && ['email', 'calendar', 'contact', 'task', 'general'].includes(data.type);
      console.log('[ChatService] Step 2 - Valid type enum:', isValidStep2, '| type:', data.type);
      
      const isValidStep3 = isValidStep2 && typeof data.success === 'boolean';
      console.log('[ChatService] Step 3 - Success is boolean:', isValidStep3, '| success:', data.success);
      
      const isValidStep4 = isValidStep3 && data.data && data.data.ui;
      console.log('[ChatService] Step 4 - Has data.ui:', isValidStep4);
      
      if (isValidStep4) {
        console.log('[ChatService] Step 5 - UI field validation:');
        console.log('[ChatService] - ui.title type:', typeof data.data.ui.title, '| value:', data.data.ui.title);
        console.log('[ChatService] - ui.content type:', typeof data.data.ui.content, '| value:', data.data.ui.content);
        console.log('[ChatService] - ui.icon type:', typeof data.data.ui.icon, '| value:', data.data.ui.icon);
        console.log('[ChatService] - ui.actions is array:', Array.isArray(data.data.ui.actions), '| length:', data.data.ui.actions?.length);
        console.log('[ChatService] - ui.metadata exists:', !!data.data.ui.metadata);
      } else {
        console.log('[ChatService] ❌ Step 4 failed - data.ui missing or invalid');
        if (data.data) {
          console.log('[ChatService] - data exists, keys:', Object.keys(data.data));
        } else {
          console.log('[ChatService] - data field is missing entirely');
        }
      }

      // Check if this is a UnifiedToolResponse from the server
      const isUnified = this.isUnifiedToolResponse(data);
      console.log('[ChatService] 🎯 *** FINAL VALIDATION RESULT:', isUnified, '***');
      
      if (isUnified) {
        console.log('✅ [ChatService] *** PROCESSING AS UNIFIED TOOL RESPONSE ***');
        this.handleUnifiedToolResponse(data);
        return;
      } else {
        console.log('❌ [ChatService] *** NOT A UNIFIED TOOL RESPONSE - PROCESSING AS LEGACY ***');
        console.log('[ChatService] Reason: Failed isUnifiedToolResponse check');
        console.log('[ChatService] Will process as legacy response instead');
      }

      // Handle server response format: { status: "success", data: { message: "..." }, timestamp: ... }
      if (data.status && data.data) {
        console.log('🎯 [ChatService] *** PROCESSING SERVER RESPONSE FORMAT ***');
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
        console.log('🎯 [ChatService] *** PROCESSING RESPONSE MESSAGE TYPE ***');
        this.handleResponse(data as WebSocketResponse);
      } else if (data.type === WebSocketMessageType.ERROR || data.type === 'error') {
        console.log('❌ [ChatService] *** PROCESSING ERROR MESSAGE TYPE ***');
        this.emit('error', new Error(data.error?.message || data.message || 'Unknown error'));
      } else if (data.type === 'message' || data.message) {
        console.log('💬 [ChatService] *** PROCESSING GENERIC MESSAGE ***');
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
        console.warn('⚠️ [ChatService] *** UNHANDLED MESSAGE TYPE ***');
        console.warn('[ChatService] Unhandled message type:', data.type || 'unknown');
        console.warn('[ChatService] Full unhandled data:', JSON.stringify(data, null, 2));
        
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
      console.error('❌ [ChatService] Failed to parse message:', error);
      console.error('[ChatService] Raw data that failed to parse:', event.data);
    }
  };

  // New method to check if response is UnifiedToolResponse
  private isUnifiedToolResponse(data: any): data is UnifiedToolResponse {
    console.log('[ChatService] 🔍 CLASS METHOD: isUnifiedToolResponse called');
    // Use the detailed validation function that provides step-by-step debugging
    return isValidUnifiedToolResponse(data);
  }

  // New method to handle UnifiedToolResponse
  private handleUnifiedToolResponse(response: UnifiedToolResponse) {
    console.log('[ChatService] *** HANDLING UNIFIED TOOL RESPONSE ***');
    console.log('[ChatService] Response type:', response.type);
    console.log('[ChatService] Response success:', response.success);
    console.log('[ChatService] UI title:', response.data.ui.title);
    console.log('[ChatService] Has structured data:', !!response.data.structured);
    
    // NEW: Log structured data details for email responses
    if (response.type === 'email' && response.data.structured) {
      console.log('[ChatService] 🔑 EMAIL STRUCTURED DATA KEYS:', Object.keys(response.data.structured));
      
      if ('emails' in response.data.structured) {
        const emailList = response.data.structured;
        console.log('[ChatService] 📧 EMAIL LIST DATA:');
        console.log('[ChatService] - Total emails:', emailList.totalCount);
        console.log('[ChatService] - Unread emails:', emailList.unreadCount);
        console.log('[ChatService] - Emails array length:', emailList.emails?.length || 0);
        console.log('[ChatService] - Has more emails:', emailList.hasMore);
        
        if (emailList.emails && emailList.emails.length > 0) {
          console.log('[ChatService] - First email keys:', Object.keys(emailList.emails[0]));
          console.log('[ChatService] - Sample email data:', {
            subject: emailList.emails[0].subject,
            from: emailList.emails[0].from,
            sender: (emailList.emails[0] as any).sender,
            isRead: emailList.emails[0].isRead,
            date: emailList.emails[0].date,
            messageTimestamp: (emailList.emails[0] as any).messageTimestamp,
            hasMessageText: !!(emailList.emails[0] as any).messageText,
            messageTextLength: (emailList.emails[0] as any).messageText?.length || 0,
            hasPreview: !!(emailList.emails[0] as any).preview,
            previewLength: (emailList.emails[0] as any).preview?.length || 0,
            hasLabelIds: !!(emailList.emails[0] as any).labelIds,
            labelIdsCount: (emailList.emails[0] as any).labelIds?.length || 0,
            labelIds: (emailList.emails[0] as any).labelIds
          });
          
          // ✅ NEW: Enhanced field statistics
          const enhancedStats = {
            withMessageText: emailList.emails.filter(e => (e as any).messageText && (e as any).messageText.length > 0).length,
            withPreview: emailList.emails.filter(e => (e as any).preview && (e as any).preview.length > 0).length,
            withSender: emailList.emails.filter(e => (e as any).sender).length,
            withLabelIds: emailList.emails.filter(e => (e as any).labelIds && (e as any).labelIds.length > 0).length,
            withMessageTimestamp: emailList.emails.filter(e => (e as any).messageTimestamp).length
          };
          
          console.log('[ChatService] 🎯 ENHANCED FIELD STATISTICS:');
          console.log('[ChatService] - Emails with messageText:', enhancedStats.withMessageText);
          console.log('[ChatService] - Emails with preview:', enhancedStats.withPreview);
          console.log('[ChatService] - Emails with sender field:', enhancedStats.withSender);
          console.log('[ChatService] - Emails with labelIds:', enhancedStats.withLabelIds);
          console.log('[ChatService] - Emails with messageTimestamp:', enhancedStats.withMessageTimestamp);
        }
      }
    }

    console.log('[ChatService] handleUnifiedToolResponse called with:', {
      type: response.type,
      success: response.success,
      title: response.data.ui.title,
      hasActions: response.data.ui.actions.length > 0,
      requiresAuth: response.authRequired
    });

    // Check if OAuth is required
    if (response.authRequired && response.authUrl) {
      console.log('[ChatService] OAuth required, emitting authRequired event');
      this.emit('authRequired', response.authUrl);
      return;
    }

    // Transform unified response to chat message
    const chatMessage = this.transformUnifiedResponse(response);
    console.log('[ChatService] *** CHAT MESSAGE CREATED FROM UNIFIED RESPONSE ***');
    console.log('[ChatService] Chat message ID:', chatMessage.id);
    console.log('[ChatService] Chat message category:', chatMessage.metadata?.category);
    console.log('[ChatService] Chat message has componentData:', !!chatMessage.metadata?.componentData);
    
    // NEW: Log component data details for email
    if (chatMessage.metadata?.componentData && 'emails' in chatMessage.metadata.componentData) {
      console.log('[ChatService] 🎯 COMPONENT DATA - EMAIL LIST:');
      console.log('[ChatService] - componentData keys:', Object.keys(chatMessage.metadata.componentData));
      console.log('[ChatService] - emails array available:', !!chatMessage.metadata.componentData.emails);
      console.log('[ChatService] - emails count:', chatMessage.metadata.componentData.emails?.length || 0);
    }
    
    this.emit('message', chatMessage);
  }

  // Transform UnifiedToolResponse to chat message format
  private transformUnifiedResponse(response: UnifiedToolResponse) {
    const { data: { ui }, success, type, message } = response;

    console.log('[ChatService] *** TRANSFORMING UNIFIED RESPONSE ***');
    console.log('[ChatService] Response type:', type);
    console.log('[ChatService] Has structured data:', !!response.data.structured);

    // ✅ PHASE 2: Validate email data if present using static validation
    if (response.type === 'email' && response.data.structured) {
      if (isEmailListData(response.data.structured)) {
        console.log('[ChatService] ✅ Email list data validated:', response.data.structured.emails.length, 'emails');
      } else if (isEmailData(response.data.structured)) {
        console.log('[ChatService] ✅ Single email data validated');
      } else {
        console.log('[ChatService] ⚠️ Structured data present but not recognized as email data');
      }
    }

    // Use the server-parsed UI data directly
    const content = this.formatUnifiedContent(response);
    
    // ✅ PHASE 2: Static category detection based on structured data
    const category = this.detectComponentCategory(response);
    console.log('[ChatService] Final category determined:', category);
    
    // ✅ PHASE 2: Log what we're setting as componentData
    if (response.data.structured) {
      console.log('[ChatService] 🎯 SETTING COMPONENT DATA:');
      console.log('[ChatService] - componentData will be:', Object.keys(response.data.structured));
      
      if (type === 'email' && isEmailListData(response.data.structured)) {
        console.log('[ChatService] - Email list componentData preview:');
        console.log('[ChatService]   * totalCount:', response.data.structured.totalCount);
        console.log('[ChatService]   * unreadCount:', response.data.structured.unreadCount);
        console.log('[ChatService]   * emails.length:', response.data.structured.emails?.length || 0);
        console.log('[ChatService]   * hasMore:', response.data.structured.hasMore);
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
    
    console.log('[ChatService] *** FINAL CHAT MESSAGE METADATA ***');
    console.log('[ChatService] - category:', chatMessage.metadata.category);
    console.log('[ChatService] - componentData keys:', chatMessage.metadata.componentData ? Object.keys(chatMessage.metadata.componentData) : 'none');
    console.log('[ChatService] - componentActions count:', chatMessage.metadata.componentActions?.length || 0);
    
    return chatMessage;
  }

  // ✅ PHASE 2: Enhanced category detection based on structured data using static typing
  private detectComponentCategory(response: UnifiedToolResponse): string {
    const { type, data: { structured } } = response;
    
    console.log('[ChatService] *** DETECTING COMPONENT CATEGORY ***');
    console.log('[ChatService] Response type:', type);
    console.log('[ChatService] Has structured data:', !!structured);
    
    if (!structured) {
      const category = type === 'email' ? ResponseCategory.TOOL_RESPONSE : ResponseCategory.GENERAL;
      console.log('[ChatService] No structured data, using category:', category);
      return category;
    }
    
    console.log('[ChatService] Structured data keys:', Object.keys(structured));
    
    // ✅ PHASE 2: Static type-based detection instead of runtime checking
    switch (type) {
      case 'email':
        // Use static type guards instead of runtime property checking
        if (isEmailListData(structured)) {
          console.log('[ChatService] 🎯 DETECTED EMAIL_LIST - emails array found with', structured.emails.length, 'emails');
          return ResponseCategory.EMAIL_LIST;
        } else if (isEmailData(structured)) {
          console.log('[ChatService] 🎯 DETECTED EMAIL_SINGLE - single email object found');
          return ResponseCategory.EMAIL_SINGLE;
        } else {
          console.log('[ChatService] 🎯 DETECTED EMAIL_SINGLE - default for email type');
          return ResponseCategory.EMAIL_SINGLE; // Default for email type
        }
        
      case 'calendar':
        // Static detection for calendar data
        const isCalendarList = structured && 'events' in structured && Array.isArray(structured.events);
        const calendarCategory = isCalendarList ? ResponseCategory.CALENDAR_LIST : ResponseCategory.CALENDAR_EVENT;
        console.log('[ChatService] 🎯 DETECTED CALENDAR category:', calendarCategory);
        return calendarCategory;
        
      case 'contact':
        // Static detection for contact data using type guards
        if (isContactListData(structured)) {
          console.log('[ChatService] 🎯 DETECTED CONTACT_LIST - contacts array found with', structured.contacts.length, 'contacts');
          return ResponseCategory.CONTACT_LIST;
        } else if (isContactData(structured)) {
          console.log('[ChatService] 🎯 DETECTED CONTACT_SINGLE - single contact object found');
          return ResponseCategory.CONTACT_SINGLE;
        } else {
          console.log('[ChatService] 🎯 DETECTED CONTACT_SINGLE - default for contact type');
          return ResponseCategory.CONTACT_SINGLE; // Default for contact type
        }
        
      case 'task':
        // ✅ Use Zod type guards for task detection
        if (isCompleteTaskOverview(structured)) {
          console.log('[ChatService] 🎯 DETECTED TASK_COMPLETE_OVERVIEW - complete overview with', structured.totalTasks, 'tasks across', structured.totalLists, 'lists');
          return ResponseCategory.TASK_COMPLETE_OVERVIEW;
        } else if (isTaskListWithTasks(structured)) {
          console.log('[ChatService] 🎯 DETECTED TASK_LIST - single list with tasks');
          return ResponseCategory.TASK_LIST;
        } else if (isTaskData(structured)) {
          console.log('[ChatService] 🎯 DETECTED TASK_SINGLE - single task object');
          return ResponseCategory.TASK_SINGLE;
        } else {
          console.log('[ChatService] 🎯 DETECTED TASK_SINGLE - default for task type');
          return ResponseCategory.TASK_SINGLE; // Default for task type
        }
        
      default:
        console.log('[ChatService] 🎯 DETECTED GENERAL - fallback for type:', type);
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
    console.log('[ChatService] handleResponse called with legacy format');

    // Check if OAuth is required
    if (response.data.requiresAuth && response.data.authUrl) {
      console.log('[ChatService] OAuth required, emitting authRequired event');
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
    console.error('[ChatService] WebSocket error:', event);
    this.emit('error', new Error('WebSocket connection error'));
  };

  private handleClose = (event: CloseEvent) => {
    console.log('[ChatService] WebSocket closed:', event.code, event.reason);
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
    console.log(`[ChatService] Reconnecting in ${delay}ms...`);

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
    console.log('📤 [ChatService] *** SEND MESSAGE CALLED ***');
    console.log('[ChatService] Content:', content);
    console.log('[ChatService] isConnected:', this.isConnected);
    
    const message: OutgoingMessage = {
      id: this.generateId(),
      content,
      metadata,
      timestamp: Date.now(),
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      console.log('✅ [ChatService] Connection is good, sending message');
      const wsMessage: WebSocketMessage = {
        type: WebSocketMessageType.COMMAND,
        payload: {
          commandType: CommandType.TEXT_COMMAND,
          message: content,
          userId: this.config.userId,
          userTimezone: this.config.timezone,
          metadata,
        },
        timestamp: Date.now(),
      };

      console.log('[ChatService] Sending message:', JSON.stringify(wsMessage, null, 2));
      this.ws.send(JSON.stringify(wsMessage));
      this.emit('typing', true);
    } else {
      console.log('❌ [ChatService] Connection not ready, queueing message');
      await this.queueMessage(message);
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
      console.error('[ChatService] Failed to load queue:', error);
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem('chat_queue', JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('[ChatService] Failed to save queue:', error);
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
    console.log('[ChatService] 🔍 EXTRACTING EMAIL LIST FROM MESSAGE');
    console.log('[ChatService] Message category:', message.metadata?.category);
    console.log('[ChatService] Has componentData:', !!message.metadata?.componentData);
    
    if (message.metadata?.category === ResponseCategory.EMAIL_LIST && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      console.log('[ChatService] ComponentData keys:', Object.keys(componentData));
      
      if (isEmailListData(componentData)) {
        console.log('[ChatService] ✅ VALID EMAIL LIST DATA FOUND:');
        console.log('[ChatService] - emails count:', componentData.emails.length);
        console.log('[ChatService] - totalCount:', componentData.totalCount);
        console.log('[ChatService] - unreadCount:', componentData.unreadCount);
        console.log('[ChatService] - hasMore:', componentData.hasMore);
        
        return componentData;
      } else {
        console.log('[ChatService] ❌ ComponentData is not valid EmailListData');
        return null;
      }
    }
    
    console.log('[ChatService] ❌ Message is not EMAIL_LIST category or missing componentData');
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
    console.log('[ChatService] 🔍 EXTRACTING COMPLETE TASK OVERVIEW FROM MESSAGE');
    console.log('[ChatService] Message category:', message.metadata?.category);
    console.log('[ChatService] Has componentData:', !!message.metadata?.componentData);
    
    if (message.metadata?.category === ResponseCategory.TASK_COMPLETE_OVERVIEW && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      console.log('[ChatService] ComponentData keys:', Object.keys(componentData));
      
      if (isCompleteTaskOverview(componentData)) {
        console.log('[ChatService] ✅ VALID COMPLETE TASK OVERVIEW DATA FOUND:');
        console.log('[ChatService] - totalTasks:', componentData.totalTasks);
        console.log('[ChatService] - totalLists:', componentData.totalLists);
        console.log('[ChatService] - totalCompleted:', componentData.totalCompleted);
        console.log('[ChatService] - totalPending:', componentData.totalPending);
        console.log('[ChatService] - totalOverdue:', componentData.totalOverdue);
        console.log('[ChatService] - syncSuccess:', componentData.syncSuccess);
        
        return componentData;
      } else {
        console.log('[ChatService] ❌ ComponentData is not valid CompleteTaskOverview');
        return null;
      }
    }
    
    console.log('[ChatService] ❌ Message is not TASK_COMPLETE_OVERVIEW category or missing componentData');
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
    console.log('[ChatService] 🔍 EXTRACTING CONTACT LIST FROM MESSAGE');
    console.log('[ChatService] Message category:', message.metadata?.category);
    console.log('[ChatService] Has componentData:', !!message.metadata?.componentData);
    
    if (message.metadata?.category === ResponseCategory.CONTACT_LIST && 
        message.metadata?.componentData) {
      
      const componentData = message.metadata.componentData;
      console.log('[ChatService] ComponentData keys:', Object.keys(componentData));
      
      if (isContactListData(componentData)) {
        console.log('[ChatService] ✅ VALID CONTACT LIST DATA FOUND:');
        console.log('[ChatService] - contacts count:', componentData.contacts.length);
        console.log('[ChatService] - totalCount:', componentData.totalCount);
        console.log('[ChatService] - hasMore:', componentData.hasMore);
        
        return componentData;
      } else {
        console.log('[ChatService] ❌ ComponentData is not valid ContactListData');
        return null;
      }
    }
    
    console.log('[ChatService] ❌ Message is not CONTACT_LIST category or missing componentData');
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
        console.log('[ChatService] ✅ VALID SINGLE CONTACT DATA FOUND');
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
}
