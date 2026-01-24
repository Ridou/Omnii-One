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
