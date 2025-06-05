import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppColors } from '~/constants/Colors';
import { GmailIcon, CalendarIcon, ContactsIcon, TasksIcon } from '~/icons/ChatIcons';
import { ComponentAction } from '~/types/chat';

// ✅ ZOD-INFERRED TYPES: Always use validated types from Zod schemas
import type {
  EmailData,
  EmailListData,
  TaskData,
  TaskList,
  TaskListData,
  TaskListsData,
  TaskListWithTasks,
  CompleteTaskOverview,
  CalendarData,
  CalendarListData,
  ContactData,
  ContactListData,
} from '~/types/unified-response.validation';

// ✅ RUNTIME IMPORTS: Import type guards and enums as regular imports for runtime usage
import {
  ServiceType,
  isTaskData,
  isTaskListData,
  isTaskListsData,
  isTaskListWithTasks,
  isCompleteTaskOverview,
} from '~/types/unified-response.validation';

// Base component props (enhanced)
interface BaseComponentProps {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'loading';
  actions?: ComponentAction[];
  onAction?: (action: string, data: any) => void;
}

// Email Component
export const EmailComponent: React.FC<BaseComponentProps & { data: EmailData }> = ({
  id,
  timestamp,
  status,
  onAction,
  data
}) => {
  if (!data) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <GmailIcon size={20} />
        <Text style={styles.title}>{data.subject}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.from}>From: {data.from}</Text>
        <Text style={styles.to}>To: {data.to.join(', ')}</Text>
        <Text style={styles.body}>{data.body}</Text>
        {data.attachments && data.attachments.length > 0 && (
          <View style={styles.attachments}>
            {data.attachments.map((attachment, index) => (
              <TouchableOpacity
                key={index}
                style={styles.attachment}
                onPress={() => onAction?.('download', attachment)}
              >
                <Text style={styles.attachmentText}>
                  📎 {attachment.name} ({attachment.size} bytes)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.('reply', data)}
        >
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.('forward', data)}
        >
          <Text style={styles.actionText}>Forward</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Calendar Component
export const CalendarComponent: React.FC<BaseComponentProps & { data: CalendarData }> = ({
  id,
  timestamp,
  status,
  onAction,
  data
}) => {
  if (!data) return null;

  const startDate = new Date(data.start);
  const endDate = new Date(data.end);
  const isToday = startDate.toDateString() === new Date().toDateString();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CalendarIcon size={20} color="white" />
        <Text style={styles.title}>{data.title}</Text>
        {isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>TODAY</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.time}>
          {startDate.toLocaleString()} - {endDate.toLocaleString()}
        </Text>
        {data.location && (
          <Text style={styles.location}>📍 {data.location}</Text>
        )}
        {data.description && (
          <Text style={styles.description}>{data.description}</Text>
        )}
        {data.attendees.length > 0 && (
          <View style={styles.attendees}>
            <Text style={styles.attendeesTitle}>Attendees:</Text>
            {data.attendees.map((attendee, index) => (
              <Text key={index} style={styles.attendee}>
                • {attendee.name || attendee.email}
              </Text>
            ))}
          </View>
        )}
        {data.meetingLink && (
          <TouchableOpacity 
            style={styles.meetingLinkButton}
            onPress={() => onAction?.('join_meeting', data)}
          >
            <Text style={styles.meetingLinkText}>🔗 Join Meeting</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.('edit', data)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.('share', data)}
        >
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Contact Component
export const ContactComponent: React.FC<BaseComponentProps & { data: ContactData }> = ({
  id,
  timestamp,
  status,
  onAction,
  data
}) => {
  if (!data) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ContactsIcon size={20} />
        <Text style={styles.title}>{data.name}</Text>
      </View>
      <View style={styles.content}>
        {data.title && (
          <Text style={styles.subtitle}>{data.title}</Text>
        )}
        {data.company && (
          <Text style={styles.company}>{data.company}</Text>
        )}
        {data.emails.map((emailObj, index) => (
          <Text key={index} style={styles.contactInfo}>
            ✉️ {emailObj.address}
          </Text>
        ))}
        {data.phones.map((phoneObj, index) => (
          <Text key={index} style={styles.contactInfo}>
            📞 {phoneObj.number}
          </Text>
        ))}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.('edit', data)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.('message', data)}
        >
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Task Component (Legacy - for backwards compatibility)
export const TaskComponent: React.FC<BaseComponentProps & { data: TaskData }> = ({
  id,
  timestamp,
  status,
  onAction,
  data
}) => {
  if (!data) return null;

  // Handle both legacy and new TaskData formats
  const title = data.title;
  const taskStatus = data.status || 'needsAction';
  const dueDate = data.due; // New schema uses 'due' instead of 'dueDate'
  const description = data.notes; // New schema uses 'notes' instead of 'description'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TasksIcon size={20} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>
        {dueDate && (
          <Text style={styles.dueDate}>
            Due: {new Date(dueDate).toLocaleDateString()}
          </Text>
        )}
        {description && (
          <Text style={styles.notes}>{description}</Text>
        )}
        <View style={[
          styles.statusBadge,
          { backgroundColor: taskStatus === 'completed' ? AppColors.success : AppColors.warning }
        ]}>
          <Text style={styles.statusText}>
            {taskStatus === 'needsAction' ? 'Pending' : taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.('complete', data)}
        >
          <Text style={styles.actionText}>Complete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.('edit', data)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ✅ PHASE 2: Task-Specific Component Factory with Type Detection
export const createTaskComponent = (taskData: any, props: any) => {
  console.log('[TaskComponentFactory] Detecting task data type:', typeof taskData, taskData);
  
  // Use type guards to determine component type
  if (isCompleteTaskOverview(taskData)) {
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
    console.log('[TaskComponentFactory] Rendering individual TaskComponent');
    return <TaskComponent {...props} data={taskData} />;
  }
  
  // Fallback: try to render as individual task
  console.warn('[TaskComponentFactory] Unknown task data type, attempting TaskComponent fallback');
  return <TaskComponent {...props} data={taskData} />;
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

// Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
  },
  content: {
    marginBottom: 16,
  },
  from: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  to: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  attachments: {
    marginTop: 8,
  },
  attachment: {
    padding: 8,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    marginBottom: 4,
  },
  attachmentText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: AppColors.background,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
  time: {
    fontSize: 14,
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  attendees: {
    marginTop: 8,
  },
  attendeesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  attendee: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  company: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 14,
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  list: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  notes: {
    fontSize: 14,
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  
  // ✅ PHASE 4: NEW email list styles
  emailListContainer: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  emailSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  emailCard: {
    padding: 12,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  unreadEmail: {
    backgroundColor: `${AppColors.aiGradientStart}10`,
    borderColor: AppColors.aiGradientStart,
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  emailFrom: {
    fontSize: 12,
    color: AppColors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  emailDate: {
    fontSize: 11,
    color: AppColors.textSecondary,
  },
  emailSubject: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  emailPreview: {
    fontSize: 12,
    color: AppColors.textSecondary,
    lineHeight: 16,
  },
  expandButton: {
    padding: 8,
    backgroundColor: AppColors.background,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  expandText: {
    fontSize: 12,
    color: AppColors.aiGradientStart,
    fontWeight: '500',
  },
  emailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  attachmentIndicator: {
    alignSelf: 'flex-end',
    backgroundColor: AppColors.aiGradientStart,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  emailAttachmentText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  richContentIndicator: {
    fontSize: 12,
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  messageLengthIndicator: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  labelIndicator: {
    fontSize: 12,
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  labelsContainer: {
    padding: 4,
    backgroundColor: AppColors.background,
    borderRadius: 4,
    marginLeft: 8,
  },
  labelsText: {
    fontSize: 12,
    color: AppColors.textPrimary,
  },
  emailExtras: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  summaryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enhancedIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicator: {
    fontSize: 12,
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
  expandedContent: {
    marginBottom: 8,
  },
  fullMessageContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: `${AppColors.background}80`,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.aiGradientStart,
  },
  fullMessageLabel: {
    fontSize: 12,
    color: AppColors.aiGradientStart,
    fontWeight: '600',
    marginBottom: 4,
  },
  fullMessageText: {
    fontSize: 13,
    color: AppColors.textPrimary,
    lineHeight: 18,
  },
  expandIndicator: {
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: 4,
  },
  emailCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  cardActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cardActionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // ✅ PHASE 4: NEW task-specific styles
  taskListContainer: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  taskSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  taskIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskCard: {
    padding: 12,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  completedTask: {
    backgroundColor: `${AppColors.success}10`,
    borderColor: AppColors.success,
  },
  overdueTask: {
    backgroundColor: `${AppColors.error}10`,
    borderColor: AppColors.error,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  statusIcon: {
    fontSize: 16,
  },
  taskTitle: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: AppColors.textSecondary,
  },
  overdueDateText: {
    color: AppColors.error,
    fontWeight: '600',
  },
  taskNotes: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  taskMeta: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  updatedDate: {
    fontSize: 11,
    color: AppColors.textSecondary,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },

  // ✅ PHASE 4: TaskListsComponent for multiple Google Task Lists (LIST_TASK_LISTS response)
  taskListsContainer: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  taskListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskListTitle: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  taskListDate: {
    fontSize: 11,
    color: AppColors.textSecondary,
  },
  taskListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskListId: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  taskListCard: {
    padding: 12,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },

  // ✅ PHASE 4: NEW Complete Task Overview Component
  completeOverviewContainer: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  overviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewSummaryDetails: {
    flexDirection: 'column',
    gap: 4,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  overviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewStat: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  overdueStats: {
    color: AppColors.error,
    fontWeight: '600',
  },
  syncWarning: {
    backgroundColor: `${AppColors.warning}10`,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  syncWarningText: {
    fontSize: 14,
    color: AppColors.error,
    fontWeight: '600',
  },
  taskListWithTasksCard: {
    backgroundColor: AppColors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  taskListWithTasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskListHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandIcon: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  taskListWithTasksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
  },
  taskListHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskCount: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  overdueCount: {
    fontSize: 14,
    color: AppColors.error,
    fontWeight: '600',
  },
  expandedTasksContainer: {
    marginTop: 8,
  },
  noTasksText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  addTaskToListButton: {
    padding: 12,
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 6,
    alignItems: 'center',
  },
  addTaskToListText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  overviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryActionButton: {
    padding: 12,
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  urgentAction: {
    backgroundColor: AppColors.error,
  },
  fetchError: {
    backgroundColor: `${AppColors.error}10`,
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  fetchErrorText: {
    fontSize: 12,
    color: AppColors.error,
    fontWeight: '500',
  },

  // ✅ NEW: ContactListComponent for multiple contacts
  contactListContainer: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  contactSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  contactCard: {
    padding: 12,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  contactHeader: {
    marginBottom: 8,
  },
  contactNameSection: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  contactJob: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  contactDetails: {
    marginBottom: 8,
    gap: 4,
  },
  contactDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactDetailType: {
    fontSize: 14,
    width: 20,
  },
  contactDetailValue: {
    fontSize: 14,
    color: AppColors.textPrimary,
    flex: 1,
  },
  contactQuickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  quickActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.aiGradientStart,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 16,
  },

  // ✅ NEW: CalendarListComponent for multiple calendar events
  calendarListContainer: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  calendarSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  timeRangeText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  calendarCard: {
    padding: 12,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  todayEvent: {
    backgroundColor: `${AppColors.success}10`,
    borderColor: AppColors.success,
  },
  pastEvent: {
    backgroundColor: `${AppColors.textSecondary}05`,
    borderColor: AppColors.textSecondary,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitleSection: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  pastEventText: {
    color: AppColors.textSecondary,
  },
  eventTime: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  todayEventTime: {
    color: AppColors.success,
    fontWeight: '600',
  },
  todayBadge: {
    padding: 4,
    backgroundColor: AppColors.success,
    borderRadius: 4,
  },
  todayBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  eventDetails: {
    marginTop: 8,
    gap: 4,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailIcon: {
    fontSize: 14,
    width: 20,
  },
  eventDetailText: {
    fontSize: 13,
    color: AppColors.textPrimary,
    flex: 1,
  },
  eventQuickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  meetingLinkButton: {
    padding: 8,
    backgroundColor: AppColors.success,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  meetingLinkText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 

// ✅ PHASE 4: NEW EmailListComponent for multiple emails
export const EmailListComponent: React.FC<{
  emails: EmailData[];
  totalCount: number;
  unreadCount: number;
  hasMore?: boolean;
  onAction?: (action: string, data: any) => void;
}> = ({ emails, totalCount, unreadCount, hasMore, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const displayEmails = expanded ? emails : emails.slice(0, 3);

  return (
    <View style={styles.emailListContainer}>
      {/* Summary header */}
      <View style={styles.emailSummary}>
        <GmailIcon size={20} />
        <View style={styles.summaryDetails}>
          <Text style={styles.summaryText}>
            {totalCount} email{totalCount !== 1 ? 's' : ''}{unreadCount > 0 && ` (${unreadCount} unread)`}
          </Text>
        </View>
      </View>

      {/* Email preview cards */}
      {displayEmails.map((email, index) => (
        <View key={email.id || index} style={[styles.emailCard, !email.isRead && styles.unreadEmail]}>
          <View style={styles.emailHeader}>
            <Text style={styles.emailFrom} numberOfLines={1}>
              {email.from}
            </Text>
            <Text style={styles.emailDate}>{email.date}</Text>
          </View>
          <Text style={styles.emailSubject} numberOfLines={1}>
            {email.subject}
          </Text>
          <Text style={styles.emailPreview} numberOfLines={2}>
            {email.body}
          </Text>
        </View>
      ))}

      {/* Expand/collapse toggle */}
      {emails.length > 3 && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : `Show ${emails.length - 3} More`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.emailActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('reply_first', emails[0])}
        >
          <Text style={styles.actionText}>Reply to First</Text>
        </TouchableOpacity>
        
        {hasMore && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAction?.('load_more', null)}
          >
            <Text style={styles.actionText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ✅ NEW: ContactListComponent for multiple contacts
export const ContactListComponent: React.FC<{
  contacts: ContactData[];
  totalCount: number;
  hasMore?: boolean;
  nextPageToken?: string;
  onAction?: (action: string, data: any) => void;
}> = ({ contacts, totalCount, hasMore, nextPageToken, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const displayContacts = expanded ? contacts : contacts.slice(0, 5);

  return (
    <View style={styles.contactListContainer}>
      {/* Summary header */}
      <View style={styles.contactSummary}>
        <ContactsIcon size={20} />
        <View style={styles.summaryDetails}>
          <Text style={styles.summaryText}>
            📱 {totalCount} contact{totalCount !== 1 ? 's' : ''}
          </Text>
        </View>
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
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : `Show ${contacts.length - 5} More`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.contactActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('search_contacts', null)}
        >
          <Text style={styles.actionText}>🔍 Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('create_contact', null)}
        >
          <Text style={styles.actionText}>➕ Create</Text>
        </TouchableOpacity>

        {hasMore && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAction?.('load_more', { nextPageToken })}
          >
            <Text style={styles.actionText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ✅ Individual Contact Card Component
const ContactCard: React.FC<{
  contact: ContactData;
  onAction?: (action: string, data: any) => void;
}> = ({ contact, onAction }) => {
  return (
    <TouchableOpacity 
      style={styles.contactCard}
      onPress={() => onAction?.('view_contact', contact)}
    >
      <View style={styles.contactHeader}>
        <View style={styles.contactNameSection}>
          <Text style={styles.contactName} numberOfLines={1}>
            👤 {contact.name}
          </Text>
          {contact.title && contact.company && (
            <Text style={styles.contactJob} numberOfLines={1}>
              {contact.title} at {contact.company}
            </Text>
          )}
          {contact.title && !contact.company && (
            <Text style={styles.contactJob} numberOfLines={1}>
              {contact.title}
            </Text>
          )}
          {!contact.title && contact.company && (
            <Text style={styles.contactJob} numberOfLines={1}>
              {contact.company}
            </Text>
          )}
        </View>
      </View>

      {/* Contact details */}
      <View style={styles.contactDetails}>
        {/* Emails */}
        {contact.emails.length > 0 && (
          <View style={styles.contactDetailRow}>
            <Text style={styles.contactDetailType}>✉️</Text>
            <Text style={styles.contactDetailValue} numberOfLines={1}>
              {contact.emails.map(email => email.address).join(', ')}
            </Text>
          </View>
        )}

        {/* Phones */}
        {contact.phones.length > 0 && (
          <View style={styles.contactDetailRow}>
            <Text style={styles.contactDetailType}>📞</Text>
            <Text style={styles.contactDetailValue} numberOfLines={1}>
              {contact.phones.map(phone => phone.number).join(', ')}
            </Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.contactQuickActions}>
        {contact.emails.length > 0 && (
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => onAction?.('email_contact', contact)}
          >
            <Text style={styles.quickActionText}>✉️</Text>
          </TouchableOpacity>
        )}
        
        {contact.phones.length > 0 && (
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => onAction?.('call_contact', contact)}
          >
            <Text style={styles.quickActionText}>📞</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => onAction?.('edit_contact', contact)}
        >
          <Text style={styles.quickActionText}>✏️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ✅ NEW: CalendarListComponent for multiple calendar events
export const CalendarListComponent: React.FC<{
  events: CalendarData[];
  totalCount: number;
  hasMore?: boolean;
  timeRange?: { start: string; end: string };
  onAction?: (action: string, data: any) => void;
}> = ({ events, totalCount, hasMore, timeRange, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const displayEvents = expanded ? events : events.slice(0, 4);

  return (
    <View style={styles.calendarListContainer}>
      {/* Summary header */}
      <View style={styles.calendarSummary}>
        <CalendarIcon size={20} color="white" />
        <View style={styles.summaryDetails}>
          <Text style={styles.summaryText}>
            📅 {totalCount} event{totalCount !== 1 ? 's' : ''}
          </Text>
          {timeRange && (
            <Text style={styles.timeRangeText}>
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
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : `Show ${events.length - 4} More Events`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.calendarActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('create_event', null)}
        >
          <Text style={styles.actionText}>➕ Create Event</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('view_calendar', null)}
        >
          <Text style={styles.actionText}>🗓️ Open Calendar</Text>
        </TouchableOpacity>

        {hasMore && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAction?.('load_more_events', null)}
          >
            <Text style={styles.actionText}>Load More</Text>
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

  return (
    <TouchableOpacity 
      style={[
        styles.calendarCard,
        isToday && styles.todayEvent,
        isPast && styles.pastEvent
      ]}
      onPress={() => onAction?.('view_event', event)}
    >
      <View style={styles.eventHeader}>
        <View style={styles.eventTitleSection}>
          <Text style={[
            styles.eventTitle,
            isPast && styles.pastEventText
          ]} numberOfLines={2}>
            📅 {event.title}
          </Text>
          <Text style={[
            styles.eventTime,
            isToday && styles.todayEventTime
          ]}>
            {formatDateRange()}
          </Text>
        </View>
        
        {isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>TODAY</Text>
          </View>
        )}
      </View>

      {/* Event details */}
      <View style={styles.eventDetails}>
        {event.location && (
          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailIcon}>📍</Text>
            <Text style={styles.eventDetailText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}

        {event.attendees.length > 0 && (
          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailIcon}>👥</Text>
            <Text style={styles.eventDetailText} numberOfLines={1}>
              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {event.meetingLink && (
          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailIcon}>🔗</Text>
            <Text style={styles.eventDetailText} numberOfLines={1}>
              Video meeting available
            </Text>
          </View>
        )}

        {event.description && (
          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailIcon}>📝</Text>
            <Text style={styles.eventDetailText} numberOfLines={2}>
              {event.description}
            </Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.eventQuickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => onAction?.('edit_event', event)}
        >
          <Text style={styles.quickActionText}>✏️</Text>
        </TouchableOpacity>
        
        {event.meetingLink && (
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => onAction?.('join_meeting', event)}
          >
            <Text style={styles.quickActionText}>🔗</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => onAction?.('share_event', event)}
        >
          <Text style={styles.quickActionText}>📤</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ✅ NEW: CompleteTaskOverviewComponent - reuses TaskComponent for individual tasks
export const CompleteTaskOverviewComponent: React.FC<{
  overview: CompleteTaskOverview;
  onAction?: (action: string, data: any) => void;
}> = ({ overview, onAction }) => {
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  
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

  return (
    <View style={styles.completeOverviewContainer}>
      {/* Overview Summary */}
      <View style={styles.overviewSummary}>
        <TasksIcon size={24} />
        <View style={styles.overviewSummaryDetails}>
          <Text style={styles.overviewTitle}>
            📋 Complete Task Overview
          </Text>
          <View style={styles.overviewStats}>
            <Text style={styles.overviewStat}>
              {overview.totalTasks} tasks across {overview.totalLists} lists
            </Text>
            {overview.totalCompleted > 0 && (
              <Text style={styles.overviewStat}>
                • {overview.totalCompleted} completed
              </Text>
            )}
            {overview.totalPending > 0 && (
              <Text style={styles.overviewStat}>
                • {overview.totalPending} pending
              </Text>
            )}
            {hasOverdueTasks && (
              <Text style={[styles.overviewStat, styles.overdueStats]}>
                • {overview.totalOverdue} overdue ⚠️
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Sync warnings */}
      {hasFailures && (
        <View style={styles.syncWarning}>
          <Text style={styles.syncWarningText}>
            ⚠️ Some task lists failed to load: {overview.partialFailures?.map(f => f.listTitle).join(', ')}
          </Text>
        </View>
      )}

      {/* Task Lists with Tasks */}
      {overview.taskLists.map((taskListWithTasks) => (
        <View key={taskListWithTasks.id} style={styles.taskListWithTasksCard}>
          <TouchableOpacity 
            style={styles.taskListWithTasksHeader}
            onPress={() => toggleListExpansion(taskListWithTasks.id)}
          >
            <View style={styles.taskListHeaderLeft}>
              <Text style={styles.expandIcon}>
                {expandedLists.has(taskListWithTasks.id) ? '▼' : '▶'}
              </Text>
              <Text style={styles.taskListWithTasksTitle} numberOfLines={1}>
                {taskListWithTasks.title}
              </Text>
            </View>
            <View style={styles.taskListHeaderRight}>
              <Text style={styles.taskCount}>
                {taskListWithTasks.taskCount} tasks
              </Text>
              {taskListWithTasks.overdueCount > 0 && (
                <Text style={styles.overdueCount}>
                  {taskListWithTasks.overdueCount} overdue
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Expanded Tasks - REUSING TaskComponent */}
          {expandedLists.has(taskListWithTasks.id) && (
            <View style={styles.expandedTasksContainer}>
              {taskListWithTasks.tasks.length === 0 ? (
                <View>
                  <Text style={styles.noTasksText}>No tasks in this list</Text>
                  <TouchableOpacity 
                    style={styles.addTaskToListButton}
                    onPress={() => onAction?.('create_task_in_list', { listId: taskListWithTasks.id, listTitle: taskListWithTasks.title })}
                  >
                    <Text style={styles.addTaskToListText}>➕ Add Task to {taskListWithTasks.title}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                taskListWithTasks.tasks.map((task) => (
                  <TaskComponent
                    key={task.id}
                    id={task.id}
                    timestamp={task.updated || new Date().toISOString()}
                    status="success"
                    data={task}
                    onAction={onAction}
                  />
                ))
              )}
            </View>
          )}

          {/* Fetch errors */}
          {!taskListWithTasks.fetchSuccess && (
            <View style={styles.fetchError}>
              <Text style={styles.fetchErrorText}>
                Failed to load tasks: {taskListWithTasks.fetchError}
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* Overview Actions */}
      <View style={styles.overviewActions}>
        <TouchableOpacity 
          style={[
            styles.primaryActionButton,
            hasOverdueTasks && styles.urgentAction
          ]}
          onPress={() => onAction?.('create_task', null)}
        >
          <Text style={styles.primaryActionText}>
            ➕ Create New Task
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('refresh_overview', null)}
        >
          <Text style={styles.actionText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ✅ PHASE 1: NEW TaskListsComponent for multiple task lists (LIST_TASK_LISTS response)
export const TaskListsComponent: React.FC<{
  taskListsData: TaskListsData;
  onAction?: (action: string, data: any) => void;
}> = ({ taskListsData, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const displayLists = expanded ? taskListsData.taskLists : taskListsData.taskLists.slice(0, 3);

  return (
    <View style={styles.taskListsContainer}>
      {/* Summary header */}
      <View style={styles.taskSummary}>
        <TasksIcon size={20} />
        <View style={styles.summaryDetails}>
          <Text style={styles.summaryText}>
            📋 {taskListsData.totalCount} task list{taskListsData.totalCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Task Lists */}
      {displayLists.map((taskList) => (
        <TouchableOpacity 
          key={taskList.id}
          style={styles.taskListCard}
          onPress={() => onAction?.('view_task_list', taskList)}
        >
          <View style={styles.taskListHeader}>
            <Text style={styles.taskListTitle} numberOfLines={1}>
              📝 {taskList.title}
            </Text>
            <Text style={styles.taskListDate}>
              {new Date(taskList.updated).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.taskListMeta}>
            <Text style={styles.taskListId}>ID: {taskList.id}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Expand/collapse toggle */}
      {taskListsData.taskLists.length > 3 && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : `Show ${taskListsData.taskLists.length - 3} More Lists`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.taskActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('create_task_list', null)}
        >
          <Text style={styles.actionText}>➕ Create List</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('refresh_task_lists', null)}
        >
          <Text style={styles.actionText}>🔄 Refresh</Text>
        </TouchableOpacity>

        {taskListsData.hasMore && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAction?.('load_more_lists', null)}
          >
            <Text style={styles.actionText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ✅ PHASE 1: NEW TaskListDataComponent for tasks within a single list (LIST_TASKS response)
export const TaskListDataComponent: React.FC<{
  taskListData: TaskListData;
  onAction?: (action: string, data: any) => void;
}> = ({ taskListData, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const displayTasks = expanded ? taskListData.tasks : taskListData.tasks.slice(0, 5);

  return (
    <View style={styles.taskListContainer}>
      {/* Summary header */}
      <View style={styles.taskSummary}>
        <TasksIcon size={20} />
        <View style={styles.summaryDetails}>
          <Text style={styles.summaryText}>
            📋 {taskListData.listTitle || 'Task List'}
          </Text>
          <View style={styles.taskIndicators}>
            <Text style={styles.summaryText}>
              {taskListData.totalCount} task{taskListData.totalCount !== 1 ? 's' : ''}
            </Text>
            {taskListData.completedCount > 0 && (
              <Text style={styles.summaryText}>
                • {taskListData.completedCount} completed
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Individual Tasks - REUSING TaskComponent */}
      {displayTasks.length === 0 ? (
        <View>
          <Text style={styles.noTasksText}>No tasks in this list</Text>
          <TouchableOpacity 
            style={styles.addTaskToListButton}
            onPress={() => onAction?.('create_task_in_list', { 
              listId: taskListData.listId, 
              listTitle: taskListData.listTitle 
            })}
          >
            <Text style={styles.addTaskToListText}>
              ➕ Add Task{taskListData.listTitle ? ` to ${taskListData.listTitle}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        displayTasks.map((task) => (
          <TaskComponent
            key={task.id}
            id={task.id}
            timestamp={task.updated || new Date().toISOString()}
            status="success"
            data={task}
            onAction={onAction}
          />
        ))
      )}

      {/* Expand/collapse toggle */}
      {taskListData.tasks.length > 5 && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : `Show ${taskListData.tasks.length - 5} More Tasks`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.taskActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('create_task_in_list', { 
            listId: taskListData.listId, 
            listTitle: taskListData.listTitle 
          })}
        >
          <Text style={styles.actionText}>➕ Add Task</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('view_list_details', { 
            listId: taskListData.listId, 
            listTitle: taskListData.listTitle 
          })}
        >
          <Text style={styles.actionText}>📝 List Details</Text>
        </TouchableOpacity>

        {taskListData.hasMore && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAction?.('load_more_tasks', { listId: taskListData.listId })}
          >
            <Text style={styles.actionText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}; 