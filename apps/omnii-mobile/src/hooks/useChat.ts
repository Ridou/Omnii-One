import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatService } from '~/services/chat/ChatService';
import { useAuth } from '~/context/AuthContext';   
import type { ChatMessage } from '~/types/chat';
import type { ChatServiceState } from '~/types/chat-service.types';
import { getWebSocketUrl } from '~/lib/env';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

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
  const [state, setState] = useState<ChatServiceState>(initialState);

  useEffect(() => {
    
    if (!user || !session) {
      // Clean up if user logs out
      if (chatServiceRef.current) {
        chatServiceRef.current.disconnect();
        chatServiceRef.current = null;
        setState(initialState);
      }
      return;
    }
    
    
    // Initialize chat service with WebSocket URL from environment
    const wsUrl = getWebSocketUrl();


    // For testing, use the test user ID if in development
    const userId = user.id;

    const chatService = new ChatService({
      url: wsUrl,
      userId: userId,
      authToken: session.access_token,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
      
      // NEW: Log complete raw message structure
      // Message details logged for debugging
      
      // NEW: Deep analysis of metadata
      if (message.metadata) {
        
        // NEW: Log componentData structure if present
        if (message.metadata.componentData) {
          
          // Special handling for email data - check if it's actually email data
          if ('emails' in message.metadata.componentData && 
              Array.isArray(message.metadata.componentData.emails)) {
            const emailData = message.metadata.componentData as any; // Type assertion for logging
            
            if (emailData.emails && emailData.emails.length > 0) {
              // Email data structure logged for debugging
            }
          }
          
          // Log full componentData structure
        }
        
        // NEW: Log unifiedResponse if present
        if (message.metadata.unifiedResponse) {
        }
      }
      
      
      setState((prev) => {
        // Message state updates logged for debugging
        
        const newMessages = [...prev.messages, message];
        
        return {
          ...prev,
          messages: newMessages,
          isTyping: false,
        };
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
      } catch (error) {
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

    return () => {
      chatService.disconnect();
    };
  }, [user, session]);

  const sendMessage = useCallback(async (content: string) => {
    
    if (!chatServiceRef.current || !content.trim()) {
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
      await chatServiceRef.current.sendMessage(content);
    } catch (error) {
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
    if (chatServiceRef.current) {
      chatServiceRef.current.connect();
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
