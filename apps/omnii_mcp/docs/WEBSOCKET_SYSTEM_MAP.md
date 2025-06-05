# WebSocket System Architecture Map

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                      │
├─────────────────────────┬────────────────────────┬──────────────────────────────────┤
│    WebSocket Client     │      SMS Client        │        Test Clients              │
│  (Browser/App/API)      │   (Twilio Webhook)     │   (websocket-scenarios.test)     │
└───────────┬─────────────┴───────────┬────────────┴──────────────┬───────────────────┘
            │                         │                           │
            │ ws://localhost:8000/ws  │ POST /sms                │
            │                         │                           │
┌───────────▼─────────────────────────▼───────────────────────────▼───────────────────┐
│                              TRANSPORT LAYER (Elysia)                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  app.ws("/ws", {           │  app.post("/sms", {                                    │
│    open(ws) {...}          │    body: { From, Body, ... }                           │
│    message(ws, msg) {...}  │    ...                                                 │
│    close(ws) {...}         │  })                                                    │
│  })                        │                                                        │
└───────────┬─────────────────┴────────────┬──────────────────────────────────────────┘
            │                              │
            │ WebSocketMessage             │ SMS Message
            │                              │
┌───────────▼──────────────────────────────▼──────────────────────────────────────────┐
│                            MESSAGE HANDLER LAYER                                     │
├──────────────────────────────┬──────────────────────────────────────────────────────┤
│   WebSocketHandlerService    │              SimpleSMSAI                             │
│                              │                                                      │
│  • Connection Management     │         • Phone → Email Mapping                     │
│  • Message Type Routing      │         • Session Management                        │
│  • OAuth Response Handling   │         • SMS Response Handling                     │
│  • Intervention via WS       │         • Intervention via SMS                      │
└──────────────┬───────────────┴───────────────────┬──────────────────────────────────┘
               │                                   │
               │  Both call handleWithActionPlanner │
               │                                   │
┌──────────────▼───────────────────────────────────▼──────────────────────────────────┐
│                         CORE PROCESSING LAYER                                        │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐             │
│  │ EntityManager   │    │  ActionPlanner     │    │ InterventionManager│             │
│  │                 │    │                    │    │                    │             │
│  │ • Extract       │───▶│ • Create Plan      │───▶│ • Request User     │             │
│  │ • Resolve       │    │ • Execute Steps    │    │   Input            │             │
│  │ • Cache         │    │ • Handle Retries   │    │ • Handle Timeouts  │             │
│  │ • Placeholders  │    │ • Synthesize       │◀───│ • Route by Context │             │
│  └─────────────────┘    └──────────┬─────────┘    └────────────────────┘             │
│                                    │                                                 │
│                         ExecutionContext                                             │
│                         • userId/phoneNumber                                         │
│                         • context: WEBSOCKET | SMS                                   │
│                         • entities, timezone, session                                │
└────────────────────────────────────┬─────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────────────────┐
│                         GOOGLE SERVICES LAYER                                        │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                       UnifiedGoogleManager                                           │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐                    │
│  │ 1. Service Detection (Calendar/Email/Tasks/Contacts)        │                    │
│  │ 2. Connection Check → OAuth if needed                       │                    │
│  │ 3. Plugin Delegation with active connection                 │                    │
│  └─────────────────────────────────────────────────────────────┘                    │
│                                                                                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐                     │
│  │CalendarPlugin│ EmailPlugin  │ TasksPlugin  │ContactsPlugin│                     │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘                     │
└─────────┼──────────────┼──────────────┼──────────────┼──────────────────────────────┘
          │              │              │              │
┌─────────▼──────────────▼──────────────▼──────────────▼──────────────────────────────┐
│                         EXTERNAL SERVICES                                            │
├──────────────────────────────────────────────────────────────────────────────────────┤
│   Composio API     │    OpenAI API    │    Redis Cache    │    Twilio API           │
│   (Google OAuth)   │   (LLM Planning) │  (Entity Cache)   │   (SMS Sending)         │
└────────────────────┴──────────────────┴───────────────────┴─────────────────────────┘
```

## 🔄 Message Flow Paths

### 1️⃣ WebSocket Message Flow

```
Client → WebSocket → WebSocketHandler → EntityManager → ActionPlanner → UnifiedGoogleManager → Plugin → Composio/Google
                           │                                  │                                           │
                           │                                  ├─→ InterventionManager (if unknown entity) │
                           │                                  │            │                              │
                           │◀─────────────────────────────────┴────────────┘                              │
                           │                                                                              │
                           └──────────────────────────────────────────────────────────────────────────────┘
```

### 2️⃣ SMS Message Flow

```
Twilio → SMS Route → SimpleSMSAI → EntityManager → ActionPlanner → UnifiedGoogleManager → Plugin → Composio/Google
                          │                              │                                           │
                          │                              ├─→ InterventionManager (if unknown entity) │
                          │                              │            │                              │
                          │◀─────────────────────────────┴────────────│                              │
                          │                                           │                              │
                          └───────────────→ Twilio (send response) ◀──┘                              │
```

## 🎯 Key Components Explained

### WebSocketHandlerService (`websocket-handler.service.ts`)
```typescript
class WebSocketHandlerService {
  // Connection Management
  private connections = new Map<string, ElysiaWebSocket>()
  
  // Service Dependencies
  private actionPlanner: ActionPlanner
  private interventionManager: InterventionManager
  private entityManager: EntityManager
  
