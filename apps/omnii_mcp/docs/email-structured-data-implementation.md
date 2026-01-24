# Email Structured Data Implementation Plan

## Overview
Fix the client-side processing of `UnifiedToolResponse` to properly render structured email data with static typing using Zod validation instead of runtime type checking.

## Current Issue Analysis

### Server Side ✅ (Working)
- EmailPlugin creates proper `UnifiedToolResponse` with `data.structured.emails[]`
- WebSocket handler sends complete response to client
- Rich email data is available in the response

### Client Side ❌ (Broken)  
- `ChatService` only extracts `message` content, ignores structured data
- `ChatMessage` component doesn't render email arrays
- Runtime type checking instead of static validation
- Email list data lost in transformation

## Implementation Plan

### Phase 1: Zod Static Validation Foundation (20 min)
**Goal**: Replace manual validation with Zod schemas for static typing

#### 1.1 Install Zod
```bash
cd omnii_mcp && bun add zod
cd omnii-mobile && npm install zod
```

#### 1.2 Update `unified-response.validation.ts`
- Replace manual validation functions with proper Zod schemas
- Create discriminated union schemas based on `ComposioApp` enum
- Add compile-time type safety

```typescript
import { z } from 'zod';
import { ComposioApp } from './composio-enums';

// Static discriminated union based on existing types
export const UnifiedToolResponseSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    data: z.object({
      structured: EmailListDataSchema.or(EmailDataSchema)
    })
  }),
  // ... other types
]);

export type UnifiedToolResponse = z.infer<typeof UnifiedToolResponseSchema>;
```

#### 1.3 Create Email-Specific Schemas
```typescript
export const EmailDataSchema = z.object({
  id: z.string().optional(),
  subject: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  body: z.string(),
  date: z.string().optional(),
  isRead: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  // ... other fields
});

export const EmailListDataSchema = z.object({
  emails: z.array(EmailDataSchema),
  totalCount: z.number(),
  unreadCount: z.number(),
  hasMore: z.boolean().optional(),
});
```

### Phase 2: ChatService Static Processing (25 min)
**Goal**: Fix `ChatService` to preserve structured data with static typing

#### 2.1 Update `ChatService.ts` imports
```typescript
import { UnifiedToolResponseSchema, EmailListDataSchema } from '~/types/unified-response.validation';
import { ComposioApp } from '~/types/composio-enums';
```

#### 2.2 Replace `isUnifiedToolResponse` with static validation
```typescript
private isUnifiedToolResponse(data: any): data is UnifiedToolResponse {
  const result = UnifiedToolResponseSchema.safeParse(data);
  if (result.success) {
    console.log('[ChatService] ✅ Valid UnifiedToolResponse detected');
    return true;
  }
  console.log('[ChatService] ❌ Invalid UnifiedToolResponse:', result.error.message);
  return false;
}
```

#### 2.3 Fix `transformUnifiedResponse` to preserve email data
```typescript
private transformUnifiedResponse(response: UnifiedToolResponse) {
  // Validate email data if present
  if (response.type === 'email' && response.data.structured) {
    const emailValidation = EmailListDataSchema.safeParse(response.data.structured);
    if (emailValidation.success) {
      console.log('[ChatService] ✅ Email list data validated:', emailValidation.data.emails.length);
    }
  }

  const chatMessage = {
    // ... existing fields
    metadata: {
      category: this.detectComponentCategory(response),
      componentData: response.data.structured, // ✅ Preserve structured data
      unifiedResponse: response,
      // ... other fields
    }
  };
  
  return chatMessage;
}
```

#### 2.4 Static category detection using enums
```typescript
private detectComponentCategory(response: UnifiedToolResponse): ResponseCategory {
  // Use static typing instead of runtime checking
  switch (response.type) {
    case 'email':
      if (response.data.structured && 'emails' in response.data.structured) {
        return ResponseCategory.EMAIL_LIST;
      }
      return ResponseCategory.EMAIL_SINGLE;
    case 'calendar':
      return ResponseCategory.CALENDAR_LIST;
    // ... other cases using ComposioApp enum
    default:
      return ResponseCategory.GENERAL;
  }
}
```

### Phase 3: Enhanced ChatMessage Component (20 min)  
**Goal**: Make `ChatMessage` render structured email data

#### 3.1 Update `ChatMessage.tsx` imports
```typescript
import { EmailListDataSchema } from '~/types/unified-response.validation';
import { ResponseCategory } from '~/services/chat/ChatService';
import { EmailComponent } from './MessageComponents';
```

#### 3.2 Add email detection and rendering
```typescript
export function ChatMessage({ message }: ChatMessageProps) {
  // ... existing code

  // ✅ Static email detection
  const isEmailList = message.metadata?.category === ResponseCategory.EMAIL_LIST;
  const emailListData = isEmailList ? message.metadata.componentData : null;

  return (
    <View style={[...]}>
      <View style={[...]}>
        <Text style={[...]}>{message.content}</Text>

        {/* ✅ Render email list if available */}
        {isEmailList && emailListData && (
          <EmailListComponent 
            emails={emailListData.emails}
            totalCount={emailListData.totalCount}
            unreadCount={emailListData.unreadCount}
            hasMore={emailListData.hasMore}
            onAction={(action, data) => handleEmailAction(action, data)}
          />
        )}

        {/* ... existing code */}
      </View>
    </View>
  );
}
```

### Phase 4: Email List Component Enhancement (25 min)
**Goal**: Create rich email list rendering with actions

