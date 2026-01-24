# WebSocket System Architecture - Omnii MCP

## Overview
The WebSocket system provides real-time bidirectional communication for the Omnii MCP project, sharing core logic with the SMS flow while adapting for WebSocket-specific requirements.

## Visual Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  Web Client                                                                          │
│  ┌─────────────┐      WebSocket Connection      ┌──────────────────────────┐       │
│  │   Browser   │ ◄─────────────────────────────► │   Elysia WebSocket      │       │
│  │  JavaScript │         ws://host/ws            │   Endpoint (/ws)        │       │
│  └─────────────┘                                └──────────────────────────┘       │
│                                                           │                          │
└───────────────────────────────────────────────────────────│──────────────────────────┘
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          WEBSOCKET HANDLER SERVICE                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────┐    │
│  │                     WebSocketHandlerService                                 │    │
│  │  ┌──────────────────┐  ┌────────────────────┐  ┌─────────────────────┐   │    │
│  │  │ Connection Mgmt  │  │  Message Router    │  │  Response Builder   │   │    │
│  │  │ • userId → ws    │  │ • Type detection   │  │ • Status codes      │   │    │
│  │  │ • Register/Remove│  │ • Payload parsing  │  │ • Error handling    │   │    │
│  │  │ • State tracking │  │ • Context creation │  │ • OAuth responses   │   │    │
│  │  └──────────────────┘  └────────────────────┘  └─────────────────────┘   │    │
│  └────────────────────────────────────────────────────────────────────────────┘    │
│                                          │                                           │
│                    Message Types:        ▼                                           │
│              ┌─────────────────────────────────────────┐                           │
│              │  COMMAND │ SYSTEM │ PING │ WORKFLOW_*   │                           │
│              └─────────────────────────────────────────┘                           │
└───────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           CORE PROCESSING LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────┐      ┌─────────────────────┐      ┌──────────────────┐   │
│  │   Entity Manager    │      │   Action Planner    │      │ Intervention Mgr │   │
│  │ • Extract entities  │─────►│ • Create plan       │◄────►│ • Request user   │   │
│  │ • Resolve via cache │      │ • Execute steps     │      │   intervention   │   │
│  │ • Contact lookup    │      │ • Handle failures   │      │ • Track timeouts │   │
│  │ • Unknown marking   │      │ • Manage state      │      │ • Route by ctx   │   │
│  └─────────────────────┘      └─────────────────────┘      └──────────────────┘   │
│            │                            │                            │               │
│            ▼                            ▼                            ▼               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                        Execution Context                                     │   │
│  │  • userId (WebSocket) / phoneNumber (SMS)                                  │   │
│  │  • ExecutionContextType: WEBSOCKET | SMS                                   │   │
│  │  • Session management & step results                                       │   │
│  │  • Entity resolution & timezone info                                       │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         GOOGLE SERVICES INTEGRATION                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                      UnifiedGoogleManager                                    │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐   │   │
│  │  │ Service Router │  │   Auth Manager  │  │     Plugin System          │   │   │
│  │  │ • Detect type  │  │ • Check conn    │  │ • Calendar │ Tasks        │   │   │
│  │  │ • Route to     │  │ • OAuth flow    │  │ • Contacts │ Email        │   │   │
│  │  │   plugin       │  │ • Context aware │  │ • Pluggable architecture  │   │   │
│  │  └────────────────┘  └────────────────┘  └────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                           │
│                                          ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         OAuth Flow (Context-Aware)                           │   │
│  │  WebSocket: Return authUrl in response → Client handles redirect            │   │
│  │  SMS: Send OAuth URL via Twilio → User clicks link                        │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │   Composio   │  │    OpenAI    │  │    Redis     │  │      Twilio        │     │
│  │ • OAuth mgmt │  │ • NLP/Entity │  │ • Cache data │  │ • SMS fallback     │     │
│  │ • API calls  │  │ • Planning   │  │ • Sessions   │  │ • Interventions    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. WebSocket Connection Layer

**Entry Point: `/ws` endpoint in `app.ts`**
- Elysia WebSocket server handling real-time connections
- Connection lifecycle: open → message → close
- Automatic reconnection support
- Message validation and error handling

**Connection Management:**
```typescript
connections = new Map<string, ElysiaWebSocket>()
// userId → WebSocket mapping for direct messaging
```

### 2. WebSocket Handler Service

