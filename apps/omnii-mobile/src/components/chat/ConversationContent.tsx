import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
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
  onPromptSelect,
  tasksOverview
}) => {
  const { isDark } = useTheme();

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

        {/* Welcome message */}
        <View className="mb-8 items-center">
          <Text className={cn(
            "text-3xl font-bold mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>Welcome to Chat! 👋</Text>
          <Text className={cn(
            "text-base text-center",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>I'm here to help manage your tasks, calendar, and more.</Text>
        </View>

        {/* Chat prompts */}
        <View className="mb-6">
          <Text className={cn(
            "text-lg font-semibold mb-4",
            isDark ? "text-white" : "text-gray-900"
          )}>💡 Try asking me...</Text>
          <View className="gap-3">
            {CHAT_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                className={cn(
                  "rounded-2xl p-4 border shadow-sm",
                  isDark 
                    ? "bg-slate-800 border-slate-700 active:bg-slate-700" 
                    : "bg-white border-gray-200 active:bg-gray-50"
                )}
                onPress={() => onPromptSelect(prompt)}
                activeOpacity={0.7}
              >
                <Text className={cn(
                  "text-base",
                  isDark ? "text-white" : "text-gray-900"
                )}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  const reversedMessages = [...messages].reverse();

  return (
    <View className="flex-1">
      <FlatList
        ref={flatListRef}
        data={reversedMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatMessage 
            message={item} 
            onEmailAction={onEmailAction} 
            onTaskAction={onTaskAction} 
          />
        )}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        extraData={messages.length}
        removeClippedSubviews={false}
        ListHeaderComponent={
          (() => {
            if (pendingAction) {
              return <PendingMessage action={pendingAction} />;
            }

            if (isTyping) {
              return (
                <View className={cn(
                  "rounded-xl p-4 mb-4 border",
                  isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                )}>
                  <Text className={cn(
                    "text-sm",
                    isDark ? "text-white" : "text-gray-900"
                  )}>AI is thinking...</Text>
                </View>
              );
            }

            return null;
          })()
        }
      />
    </View>
  );
};