# Isolated Chat Service Implementation Plan

## Overview

This plan provides a step-by-step guide to implement an isolated, production-ready WebSocket chat service that can be easily integrated into your React Native frontend.

## Service Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Native App   │────▶│  WebSocket       │────▶│  Backend APIs   │
│  (Chat UI)          │◀────│  Service Layer   │◀────│  (Calendar,     │
└─────────────────────┘     └──────────────────┘     │   Email, etc)   │
                                     │                └─────────────────┘
                                     ▼
                            ┌──────────────────┐
                            │  Message Queue   │
                            │  (Offline)       │
                            └──────────────────┘
```

## Implementation Files

### 1. Core WebSocket Service

```typescript
// src/services/chat/ChatService.ts
import EventEmitter from 'eventemitter3';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface ChatServiceConfig {
  url: string;
  userId: string;
  authToken?: string;
  timezone: string;
}

interface ChatServiceEvents {
  message: (message: ChatMessage) => void;
  connected: () => void;
  disconnected: (reason: string) => void;
  error: (error: Error) => void;
  typing: (isTyping: boolean) => void;
}

export class ChatService extends EventEmitter<ChatServiceEvents> {
  private ws: WebSocket | null = null;
  private config: ChatServiceConfig;
  private messageQueue: QueuedMessage[] = [];
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private isConnected = false;
  
  constructor(config: ChatServiceConfig) {
    super();
    this.config = config;
    this.loadQueuedMessages();
    this.setupNetworkListener();
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
  
  async sendMessage(content: string, metadata?: any): Promise<void> {
    const message: OutgoingMessage = {
      id: this.generateId(),
      content,
      metadata,
      timestamp: Date.now()
    };
    
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'command',
        payload: {
          commandType: 'text_command',
          message: content,
          userId: this.config.userId,
          userTimezone: this.config.timezone,
          metadata
        },
        timestamp: Date.now()
      }));
    } else {
      // Queue message for later
      await this.queueMessage(message);
    }
  }
  
  private async queueMessage(message: QueuedMessage): Promise<void> {
    this.messageQueue.push(message);
    await AsyncStorage.setItem('chat_queue', JSON.stringify(this.messageQueue));
  }
  
  private async processQueuedMessages(): Promise<void> {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift()!;
      await this.sendMessage(message.content, message.metadata);
    }
    await AsyncStorage.setItem('chat_queue', JSON.stringify(this.messageQueue));
  }
  
  disconnect(): void {
    this.isConnected = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }
}
```

### 2. React Hook for Chat

```typescript
// src/hooks/useChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatService } from '@/services/chat/ChatService';
import { useAuth } from '@/context/AuthContext';
import type { ChatMessage, ChatState } from '~/types/chat';

export function useChat() {
  const { user, session } = useAuth();
  const chatServiceRef = useRef<ChatService | null>(null);
  const [state, setState] = useState<ChatState>({
    messages: [],
    isConnected: false,
    isTyping: false,
    error: null,
    context: null
  });
  
  useEffect(() => {
    if (!user || !session) return;
    
    // Initialize chat service
    const chatService = new ChatService({
      url: process.env.EXPO_PUBLIC_WS_URL!,
      userId: user.id,
      authToken: session.access_token,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    chatServiceRef.current = chatService;
    
    // Set up event listeners
    chatService.on('connected', () => {
      setState(prev => ({ ...prev, isConnected: true, error: null }));
    });
    
    chatService.on('disconnected', (reason) => {
      setState(prev => ({ ...prev, isConnected: false }));
    });
    
    chatService.on('message', (message) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
        isTyping: false
      }));
    });
    
    chatService.on('typing', (isTyping) => {
      setState(prev => ({ ...prev, isTyping }));
    });
    
    chatService.on('error', (error) => {
      setState(prev => ({ ...prev, error: error.message }));
    });
    
    // Connect
    chatService.connect();
    
    return () => {
      chatService.disconnect();
    };
  }, [user, session]);
  
  const sendMessage = useCallback(async (content: string) => {
    if (!chatServiceRef.current) return;
    
    // Optimistically add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true
    }));
    
    try {
      await chatServiceRef.current.sendMessage(content);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to send message',
        isTyping: false
      }));
    }
  }, []);
  
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);
  
  return {
    messages: state.messages,
    isConnected: state.isConnected,
    isTyping: state.isTyping,
    error: state.error,
    sendMessage,
    clearError
  };
}
```

### 3. Chat UI Component

```typescript
// src/components/chat/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  StyleSheet
} from 'react-native';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ConnectionStatus } from './ConnectionStatus';
import { AppColors } from '@/constants/Colors';

export function ChatInterface() {
  const { messages, isConnected, isTyping, error, sendMessage, clearError } = useChat();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  
  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
    }
  };
  
  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ConnectionStatus isConnected={isConnected} />
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ChatMessage message={item} />}
        contentContainerStyle={styles.messageList}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={AppColors.primary} />
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          ) : null
        }
      />
      
      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorDismiss}>Tap to dismiss</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={AppColors.textSecondary}
          multiline
          maxLength={500}
          editable={isConnected}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || !isConnected}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

### 4. Message Queue Handler

