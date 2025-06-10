import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { GmailIcon, CalendarIcon, ContactsIcon, TasksIcon } from '~/icons/ChatIcons';
import { ComponentAction } from '~/types/chat';
import { cn } from '~/utils/cn';
import { useTheme } from '~/context/ThemeContext';

// ✅ ZOD-INFERRED TYPES: Always use validated types from Zod schemas
import type {
  EmailData, TaskListData,
  TaskListsData, CompleteTaskOverview,
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


// ✅ PHASE 2: Task-Specific Component Factory with Type Detection
export const createTaskComponent = (taskData: any, props: any) => {
  console.log('[TaskComponentFactory] Detecting task data type:', typeof taskData, taskData);
  console.log('[TaskComponentFactory] Data keys:', Object.keys(taskData || {}));
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
  
  // Fallback: show debug info
  console.warn('[TaskComponentFactory] Unknown task data type, rendering debug info');
  return (
    <View className="flex-1">
      <Text className="text-sm">Unknown Task Data Type</Text>
      <Text className="text-sm">{JSON.stringify(taskData, null, 2)}</Text>
    </View>
  );
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

// ✅ NEW: CompleteTaskOverviewComponent - Using Native Tailwind Classes
export const CompleteTaskOverviewComponent: React.FC<{
  overview: CompleteTaskOverview;
  onAction?: (action: string, data: any) => void;
}> = ({ overview, onAction }) => {
  const { isDark } = useTheme();
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [showAllLists, setShowAllLists] = useState(false);
  
  const toggleListExpansion = (listId: string) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(listId)) {
      newExpanded.delete(listId);
    } else {
      newExpanded.add(listId);
    }
    setExpandedLists(newExpanded);
  };

  const hasOverdueTasks = overview.totalOverdue > 0;
  const hasFailures = overview.partialFailures && overview.partialFailures.length > 0;
  
  // Show only first 2 task lists initially, with option to expand
  const displayLists = showAllLists ? overview.taskLists : overview.taskLists.slice(0, 2);

  return (
    <View className={cn(
      "w-full rounded-lg p-2 my-1 border max-h-60 min-h-30",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      {/* Compact Overview Summary */}
      <View className={cn(
        "flex-row items-center pb-1.5 border-b mb-1.5 w-full",
        isDark ? "border-slate-700" : "border-gray-100"
      )}>
        <TasksIcon size={18} />
        <Text className={cn(
          "text-sm font-semibold ml-1.5 flex-1 min-w-0",
          isDark ? "text-white" : "text-gray-900"
        )}>
          📋 {overview.totalTasks} tasks • {overview.totalLists} lists
        </Text>
        {hasOverdueTasks && (
          <Text className="text-xs text-red-500 font-semibold min-w-10">
            ⚠️ {overview.totalOverdue}
          </Text>
        )}
      </View>

      {/* Scrollable Task Lists - More Compact */}
      <ScrollView 
        className="w-full max-h-36 flex-1"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {displayLists.map((taskListWithTasks) => (
          <View key={taskListWithTasks.id} className={cn(
            "rounded mb-1 border w-full",
            isDark ? "bg-slate-900 border-slate-600" : "bg-gray-50 border-gray-200"
          )}>
            <TouchableOpacity 
              className="flex-row items-center p-2 w-full"
              onPress={() => toggleListExpansion(taskListWithTasks.id)}
            >
              <Text className={cn(
                "text-xs mr-1.5 w-4 text-center",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>
                {expandedLists.has(taskListWithTasks.id) ? '▼' : '▶'}
              </Text>
              <Text className={cn(
                "text-sm font-medium flex-1 min-w-0",
                isDark ? "text-white" : "text-gray-900"
              )} numberOfLines={1}>
                {taskListWithTasks.title}
              </Text>
              <Text className={cn(
                "text-xs mr-2 min-w-5 text-right",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>
                {taskListWithTasks.taskCount}
              </Text>
              {taskListWithTasks.overdueCount > 0 && (
                <Text className="text-xs text-red-500 font-semibold min-w-7">
                  ⚠️{taskListWithTasks.overdueCount}
                </Text>
              )}
            </TouchableOpacity>

            {/* Compact Expanded Tasks */}
            {expandedLists.has(taskListWithTasks.id) && (
              <View className="px-2 pb-2 w-full">
                {taskListWithTasks.tasks.length === 0 ? (
                  <Text className={cn(
                    "text-xs italic w-full text-center",
                    isDark ? "text-slate-400" : "text-gray-600"
                  )}>No tasks</Text>
                ) : (
                  taskListWithTasks.tasks.slice(0, 5).map((task) => (
                    <View key={task.id} className="py-1 px-2 mb-0.5 w-full">
                      <Text className={cn(
                        "text-xs mb-0.5 w-full flex-wrap",
                        isDark ? "text-white" : "text-gray-900"
                      )} numberOfLines={1}>
                        {task.status === 'completed' ? '✅' : '⭕'} {task.title}
                      </Text>
                      {task.due && (
                        <Text className={cn(
                          "text-xs w-full",
                          isDark ? "text-slate-400" : "text-gray-600"
                        )}>
                          📅 {new Date(task.due).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  ))
                )}
                {taskListWithTasks.tasks.length > 5 && (
                  <Text className={cn(
                    "text-xs italic text-center py-1 w-full",
                    isDark ? "text-slate-400" : "text-gray-600"
                  )}>
                    +{taskListWithTasks.tasks.length - 5} more tasks
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}
        
        {/* Show More Lists Button */}
        {overview.taskLists.length > 2 && (
          <TouchableOpacity 
            className="p-2 items-center w-full"
            onPress={() => setShowAllLists(!showAllLists)}
          >
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {showAllLists ? 'Show Less' : `+${overview.taskLists.length - 2} More Lists`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Compact Actions */}
      <View className={cn(
        "flex-row justify-between pt-1.5 border-t mt-1.5 w-full px-2",
        isDark ? "border-slate-700" : "border-gray-100"
      )}>
        <TouchableOpacity 
          className={cn(
            "px-4 py-2 rounded-full border min-w-11 w-2/5 items-center",
            isDark ? "bg-slate-900 border-slate-600" : "bg-gray-50 border-gray-200"
          )}
          onPress={() => onAction?.('refresh_overview', null)}
        >
          <Text className={cn(
            "text-base text-center",
            isDark ? "text-white" : "text-gray-900"
          )}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="bg-green-600 border-green-600 px-4 py-2 rounded-full border min-w-11 w-2/5 items-center"
          onPress={() => onAction?.('create_task', null)}
        >
          <Text className={cn(
            "text-base text-center",
            isDark ? "text-white" : "text-gray-900"
          )}>➕</Text>
        </TouchableOpacity>
      </View>
    </View>
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