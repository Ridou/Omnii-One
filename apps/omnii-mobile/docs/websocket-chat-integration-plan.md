# WebSocket Chat Service Integration Plan

## Overview

This document outlines how to integrate the WebSocket-based chat service from your backend into the React Native frontend, replacing the current mock implementation with real-time communication.

## Current Architecture Analysis

### Frontend (React Native)
- **Current Implementation**: Mock data in `useFetchChat.ts`
- **Chat UI**: Feature-complete with tabs, message display, and input
- **Type System**: Well-defined interfaces in `src/types/chat.ts`
- **Authentication**: Integrated with Supabase auth context

### Backend (WebSocket Service)
- **Protocol**: WebSocket with typed message system
- **Message Types**: Command, Response, Ping/Pong, Error
- **Command Types**: Text commands for calendar, email, contacts, tasks
- **Authentication**: User ID-based with timezone support

## Integration Architecture

### 1. WebSocket Service Layer

Create a new service to manage WebSocket connections:

```typescript
// src/services/websocket/WebSocketService.ts
import { WebSocketMessageType, CommandType, WebSocketMessage } from '~/types/websocket.types';
import { ChatMessage } from '~/types/chat';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private listeners: Map<string, Set<Function>> = new Map();
  
  connect(userId: string, timezone: string) {
    const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
    this.ws = new WebSocket(WS_URL);
    
    this.setupEventHandlers();
    this.startHeartbeat();
  }
  
  sendCommand(message: string) {
    const command: WebSocketMessage = {
      type: WebSocketMessageType.COMMAND,
      payload: {
        commandType: CommandType.TEXT_COMMAND,
        message,
        userId: this.userId,
        userTimezone: this.timezone
      },
      timestamp: Date.now()
    };
    
    this.send(JSON.stringify(command));
  }
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

export const wsService = new WebSocketService();
```

### 2. WebSocket Hook Integration

Update `useFetchChat.ts` to use real WebSocket:

```typescript
// hooks/useFetchChat.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { wsService } from '~/services/websocket/WebSocketService';
import type { ChatState, ChatMessage } from '~/types/chat';

export function useFetchChat() {
  const { user } = useAuth();
  const [chatState, setChatState] = useState<ChatState>(initialState);
  
  useEffect(() => {
    if (!user) return;
    
    // Connect WebSocket
    wsService.connect(user.id, Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Set up listeners
    wsService.on('message', handleIncomingMessage);
    wsService.on('connected', handleConnected);
    wsService.on('error', handleError);
    
    return () => {
      wsService.disconnect();
    };
  }, [user]);
  
  const sendMessage = useCallback(async (content: string) => {
    // Add user message to state
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true
    }));
    
    // Send via WebSocket
    wsService.sendCommand(content);
  }, []);
  
  const handleIncomingMessage = (wsMessage: WebSocketResponse) => {
    // Transform WebSocket response to ChatMessage
    const chatMessage: ChatMessage = transformWSResponse(wsMessage);
    
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, chatMessage],
      isTyping: false
    }));
  };
}
```

### 3. Type Definitions

Add WebSocket types to your React Native app:

```typescript
// src/types/websocket.types.ts
export enum WebSocketMessageType {
  COMMAND = 'command',
  RESPONSE = 'response',
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error'
}

export enum CommandType {
  TEXT_COMMAND = 'text_command',
  VOICE_COMMAND = 'voice_command'
}

export enum WebSocketResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PROCESSING = 'processing'
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: number;
}

export interface WebSocketResponse {
  type: WebSocketMessageType.RESPONSE;
  status: WebSocketResponseStatus;
  data: {
    message?: string;
    requiresAuth?: boolean;
    authUrl?: string;
    actions?: any[];
    metadata?: any;
  };
  timestamp: number;
}
```

### 4. OAuth Flow Integration

Handle OAuth requirements from WebSocket responses:

```typescript
// src/services/websocket/OAuthHandler.ts
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export class OAuthHandler {
  static async handleOAuthRequired(authUrl: string): Promise<void> {
    // Use expo-web-browser for in-app OAuth flow
    const result = await WebBrowser.openAuthSessionAsync(authUrl);
    
    if (result.type === 'success') {
      // OAuth completed, WebSocket should auto-retry command
      return;
    }
  }
}
```

### 5. Message Transformation

Convert WebSocket responses to chat messages:

```typescript
// src/utils/messageTransformer.ts
export function transformWSResponse(wsResponse: WebSocketResponse): ChatMessage {
  return {
    id: Date.now().toString(),
    content: wsResponse.data.message || 'Action completed',
    sender: 'ai',
    timestamp: new Date().toISOString(),
    type: 'text',
    confidence: calculateConfidence(wsResponse),
    sources: extractSources(wsResponse),
    metadata: {
      reasoning: wsResponse.data.metadata?.reasoning,
      alternatives: wsResponse.data.metadata?.suggestions,
      context: wsResponse.data.metadata?.context
    }
  };
}

function calculateConfidence(response: WebSocketResponse): number {
  // Calculate based on response status and metadata
  if (response.status === 'success') return 95;
  if (response.data.requiresAuth) return 80;
  return 70;
}

function extractSources(response: WebSocketResponse): Citation[] {
  // Extract from response metadata
  const sources: Citation[] = [];
  
  if (response.data.metadata?.source) {
    sources.push({
      id: '1',
      name: response.data.metadata.source,
      type: response.data.metadata.sourceType || 'integration',
      confidence: 90
    });
  }
  
  return sources;
}
```

### 6. Connection Management

Implement robust connection handling:

```typescript
// src/services/websocket/ConnectionManager.ts
export class ConnectionManager {
  private reconnectTimer?: NodeJS.Timeout;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
      
      this.reconnectAttempts++;
    }
  }
  
  handleConnect() {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }
}
```

### 7. Environment Configuration

Add WebSocket configuration:

```bash
# .env.local
EXPO_PUBLIC_WS_URL=ws://localhost:8000/ws

# .env.production
EXPO_PUBLIC_WS_URL=wss://api.omnii.app/ws
```

### 8. Testing Strategy

1. **Unit Tests**: Mock WebSocket for component tests
2. **Integration Tests**: Test message transformation
3. **E2E Tests**: Use test WebSocket server
4. **Debug Tools**: Add WebSocket debug panel

### 9. Implementation Steps

1. **Phase 1**: Create WebSocket service layer
2. **Phase 2**: Update chat hook to use WebSocket
3. **Phase 3**: Implement OAuth flow handling
4. **Phase 4**: Add connection management
5. **Phase 5**: Deploy and test with real backend

### 10. Error Handling

```typescript
// Error states to handle
- Connection failures
- Authentication errors
- OAuth cancellation
- Message parsing errors
- Timeout handling
- Offline mode with queue
```

### 11. Performance Optimizations

1. **Message Batching**: Group rapid messages
2. **Debouncing**: Prevent message spam
3. **Caching**: Store recent conversations
4. **Compression**: Use binary WebSocket frames
5. **Background Handling**: Manage app state changes

## Migration Path

1. Keep mock data as fallback
2. Add feature flag for WebSocket
3. Gradually migrate users
4. Monitor performance metrics
5. Remove mock implementation

## Security Considerations

1. Use WSS (WebSocket Secure) in production
2. Implement token-based authentication
3. Add rate limiting
4. Sanitize all user inputs
5. Implement message encryption for sensitive data