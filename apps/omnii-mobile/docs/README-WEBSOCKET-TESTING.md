# WebSocket Chat Testing Guide

## Quick Start

1. **Start your WebSocket backend** on `localhost:8000`

2. **Run the React Native app**:
   ```bash
   npm start
   ```

3. **Navigate to the Chat screen** (either use the WebSocket version or rename files as described below)

4. **Test Panel**: In development mode, you'll see a "🧪 Test Panel" button at the bottom of the chat screen

## Test Panel Features

### Individual Test Buttons
Each button sends a specific WebSocket command:
- **📅 Create Event**: Creates a calendar event tomorrow at 3pm
- **📧 Read Emails**: Fetches latest emails
- **✉️ Send Email**: Sends a test email
- **👤 Add Contact**: Adds Bobby Ross to contacts
- **✅ Create Task**: Creates a review task
- **📋 List Events**: Shows calendar events
- **🔍 Search Contact**: Finds Bobby Ross
- **📝 Draft Email**: Creates an email draft

### Run All Tests
The "🚀 Run All Tests" button executes all 8 test scenarios sequentially with 2-second delays between each.

## Using the Test Panel

1. **Expand the panel**: Click "🧪 Test Panel" to show all test options
2. **Check connection**: Look for the green indicator showing "Connected"
3. **Run a test**: Click any test button to send that specific command
4. **Monitor responses**: Watch the chat interface for AI responses
5. **OAuth handling**: If a command requires OAuth, you'll be redirected to authenticate

## Test Configuration

The test panel uses a hardcoded test user ID for development:
- **Test User ID**: `ad75381f-4145-465d-9790-d25c96ae9a0d`
- **Test Email**: `edenchan717@gmail.com`

This user must have valid Google OAuth tokens in your Supabase database.

## Switching Between Mock and WebSocket Chat

### Option A: Replace the existing chat screen
```bash
# Backup original
mv app/(tabs)/chat.tsx app/(tabs)/chat-mock.tsx

# Use WebSocket version
mv app/(tabs)/chat-websocket.tsx app/(tabs)/chat.tsx
```

### Option B: Keep both versions
Keep both files and manually navigate to `/chat-websocket` in your app.

## Debugging

1. **Check WebSocket connection**: The status indicator shows connection state
2. **View console logs**: Run with `npx react-native log-ios` or `log-android`
3. **Network issues**: Ensure your backend is running on `ws://localhost:8000/ws`
4. **OAuth errors**: Verify the test user has valid Google tokens in Supabase

## Production Notes

- The test panel only appears in development mode (`__DEV__`)
- In production, remove the hardcoded test user ID from `useChat.ts`
- Update the WebSocket URL in your environment variables