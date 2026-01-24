# Composio Google Tasks Implementation

## Overview
This document describes the Google Tasks integration implemented using the Composio SDK. The implementation provides a complete API for managing Google Tasks and Task Lists through OAuth2 authentication.

## Architecture

### Connection Manager
A shared `ComposioConnectionManager` class handles OAuth connections for all Composio services:
- Manages OAuth2 flow initiation
- Validates active connections
- Handles connection lifecycle
- Supports multiple Google services (Calendar, Tasks, Gmail, etc.)

### Service Structure
- **ComposioGoogleTasksService**: Core service handling all Google Tasks operations
- **Types**: Strongly typed interfaces for Tasks, Task Lists, and operations
- **Routes**: RESTful API endpoints for all operations
- **Error Handling**: Custom error classes for different failure scenarios

## API Endpoints

### Connection Management
- `POST /api/composio/tasks/connect/:entityId` - Initiate OAuth connection
- `GET /api/composio/tasks/status/:entityId` - Check connection status
- `GET /api/composio/tasks/callback` - OAuth callback handler

### Task List Operations
- `GET /api/composio/tasks/:entityId/tasklists` - List all task lists
- `GET /api/composio/tasks/:entityId/tasklists/:taskListId` - Get specific task list
- `POST /api/composio/tasks/:entityId/tasklists` - Create new task list
- `PUT /api/composio/tasks/:entityId/tasklists/:taskListId` - Update task list
- `DELETE /api/composio/tasks/:entityId/tasklists/:taskListId` - Delete task list

### Task Operations
- `GET /api/composio/tasks/:entityId/tasklists/:taskListId/tasks` - List tasks
- `GET /api/composio/tasks/:entityId/tasklists/:taskListId/tasks/:taskId` - Get specific task
- `POST /api/composio/tasks/:entityId/tasklists/:taskListId/tasks` - Create new task
- `PUT /api/composio/tasks/:entityId/tasklists/:taskListId/tasks/:taskId` - Update task
- `DELETE /api/composio/tasks/:entityId/tasklists/:taskListId/tasks/:taskId` - Delete task
- `POST /api/composio/tasks/:entityId/tasklists/:taskListId/tasks/:taskId/move` - Move task
- `POST /api/composio/tasks/:entityId/tasklists/:taskListId/clear` - Clear completed tasks

## Usage Examples

### 1. Initialize Connection
```javascript
const response = await axios.post('/api/composio/tasks/connect/user@example.com', {
  redirectUrl: 'https://yourapp.com/callback/success'
});

// Redirect user to OAuth flow
window.location.href = response.data.redirectUrl;
```

### 2. Create a Task List
```javascript
const taskList = await axios.post('/api/composio/tasks/user@example.com/tasklists', {
  title: 'My Project Tasks'
});
```

### 3. Create a Task
```javascript
const task = await axios.post('/api/composio/tasks/user@example.com/tasklists/@default/tasks', {
  title: 'Complete documentation',
  notes: 'Add usage examples and API reference',
  due: '2024-12-31T23:59:59Z',
  status: 'needsAction'
});
```

### 4. Update Task Status
```javascript
const updatedTask = await axios.put(
  '/api/composio/tasks/user@example.com/tasklists/@default/tasks/taskId123',
  {
    status: 'completed',
    completed: new Date().toISOString()
  }
);
```

### 5. List Tasks with Filters
```javascript
const tasks = await axios.get('/api/composio/tasks/user@example.com/tasklists/@default/tasks', {
  params: {
    showCompleted: true,
    dueMin: '2024-01-01T00:00:00Z',
    dueMax: '2024-12-31T23:59:59Z',
    maxResults: 50
  }
});
// ```ygp

## Error Handling

The service implements three custom error types:
- `ComposioTasksConnectionError`: OAuth/connection issues
- `ComposioTasksRateLimitError`: API rate limit exceeded
- `ComposioTasksError`: General task operation errors

Example error response:
```json
{
  "error": "No active Google Tasks connection found",
  "code": "CONNECTION_ERROR",
  "entityId": "user@example.com"
}
```

## Testing

Run the test suite:
```bash
node tests/composio-googletasks.test.js
```

The test suite includes:
- Connection status verification
- OAuth flow initiation
- CRUD operations for task lists
- CRUD operations for tasks
- Task movement and completion

## Environment Variables

Required:
- `COMPOSIO_API_KEY`: Your Composio API key
- `COMPOSIO_REDIRECT_URL`: Default OAuth callback URL (optional)

## Custom Actions

Create custom Google Tasks actions:
```javascript
const customAction = await tasksService.createCustomAction({
  actionName: "batch_complete_tasks",
  description: "Mark multiple tasks as completed",
  inputParams: z.object({
    taskIds: z.array(z.string()),
    taskListId: z.string()
  }),
  callback: async (inputParams, authCredentials, executeRequest) => {
    // Custom implementation
  }
});
```

## Best Practices

1. **Entity IDs**: Use consistent entity IDs (e.g., user email) across your application
2. **Error Handling**: Always handle connection errors gracefully
3. **Rate Limiting**: Implement retry logic for rate limit errors
4. **Task Lists**: Use `@default` for the default task list
5. **Dates**: Use ISO 8601 format for all date/time fields

## Security Considerations

- Never expose the Composio API key to the client
- Validate entity IDs on the server side
- Implement proper access control for multi-user scenarios
- Use HTTPS in production for OAuth callbacks