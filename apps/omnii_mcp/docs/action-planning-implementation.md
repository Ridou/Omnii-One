# Action Planning Implementation

## Overview

Handle complex messages that require multiple operations by decomposing them into an ordered sequence of atomic actions.

## Example Use Cases

- "List out events and create a grocery task where I have free time"

  1. List Google Calendar events
  2. Find free time slots
  3. Create Google Tasks item for groceries

- "Schedule a meeting tomorrow and add it to my task list"
  1. Create calendar event
  2. Create related task

## Implementation Strategy

### 1. Action Planner Service

```typescript
export interface ActionStep {
  type: "calendar" | "task" | "analysis" | "contact" | "email";
  action: string;
  params: any;
  description: string;
  id?: string;
  dependsOn?: string[];
}

export interface ActionPlan {
  steps: ActionStep[];
  originalMessage: string;
  summary: string;
}
```

### 2. Planning Flow

1. **Parse Message** → Use OpenAI to identify required actions
2. **Create Plan** → Generate ordered sequence of steps
3. **Execute Plan** → Run each step, passing results forward
4. **Synthesize Response** → Combine results into user-friendly message

### 3. Lightweight Implementation

#### ActionPlanner Class

```typescript
export class ActionPlanner {
  async createPlan(message: string): Promise<ActionPlan> {
    // Use OpenAI to decompose message into steps
  }

  async executePlan(
    plan: ActionPlan,
    context: ExecutionContext
  ): Promise<string> {
    // Execute each step in sequence
  }
}
```

#### Integration with SimpleSMSAI

```typescript
// In processMessage()
const actionPlan = await this.actionPlanner.createPlan(message);

if (actionPlan.steps.length > 1) {
  // Multi-step operation
  return await this.actionPlanner.executePlan(actionPlan, context);
} else {
  // Single operation - use existing handlers
  return await this.handleSingleAction(message, ...);
}
```

### 4. Step Types

#### Calendar Steps

- `list_events` - Get calendar events
- `find_free_time` - Analyze free slots
- `create_event` - Schedule new event

#### Task Steps

- `list_tasks` - Get tasks
- `create_task` - Add new task
- `update_task` - Modify existing task

#### Analysis Steps

- `find_conflicts` - Check scheduling conflicts
- `suggest_times` - Recommend optimal slots
- `summarize_schedule` - Overview of day/week

#### Contact Steps

- `search_contacts` - Search for contacts

#### Email Steps

- `create_draft` - Draft an email
- `send_email` - Send an email

### 5. Execution Context

```typescript
interface ExecutionContext {
  entityId: string;
  phoneNumber: string;
  userTimezone: string;
  localDatetime?: string;
  stepResults: Map<string, any>; // Results from previous steps
}
```

### 6. Example Flow

**Input**: "List out events and create a grocery task where I have free time"

**Planning Phase**:

```json
{
  "steps": [
    {
      "type": "calendar",
      "action": "list_events",
      "params": { "timeRange": "today" },
      "description": "Get today's calendar events"
    },
    {
      "type": "analysis",
      "action": "find_free_time",
      "params": { "duration": "30min" },
      "description": "Find 30min free slots"
    },
    {
      "type": "task",
      "action": "create_task",
      "params": {
        "title": "Buy groceries",
        "due": "{{free_time_slot}}"
      },
      "description": "Create grocery task in free time"
    }
  ]
}
```

**Execution Phase**:

1. Execute `list_events` → Store events in context
2. Execute `find_free_time` → Analyze events, find gaps
3. Execute `create_task` → Use free time slot for due date

**Response**: "📅 Found 2 free slots today. Created grocery task for 3:00 PM when you're free!"

### 7. File Structure

```
src/
├── services/
│   ├── action-planner.ts (NEW)
│   ├── sms-ai-simple.ts (UPDATE)
│   ├── calendar-manager.ts (EXISTING)
│   └── task-manager.ts (EXISTING)
└── types/
    └── action-planning.types.ts (NEW)
```

### 8. Benefits

- **Handles Complex Requests**: Multi-step operations in single message
- **Context Passing**: Results flow between steps
- **Flexible**: Easy to add new step types
- **Maintainable**: Clear separation of planning vs execution
- **User-Friendly**: Single response for complex operations

