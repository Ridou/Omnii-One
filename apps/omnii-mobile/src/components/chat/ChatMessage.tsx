import React, { useState } from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import type { ChatMessage as ChatMessageType } from '~/types/chat';
import { ResponseCategory } from '~/services/chat/ChatService';
import { EmailListComponent, ContactListComponent, CalendarListComponent, CompleteTaskOverviewComponent } from './MessageComponents';

// ✅ ZOD TYPE GUARDS: Import from validation schema for type safety
import {
  isEmailListData,
  isCompleteTaskOverview,
  isContactListData,
  isCalendarListData
} from '@omnii/validators';

interface ChatMessageProps {
  message: ChatMessageType;
  isLastUserMessage?: boolean;
  onEmailAction?: (action: string, data: any) => void;
  onTaskAction?: (action: string, data: any) => void;
  onContactAction?: (action: string, data: any) => void;
  onCalendarAction?: (action: string, data: any) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

export function ChatMessage({ message, isLastUserMessage, onEmailAction, onTaskAction, onContactAction, onCalendarAction, onEditMessage }: ChatMessageProps) {
  const { isDark } = useTheme();
  const isUser = message.sender === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // ✅ IMPROVED: Check if message has rich content that should be expandable
  const hasRichContent = !!(
    message.metadata?.componentData || 
    message.sources?.length || 
    message.confidence
  );
  
  // ✅ IMPROVED: Only truncate text messages when they're long AND don't have rich content
  // If they have rich content, the rich content provides the value, not the truncated text
  const isLongTextMessage = message.content.length > 150;
  const shouldTruncate = isLongTextMessage && !isExpanded && !hasRichContent;
  const displayContent = shouldTruncate 
    ? message.content.substring(0, 150) + '...' 
    : message.content;
  
  // ✅ IMPROVED: Only show truncation button for long text messages without rich content
  const showTruncationToggle = isLongTextMessage && !hasRichContent;
  
  // Check if this is a system/action message
  const isSystemOrAction = message.metadata?.category === 'system' || message.metadata?.category === 'action';

  // Handle edit functionality  
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editedContent.trim() && onEditMessage) {
      onEditMessage(message.id, editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  // ✅ Component detection using enhanced ChatService categories
  const isEmailList = message.metadata?.category === ResponseCategory.EMAIL_LIST;
  const emailListData = isEmailList && message.metadata?.componentData && isEmailListData(message.metadata.componentData) 
    ? message.metadata.componentData 
    : null;

  // ✅ Complete task overview detection using Zod type guard
  const isCompleteTaskOverviewDetected = message.metadata?.category === ResponseCategory.TASK_COMPLETE_OVERVIEW || 
    (message.metadata?.category === ResponseCategory.TASK_SINGLE && message.metadata?.componentData && isCompleteTaskOverview(message.metadata.componentData));
  const completeTaskOverviewData = isCompleteTaskOverviewDetected && message.metadata?.componentData && isCompleteTaskOverview(message.metadata.componentData)
    ? message.metadata.componentData
    : null;

  // ✅ Contact list detection using Zod type guard
  const isContactList = message.metadata?.category === ResponseCategory.CONTACT_LIST || 
    (message.metadata?.category === ResponseCategory.CONTACT_SINGLE && message.metadata?.componentData && isContactListData(message.metadata.componentData));
  const contactListData = isContactList && message.metadata?.componentData && isContactListData(message.metadata.componentData)
    ? message.metadata.componentData
    : null;

  // ✅ Calendar list detection using Zod type guard
  const isCalendarList = message.metadata?.category === ResponseCategory.CALENDAR_LIST || 
    (message.metadata?.category === ResponseCategory.CALENDAR_EVENT && message.metadata?.componentData && isCalendarListData(message.metadata.componentData));
  const calendarListData = isCalendarList && message.metadata?.componentData && isCalendarListData(message.metadata.componentData)
    ? message.metadata.componentData
    : null;

  // ✅ Action handlers
  const handleEmailAction = (action: string, data: any) => {
    console.log('[ChatMessage] Email action triggered:', action, data);
    onEmailAction?.(action, data);
  };

  const handleTaskAction = (action: string, data: any) => {
    console.log('[ChatMessage] Task action triggered:', action, data);
    onTaskAction?.(action, data);
  };

  const handleContactAction = (action: string, data: any) => {
    console.log('[ChatMessage] Contact action triggered:', action, data);
    onContactAction?.(action, data);
  };

  const handleCalendarAction = (action: string, data: any) => {
    console.log('[ChatMessage] Calendar action triggered:', action, data);
    onCalendarAction?.(action, data);
  };

  // System/Action message styling
  if (isSystemOrAction) {
    return (
      <View className="items-center my-2 mx-0">
        <View className={cn(
          "rounded-xl py-3.5 px-5 max-w-[95%] w-full items-center justify-center shadow-sm border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <Text className={cn(
            "text-base text-center leading-6",
            isDark ? "text-white" : "text-gray-900"
          )}>
            {message.content}
          </Text>
        </View>
        <Text className={cn(
          "text-xs mt-1 text-center",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          🕐 {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    );
  }

  return (
    <View className={cn(
      "my-1 mx-4",
      isUser ? "items-end" : "items-start"
    )}>
      <View className={cn(
        "max-w-[80%] p-3 rounded-2xl border shadow-sm",
        isUser 
          ? "bg-indigo-600 rounded-br-sm border-indigo-600 border-opacity-30" 
          : isDark 
            ? "bg-slate-800 border-slate-600 rounded-bl-sm"
            : "bg-white border-gray-200 rounded-bl-sm"
      )}>
        {/* Message Content or Edit Input */}
        {isUser && isEditing ? (
          <View className="w-full">
            <TextInput
              value={editedContent}
              onChangeText={setEditedContent}
              multiline
              autoFocus
              className={cn(
                "text-base leading-6 p-2 border border-white/20 rounded-lg",
                "text-white bg-white/10"
              )}
              style={{ minHeight: 40 }}
              placeholderTextColor="rgba(255,255,255,0.6)"
            />
            <View className="flex-row justify-end mt-2 gap-2">
              <TouchableOpacity 
                onPress={handleCancelEdit}
                className="px-3 py-1 rounded-lg bg-white/20"
              >
                <Text className="text-white text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSaveEdit}
                className="px-3 py-1 rounded-lg bg-white/30"
                disabled={!editedContent.trim()}
              >
                <Text className={cn(
                  "text-sm font-medium",
                  editedContent.trim() ? "text-white" : "text-white/50"
                )}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            {/* ✅ IMPROVED: Clean message text display */}
            <Text className={cn(
              "text-base leading-6",
              isUser ? "text-white" : isDark ? "text-white" : "text-gray-900"
            )}>
              {displayContent}
            </Text>
            
            {/* ✅ IMPROVED: Only show truncation toggle for long text messages */}
            {showTruncationToggle && (
              <TouchableOpacity 
                onPress={() => setIsExpanded(!isExpanded)}
                className="mt-2 self-start"
              >
                <Text className={cn(
                  "text-sm font-medium",
                  isUser ? "text-white/80" : isDark ? "text-indigo-400" : "text-indigo-600"
                )}>
                  {shouldTruncate ? "Show more" : "Show less"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ✅ IMPROVED: Rich Content Components - Always visible when available */}
        {isEmailList && emailListData && (
          <View className="mt-3">
            <EmailListComponent
              emails={emailListData.emails}
              totalCount={emailListData.totalCount}
              unreadCount={emailListData.unreadCount}
              hasMore={emailListData.hasMore}
              onAction={handleEmailAction}
            />
          </View>
        )}

        {isCompleteTaskOverviewDetected && completeTaskOverviewData && (
          <View className="mt-3">
            <CompleteTaskOverviewComponent
              overview={completeTaskOverviewData}
              onAction={handleTaskAction}
            />
          </View>
        )}

        {isContactList && contactListData && (
          <View className="mt-3">
            <ContactListComponent
              contacts={contactListData.contacts}
              totalCount={contactListData.totalCount}
              hasMore={contactListData.hasMore}
              nextPageToken={contactListData.nextPageToken}
              onAction={handleContactAction}
            />
          </View>
        )}

        {isCalendarList && calendarListData && (
          <View className="mt-3">
            <CalendarListComponent
              events={calendarListData.events}
              totalCount={calendarListData.totalCount}
              hasMore={calendarListData.hasMore}
              onAction={handleCalendarAction}
            />
          </View>
        )}

        {/* ✅ IMPROVED: Optional metadata - only show when expanded AND available */}
        {isExpanded && (
          <>
            {!isUser && message.confidence && (
              <View className="mt-3">
                <View className={cn(
                  "h-0.5 rounded-sm overflow-hidden mb-1",
                  isDark ? "bg-slate-600" : "bg-gray-200"
                )}>
                  <View
                    className="h-full bg-indigo-600 rounded-sm"
                    style={{ width: `${message.confidence}%` }}
                  />
                </View>
                <Text className={cn(
                  "text-xs",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>
                  {message.confidence}% confident
                </Text>
              </View>
            )}

            {message.sources && message.sources.length > 0 && (
              <View className={cn(
                "mt-3 pt-2 border-t",
                isDark ? "border-slate-600" : "border-gray-200"
              )}>
                <Text className={cn(
                  "text-xs font-semibold mb-1",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  Sources:
                </Text>
                {message.sources.map((source, index) => (
                  <Text key={source.id || index} className={cn(
                    "text-xs ml-2 leading-5",
                    isDark ? "text-slate-400" : "text-gray-600"
                  )}>
                    • {source.name}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}

        {/* XP Earned */}
        {message.xpEarned && (
          <View className="self-end bg-indigo-600 bg-opacity-15 px-2 py-1 rounded-lg mt-2">
            <Text className="text-xs text-indigo-600 font-semibold">
              +{message.xpEarned} XP
            </Text>
          </View>
        )}
      </View>

      {/* Timestamp and Edit Button */}
      <View className={cn(
        "flex-row items-center mt-1 mx-1",
        isUser ? "justify-end" : "justify-start"
      )}>
        <Text className={cn(
          "text-xs",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          🕐 {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        
        {isUser && isLastUserMessage && !isEditing && onEditMessage && (
          <TouchableOpacity 
            onPress={handleStartEdit}
            className="ml-2 px-2 py-1 rounded-lg bg-indigo-600/20"
          >
            <Text className="text-xs text-indigo-600 font-medium">✏️ Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}