# WebSocket Response Display Implementation Plan

## Overview
This plan details how to properly display various WebSocket response types in the chat UI, including OAuth flows, action results, and error handling.

## Current State
- ✅ WebSocket connection established
- ✅ Messages sent successfully
- ✅ Basic text responses displayed
- ❌ OAuth flow responses need special handling
- ❌ Rich action results need formatting
- ❌ Error states need better visualization

## Response Types to Handle

### 1. OAuth Required Response
```json
{
  "status": "success",
  "data": {
    "requiresAuth": true,
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "message": "Authorization required to access Gmail",
    "action": "oauth_required"
  }
}
```

### 2. Action Success Response
```json
{
  "status": "success",
  "data": {
    "message": "Event created successfully",
    "success": true,
    "metadata": {
      "eventId": "abc123",
      "eventLink": "https://calendar.google.com/event?id=abc123",
      "startTime": "2024-01-15T15:00:00Z"
    }
  }
}
```

### 3. List/Query Response
```json
{
  "status": "success",
  "data": {
    "message": "Found 3 upcoming events",
    "items": [
      { "title": "Team Meeting", "time": "2:00 PM" },
      { "title": "Code Review", "time": "3:30 PM" }
    ]
  }
}
```

### 4. Error Response
```json
{
  "status": "error",
  "data": {
    "error": "Failed to send email",
    "message": "Invalid recipient address"
  }
}
```

## Implementation Steps

### Step 1: Enhance Message Type System

```typescript
// src/types/chat.ts
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  type: 'text' | 'oauth' | 'action' | 'list' | 'error';
  
  // OAuth specific
  authUrl?: string;
  authAction?: string;
  
  // Action specific
  actionType?: string;
  actionResult?: {
    success: boolean;
    metadata?: Record<string, any>;
  };
  
  // List specific
  items?: Array<{
    title: string;
    description?: string;
    metadata?: Record<string, any>;
  }>;
  
  // Error specific
  errorCode?: string;
  errorDetails?: string;
}
```

### Step 2: Update Response Transformer

```typescript
// src/services/chat/ChatService.ts
private transformResponse(response: WebSocketResponse): ChatMessage {
  const baseMessage = {
    id: Date.now().toString(),
    sender: 'ai' as const,
    timestamp: new Date().toISOString(),
  };

  // OAuth required
  if (response.data.requiresAuth) {
    return {
      ...baseMessage,
      type: 'oauth',
      content: response.data.message || 'Authorization required',
      authUrl: response.data.authUrl,
      authAction: response.data.action,
    };
  }

  // Error response
  if (response.status === 'error') {
    return {
      ...baseMessage,
      type: 'error',
      content: response.data.message || response.data.error,
      errorCode: response.data.code,
      errorDetails: response.data.details,
    };
  }

  // List response (has items array)
  if (response.data.items && Array.isArray(response.data.items)) {
    return {
      ...baseMessage,
      type: 'list',
      content: response.data.message,
      items: response.data.items,
    };
  }

  // Action response (has metadata)
  if (response.data.metadata) {
    return {
      ...baseMessage,
      type: 'action',
      content: response.data.message,
      actionResult: {
        success: response.data.success,
        metadata: response.data.metadata,
      },
    };
  }

  // Default text response
  return {
    ...baseMessage,
    type: 'text',
    content: response.data.message || 'Action completed',
  };
}
```

### Step 3: Create Specialized Message Components

#### OAuth Message Component
```typescript
// src/components/chat/messages/OAuthMessage.tsx
export function OAuthMessage({ message }: { message: ChatMessage }) {
  const handleAuthorize = async () => {
    if (message.authUrl) {
      await WebBrowser.openAuthSessionAsync(
        message.authUrl,
        Linking.createURL('oauth-callback')
      );
    }
  };

  return (
    <View style={styles.oauthCard}>
      <Icon name="lock" size={24} color={AppColors.warning} />
      <Text style={styles.oauthText}>{message.content}</Text>
      <TouchableOpacity style={styles.authorizeButton} onPress={handleAuthorize}>
        <Text style={styles.authorizeText}>Authorize Access</Text>
      </TouchableOpacity>
    </View>
  );
}
```