### 9. Implementation Priority

1. **Phase 1**: Basic action planner with 2-3 step types
2. **Phase 2**: Add analysis steps (free time finding)
3. **Phase 3**: Advanced context passing and result synthesis

This keeps it lightweight while enabling powerful multi-step workflows!

## Entity Recognition & Multi-Plugin Workflows

### Entity Recognition

- Use OpenAI to extract entities (PERSON, EMAIL, etc.) from user messages.
- Entities are used to resolve references (e.g., "John" → john@example.com via Google Contacts).

### Multi-Plugin Workflow Example

**User:** "Send an email to John about the meeting"

**Planning Phase:**

```json
[
  {
    "type": "contact",
    "action": "search_contacts",
    "params": { "query": "John" },
    "description": "Look up John in Google Contacts",
    "id": "contact_lookup_1"
  },
  {
    "type": "email",
    "action": "create_draft",
    "params": {
      "recipient_email": { "stepId": "contact_lookup_1", "field": "email" },
      "subject": "About the meeting"
    },
    "description": "Draft email to John about the meeting",
    "dependsOn": ["contact_lookup_1"]
  }
]
```

### Data Model

```typescript
export interface Entity {
  type: "PERSON" | "EMAIL" | "ORG" | "DATE" | string;
  value: string;
}

export interface ActionStep {
  type: ActionType;
  action: string;
  params: Record<string, any>; // can reference previous step results
  description: string;
  id?: string;
  dependsOn?: string[];
}
```

### Execution Logic

- When executing a step, if a param is an object with `{stepId, field}`, resolve it from `context.stepResults`.
- This enables chaining: e.g., contact lookup → email draft/send.

### Benefits

- **Automatic prerequisite resolution** (e.g., contact lookup before email send)
- **Composable multi-plugin workflows**
- **Extensible**: Add more entity types and plugin chains as needed

## Entity Recognition in the Planning & Execution Flow

### 1. Extract Entities

Use an LLM (e.g., OpenAI) to extract entities (people, emails, organizations, dates, etc.) from the user message **before** planning.

### 2. Decompose Tasks (Planning)

Pass the extracted entities to the action planner. The planner can use these entities to:

- Insert prerequisite steps (e.g., contact lookup before email if recipient is a PERSON)
- Fill in params for steps that require entity values

### 3. Execution Context

Pass the entities into the execution context so that each step can access them if needed.

### 4. Step Execution

When executing a step:

- Params can reference previous step results (via `{stepId, field}`)
- Params can also reference entities (e.g., `{entityType: "PERSON", value: "John"}`)
- The step executor resolves these references at runtime

### Example Flow

**User:** "Send an email to John about the meeting"

1. **Entity Recognition:**
   ```json
   [{ "type": "PERSON", "value": "John" }]
   ```
2. **Planning:**
   ```json
   [
     {
       "type": "contact",
       "action": "search_contacts",
       "params": { "query": "John" },
       "description": "Look up John in Google Contacts",
       "id": "contact_lookup_1"
     },
     {
       "type": "email",
       "action": "create_draft",
       "params": {
         "recipient_email": { "stepId": "contact_lookup_1", "field": "email" },
         "subject": "About the meeting"
       },
       "description": "Draft email to John about the meeting",
       "dependsOn": ["contact_lookup_1"]
     }
   ]
   ```
3. **Execution Context:**
   ```typescript
   const context: ExecutionContext = {
     entityId,
     phoneNumber,
     userTimezone,
     localDatetime,
     stepResults: new Map(),
     currentStepIndex: 0,
     entities, // <-- pass entities here
   };
   ```
4. **Execution:**
   - Step 1: resolves "John" to email
   - Step 2: uses that email for the draft

### Recommended Code Flow

```typescript
// 1. Entity recognition
const entities = await extractEntities(message);

// 2. Planning (pass entities to planner)
const plan = await actionPlanner.createPlan(message, entities);

// 3. Execution context
const context: ExecutionContext = {
  entityId,
  phoneNumber,
  userTimezone,
  localDatetime,
  stepResults: new Map(),
  currentStepIndex: 0,
  entities, // <-- add this
};

// 4. Execute
const result = await actionPlanner.executePlan(plan, context);
```