#### 4.1 Update `MessageComponents.tsx` for email arrays
```typescript
// ✅ Email List Component (multiple emails)
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
      {/* ✅ Summary header */}
      <View style={styles.emailSummary}>
        <GmailIcon size={20} />
        <Text style={styles.summaryText}>
          {totalCount} emails{unreadCount > 0 && ` (${unreadCount} unread)`}
        </Text>
      </View>

      {/* ✅ Email preview cards */}
      {displayEmails.map((email, index) => (
        <EmailPreviewCard 
          key={email.id || index}
          email={email}
          onAction={onAction}
        />
      ))}

      {/* ✅ Expand/collapse toggle */}
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

      {/* ✅ Actions */}
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

// ✅ Individual email preview card
const EmailPreviewCard: React.FC<{
  email: EmailData;
  onAction?: (action: string, data: any) => void;
}> = ({ email, onAction }) => {
  return (
    <TouchableOpacity 
      style={[styles.emailCard, !email.isRead && styles.unreadEmail]}
      onPress={() => onAction?.('open_email', email)}
    >
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
        {email.body || '(No preview)'}
      </Text>
      
      {email.attachments && email.attachments.length > 0 && (
        <View style={styles.attachmentIndicator}>
          <Text style={styles.attachmentText}>
            📎 {email.attachments.length}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
```

#### 4.2 Update `useChat.ts` to handle email actions
```typescript
// Add email action handler
const handleEmailAction = useCallback((action: string, data: any) => {
  switch (action) {
    case 'reply_first':
      sendMessage(`reply to email: ${data.subject}`);
      break;
    case 'load_more':
      sendMessage('fetch more emails');
      break;
    case 'open_email':
      sendMessage(`open email: ${data.subject}`);
      break;
  }
}, [sendMessage]);
```

## Implementation Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1** | 20 min | Zod schemas, static validation |
| **Phase 2** | 25 min | Fixed ChatService with preserved data |
| **Phase 3** | 20 min | ChatMessage renders email components |
| **Phase 4** | 25 min | Rich email list with actions |
| **Total** | **90 min** | **Complete email structured data rendering** |

## Expected Outcome

### Before (Current)
```
AI: "📥 Latest emails: Found 20 emails (14 unread)"
[Plain text message - no interaction]
```

### After (Fixed)
```
AI: "📥 Latest emails: Found 20 emails (14 unread)"

[📧 Gmail] 20 emails (14 unread)

┌─────────────────────────────────────┐
│ 📧 sender@company.com     Dec 15    │
│ Meeting Reminder: Tomorrow 2PM      │
│ Don't forget about our team meeting│
│                               📎 1  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📧 newsletter@fitness.com   Dec 14  │
│ 🚨 Last Chance to Join for $1      │
│ Limited time offer expiring soon... │
└─────────────────────────────────────┘

[Show 18 More] [Reply to First] [Load More]
```

## Technical Benefits

1. **✅ Static Typing**: Compile-time validation with Zod
2. **✅ Rich Rendering**: Interactive email list with previews
3. **✅ Type Safety**: No runtime type checking needed
4. **✅ Enum-Based**: Leverages existing `ComposioApp` types
5. **✅ Performance**: Only render what's needed
6. **✅ Extensible**: Pattern works for calendar/contacts too

## Files Modified

1. `omnii_mcp/src/types/unified-response.validation.ts` - Zod schemas
2. `omnii-mobile/src/services/chat/ChatService.ts` - Static processing  
3. `omnii-mobile/src/components/chat/ChatMessage.tsx` - Email rendering
4. `omnii-mobile/src/components/chat/MessageComponents.tsx` - Email components
5. `omnii-mobile/src/hooks/useChat.ts` - Email action handling

Ready to proceed with **Phase 1: Zod Static Validation Foundation**? 

---

# Google Tasks Structured Data Implementation

## Overview
Implement the complete flow from Google Tasks API response to rich interactive task components using Zod validation and the UnifiedToolResponse pipeline.

## Google Tasks API Response Structure

Based on ActionPlanner logging, the Google Tasks API returns:
```typescript
{
  data: {
    response_data: {
      etag: string,
      items: [
        {
          etag: string,
          id: string,
          kind: string,
          selfLink: string,
          title: string,
          updated: string,
          status?: string,
          due?: string,
          notes?: string,
          completed?: string,
          parent?: string,
          position?: string
        }
      ],
      kind: string
    }
  }
}
```

## Implementation Flow

### Phase 1: Enhanced Zod Schemas for Tasks (15 min)

#### 1.1 Update `unified-response.validation.ts`
```typescript
// Task data schemas
export const TaskDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['needsAction', 'completed']).optional(),
  notes: z.string().optional(),
  due: z.string().optional(), // ISO date string
  completed: z.string().optional(), // ISO date string
  updated: z.string(),
  parent: z.string().optional(),
  position: z.string().optional(),
  selfLink: z.string().optional(),
  etag: z.string().optional(),
  kind: z.string().optional(),
});

export const TaskListDataSchema = z.object({
  tasks: z.array(TaskDataSchema),
  totalCount: z.number(),
  completedCount: z.number(),
  hasMore: z.boolean().optional(),
  listTitle: z.string().optional(),
  listId: z.string().optional(),
});

// Add to discriminated union
z.object({
  type: z.literal(ServiceType.TASK),
  success: z.boolean(),
  data: z.object({
    ui: UIDataSchema,
    structured: TaskListDataSchema.or(TaskDataSchema).optional(),
    raw: z.any().optional(),
  }),
  message: z.string(),
  authRequired: z.boolean().optional(),
  authUrl: z.string().optional(),
  timestamp: z.string(),
  id: z.string(),
  userId: z.string(),
}),
```

### Phase 2: TasksPlugin UnifiedToolResponse Integration (25 min)

