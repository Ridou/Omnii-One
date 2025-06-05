# Server-Side Parsing Implementation Plan

## 🎯 Overview

This document outlines the implementation of server-side parsing for tool responses, moving complex parsing logic from the client to the server for better maintainability and consistency.

## 🏗️ Architecture Changes

### Before: Client-Side Parsing
```
Server Plugin → Raw Tool Response → Client → ResponseParser → UI Components
```

### After: Server-Side Parsing
```
Server Plugin → UnifiedToolResponse (UI-Ready) → Client → Direct Display
```

## 📋 Implementation Status

### ✅ Completed

1. **Unified Response Types** (`omnii_mcp/src/types/unified-response.types.ts`)
   - Created `UnifiedToolResponse` interface
   - Added `UnifiedResponseBuilder` class
   - Defined structured data types for Email, Calendar, Contact, Task
   - Built action definitions for UI interactions

2. **Email Plugin Updates** (`omnii_mcp/src/services/plugins/email-plugin.ts`)
   - ✅ Updated to return `UnifiedToolResponse`
   - ✅ Server-side parsing for sent emails, drafts, fetched emails
   - ✅ Action buttons (Reply, Forward, Send Draft, etc.)
   - ✅ Structured email data with attachments, threading
   - ✅ Fixed TypeScript linting errors

3. **ChatService Updates** (`omnii-mobile/src/services/chat/ChatService.ts`)
   - ✅ Added `UnifiedToolResponse` detection
   - ✅ New `handleUnifiedToolResponse()` method
   - ✅ Simplified response processing
   - ✅ Removed complex client-side categorization logic
   - ✅ Direct consumption of server-formatted data

### 🚧 In Progress

4. **Remaining Plugins** (Need to be updated)
   - ⏳ Calendar Plugin (`calendar-plugin.ts`)
   - ⏳ Contacts Plugin (`contacts-plugin.ts`) 
   - ⏳ Tasks Plugin (`tasks-plugin.ts`)

5. **Client Cleanup** (Partially complete)
   - ⏳ Remove client-side `ResponseParser.ts`
   - ⏳ Update chat.tsx to use server responses
   - ⏳ Remove component building logic from client

### 🔜 Next Steps

6. **UnifiedGoogleManager Updates**
   - Update return types to `UnifiedToolResponse`
   - Ensure consistent response format across all plugins

7. **WebSocket Handler Updates**
   - Ensure proper routing of `UnifiedToolResponse`
   - Update response formatting in websocket handler

## 🔧 Technical Details

### UnifiedToolResponse Structure

```typescript
interface UnifiedToolResponse {
  type: 'email' | 'calendar' | 'contact' | 'task' | 'general';
  success: boolean;
  
  data: {
    ui: {
      title: string;           // "✅ Email Sent"
      subtitle?: string;       // "to john@example.com"
      content: string;         // Formatted content for display
      icon: string;           // "📧"
      actions: UnifiedAction[]; // [{ id: "reply", label: "Reply", ... }]
      metadata: {
        category: string;
        confidence: number;
        timestamp: string;
        source?: string;
      };
    };
    structured?: EmailData | CalendarData | ContactData | TaskData;
    raw?: any; // Original tool response for debugging
  };
  
  message: string;           // Fallback text message
  authRequired?: boolean;
  authUrl?: string;
  timestamp: string;
  id: string;
  userId: string;
}
```

### Server-Side Benefits

1. **Consistency**: All formatting logic centralized on server
2. **Performance**: Client receives pre-processed, UI-ready data
3. **Maintainability**: Single place to update parsing logic
4. **Debugging**: Raw responses included for troubleshooting
5. **Type Safety**: Structured data types ensure consistency

### Client Simplification

The client now simply:
1. Detects `UnifiedToolResponse` format
2. Extracts pre-formatted UI data
3. Displays content directly
4. Handles action buttons with server-provided commands

## 📝 Example Usage

### Server (Email Plugin)
```typescript
const builder = new UnifiedResponseBuilder('email', userId);

return builder
  .setSuccess(true)
  .setTitle("✅ Email Sent")
  .setSubtitle(`to ${recipient}`)
  .setContent(`"${subject}" sent successfully`)
  .addAction({
    id: "view_sent",
    label: "View in Gmail", 
    type: "secondary",
    icon: "🔗"
  })
  .setStructuredData(emailData)
  .build();
```

### Client (ChatService)
```typescript
if (this.isUnifiedToolResponse(data)) {
  const chatMessage = this.transformUnifiedResponse(data);
  // chatMessage.content = "📧 ✅ Email Sent\nto john@example.com\n\n..."
  this.emit('message', chatMessage);
}
```

## 🔄 Migration Steps

### For Each Plugin:

1. **Import unified types**:
   ```typescript
   import { UnifiedResponseBuilder, UnifiedToolResponse } from '../types/unified-response.types';
   ```

2. **Update processMessage return type**:
   ```typescript
   async processMessage(...): Promise<UnifiedToolResponse>
   ```

3. **Replace formatting logic**:
   ```typescript
   const builder = new UnifiedResponseBuilder(type, userId);
   return builder.setTitle(...).setContent(...).build();
   ```

4. **Add action buttons**:
   ```typescript
   builder.addAction({
     id: "reply",
     label: "Reply",
     type: "primary",
     command: "reply to email"
   });
   ```

### For Client:

1. **Remove ResponseParser.ts** - No longer needed
2. **Update chat.tsx** - Remove tool call handlers
3. **Simplify message rendering** - Use server content directly

## 🎯 Success Metrics

- ✅ Consistent response format across all plugins
- ✅ Reduced client-side parsing complexity
- ✅ Improved maintainability and debugging
- ✅ Better type safety throughout system
- ✅ Faster client rendering (pre-processed data)

## 🚀 Benefits Realized

1. **Unified Format**: All tool responses follow same structure
2. **Server Intelligence**: Complex parsing logic lives where data originates
3. **Client Simplicity**: UI components just display pre-formatted content
4. **Better UX**: Consistent action buttons and interactions
5. **Easier Testing**: Server responses are predictable and structured
6. **Future-Proof**: Easy to add new plugins following same pattern

The architecture now cleanly separates concerns: server handles data processing and formatting, client handles presentation and user interaction. 