This flow ensures robust, context-aware, multi-plugin workflows that can handle real-world user requests.

## Comprehensive Implementation Plan: Entity Resolution & User Intervention System

### Current Implementation Analysis

#### Existing Components

- **`@action-planner.ts`**: Handles multi-step workflows with dependency management and param resolution
- **`@entity-recognizer.ts`**: Extracts entities using OpenAI
- **`@unified-google-manager.ts`**: Plugin system for Google services (Calendar, Tasks, Contacts, Email)
- **`@redis-cache.ts`**: Production-ready Redis client with TTL, graceful fallback, and error handling
- **SMS workflow**: Via Twilio for user communication

#### Gaps Identified

1. **No entity caching** - Each request re-resolves entities
2. **No user intervention mechanism** - Failed steps just fail
3. **No UNKNOWN entity handling** - Unresolved entities cause failures
4. **No state persistence** - Workflows can't pause/resume
5. **No SMS-driven approval flow** - Can't get user input mid-workflow

### Proposed High-Level Flow

#### Success Path Example: "Send email to John about the meeting"

```
1. Entity Recognition
   → Extract: [{type: "PERSON", value: "John"}]
   → Check Redis cache: entity:+1234567890:PERSON:John
   → Cache hit: john@example.com

2. Action Planning
   → Single step: email.create_draft
   → Params use cached email

3. Execution
   → Draft created successfully
   → SMS: "📝 Draft created for john@example.com"
```

#### Intervention Path Example: "Send email to Zogblar about the project"

```
1. Entity Recognition
   → Extract: [{type: "PERSON", value: "Zogblar"}]
   → Check Redis cache: entity:+1234567890:PERSON:Zogblar
   → Cache miss → Mark as UNKNOWN

2. Action Planning
   → Step 1: user_intervention (resolve unknown entity)
   → Step 2: email.create_draft (depends on step 1)

3. Execution
   → Step 1: Send SMS "Who is Zogblar? Reply with email address"
   → Store state in Redis: intervention:session123:step1
   → Block and wait (5 min timeout)
   → User replies: "zogblar@alien.com"
   → Cache entity: entity:+1234567890:PERSON:Zogblar → {email: "zogblar@alien.com"}
   → Step 2: Create draft with resolved email
```

#### Multi-Plugin Chain Example: "Schedule meeting with Sarah and add to tasks"

```
1. Entity Recognition
   → Extract: [{type: "PERSON", value: "Sarah"}]

2. Action Planning
   → Step 1: contact.search_contacts (query: "Sarah")
   → Step 2: calendar.create_event (attendee from step 1)
   → Step 3: task.create_task (related to calendar event)

3. Execution with Redis State
   → workflow:session456:step:contact1:status → "completed"
   → workflow:session456:step:calendar1:status → "completed"
   → workflow:session456:step:task1:status → "completed"
```

### Implementation Phases

#### Phase 1: Entity Caching with Redis

##### 1.1 Update `entity-recognizer.ts`

```typescript
import { redisCache } from "./redis-cache";

export async function resolveEntities(
  entities: Entity[],
  phoneNumber: string
): Promise<Entity[]> {
  const resolved = [];

  for (const entity of entities) {
    // Check cache first
    const cacheKey = `entity:${phoneNumber}:${entity.type}:${entity.value}`;
    const cached = await redisCache.get(cacheKey);

    if (cached) {
      resolved.push({ ...entity, ...cached });
    } else {
      resolved.push({ ...entity, type: "UNKNOWN" });
    }
  }

  return resolved;
}
```

##### 1.2 Update `ExecutionContext` type

```typescript
export interface ExecutionContext {
  // ... existing fields ...
  entities: Entity[];
  sessionId: string; // For Redis state tracking
  redisCache: typeof redisCache; // Direct access to cache
}
```

#### Phase 2: User Intervention Step

##### 2.1 Add to `action-planning.types.ts`

```typescript
export enum SystemActionType {
  USER_INTERVENTION = "user_intervention",
}

export interface UserInterventionParams {
  reason: string;
  entityToResolve?: Entity;
  timeout?: number; // Default 300 seconds
}
```