**Core Responsibilities:**
- Message routing based on type (COMMAND, SYSTEM, PING, WORKFLOW_*)
- User connection management (register/remove by userId)
- Context creation for execution
- Response formatting with proper status codes

**Message Flow:**
1. Parse incoming WebSocket message
2. Validate message structure
3. Extract userId from payload
4. Route to appropriate processor
5. Return formatted response

### 3. Message Types & Processing

**Command Messages:**
- Text commands from users
- Routed through Action Planner
- Same flow as SMS but with WebSocket context

**System Messages:**
- Intervention responses
- OAuth callbacks
- Administrative commands

**Workflow Messages (Future):**
- Draft approval flows
- Step execution updates
- Real-time progress tracking

### 4. Core Processing Integration

**Entity Recognition Flow:**
```
Message → Extract Entities → Resolve (Cache/Contacts) → Mark Unknown
```

**Action Planning Flow:**
```
Entities → Create Plan → Add Interventions → Execute Steps → Response
```

**Intervention System:**
- Context-aware routing (WebSocket vs SMS)
- Real-time intervention requests via WebSocket
- Timeout handling with Redis state
- Resolution tracking

### 5. OAuth Authentication

**WebSocket OAuth Flow:**
1. Service detects auth needed
2. Returns `authRequired: true` with `authUrl`
3. Client handles redirect/popup
4. User completes OAuth
5. Connection becomes active

**Key Difference from SMS:**
- No SMS sent for WebSocket users
- OAuth URL returned in response payload
- Client-side handling of authentication

### 6. Unified Google Manager

**Service Detection:**
- Analyzes message content
- Routes to appropriate plugin
- Maintains service-specific logic

**Plugin Architecture:**
- Calendar, Tasks, Contacts, Email plugins
- Shared authentication logic
- Context-aware responses

### 7. Context Management

**ExecutionContext:**
```typescript
{
  entityId: string,        // userId for WebSocket
  phoneNumber: string,     // Also userId for WebSocket
  context: ExecutionContextType.WEBSOCKET,
  userTimezone: string,
  sessionId: string,
  entities: Entity[],
  stepResults: Map<string, StepResult>
}
```

### 8. Key Differences: WebSocket vs SMS

| Feature | WebSocket | SMS |
|---------|-----------|-----|
| Connection | Persistent, bidirectional | Request-response |
| User ID | userId from payload | Phone number |
| OAuth | Return URL in response | Send via SMS |
| Interventions | Real-time messages | SMS with timeout |
| State | In-memory + Redis | Redis only |
| Response | Immediate | Async via Twilio |

### 9. Error Handling

**WebSocket Errors:**
- Connection failures → Clean up state
- Message parsing → Return error response
- Processing errors → Structured error format
- OAuth failures → Auth required response

### 10. Data Flow Examples

**Simple Command:**
```
Client → WebSocket → Handler → Entity Extraction → Action Plan → Execute → Response
```

**Command with Unknown Entity:**
```
Client → WebSocket → Handler → Entity Extraction → Unknown Detected → 
→ Intervention Step Added → Request Sent to Client → Wait for Response →
→ Entity Resolved → Continue Execution → Final Response
```

**OAuth Required:**
```
Client → WebSocket → Handler → Google Service → Auth Check Failed →
→ OAuth URL Generated → Response with authRequired=true → Client Redirect →
→ User Completes OAuth → Next Command Works
```

## Integration Points

### Shared Components:
- Action Planner
- Entity Manager
- Google Service Plugins
- Redis Cache
- OpenAI Integration

### WebSocket-Specific:
- Connection management
- Real-time messaging
- Client-side OAuth handling
- WebSocket intervention flow

### SMS-Specific:
- Twilio integration
- Phone number routing
- SMS intervention flow
- SMS OAuth delivery

## Future Enhancements

1. **Workflow Approval System:**
   - Draft presentation via WebSocket
   - Real-time step approval
   - Progress tracking

2. **Enhanced Interventions:**
   - Rich intervention UI
   - Multiple choice options
   - File uploads

3. **Performance Optimizations:**
   - Connection pooling
   - Message batching
   - Caching improvements

4. **Security Hardening:**
   - Message encryption
   - Rate limiting
   - Authentication tokens

This architecture provides a robust foundation for real-time AI-assisted task execution while maintaining compatibility with the existing SMS flow.