#### 2.1 Update `tasks-plugin.ts` to use UnifiedResponseBuilder
```typescript
import { 
  UnifiedToolResponse, 
  UnifiedResponseBuilder, 
  TaskData,
  TaskListData,
  UnifiedAction,
} from "../../types/unified-response.types";
import { ServiceType } from "../../types/unified-response.validation";

export class TasksPlugin implements GoogleServicePlugin {
  async processMessage(
    message: string,
    userId: string,
    context: ExecutionContextType,
    activeConnection: any,
    composio: OpenAIToolSet,
    openai: OpenAI
  ): Promise<UnifiedToolResponse> {
    const builder = new UnifiedResponseBuilder(ServiceType.TASK, userId);

    try {
      // ... existing OpenAI call logic

      // Parse Google Tasks API response
      const responseData = Array.isArray(toolResponse) ? toolResponse[0] : toolResponse;
      let parsedData = typeof responseData === "string" ? JSON.parse(responseData) : responseData;

      // Transform Google Tasks API response to structured data
      const result = this.formatTasksResponse(message, parsedData, builder);
      return result;

    } catch (error) {
      return builder
        .setSuccess(false)
        .setTitle("Tasks Error")
        .setContent("Sorry, I had trouble with your task request.")
        .setMessage(error instanceof Error ? error.message : "Unknown error")
        .build();
    }
  }

  private formatTasksResponse(
    originalMessage: string,
    parsed: any,
    builder: UnifiedResponseBuilder
  ): UnifiedToolResponse {
    const action = this.detectActionFromMessage(originalMessage);
    
    switch (action) {
      case "list_tasks":
        return this.formatTaskList(parsed, builder);
      case "create_task":
        return this.formatCreatedTask(parsed, builder);
      case "complete_task":
        return this.formatCompletedTask(parsed, builder);
      default:
        return this.formatGenericTask(parsed, builder, action);
    }
  }

  private formatTaskList(parsed: any, builder: UnifiedResponseBuilder): UnifiedToolResponse {
    const tasksData = parsed?.data?.response_data?.items || [];
    
    if (!Array.isArray(tasksData) || tasksData.length === 0) {
      return builder
        .setSuccess(true)
        .setTitle("📋 Tasks")
        .setContent("No tasks found")
        .setMessage("📋 No tasks in your list")
        .build();
    }

    // Transform Google Tasks API data to our schema
    const taskListData: TaskListData = {
      tasks: tasksData.map((task: any) => ({
        id: task.id,
        title: task.title,
        status: task.status || 'needsAction',
        notes: task.notes || '',
        due: task.due,
        completed: task.completed,
        updated: task.updated,
        parent: task.parent,
        position: task.position,
        selfLink: task.selfLink,
        etag: task.etag,
        kind: task.kind,
      })),
      totalCount: tasksData.length,
      completedCount: tasksData.filter((task: any) => task.status === 'completed').length,
      hasMore: false, // Google Tasks API doesn't provide pagination info directly
      listTitle: "My Tasks", // Could extract from list API call
    };

    // Enhanced actions for task list
    const actions: UnifiedAction[] = [
      {
        id: "create_task",
        label: "Create Task",
        type: "primary",
        icon: "➕"
      },
      {
        id: "complete_first",
        label: "Complete First",
        type: "secondary",
        icon: "✅"
      }
    ];

    const content = `Found ${tasksData.length} task${tasksData.length === 1 ? '' : 's'}${taskListData.completedCount > 0 ? ` (${taskListData.completedCount} completed)` : ''}`;

    const result = builder
      .setSuccess(true)
      .setTitle("📋 My Tasks")
      .setSubtitle(`${tasksData.length} task${tasksData.length === 1 ? '' : 's'}`)
      .setContent(content)
      .setMessage(`📋 Task list retrieved\n${content}`)
      .setStructuredData(taskListData)
      .setRawData(parsed)
      .setMetadata({ 
        confidence: 95, 
        source: 'Google Tasks'
      });

    actions.forEach(action => result.addAction(action));
    return result.build();
  }

  private detectActionFromMessage(message: string): string {
    const msg = message.toLowerCase();
    
    if (msg.includes('list') || msg.includes('show') || msg.includes('my tasks')) {
      return "list_tasks";
    }
    if (msg.includes('create') || msg.includes('add')) {
      return "create_task";
    }
    if (msg.includes('complete') || msg.includes('done')) {
      return "complete_task";
    }
    
    return "list_tasks"; // Default to listing
  }
}
```

### Phase 3: ChatService Task Category Detection (10 min)

#### 3.1 Update `ChatService.ts` category detection
```typescript
private detectComponentCategory(response: UnifiedToolResponse): string {
  const { type, data: { structured } } = response;
  
  switch (type) {
    case 'task':
      if (isTaskListData(structured)) {
        return ResponseCategory.TASK_LIST;
      } else if (isTaskData(structured)) {
        return ResponseCategory.TASK_SINGLE;
      } else {
        return ResponseCategory.TASK_SINGLE;
      }
    // ... existing email, calendar cases
  }
}

// Add to ResponseCategory enum
export enum ResponseCategory {
  // ... existing categories
  TASK_SINGLE = 'task_single',
  TASK_LIST = 'task_list',
}
```

#### 3.2 Add task validation functions
```typescript
import { isTaskListData, isTaskData } from '~/types/unified-response.validation';
```

### Phase 4: TaskListComponent Implementation (30 min)

#### 4.1 Create TaskListComponent in `MessageComponents.tsx`
```typescript
import { TasksIcon } from '~/components/icons/ChatIcons';
import { TaskData, TaskListData } from '~/types/chat';

// ✅ Task List Component for multiple tasks
export const TaskListComponent: React.FC<{
  tasks: TaskData[];
  totalCount: number;
  completedCount: number;
  hasMore?: boolean;
  listTitle?: string;
  onAction?: (action: string, data: any) => void;
}> = ({ tasks, totalCount, completedCount, hasMore, listTitle, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const displayTasks = expanded ? tasks : tasks.slice(0, 5);
  const pendingCount = totalCount - completedCount;

  return (
    <View style={styles.taskListContainer}>
      {/* Summary header */}
      <View style={styles.taskSummary}>
        <TasksIcon size={20} />
        <View style={styles.summaryDetails}>
          <Text style={styles.summaryText}>
            {listTitle || 'Tasks'} ({totalCount} total)
          </Text>
          <View style={styles.taskIndicators}>
            {pendingCount > 0 && (
              <Text style={styles.indicator}>⏳ {pendingCount}</Text>
            )}
            {completedCount > 0 && (
              <Text style={styles.indicator}>✅ {completedCount}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Task cards */}
      {displayTasks.map((task, index) => (
        <TaskCard 
          key={task.id || index}
          task={task}
          onAction={onAction}
        />
      ))}

      {/* Expand/collapse toggle */}
      {tasks.length > 5 && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : `Show ${tasks.length - 5} More`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.taskActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onAction?.('create_task', null)}
        >
          <Text style={styles.actionText}>Create Task</Text>
        </TouchableOpacity>
        
        {pendingCount > 0 && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAction?.('complete_first', tasks.find(t => t.status === 'needsAction'))}
          >
            <Text style={styles.actionText}>Complete First</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Individual task card
const TaskCard: React.FC<{
  task: TaskData;
  onAction?: (action: string, data: any) => void;
}> = ({ task, onAction }) => {
  const isCompleted = task.status === 'completed';
  const hasDueDate = !!task.due;
  const isOverdue = hasDueDate && new Date(task.due!) < new Date() && !isCompleted;

  return (
    <TouchableOpacity 
      style={[
        styles.taskCard, 
        isCompleted && styles.completedTask,
        isOverdue && styles.overdueTask
      ]}
      onPress={() => onAction?.('toggle_task', task)}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskStatus}>
          <Text style={styles.statusIcon}>
            {isCompleted ? '✅' : '⏳'}
          </Text>
          <Text style={[
            styles.taskTitle,
            isCompleted && styles.completedTitle
          ]} numberOfLines={2}>
            {task.title}
          </Text>
        </View>
        
        {hasDueDate && (
          <Text style={[
            styles.dueDate,
            isOverdue && styles.overdueDateText
          ]}>
            {isOverdue ? '⚠️' : '📅'} {new Date(task.due!).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      {task.notes && (
        <Text style={styles.taskNotes} numberOfLines={2}>
          {task.notes}
        </Text>
      )}
      
      <View style={styles.taskMeta}>
        <Text style={styles.updatedDate}>
          Updated: {new Date(task.updated).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
```

