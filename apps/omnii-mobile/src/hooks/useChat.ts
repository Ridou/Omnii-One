import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatService } from '~/services/chat/ChatService';
import { HttpChatService } from '~/services/chat/HttpChatService';
import { useAuth } from '~/context/AuthContext';   
import type { ChatMessage } from '~/types/chat';
import type { ChatServiceState } from '~/types/chat-service.types';
import { getWebSocketUrl } from '~/lib/env';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Feature flag for HTTP vs WebSocket mode
const USE_HTTP_CHAT = process.env.EXPO_PUBLIC_USE_HTTP_CHAT === 'true' || false;

const initialState: ChatServiceState = {
  messages: [],
  isConnected: false,
  isTyping: false,
  error: null,
  context: null,
};

export function useChat() {
  const { user, session } = useAuth();
  const chatServiceRef = useRef<ChatService | null>(null);
  const httpChatServiceRef = useRef<HttpChatService | null>(null);
  const [state, setState] = useState<ChatServiceState>(initialState);

  useEffect(() => {
    
    if (!user || !session) {
      // Clean up if user logs out
      if (USE_HTTP_CHAT) {
        if (httpChatServiceRef.current) {
          httpChatServiceRef.current.disconnect();
          httpChatServiceRef.current = null;
        }
      } else {
        if (chatServiceRef.current) {
          chatServiceRef.current.disconnect();
          chatServiceRef.current = null;
        }
      }
      setState(initialState);
      return;
    }
    
    const userId = user.id;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (USE_HTTP_CHAT) {
      console.log('[useChat] Initializing HTTP Chat Service');
      
      // Initialize HTTP chat service
      const httpChatService = new HttpChatService({
        userId: userId,
        authToken: session.access_token,
        timezone: timezone,
      });

      httpChatServiceRef.current = httpChatService;

      // Set up HTTP event listeners
      httpChatService.on('connected', () => {
        setState((prev) => ({ ...prev, isConnected: true, error: null }));
      });

      httpChatService.on('disconnected', (reason: string) => {
        setState((prev) => ({ ...prev, isConnected: false }));
      });

      httpChatService.on('message', (message: ChatMessage) => {
        setState((prev) => {
          const existingIndex = prev.messages.findIndex(m => m.id === message.id);
          
          if (existingIndex >= 0) {
            // Update existing message
            const updatedMessages = [...prev.messages];
            updatedMessages[existingIndex] = message;
            return { ...prev, messages: updatedMessages, isTyping: false };
          } else {
            // Add new message
            return {
              ...prev,
              messages: [...prev.messages, message],
              isTyping: false,
            };
          }
        });
      });

      httpChatService.on('error', (error: Error) => {
        setState((prev) => ({ ...prev, error: error.message }));
      });

      // Connect to HTTP service
      httpChatService.connect();

      // Return cleanup function for HTTP service
      return () => {
        httpChatService.disconnect();
      };

    } else {
      console.log('[useChat] Initializing WebSocket Chat Service');
      
      // Initialize WebSocket chat service (existing logic)
      const wsUrl = getWebSocketUrl();
      const chatService = new ChatService({
        url: wsUrl,
        userId: userId,
        authToken: session.access_token,
        timezone: timezone,
      });

      chatServiceRef.current = chatService;

      // Set up event listeners
      
      chatService.on('connected', () => {
        setState((prev) => ({ ...prev, isConnected: true, error: null }));
      });

      chatService.on('disconnected', (reason: string) => {
        setState((prev) => ({ ...prev, isConnected: false }));
      });

      chatService.on('message', (message: ChatMessage) => {
        
        // 🔍 DEBUG: Log all incoming messages to see executive assistant responses
        console.log('🔍 INCOMING MESSAGE DEBUG:');
        console.log('  - Type:', message.type);
        console.log('  - Sender:', message.sender);
        console.log('  - Content preview:', message.content?.substring(0, 100));
        console.log('  - Metadata action:', message.metadata?.action);

        setState((prev) => {
          const existingIndex = prev.messages.findIndex(m => m.id === message.id);
          
          if (existingIndex >= 0) {
            // Update existing message
            const updatedMessages = [...prev.messages];
            updatedMessages[existingIndex] = message;
            return { ...prev, messages: updatedMessages, isTyping: false };
          } else {
            // Add new message
            return {
              ...prev,
              messages: [...prev.messages, message],
              isTyping: false,
            };
          }
        });
      });

      chatService.on('typing', (isTyping: boolean) => {
        setState((prev) => ({ ...prev, isTyping }));
      });

      chatService.on('error', (error: Error) => {
        setState((prev) => ({ ...prev, error: error.message }));
      });

      chatService.on('authRequired', async (authUrl: string) => {
        try {
          // Open OAuth flow in browser
          const result = await WebBrowser.openAuthSessionAsync(
            authUrl,
            Linking.createURL('oauth-callback')
          );

          if (result.type === 'success') {
            // OAuth completed, service should auto-retry
          }
        } catch {
          setState((prev) => ({
            ...prev,
            error: 'Authentication failed. Please try again.',
          }));
        }
      });

      // Connect to WebSocket
      chatService.connect();

      // Load initial welcome message
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        content:
          "Hello! I'm your AI assistant. I can help you manage your calendar, emails, tasks, and more. What would you like to do today?",
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'text',
        confidence: 100,
      };

      setState((prev) => {
        // Welcome message state logged for debugging
        const newState = { ...prev, messages: [welcomeMessage] };
        return newState;
      });

      // Return cleanup function for WebSocket service
      return () => {
        chatService.disconnect();
      };
    }
  }, [user, session]);

  const sendMessage = useCallback(async (content: string) => {
    
    if (!content.trim()) {
      return;
    }

    // Check which service mode we're using
    const service = USE_HTTP_CHAT ? httpChatServiceRef.current : chatServiceRef.current;
    if (!service) {
      return;
    }

    // Optimistically add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    setState((prev) => {
      return {
        ...prev,
        messages: [...prev.messages, userMessage],
        isTyping: true,
      };
    });

    try {
      await service.sendMessage(content);
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'Failed to send message. Please try again.',
        isTyping: false,
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearMessages = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [] }));
  }, []);

  const editMessage = useCallback((messageId: string, newContent: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content: newContent } : msg
      ),
    }));
  }, []);

  // ✅ FINAL STEP: Email action handler for rich email interactions
  const handleEmailAction = useCallback((action: string, data: any) => {
    
    if (!chatServiceRef.current || !state.isConnected) {
      return;
    }

    switch (action) {
      case 'reply_first':
        if (data && data.subject) {
          const replyMessage = `reply to email with subject: "${data.subject}"`;
          sendMessage(replyMessage);
        }
        break;
        
      case 'load_more':
        sendMessage('fetch more emails');
        break;
        
      case 'open_email':
        if (data && data.subject) {
          const openMessage = `open email: "${data.subject}"`;
          sendMessage(openMessage);
        }
        break;
        
      case 'show_more':
        // This action is handled locally in the component (expand/collapse)
        break;
        
      default:
        break;
    }
  }, [sendMessage, state.isConnected]);

  const reconnect = useCallback(() => {
    const service = USE_HTTP_CHAT ? httpChatServiceRef.current : chatServiceRef.current;
    if (service) {
      service.connect();
    }
  }, []);

  return {
    messages: state.messages,
    isConnected: state.isConnected,
    isTyping: state.isTyping,
    error: state.error,
    sendMessage,
    clearError,
    clearMessages,
    editMessage,
    handleEmailAction,
    reconnect,
  };
}