#### Action Result Message
```typescript
// src/components/chat/messages/ActionMessage.tsx
export function ActionMessage({ message }: { message: ChatMessage }) {
  const { success, metadata } = message.actionResult || {};
  
  return (
    <View style={[styles.actionCard, success ? styles.success : styles.error]}>
      <Icon name={success ? "check-circle" : "x-circle"} />
      <Text style={styles.actionText}>{message.content}</Text>
      
      {metadata?.eventLink && (
        <TouchableOpacity onPress={() => Linking.openURL(metadata.eventLink)}>
          <Text style={styles.linkText}>View in Calendar →</Text>
        </TouchableOpacity>
      )}
      
      {metadata && (
        <View style={styles.metadataContainer}>
          {Object.entries(metadata).map(([key, value]) => (
            <Text key={key} style={styles.metadataText}>
              {key}: {value}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
```

#### List Message Component
```typescript
// src/components/chat/messages/ListMessage.tsx
export function ListMessage({ message }: { message: ChatMessage }) {
  return (
    <View style={styles.listCard}>
      <Text style={styles.listTitle}>{message.content}</Text>
      <View style={styles.itemsContainer}>
        {message.items?.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
```

### Step 4: Update ChatMessage Component

```typescript
// src/components/chat/ChatMessage.tsx
import { OAuthMessage } from './messages/OAuthMessage';
import { ActionMessage } from './messages/ActionMessage';
import { ListMessage } from './messages/ListMessage';
import { ErrorMessage } from './messages/ErrorMessage';

export function ChatMessage({ message }: ChatMessageProps) {
  const renderMessageContent = () => {
    switch (message.type) {
      case 'oauth':
        return <OAuthMessage message={message} />;
      case 'action':
        return <ActionMessage message={message} />;
      case 'list':
        return <ListMessage message={message} />;
      case 'error':
        return <ErrorMessage message={message} />;
      default:
        return <TextMessage message={message} />;
    }
  };

  return (
    <View style={[
      styles.container,
      message.sender === 'user' ? styles.userContainer : styles.aiContainer
    ]}>
      {renderMessageContent()}
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
}
```

### Step 5: Add Interactive Elements

#### Quick Actions from Responses
```typescript
// When AI suggests actions, make them clickable
const QuickActionChips = ({ actions }: { actions: string[] }) => (
  <View style={styles.quickActions}>
    {actions.map((action, index) => (
      <TouchableOpacity
        key={index}
        style={styles.actionChip}
        onPress={() => sendMessage(action)}
      >
        <Text style={styles.actionChipText}>{action}</Text>
      </TouchableOpacity>
    ))}
  </View>
);
```

### Step 6: Handle Loading States

```typescript
// Show skeleton while waiting for OAuth
const OAuthLoadingState = () => (
  <View style={styles.loadingCard}>
    <ActivityIndicator color={AppColors.primary} />
    <Text style={styles.loadingText}>Waiting for authorization...</Text>
  </View>
);
```

### Step 7: Error Recovery UI

```typescript
// Retry failed actions
const ErrorRecovery = ({ message, onRetry }: Props) => (
  <View style={styles.errorCard}>
    <Text style={styles.errorText}>{message.content}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);
```

## Visual Design Guidelines

### Color Coding
- **OAuth Required**: Orange/Warning colors (#FFA500)
- **Success Actions**: Green (#4CAF50)
- **Errors**: Red (#F44336)
- **Lists/Info**: Blue (#2196F3)

### Icons
- 🔐 OAuth/Authentication
- ✅ Success
- ❌ Error
- 📋 Lists
- 📅 Calendar events
- ✉️ Email actions
- 👤 Contact actions

### Animations
- Slide-in for new messages
- Pulse for OAuth buttons
- Fade for error messages
- Expand/collapse for lists

## Testing Scenarios

1. **OAuth Flow**
   - Send: "list my calendar events"
   - Expect: OAuth card with authorize button
   - Action: Click authorize, complete flow
   - Result: Events list displayed

2. **Action Success**
   - Send: "create event tomorrow at 3pm"
   - Expect: Success card with event details
   - Action: Click "View in Calendar" link

3. **Error Handling**
   - Send: Invalid command
   - Expect: Error card with retry option

4. **List Display**
   - Send: "show my emails"
   - Expect: Formatted list of emails

## Performance Considerations

1. **Lazy Loading**
   - Load message components on demand
   - Virtualize long lists

2. **Caching**
   - Cache OAuth tokens
   - Store successful action results

3. **Optimistic Updates**
   - Show pending state immediately
   - Update on response

## Accessibility

1. **Screen Readers**
   - Proper labels for all actions
   - Announce new messages

2. **Color Blind Support**
   - Use icons with colors
   - Text indicators for states

## Next Steps

1. Implement specialized message components
2. Add interactive elements
3. Test with real WebSocket responses
4. Add animations and transitions
5. Implement error recovery flows