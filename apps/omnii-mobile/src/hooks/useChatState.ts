import { useState, useEffect, useRef, useCallback } from 'react';
import { FlatList } from 'react-native';
import type { ChatTab } from '~/types/chat';
import { CheeringTrigger } from '~/types/mascot';
import { useResponsiveDesign } from '~/utils/responsive';
import { useMascotCheering } from '~/components/common/Mascot';
import { useChat } from '~/hooks/useChat';

export const useChatState = () => {
  const responsive = useResponsiveDesign();
  const { triggerCheering } = useMascotCheering();
  const chat = useChat();
  
  const [selectedTab, setSelectedTab] = useState<ChatTab>('conversation');
  const [messageInput, setMessageInput] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showToolDropdown, setShowToolDropdown] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const flatListRef = useRef<FlatList | null>(null);

  const handleSendMessage = useCallback(() => {
    if (messageInput.trim() && chat.isConnected) {
      const message = messageInput.trim();
      chat.sendMessage(message);
      setMessageInput('');
      setPendingAction(message);
      
      if (!responsive.effectiveIsDesktop) {
        triggerCheering(CheeringTrigger.TASK_COMPLETE);
      }
    }
  }, [messageInput, chat.isConnected, chat.sendMessage, responsive.effectiveIsDesktop, triggerCheering]);

  const getSendButtonState = useCallback(() => {
    if (chat.isTyping || pendingAction) return 'loading';
    if (!messageInput.trim() || !chat.isConnected) return 'disabled';
    return 'enabled';
  }, [chat.isTyping, chat.isConnected, pendingAction, messageInput]);

  const getPlaceholder = useCallback(() => {
    if (!chat.isConnected) return "Connecting...";
    if (chat.isTyping || pendingAction) return "Processing...";
    return "💬 Ask me anything...";
  }, [chat.isConnected, chat.isTyping, pendingAction]);

  const handleQuickAction = useCallback((command: string) => {
    setMessageInput(command);
    setTimeout(() => {
      if (!command.endsWith(' ') && chat.isConnected && command.trim()) {
        chat.sendMessage(command);
        setMessageInput('');
        setPendingAction(command);
        
        if (!responsive.effectiveIsDesktop) {
          triggerCheering(CheeringTrigger.TASK_COMPLETE);
        }
      }
    }, 100);
  }, [chat.isConnected, chat.sendMessage, responsive.effectiveIsDesktop, triggerCheering]);

  const handleToolButton = useCallback((tool: string) => {
    setShowToolDropdown(current => current === tool ? null : tool);
  }, []);

  const handleDropdownAction = useCallback((action: any) => {
    handleQuickAction(action.command);
    setShowToolDropdown(null);
  }, [handleQuickAction]);

  const handleActionTap = useCallback((action: any) => {
    if (action.command) {
      handleQuickAction(action.command);
      setSelectedTab('conversation');
    }
  }, [handleQuickAction]);

  // Auto-scroll to top on new messages
  useEffect(() => {
    if (chat.messages.length > 0 && selectedTab === 'conversation') {
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({ index: 0, animated: true });
        } catch (error) {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
      }, 300);
    }
  }, [chat.messages, selectedTab]);

  // Watch for new user messages to set pending state
  useEffect(() => {
    if (chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage && lastMessage.sender === 'user' && !pendingAction) {
        setPendingAction(lastMessage.content);
      }
    }
  }, [chat.messages, pendingAction]);

  // Clear pending action when we receive a new AI message
  useEffect(() => {
    if (chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage && lastMessage.sender === 'ai' && pendingAction) {
        setPendingAction(null);
      }
    }
  }, [chat.messages, pendingAction]);

  // Recording timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  return {
    // State
    selectedTab,
    setSelectedTab,
    messageInput,
    setMessageInput,
    pendingAction,
    setPendingAction,
    showToolDropdown,
    setShowToolDropdown,
    isRecording,
    setIsRecording,
    recordingDuration,
    setRecordingDuration,
    flatListRef,
    
    // Handlers
    handleSendMessage,
    getSendButtonState,
    getPlaceholder,
    handleQuickAction,
    handleToolButton,
    handleDropdownAction,
    handleActionTap,
    
    // Chat props
    ...chat
  };
};