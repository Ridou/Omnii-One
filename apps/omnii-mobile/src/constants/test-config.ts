/**
 * Test configuration constants
 *
 * IMPORTANT: USER_ID must be a valid Supabase user ID that has Google OAuth
 * access tokens stored. The WebSocket handler uses this ID to lookup the
 * Google access token for API calls (Gmail, Calendar, etc.).
 */

// Real test user with valid Supabase Google OAuth tokens
export const TEST_USER = {
  PHONE_NUMBER: "+18582260766",
  EMAIL: "santino62@gmail.com",
  USER_ID: "cd9bdc60-35af-4bb6-b87e-1932e96fb354", // Valid Supabase user ID
} as const;

// Use the same real user for approval workflow testing
// (In production, each user would use their own real Supabase user ID)
export const TEST_APPROVAL_USER = {
  PHONE_NUMBER: "+16286885388",
  EMAIL: "edenchan717@gmail.com",
  USER_ID: "ad75381f-4145-465d-9790-d25c96ae9a0d", // Must match Supabase user with Google OAuth
} as const;

// WebSocket configuration
export const WS_CONFIG = {
  PORT: 8000,
  TIMEOUT_MS: 30000,
} as const;

// Test scenarios for WebSocket
export const TEST_SCENARIOS = {
  event: "create event tomorrow at 3pm titled WebSocket Testing",
  email_read: "fetch my latest emails",
  email_send: "send email to edenchan717@gmail.com with subject 'Test Email' and body 'This is a test email from WebSocket'",
  contact_add: "add contact Bobby Ross with email bobbyross@gmail.com",
  tasks: "create task to review quarterly reports",
  calendar_list: "list my calendar events",
  contact_search: "search for contact Bobby Ross",
  email_draft: "create draft to Bobby Ross with subject 'Meeting Request' and body 'Let's schedule a test meeting'",
} as const;