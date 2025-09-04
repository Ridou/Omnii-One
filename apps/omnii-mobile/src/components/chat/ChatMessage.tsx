import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { 
  EmailListComponent, 
  CompleteTaskOverviewComponent, 
  ContactListComponent, 
  CalendarListComponent,
  CompactDataSummary,
  ConversationalResponse,
  ExecutiveResponse,
  ContextDropdown
} from './MessageComponents';
import {
  AgentAutomationResponse,
  WebResearchResponse,
  YoutubeSearchResponse,
  N8nAgentStatusIndicator,
  WorkflowCoordinationResponse,
  N8nAgentResponseContainer
} from './N8nAgentComponents';
import { 
  isEmailListData, 
  isCompleteTaskOverview, 
  isContactListData, 
  isCalendarListData 
} from '@omnii/validators';
import { ResponseCategory } from '~/services/chat/ChatService';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: 'user' | 'assistant' | 'system';
    timestamp: string;
    sources?: any[];
    confidence?: number;
    metadata?: {
      category?: ResponseCategory;
      componentData?: any;
      action?: string; // New: for streaming message types
      compactData?: any; // New: for compact data updates
      reasoning?: string; // New: for conversational reasoning
      responseType?: string; // New: to identify message type
      // NEW: Executive assistant and context dropdown fields
      contextSummary?: {
        totalItems: number;
        emailCount: number;
        taskCount: number;
        calendarCount: number;
        contactCount: number;
        conceptCount: number;
        reasoning: string[];
      };
      relevantContext?: any;
      rdfInsights?: any;
      collapsed?: boolean;
      style?: string;
      priority?: string;
    };
  };
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
  
  // ✅ NEW: Check for streaming response types
  const isImmediateResponse = message.metadata?.action === 'immediate_response';
  const isDataUpdate = message.metadata?.action === 'data_update';
  const isConversationalResponse = message.metadata?.responseType === 'conversational';
  const isExecutiveResponse = message.metadata?.action === 'executive_response';
  const isContextDropdown = message.metadata?.action === 'context_dropdown';
  
  // ✅ IMPROVED: Check if message has rich content that should be expandable
  const hasRichContent = !!(
    message.metadata?.componentData || 
    message.sources?.length || 
    message.confidence ||
    isDataUpdate ||
    isExecutiveResponse ||
    isContextDropdown // New: enhanced message types have rich content
  );
  
  // ✅ IMPROVED: Only truncate text messages when they're long AND don't have rich content
  // If they have rich content, the rich content provides the value, not the truncated text
  const isLongTextMessage = message.content.length > 150;
  const shouldTruncate = isLongTextMessage && !isExpanded && !hasRichContent && !isImmediateResponse && !isExecutiveResponse && !isContextDropdown;
  const displayContent = shouldTruncate 
    ? message.content.substring(0, 150) + '...' 
    : message.content;
  
  // ✅ IMPROVED: Only show truncation button for long text messages without rich content
  const showTruncationToggle = isLongTextMessage && !hasRichContent && !isImmediateResponse && !isExecutiveResponse && !isContextDropdown;
  
  // Check if this is a system/action message (using general category for system messages)
  const isSystemOrAction = message.sender === 'system' || message.metadata?.category === ResponseCategory.ERROR;

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

  // ✅ NEW: Handle compact data expansion
  const handleExpandCompactData = () => {
    console.log('Expanding compact data:', message.metadata?.compactData);
    // You can implement expansion logic here if needed
    // For now, just log it
  };

  // ✅ Enhanced action handlers with logging
  const handleEmailAction = (action: string, data: any) => {
    console.log('ChatMessage: Email action:', action, data);
    onEmailAction?.(action, data);
  };

  const handleTaskAction = (action: string, data: any) => {
    console.log('ChatMessage: Task action:', action, data);
    onTaskAction?.(action, data);
  };

  const handleContactAction = (action: string, data: any) => {
    console.log('ChatMessage: Contact action:', action, data);
    onContactAction?.(action, data);
  };

  const handleCalendarAction = (action: string, data: any) => {
    console.log('ChatMessage: Calendar action:', action, data);
    onCalendarAction?.(action, data);
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

  return (
    <View className={cn(
      "mb-4 max-w-[85%]",
      isUser ? "self-end" : "self-start"
    )}>
      <View className={cn(
        "px-4 py-3 rounded-2xl",
        isUser 
          ? "bg-blue-500" 
          : isDark 
            ? isSystemOrAction ? "bg-slate-700" : "bg-slate-800"
            : isSystemOrAction ? "bg-blue-50" : "bg-white border border-gray-200"
      )}>
        {/* Edit Mode */}
        {isEditing ? (
          <View>
            <TextInput
              value={editedContent}
              onChangeText={setEditedContent}
              multiline
              className={cn(
                "text-base leading-6 p-2 rounded border",
                isDark ? "text-white bg-slate-700 border-slate-600" : "text-gray-900 bg-gray-50 border-gray-300"
              )}
              autoFocus
            />
            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                onPress={handleSaveEdit}
                className="px-3 py-1 bg-blue-500 rounded"
              >
                <Text className="text-white text-sm font-medium">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancelEdit}
                className={cn(
                  "px-3 py-1 rounded",
                  isDark ? "bg-slate-600" : "bg-gray-300"
                )}
              >
                <Text className={cn(
                  "text-sm font-medium",
                  isDark ? "text-white" : "text-gray-700"
                )}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            {/* ✅ NEW: Handle executive assistant responses (ChatGPT-like) */}
            {isExecutiveResponse && (
              <ExecutiveResponse
                message={message.content}
                metadata={message.metadata}
              />
            )}
            
            {/* ✅ NEW: Handle context dropdown (collapsible) */}
            {isContextDropdown && message.metadata?.contextSummary && (
              <ContextDropdown
                contextSummary={message.metadata.contextSummary}
                relevantContext={message.metadata.relevantContext}
                rdfInsights={message.metadata.rdfInsights}
                collapsed={message.metadata.collapsed}
              />
            )}
            
            {/* ✅ NEW: Handle n8n Agent responses */}
            {message.metadata?.category === ResponseCategory.N8N_AGENT_RESPONSE && (
              <AgentAutomationResponse
                agent={message.metadata.agent || 'Unknown Agent'}
                action={message.metadata.agentAction || message.metadata.action || 'Unknown Action'}
                result={message.metadata.result}
                executionTime={message.metadata.executionTime || '0s'}
                success={message.metadata.success !== false}
                metadata={message.metadata}
              />
            )}

            {/* ✅ NEW: Handle Web Research responses */}
            {message.metadata?.category === ResponseCategory.WEB_RESEARCH && (
              <WebResearchResponse
                query={message.metadata.webResearch?.query || message.metadata.query || 'Web search'}
                results={message.metadata.webResearch?.results || message.metadata.results || []}
                executionTime={message.metadata.executionTime || '0s'}
                metadata={message.metadata}
              />
            )}

            {/* ✅ NEW: Handle YouTube Search responses */}
            {message.metadata?.category === ResponseCategory.YOUTUBE_SEARCH && (
              <YoutubeSearchResponse
                query={message.metadata.youtubeSearch?.query || message.metadata.query || 'YouTube search'}
                videos={message.metadata.youtubeSearch?.videos || message.metadata.videos || []}
                executionTime={message.metadata.executionTime || '0s'}
                metadata={message.metadata}
              />
            )}

            {/* ✅ NEW: Handle Workflow Coordination responses */}
            {message.metadata?.category === ResponseCategory.WORKFLOW_COORDINATION && (
              <WorkflowCoordinationResponse
                workflow={message.metadata.workflow || {
                  name: 'Multi-Service Workflow',
                  steps: [],
                  overallStatus: 'completed',
                  executionTime: message.metadata.executionTime || '0s'
                }}
                metadata={message.metadata}
              />
            )}

            {/* ✅ NEW: Handle Agent Automation responses */}
            {message.metadata?.category === ResponseCategory.AGENT_AUTOMATION && (
              <N8nAgentResponseContainer
                agent={message.metadata.agent || 'AI Agent'}
                action={message.metadata.action || 'Automation'}
                success={message.metadata.success !== false}
                executionTime={message.metadata.executionTime || '0s'}
                metadata={message.metadata}
              >
                <Text className={cn(
                  "text-sm",
                  isDark ? "text-gray-200" : "text-gray-700"
                )}>
                  {message.content}
                </Text>
              </N8nAgentResponseContainer>
            )}
            
            {/* ✅ LEGACY: Handle immediate conversational responses */}
            {isImmediateResponse && (
              <ConversationalResponse
                message={message.content}
                reasoning={message.metadata?.reasoning}
                metadata={message.metadata}
              />
            )}
            
            {/* ✅ LEGACY: Handle data updates with compact display */}
            {isDataUpdate && message.metadata?.compactData && (
              <CompactDataSummary
                data={message.metadata.compactData}
                onExpand={handleExpandCompactData}
              />
            )}
            
            {/* ✅ IMPROVED: Regular message display for non-enhanced responses */}
            {!isImmediateResponse && !isDataUpdate && !isExecutiveResponse && !isContextDropdown && (
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
      </View>

      {/* ✅ IMPROVED: Edit button for last user message (only show for regular messages, not system) */}
      {isLastUserMessage && !isEditing && message.sender === 'user' && (
        <TouchableOpacity
          onPress={handleStartEdit}
          className="mt-2 self-end"
        >
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-400" : "text-gray-500"
          )}>
            ✏️ Edit
          </Text>
        </TouchableOpacity>
      )}

      {/* ✅ IMPROVED: Message metadata (confidence, sources) */}
      {(message.confidence || message.sources?.length) && !isUser && (
        <View className="mt-2">
          {message.confidence && (
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-500"
            )}>
              Confidence: {Math.round(message.confidence * 100)}%
            </Text>
          )}
        </View>
      )}
    </View>
  );
}