#### 4.2 Add task styles
```typescript
// Task-specific styles
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
dueDate: {
  fontSize: 12,
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
```

### Phase 5: ChatMessage Integration (10 min)

#### 5.1 Update `ChatMessage.tsx`
```typescript
import { TaskListComponent } from './MessageComponents';
import type { TaskListData } from '~/types/chat';

// Add task detection
const isTaskList = message.metadata?.category === ResponseCategory.TASK_LIST;
const taskListData = isTaskList && message.metadata?.componentData && isTaskListData(message.metadata.componentData) 
  ? message.metadata.componentData 
  : null;

// Add task action handler
const handleTaskAction = (action: string, data: any) => {
  console.log('[ChatMessage] Task action triggered:', action, data);
  if (onTaskAction) {
    onTaskAction(action, data);
  }
};

// Add task list rendering
{isTaskList && taskListData && (
  <TaskListComponent
    tasks={taskListData.tasks}
    totalCount={taskListData.totalCount}
    completedCount={taskListData.completedCount}
    hasMore={taskListData.hasMore}
    listTitle={taskListData.listTitle}
    onAction={handleTaskAction}
  />
)}
```

### Phase 6: Object Structure Utility Refactor (5 min)

#### 6.1 Update `action-planner.ts` to use object-structure utility
```typescript
import { getObjectStructure } from '../utils/object-structure';

// Replace existing getObjectStructure method with import
console.log(`[ActionPlanner] 📋 ACTUAL STEP DATA STRUCTURE:`);
console.log(getObjectStructure(result.data));
```

## Expected Outcome

### Before (Current)
```
AI: "Found 2 tasks."
[Plain text message - no interaction]
```

### After (Enhanced)
```
AI: "Found 2 tasks."

[📋 Tasks] My Tasks (2 total)
                    ⏳ 1  ✅ 1

┌─────────────────────────────────────┐
│ ⏳ Finish project presentation      │
│    Complete slides and practice run │
│    📅 Tomorrow                      │
│    Updated: Dec 15                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ✅ Review email templates           │
│    Updated: Dec 14                  │
└─────────────────────────────────────┘

[Create Task] [Complete First]
```

## Technical Benefits

1. **✅ Rich Task Display**: Visual task cards with status, due dates, notes
2. **✅ Smart Status**: Completed, pending, overdue indicators
3. **✅ Interactive Actions**: Create, complete, toggle task actions
4. **✅ Zod Validation**: Type-safe data flow from API to UI
5. **✅ Consistent Pattern**: Follows email implementation architecture
6. **✅ Extensible**: Easy to add more task features

## Files Modified

1. `omnii_mcp/src/types/unified-response.validation.ts` - Task Zod schemas
2. `omnii_mcp/src/services/plugins/tasks-plugin.ts` - UnifiedToolResponse integration
3. `omnii-mobile/src/services/chat/ChatService.ts` - Task category detection
4. `omnii-mobile/src/components/chat/ChatMessage.tsx` - Task rendering
5. `omnii-mobile/src/components/chat/MessageComponents.tsx` - TaskListComponent
6. `omnii_mcp/src/services/action-planner.ts` - Object structure utility usage

Ready to implement **Google Tasks Structured Data Pipeline**? 

---

# Google Tasks Complete Structured Data Implementation

## Overview
Implement comprehensive Google Tasks data fetching that goes beyond just task lists to fetch actual tasks from each list in parallel, providing a rich combined data structure for the client.

## Current State vs. Target State

### Current State ❌
- Only fetches task lists (containers)
- Client sees: "Found 2 task lists" with basic metadata
- No actual task content visible
- User must manually drill down into each list

### Target State ✅  
- Fetches task lists AND their tasks in parallel
- Client sees: Rich task overview with expandable lists
- Actual task content with due dates, status, notes
- Interactive UI with create, complete, organize actions

## Google Tasks API Structure Analysis

```typescript
// Current Response (LIST_TASK_LISTS)
{
  "kind": "tasks#taskLists",
  "items": [
    {
      "id": "MDI8OTczMDc2NTQ1MDM3OTgyMDc6MDow",
      "title": "My Tasks",
      "updated": "2025-05-30T07:50:09.775Z"
    }
  ]
}

// Target Response (LIST_TASKS per list)
{
  "kind": "tasks#tasks", 
  "items": [
    {
      "id": "task123",
      "title": "Complete project presentation",
      "status": "needsAction",
      "due": "2025-01-20T00:00:00.000Z",
      "notes": "Include Q4 metrics and future roadmap"
    }
  ]
}
```

