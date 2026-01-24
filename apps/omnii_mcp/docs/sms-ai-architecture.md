# SMS AI Calendar Management - Technical Architecture

## System Architecture Overview

```mermaid
graph TB
    subgraph "User Interface"
        SMS[📱 SMS Messages]
        Phone[📞 Phone Numbers]
    end

    subgraph "Twilio Gateway"
        TwilioWebhook[🔗 Webhook Endpoint]
        TwilioAPI[📤 SMS API]
    end

    subgraph "SMS AI System"
        SMSRoutes[🛣️ SMS Routes]
        SimpleSMSAI[🧠 SimpleSMSAI Orchestrator]

        subgraph "Core Managers"
            TimezoneManager[🌍 TimezoneManager]
            CalendarManager[📅 CalendarManager]
        end

        subgraph "AI Services"
            OpenAI[🤖 OpenAI GPT-4o-mini]
            ComposioAI[🔧 Composio AI Tools]
        end
    end

    subgraph "External Services"
        GoogleCalendar[📆 Google Calendar API]
        ComposioOAuth[🔐 Composio OAuth]
        GoogleMeet[🎥 Google Meet]
    end

    subgraph "Data Layer"
        PhoneMapping[📋 Phone → Email Mapping]
        TimezoneStorage[🕐 Timezone Storage]
        ConnectionCache[💾 Connection Cache]
    end

    SMS --> TwilioWebhook
    TwilioWebhook --> SMSRoutes
    SMSRoutes --> SimpleSMSAI

    SimpleSMSAI --> TimezoneManager
    SimpleSMSAI --> CalendarManager

    TimezoneManager --> OpenAI
    CalendarManager --> ComposioAI
    CalendarManager --> OpenAI

    ComposioAI --> GoogleCalendar
    ComposioAI --> ComposioOAuth
    GoogleCalendar --> GoogleMeet

    SimpleSMSAI --> PhoneMapping
    TimezoneManager --> TimezoneStorage
    CalendarManager --> ConnectionCache

    CalendarManager --> TwilioAPI
    SMSRoutes --> TwilioAPI
    TwilioAPI --> SMS
```

## Component Interaction Flow

### Message Processing Pipeline

```mermaid
sequenceDiagram
    participant User as 📱 User
    participant Twilio as 🔗 Twilio
    participant Routes as 🛣️ SMS Routes
    participant AI as 🧠 SimpleSMSAI
    participant TZ as 🌍 TimezoneManager
    participant Cal as 📅 CalendarManager
    participant OpenAI as 🤖 OpenAI
    participant Composio as 🔧 Composio
    participant GCal as 📆 Google Calendar

    User->>Twilio: SMS Message
    Twilio->>Routes: Webhook POST
    Routes->>AI: processMessage()

    AI->>AI: validatePhoneNumber()
    AI->>TZ: needsTimezoneSetup()

    alt Timezone Setup Required
        TZ->>OpenAI: inferTimezone(city)
        OpenAI->>TZ: IANA timezone
        TZ->>User: Confirmation SMS
    else Calendar Operation
        AI->>Cal: isCalendarMessage()
        Cal->>Cal: checkConnection()

        alt No Connection
            Cal->>Composio: initiateOAuth()
            Composio->>User: OAuth Link SMS
        else Active Connection
            Cal->>OpenAI: processEvent()
            OpenAI->>Composio: GOOGLECALENDAR_CREATE_EVENT
            Composio->>GCal: Create Event
            GCal->>Composio: Event + Meet Link
            Composio->>Cal: Success Response
            Cal->>User: Confirmation SMS
        end
    end

    Routes->>Twilio: TwiML Response
    Twilio->>User: SMS Delivery
```

## Data Flow Architecture

### Phone Number to Entity Mapping

```mermaid
graph LR
    subgraph "Phone Mapping"
        P1["+16286885388"] --> E1["edenchan717@gmail.com"]
        P2["+18582260766"] --> E2["santino62@gmail.com"]
    end

    subgraph "Timezone Storage"
        P1 --> TZ1["America/Los_Angeles"]
        P2 --> TZ2["America/New_York"]
    end

    subgraph "Connection Status"
        E1 --> C1["Active Connection"]
        E2 --> C2["Pending OAuth"]
    end
```

