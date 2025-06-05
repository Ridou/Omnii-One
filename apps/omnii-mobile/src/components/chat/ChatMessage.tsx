import React, { useState } from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity } from 'react-native';
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
} from '~/types/unified-response.validation';

interface ChatMessageProps {
  message: ChatMessageType;
  onEmailAction?: (action: string, data: any) => void;
  onTaskAction?: (action: string, data: any) => void;
  onContactAction?: (action: string, data: any) => void;
  onCalendarAction?: (action: string, data: any) => void;
}

// Simple response card using processed display data from service
function ResponseCard({ metadata }: { metadata?: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!metadata?.display?.hasResponse) return null;

  const { display } = metadata;

  return (
    <View className="mt-3 p-3 bg-omnii-background rounded-lg border border-omnii-border-light">
      {/* Header with pre-processed category and result */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="omnii-body text-xs font-semibold">
          {display.categoryIcon} {display.categoryName}
        </Text>
        {display.resultEmoji && (
          <Text className="omnii-body text-xs">
            {display.resultEmoji} {display.resultName}
          </Text>
        )}
      </View>

      {/* Expandable raw response */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="py-1"
      >
        <Text className="omnii-body text-xs text-ai-start font-medium">
          {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView 
          className="mt-2 max-h-[150px] bg-omnii-text-secondary bg-opacity-5 rounded p-2" 
          nestedScrollEnabled
        >
          <Text 
            className="omnii-body text-xs text-omnii-text-secondary leading-4"
            style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
          >
            {JSON.stringify(metadata.rawResponse, null, 2)}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

export function ChatMessage({ message, onEmailAction, onTaskAction, onContactAction, onCalendarAction }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  // ✅ PHASE 3: Fix type comparison - check metadata only to avoid type conflicts
  const isSystemOrAction = message.metadata?.category === 'system' || message.metadata?.category === 'action';

  // ✅ PHASE 3: Static email detection using enhanced ChatService categories
  const isEmailList = message.metadata?.category === ResponseCategory.EMAIL_LIST;
  const isEmailSingle = message.metadata?.category === ResponseCategory.EMAIL_SINGLE;
  const emailListData = isEmailList && message.metadata?.componentData && isEmailListData(message.metadata.componentData) 
    ? message.metadata.componentData 
    : null;

  // ✅ NEW: Complete task overview detection using Zod type guard
  const isCompleteTaskOverviewDetected = message.metadata?.category === ResponseCategory.TASK_COMPLETE_OVERVIEW || 
    (message.metadata?.category === ResponseCategory.TASK_SINGLE && message.metadata?.componentData && isCompleteTaskOverview(message.metadata.componentData));
  const completeTaskOverviewData = isCompleteTaskOverviewDetected && message.metadata?.componentData && isCompleteTaskOverview(message.metadata.componentData)
    ? message.metadata.componentData
    : null;

  // ✅ NEW: Contact list detection using Zod type guard
  const isContactList = message.metadata?.category === ResponseCategory.CONTACT_LIST || 
    (message.metadata?.category === ResponseCategory.CONTACT_SINGLE && message.metadata?.componentData && isContactListData(message.metadata.componentData));
  const contactListData = isContactList && message.metadata?.componentData && isContactListData(message.metadata.componentData)
    ? message.metadata.componentData
    : null;

  // ✅ NEW: Calendar list detection using Zod type guard
  const isCalendarList = message.metadata?.category === ResponseCategory.CALENDAR_LIST || 
    (message.metadata?.category === ResponseCategory.CALENDAR_EVENT && message.metadata?.componentData && isCalendarListData(message.metadata.componentData));
  const calendarListData = isCalendarList && message.metadata?.componentData && isCalendarListData(message.metadata.componentData)
    ? message.metadata.componentData
    : null;

  console.log('[ChatMessage] 🔍 ANALYZING MESSAGE:');
  console.log('[ChatMessage] - Category:', message.metadata?.category);
  console.log('[ChatMessage] - Is Email List:', isEmailList);
  console.log('[ChatMessage] - Has Email Data:', !!emailListData);
  console.log('[ChatMessage] - Email Count:', emailListData?.emails?.length || 0);
  console.log('[ChatMessage] - Is Complete Task Overview:', isCompleteTaskOverviewDetected);
  console.log('[ChatMessage] - Has Complete Task Data:', !!completeTaskOverviewData);
  console.log('[ChatMessage] - Total Tasks:', (completeTaskOverviewData as any)?.totalTasks || 0);
  console.log('[ChatMessage] - Is Contact List:', isContactList);
  console.log('[ChatMessage] - Has Contact Data:', !!contactListData);
  console.log('[ChatMessage] - Contact Count:', contactListData?.contacts?.length || 0);
  console.log('[ChatMessage] - Contact List Validation Result:', contactListData ? isContactListData(contactListData) : 'no data');
  console.log('[ChatMessage] - Contact Data Sample:', contactListData?.contacts?.[0] ? {
    name: contactListData.contacts[0].name,
    hasEmails: contactListData.contacts[0].emails?.length > 0,
    hasPhones: contactListData.contacts[0].phones?.length > 0
  } : 'no sample');
  console.log('[ChatMessage] - Is Calendar List:', isCalendarList);
  console.log('[ChatMessage] - Has Calendar Data:', !!calendarListData);
  console.log('[ChatMessage] - Calendar Count:', calendarListData?.events?.length || 0);

  // ✅ FINAL STEP: Handle email action interactions using real handler
  const handleEmailAction = (action: string, data: any) => {
    console.log('[ChatMessage] Email action triggered:', action, data);
    // ✅ Use the real email action handler from useChat
    if (onEmailAction) {
      onEmailAction(action, data);
    } else {
      console.log('[ChatMessage] ⚠️ No email action handler provided');
    }
  };

  // ✅ NEW: Handle task action interactions
  const handleTaskAction = (action: string, data: any) => {
    console.log('[ChatMessage] Task action triggered:', action, data);
    if (onTaskAction) {
      onTaskAction(action, data);
    } else {
      console.log('[ChatMessage] ⚠️ No task action handler provided');
    }
  };

  // ✅ NEW: Handle contact action interactions
  const handleContactAction = (action: string, data: any) => {
    console.log('[ChatMessage] Contact action triggered:', action, data);
    if (onContactAction) {
      onContactAction(action, data);
    } else {
      console.log('[ChatMessage] ⚠️ No contact action handler provided');
    }
  };

  // ✅ NEW: Handle calendar action interactions
  const handleCalendarAction = (action: string, data: any) => {
    console.log('[ChatMessage] Calendar action triggered:', action, data);
    if (onCalendarAction) {
      onCalendarAction(action, data);
    } else {
      console.log('[ChatMessage] ⚠️ No calendar action handler provided');
    }
  };

  if (isSystemOrAction) {
    return (
      <View className="items-center my-2 mx-0">
        <View className="omnii-card rounded-xl py-3.5 px-5 max-w-[95%] w-full items-center justify-center shadow-sm">
          <Text className="omnii-body text-base text-center leading-6">
            {message.content}
          </Text>
        </View>
        <Text className="omnii-caption text-xs mt-1 text-center">
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
          ? "bg-ai-start rounded-br-sm border-ai-start border-opacity-30" 
          : "omnii-card rounded-bl-sm border-omnii-border-light"
      )}>
        <Text className={cn(
          "omnii-body text-base leading-6",
          isUser ? "text-white" : "text-omnii-text-primary"
        )}>
          {message.content}
        </Text>

        {/* ✅ PHASE 3: Render email list if available */}
        {isEmailList && emailListData && (
          <EmailListComponent
            emails={emailListData.emails}
            totalCount={emailListData.totalCount}
            unreadCount={emailListData.unreadCount}
            hasMore={emailListData.hasMore}
            onAction={handleEmailAction}
          />
        )}

        {/* ✅ NEW: Render complete task overview if available */}
        {isCompleteTaskOverviewDetected && completeTaskOverviewData && (
          <CompleteTaskOverviewComponent
            overview={completeTaskOverviewData}
            onAction={handleTaskAction}
          />
        )}

        {/* ✅ NEW: Render contact list if available */}
        {isContactList && contactListData && (
          <ContactListComponent
            contacts={contactListData.contacts}
            totalCount={contactListData.totalCount}
            hasMore={contactListData.hasMore}
            nextPageToken={contactListData.nextPageToken}
            onAction={handleContactAction}
          />
        )}

        {/* ✅ NEW: Render calendar list if available */}
        {isCalendarList && calendarListData && (
          <CalendarListComponent
            events={calendarListData.events}
            totalCount={calendarListData.totalCount}
            hasMore={calendarListData.hasMore}
            // nextPageToken={calendarListData.nextPageToken}
            onAction={handleCalendarAction}
          />
        )}

        {/* Confidence indicator for AI messages */}
        {!isUser && message.confidence && (
          <View className="mt-2">
            <View className="h-0.5 bg-omnii-border-light rounded-sm overflow-hidden mb-1">
              <View
                className="h-full bg-ai-start rounded-sm"
                style={{ width: `${message.confidence}%` }}
              />
            </View>
            <Text className="omnii-caption text-xs">
              {message.confidence}% confident
            </Text>
          </View>
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <View className="mt-2 pt-2 border-t border-omnii-border-light">
            <Text className="omnii-body text-xs font-semibold mb-1">
              Sources:
            </Text>
            {message.sources.map((source, index) => (
              <Text key={source.id || index} className="omnii-body text-xs ml-2 leading-5">
                • {source.name}
              </Text>
            ))}
          </View>
        )}

        {/* XP Earned */}
        {message.xpEarned && (
          <View className="self-end bg-ai-start bg-opacity-15 px-2 py-1 rounded-lg mt-2">
            <Text className="omnii-body text-xs text-ai-start font-semibold">
              +{message.xpEarned} XP
            </Text>
          </View>
        )}

        {/* Response Card using processed display data */}
        <ResponseCard metadata={message.metadata} />
      </View>

      <Text className="omnii-caption text-xs mt-1 mx-1">
        🕐 {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  );
}