##### 2.2 Update `action-planner.ts` - Add intervention handler

```typescript
private async executeUserInterventionStep(
  step: ActionStep,
  context: ExecutionContext
): Promise<StepResult> {
  const params = step.params as UserInterventionParams;
  const stateKey = `intervention:${context.sessionId}:${step.id}`;

  // Store intervention state
  await redisCache.set(stateKey, {
    status: "waiting",
    reason: params.reason,
    entity: params.entityToResolve,
    timestamp: Date.now()
  }, params.timeout || 300);

  // Send SMS
  await twilioService.sendMessage({
    to: context.phoneNumber,
    body: `❓ ${params.reason}\n\nReply within 5 minutes.`
  });

  // Poll for response
  const timeout = (params.timeout || 300) * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const state = await redisCache.get(stateKey);

    if (state?.status === "resolved") {
      // Cache the resolved entity
      if (params.entityToResolve && state.resolvedValue) {
        const entityKey = `entity:${context.phoneNumber}:${params.entityToResolve.type}:${params.entityToResolve.value}`;
        await redisCache.set(entityKey, {
          email: state.resolvedValue,
          resolvedAt: Date.now()
        });
      }

      return {
        success: true,
        data: { resolvedValue: state.resolvedValue },
        message: `Resolved: ${state.resolvedValue}`,
        stepId: step.id
      };
    }

    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Timeout
  return {
    success: false,
    error: "User intervention timeout",
    stepId: step.id
  };
}
```

#### Phase 3: SMS Response Handler

##### 3.1 Update SMS webhook handler

```typescript
async function handleIncomingSMS(phoneNumber: string, message: string) {
  // Check for pending interventions
  const pattern = `intervention:*:*`;
  // Note: Need to implement Redis SCAN for pattern matching

  const interventionKey = await findPendingIntervention(phoneNumber);

  if (interventionKey) {
    const state = await redisCache.get(interventionKey);

    if (state?.status === "waiting") {
      // Update intervention state
      await redisCache.set(interventionKey, {
        ...state,
        status: "resolved",
        resolvedValue: message.trim(),
        resolvedAt: Date.now(),
      });

      // Send confirmation
      await twilioService.sendMessage({
        to: phoneNumber,
        body: "✅ Got it! Continuing with your request...",
      });

      return;
    }
  }

  // Normal message processing
  // ...
}
```

#### Phase 4: Plan Enhancement for Unknown Entities

##### 4.1 Update `createPlan` in `action-planner.ts`

```typescript
async createPlan(message: string, entities: Entity[]): Promise<ActionPlan> {
  // Check for unknown entities
  const unknownEntities = entities.filter(e => e.type === "UNKNOWN");

  if (unknownEntities.length > 0) {
    // Inject intervention steps before the main plan
    const interventionSteps = unknownEntities.map((entity, idx) => ({
      type: "system" as ActionType,
      action: SystemActionType.USER_INTERVENTION,
      params: {
        reason: `I don't recognize "${entity.value}". Please provide their email address:`,
        entityToResolve: entity,
        timeout: 300
      },
      description: `Resolve unknown entity: ${entity.value}`,
      id: `intervention_${idx}`
    }));

    // Get original plan
    const originalPlan = await this.createPlanWithLLM(message, entities);

    // Update dependencies
    if (originalPlan.steps.length > 0) {
      originalPlan.steps[0].dependsOn = interventionSteps.map(s => s.id);
    }

    return {
      ...originalPlan,
      steps: [...interventionSteps, ...originalPlan.steps]
    };
  }

  // Normal planning
  return this.createPlanWithLLM(message, entities);
}
```

#### Phase 5: Multi-Entity Resolution

##### 5.1 Sequential resolution with batching

```typescript
private async resolveMultipleUnknowns(
  entities: Entity[],
  context: ExecutionContext
): Promise<Map<string, string>> {
  const resolved = new Map();

  // Send single SMS for all unknowns
  let promptMessage = "I need help identifying these contacts:\n";
  entities.forEach((e, idx) => {
    promptMessage += `${idx + 1}. ${e.value}\n`;
  });
  promptMessage += "\nReply with format: 1:email1, 2:email2";

  // Store batch intervention state
  const batchKey = `intervention:${context.sessionId}:batch`;
  await redisCache.set(batchKey, {
    status: "waiting",
    entities: entities,
    timestamp: Date.now()
  }, 300);

  // ... rest of batch handling
}
```

#### Phase 6: Workflow State Management

##### 6.1 Add workflow tracking

```typescript
class WorkflowStateManager {
  async startWorkflow(sessionId: string, plan: ActionPlan): Promise<void> {
    const key = `workflow:${sessionId}:state`;
    await redisCache.set(
      key,
      {
        plan,
        status: "running",
        currentStep: 0,
        startedAt: Date.now(),
      },
      3600
    ); // 1 hour TTL
  }

