# WebSocket Testing Checklist

## Current Status
Based on your server logs, we can see:
- ✅ Client connects successfully
- ✅ Ping messages are being sent (type: 'ping')
- ❌ Command messages are NOT appearing in server logs
- ❌ Only seeing "pong" responses in the UI

## Quick Test Steps

### 1. Run Debug Server (Port 8001)
```bash
node ws-debug-server.js
```

### 2. Update Client to Use Debug Server (Temporarily)
In `src/hooks/useChat.ts`, change line 34:
```javascript
const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8001/ws';
```

### 3. Test Flow
1. Open the app
2. Go to Chat tab
3. Open Test Panel
4. Click "Create Event"
5. Check both:
   - Browser/App console for `[ChatService]` logs
   - Terminal for server logs

## What to Look For

### Client Console (Browser/App)
```
[useChat] Sending message: create event tomorrow at 3pm titled WebSocket Testing
[ChatService] Sending message: {
  "type": "command",
  "payload": {
    "commandType": "text_command",
    "message": "create event tomorrow at 3pm titled WebSocket Testing",
    ...
  }
}
[ChatService] Raw WebSocket message: ...
```

### Server Console
```
📨 RAW MESSAGE RECEIVED:
   Message type: command
   Has payload? true
```

## Common Issues

### Issue 1: Messages Not Reaching Server
- Check if WebSocket is actually connected
- Verify the URL matches (ws://localhost:8000/ws)
- Check for CORS or network issues

### Issue 2: Wrong Message Format
- The server expects type: 'command' (lowercase)
- The client sends type: 'command' via WebSocketMessageType.COMMAND

### Issue 3: Response Not Displayed
- Server sends type: 'response' with data.message
- Client expects this format in ChatService.handleMessage()

## The Fix
Your test server is correctly set up to handle:
1. type: 'ping' → responds with pong
2. type: 'command' → processes and responds

The issue seems to be that command messages aren't reaching the server at all.