### Event Processing Flow

```mermaid
flowchart TD
    A[User Message] --> B{Calendar Related?}
    B -->|No| C[General AI Response]
    B -->|Yes| D{List or Create?}

    D -->|List| E[Check Connection]
    D -->|Create| E

    E --> F{Connection Status}
    F -->|None| G[Send OAuth Link]
    F -->|Pending| H[Send Fresh OAuth]
    F -->|Active| I[Process Request]

    I --> J{Request Type}
    J -->|List| K[Query Calendar API]
    J -->|Create| L[Create Event API]

    K --> M[Format Event List]
    L --> N[Format Confirmation]

    M --> O[Multiple SMS Delivery]
    N --> O
    G --> O
    H --> O
    C --> O

    O --> P[User Receives SMS]
```

## Service Layer Architecture

### SimpleSMSAI Orchestrator

```typescript
class SimpleSMSAI {
  // Core dependencies
  private openai: OpenAI;
  private timezoneManager: TimezoneManager;
  private calendarManager: CalendarManager;

  // Entity mapping
  private phoneToEmailMap: Record<string, string>;

  // Main processing pipeline
  async processMessage(
    message: string,
    phoneNumber: string,
    localDatetime?: string
  ) {
    // 1. Validate phone number
    // 2. Check timezone setup
    // 3. Classify message type
    // 4. Route to appropriate manager
    // 5. Handle response delivery
  }
}
```

### TimezoneManager

```typescript
class TimezoneManager {
  // Setup state tracking
  private setupStates: Map<string, TimezoneSetupState>;
  private userTimezones: Map<string, string>;

  // AI-powered timezone inference
  async inferTimezoneFromCity(cityName: string): Promise<string>;

  // Setup flow management
  needsTimezoneSetup(phoneNumber: string): boolean;
  isInTimezoneSetup(phoneNumber: string): boolean;
  handleTimezoneSetup(phoneNumber: string, message: string);
}
```

### CalendarManager

```typescript
class CalendarManager {
  private openai: OpenAI;
  private composio: OpenAIToolSet;

  // Connection management
  async getUserConnections(entityId: string): Promise<any[]>;
  findActiveConnection(connections: any[]): any | null;
  setupOAuthConnection(entityId: string, phoneNumber: string);

  // Calendar operations
  async listEvents(entityId: string, userTimezone: string, phoneNumber: string);
  async processCalendarEvent(
    message: string,
    phoneNumber: string,
    entityId: string
  );

  // Message classification
  isCalendarMessage(message: string): boolean;
  isListEventsMessage(message: string): boolean;
}
```

## Integration Architecture

### Composio Integration Layer

```mermaid
graph TB
    subgraph "Composio SDK"
        ToolSet[OpenAIToolSet]
        ConnectedAccounts[Connected Accounts API]
        Integrations[Integrations API]
    end

    subgraph "Google Services"
        GCalAPI[Google Calendar API]
        GMeetAPI[Google Meet API]
        OAuth2[Google OAuth 2.0]
    end

    subgraph "AI Processing"
        GPT[GPT-4o-mini]
        Tools[Function Calling]
        Context[Rich Context Injection]
    end

    ToolSet --> GCalAPI
    ToolSet --> GMeetAPI
    ConnectedAccounts --> OAuth2

    GPT --> Tools
    Tools --> ToolSet
    Context --> GPT
```

### OAuth Flow Architecture

```mermaid
sequenceDiagram
    participant User as 📱 User
    participant System as 🧠 System
    participant Composio as 🔧 Composio
    participant Google as 🔐 Google

    User->>System: "Create meeting"
    System->>Composio: Check connection
    Composio->>System: No active connection

    System->>Composio: initiate OAuth
    Composio->>Google: Request OAuth URL
    Google->>Composio: OAuth URL
    Composio->>System: OAuth URL

    System->>User: SMS with OAuth link
    User->>Google: Complete OAuth
    Google->>Composio: Authorization code
    Composio->>Google: Exchange for tokens
    Google->>Composio: Access tokens

    Composio->>System: Connection active
    System->>User: "Setup complete!"
```