  async updateStepStatus(
    sessionId: string,
    stepId: string,
    status: "pending" | "running" | "completed" | "failed"
  ): Promise<void> {
    const key = `workflow:${sessionId}:step:${stepId}:status`;
    await redisCache.set(key, status, 3600);
  }
}
```

### Default Behaviors

#### Error Recovery

- **Contact lookup fails**: Use UNKNOWN entity flow
- **Timeout on intervention**: Fail the step, notify user
- **Redis unavailable**: Disable caching, continue without intervention support

#### Multi-Entity Resolution

- Default: Sequential resolution with single batched SMS
- Fallback: Process what's known, skip unknowns

### File Modifications Summary

1. **`entity-recognizer.ts`**: Add cache lookup and UNKNOWN handling
2. **`action-planning.types.ts`**: Add intervention types
3. **`action-planner.ts`**: Add intervention execution and plan enhancement
4. **`sms-ai-simple.ts`**: Add intervention response handler
5. **`execution-context.ts`**: Add sessionId and cache reference
6. **New: `workflow-state-manager.ts`**: Centralize state management

### Key Advantages of Using Existing `@redis-cache.ts`

✅ Connection management already handled  
✅ Graceful fallback when Redis unavailable  
✅ TTL support built-in (default 1 hour)  
✅ Error handling and logging in place  
✅ Environment variable support (`REDIS_URL`, `DISABLE_REDIS`)  
✅ Lazy connection (doesn't block app startup)

This implementation plan leverages existing Redis infrastructure while adding robust entity resolution, user intervention, and state management capabilities.

## Non-Blocking Conversation Threads

### Problem Statement

The current implementation blocks when waiting for user intervention:

- `executeUserInterventionStep()` polls Redis in a while loop
- This blocks the entire conversation thread for up to 5 minutes
- Multiple SMS conversations cannot proceed independently
- Server resources are wasted on polling

### Solution: Event-Driven Architecture with Redis State

#### Core Concept

Instead of blocking execution, we:

1. **Persist workflow state** to Redis when intervention is needed
2. **Return immediately** with an intervention request
3. **Resume workflow** when user responds
4. **Process each SMS independently** without blocking

#### Implementation Plan

### Phase 1: Workflow State Persistence

#### 1.1 Enhanced Workflow State Model

```typescript
interface WorkflowState {
  sessionId: string;
  phoneNumber: string;
  plan: ActionPlan;
  executionContext: ExecutionContext;
  status: "running" | "waiting_intervention" | "completed" | "failed";
  currentStepIndex: number;
  stepResults: StepResult[];
  createdAt: number;
  updatedAt: number;
  interventionState?: {
    stepId: string;
    reason: string;
    entity?: Entity;
    waitingSince: number;
  };
}
```

#### 1.2 Redis Key Structure

```
workflows:{phoneNumber}:active -> Set of active session IDs
workflow:{sessionId} -> WorkflowState object
intervention:{phoneNumber}:{sessionId} -> Intervention details
entity:{phoneNumber}:{type}:{value} -> Cached entity resolution
```

### Phase 2: Non-Blocking Action Planner

#### 2.1 Split Execution into Resumable Chunks

```typescript
export class ActionPlanner {
  /**
   * Start or resume workflow execution
   */
  async executeWorkflow(
    sessionId: string,
    phoneNumber: string,
    plan?: ActionPlan,
    context?: ExecutionContext,
    resumeFromStep?: number
  ): Promise<WorkflowExecutionResult> {
    // Load or create workflow state
    const workflow = await this.loadOrCreateWorkflow(
      sessionId,
      phoneNumber,
      plan,
      context
    );

    // Execute steps until intervention needed or completion
    return await this.executeStepsUntilBlocked(workflow);
  }

