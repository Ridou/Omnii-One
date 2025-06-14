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
    console.log('🔄 [useChat] *** EFFECT RUNNING ***');
    console.log('[useChat] User:', !!user, 'Session:', !!session);
    
    if (!user || !session) {
      console.log('⚠️ [useChat] No user or session, cleaning up');
      // Clean up if user logs out
      if (chatServiceRef.current) {
        chatServiceRef.current.disconnect();
        chatServiceRef.current = null;
        setState(initialState);
      }
      return;
    }
    
    console.log('🚀 [useChat] *** INITIALIZING CHAT SERVICE ***');
    
    // Initialize chat service with WebSocket URL from environment
    const wsUrl = getWebSocketUrl();

    console.log('[useChat] WebSocket URL:', wsUrl);
    console.log('[useChat] User ID:', user.id);

    // For testing, use the test user ID if in development
    const userId = user.id;

    const chatService = new ChatService({
      url: wsUrl,
      userId: userId,
      authToken: session.access_token,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    console.log('✅ [useChat] ChatService created successfully');
    chatServiceRef.current = chatService;

    // Set up event listeners
    console.log('🔗 [useChat] *** SETTING UP EVENT LISTENERS ***');
    
    chatService.on('connected', () => {
      console.log('🔌 [useChat] *** WEBSOCKET CONNECTED ***');
      console.log('[useChat] Connected to WebSocket');
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
    });

    chatService.on('disconnected', (reason: string) => {
      console.log('🔌❌ [useChat] *** WEBSOCKET DISCONNECTED ***');
      console.log('[useChat] Disconnected:', reason);
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    chatService.on('message', (message: ChatMessage) => {
      console.log('🎯 [useChat] *** MESSAGE EVENT RECEIVED ***');
      console.log('[useChat] New message received!');
      
      // NEW: Log complete raw message structure
      console.log('[useChat] 📄 COMPLETE RAW MESSAGE STRUCTURE:');
      console.log(JSON.stringify(message, null, 2));
      
      console.log('[useChat] 🔍 MESSAGE ANALYSIS:');
      console.log('[useChat] Message details:', {
        id: message.id,
        content: message.content?.substring(0, 100) + '...',
        sender: message.sender,
        timestamp: message.timestamp,
        type: message.type,
        hasMetadata: !!message.metadata,
        hasConfidence: message.confidence !== undefined,
        hasSources: !!message.sources,
      });
      
      // NEW: Deep analysis of metadata
      if (message.metadata) {
        console.log('[useChat] 📊 METADATA ANALYSIS:');
        console.log('[useChat] - metadata keys:', Object.keys(message.metadata));
        console.log('[useChat] - category:', message.metadata.category);
        console.log('[useChat] - result:', message.metadata.result);
        console.log('[useChat] - hasComponentData:', !!message.metadata.componentData);
        console.log('[useChat] - hasComponentActions:', !!message.metadata.componentActions);
        console.log('[useChat] - hasUnifiedResponse:', !!message.metadata.unifiedResponse);
        console.log('[useChat] - hasRawResponse:', !!message.metadata.rawResponse);
        console.log('[useChat] - hasDisplay:', !!message.metadata.display);
        console.log('[useChat] - hasContext:', !!message.metadata.context);
        console.log('[useChat] - hasReasoning:', !!message.metadata.reasoning);
        
        // NEW: Log componentData structure if present
        if (message.metadata.componentData) {
          console.log('[useChat] 📦 COMPONENT DATA STRUCTURE:');
          console.log('[useChat] - componentData type:', typeof message.metadata.componentData);
          console.log('[useChat] - componentData keys:', Object.keys(message.metadata.componentData));
          
          // Special handling for email data - check if it's actually email data
          if ('emails' in message.metadata.componentData && 
              Array.isArray(message.metadata.componentData.emails)) {
            const emailData = message.metadata.componentData as any; // Type assertion for logging
            console.log('[useChat] 📧 EMAIL LIST COMPONENT DATA:');
            console.log('[useChat] - emails array length:', emailData.emails?.length || 0);
            console.log('[useChat] - totalCount:', emailData.totalCount);
            console.log('[useChat] - unreadCount:', emailData.unreadCount);
            console.log('[useChat] - hasMore:', emailData.hasMore);
            
            if (emailData.emails && emailData.emails.length > 0) {
              console.log('[useChat] - First email keys:', Object.keys(emailData.emails[0]));
              console.log('[useChat] - Sample email:', {
                subject: emailData.emails[0].subject,
                from: emailData.emails[0].from,
                isRead: emailData.emails[0].isRead,
                date: emailData.emails[0].date
              });
            }
          }
          
          // Log full componentData structure
          console.log('[useChat] 📄 FULL COMPONENT DATA:');
          console.log(JSON.stringify(message.metadata.componentData, null, 2));
        }
        
        // NEW: Log unifiedResponse if present
        if (message.metadata.unifiedResponse) {
          console.log('[useChat] 🎯 UNIFIED RESPONSE STRUCTURE:');
          console.log('[useChat] - unifiedResponse keys:', Object.keys(message.metadata.unifiedResponse));
          console.log('[useChat] - type:', message.metadata.unifiedResponse.type);
          console.log('[useChat] - success:', message.metadata.unifiedResponse.success);
          console.log('[useChat] - has data.ui:', !!message.metadata.unifiedResponse.data?.ui);
          console.log('[useChat] - has data.structured:', !!message.metadata.unifiedResponse.data?.structured);
          console.log('[useChat] - has data.raw:', !!message.metadata.unifiedResponse.data?.raw);
        }
      }
      
      console.log('[useChat] Full message object keys:', Object.keys(message));
      
      setState((prev) => {
        console.log('🔄 [useChat] *** UPDATING STATE ***');
        console.log(
          '[useChat] Before adding new message - current messages:',
          prev.messages.length
        );
        console.log(
          '[useChat] Current messages summary:',
          prev.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            content: m.content.substring(0, 30) + '...',
          }))
        );
        
        const newMessages = [...prev.messages, message];
        console.log(
          '[useChat] After adding new message - total messages:',
          newMessages.length
        );
        console.log('✅ [useChat] *** STATE UPDATE COMPLETE ***');
        
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
      console.error('[useChat] Error:', error);
      setState((prev) => ({ ...prev, error: error.message }));
    });

    chatService.on('authRequired', async (authUrl: string) => {
      console.log('[useChat] OAuth required:', authUrl);
      try {
        // Open OAuth flow in browser
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          Linking.createURL('oauth-callback')
        );

        if (result.type === 'success') {
          // OAuth completed, service should auto-retry
          console.log('[useChat] OAuth completed successfully');
        }
      } catch (error) {
        console.error('[useChat] OAuth error:', error);
        setState((prev) => ({
          ...prev,
          error: 'Authentication failed. Please try again.',
        }));
      }
    });

    // Connect to WebSocket
    console.log('🌐 [useChat] *** CALLING CONNECT METHOD ***');
    chatService.connect();
    console.log('✅ [useChat] Connect method called successfully');

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

    console.log('[useChat] Adding welcome message:', welcomeMessage);
    setState((prev) => {
      console.log(
        '[useChat] Before adding welcome - messages:',
        prev.messages.length
      );
      const newState = { ...prev, messages: [welcomeMessage] };
      console.log(
        '[useChat] After adding welcome - messages:',
        newState.messages.length
      );
      return newState;
    });

    console.log('🧹 [useChat] *** SETTING UP CLEANUP FUNCTION ***');
    return () => {
      console.log('[useChat] Cleaning up');
      chatService.disconnect();
    };
  }, [user, session]);

  const sendMessage = useCallback(async (content: string) => {
    console.log('📤 [useChat] *** SEND MESSAGE CALLED ***');
    console.log('[useChat] Message content:', content);
    console.log('[useChat] ChatService exists:', !!chatServiceRef.current);
    console.log('[useChat] Content is not empty:', !!content.trim());
    
    if (!chatServiceRef.current || !content.trim()) {
      console.log('❌ [useChat] Cannot send - no ChatService or empty content');
      return;
    }

    console.log('[useChat] Sending message:', content);

    // Optimistically add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    console.log('[useChat] Created user message:', userMessage.id);
    setState((prev) => {
      console.log('[useChat] Adding user message to state');
      return {
        ...prev,
        messages: [...prev.messages, userMessage],
        isTyping: true,
      };
    });

    try {
      console.log('[useChat] Calling chatService.sendMessage...');
      await chatServiceRef.current.sendMessage(content);
      console.log('✅ [useChat] Message sent successfully');
    } catch (error) {
      console.error('❌ [useChat] Send message error:', error);
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
    console.log('[useChat] ✏️ Edit message called:', messageId, newContent);
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content: newContent } : msg
      ),
    }));
  }, []);

  // ✅ FINAL STEP: Email action handler for rich email interactions
  const handleEmailAction = useCallback((action: string, data: any) => {
    console.log('[useChat] 📧 Email action triggered:', action, data);
    
    if (!chatServiceRef.current || !state.isConnected) {
      console.log('[useChat] ❌ Cannot handle email action - no connection');
      return;
    }

    switch (action) {
      case 'reply_first':
        if (data && data.subject) {
          const replyMessage = `reply to email with subject: "${data.subject}"`;
          console.log('[useChat] 📧 Sending reply command:', replyMessage);
          sendMessage(replyMessage);
        }
        break;
        
      case 'load_more':
        console.log('[useChat] 📧 Loading more emails');
        sendMessage('fetch more emails');
        break;
        
      case 'open_email':
        if (data && data.subject) {
          const openMessage = `open email: "${data.subject}"`;
          console.log('[useChat] 📧 Opening email:', openMessage);
          sendMessage(openMessage);
        }
        break;
        
      case 'show_more':
        console.log('[useChat] 📧 Showing more emails in current list');
        // This action is handled locally in the component (expand/collapse)
        break;
        
      default:
        console.log('[useChat] ⚠️ Unknown email action:', action);
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
