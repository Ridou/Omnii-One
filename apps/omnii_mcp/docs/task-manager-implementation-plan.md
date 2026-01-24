# Task Manager Implementation Plan

## Overview

Create a simplified Google Tasks manager similar to `calendar-manager.ts` that handles task operations through SMS AI interface.

## Architecture Pattern

Follow the successful `calendar-manager.ts` pattern:

- Direct OpenAI + Composio integration
- No complex abstraction layers
- Simple OAuth connection management
- Direct SMS responses via Twilio

### Task List Operations

- `GOOGLETASKS_LIST_TASK_LISTS` - List all task lists
- `GOOGLETASKS_GET_TASK_LIST` - Get specific task list
- `GOOGLETASKS_CREATE_TASK_LIST` - Create new task list
- `GOOGLETASKS_PATCH_TASK_LIST` - Update task list
- `GOOGLETASKS_DELETE_TASK_LIST` - Delete task list

### Task Operations

- `GOOGLETASKS_LIST_TASKS` - List tasks in a task list
- `GOOGLETASKS_GET_TASK` - Get specific task
- `GOOGLETASKS_INSERT_TASK` - Create new task
- `GOOGLETASKS_PATCH_TASK` - Update existing task
- `GOOGLETASKS_DELETE_TASK` - Delete task
- `GOOGLETASKS_CLEAR_TASKS` - Clear completed tasks

## Enum Implementation Strategy

### 1. App Names Enum

```typescript
export enum ComposioApp {
  GOOGLE_CALENDAR = "googlecalendar",
  GOOGLE_TASKS = "googletasks",
  GMAIL = "gmail",
  SLACK = "slack",
}
```

### 2. Connection Status Enum

```typescript
export enum ConnectionStatus {
  ACTIVE = "active",
  INITIATED = "initiated",
  FAILED = "failed",
  EXPIRED = "expired",
}
```

### 3. Integration IDs Enum

```typescript
export enum IntegrationId {
  GOOGLE_CALENDAR = "6bdc82b8-303c-4142-a0a0-2d09c9d50d8c",
  GOOGLE_TASKS = "0e31d0bb-cf27-49d9-9ff1-83bab06829df",
}
```

### 4. Google Tasks Actions Enum

```typescript
export enum GoogleTasksAction {
  LIST_TASK_LISTS = "GOOGLETASKS_LIST_TASK_LISTS",
  GET_TASK_LIST = "GOOGLETASKS_GET_TASK_LIST",
  CREATE_TASK_LIST = "GOOGLETASKS_CREATE_TASK_LIST",
  PATCH_TASK_LIST = "GOOGLETASKS_PATCH_TASK_LIST",
  DELETE_TASK_LIST = "GOOGLETASKS_DELETE_TASK_LIST",
  LIST_TASKS = "GOOGLETASKS_LIST_TASKS",
  GET_TASK = "GOOGLETASKS_GET_TASK",
  INSERT_TASK = "GOOGLETASKS_INSERT_TASK",
  PATCH_TASK = "GOOGLETASKS_PATCH_TASK",
  DELETE_TASK = "GOOGLETASKS_DELETE_TASK",
  CLEAR_TASKS = "GOOGLETASKS_CLEAR_TASKS",
}
```

### 5. Task Status Enum

```typescript
export enum TaskStatus {
  NEEDS_ACTION = "needsAction",
  COMPLETED = "completed",
}
```

## Implementation Plan

### Phase 1: Create Enums and Types

1. Create `src/types/composio-enums.ts` with all enums
2. Update existing types to use enums
3. Create simplified task interfaces

### Phase 2: Build TaskManager Class

1. Create `src/services/task-manager.ts`
2. Follow `calendar-manager.ts` pattern:
   - Constructor with OpenAI + Composio setup
   - Connection validation methods
   - OAuth setup methods
   - Task operation methods

### Phase 3: Core Task Operations

1. `isTaskMessage()` - Detect task-related messages
2. `isListTasksMessage()` - Detect list requests
3. `listTasks()` - List user tasks with formatting
4. `processTaskOperation()` - Handle task creation/updates
5. `getUserConnections()` - Get user connections
6. `setupOAuthConnection()` - Handle OAuth flow

### Phase 4: SMS Integration

1. Add task detection to `SimpleSMSAI`
2. Route task messages to `TaskManager`
3. Format task responses for SMS
4. Handle task creation via natural language

### Phase 5: Natural Language Processing

Support commands like:

- "Add task: Buy groceries"
- "List my tasks"
- "Mark task as done: Buy groceries"
- "Create task list: Work Projects"
- "Show completed tasks"

## Key Features

### Task Listing

- Show active tasks with due dates
- Separate completed vs pending tasks
- Support multiple task lists
- Timezone-aware due date display

### Task Creation

- Natural language parsing
- Due date extraction ("tomorrow", "next week")
- Task list assignment
- Notes/description support

### Task Management

- Mark tasks complete/incomplete
- Update task details
- Move tasks between lists
- Delete tasks

### OAuth Connection

- Use Integration ID: `0e31d0bb-cf27-49d9-9ff1-83bab06829df`
- Phone-to-email entity mapping
- Connection status checking
- Fresh OAuth link generation

## File Structure

```
src/
├── types/
│   ├── composio-enums.ts (NEW)
│   └── task-manager.types.ts (NEW)
├── services/
│   ├── task-manager.ts (NEW)
│   ├── calendar-manager.ts (EXISTING)
│   └── sms-ai-simple.ts (UPDATE)
└── routes/
    └── sms-routes.ts (UPDATE)
```

## Integration Points

### With SMS AI

```typescript
// In SimpleSMSAI.processMessage()
if (this.taskManager.isTaskMessage(message)) {
  if (this.taskManager.isListTasksMessage(message)) {
    return await this.taskManager.listTasks(
      entityId,
      userTimezone,
      phoneNumber
    );
  } else {
    return await this.taskManager.processTaskOperation(
      message,
      phoneNumber,
      entityId,
      userTimezone
    );
  }
}
```

### With Timezone Manager

- Use existing timezone detection
- Format due dates in user timezone
- Handle relative dates ("tomorrow", "next week")

## Success Metrics

- ✅ OAuth authentication working
- ✅ Task listing with proper formatting
- ✅ Task creation via natural language
- ✅ Task completion/updates
- ✅ Multiple task list support
- ✅ SMS delivery reliability
- ✅ Enum usage throughout codebase

## Implementation Priority

1. **High**: Basic task listing and creation
2. **Medium**: Task completion and updates
3. **Low**: Advanced features (task lists, moving tasks)

This plan follows the proven `calendar-manager.ts` pattern while adding comprehensive enum usage and Google Tasks functionality.
