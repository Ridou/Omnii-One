import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Animated } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { type ChatMessage as ChatMessageType } from '~/types/chat';
import { PendingMessage } from '~/components/chat/PendingMessage';
import { ConnectionError } from '~/components/chat/ConnectionError';
import { WebSocketDebug } from '~/components/chat/WebSocketDebug';
import { CHAT_PROMPTS } from '~/constants/chat';
import { ChatMessage } from './ChatMessage';

interface ConversationContentProps {
  messages: ChatMessageType[];
  error: string | null;
  isConnected: boolean;
  isTyping: boolean;
  pendingAction: string | null;
  flatListRef: React.RefObject<FlatList | null>;
  onRetry: () => void;
  onEmailAction: (action: string, data?: any) => void;
  onTaskAction: (action: string, data?: any) => void;
  onContactAction: (action: string, data?: any) => void;
  onCalendarAction: (action: string, data?: any) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onPromptSelect: (prompt: string) => void;
  tasksOverview?: any; // TODO: type this properly
}

export const ConversationContent: React.FC<ConversationContentProps> = ({
  messages,
  error,
  isConnected,
  isTyping,
  pendingAction,
  flatListRef,
  onRetry,
  onEmailAction,
  onTaskAction,
  onContactAction,
  onCalendarAction,
  onEditMessage,
  onPromptSelect,
  tasksOverview
}) => {
  const { isDark } = useTheme();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollToBottomOpacity = useRef(new Animated.Value(0)).current;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle scroll events to show/hide scroll-to-bottom button
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    
    if (isNearBottom && showScrollToBottom) {
      setShowScrollToBottom(false);
      Animated.timing(scrollToBottomOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (!isNearBottom && !showScrollToBottom && messages.length > 3) {
      setShowScrollToBottom(true);
      Animated.timing(scrollToBottomOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  if (error && !isConnected) {
    return <ConnectionError error={error} onRetry={onRetry} />;
  }

  if (messages.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Debug panel for development */}
        {__DEV__ && (
          <>
            <WebSocketDebug />
            <View className={cn(
              "rounded-2xl p-4 mb-4 border",
              isDark ? "bg-slate-800/50 border-slate-700" : "bg-blue-50 border-blue-200"
            )}>
              <Text className={cn(
                "text-base font-semibold mb-2",
                isDark ? "text-white" : "text-gray-900"
              )}>
                🐛 DEBUG: Messages array is empty
              </Text>
              <Text className={cn(
                "text-sm",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>
                Showing prompts instead of chat messages
              </Text>
              {tasksOverview && (
                <Text className={cn(
                  "text-xs mt-2 font-mono",
                  isDark ? "text-green-400" : "text-green-600"
                )}>
                  Tasks loaded: {JSON.stringify(tasksOverview).slice(0, 100)}...
                </Text>
              )}
            </View>
          </>
        )}

        {/* Shape of AI - Identifiers: AI Welcome Section */}
        <View className="mb-8 items-center">
          <View className={cn(
            "w-16 h-16 rounded-2xl items-center justify-center mb-4",
            isDark ? "bg-gradient-to-br from-indigo-600 to-purple-600" : "bg-gradient-to-br from-indigo-500 to-purple-500"
          )}>
            <Text className="text-3xl">🤖</Text>
          </View>
          <Text className={cn(
            "text-3xl font-bold mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>Welcome to AI Chat! 👋</Text>
          <Text className={cn(
            "text-base text-center",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>I'm here to help manage your tasks, calendar, and more.</Text>
          
          {/* Shape of AI - Disclosure: AI Capability Badge */}
          <View className={cn(
            "mt-3 px-3 py-1.5 rounded-full border",
            isDark ? "bg-indigo-950/30 border-indigo-700" : "bg-indigo-50 border-indigo-200"
          )}>
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-indigo-400" : "text-indigo-700"
            )}>🤖 AI-Powered Assistant • Always Learning</Text>
          </View>
        </View>

        {/* Shape of AI - Wayfinders: Enhanced Suggestions */}
        <AIWayfinderSection onPromptSelect={onPromptSelect} />
      </ScrollView>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        ref={flatListRef}
        data={messages} // Fixed: No longer reversing messages
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          // Find the last user message for edit functionality
          const lastUserMessageIndex = messages.map((msg, idx) => ({ msg, idx }))
            .filter(({ msg }) => msg.sender === 'user')
            .pop()?.idx;
          const isLastUserMessage = item.sender === 'user' && index === lastUserMessageIndex;
          
          return (
            <ChatMessage 
              message={item}
              isLastUserMessage={isLastUserMessage}
              onEmailAction={onEmailAction} 
              onTaskAction={onTaskAction}
              onContactAction={onContactAction}
              onCalendarAction={onCalendarAction}
              onEditMessage={onEditMessage}
            />
          );
        }}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        extraData={messages.length}
        removeClippedSubviews={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListFooterComponent={
          (() => {
            if (isTyping) {
              return <AIThinkingIndicator />;
            }

            if (pendingAction) {
              return <PendingMessage action={pendingAction} />;
            }

            return null;
          })()
        }
      />

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <Animated.View 
          style={{ 
            opacity: scrollToBottomOpacity,
            position: 'absolute',
            bottom: 20,
            right: 20,
          }}
        >
          <TouchableOpacity
            onPress={scrollToBottom}
            className={cn(
              "w-12 h-12 rounded-full items-center justify-center shadow-lg",
              isDark ? "bg-indigo-600" : "bg-indigo-500"
            )}
          >
            <Text className="text-white text-lg">↓</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

// Shape of AI - Wayfinders: Enhanced Suggestion System
const AIWayfinderSection: React.FC<{ onPromptSelect: (prompt: string) => void }> = ({ 
  onPromptSelect 
}) => {
  const { isDark } = useTheme();
  
  const suggestionCategories = [
    {
      title: "📋 Task Management",
      icon: "📋",
      color: "purple",
      prompts: [
        "What's on my task list today?",
        "Create a new task for tomorrow",
        "Show my overdue tasks"
      ]
    },
    {
      title: "📅 Calendar",
      icon: "📅", 
      color: "blue",
      prompts: [
        "What's my schedule today?",
        "Schedule a meeting next week",
        "Find time for a 1-hour focus session"
      ]
    },
    {
      title: "📧 Email",
      icon: "📧",
      color: "green", 
      prompts: [
        "Check my recent emails",
        "Draft a follow-up email",
        "Summarize important emails"
      ]
    }
  ];

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-4">
        <Text className={cn(
          "text-lg font-semibold",
          isDark ? "text-white" : "text-gray-900"
        )}>💡 Try asking me...</Text>
        <View className={cn(
          "ml-3 px-2 py-1 rounded-md",
          isDark ? "bg-green-950/30" : "bg-green-100"
        )}>
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-green-400" : "text-green-700"
          )}>Smart Suggestions</Text>
        </View>
      </View>
      
      <View className="gap-4">
        {suggestionCategories.map((category, categoryIndex) => (
          <View key={categoryIndex}>
            <View className="flex-row items-center mb-3">
              <Text className="text-lg mr-2">{category.icon}</Text>
              <Text className={cn(
                "text-sm font-medium",
                isDark ? "text-slate-300" : "text-gray-700"
              )}>{category.title}</Text>
            </View>
            <View className="gap-2">
              {category.prompts.map((prompt, promptIndex) => (
                <TouchableOpacity
                  key={promptIndex}
                  className={cn(
                    "rounded-xl p-3 border shadow-sm",
                    isDark 
                      ? "bg-slate-800 border-slate-700 active:bg-slate-700" 
                      : "bg-white border-gray-200 active:bg-gray-50"
                  )}
                  onPress={() => onPromptSelect(prompt)}
                  activeOpacity={0.7}
                >
                  <Text className={cn(
                    "text-sm",
                    isDark ? "text-white" : "text-gray-900"
                  )}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Shape of AI - Nudges: Capability Hints */}
      <View className={cn(
        "mt-6 p-4 rounded-xl border border-dashed",
        isDark ? "border-slate-600 bg-slate-800/50" : "border-gray-300 bg-gray-50"
      )}>
        <View className="flex-row items-center mb-2">
          <Text className="text-lg mr-2">💫</Text>
          <Text className={cn(
            "text-sm font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>Pro Tip</Text>
        </View>
        <Text className={cn(
          "text-xs",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          I can help with complex requests too! Try: "Schedule a team meeting for next week and add it to everyone's calendar" or "Find all urgent emails and create tasks from them"
        </Text>
      </View>
    </View>
  );
};

// Shape of AI - Governors: AI Thinking Indicator with Transparency
const AIThinkingIndicator: React.FC = () => {
  const { isDark } = useTheme();
  const [currentStage, setCurrentStage] = useState(0);
  
  const processingStages = [
    "Analyzing your request...",
    "Gathering context...", 
    "Processing with AI...",
    "Preparing response..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % processingStages.length);
    }, 1500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <View className={cn(
      "rounded-xl p-4 mb-4 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-2">
        <View className={cn(
          "w-8 h-8 rounded-lg items-center justify-center mr-3",
          isDark ? "bg-indigo-950/50" : "bg-indigo-100"
        )}>
          <Text className="text-lg">🤖</Text>
        </View>
        <Text className={cn(
          "text-sm font-medium",
          isDark ? "text-white" : "text-gray-900"
        )}>AI is thinking...</Text>
      </View>
      
      {/* Shape of AI - Footprints: Show Processing Stage */}
      <View className={cn(
        "px-3 py-2 rounded-lg",
        isDark ? "bg-slate-700" : "bg-gray-50"
      )}>
        <Text className={cn(
          "text-xs font-medium",
          isDark ? "text-slate-300" : "text-gray-700"
        )}>{processingStages[currentStage]}</Text>
      </View>
      
      {/* Progress indicator */}
      <View className={cn(
        "mt-3 h-1 rounded-full",
        isDark ? "bg-slate-700" : "bg-gray-200"
      )}>
        <View className={cn(
          "h-full rounded-full bg-indigo-500 transition-all duration-1500",
          `w-${Math.round(((currentStage + 1) / processingStages.length) * 100)}`
        )} />
      </View>
    </View>
  );
};