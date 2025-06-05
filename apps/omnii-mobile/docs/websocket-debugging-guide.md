# WebSocket Debugging Guide

## Current Issue
You're only seeing "pong" messages instead of actual API responses. Here's what's happening and how to fix it.

## What We Fixed

### 1. Enhanced Message Logging
- Added comprehensive logging to see ALL WebSocket messages
- The ChatService now logs raw messages to help debug what's coming from the server

### 2. Added Progress Indicators
- Created `PendingMessage` component that shows while waiting for API responses
- Shows animated progress bar and status text
- Automatically clears when response is received

### 3. Better Message Handling
- Fixed ChatService to handle multiple message formats
- Added fallback for unrecognized message types
- Display raw response data in chat messages for debugging

### 4. Connection Error Display
- Added `ConnectionError` component for better error visibility
- Shows retry button and debug information

## How to Debug

### 1. Check Console Logs
Look for these log messages:
```
[ChatService] Raw WebSocket message: {...}
[ChatService] Sending message: {...}
```

### 2. Verify WebSocket Server
The app expects a WebSocket server at `ws://localhost:8000/ws`

Test with the mock server:
```bash
node ws-mock.js
```

Or use the test server:
```bash
node ws-test-server.js
```

### 3. Test Client
Run the test client to see what messages should look like:
```bash
node test-ws-client.js
```

## Expected Message Flow

1. **User sends message**
   - Shows user message bubble
   - Shows PendingMessage component with progress

2. **Server processes request**
   - Server should send acknowledgment
   - Then send actual response with type: 'RESPONSE'

3. **App displays response**
   - PendingMessage disappears
   - AI message bubble appears with response
   - Raw response data shown in expandable section

## Common Issues

### Only Seeing Pongs
- The server might only be responding to PING messages
- Check if the server is handling COMMAND messages properly

### No Progress Indicator
- The PendingMessage should appear after sending
- Check if `pendingAction` state is being set

### Messages Not Displaying
- Check if messages have correct structure
- Look for console errors about message parsing

## Message Structure

The app expects responses like:
```json
{
  "type": "RESPONSE",
  "status": "SUCCESS",
  "data": {
    "message": "Response text here",
    "metadata": {
      "source": "Google Calendar API",
      "reasoning": "Why this action was taken",
      "confidence": 95
    }
  }
}
```

## Next Steps

1. Run the app and check console logs
2. Verify the WebSocket server is sending correct message format
3. Use the test client to simulate messages
4. Check if the server URL matches your setup