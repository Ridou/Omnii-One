/**
 * TypeScript type definitions for Composio Google Calendar integration
 */

// Connection Types
export interface ConnectionRequest {
  redirectUrl: string;
  connectionId: string;
  status: 'INITIATED' | 'PROCESSING' | 'ACTIVE' | 'FAILED';
  state?: string;
}

export interface OAuthCallbackData {
  code?: string;
  state: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface CallbackResult {
  success: boolean;
  connectionId?: string;
  status?: string;
  error?: string;
}

export interface ActiveConnection {
  id: string;
  status: 'ACTIVE';
  integrationId: string;
  entityId: string;
  connectedAt: string;
  tokenInfo?: {
    hasValidToken: boolean;
    expiresAt?: string;
  };
}

export interface ConnectionStatus {
  id?: string;
  status: 'ACTIVE' | 'NOT_CONNECTED' | 'DISCONNECTED';
  isValid: boolean;
  lastRefreshed?: string;
  entityId?: string;
  integrationId?: string;
}

export interface DisconnectionResult {
  success: boolean;
  status: 'DISCONNECTED';
  message?: string;
}

// Calendar Event Types
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees?: Attendee[];
  calendarId?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  location?: string;
  created?: string;
  updated?: string;
  organizer?: {
    email: string;
    displayName?: string;
  };
  htmlLink?: string;
}

export interface EventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface Attendee {
  email: string;
  displayName?: string;
  responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
  optional?: boolean;
  organizer?: boolean;
  self?: boolean;
}

export interface CreateEventData {
  summary: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;
  calendarId?: string;
  attendees?: Attendee[] | string[];
  location?: string;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface UpdateEventData {
  summary?: string;
  description?: string;
  start?: EventDateTime;
  end?: EventDateTime;
  attendees?: Attendee[] | string[];
  location?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface ListEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: "startTime" | "updated";
  singleEvents?: boolean;
  showDeleted?: boolean;
  pageToken?: string;
  q?: string;
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  accessRole?: string;
  primary?: boolean;
  location?: string;
  selected?: boolean;
}

// Tool Types
export interface ComposioTool {
  name: string;
  description: string;
  params?: Record<string, any>;
}

export interface TestResult {
  successful: boolean;
  data?: {
    email?: string;
    name?: string;
    timezone?: string;
  };
  error?: string;
}

// OAuth Flow Types
export interface OAuthFlow {
  connectionId: string;
  state: string;
  startedAt: Date;
  status: 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  callbackReceivedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// Error types
export class ComposioConnectionError extends Error {
  constructor(message: string, public entityId?: string, public code?: string) {
    super(message);
    this.name = "ComposioConnectionError";
  }
}

export class ComposioAuthError extends Error {
  constructor(message: string, public entityId?: string, public code?: string) {
    super(message);
    this.name = "ComposioAuthError";
  }
}

export class ComposioRateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = "ComposioRateLimitError";
  }
}

export class ComposioCalendarError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "ComposioCalendarError";
  }
}

// Composio SDK Response Types
export interface ComposioActionResponse<T = any> {
  successful: boolean;
  data?: T;
  error?: string;
}

export interface ComposioConnectionInitResponse {
  redirectUrl: string;
  connectionId: string;
  status: string;
  state?: string;
}

// Helper Types
export type ConnectionStatusType = 'ACTIVE' | 'NOT_CONNECTED' | 'DISCONNECTED' | 'INITIATED' | 'PROCESSING' | 'FAILED';

export interface ComposioConfig {
  apiKey: string;
  integrationId: string;
  baseUrl?: string;
}

// Legacy support for old interface names
export interface OAuthConnectionRequest extends ConnectionRequest {}