```typescript
// src/services/chat/MessageQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedMessage {
  id: string;
  content: string;
  metadata?: any;
  timestamp: number;
  retryCount: number;
}

export class MessageQueue {
  private static QUEUE_KEY = 'chat_message_queue';
  private static MAX_RETRIES = 3;
  
  static async add(message: Omit<QueuedMessage, 'retryCount'>): Promise<void> {
    const queue = await this.getQueue();
    queue.push({ ...message, retryCount: 0 });
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }
  
  static async getQueue(): Promise<QueuedMessage[]> {
    try {
      const data = await AsyncStorage.getItem(this.QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
  
  static async remove(messageId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(m => m.id !== messageId);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered));
  }
  
  static async incrementRetry(messageId: string): Promise<boolean> {
    const queue = await this.getQueue();
    const message = queue.find(m => m.id === messageId);
    
    if (!message) return false;
    
    message.retryCount++;
    
    if (message.retryCount > this.MAX_RETRIES) {
      await this.remove(messageId);
      return false;
    }
    
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    return true;
  }
}
```

### 5. Network State Manager

```typescript
// src/services/chat/NetworkManager.ts
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import EventEmitter from 'eventemitter3';

interface NetworkEvents {
  online: () => void;
  offline: () => void;
  connectionChange: (state: NetInfoState) => void;
}

export class NetworkManager extends EventEmitter<NetworkEvents> {
  private isOnline = true;
  private unsubscribe?: () => void;
  
  constructor() {
    super();
    this.init();
  }
  
  private async init() {
    // Get initial state
    const state = await NetInfo.fetch();
    this.updateConnectionState(state);
    
    // Subscribe to changes
    this.unsubscribe = NetInfo.addEventListener(state => {
      this.updateConnectionState(state);
    });
  }
  
  private updateConnectionState(state: NetInfoState) {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected && state.isInternetReachable !== false;
    
    if (wasOnline !== this.isOnline) {
      this.emit(this.isOnline ? 'online' : 'offline');
    }
    
    this.emit('connectionChange', state);
  }
  
  get connected(): boolean {
    return this.isOnline;
  }
  
  destroy() {
    this.unsubscribe?.();
  }
}
```

### 6. OAuth Integration Handler

```typescript
// src/services/chat/OAuthHandler.ts
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export class OAuthHandler {
  static async handleOAuthRequest(authUrl: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        window.open(authUrl, '_blank');
        return true;
      }
      
      // Use in-app browser for mobile
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        Linking.createURL('oauth-callback')
      );
      
      if (result.type === 'success') {
        // OAuth completed successfully
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('OAuth error:', error);
      return false;
    }
  }
}
```

### 7. Type Definitions

```typescript
// src/types/chat-service.types.ts
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  type: 'text' | 'action' | 'oauth_required';
  metadata?: {
    confidence?: number;
    sources?: Source[];
    actions?: Action[];
    authUrl?: string;
  };
}

export interface ChatState {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  error: string | null;
  context: ChatContext | null;
}

export interface ChatContext {
  userId: string;
  timezone: string;
  capabilities: string[];
  preferences: Record<string, any>;
}
```

### 8. Testing Utilities

```typescript
// src/services/chat/__tests__/ChatService.test.ts
import { ChatService } from '../ChatService';
import WS from 'jest-websocket-mock';

describe('ChatService', () => {
  let server: WS;
  let chatService: ChatService;
  
  beforeEach(async () => {
    server = new WS('ws://localhost:8000/ws');
    chatService = new ChatService({
      url: 'ws://localhost:8000/ws',
      userId: 'test-user',
      timezone: 'UTC'
    });
    await chatService.connect();
  });
  
  afterEach(() => {
    chatService.disconnect();
    WS.clean();
  });
  
  test('sends messages correctly', async () => {
    await chatService.sendMessage('Hello');
    await expect(server).toReceiveMessage(
      expect.stringContaining('Hello')
    );
  });
  
  test('handles disconnection gracefully', async () => {
    server.close();
    await expect(chatService.isConnected).toBe(false);
  });
});
```

### 9. Debug Panel

```typescript
// src/components/chat/ChatDebugPanel.tsx
import React from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { useChat } from '@/hooks/useChat';

export function ChatDebugPanel() {
  const { isConnected, messages } = useChat();
  const [showDebug, setShowDebug] = useState(__DEV__);
  
  if (!showDebug) return null;
  
  return (
    <View style={styles.debugPanel}>
      <Text>Connection: {isConnected ? '🟢' : '🔴'}</Text>
      <Text>Messages: {messages.length}</Text>
      <TouchableOpacity onPress={() => console.log(messages)}>
        <Text>Log Messages</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Integration Steps

1. **Install Dependencies**
   ```bash
   npm install eventemitter3 @react-native-async-storage/async-storage @react-native-community/netinfo expo-web-browser
   ```

2. **Add Environment Variables**
   ```env
   EXPO_PUBLIC_WS_URL=ws://localhost:8000/ws
   ```

3. **Update Chat Screen**
   ```typescript
   // app/(tabs)/chat.tsx
   import { ChatInterface } from '@/components/chat/ChatInterface';
   
   export default function ChatScreen() {
     return <ChatInterface />;
   }
   ```

4. **Test Connection**
   - Start your WebSocket backend
   - Run the React Native app
   - Monitor WebSocket frames in debugger

## Production Checklist

- [ ] Use WSS (secure WebSocket) in production
- [ ] Implement proper authentication
- [ ] Add message encryption
- [ ] Set up monitoring and analytics
- [ ] Test offline/online transitions
- [ ] Implement rate limiting
- [ ] Add message persistence
- [ ] Test on all platforms
- [ ] Add error recovery mechanisms
- [ ] Document API for other developers