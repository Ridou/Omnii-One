# Composio Google Calendar Integration Implementation Plan

## Overview

This document outlines the implementation plan for integrating Google Calendar functionality using the Composio TypeScript SDK. This integration will enable AI agents to interact with Google Calendar through OAuth-authenticated connections.

## Prerequisites

### 1. Composio Setup

- Sign up for Composio account at [composio.dev](https://composio.dev)
- Get API key from dashboard
- Create Google Calendar integration in Composio dashboard

### 2. Environment Variables

```bash
COMPOSIO_API_KEY=your_composio_api_key_here
GOOGLE_CALENDAR_INTEGRATION_ID=your_integration_id_from_dashboard
BASE_URL=http://localhost:8080  # For OAuth callback URL
```

### 3. Dependencies

```bash
bun add composio-core zod
```

## Implementation Structure

### Directory Structure

```
src/
├── services/
│   ├── composio-calendar-service.ts     # Main calendar service
│   └── composio-connection-manager.ts   # Connection management
├── routes/
│   └── composio-calendar.routes.ts     # Express routes
├── types/
│   └── composio-calendar.types.ts      # TypeScript interfaces
└── utils/
    └── composio-calendar.utils.ts      # Helper utilities

tests/
├── composio-calendar.test.js           # Main integration tests
├── composio-connection.test.js         # Connection tests
└── composio-oauth-flow.test.js         # OAuth flow tests
```

## Phase 1: Core Service Implementation

### 1.1 Connection Manager

The connection manager handles OAuth flow initiation, callback processing, and connection status management.

**Key methods based on test requirements:**

```typescript
export class ComposioConnectionManager {
  constructor();
  async initiateConnection(entityId: string, redirectUri?: string): Promise<ConnectionRequest>;
  async handleOAuthCallback(callbackData: OAuthCallbackData): Promise<CallbackResult>;
  async waitForOAuthCompletion(entityId: string, timeout?: number): Promise<ActiveConnection>;
  async getConnectionStatus(entityId: string): Promise<ConnectionStatus>;
  async refreshConnection(entityId: string): Promise<ConnectionStatus>;
  async disconnectUser(entityId: string): Promise<DisconnectionResult>;
  async isConnectionValid(entityId: string): Promise<boolean>;
}
```

**OAuth Flow State Management:**
- Track active OAuth flows by entity ID
- Store connection state, timestamps, and status
- Clean up completed or failed flows
- Support concurrent OAuth flows for multiple users

### 1.2 Calendar Service

The calendar service provides high-level methods for interacting with Google Calendar through Composio actions.

**Core methods from test requirements:**

```typescript
export class ComposioCalendarService {
  constructor();
  async listEvents(entityId: string, params?: ListEventsParams): Promise<CalendarEvent[]>;
  async createEvent(entityId: string, eventData: CreateEventData): Promise<CalendarEvent>;
  async updateEvent(entityId: string, eventId: string, updates: UpdateEventData): Promise<CalendarEvent>;
  async deleteEvent(entityId: string, eventId: string): Promise<boolean>;
  async getEvent(entityId: string, eventId: string): Promise<CalendarEvent>;
  async listCalendars(entityId: string): Promise<Calendar[]>;
  async getAvailableTools(entityId: string): Promise<ComposioTool[]>;
  async testConnectionAfterOAuth(entityId: string): Promise<TestResult>;
}
```

**Composio Action Names (from tests):**
- `GOOGLECALENDAR_LIST_EVENTS`
- `GOOGLECALENDAR_CREATE_EVENT`
- `GOOGLECALENDAR_UPDATE_EVENT`
- `GOOGLECALENDAR_DELETE_EVENT`
- `GOOGLECALENDAR_GET_EVENT`
- `GOOGLECALENDAR_LIST_CALENDARS`
- `GOOGLECALENDAR_GET_PROFILE`

### 1.3 Type Definitions

Based on test files, here are the required type definitions:

```typescript
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

export interface ConnectionStatus {
  id: string;
  status: 'ACTIVE' | 'NOT_CONNECTED' | 'DISCONNECTED';
  isValid: boolean;
  lastRefreshed?: string;
  entityId?: string;
  integrationId?: string;
}

// Calendar Event Types
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees?: Attendee[];
}

export interface EventDateTime {
  dateTime: string;
  timeZone?: string;
}

export interface CreateEventData {
  summary: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;
  calendarId?: string;
}

export interface ListEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}

// Tool Types
export interface ComposioTool {
  name: string;
  description: string;
}

// Error Types
export class ComposioConnectionError extends Error {}
export class ComposioAuthError extends Error {}
export class ComposioRateLimitError extends Error {}
export class ComposioCalendarError extends Error {}
```

## Phase 2: API Routes Implementation

### 2.1 OAuth Flow Routes

```typescript
// OAuth initiation
POST /api/composio/calendar/connect/:entityId
Body: { redirectUri?: string }
Response: { redirectUrl: string, connectionId: string, status: string }

// OAuth callback handler
GET /api/composio/calendar/callback
Query: { code: string, state: string, scope?: string, error?: string }
Response: { success: boolean, message: string }

// Connection status check
GET /api/composio/calendar/status/:entityId
Response: { connected: boolean, status: ConnectionStatus }

// Refresh connection
POST /api/composio/calendar/refresh/:entityId
Response: { success: boolean, status: ConnectionStatus }

// Disconnect user
POST /api/composio/calendar/disconnect/:entityId
Response: { success: boolean, message: string }
```

### 2.2 Calendar Operation Routes

```typescript
// List calendar events
GET /api/composio/calendar/events/:entityId
Query: { calendarId?: string, timeMin?: string, timeMax?: string, maxResults?: number }
Response: { events: CalendarEvent[] }

// Create calendar event
POST /api/composio/calendar/events/:entityId
Body: CreateEventData
Response: { event: CalendarEvent }

// Update calendar event
PUT /api/composio/calendar/events/:entityId/:eventId
Body: UpdateEventData
Response: { event: CalendarEvent }

// Delete calendar event
DELETE /api/composio/calendar/events/:entityId/:eventId
Response: { success: boolean }

// Get single event
GET /api/composio/calendar/events/:entityId/:eventId
Response: { event: CalendarEvent }

// List user calendars
GET /api/composio/calendar/calendars/:entityId
Response: { calendars: Calendar[] }

// Get available tools
GET /api/composio/calendar/tools/:entityId
Response: { tools: ComposioTool[] }
```

## Phase 3: Error Handling & Logging

### 3.1 Error Types

```typescript
export class ComposioConnectionError extends Error {}
export class ComposioAuthError extends Error {}
export class ComposioRateLimitError extends Error {}
export class ComposioCalendarError extends Error {}
```

### 3.2 Logging Strategy

- Connection events (initiate, success, failure)
- API calls and responses
- Error tracking with context
- Performance metrics

## Phase 4: Testing Strategy

### 4.1 Unit Tests

- Connection manager functionality
- Calendar service methods
- Error handling scenarios
- Type validation

### 4.2 Integration Tests

- OAuth flow simulation
- End-to-end calendar operations
- Error recovery scenarios
- Rate limiting behavior

### 4.3 Test Data

- Mock event data
- Test entity IDs
- Simulated OAuth responses
- Error response scenarios

## Phase 5: Security & Compliance

### 5.1 Data Protection

- Secure token storage (handled by Composio)
- User consent validation
- Data retention policies
- GDPR compliance considerations

### 5.2 Rate Limiting

- Implement client-side rate limiting
- Handle Composio rate limit responses
- Graceful degradation strategies

## Phase 6: Monitoring & Observability

### 6.1 Metrics

- Connection success/failure rates
- API response times
- Error frequencies
- Usage patterns

### 6.2 Health Checks

- Connection status monitoring
- Service availability checks
- Integration status dashboard

## Implementation Timeline

### Week 1: Foundation

- [ ] Set up Composio account and integration
- [ ] Implement connection manager
- [ ] Create basic calendar service structure
- [ ] Set up development environment

### Week 2: Core Functionality

- [ ] Implement calendar CRUD operations
- [ ] Add error handling
- [ ] Create API routes
- [ ] Write unit tests

### Week 3: Integration & Testing

- [ ] End-to-end testing
- [ ] OAuth flow testing
- [ ] Performance optimization
- [ ] Documentation updates

### Week 4: Production Readiness

- [ ] Security review
- [ ] Monitoring setup
- [ ] Load testing
- [ ] Deployment preparation

## Success Metrics

- [ ] 99%+ OAuth flow success rate
- [ ] < 2s average API response time
- [ ] Zero security vulnerabilities
- [ ] 100% test coverage for critical paths
- [ ] Successful integration with existing MCP infrastructure

## Risk Mitigation

### Technical Risks

- **Composio API changes**: Monitor changelog, implement version pinning
- **Google Calendar rate limits**: Implement exponential backoff
- **OAuth token expiry**: Automated refresh mechanisms

### Operational Risks

- **Service availability**: Health checks and fallback strategies
- **Data consistency**: Transaction-like operations where possible
- **User experience**: Clear error messages and status feedback

## Documentation Requirements

- [ ] API documentation with examples
- [ ] OAuth flow user guide
- [ ] Error handling guide
- [ ] Performance tuning guide
- [ ] Troubleshooting documentation

## Next Steps

1. Create Composio account and Google Calendar integration
2. Set up development environment with test credentials
3. Implement connection manager with basic tests
4. Begin calendar service implementation
5. Set up CI/CD pipeline with test automation
