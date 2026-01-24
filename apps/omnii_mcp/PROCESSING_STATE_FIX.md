# Processing State Fix for Chat UI

## Problem
After receiving n8n responses, the chat UI was stuck showing "Processing..." because the mobile app wasn't receiving the proper signal to clear the pending state.

## Root Cause
The mobile app clears the processing state when it receives a message with `sender: 'ai'`. However, the server was sending messages in different formats (`executive_response`, `context_dropdown`, etc.) without the required `sender` field.

## Solution
Updated the enhanced WebSocket handler to send all AI responses in the proper ChatMessage format with:
- `id`: Unique message ID
- `content`: The message text
- `sender: 'ai'`: Critical field that clears the processing state
- `timestamp`: ISO string timestamp
- `type`: Message type (text, unified_tool_response, etc.)
- `metadata`: Additional data in the metadata field

## Changes Made

### 1. Executive Assistant Response
```typescript
// Before: { type: 'executive_response', data: {...} }
// After: { id, content, sender: 'ai', timestamp, type: 'text', metadata: {...} }
```

### 2. Context Dropdown
```typescript
// Before: { type: 'context_dropdown', data: {...} }
// After: { id, content, sender: 'ai', timestamp, type: 'text', metadata: {...} }
```

### 3. n8n Agent Responses
```typescript
// Before: Sending raw unifiedResponse or result
// After: Properly formatted ChatMessage with sender: 'ai'
```

### 4. Removed Processing Complete Signal
The separate "processing_complete" signal is no longer needed since the AI message itself clears the state.

## How It Works Now

1. User sends a message → UI shows "Processing..."
2. Server sends immediate executive response with `sender: 'ai'` → Processing state clears
3. Server sends context dropdown with `sender: 'ai'` → State remains clear
4. Server sends n8n result with `sender: 'ai'` → State remains clear

## Testing
The processing state should now clear immediately when the first AI response is received, preventing the UI from getting stuck.
