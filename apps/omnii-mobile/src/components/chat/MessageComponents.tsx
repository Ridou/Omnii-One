import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { GmailIcon, CalendarIcon, ContactsIcon, TasksIcon } from '~/icons/ChatIcons';
import { ComponentAction } from '~/types/chat';
import { cn } from '~/utils/cn';
import { useTheme } from '~/context/ThemeContext';
import { GoogleTasksView } from './GoogleTasksView';

// ✅ ZOD-INFERRED TYPES: Always use validated types from Zod schemas
import type {
  EmailData, TaskListData, TaskData,
  TaskListsData, TaskListWithTasks, CompleteTaskOverview,
  CalendarData, ContactData
} from '@omnii/validators';

// ✅ RUNTIME IMPORTS: Import type guards and enums as regular imports for runtime usage
import {
  ServiceType,
  isTaskData,
  isTaskListData,
  isTaskListsData,
  isTaskListWithTasks,
  isCompleteTaskOverview,
} from '@omnii/validators';

// Base component props (enhanced)
interface BaseComponentProps {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'loading';
  actions?: ComponentAction[];
  onAction?: (action: string, data: any) => void;
}

// Email Component - Using Native Tailwind Classes  
export const EmailComponent: React.FC<BaseComponentProps & { data: EmailData }> = ({
  id,
  timestamp,
  status,
  onAction,
  data
}) => {
  const { isDark } = useTheme();
  if (!data) return null;

  return (
    <View className={cn(
      "rounded-xl p-4 my-2 shadow-sm border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3 gap-2">
        <GmailIcon size={20} />
        <Text className={cn(
          "text-base font-semibold flex-1",
          isDark ? "text-white" : "text-gray-900"
        )}>{data.subject}</Text>
      </View>
      <View className="mb-4">
        <Text className={cn(
          "text-sm mb-1",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>From: {data.from}</Text>
        <Text className={cn(
          "text-sm mb-2",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>To: {data.to.join(', ')}</Text>
        <Text className={cn(
          "text-sm mb-2",
          isDark ? "text-white" : "text-gray-900"
        )}>{data.body}</Text>
        {data.attachments && data.attachments.length > 0 && (
          <View className="mt-2">
            {data.attachments.map((attachment, index) => (
              <TouchableOpacity
                key={index}
                className={cn(
                  "p-2 rounded-lg mb-1",
                  isDark ? "bg-slate-900" : "bg-gray-50"
                )}
                onPress={() => onAction?.('download', attachment)}
              >
                <Text className={cn(
                  "text-xs",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>
                  📎 {attachment.name} ({attachment.size} bytes)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View className="flex-row justify-end gap-2">
        <TouchableOpacity
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('reply', data)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('forward', data)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>Forward</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Calendar Component - Using Native Tailwind Classes
export const CalendarComponent: React.FC<BaseComponentProps & { data: CalendarData }> = ({
  id,
  timestamp,
  status,
  onAction,
  data
}) => {
  const { isDark } = useTheme();
  if (!data) return null;

  const startDate = new Date(data.start);
  const endDate = new Date(data.end);
  const isToday = startDate.toDateString() === new Date().toDateString();

  return (
    <View className={cn(
      "rounded-xl p-4 my-2 shadow-sm border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3 gap-2">
        <CalendarIcon size={20} color="white" />
        <Text className={cn(
          "text-base font-semibold flex-1",
          isDark ? "text-white" : "text-gray-900"
        )}>{data.title}</Text>
        {isToday && (
          <View className="bg-green-600 px-2 py-1 rounded">
            <Text className="text-xs text-white font-semibold">TODAY</Text>
          </View>
        )}
      </View>
      <View className="mb-4">
        <Text className={cn(
          "text-sm mb-1",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {startDate.toLocaleString()} - {endDate.toLocaleString()}
        </Text>
        {data.location && (
          <Text className={cn(
            "text-sm mb-1",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>📍 {data.location}</Text>
        )}
        {data.description && (
          <Text className={cn(
            "text-sm mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>{data.description}</Text>
        )}
        {data.attendees.length > 0 && (
          <View className="mt-2">
            <Text className={cn(
              "text-sm font-semibold mb-1",
              isDark ? "text-white" : "text-gray-900"
            )}>Attendees:</Text>
            {data.attendees.map((attendee, index) => (
              <Text key={index} className={cn(
                "text-sm mb-0.5",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>
                • {attendee.name || attendee.email}
              </Text>
            ))}
          </View>
        )}
        {data.meetingLink && (
          <TouchableOpacity 
            className="bg-green-600 p-2 rounded-md items-center mt-2"
            onPress={() => onAction?.('join_meeting', data)}
          >
            <Text className="text-xs text-white font-semibold">🔗 Join Meeting</Text>
          </TouchableOpacity>
        )}
      </View>
      <View className="flex-row justify-end gap-2">
        <TouchableOpacity
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('edit', data)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('share', data)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Contact Component - Using Native Tailwind Classes
export const ContactComponent: React.FC<BaseComponentProps & { data: ContactData }> = ({
  id,
  timestamp,
  status,
  onAction,
  data
}) => {
  const { isDark } = useTheme();
  if (!data) return null;

  return (
    <View className={cn(
      "rounded-xl p-4 my-2 shadow-sm border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3 gap-2">
        <ContactsIcon size={20} />
        <Text className={cn(
          "text-base font-semibold flex-1",
          isDark ? "text-white" : "text-gray-900"
        )}>{data.name}</Text>
      </View>
      <View className="mb-4">
        {data.title && (
          <Text className={cn(
            "text-sm mb-1",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>{data.title}</Text>
        )}
        {data.company && (
          <Text className={cn(
            "text-sm mb-2",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>{data.company}</Text>
        )}
        {data.emails.map((emailObj, index) => (
          <Text key={index} className={cn(
            "text-sm mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>
            ✉️ {emailObj.address}
          </Text>
        ))}
        {data.phones.map((phoneObj, index) => (
          <Text key={index} className={cn(
            "text-sm mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>
            📞 {phoneObj.number}
          </Text>
        ))}
      </View>
      <View className="flex-row justify-end gap-2">
        <TouchableOpacity
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('edit', data)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('message', data)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ✅ Google Services Connection Prompt Component
const GoogleServicesConnectionPrompt: React.FC<{
  onAction?: (action: string, data: any) => void;
}> = ({ onAction }) => {
  const { isDark } = useTheme();
  
  const handleConnectGoogle = () => {
    // Navigate to Profile > Connect tab
    onAction?.('navigate_to_profile_connect', { tab: 'connect' });
  };

  return (
    <View className="items-center py-4">
      <View className={cn(
        "rounded-xl p-4 border-2 border-dashed max-w-xs w-full",
        isDark ? "bg-slate-800/50 border-slate-600" : "bg-blue-50/50 border-blue-200"
      )}>
        {/* Header with icon */}
        <View className="flex-row items-center mb-3">
          <View className={cn(
            "w-10 h-10 rounded-lg items-center justify-center mr-3",
            isDark ? "bg-blue-900/30" : "bg-blue-100"
          )}>
            <Text className="text-xl">🔗</Text>
          </View>
          <View className="flex-1">
            <Text className={cn(
              "text-base font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>Connect Google</Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-blue-400" : "text-blue-600"
            )}>For tasks, calendar, contacts & email</Text>
          </View>
        </View>

        {/* Simple description */}
        <Text className={cn(
          "text-sm mb-4 text-center",
          isDark ? "text-slate-300" : "text-gray-700"
        )}>
          Connect your Google account to access tasks, calendar, contacts, and email.
        </Text>

        {/* Connect button */}
        <TouchableOpacity
          className="bg-blue-600 px-4 py-3 rounded-lg flex-row items-center justify-center"
          onPress={handleConnectGoogle}
        >
          <Text className="text-white text-sm font-semibold mr-2">Connect</Text>
          <Text className="text-white text-sm">→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};



// ✅ PHASE 2: Task-Specific Component Factory with Type Detection
export const createTaskComponent = (taskData: any, props: any) => {
  console.log('[TaskComponentFactory] Detecting task data type:', typeof taskData, taskData);
  console.log('[TaskComponentFactory] Data keys:', Object.keys(taskData || {}));
  
  // ✅ FIRST: Check if Google services are connected
  // This handles the case where Composio doesn't have access tokens
  if (taskData && typeof taskData === 'object') {
    // Check for specific auth failure indicators in the data
    const hasAuthFailure = (
      // Explicit sync failure
      (taskData.syncSuccess === false) ||
      // Has partial failures with auth-related errors
      (taskData.partialFailures && taskData.partialFailures.length > 0 && 
       taskData.partialFailures.some((failure: any) => {
         const errorMsg = failure.error?.toLowerCase() || '';
         return (
           errorMsg.includes('access') || 
           errorMsg.includes('token') || 
           errorMsg.includes('auth') ||
           errorMsg.includes('credential') ||
           errorMsg.includes('permission') ||
           errorMsg.includes('401') ||
           errorMsg.includes('403') ||
           errorMsg.includes('unauthorized') ||
           errorMsg.includes('invalid_grant') ||
           errorMsg.includes('scope')
         );
       })) ||
      // Task lists exist but all failed to fetch with auth errors  
      (taskData.taskLists && Array.isArray(taskData.taskLists) && 
       taskData.taskLists.length > 0 && 
       taskData.taskLists.every((list: any) => {
         return !list.fetchSuccess && list.fetchError && (
           list.fetchError.toLowerCase().includes('auth') ||
           list.fetchError.toLowerCase().includes('token') ||
           list.fetchError.toLowerCase().includes('access') ||
           list.fetchError.toLowerCase().includes('permission')
         );
       })) ||
      // Empty response with no data (likely auth issue)
      (taskData.totalLists === 0 && taskData.totalTasks === 0 && 
       (!taskData.taskLists || taskData.taskLists.length === 0))
    );
    
    if (hasAuthFailure) {
      console.warn('[TaskComponentFactory] Google services authentication issue detected:', {
        syncSuccess: taskData.syncSuccess,
        partialFailuresCount: taskData.partialFailures?.length || 0,
        totalLists: taskData.totalLists,
        totalTasks: taskData.totalTasks,
        hasTaskLists: !!taskData.taskLists,
        taskListsLength: taskData.taskLists?.length || 0,
        // TEMP DEBUG: Log complete structure to understand the exact problem
        fullTaskData: JSON.stringify(taskData, null, 2)
      });
      return <GoogleServicesConnectionPrompt onAction={props.onAction} />;
    }
  }
  
  // If no taskData at all, assume connection issue
  if (!taskData) {
    console.warn('[TaskComponentFactory] No task data provided, showing Google connection prompt');
    return <GoogleServicesConnectionPrompt onAction={props.onAction} />;
  }
  
  console.log('[TaskComponentFactory] Has taskLists?', 'taskLists' in (taskData || {}));
  console.log('[TaskComponentFactory] taskLists is array?', Array.isArray(taskData?.taskLists));
  console.log('[TaskComponentFactory] Has totalTasks?', 'totalTasks' in (taskData || {}));
  console.log('[TaskComponentFactory] totalTasks type:', typeof taskData?.totalTasks);
  
  // Use type guards to determine component type
  const isCompleteOverview = isCompleteTaskOverview(taskData);
  console.log('[TaskComponentFactory] isCompleteTaskOverview result:', isCompleteOverview);
  
  if (isCompleteOverview) {
    console.log('[TaskComponentFactory] Rendering CompleteTaskOverviewComponent');
    return <CompleteTaskOverviewComponent overview={taskData} onAction={props.onAction} />;
  }
  
  if (isTaskListsData(taskData)) {
    console.log('[TaskComponentFactory] Rendering TaskListsComponent');
    return <TaskListsComponent taskListsData={taskData} onAction={props.onAction} />;
  }
  
  if (isTaskListData(taskData)) {
    console.log('[TaskComponentFactory] Rendering TaskListDataComponent');
    return <TaskListDataComponent taskListData={taskData} onAction={props.onAction} />;
  }
  
  if (isTaskListWithTasks(taskData)) {
    console.log('[TaskComponentFactory] Rendering individual TaskListWithTasks as CompleteTaskOverview');
    // Convert single TaskListWithTasks to CompleteTaskOverview format
    const overviewData: CompleteTaskOverview = {
      taskLists: [taskData],
      totalLists: 1,
      totalTasks: taskData.taskCount,
      totalCompleted: taskData.completedCount,
      totalPending: taskData.pendingCount,
      totalOverdue: taskData.overdueCount,
      lastSyncTime: taskData.lastFetched,
      syncSuccess: taskData.fetchSuccess,
      partialFailures: taskData.fetchSuccess ? undefined : [{
        listId: taskData.id,
        listTitle: taskData.title,
        error: taskData.fetchError || 'Unknown error'
      }]
    };
    return <CompleteTaskOverviewComponent overview={overviewData} onAction={props.onAction} />;
  }
  
  if (isTaskData(taskData)) {
    console.log('[TaskComponentFactory] Rendering individual task data');
    return (
      <View className="flex-1 ">
        <Text className="text-sm">Individual Task</Text>
        <Text className="text-sm">{JSON.stringify(taskData, null, 2)}</Text>
      </View>
    );
  }
  
  // Fallback: show Google connection prompt for unknown data types
  console.warn('[TaskComponentFactory] Unknown task data type, rendering Google connection prompt');
  return <GoogleServicesConnectionPrompt onAction={props.onAction} />;
};

// ✅ PHASE 3: Enhanced Component Factory with ServiceType enum and task detection
export const createMessageComponent = (type: string, props: any) => {
  console.log('[MessageComponentFactory] Creating component for type:', type, 'with data:', props.data);
  
  switch (type) {
    case ServiceType.EMAIL:
    case 'email':
      return <EmailComponent {...props} />;
      
    case ServiceType.CALENDAR:
    case 'calendar':
      return <CalendarComponent {...props} />;
      
    case ServiceType.CONTACT:
    case 'contact':
      return <ContactComponent {...props} />;
      
    case ServiceType.TASK:
    case 'task':
      // Use task-specific factory for intelligent component selection
      return createTaskComponent(props.data, props);
      
    case 'completeTaskOverview':
      // Legacy support - redirect to task factory
      return createTaskComponent(props.data, props);
      
    case ServiceType.GENERAL:
    case 'general':
    default:
      console.warn(`[MessageComponentFactory] Unknown component type: ${type}`);
      return null;
  }
};



// ✅ EmailListComponent - Using Native Tailwind Classes
export const EmailListComponent: React.FC<{
  emails: EmailData[];
  totalCount: number;
  unreadCount: number;
  hasMore?: boolean;
  onAction?: (action: string, data: any) => void;
}> = ({ emails, totalCount, unreadCount, hasMore, onAction }) => {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const displayEmails = expanded ? emails : emails.slice(0, 3);

  return (
    <View className={cn(
      "rounded-xl p-3 my-2 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      {/* Summary header */}
      <View className="flex-row items-center mb-2 gap-2">
        <GmailIcon size={20} />
        <Text className={cn(
          "text-sm font-semibold",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {totalCount} email{totalCount !== 1 ? 's' : ''}{unreadCount > 0 && ` (${unreadCount} unread)`}
        </Text>
      </View>

      {/* Email preview cards */}
      {displayEmails.map((email, index) => (
        <View key={email.id || index} className={cn(
          "p-3 rounded-lg mb-2 border",
          !email.isRead && "border-l-4 border-l-blue-500",
          isDark ? "bg-slate-900 border-slate-600" : "bg-gray-50 border-gray-200"
        )}>
          <View className="flex-row justify-between items-center mb-1">
            <Text className={cn(
              "text-xs font-semibold flex-1",
              isDark ? "text-white" : "text-gray-900"
            )} numberOfLines={1}>
              {email.from}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>{email.date}</Text>
          </View>
          <Text className={cn(
            "text-sm font-semibold mb-1",
            isDark ? "text-white" : "text-gray-900"
          )} numberOfLines={1}>
            {email.subject}
          </Text>
          <Text className={cn(
            "text-xs leading-4",
            isDark ? "text-slate-400" : "text-gray-600"
          )} numberOfLines={2}>
            {email.body}
          </Text>
        </View>
      ))}

      {/* Expand/collapse toggle */}
      {emails.length > 3 && (
        <TouchableOpacity 
          className={cn(
            "p-2 rounded-md items-center mb-2",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => setExpanded(!expanded)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-blue-400" : "text-blue-600"
          )}>
            {expanded ? 'Show Less' : `Show ${emails.length - 3} More`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View className="flex-row justify-between gap-2">
        <TouchableOpacity 
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('reply_first', emails[0])}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>Reply to First</Text>
        </TouchableOpacity>
        
        {hasMore && (
          <TouchableOpacity 
            className={cn(
              "px-3 py-1.5 rounded-md",
              isDark ? "bg-slate-900" : "bg-gray-50"
            )}
            onPress={() => onAction?.('load_more', null)}
          >
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ✅ ContactListComponent - Using Native Tailwind Classes
export const ContactListComponent: React.FC<{
  contacts: ContactData[];
  totalCount: number;
  hasMore?: boolean;
  nextPageToken?: string;
  onAction?: (action: string, data: any) => void;
}> = ({ contacts, totalCount, hasMore, nextPageToken, onAction }) => {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const displayContacts = expanded ? contacts : contacts.slice(0, 5);

  return (
    <View className={cn(
      "rounded-xl p-3 my-2 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      {/* Summary header */}
      <View className="flex-row items-center mb-2 gap-2">
        <ContactsIcon size={20} />
        <Text className={cn(
          "text-sm font-semibold",
          isDark ? "text-white" : "text-gray-900"
        )}>
          📱 {totalCount} contact{totalCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Contact preview cards */}
      {displayContacts.map((contact, index) => (
        <ContactCard 
          key={contact.contactId || index}
          contact={contact}
          onAction={onAction}
        />
      ))}

      {/* Expand/collapse toggle */}
      {contacts.length > 5 && (
        <TouchableOpacity 
          className={cn(
            "p-2 rounded-md items-center mb-2",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => setExpanded(!expanded)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-blue-400" : "text-blue-600"
          )}>
            {expanded ? 'Show Less' : `Show ${contacts.length - 5} More`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View className="flex-row justify-between gap-2 mt-2">
        <TouchableOpacity 
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('search_contacts', null)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>🔍 Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('create_contact', null)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>➕ Create</Text>
        </TouchableOpacity>

        {hasMore && (
          <TouchableOpacity 
            className={cn(
              "px-3 py-1.5 rounded-md",
              isDark ? "bg-slate-900" : "bg-gray-50"
            )}
            onPress={() => onAction?.('load_more', { nextPageToken })}
          >
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ✅ Individual Contact Card Component - Using Native Tailwind Classes
const ContactCard: React.FC<{
  contact: ContactData;
  onAction?: (action: string, data: any) => void;
}> = ({ contact, onAction }) => {
  const { isDark } = useTheme();
  
  return (
    <TouchableOpacity 
      className={cn(
        "p-3 rounded-lg mb-2 border",
        isDark ? "bg-slate-900 border-slate-600" : "bg-gray-50 border-gray-200"
      )}
      onPress={() => onAction?.('view_contact', contact)}
    >
      <View className="mb-2">
        <View className="flex-1">
          <Text className={cn(
            "text-base font-semibold mb-0.5",
            isDark ? "text-white" : "text-gray-900"
          )} numberOfLines={1}>
            👤 {contact.name}
          </Text>
          {contact.title && contact.company && (
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )} numberOfLines={1}>
              {contact.title} at {contact.company}
            </Text>
          )}
          {contact.title && !contact.company && (
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )} numberOfLines={1}>
              {contact.title}
            </Text>
          )}
          {!contact.title && contact.company && (
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )} numberOfLines={1}>
              {contact.company}
            </Text>
          )}
        </View>
      </View>

      {/* Contact details */}
      <View className="mb-2 gap-1">
        {/* Emails */}
        {contact.emails.length > 0 && (
          <View className="flex-row items-center gap-2">
            <Text className="text-sm w-5">✉️</Text>
            <Text className={cn(
              "text-sm flex-1",
              isDark ? "text-white" : "text-gray-900"
            )} numberOfLines={1}>
              {contact.emails.map(email => email.address).join(', ')}
            </Text>
          </View>
        )}

        {/* Phones */}
        {contact.phones.length > 0 && (
          <View className="flex-row items-center gap-2">
            <Text className="text-sm w-5">📞</Text>
            <Text className={cn(
              "text-sm flex-1",
              isDark ? "text-white" : "text-gray-900"
            )} numberOfLines={1}>
              {contact.phones.map(phone => phone.number).join(', ')}
            </Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View className="flex-row justify-end gap-2 pt-2 border-t border-slate-600">
        {contact.emails.length > 0 && (
          <TouchableOpacity 
            className="w-9 h-9 rounded-full bg-indigo-600 items-center justify-center"
            onPress={() => onAction?.('email_contact', contact)}
          >
            <Text className="text-base">✉️</Text>
          </TouchableOpacity>
        )}
        
        {contact.phones.length > 0 && (
          <TouchableOpacity 
            className="w-9 h-9 rounded-full bg-indigo-600 items-center justify-center"
            onPress={() => onAction?.('call_contact', contact)}
          >
            <Text className="text-base">📞</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          className="w-9 h-9 rounded-full bg-indigo-600 items-center justify-center"
          onPress={() => onAction?.('edit_contact', contact)}
        >
          <Text className="text-base">✏️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ✅ CalendarListComponent - Using Native Tailwind Classes
export const CalendarListComponent: React.FC<{
  events: CalendarData[];
  totalCount: number;
  hasMore?: boolean;
  timeRange?: { start: string; end: string };
  onAction?: (action: string, data: any) => void;
}> = ({ events, totalCount, hasMore, timeRange, onAction }) => {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const displayEvents = expanded ? events : events.slice(0, 4);

  return (
    <View className={cn(
      "rounded-xl p-3 my-2 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      {/* Summary header */}
      <View className="flex-row items-center mb-2 gap-2">
        <CalendarIcon size={20} color="white" />
        <View>
          <Text className={cn(
            "text-sm font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            📅 {totalCount} event{totalCount !== 1 ? 's' : ''}
          </Text>
          {timeRange && (
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {new Date(timeRange.start).toLocaleDateString()} - {new Date(timeRange.end).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      {/* Event preview cards */}
      {displayEvents.map((event, index) => (
        <CalendarEventCard 
          key={event.eventId || index}
          event={event}
          onAction={onAction}
        />
      ))}

      {/* Expand/collapse toggle */}
      {events.length > 4 && (
        <TouchableOpacity 
          className={cn(
            "p-2 rounded-md items-center mb-2",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => setExpanded(!expanded)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-blue-400" : "text-blue-600"
          )}>
            {expanded ? 'Show Less' : `Show ${events.length - 4} More Events`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View className="flex-row justify-between gap-2 mt-2">
        <TouchableOpacity 
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('create_event', null)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>➕ Create Event</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('view_calendar', null)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>🗓️ Open Calendar</Text>
        </TouchableOpacity>

        {hasMore && (
          <TouchableOpacity 
            className={cn(
              "px-3 py-1.5 rounded-md",
              isDark ? "bg-slate-900" : "bg-gray-50"
            )}
            onPress={() => onAction?.('load_more_events', null)}
          >
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ✅ Individual Calendar Event Card Component
const CalendarEventCard: React.FC<{
  event: CalendarData;
  onAction?: (action: string, data: any) => void;
}> = ({ event, onAction }) => {
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const isToday = startDate.toDateString() === new Date().toDateString();
  const isPast = startDate < new Date();
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateRange = () => {
    if (startDate.toDateString() === endDate.toDateString()) {
      return `${startDate.toLocaleDateString()} • ${formatTime(startDate)} - ${formatTime(endDate)}`;
    } else {
      return `${startDate.toLocaleDateString()} ${formatTime(startDate)} - ${endDate.toLocaleDateString()} ${formatTime(endDate)}`;
    }
  };

  const { isDark } = useTheme();
  
  return (
    <TouchableOpacity 
      className={cn(
        "p-3 rounded-lg mb-2 border",
        isToday && "border-l-4 border-l-green-500",
        isPast && "opacity-60",
        isDark ? "bg-slate-900 border-slate-600" : "bg-gray-50 border-gray-200"
      )}
      onPress={() => onAction?.('view_event', event)}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-2">
          <Text className={cn(
            "text-sm font-semibold mb-1",
            isPast && "opacity-70",
            isDark ? "text-white" : "text-gray-900"
          )} numberOfLines={2}>
            📅 {event.title}
          </Text>
          <Text className={cn(
            "text-xs",
            isToday && "text-green-600 font-semibold",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            {formatDateRange()}
          </Text>
        </View>
        
        {isToday && (
          <View className="bg-green-600 px-2 py-1 rounded">
            <Text className="text-xs text-white font-semibold">TODAY</Text>
          </View>
        )}
      </View>

      {/* Event details */}
      <View className="gap-1">
        {event.location && (
          <View className="flex-row items-center">
            <Text className="text-sm w-5">📍</Text>
            <Text className={cn(
              "text-sm flex-1",
              isDark ? "text-slate-400" : "text-gray-600"
            )} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}

        {event.attendees.length > 0 && (
          <View className="flex-row items-center">
            <Text className="text-sm w-5">👥</Text>
            <Text className={cn(
              "text-sm flex-1",
              isDark ? "text-slate-400" : "text-gray-600"
            )} numberOfLines={1}>
              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {event.meetingLink && (
          <View className="flex-row items-center">
            <Text className="text-sm w-5">🔗</Text>
            <Text className={cn(
              "text-sm flex-1",
              isDark ? "text-slate-400" : "text-gray-600"
            )} numberOfLines={1}>
              Video meeting available
            </Text>
          </View>
        )}

        {event.description && (
          <View className="flex-row items-center">
            <Text className="text-sm w-5">📝</Text>
            <Text className={cn(
              "text-sm flex-1",
              isDark ? "text-slate-400" : "text-gray-600"
            )} numberOfLines={2}>
              {event.description}
            </Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View className="flex-row justify-end gap-2 pt-2 mt-2 border-t border-slate-600">
        <TouchableOpacity 
          className="w-8 h-8 rounded-full bg-indigo-600 items-center justify-center"
          onPress={() => onAction?.('edit_event', event)}
        >
          <Text className="text-sm">✏️</Text>
        </TouchableOpacity>
        
        {event.meetingLink && (
          <TouchableOpacity 
            className="w-8 h-8 rounded-full bg-indigo-600 items-center justify-center"
            onPress={() => onAction?.('join_meeting', event)}
          >
            <Text className="text-sm">🔗</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          className="w-8 h-8 rounded-full bg-indigo-600 items-center justify-center"
          onPress={() => onAction?.('share_event', event)}
        >
          <Text className="text-sm">📤</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ✅ NEW: Calendar Component Factory - Routes calendar data to appropriate component
export const createCalendarComponent = (calendarData: any, props: any) => {
  console.log('[CalendarComponentFactory] Creating calendar component with data:', calendarData);
  
  // Handle null/undefined data
  if (!calendarData) {
    console.warn('[CalendarComponentFactory] No calendar data provided');
    return null;
  }

  // Check if it's a calendar list response (multiple events)
  if (calendarData.events && Array.isArray(calendarData.events)) {
    console.log('[CalendarComponentFactory] Detected calendar list with', calendarData.events.length, 'events');
    return (
      <CalendarListComponent
        events={calendarData.events}
        totalCount={calendarData.totalCount || calendarData.events.length}
        hasMore={calendarData.hasMore}
        timeRange={calendarData.timeRange}
        onAction={props.onAction}
      />
    );
  }

  // Check if it's a single calendar event
  if (calendarData.eventId || calendarData.start || calendarData.title) {
    console.log('[CalendarComponentFactory] Detected single calendar event:', calendarData.title);
    return (
      <CalendarComponent
        id={calendarData.eventId || 'calendar-event'}
        timestamp={calendarData.start || new Date().toISOString()}
        status="success"
        data={calendarData}
        onAction={props.onAction}
      />
    );
  }

  // If we can't determine the structure, show debug info
  console.warn('[CalendarComponentFactory] Unknown calendar data structure:', Object.keys(calendarData));
  return (
    <View className="rounded-xl p-4 my-2 border border-orange-500 bg-orange-50">
      <Text className="text-sm font-semibold text-orange-800 mb-2">
        📅 Calendar Data (Unknown Format)
      </Text>
      <Text className="text-xs text-orange-600">
        Keys: {Object.keys(calendarData).join(', ')}
      </Text>
      <Text className="text-xs text-orange-600 mt-1">
        Type: {Array.isArray(calendarData) ? 'Array' : typeof calendarData}
      </Text>
    </View>
  );
};

// ============================================================================
// GOOGLE TASKS-STYLE MODAL COMPONENT
// ============================================================================

interface TasksModalProps {
  visible: boolean;
  onClose: () => void;
  overview: CompleteTaskOverview;
  onAction?: (action: string, data: any) => void;
}

export const TasksModal: React.FC<TasksModalProps> = ({ 
  visible, 
  onClose, 
  overview, 
  onAction 
}) => {
  const { isDark } = useTheme();
  const [selectedListId, setSelectedListId] = useState<string>(overview.taskLists[0]?.id || '');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  const selectedList = overview.taskLists.find(list => list.id === selectedListId);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    await onAction?.('create_task_in_list', {
      listId: selectedListId,
      title: newTaskTitle.trim(),
      notes: newTaskNotes.trim()
    });
    
    setNewTaskTitle('');
    setNewTaskNotes('');
    setShowAddTask(false);
  };

  const handleEditTask = (task: TaskData) => {
    Alert.prompt(
      'Edit Task',
      'Enter new title:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: (title) => {
            if (title?.trim()) {
              onAction?.('edit_task', {
                task,
                listId: selectedListId,
                newTitle: title.trim()
              });
            }
          }
        }
      ],
      'plain-text',
      task.title
    );
  };

  const handleDeleteTask = (task: TaskData) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onAction?.('delete_task', { task, listId: selectedListId })
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className={cn(
        "flex-1",
        isDark ? "bg-slate-900" : "bg-white"
      )}>
        {/* Header - Fixed */}
        <View className={cn(
          "flex-row items-center justify-between px-4 py-3 border-b",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          <Text className={cn(
            "text-xl font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            My Tasks
          </Text>
          <TouchableOpacity 
            onPress={onClose}
            className="p-2"
          >
            <Text className={cn(
              "text-lg",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Task List Selector */}
        {overview.taskLists.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className={cn(
              "px-4 py-2 border-b",
              isDark ? "border-slate-700" : "border-gray-200"
            )}
          >
            {overview.taskLists.map((list) => (
              <TouchableOpacity
                key={list.id}
                onPress={() => setSelectedListId(list.id)}
                className={cn(
                  "px-4 py-2 rounded-full mr-3 border",
                  selectedListId === list.id
                    ? "bg-blue-600 border-blue-600"
                    : isDark 
                      ? "bg-slate-800 border-slate-600" 
                      : "bg-gray-100 border-gray-300"
                )}
              >
                <Text className={cn(
                  "text-sm font-medium",
                  selectedListId === list.id
                    ? "text-white"
                    : isDark ? "text-white" : "text-gray-900"
                )}>
                  {list.title} ({list.taskCount})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Add Task Button - Google Tasks Style */}
        <TouchableOpacity 
          onPress={() => setShowAddTask(true)}
          className={cn(
            "flex-row items-center px-4 py-4 border-b",
            isDark ? "border-slate-700" : "border-gray-200"
          )}
        >
          <View className="w-6 h-6 rounded-full border-2 border-blue-500 items-center justify-center mr-4">
            <Text className="text-blue-500 text-lg font-light">+</Text>
          </View>
          <Text className={cn(
            "text-base text-blue-500"
          )}>
            Add a task
          </Text>
        </TouchableOpacity>

        {/* Add Task Form */}
        {showAddTask && (
          <View className={cn(
            "px-4 py-3 border-b",
            isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-gray-50"
          )}>
            <TextInput
              placeholder="Task title"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              className={cn(
                "text-base p-3 rounded-lg border mb-2",
                isDark 
                  ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              )}
              autoFocus
            />
            <TextInput
              placeholder="Add details (optional)"
              value={newTaskNotes}
              onChangeText={setNewTaskNotes}
              multiline
              numberOfLines={2}
              className={cn(
                "text-sm p-3 rounded-lg border mb-3",
                isDark 
                  ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              )}
            />
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity 
                onPress={() => {
                  setShowAddTask(false);
                  setNewTaskTitle('');
                  setNewTaskNotes('');
                }}
                className="px-4 py-2"
              >
                <Text className={cn(
                  "text-base",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleAddTask}
                className={cn(
                  "px-6 py-2 rounded-lg",
                  newTaskTitle.trim() 
                    ? "bg-blue-600" 
                    : isDark ? "bg-slate-700" : "bg-gray-300"
                )}
                disabled={!newTaskTitle.trim()}
              >
                <Text className={cn(
                  "text-base font-medium",
                  newTaskTitle.trim() ? "text-white" : isDark ? "text-slate-500" : "text-gray-500"
                )}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tasks List - Google Tasks Style */}
        <ScrollView className="flex-1 px-4">
          {selectedList?.tasks.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Text className={cn(
                "text-base text-center",
                isDark ? "text-slate-400" : "text-gray-500"
              )}>
                No tasks yet.{'\n'}Add one above to get started.
              </Text>
            </View>
          ) : (
            selectedList?.tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => onAction?.(
                  task.status === 'completed' ? 'mark_incomplete' : 'mark_complete',
                  { task, listId: selectedListId }
                )}
                onEdit={() => handleEditTask(task)}
                onDelete={() => handleDeleteTask(task)}
              />
            ))
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View className={cn(
          "flex-row justify-around py-3 border-t",
          isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-gray-50"
        )}>
          <TouchableOpacity 
            onPress={() => onAction?.('refresh_overview', null)}
            className="items-center py-2 px-4"
          >
            <Text className="text-2xl mb-1">🔄</Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              Alert.prompt(
                'New Task List',
                'Enter list name:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Create', 
                    onPress: (title) => {
                      if (title?.trim()) {
                        onAction?.('create_task_list', { title: title.trim() });
                      }
                    }
                  }
                ]
              );
            }}
            className="items-center py-2 px-4"
          >
            <Text className="text-2xl mb-1">📋</Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>New List</Text>
          </TouchableOpacity>

          {overview.totalCompleted > 0 && (
            <TouchableOpacity 
              onPress={() => onAction?.('clear_completed', null)}
              className="items-center py-2 px-4"
            >
              <Text className="text-2xl mb-1">🗑️</Text>
              <Text className={cn(
                "text-xs",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Clear Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// INDIVIDUAL TASK ITEM - GOOGLE TASKS STYLE
// ============================================================================

interface TaskItemProps {
  task: TaskData;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onEdit, onDelete }) => {
  const { isDark } = useTheme();
  const [showActions, setShowActions] = useState(false);
  
  const isCompleted = task.status === 'completed';
  const isOverdue = task.due && new Date(task.due) < new Date() && !isCompleted;

  return (
    <View className={cn(
      "py-4 border-b",
      isDark ? "border-slate-700" : "border-gray-100"
    )}>
      <View className="flex-row items-start">
        {/* Completion Circle */}
        <TouchableOpacity 
          onPress={onToggle}
          className="mr-4 mt-1"
        >
          <View className={cn(
            "w-6 h-6 rounded-full border-2 items-center justify-center",
            isCompleted 
              ? "bg-blue-600 border-blue-600" 
              : isDark 
                ? "border-slate-400" 
                : "border-gray-400"
          )}>
            {isCompleted && (
              <Text className="text-white text-sm">✓</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Task Content */}
        <View className="flex-1 mr-2">
          <Text className={cn(
            "text-base leading-6",
            isCompleted 
              ? isDark ? "text-slate-500 line-through" : "text-gray-500 line-through"
              : isDark ? "text-white" : "text-gray-900"
          )}>
            {task.title}
          </Text>
          
          {task.notes && (
            <Text className={cn(
              "text-sm mt-1 leading-5",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {task.notes}
            </Text>
          )}

          {/* Task Metadata */}
          <View className="flex-row items-center mt-2">
            {task.due && (
              <View className={cn(
                "px-2 py-1 rounded mr-2",
                isOverdue 
                  ? "bg-red-100" 
                  : isDark ? "bg-slate-800" : "bg-gray-100"
              )}>
                <Text className={cn(
                  "text-xs",
                  isOverdue 
                    ? "text-red-600" 
                    : isDark ? "text-slate-400" : "text-gray-600"
                )}>
                  {isOverdue ? 'Overdue' : new Date(task.due).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            {task.updated && (
              <Text className={cn(
                "text-xs",
                isDark ? "text-slate-500" : "text-gray-500"
              )}>
                {Math.ceil((Date.now() - new Date(task.updated).getTime()) / (1000 * 60 * 60 * 24))} days ago
              </Text>
            )}
          </View>
        </View>

        {/* Actions Menu */}
        <TouchableOpacity 
          onPress={() => setShowActions(!showActions)}
          className="p-2"
        >
          <Text className={cn(
            "text-lg",
            isDark ? "text-slate-400" : "text-gray-400"
          )}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      {showActions && (
        <View className={cn(
          "mt-3 p-3 rounded-lg",
          isDark ? "bg-slate-800" : "bg-gray-50"
        )}>
          <View className="flex-row justify-around">
            <TouchableOpacity 
              onPress={() => {
                onEdit();
                setShowActions(false);
              }}
              className="items-center py-2 px-4"
            >
              <Text className="text-xl mb-1">✏️</Text>
              <Text className={cn(
                "text-xs",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => {
                onDelete();
                setShowActions(false);
              }}
              className="items-center py-2 px-4"
            >
              <Text className="text-xl mb-1">🗑️</Text>
              <Text className={cn(
                "text-xs",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setShowActions(false)}
              className="items-center py-2 px-4"
            >
              <Text className="text-xl mb-1">✕</Text>
              <Text className={cn(
                "text-xs",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// ENHANCED COMPLETE TASK OVERVIEW COMPONENT WITH MODAL
// ============================================================================

export const CompleteTaskOverviewComponent: React.FC<{
  overview: CompleteTaskOverview;
  onAction?: (action: string, data: any) => void;
}> = ({ overview, onAction }) => {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(true); // Show expanded by default

  const hasOverdueTasks = overview.totalOverdue > 0;
  const hasFailures = overview.partialFailures && overview.partialFailures.length > 0;

  // If expanded, show the Google Tasks view
  if (expanded) {
    return (
      <View className="my-2">
        <GoogleTasksView 
          overview={overview} 
          onAction={onAction}
        />
        <TouchableOpacity
          onPress={() => setExpanded(false)}
          className={cn(
            "mx-4 mt-2 px-4 py-2 rounded-lg items-center",
            isDark ? "bg-slate-700" : "bg-gray-200"
          )}
        >
          <Text className={cn(
            "text-sm font-medium",
            isDark ? "text-white" : "text-gray-700"
          )}>Collapse View</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Compact preview card
  return (
    <TouchableOpacity 
      onPress={() => setExpanded(true)}
      className={cn(
        "w-full rounded-lg p-4 my-2 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <TasksIcon size={24} />
          <Text className={cn(
            "text-lg font-semibold ml-2",
            isDark ? "text-white" : "text-gray-900"
          )}>
            My Tasks
          </Text>
        </View>
        {hasOverdueTasks && (
          <View className="bg-red-100 px-2 py-1 rounded">
            <Text className="text-red-600 text-xs font-semibold">
              {overview.totalOverdue} overdue
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className={cn(
          "text-base",
          isDark ? "text-slate-300" : "text-gray-700"
        )}>
          {overview.totalTasks} tasks across {overview.totalLists} lists
        </Text>
        <Text className={cn(
          "text-sm",
          isDark ? "text-slate-400" : "text-gray-500"
        )}>
          Tap to expand →
        </Text>
      </View>

      {/* Progress Bar */}
      {overview.totalTasks > 0 && (
        <View className={cn(
          "h-2 rounded-full mb-2",
          isDark ? "bg-slate-700" : "bg-gray-200"
        )}>
          <View 
            className="h-full bg-green-500 rounded-full"
            style={{ 
              width: `${(overview.totalCompleted / overview.totalTasks) * 100}%` 
            }}
          />
        </View>
      )}

      {/* Status Line */}
      <Text className={cn(
        "text-sm text-center",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>
        {overview.totalCompleted} completed • {overview.totalPending} pending
        {hasOverdueTasks && ` • ${overview.totalOverdue} overdue`}
      </Text>
    </TouchableOpacity>
  );
};

// ✅ TaskListsComponent - Using Native Tailwind Classes
export const TaskListsComponent: React.FC<{
  taskListsData: TaskListsData;
  onAction?: (action: string, data: any) => void;
}> = ({ taskListsData, onAction }) => {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const displayLists = expanded ? taskListsData.taskLists : taskListsData.taskLists.slice(0, 3);

  return (
    <View className={cn(
      "rounded-xl p-3 my-2 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      {/* Summary header */}
      <View className="flex-row items-center mb-2 gap-2">
        <TasksIcon size={20} />
        <Text className={cn(
          "text-sm font-semibold",
          isDark ? "text-white" : "text-gray-900"
        )}>
          📋 {taskListsData.totalCount} task list{taskListsData.totalCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Task Lists */}
      {displayLists.map((taskList) => (
        <TouchableOpacity 
          key={taskList.id}
          className={cn(
            "p-3 rounded-lg mb-2 border",
            isDark ? "bg-slate-900 border-slate-600" : "bg-gray-50 border-gray-200"
          )}
          onPress={() => onAction?.('view_task_list', taskList)}
        >
          <View className="flex-row justify-between items-center mb-1">
            <Text className={cn(
              "text-sm font-semibold flex-1",
              isDark ? "text-white" : "text-gray-900"
            )} numberOfLines={1}>
              📝 {taskList.title}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {new Date(taskList.updated).toLocaleDateString()}
            </Text>
          </View>
          <View>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>ID: {taskList.id}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Expand/collapse toggle */}
      {taskListsData.taskLists.length > 3 && (
        <TouchableOpacity 
          className={cn(
            "p-2 rounded-md items-center mb-2",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => setExpanded(!expanded)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-blue-400" : "text-blue-600"
          )}>
            {expanded ? 'Show Less' : `Show ${taskListsData.taskLists.length - 3} More Lists`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View className="flex-row justify-between gap-2 mt-2">
        <TouchableOpacity 
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('create_task_list', null)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>➕ Create List</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('refresh_task_lists', null)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>🔄 Refresh</Text>
        </TouchableOpacity>

        {taskListsData.hasMore && (
          <TouchableOpacity 
            className={cn(
              "px-3 py-1.5 rounded-md",
              isDark ? "bg-slate-900" : "bg-gray-50"
            )}
            onPress={() => onAction?.('load_more_lists', null)}
          >
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ✅ TaskListDataComponent - Using Native Tailwind Classes
export const TaskListDataComponent: React.FC<{
  taskListData: TaskListData;
  onAction?: (action: string, data: any) => void;
}> = ({ taskListData, onAction }) => {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const displayTasks = expanded ? taskListData.tasks : taskListData.tasks.slice(0, 5);

  return (
    <View className={cn(
      "rounded-xl p-3 my-2 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      {/* Summary header */}
      <View className="flex-row items-center mb-2 gap-2">
        <TasksIcon size={20} />
        <View>
          <Text className={cn(
            "text-sm font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            📋 {taskListData.listTitle || 'Task List'}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className={cn(
              "text-sm",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {taskListData.totalCount} task{taskListData.totalCount !== 1 ? 's' : ''}
            </Text>
            {taskListData.completedCount > 0 && (
              <Text className={cn(
                "text-sm",
                isDark ? "text-white" : "text-gray-900"
              )}>
                • {taskListData.completedCount} completed
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Individual Tasks */}
      {displayTasks.length === 0 ? (
        <View>
          <Text className={cn(
            "text-sm mb-2",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>No tasks in this list</Text>
          <TouchableOpacity 
            className="p-3 bg-indigo-600 rounded-md items-center"
            onPress={() => onAction?.('create_task_in_list', { 
              listId: taskListData.listId, 
              listTitle: taskListData.listTitle 
            })}
          >
            <Text className="text-sm text-white font-semibold">
              ➕ Add Task{taskListData.listTitle ? ` to ${taskListData.listTitle}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        displayTasks.map((task) => (
          <View key={task.id} className={cn(
            "p-3 rounded-lg mb-2 border",
            isDark ? "bg-slate-900 border-slate-600" : "bg-gray-50 border-gray-200"
          )}>
            <Text className={cn(
              "text-sm font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>{task.title}</Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Status: {task.status}</Text>
            {task.due && <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Due: {new Date(task.due).toLocaleDateString()}</Text>}
            {task.notes && <Text className={cn(
              "text-xs mt-1",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>{task.notes}</Text>}
          </View>
        ))
      )}

      {/* Expand/collapse toggle */}
      {taskListData.tasks.length > 5 && (
        <TouchableOpacity 
          className={cn(
            "p-2 rounded-md items-center mb-2",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => setExpanded(!expanded)}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-blue-400" : "text-blue-600"
          )}>
            {expanded ? 'Show Less' : `Show ${taskListData.tasks.length - 5} More Tasks`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View className="flex-row justify-between gap-2 mt-2">
        <TouchableOpacity 
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('create_task_in_list', { 
            listId: taskListData.listId, 
            listTitle: taskListData.listTitle 
          })}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>➕ Add Task</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={cn(
            "px-3 py-1.5 rounded-md",
            isDark ? "bg-slate-900" : "bg-gray-50"
          )}
          onPress={() => onAction?.('view_list_details', { 
            listId: taskListData.listId, 
            listTitle: taskListData.listTitle 
          })}
        >
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>📝 List Details</Text>
        </TouchableOpacity>

        {taskListData.hasMore && (
          <TouchableOpacity 
            className={cn(
              "px-3 py-1.5 rounded-md",
              isDark ? "bg-slate-900" : "bg-gray-50"
            )}
            onPress={() => onAction?.('load_more_tasks', { listId: taskListData.listId })}
          >
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}; 