## Implementation Phases

### Phase 1: Enhanced Combined Schema (15 min)

#### 1.1 Update `unified-response.validation.ts`
```typescript
// ✅ NEW: Combined task lists with their tasks
export const TaskListWithTasksSchema = z.object({
  // Task list metadata
  id: z.string(),
  title: z.string(),
  updated: z.string(),
  selfLink: z.string().optional(),
  etag: z.string().optional(),
  kind: z.string().optional(),
  
  // Tasks within this list
  tasks: z.array(TaskDataSchema),
  taskCount: z.number(),
  completedCount: z.number(),
  pendingCount: z.number(),
  overdueCount: z.number(),
  
  // Fetching metadata
  lastFetched: z.string(),
  fetchSuccess: z.boolean(),
  fetchError: z.string().optional(),
});

// ✅ NEW: Complete task overview with all lists and tasks
export const CompleteTaskOverviewSchema = z.object({
  taskLists: z.array(TaskListWithTasksSchema),
  totalLists: z.number(),
  totalTasks: z.number(),
  totalCompleted: z.number(),
  totalPending: z.number(),
  totalOverdue: z.number(),
  lastSyncTime: z.string(),
  syncSuccess: z.boolean(),
  partialFailures: z.array(z.object({
    listId: z.string(),
    listTitle: z.string(),
    error: z.string(),
  })).optional(),
});

// ✅ INFERRED TYPES
export type TaskListWithTasks = z.infer<typeof TaskListWithTasksSchema>;
export type CompleteTaskOverview = z.infer<typeof CompleteTaskOverviewSchema>;

// ✅ TYPE GUARDS
export function isCompleteTaskOverview(data: any): data is CompleteTaskOverview {
  return CompleteTaskOverviewSchema.safeParse(data).success;
}

export function isTaskListWithTasks(data: any): data is TaskListWithTasks {
  return TaskListWithTasksSchema.safeParse(data).success;
}
```

#### 1.2 Update discriminated union
```typescript
// Update task response to include new combined schema
z.object({
  type: z.literal(ServiceType.TASK),
  success: z.boolean(),
  data: z.object({
    ui: UIDataSchema,
    structured: CompleteTaskOverviewSchema.or(TaskListsDataSchema).or(TaskListDataSchema).or(TaskDataSchema).optional(),
    raw: z.any().optional(),
  }),
  message: z.string(),
  authRequired: z.boolean().optional(),
  authUrl: z.string().optional(),
  timestamp: z.string(),
  id: z.string(),
  userId: z.string(),
}),
```

### Phase 2: Parallel Task Fetching Logic (30 min)