  /**
   * Execute steps until blocked by intervention
   */
  private async executeStepsUntilBlocked(
    workflow: WorkflowState
  ): Promise<WorkflowExecutionResult> {
    const { plan, executionContext } = workflow;

    while (workflow.currentStepIndex < plan.steps.length) {
      const step = plan.steps[workflow.currentStepIndex];

      // Check for user intervention step
      if (step.action === SystemActionType.USER_INTERVENTION) {
        // Save state and return intervention request
        await this.saveWorkflowState(workflow, "waiting_intervention");

        return {
          status: "intervention_needed",
          message: step.params.reason,
          sessionId: workflow.sessionId,
          continueExecution: false,
        };
      }

      // Execute normal step
      const result = await this.executeStep(step, executionContext);
      workflow.stepResults.push(result);

      if (!result.success) {
        await this.saveWorkflowState(workflow, "failed");
        return {
          status: "failed",
          message: result.error || "Step failed",
          sessionId: workflow.sessionId,
        };
      }

      workflow.currentStepIndex++;
      await this.saveWorkflowState(workflow, "running");
    }

    // All steps completed
    const finalMessage = await this.synthesizeResponse(
      plan,
      workflow.stepResults,
      executionContext
    );

    await this.saveWorkflowState(workflow, "completed");
    await this.cleanupWorkflow(workflow.sessionId);

    return {
      status: "completed",
      message: finalMessage,
      sessionId: workflow.sessionId,
    };
  }
}
```

### Phase 3: SMS Handler Updates

#### 3.1 Non-Blocking Message Processing

```typescript
export class SimpleSMSAI {
  async processMessage(
    message: string,
    phoneNumber: string,
    localDatetime?: string
  ): Promise<SMSResponse> {
    // Check for intervention response FIRST
    const interventionResult = await this.handleInterventionResponse(
      phoneNumber,
      message
    );

    if (interventionResult) {
      // Resume the waiting workflow
      const workflow = await this.loadWorkflow(interventionResult.sessionId);

      if (workflow) {
        // Update resolved entity
        if (interventionResult.entity) {
          await this.cacheResolvedEntity(
            phoneNumber,
            interventionResult.entity,
            message.trim()
          );
        }

        // Resume workflow execution
        const result = await this.actionPlanner.executeWorkflow(
          workflow.sessionId,
          phoneNumber,
          null, // Use saved plan
          null, // Use saved context
          workflow.currentStepIndex + 1 // Resume from next step
        );

        return {
          success: true,
          message: result.message,
        };
      }
    }

    // New conversation - create workflow
    const sessionId = this.generateSessionId();
    const entities = await extractEntities(message);
    const resolvedEntities = await resolveEntities(entities, phoneNumber);
    const plan = await this.actionPlanner.createPlan(message, resolvedEntities);

    // Start non-blocking execution
    const result = await this.actionPlanner.executeWorkflow(
      sessionId,
      phoneNumber,
      plan,
      this.createExecutionContext(phoneNumber, sessionId, resolvedEntities)
    );

    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Check if message is responding to an intervention
   */
  private async handleInterventionResponse(
    phoneNumber: string,
    message: string
  ): Promise<InterventionResponse | null> {
    // Get active workflows for this phone number
    const activeWorkflows = await redisCache.get(
      `workflows:${phoneNumber}:active`
    );

    if (!activeWorkflows || activeWorkflows.length === 0) {
      return null;
    }

    // Check each active workflow for waiting interventions
    for (const sessionId of activeWorkflows) {
      const workflow = await redisCache.get(`workflow:${sessionId}`);

      if (workflow?.status === "waiting_intervention") {
        // This is the intervention response
        return {
          sessionId,
          entity: workflow.interventionState?.entity,
          resolvedValue: message.trim(),
        };
      }
    }

    return null;
  }
}
```

### Phase 4: Workflow Management

#### 4.1 Active Workflow Tracking

```typescript
class WorkflowManager {
  /**
   * Track active workflows per phone number
   */
  async addActiveWorkflow(
    phoneNumber: string,
    sessionId: string
  ): Promise<void> {
    const key = `workflows:${phoneNumber}:active`;
    const active = (await redisCache.get(key)) || [];
    active.push(sessionId);
    await redisCache.set(key, active, 3600); // 1 hour TTL
  }

