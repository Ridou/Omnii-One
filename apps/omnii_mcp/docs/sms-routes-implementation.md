# SMS Routes Implementation Plan

## Overview
Refactor the SMS messaging functionality into a clean Express route structure, focusing on:
- Receiving incoming SMS via Twilio webhook
- Sending SMS messages
- Following the same patterns as neo4j-api.ts

## File Structure
```
src/
  routes/
    sms-routes.ts       # New file for SMS routes
    neo4j-api.ts        # Reference for structure
  services/
    twilio-service.ts   # New service for Twilio operations
  types/
    sms.d.ts            # Type definitions for SMS
```

## Implementation Steps

### 1. Create Types (types/sms.d.ts)
- Define interfaces for:
  - Webhook payload
  - Send message params
  - Response types
  - Error types

### 2. Create Twilio Service (services/twilio-service.ts)
- Initialize Twilio client
- Implement methods:
  - `sendMessage(params)`: Send SMS
  - `validateWebhook(req)`: Validate Twilio webhook signature
  - `processIncomingMessage(payload)`: Process incoming SMS

### 3. Create SMS Routes (routes/sms-routes.ts)
- Create Express Router
- Implement routes:
  - POST `/webhook`: Handle incoming SMS
  - POST `/send`: Send new SMS
  - GET `/messages`: List messages (optional)
- Add input validation
- Add error handling

### 4. Update index.ts
- Import and use the new SMS routes
- Add route prefix `/api/sms`

### 5. Environment Variables
- Document required env vars:
  - TWILIO_ACCOUNT_SID
  - TWILIO_AUTH_TOKEN
  - TWILIO_PHONE_NUMBER

## API Endpoints

### POST /api/sms/webhook
- Handles incoming SMS from Twilio
- Validates Twilio signature
- Processes the message
- Returns 200 with TwiML response

### POST /api/sms/send
- Sends a new SMS
- Request body: { to: string, body: string }
- Returns message SID on success

## Error Handling
- Standard error responses
- Input validation
- Twilio API errors

## Testing
- Unit tests for service
- Integration tests for routes
- Webhook testing with ngrok