#### 2.1 Update `tasks-plugin.ts` with parallel fetching
```typescript
/**
 * ✅ NEW: Fetch task lists and their tasks in parallel
 */
private async fetchCompleteTaskOverview(
  composio: OpenAIToolSet,
  userId: string,
  builder: UnifiedResponseBuilder
): Promise<UnifiedToolResponse> {
  try {
    console.log(`[TasksPlugin] 🔄 Starting complete task overview fetch`);
    
    // Step 1: Fetch all task lists
    const taskListsResponse = await this.fetchTaskLists(composio, userId);
    const taskLists = taskListsResponse?.data?.response_data?.items || [];
    
    if (!Array.isArray(taskLists) || taskLists.length === 0) {
      return builder
        .setSuccess(true)
        .setTitle("📋 No Task Lists")
        .setContent("No task lists found in your account")
        .setMessage("📋 No task lists found")
        .build();
    }

    console.log(`[TasksPlugin] 📋 Found ${taskLists.length} task lists, fetching tasks in parallel...`);

    // Step 2: Fetch tasks from all lists in parallel
    const taskFetchPromises = taskLists.map(async (taskList: any) => {
      try {
        console.log(`[TasksPlugin] 🔄 Fetching tasks for list: ${taskList.title}`);
        
        const tasksResponse = await this.fetchTasksFromList(composio, userId, taskList.id);
        const tasks = tasksResponse?.data?.response_data?.items || [];
        
        // Calculate task statistics
        const completedCount = tasks.filter((task: any) => task.status === 'completed').length;
        const pendingCount = tasks.filter((task: any) => task.status !== 'completed').length;
        const overdueCount = tasks.filter((task: any) => 
          task.due && new Date(task.due) < new Date() && task.status !== 'completed'
        ).length;

        const taskListWithTasks: TaskListWithTasks = {
          // Task list metadata
          id: taskList.id,
          title: taskList.title,
          updated: taskList.updated,
          selfLink: taskList.selfLink,
          etag: taskList.etag,
          kind: taskList.kind,
          
          // Tasks data
          tasks: tasks.map((task: any) => ({
            id: task.id,
            title: task.title,
            status: task.status || 'needsAction',
            notes: task.notes || '',
            due: task.due,
            completed: task.completed,
            updated: task.updated,
            parent: task.parent,
            position: task.position,
            selfLink: task.selfLink,
            etag: task.etag,
            kind: task.kind,
            links: task.links,
          })),
          
          // Statistics
          taskCount: tasks.length,
          completedCount,
          pendingCount,
          overdueCount,
          
          // Fetch metadata
          lastFetched: new Date().toISOString(),
          fetchSuccess: true,
        };

        console.log(`[TasksPlugin] ✅ Successfully fetched ${tasks.length} tasks from "${taskList.title}"`);
        return taskListWithTasks;
        
      } catch (error) {
        console.error(`[TasksPlugin] ❌ Failed to fetch tasks from "${taskList.title}":`, error);
        
        // Return partial data with error info
        return {
          id: taskList.id,
          title: taskList.title,
          updated: taskList.updated,
          selfLink: taskList.selfLink,
          etag: taskList.etag,
          kind: taskList.kind,
          tasks: [],
          taskCount: 0,
          completedCount: 0,
          pendingCount: 0,
          overdueCount: 0,
          lastFetched: new Date().toISOString(),
          fetchSuccess: false,
          fetchError: error instanceof Error ? error.message : 'Unknown error',
        } as TaskListWithTasks;
      }
    });

    // Step 3: Wait for all parallel fetches to complete
    const taskListsWithTasks = await Promise.all(taskFetchPromises);
    
    // Step 4: Calculate overall statistics
    const totalTasks = taskListsWithTasks.reduce((sum, list) => sum + list.taskCount, 0);
    const totalCompleted = taskListsWithTasks.reduce((sum, list) => sum + list.completedCount, 0);
    const totalPending = taskListsWithTasks.reduce((sum, list) => sum + list.pendingCount, 0);
    const totalOverdue = taskListsWithTasks.reduce((sum, list) => sum + list.overdueCount, 0);
    
    // Collect any partial failures
    const partialFailures = taskListsWithTasks
      .filter(list => !list.fetchSuccess)
      .map(list => ({
        listId: list.id,
        listTitle: list.title,
        error: list.fetchError || 'Unknown error',
      }));

    // Step 5: Build complete overview
    const completeOverview: CompleteTaskOverview = {
      taskLists: taskListsWithTasks,
      totalLists: taskLists.length,
      totalTasks,
      totalCompleted,
      totalPending,
      totalOverdue,
      lastSyncTime: new Date().toISOString(),
      syncSuccess: partialFailures.length === 0,
      partialFailures: partialFailures.length > 0 ? partialFailures : undefined,
    };

    // Step 6: Validate with Zod
    const validationResult = CompleteTaskOverviewSchema.safeParse(completeOverview);
    if (!validationResult.success) {
      console.error(`[TasksPlugin] ❌ Complete overview validation failed:`, validationResult.error);
      return this.formatErrorResponse(builder, "Invalid task overview data structure");
    }

    console.log(`[TasksPlugin] ✅ Complete overview validation successful`);
    console.log(`[TasksPlugin] 📊 Overview stats: ${totalTasks} tasks across ${taskLists.length} lists`);

    // Step 7: Build rich UI response
    const actions: UnifiedAction[] = [
      {
        id: "create_task_in_first",
        label: "Create Task",
        type: "primary",
        icon: "➕"
      },
      {
        id: "complete_overdue",
        label: totalOverdue > 0 ? `Complete ${totalOverdue} Overdue` : "Mark as Done",
        type: "secondary",
        icon: "✅"
      }
    ];

    const content = this.buildOverviewContent(totalTasks, totalCompleted, totalPending, totalOverdue, taskLists.length);

    const result = builder
      .setSuccess(true)
      .setTitle("📋 Complete Task Overview")
      .setSubtitle(`${totalTasks} tasks across ${taskLists.length} lists`)
      .setContent(content)
      .setMessage(`📋 Complete task overview\n${content}`)
      .setStructuredData(validationResult.data)
      .setRawData({ taskLists: taskListsResponse, taskFetches: 'parallel_completed' })
      .setMetadata({ 
        confidence: partialFailures.length === 0 ? 95 : 80, 
        source: 'Google Tasks (Complete)',
        fetchStrategy: 'parallel',
        totalApiCalls: taskLists.length + 1,
      });

    actions.forEach(action => result.addAction(action));
    return result.build();

  } catch (error) {
    console.error(`[TasksPlugin] ❌ Complete overview fetch failed:`, error);
    return this.formatErrorResponse(builder, `Failed to fetch complete task overview: ${error}`);
  }
}

/**
 * ✅ Helper: Fetch task lists using Composio
 */
private async fetchTaskLists(composio: OpenAIToolSet, userId: string) {
  const tools = await composio.getTools({
    actions: [GoogleTasksAction.LIST_TASK_LISTS],
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Get all Google task lists." },
      { role: "user", content: "List all task lists" },
    ],
    tools: tools,
    tool_choice: "auto",
  });

  return await composio.handleToolCall(response, userId);
}

/**
 * ✅ Helper: Fetch tasks from a specific list using Composio
 */
private async fetchTasksFromList(composio: OpenAIToolSet, userId: string, listId: string) {
  const tools = await composio.getTools({
    actions: [GoogleTasksAction.LIST_TASKS],
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `Get all tasks from the specified task list. Use tasklist parameter: ${listId}` },
      { role: "user", content: `Get tasks from list ${listId}` },
    ],
    tools: tools,
    tool_choice: "auto",
  });

  return await composio.handleToolCall(response, userId);
}

/**
 * ✅ Helper: Build overview content string
 */
private buildOverviewContent(totalTasks: number, completed: number, pending: number, overdue: number, listCount: number): string {
  const parts = [`${totalTasks} total tasks across ${listCount} lists`];
  
  if (completed > 0) parts.push(`${completed} completed`);
  if (pending > 0) parts.push(`${pending} pending`);
  if (overdue > 0) parts.push(`${overdue} overdue ⚠️`);
  
  return parts.join(', ');
}
```

#### 2.2 Update main processMessage method
```typescript
/**
 * Process task-specific messages with intelligent fetching strategy
 */
async processMessage(
  message: string,
  userId: string,
  context: ExecutionContextType,
  activeConnection: any,
  composio: OpenAIToolSet,
  openai: OpenAI
): Promise<UnifiedToolResponse> {
  const builder = new UnifiedResponseBuilder(ServiceType.TASK, userId);

  try {
    console.log(`[TasksPlugin] Processing message: "${message}"`);
    
    // ✅ NEW: Intelligent strategy selection
    const strategy = this.determineStrategy(message);
    
    switch (strategy) {
      case 'complete_overview':
        // Fetch task lists AND tasks in parallel
        return await this.fetchCompleteTaskOverview(composio, userId, builder);
        
      case 'task_lists_only':
        // Just fetch task lists (legacy behavior)
        return await this.fetchTaskListsOnly(composio, userId, builder);
        
      case 'specific_action':
        // Handle create/complete/update actions
        return await this.handleSpecificAction(message, composio, userId, builder);
        
      default:
        return await this.fetchCompleteTaskOverview(composio, userId, builder);
    }

  } catch (error) {
    console.error(`[TasksPlugin] Error processing message:`, error);
    return builder
      .setSuccess(false)
      .setTitle("Tasks Error")
      .setContent("Sorry, I had trouble with your task request.")
      .setMessage(error instanceof Error ? error.message : "Unknown error")
      .build();
  }
}

/**
 * ✅ Determine fetching strategy based on user message
 */
private determineStrategy(message: string): 'complete_overview' | 'task_lists_only' | 'specific_action' {
  const msg = message.toLowerCase();
  
  // Complete overview for general requests
  if (msg.includes('tasks') || msg.includes('todo') || msg.includes('show') || msg.includes('list')) {
    return 'complete_overview';
  }
  
  // Specific actions
  if (msg.includes('create') || msg.includes('add') || msg.includes('complete') || msg.includes('update')) {
    return 'specific_action';
  }
  
  // Default to complete overview
  return 'complete_overview';
}
```