  /**
   * Remove completed/failed workflows
   */
  async removeActiveWorkflow(
    phoneNumber: string,
    sessionId: string
  ): Promise<void> {
    const key = `workflows:${phoneNumber}:active`;
    const active = (await redisCache.get(key)) || [];
    const updated = active.filter((id) => id !== sessionId);
    await redisCache.set(key, updated, 3600);
  }

  /**
   * Clean up stale workflows (cron job)
   */
  async cleanupStaleWorkflows(): Promise<void> {
    // Implementation for cleaning up workflows older than 1 hour
    // This would be run periodically
  }
}
```

### Phase 5: Advanced Features

#### 5.1 Parallel Conversation Support

```typescript
interface ConversationContext {
  phoneNumber: string;
  activeWorkflows: WorkflowState[];
  lastMessageTime: number;
  conversationThread: string[]; // Recent messages for context
}
```

#### 5.2 Smart Intervention Matching

Instead of blocking on the first waiting workflow, intelligently match responses:

```typescript
async matchInterventionResponse(
  phoneNumber: string,
  message: string
): Promise<InterventionMatch | null> {
  const activeWorkflows = await this.getActiveWorkflows(phoneNumber);

  // Score each waiting intervention
  const matches = await Promise.all(
    activeWorkflows
      .filter(w => w.status === "waiting_intervention")
      .map(async (workflow) => {
        const score = await this.scoreInterventionMatch(
          message,
          workflow.interventionState
        );
        return { workflow, score };
      })
  );

  // Return best match above threshold
  const bestMatch = matches
    .filter(m => m.score > 0.7)
    .sort((a, b) => b.score - a.score)[0];

  return bestMatch ? {
    sessionId: bestMatch.workflow.sessionId,
    confidence: bestMatch.score
  } : null;
}
```

### Benefits

1. **Non-Blocking**: Server doesn't waste resources polling
2. **Scalable**: Can handle thousands of concurrent conversations
3. **Resilient**: Workflows persist across server restarts
4. **Flexible**: Users can respond to interventions hours later
5. **Context-Aware**: Maintains full conversation context

### Migration Strategy

1. **Phase 1**: Implement workflow persistence alongside existing code
2. **Phase 2**: Update SMS handler to check for interventions first
3. **Phase 3**: Refactor action planner to support resume
4. **Phase 4**: Remove blocking while loops
5. **Phase 5**: Add advanced features (parallel conversations, smart matching)

### Redis Usage Patterns

Following the patterns in `redis-cache.ts`:

```typescript
// Store workflow with TTL
await redisCache.set(`workflow:${sessionId}`, workflowState, 3600);

// Atomic operations for active workflows
const key = `workflows:${phoneNumber}:active`;
const active = (await redisCache.get(key)) || [];
// ... modify active list
await redisCache.set(key, active, 3600);

// Graceful degradation if Redis unavailable
if (!redisCache.isAvailable()) {
  // Fallback to synchronous execution
  return this.executeSynchronously(plan, context);
}
```

### Example Flow

**User 1 (+1234)**: "Send email to Unknown Person about meeting"

```
→ Create workflow:123abc
→ Execute until intervention needed
→ Save state, return "Who is Unknown Person?"
→ Non-blocking return
```

**User 2 (+5678)**: "Schedule meeting tomorrow"

```
→ Create workflow:456def
→ Execute completely (no intervention needed)
→ Return "Meeting scheduled"
```

**User 1 (+1234)**: "unknown@example.com"

```
→ Match to workflow:123abc
→ Resume execution from saved state
→ Complete email send
→ Return "Email sent!"
```

Both conversations proceed independently without blocking each other!