## Error Handling Architecture

### Error Classification

```mermaid
graph TD
    A[Error Occurs] --> B{Error Type}

    B -->|API Error| C[Composio/Google API]
    B -->|Auth Error| D[OAuth/Connection]
    B -->|AI Error| E[OpenAI Processing]
    B -->|SMS Error| F[Twilio Delivery]

    C --> G[Log + Retry Logic]
    D --> H[Fresh OAuth Flow]
    E --> I[Fallback Response]
    F --> J[Multiple Delivery]

    G --> K[User Error Message]
    H --> K
    I --> K
    J --> K
```

### Logging Strategy

```typescript
// Decision point logging
console.log(
  `🚨 [CalendarManager] NO EVENTS DECISION: events.length = ${events.length}`
);
console.log(`🚨 [CalendarManager] Search range: ${pastWeek} to ${nextWeek}`);
console.log(`🚨 [CalendarManager] Entity ID: ${entityId}`);

// Success logging
console.log(
  `✅ [CalendarManager] EVENTS FOUND: Processing ${events.length} events`
);
console.log(
  `✅ [CalendarManager] Past: ${pastEvents.length}, Future: ${futureEvents.length}`
);

// Error logging with context
console.error(`❌ [CalendarManager] Error:`, error);
console.error(`❌ [CalendarManager] Context:`, {
  entityId,
  phoneNumber,
  userTimezone,
});
```

## Performance & Scalability

### Caching Strategy

```mermaid
graph LR
    subgraph "Memory Cache"
        TC[Timezone Cache]
        CC[Connection Cache]
        SC[Setup State Cache]
    end

    subgraph "External Cache"
        Redis[Redis Cache]
        DB[Database Storage]
    end

    TC --> Redis
    CC --> Redis
    SC --> Redis
    Redis --> DB
```

### Rate Limiting

```typescript
// Per-user rate limiting
const rateLimits = {
  messagesPerMinute: 10,
  eventsPerHour: 50,
  oauthAttemptsPerDay: 5,
};

// Global rate limiting
const globalLimits = {
  totalMessagesPerMinute: 1000,
  composioCallsPerMinute: 500,
};
```

## Security Architecture

### Data Protection

```mermaid
graph TB
    subgraph "Input Validation"
        PhoneVal[Phone Number Validation]
        MessageSan[Message Sanitization]
        RateLimit[Rate Limiting]
    end

    subgraph "Authentication"
        TwilioSig[Twilio Signature Validation]
        OAuth[OAuth 2.0 Flow]
        EntityMap[Entity Mapping]
    end

    subgraph "Data Encryption"
        Transit[TLS in Transit]
        Rest[Encryption at Rest]
        Tokens[Token Encryption]
    end

    PhoneVal --> TwilioSig
    MessageSan --> OAuth
    RateLimit --> EntityMap

    TwilioSig --> Transit
    OAuth --> Rest
    EntityMap --> Tokens
```

### Access Control

```typescript
// Phone number whitelist
private phoneToEmailMap: Record<string, string> = {
  "+16286885388": "edenchan717@gmail.com",
  "+18582260766": "santino62@gmail.com",
};

// OAuth scope limitation
const requiredScopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly"
];
```

## Monitoring & Observability

### Metrics Collection

```typescript
// Key metrics to track
const metrics = {
  messageVolume: "messages_per_minute",
  responseTime: "avg_response_time_ms",
  successRate: "successful_operations_percent",
  errorRate: "error_rate_percent",
  oauthCompletions: "oauth_completions_per_day",
  eventCreations: "events_created_per_day",
  eventLists: "event_lists_per_day",
};
```

### Health Checks

```typescript
// Service health endpoint
GET /api/sms/health
{
  "success": true,
  "service": "sms-ai",
  "status": "healthy",
  "config": {
    "hasOpenAI": true,
    "hasComposio": true,
    "hasTwilio": true
  },
  "timestamp": "2025-05-27T03:56:43.261Z"
}
```

---

_This technical architecture documentation provides a comprehensive view of the SMS AI Calendar Management system's internal structure, data flows, and integration patterns._