### Phase 3: Rich UI Component for Complete Overview (25 min)

#### 3.1 Create `CompleteTaskOverviewComponent` in `MessageComponents.tsx`
```typescript
// ✅ NEW: Complete task overview with all lists and tasks
export const CompleteTaskOverviewComponent: React.FC<{
  overview: CompleteTaskOverview;
  onAction?: (action: string, data: any) => void;
}> = ({ overview, onAction }) => {
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  
  const toggleList = (listId: string) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(listId)) {
      newExpanded.delete(listId);
    } else {
      newExpanded.add(listId);
    }
    setExpandedLists(newExpanded);
  };

  return (
    <View style={styles.completeOverviewContainer}>
      {/* Summary header */}
      <View style={styles.overviewSummary}>
        <TasksIcon size={24} />
        <View style={styles.overviewSummaryDetails}>
          <Text style={styles.overviewTitle}>
            Complete Task Overview
          </Text>
          <View style={styles.overviewStats}>
            <Text style={styles.overviewStat}>📊 {overview.totalTasks} total</Text>
            {overview.totalCompleted > 0 && (
              <Text style={styles.overviewStat}>✅ {overview.totalCompleted}</Text>
            )}
            {overview.totalPending > 0 && (
              <Text style={styles.overviewStat}>⏳ {overview.totalPending}</Text>
            )}
            {overview.totalOverdue > 0 && (
              <Text style={[styles.overviewStat, styles.overdueStats]}>⚠️ {overview.totalOverdue}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Sync status */}
      {!overview.syncSuccess && overview.partialFailures && (
        <View style={styles.syncWarning}>
          <Text style={styles.syncWarningText}>
            ⚠️ Some lists failed to sync: {overview.partialFailures.map(f => f.listTitle).join(', ')}
          </Text>
        </View>
      )}

      {/* Task lists with expandable tasks */}
      {overview.taskLists.map((taskListWithTasks, index) => (
        <TaskListWithTasksCard
          key={taskListWithTasks.id}
          taskListWithTasks={taskListWithTasks}
          isExpanded={expandedLists.has(taskListWithTasks.id)}
          onToggle={() => toggleList(taskListWithTasks.id)}
          onAction={onAction}
        />
      ))}

      {/* Overall actions */}
      <View style={styles.overviewActions}>
        <TouchableOpacity 
          style={styles.primaryActionButton}
          onPress={() => onAction?.('create_task', { listId: overview.taskLists[0]?.id })}
        >
          <Text style={styles.primaryActionText}>➕ Create Task</Text>
        </TouchableOpacity>
        
        {overview.totalOverdue > 0 && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.urgentAction]}
            onPress={() => onAction?.('review_overdue', null)}
          >
            <Text style={styles.actionText}>⚠️ Review {overview.totalOverdue} Overdue</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ✅ Individual task list with expandable tasks
const TaskListWithTasksCard: React.FC<{
  taskListWithTasks: TaskListWithTasks;
  isExpanded: boolean;
  onToggle: () => void;
  onAction?: (action: string, data: any) => void;
}> = ({ taskListWithTasks, isExpanded, onToggle, onAction }) => {
  return (
    <View style={styles.taskListWithTasksCard}>
      {/* List header */}
      <TouchableOpacity 
        style={styles.taskListWithTasksHeader}
        onPress={onToggle}
      >
        <View style={styles.taskListHeaderLeft}>
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
          <Text style={styles.taskListWithTasksTitle}>
            📋 {taskListWithTasks.title}
          </Text>
        </View>
        
        <View style={styles.taskListHeaderRight}>
          <Text style={styles.taskCount}>
            {taskListWithTasks.taskCount} task{taskListWithTasks.taskCount !== 1 ? 's' : ''}
          </Text>
          {taskListWithTasks.overdueCount > 0 && (
            <Text style={styles.overdueCount}>⚠️ {taskListWithTasks.overdueCount}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Fetch error indicator */}
      {!taskListWithTasks.fetchSuccess && (
        <View style={styles.fetchError}>
          <Text style={styles.fetchErrorText}>
            ❌ Failed to load tasks: {taskListWithTasks.fetchError}
          </Text>
        </View>
      )}

      {/* Expandable tasks */}
      {isExpanded && taskListWithTasks.fetchSuccess && (
        <View style={styles.expandedTasksContainer}>
          {taskListWithTasks.tasks.length === 0 ? (
            <Text style={styles.noTasksText}>No tasks in this list</Text>
          ) : (
            taskListWithTasks.tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                onAction={onAction}
              />
            ))
          )}
          
          <TouchableOpacity 
            style={styles.addTaskToListButton}
            onPress={() => onAction?.('create_task_in_list', { listId: taskListWithTasks.id, listTitle: taskListWithTasks.title })}
          >
            <Text style={styles.addTaskToListText}>➕ Add task to "{taskListWithTasks.title}"</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

#### 3.2 Add styles for complete overview
```typescript
// Complete task overview styles
completeOverviewContainer: {
  backgroundColor: AppColors.cardBackground,
  borderRadius: 12,
  padding: 16,
  marginVertical: 8,
  borderWidth: 1,
  borderColor: AppColors.borderLight,
},
overviewSummary: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16,
  gap: 12,
},
overviewSummaryDetails: {
  flex: 1,
},
overviewTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: AppColors.textPrimary,
  marginBottom: 4,
},
overviewStats: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
overviewStat: {
  fontSize: 14,
  color: AppColors.textSecondary,
  fontWeight: '500',
},
overdueStats: {
  color: AppColors.error,
  fontWeight: '600',
},
syncWarning: {
  backgroundColor: `${AppColors.warning}20`,
  padding: 8,
  borderRadius: 6,
  marginBottom: 12,
},
syncWarningText: {
  fontSize: 12,
  color: AppColors.warning,
  fontWeight: '500',
},
taskListWithTasksCard: {
  backgroundColor: AppColors.background,
  borderRadius: 8,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: AppColors.borderLight,
},
taskListWithTasksHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 12,
},
taskListHeaderLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  flex: 1,
},
expandIcon: {
  fontSize: 14,
  color: AppColors.textSecondary,
  fontWeight: '600',
},
taskListWithTasksTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: AppColors.textPrimary,
},
taskListHeaderRight: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
taskCount: {
  fontSize: 12,
  color: AppColors.textSecondary,
  fontWeight: '500',
},
overdueCount: {
  fontSize: 12,
  color: AppColors.error,
  fontWeight: '600',
},
fetchError: {
  backgroundColor: `${AppColors.error}10`,
  padding: 8,
  margin: 8,
  borderRadius: 6,
},
fetchErrorText: {
  fontSize: 12,
  color: AppColors.error,
},
expandedTasksContainer: {
  borderTopWidth: 1,
  borderTopColor: AppColors.borderLight,
  padding: 8,
},
noTasksText: {
  fontSize: 14,
  color: AppColors.textSecondary,
  textAlign: 'center',
  padding: 16,
  fontStyle: 'italic',
},
addTaskToListButton: {
  padding: 8,
  backgroundColor: `${AppColors.aiGradientStart}10`,
  borderRadius: 6,
  marginTop: 8,
  alignItems: 'center',
},
addTaskToListText: {
  fontSize: 14,
  color: AppColors.aiGradientStart,
  fontWeight: '500',
},
overviewActions: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 8,
  marginTop: 16,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: AppColors.borderLight,
},
primaryActionButton: {
  backgroundColor: AppColors.aiGradientStart,
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 8,
  flex: 1,
  alignItems: 'center',
},
primaryActionText: {
  fontSize: 14,
  color: '#FFFFFF',
  fontWeight: '600',
},
urgentAction: {
  backgroundColor: AppColors.warning,
},
```

### Phase 4: ChatMessage Integration (10 min)

#### 4.1 Update `ChatMessage.tsx` to handle complete overview
```typescript
import { CompleteTaskOverviewComponent } from './MessageComponents';
import { isCompleteTaskOverview } from '~/types/unified-response.validation';