  // Main Flow
  processMessage(message: WebSocketMessage, ws: ElysiaWebSocket) {
    1. Parse & validate message type
    2. Register connection by userId
    3. Route to appropriate handler:
       - COMMAND → processCommand() → handleWithActionPlanner()
       - SYSTEM → processSystemMessage() (interventions)
       - PING → return pong
    4. Return structured response
  }
}
```

### ActionPlanner (`action-planner.ts`)
```typescript
class ActionPlanner {
  createPlan(message: string, entities: Entity[]) {
    1. LLM creates initial plan
    2. EntityManager patches placeholders
    3. Check for unresolved entities
    4. Insert intervention steps if needed
    5. Return complete plan with dependencies
  }
  
  executePlan(plan: ActionPlan, context: ExecutionContext) {
    1. Execute steps in order
    2. Handle interventions via context (WS/SMS)
    3. Check OAuth requirements
    4. Retry on failure
    5. Return execution result
  }
}
```

### UnifiedGoogleManager (`unified-google-manager.ts`)
```typescript
class UnifiedGoogleManager {
  processMessage(message, userId, timezone, datetime, context) {
    1. Detect service type (Calendar/Email/Tasks/Contacts)
    2. Ensure active connection:
       - Check existing connections
       - Setup OAuth if needed (context-aware)
    3. Delegate to service plugin
    4. Return result with OAuth info if needed
  }
  
  setupOAuthConnection(userId, serviceType, context) {
    if (context === WEBSOCKET) {
      // Return OAuth URL in response
      return { authRequired: true, authUrl: "..." }
    } else {
      // Send OAuth URL via SMS
      twilioService.sendMessage(...)
    }
  }
}
```

## 🔐 OAuth Flow Differences

### WebSocket OAuth
```
1. Client sends command
2. Server detects no auth
3. Server returns OAuth URL in response
4. Client opens OAuth URL
5. User authenticates
6. Client retries command
7. Command succeeds
```

### SMS OAuth
```
1. User texts command
2. Server detects no auth
3. Server sends OAuth URL via SMS
4. User clicks link
5. User authenticates
6. User texts command again
7. Command succeeds
```

## 🤝 Intervention Flow

### WebSocket Intervention
```javascript
// 1. Server needs user input
{
  type: "system",
  data: {
    action: "user_intervention_required",
    sessionId: "abc123",
    stepId: "intervention_0",
    reason: "I don't recognize 'Eden Chan'. Please provide their email:",
    entity: { type: "UNKNOWN", value: "Eden Chan" }
  }
}

// 2. Client responds
{
  type: "system",
  payload: {
    action: "intervention_response",
    sessionId: "abc123",
    stepId: "intervention_0",
    resolvedValue: "eden@example.com"
  }
}

// 3. Server continues execution
```

### SMS Intervention
```
1. Server sends SMS: "I don't recognize 'Eden Chan'. Please reply with their email:"
2. User replies: "eden@example.com"
3. Server matches session and continues
```

## 🔑 Key Design Decisions

### 1. Shared Core Logic
- **Entity Recognition**: Same extraction/resolution for both contexts
- **Action Planning**: Same LLM-based planning system
- **Google Integration**: Same plugins and Composio integration
- **Caching**: Same Redis cache for entities

### 2. Context-Aware Differences
- **User ID**: WebSocket uses `userId`, SMS uses `phoneNumber`
- **OAuth**: WebSocket returns URL, SMS sends it
- **Interventions**: WebSocket is real-time, SMS is async
- **Sessions**: WebSocket maintains connection, SMS uses session IDs

### 3. Error Handling
- **WebSocket**: Immediate error responses
- **SMS**: Error messages sent as texts
- **Retries**: Automatic retry logic in ActionPlanner
- **Timeouts**: 5-minute intervention timeout

## 📊 Data Structures

### WebSocket Message Types
```typescript
enum WebSocketMessageType {
  COMMAND = "command",      // User commands
  SYSTEM = "system",        // Interventions, system messages
  PING = "ping",           // Health checks
  // Future: NOTIFICATION, DATA
}
```

### Execution Context
```typescript
interface ExecutionContext {
  entityId: string         // userId for WS, phoneNumber for SMS
  phoneNumber: string      // Always the phone number
  context: ExecutionContextType.WEBSOCKET | ExecutionContextType.SMS
  entities: Entity[]       // Resolved entities
  sessionId: string        // Unique session
  stepResults: Map         // Step execution results
}
```

## 🚀 Adding New Features

### To Add a New Google Service:
1. Create a new plugin implementing `GoogleServicePlugin`
2. Register it in `UnifiedGoogleManager`
3. Add service detection logic
4. Plugin handles all service-specific logic

### To Add a New Message Type:
1. Add to `WebSocketMessageType` enum
2. Add handler in `WebSocketHandlerService.processMessage()`
3. Define payload interface
4. Implement processing logic

### To Add a New Intervention Type:
1. Add to intervention types
2. Update `InterventionManager`
3. Handle in both WebSocket and SMS contexts
4. Update client to handle new intervention

## 🧪 Testing

### WebSocket Testing
```bash
# Test specific scenarios
bun run test:websocket:event
bun run test:websocket:email

# Test with interventions
bun test/websocket-intervention-test.ts

# Full integration test
bun run test:websocket:all
```

### Key Test Scenarios
1. **OAuth Required**: First-time service use
2. **Intervention Required**: Unknown entities
3. **Success Path**: Authenticated with known entities
4. **Error Handling**: Invalid commands, timeouts

## 📝 Summary

The WebSocket system provides a real-time alternative to SMS while sharing 90% of the core logic. The architecture maintains clean separation between:

- **Transport** (WebSocket vs SMS)
- **Processing** (shared ActionPlanner)
- **Integration** (shared Google services)
- **Context** (execution differences)

This design allows easy addition of new channels (Slack, Discord, API) while maintaining consistent behavior across all interfaces.