// Add complete task overview detection
const isCompleteTaskOverview = message.metadata?.category === ResponseCategory.TASK_COMPLETE_OVERVIEW;
const completeOverviewData = isCompleteTaskOverview && message.metadata?.componentData && isCompleteTaskOverview(message.metadata.componentData) 
  ? message.metadata.componentData 
  : null;

// Add complete overview rendering
{isCompleteTaskOverview && completeOverviewData && (
  <CompleteTaskOverviewComponent
    overview={completeOverviewData}
    onAction={handleTaskAction}
  />
)}
```

#### 4.2 Update `ChatService.ts` category detection
```typescript
// Add to ResponseCategory enum
export enum ResponseCategory {
  // ... existing categories
  TASK_COMPLETE_OVERVIEW = 'task_complete_overview',
}

// Update category detection
private detectComponentCategory(response: UnifiedToolResponse): string {
  const { type, data: { structured } } = response;
  
  switch (type) {
    case 'task':
      if (isCompleteTaskOverview(structured)) {
        return ResponseCategory.TASK_COMPLETE_OVERVIEW;
      } else if (isTaskListsData(structured)) {
        return ResponseCategory.TASK_LISTS;
      } else if (isTaskListData(structured)) {
        return ResponseCategory.TASK_LIST;
      } else {
        return ResponseCategory.TASK_SINGLE;
      }
    // ... other cases
  }
}
```

## Expected Outcome

### Before (Current) ❌
```
AI: "Found 2 task lists"

📋 My Tasks     May 30, 2025
📋 people       Dec 25, 2024

[View Tasks] [Create Task]
```

### After (Enhanced) ✅
```
AI: "Complete task overview: 47 tasks across 2 lists, 12 completed, 35 pending, 3 overdue ⚠️"

📋 Complete Task Overview
📊 47 total  ✅ 12  ⏳ 35  ⚠️ 3

▼ 📋 My Tasks                    42 tasks  ⚠️ 3
   ⏳ Finish project presentation   📅 Tomorrow  
   ⏳ Review Q4 metrics            📅 Today ⚠️
   ✅ Send team updates           
   ⏳ Prepare client demo          📅 Dec 20
   ➕ Add task to "My Tasks"

▶ 📋 people                      5 tasks
   
[➕ Create Task] [⚠️ Review 3 Overdue]
```

## Technical Benefits

1. **🚀 Parallel Performance**: Fetches all task data simultaneously instead of sequential requests
2. **📊 Rich Analytics**: Complete overview with statistics across all lists
3. **⚠️ Smart Prioritization**: Highlights overdue tasks and urgent actions
4. **🔄 Expandable UI**: Drill down into specific lists while maintaining overview
5. **🛡️ Error Resilience**: Partial failures don't break entire response
6. **✅ Type Safety**: Full Zod validation for complex nested data

## API Call Optimization

- **Current**: 1 API call (task lists only)
- **Enhanced**: N+1 API calls (1 for lists + N parallel for tasks)
- **Performance**: All task fetches run in parallel using `Promise.all`
- **Resilience**: Individual failures don't affect other lists

## Implementation Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1** | 15 min | Enhanced Zod schemas for combined data |
| **Phase 2** | 30 min | Parallel fetching logic in TasksPlugin |
| **Phase 3** | 25 min | Rich UI components for complete overview |
| **Phase 4** | 10 min | ChatMessage integration |
| **Total** | **80 min** | **Complete structured task overview** |

Ready to implement **Parallel Task Fetching with Complete Overview**? 