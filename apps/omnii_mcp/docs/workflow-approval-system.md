# Workflow Approval System Design

## Overview

This document outlines the implementation of a user-approval system for multi-step workflows, where users can review, approve, or reject each step before execution through WebSocket communication. The system builds on the existing action planning infrastructure while adding interactive approval gates.

## Core Concept

Instead of automatically executing planned workflows, the system:

1. **Plans the workflow** (existing action-planner logic)
2. **Presents a "draft"** to the user with full step breakdown
3. **Waits for user approval** on each step or the entire workflow
4. **Executes approved steps** while maintaining state
5. **Handles rejections** with alternative path suggestions

## Unified Type System

The approval system extends the existing `action-planning.types.ts` to maintain consistency:

### Base Types (Existing)

```typescript
// From action-planning.types.ts
enum StepState {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  WAITING_INTERVENTION = "waiting_intervention",
  TIMEOUT = "timeout",
}

enum PlanState {
  CREATED = "created",
  RUNNING = "running",
  WAITING_INTERVENTION = "waiting_intervention",
  COMPLETED = "completed",
  FAILED = "failed",
}

interface ActionStep {
  type: ActionType;
  action: string;
  params: Record<string, any>;
  description: string;
  id: string;
  dependsOn?: string[];
  state?: StepState;
  result?: StepResult;
  requires?: StepDependency[];
}

interface ActionPlan {
  steps: ActionStep[];
  originalMessage: string;
  summary: string;
  isMultiStep: boolean;
  currentStepIndex: number;
  state: PlanState;
}

interface ExecutionContext {
  entityId: string;
  phoneNumber: string;
  userTimezone: string;
  localDatetime?: string;
  stepResults: Map<string, any>;
  currentStepIndex: number;
  planState: PlanState;
  entities: Entity[];
  sessionId: string;
}

interface StepResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  stepId?: string;
  description?: string;
  state: StepState;
  timestamp: number;
}
```

### Extended Types for Approval System

```typescript
// Extensions for approval workflow
enum ApprovalState {
  DRAFT_PENDING = "draft_pending",
  STEP_APPROVED = "step_approved",
  STEP_REJECTED = "step_rejected",
  STEP_MODIFIED = "step_modified",
  WAITING_USER_APPROVAL = "waiting_user_approval",
  USER_CANCELLED = "user_cancelled",
}

enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

interface ApprovalStep extends ActionStep {
  // Inherited from ActionStep:
  // type, action, params, description, id, dependsOn, state, result, requires

  // Approval-specific properties
  approvalStatus: ApprovalState;
  riskLevel: RiskLevel;
  userFriendlyDescription: string;
  expectedOutcome: string;
  estimatedTime: string;
  requiredPermissions: string[];

  // Modification tracking
  isModified: boolean;
  originalParams?: Record<string, any>;
  userModifications?: Record<string, any>;
}

interface WorkflowDraft extends ActionPlan {
  // Inherited from ActionPlan:
  // steps, originalMessage, summary, isMultiStep, currentStepIndex, state

  // Approval workflow extensions
  phoneNumber: string;
  userId: string; // WebSocket identifier
  entities: Entity[];

  // Override steps to use ApprovalStep
  steps: ApprovalStep[];

  // Extended workflow structure
  dependencies: DependencyMap;
  estimatedDuration: string;

  // Approval state management
  approvalStatus: ApprovalState;
  approvedSteps: Set<string>;
  rejectedSteps: Set<string>;

  // Timestamps
  createdAt: number;
  lastInteraction: number;

  // Context
  executionContext: ExecutionContext;
}

interface DependencyMap {
  [stepId: string]: {
    dependsOn: string[];
    reason: string;
    isBlocking: boolean;
  };
}
```

## System Architecture

### Workflow States

```
┌─────────────────┐
│   User Message  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Entity Extract  │
│ & Recognition   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Action Planning │
│ (Create Draft)  │
│ PlanState.CREATED
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ DRAFT_PENDING   │◄─────┐
│ (User Review)   │      │
│ ApprovalState   │      │
└─────────┬───────┘      │
          │              │
          ▼              │
┌─────────────────┐      │
│ User Decision   │      │
├─────────────────┤      │
│ • APPROVE_ALL   │      │
│ • APPROVE_STEP  │      │
│ • REJECT_STEP   │      │
│ • MODIFY_STEP   │      │
│ • CANCEL_ALL    │      │
└─────────┬───────┘      │
          │              │
          ▼              │
┌─────────────────┐      │
│ STEP_EXECUTING  │      │
│ StepState.RUNNING│      │
└─────────┬───────┘      │
          │              │
          ▼              │
┌─────────────────┐      │
│ STEP_COMPLETED  │──────┘
│StepState.COMPLETED      │
│ (Next Step?)    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ WORKFLOW_DONE   │
│PlanState.COMPLETED
└─────────────────┘
```

## Redis State Schema

### Redis Key Structure

```
# Draft workflows awaiting approval (uses WorkflowDraft)
workflow:draft:{sessionId} → WorkflowDraft

# Active approval sessions by user
approvals:{userId}:active → Set<sessionId>

# Step execution state (uses StepState enum)
workflow:{sessionId}:step:{stepId}:status → StepState

# User preferences for auto-approval
user:{userId}:approval_preferences → ApprovalPreferences

# Intervention responses (uses existing intervention system)
intervention:{sessionId}:step:{stepId} → InterventionResponse
```

## WebSocket Message Types

### Draft Presentation Message

```typescript
interface WorkflowDraftMessage {
  type: "WORKFLOW_DRAFT";
  sessionId: string;
  payload: {
    originalMessage: string;
    summary: string;
    totalSteps: number;
    estimatedDuration: string;

    // Maps to ActionPlan.state
    planState: PlanState;

    steps: {
      id: string;
      order: number;
      description: string;

      // Uses existing ActionType enum
      type: ActionType;
      action:
        | CalendarActionType
        | TaskActionType
        | ContactActionType
        | EmailActionType
        | AnalysisActionType
        | SystemActionType;

      // Uses new RiskLevel enum
      riskLevel: RiskLevel;
      estimatedTime: string;
      dependencies: string[];
      expectedOutcome: string;

      // Uses existing StepState
      state: StepState;
      approvalStatus: ApprovalState;

      params: Record<string, any>; // Sanitized for user view
    }[];

    dependencies: DependencyMap;

    risks: {
      stepId: string;
      level: RiskLevel;
      description: string;
    }[];
  };
  timestamp: number;
}
```

### User Approval Message

```typescript
interface WorkflowApprovalMessage {
  type: "WORKFLOW_APPROVAL";
  sessionId: string;
  payload: {
    action:
      | "approve_all"
      | "approve_step"
      | "reject_step"
      | "modify_step"
      | "cancel_all";
    stepId?: string; // Required for step-specific actions
    modifications?: Record<string, any>; // For modify_step
    reason?: string; // Optional user reason for rejection
  };
  timestamp: number;
}
```

### Step Execution Update

```typescript
interface StepExecutionMessage {
  type: "STEP_EXECUTION";
  sessionId: string;
  payload: {
    stepId: string;

    // Uses existing StepState enum
    status: StepState;

    progress?: number; // 0-100
    message: string;

    // Uses existing StepResult structure
    result?: StepResult;

    nextStepId?: string; // What's coming next

    // Extends existing intervention system
    interventionRequired?: {
      reason: string;
      options: string[];
      timeout: number;
      // Uses existing UserInterventionParams structure
      params: UserInterventionParams;
    };
  };
  timestamp: number;
}
```

## Action Type Integration

### Mapping to Existing Action Types

The approval system uses the existing action type hierarchy:

```typescript
// From action-planning.types.ts
export type ActionType =
  | "calendar"
  | "task"
  | "contact"
  | "analysis"
  | "email"
  | "system";

export enum CalendarActionType {
  LIST_EVENTS = "list_events",
  CREATE_EVENT = "create_event",
  FIND_FREE_TIME = "find_free_time",
}

export enum TaskActionType {
  LIST_TASKS = "list_tasks",
  CREATE_TASK = "create_task",
  UPDATE_TASK = "update_task",
  COMPLETE_TASK = "complete_task",
}

export enum ContactActionType {
  SEARCH_CONTACTS = "search_contacts",
  GET_ALL_CONTACTS = "get_all_contacts",
  CREATE_CONTACT = "create_contact",
}

export enum EmailActionType {
  SEND_EMAIL = "send_email",
  CREATE_DRAFT = "create_draft",
  FETCH_EMAILS = "fetch_emails",
  // ... other email actions from action-planner.ts
}

export enum SystemActionType {
  USER_INTERVENTION = "user_intervention",
}
```

### Risk Level Mapping

```typescript
// Risk assessment for each action type
const ACTION_RISK_LEVELS: Record<string, RiskLevel> = {
  // Calendar actions
  [CalendarActionType.LIST_EVENTS]: RiskLevel.LOW,
  [CalendarActionType.CREATE_EVENT]: RiskLevel.MEDIUM,
  [CalendarActionType.FIND_FREE_TIME]: RiskLevel.LOW,

  // Task actions
  [TaskActionType.LIST_TASKS]: RiskLevel.LOW,
  [TaskActionType.CREATE_TASK]: RiskLevel.LOW,
  [TaskActionType.UPDATE_TASK]: RiskLevel.MEDIUM,
  [TaskActionType.COMPLETE_TASK]: RiskLevel.MEDIUM,

  // Contact actions
  [ContactActionType.SEARCH_CONTACTS]: RiskLevel.LOW,
  [ContactActionType.GET_ALL_CONTACTS]: RiskLevel.LOW,
  [ContactActionType.CREATE_CONTACT]: RiskLevel.MEDIUM,

  // Email actions (high risk for sends, low for reads)
  [EmailActionType.SEND_EMAIL]: RiskLevel.HIGH,
  [EmailActionType.CREATE_DRAFT]: RiskLevel.MEDIUM,
  [EmailActionType.FETCH_EMAILS]: RiskLevel.LOW,

  // System actions
  [SystemActionType.USER_INTERVENTION]: RiskLevel.LOW,
};
```

## User Interaction Flow

### 1. Draft Presentation

**User Input**: "Send email to John about the meeting and create a calendar event"

**System Response** (using unified types):

```json
{
  "type": "WORKFLOW_DRAFT",
  "sessionId": "wf_123abc",
  "payload": {
    "originalMessage": "Send email to John about the meeting and create a calendar event",
    "summary": "3-step workflow: Contact lookup → Email composition → Calendar event creation",
    "totalSteps": 3,
    "estimatedDuration": "2-3 minutes",
    "planState": "created",

    "steps": [
      {
        "id": "contact_lookup_1",
        "order": 1,
        "description": "Look up John in your Google Contacts",
        "type": "contact",
        "action": "search_contacts",
        "state": "pending",
        "approvalStatus": "draft_pending",
        "riskLevel": "low",
        "estimatedTime": "10 seconds",
        "dependencies": [],
        "expectedOutcome": "Find John's email address",
        "params": { "query": "John" }
      },
      {
        "id": "email_draft_1",
        "order": 2,
        "description": "Create email draft to John about the meeting",
        "type": "email",
        "action": "create_draft",
        "state": "pending",
        "approvalStatus": "draft_pending",
        "riskLevel": "medium",
        "estimatedTime": "30 seconds",
        "dependencies": ["contact_lookup_1"],
        "expectedOutcome": "Draft email created in Gmail",
        "params": {
          "subject": "About the meeting",
          "recipient": "{{contact_lookup_1.email}}"
        }
      },
      {
        "id": "calendar_event_1",
        "order": 3,
        "description": "Create calendar event for the meeting",
        "type": "calendar",
        "action": "create_event",
        "state": "pending",
        "approvalStatus": "draft_pending",
        "riskLevel": "medium",
        "estimatedTime": "20 seconds",
        "dependencies": [],
        "expectedOutcome": "Meeting scheduled in Google Calendar",
        "params": {
          "title": "Meeting with John",
          "attendees": ["{{contact_lookup_1.email}}"]
        }
      }
    ],

    "dependencies": {
      "email_draft_1": {
        "dependsOn": ["contact_lookup_1"],
        "reason": "Need John's email address before creating draft",
        "isBlocking": true
      },
      "calendar_event_1": {
        "dependsOn": ["contact_lookup_1"],
        "reason": "Need John's email for calendar invite",
        "isBlocking": false
      }
    },

    "risks": [
      {
        "stepId": "email_draft_1",
        "level": "medium",
        "description": "Will create a draft in your Gmail account"
      },
      {
        "stepId": "calendar_event_1",
        "level": "medium",
        "description": "Will create an event in your Google Calendar"
      }
    ]
  }
}
```

### 2. Step-by-Step Execution (using StepResult)

As each step executes, user receives real-time updates using the existing StepResult structure:

```json
{
  "type": "STEP_EXECUTION",
  "sessionId": "wf_123abc",
  "payload": {
    "stepId": "contact_lookup_1",
    "status": "completed",
    "message": "Found John Doe (john.doe@company.com)",
    "result": {
      "success": true,
      "data": {
        "name": "John Doe",
        "email": "john.doe@company.com",
        "phone": "+1234567890"
      },
      "message": "Contact found successfully",
      "stepId": "contact_lookup_1",
      "description": "Look up John in your Google Contacts",
      "state": "completed",
      "timestamp": 1704067200000
    },
    "nextStepId": "email_draft_1"
  }
}
```

## Intervention Handling (using existing system)

### Scenario: Unknown Contact (extends UserInterventionParams)

When a contact lookup fails, the system uses the existing intervention system:

```json
{
  "type": "STEP_EXECUTION",
  "sessionId": "wf_123abc",
  "payload": {
    "stepId": "contact_lookup_1",
    "status": "waiting_intervention",
    "message": "Could not find 'John' in your contacts",
    "interventionRequired": {
      "reason": "Contact not found. Please provide John's email address:",
      "options": [
        "Enter email address",
        "Skip this step",
        "Search with different name"
      ],
      "timeout": 300,
      "params": {
        "reason": "I don't recognize \"John\". Please provide their email address:",
        "entityToResolve": {
          "type": "PERSON",
          "value": "John"
        },
        "timeout": 300,
        "state": "waiting_intervention",
        "timestamp": 1704067200000
      }
    }
  }
}
```

## State Management Patterns

### Draft Creation Flow (extends ActionPlan)

1. **Receive user message** via WebSocket
2. **Extract entities** using existing Entity type
3. **Create action plan** using existing ActionPlanner.createPlan()
4. **Convert ActionPlan to WorkflowDraft**:
   ```typescript
   const workflowDraft: WorkflowDraft = {
     ...actionPlan, // Inherits: steps, originalMessage, summary, isMultiStep, currentStepIndex, state
     phoneNumber,
     userId,
     entities,
     dependencies: buildDependencyMap(actionPlan.steps),
     estimatedDuration: calculateDuration(actionPlan.steps),
     approvalStatus: ApprovalState.DRAFT_PENDING,
     approvedSteps: new Set(),
     rejectedSteps: new Set(),
     createdAt: Date.now(),
     lastInteraction: Date.now(),
     executionContext,
   };
   ```
5. **Store draft in Redis**
6. **Send draft to user** via WebSocket

### Approval Processing Flow (updates existing states)

1. **Receive approval message** via WebSocket
2. **Load WorkflowDraft from Redis**
3. **Update step approvalStatus**:
   ```typescript
   step.approvalStatus = ApprovalState.STEP_APPROVED;
   step.state = StepState.PENDING; // Ready for execution
   ```
4. **Check dependencies** using existing dependency system
5. **Start execution** using existing ActionPlanner.executeStep()
6. **Update StepState** as execution progresses
7. **Send StepResult** via WebSocket

## Integration with Existing ActionPlanner

### Workflow Execution

The approval system integrates seamlessly with the existing ActionPlanner:

```typescript
class ApprovalWorkflowManager {
  constructor(private actionPlanner: ActionPlanner) {}

  async executeApprovedWorkflow(
    draft: WorkflowDraft
  ): Promise<PlanExecutionResult> {
    // Convert back to ActionPlan for execution
    const actionPlan: ActionPlan = {
      steps: draft.steps.filter(
        (s) => s.approvalStatus === ApprovalState.STEP_APPROVED
      ),
      originalMessage: draft.originalMessage,
      summary: draft.summary,
      isMultiStep: draft.isMultiStep,
      currentStepIndex: draft.currentStepIndex,
      state: draft.state,
    };

    // Use existing ActionPlanner execution
    return await this.actionPlanner.executePlan(
      actionPlan,
      draft.executionContext
    );
  }
}
```

### Type Compatibility

All approval system types extend or use existing action planning types:

- `WorkflowDraft extends ActionPlan`
- `ApprovalStep extends ActionStep`
- Uses existing `StepState`, `PlanState`, `ActionType` enums
- Uses existing `ExecutionContext`, `StepResult`, `Entity` interfaces
- Extends existing `UserInterventionParams` for intervention handling

## Advanced Features

### Approval Preferences (using existing action types)

```typescript
interface ApprovalPreferences {
  autoApprove: {
    lowRiskSteps: boolean;
    actionTypes: ActionType[]; // Uses existing ActionType enum
    specificActions: (
      | CalendarActionType
      | TaskActionType
      | ContactActionType
    )[];
    maxStepsWithoutConfirmation: number;
  };
  alwaysConfirm: {
    highRiskActions: boolean;
    actionTypes: ActionType[]; // Uses existing ActionType enum
    emailSends: boolean; // Maps to EmailActionType.SEND_EMAIL
    calendarWrites: boolean; // Maps to CalendarActionType.CREATE_EVENT
  };
  notifications: {
    stepStateChanges: StepState[]; // Uses existing StepState enum
    planStateChanges: PlanState[]; // Uses existing PlanState enum
    interventionRequired: boolean;
  };
}
```

## Implementation Benefits

### Unified Type System

- **Zero type duplication** - extends existing action planning types
- **Consistent state management** - uses existing StepState and PlanState
- **Seamless integration** - approval system works with existing ActionPlanner
- **Type safety** - leverages existing enum definitions and interfaces

### Backward Compatibility

- **Existing workflows continue working** - no breaking changes to ActionPlanner
- **Gradual adoption** - approval system can be enabled per user/workflow
- **Fallback support** - graceful degradation when approval system unavailable

### Developer Experience

- **Single source of truth** - all types defined in action-planning.types.ts
- **IntelliSense support** - full type completion across approval and execution
- **Consistent patterns** - same type conventions used throughout system

This unified approach ensures the approval system is a natural extension of the existing action planning infrastructure rather than a separate system with duplicate concepts.

## Simple Dependency Management & Draft Editing

### Core Strategy: 80% Coverage with Simple Patterns

Rather than building a complex dependency engine that handles every edge case, we focus on **three dependency types** and **four resolution strategies** that cover the vast majority of real-world scenarios. This approach keeps the system simple, predictable, and easy to reason about.

#### The 80/20 Philosophy

**80% of dependency scenarios** fall into these patterns:

- User rejects a step that another step needs data from
- User modifies a step that other steps reference
- Steps that can run independently but work better together
- Optional enhancements that don't block execution

**Simple patterns handle these elegantly**:

- Clear dependency declarations upfront
- Automatic conflict detection
- User-friendly resolution options
- Graceful fallbacks when data is missing

### Core Dependency Patterns

The approval system needs to handle dependencies simply but safely. Here's a minimal typed approach:

```typescript
enum DependencyEffect {
  BLOCKS = "blocks", // Step cannot run without dependency
  ENHANCES = "enhances", // Step runs better with dependency data
  OPTIONAL = "optional", // Step can run without dependency
}

enum DependencyResolution {
  WAIT = "wait", // Wait for dependency to complete
  SKIP = "skip", // Skip this step
  FALLBACK = "fallback", // Use fallback behavior
  ASK_USER = "ask_user", // Request user decision
}

interface StepDependency {
  stepId: string;
  field?: string; // Specific field needed from dependency
  effect: DependencyEffect;
  resolution: DependencyResolution;
  fallbackValue?: any;
}

interface DependencyState {
  stepId: string;
  dependencies: StepDependency[];
  canExecute: boolean;
  blockedBy: string[]; // Step IDs blocking execution
  reason?: string; // Why step is blocked
}
```

### Real-World Dependency Scenarios

#### Scenario A: BLOCKS Dependency (Hard Requirement)

```typescript
// Email step absolutely needs contact email
{
  stepId: "email_draft_1",
  dependencies: [{
    stepId: "contact_lookup_1",
    field: "email",
    effect: DependencyEffect.BLOCKS,
    resolution: DependencyResolution.ASK_USER
  }]
}

// If contact lookup fails/rejected → Ask user what to do
// Options: "Provide email manually", "Skip email step", "Retry contact lookup"
```

#### Scenario B: ENHANCES Dependency (Nice to Have)

```typescript
// Task works better with meeting title but doesn't require it
{
  stepId: "task_creation_1",
  dependencies: [{
    stepId: "calendar_event_1",
    field: "title",
    effect: DependencyEffect.ENHANCES,
    resolution: DependencyResolution.FALLBACK,
    fallbackValue: "Follow up on meeting"
  }]
}

// If calendar step modified/skipped → Use fallback title automatically
```

#### Scenario C: OPTIONAL Dependency (Additional Context)

```typescript
// Contact lookup provides extra context but task can run without it
{
  stepId: "task_creation_1",
  dependencies: [{
    stepId: "contact_lookup_1",
    field: "phone",
    effect: DependencyEffect.OPTIONAL,
    resolution: DependencyResolution.SKIP
  }]
}

// If contact lookup unavailable → Just skip this data, task runs normally
```

### The Power of Simple Patterns

This **3x4 matrix** (3 effects × 4 resolutions) handles the vast majority of workflow dependencies:

| Effect       | WAIT        | SKIP        | FALLBACK    | ASK_USER    |
| ------------ | ----------- | ----------- | ----------- | ----------- |
| **BLOCKS**   | ⚠️ Risky    | ✅ Safe     | ⚠️ Risky    | ✅ **Best** |
| **ENHANCES** | ✅ Good     | ✅ Safe     | ✅ **Best** | ✅ Good     |
| **OPTIONAL** | ❌ Wasteful | ✅ **Best** | ✅ Good     | ❌ Annoying |

**Key insights:**

- **BLOCKS + ASK_USER**: Let user decide critical dependencies
- **ENHANCES + FALLBACK**: Graceful degradation with defaults
- **OPTIONAL + SKIP**: Don't bother user with non-essential data

### Simple Edit Operations

```typescript
enum EditOperation {
  MODIFY_PARAMS = "modify_params",
  SKIP_STEP = "skip_step",
  APPROVE_STEP = "approve_step",
  REJECT_STEP = "reject_step",
}

interface StepEdit {
  stepId: string;
  operation: EditOperation;
  newParams?: Record<string, any>;
  reason?: string;
}

interface DraftEdit {
  sessionId: string;
  edits: StepEdit[];
  timestamp: number;
}
```

### Dependency Resolution Logic

#### Scenario 1: Required Dependency Rejected

```typescript
// User rejects contact lookup, but email step needs the email address
{
  "stepId": "email_draft_1",
  "dependencies": [{
    "stepId": "contact_lookup_1",
    "field": "email",
    "effect": "BLOCKS",
    "resolution": "ASK_USER"
  }],
  "canExecute": false,
  "blockedBy": ["contact_lookup_1"],
  "reason": "Contact lookup was rejected - email address needed"
}

// System presents options to user:
{
  "type": "DEPENDENCY_CONFLICT",
  "sessionId": "wf_123abc",
  "payload": {
    "blockedStep": "email_draft_1",
    "missingDependency": "contact_lookup_1",
    "options": [
      "Provide email address manually",
      "Skip email step",
      "Re-approve contact lookup"
    ]
  }
}
```

#### Scenario 2: Enhanced Dependency Modified

```typescript
// User modifies calendar event title, but task step references it
{
  "stepId": "task_creation_1",
  "dependencies": [{
    "stepId": "calendar_event_1",
    "field": "title",
    "effect": "ENHANCES",
    "resolution": "FALLBACK",
    "fallbackValue": "Meeting follow-up task"
  }],
  "canExecute": true,
  "blockedBy": [],
  "reason": "Will use fallback title if calendar step modified"
}
```

### Draft State Management

```typescript
interface WorkflowDraftState {
  // Base workflow
  draft: WorkflowDraft;

  // Dependency tracking
  dependencyStates: Map<string, DependencyState>;

  // Edit history
  edits: DraftEdit[];

  // Execution readiness
  readySteps: string[]; // Steps that can execute now
  blockedSteps: string[]; // Steps waiting on dependencies
  skippedSteps: string[]; // Steps user chose to skip

  // Simple validation
  isValid: boolean;
  validationErrors: string[];
}
```

### Simple Validation Rules

```typescript
interface ValidationRule {
  name: string;
  check: (draft: WorkflowDraft) => ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const BASIC_VALIDATION_RULES: ValidationRule[] = [
  {
    name: "has_executable_steps",
    check: (draft) => ({
      isValid: draft.steps.some(
        (s) => s.approvalStatus === ApprovalState.STEP_APPROVED
      ),
      errors: draft.steps.every(
        (s) => s.approvalStatus === ApprovalState.STEP_REJECTED
      )
        ? ["All steps were rejected - nothing to execute"]
        : [],
      warnings: [],
    }),
  },

  {
    name: "dependencies_satisfied",
    check: (draft) => {
      const blocked = draft.steps.filter(
        (step) =>
          step.approvalStatus === ApprovalState.STEP_APPROVED &&
          step.dependsOn?.some((depId) => {
            const dep = draft.steps.find((s) => s.id === depId);
            return !dep || dep.approvalStatus !== ApprovalState.STEP_APPROVED;
          })
      );

      return {
        isValid: blocked.length === 0,
        errors: blocked.map(
          (s) => `Step "${s.description}" has unmet dependencies`
        ),
        warnings: [],
      };
    },
  },
];
```

### User Edit Flow

#### 1. Parameter Modification

```json
{
  "type": "WORKFLOW_EDIT",
  "sessionId": "wf_123abc",
  "payload": {
    "operation": "modify_params",
    "stepId": "email_draft_1",
    "newParams": {
      "subject": "Updated Meeting Subject",
      "body": "Custom email body here"
    }
  }
}
```

**System Response:**

```json
{
  "type": "EDIT_RESULT",
  "sessionId": "wf_123abc",
  "payload": {
    "success": true,
    "updatedStep": {
      "id": "email_draft_1",
      "isModified": true,
      "approvalStatus": "step_modified"
    },
    "dependencyImpacts": [
      {
        "stepId": "task_creation_1",
        "impact": "will_use_fallback",
        "message": "Task will use default title since email was modified"
      }
    ]
  }
}
```

#### 2. Step Rejection with Dependency Chain

```json
{
  "type": "WORKFLOW_EDIT",
  "sessionId": "wf_123abc",
  "payload": {
    "operation": "reject_step",
    "stepId": "contact_lookup_1",
    "reason": "I already know John's email"
  }
}
```

**System Response:**

```json
{
  "type": "DEPENDENCY_CONFLICT",
  "sessionId": "wf_123abc",
  "payload": {
    "rejectedStep": "contact_lookup_1",
    "affectedSteps": [
      {
        "stepId": "email_draft_1",
        "issue": "Needs email address from contact lookup",
        "resolution": "ask_user"
      },
      {
        "stepId": "calendar_event_1",
        "issue": "Needs email for invite",
        "resolution": "ask_user"
      }
    ],
    "options": [
      "Provide John's email address manually",
      "Skip email and calendar steps",
      "Re-approve contact lookup"
    ]
  }
}
```

### WebSocket Messages for Editing

```typescript
interface WorkflowEditMessage {
  type: "WORKFLOW_EDIT";
  sessionId: string;
  payload: {
    operation: EditOperation;
    stepId: string;
    newParams?: Record<string, any>;
    reason?: string;
  };
}

interface EditResultMessage {
  type: "EDIT_RESULT";
  sessionId: string;
  payload: {
    success: boolean;
    error?: string;
    updatedStep?: ApprovalStep;
    dependencyImpacts?: DependencyImpact[];
    validationResult?: ValidationResult;
  };
}

interface DependencyConflictMessage {
  type: "DEPENDENCY_CONFLICT";
  sessionId: string;
  payload: {
    conflictType: "missing_dependency" | "modified_dependency";
    affectedSteps: string[];
    options: ConflictResolutionOption[];
    autoResolution?: DependencyResolution;
  };
}

interface ConflictResolutionOption {
  action: string;
  description: string;
  impact: string;
}
```

### Simple State Transitions

```typescript
class SimpleDraftManager {
  async applyEdit(draft: WorkflowDraft, edit: StepEdit): Promise<EditResult> {
    switch (edit.operation) {
      case EditOperation.MODIFY_PARAMS:
        return this.modifyStepParams(draft, edit.stepId, edit.newParams);

      case EditOperation.APPROVE_STEP:
        return this.approveStep(draft, edit.stepId);

      case EditOperation.REJECT_STEP:
        return this.rejectStep(draft, edit.stepId);

      case EditOperation.SKIP_STEP:
        return this.skipStep(draft, edit.stepId);
    }
  }

  private async modifyStepParams(
    draft: WorkflowDraft,
    stepId: string,
    newParams: Record<string, any>
  ): Promise<EditResult> {
    const step = draft.steps.find((s) => s.id === stepId);
    if (!step) return { success: false, error: "Step not found" };

    // Store original params for rollback
    step.originalParams = step.originalParams || { ...step.params };
    step.userModifications = newParams;
    step.params = { ...step.params, ...newParams };
    step.isModified = true;
    step.approvalStatus = ApprovalState.STEP_MODIFIED;

    // Check dependency impacts
    const impacts = this.checkDependencyImpacts(draft, stepId);

    return {
      success: true,
      updatedStep: step,
      dependencyImpacts: impacts,
    };
  }

  private checkDependencyImpacts(
    draft: WorkflowDraft,
    modifiedStepId: string
  ): DependencyImpact[] {
    return draft.steps
      .filter((s) => s.dependsOn?.includes(modifiedStepId))
      .map((dependentStep) => ({
        stepId: dependentStep.id,
        impact: this.determineDependencyImpact(dependentStep, modifiedStepId),
        message: `Step "${dependentStep.description}" may be affected`,
      }));
  }
}
```

### Key Design Principles

1. **Simple State Model**: Only 4 approval states, clear transitions
2. **Explicit Dependencies**: Each step declares exactly what it needs
3. **User Choice**: When conflicts arise, present clear options
4. **Graceful Degradation**: Steps can often work with fallback values
5. **Undo-able**: Keep original params for easy rollback

### Why This Approach Works

**🎯 Covers Common Cases**: 80% of dependency scenarios fit these patterns  
**🧠 Easy to Reason About**: Clear rules for each dependency type  
**⚡ Fast Implementation**: Simple state machine, minimal complexity  
**🔧 User-Friendly**: Clear options when conflicts occur  
**📈 Extensible**: Easy to add new dependency types later

**Example Growth Path**:

- **Phase 1**: Implement BLOCKS, ENHANCES, OPTIONAL
- **Phase 2**: Add CONDITIONAL dependencies
- **Phase 3**: Add COMPUTED dependencies
- **Phase 4**: Add BATCHED dependencies

This approach handles 80% of dependency scenarios with simple, typed patterns while keeping the door open for more complex flows later.

## Critical Analysis & Implementation Gaps

While the 80/20 approach provides a solid foundation, several areas need consideration for production readiness:

### 1. **User Experience & Session Management**

**Missing: Timeout & Resume Logic**

```typescript
// Current: User approval waits indefinitely
// Problem: What if user walks away for hours?
interface ApprovalTimeout {
  timeoutMs: number;
  defaultAction: "auto_approve" | "auto_reject" | "save_draft";
  reminderIntervals: number[];
}

// Missing: Draft persistence across sessions
interface DraftSession {
  userId: string;
  sessionId: string;
  lastActiveAt: number;
  autoSaveEnabled: boolean;
  expiresAt: number;
}
```

**Decision Fatigue Concern**: Complex workflows with many dependencies could overwhelm users with too many approval decisions. Need smart grouping and batch approval patterns.

### 2. **Complex Dependency Scenarios**

**The 3×4 matrix handles common cases, but misses:**

```typescript
// Conditional Dependencies
interface ConditionalDependency extends StepDependency {
  condition: {
    stepId: string;
    field: string;
    operator: "equals" | "exists" | "greater_than";
    value: any;
  };
}

// Multi-field Dependencies
interface MultiFieldDependency extends StepDependency {
  requiredFields: string[];
  requireAll: boolean; // AND vs OR logic
}

// Circular Dependency Detection
// Current: No protection against A depends on B depends on A
```

**Real-world complexity example:**

- Email step needs contact email (BLOCKS)
- BUT if contact lookup fails, can use manual email (conditional fallback)
- AND if it's a VIP contact, always ask user (conditional escalation)

### 3. **State Synchronization & Concurrency**

**Missing: Multi-user Collaboration**

```typescript
// What if multiple users try to edit same workflow?
interface WorkflowLock {
  lockedBy: string;
  lockedAt: number;
  lockType: "exclusive" | "optimistic";
  conflictResolution: "latest_wins" | "merge" | "reject";
}

// Concurrent WebSocket clients for same user
interface ClientSync {
  clients: Set<string>;
  syncStrategy: "broadcast_all" | "primary_only";
  conflictStrategy: "latest_wins" | "user_choice";
}
```

### 4. **Error Recovery & Fault Tolerance**

**Critical gaps:**

```typescript
// WebSocket disconnection during approval
interface DisconnectionRecovery {
  reconnectStrategy: "resume_where_left" | "restart_workflow";
  stateRecoveryTtl: number;
  fallbackToSms: boolean;
}

// Partial execution failures
interface PartialFailureHandling {
  completedSteps: string[];
  failedStep: string;
  remainingSteps: string[];
  userOptions: [
    "retry_failed",
    "skip_failed",
    "rollback_all",
    "continue_remaining"
  ];
}

// Redis/state store failures
interface StatelessFallback {
  degradedMode: boolean;
  fallbackToSyncExecution: boolean;
  notifyUserOfLimitedFunctionality: boolean;
}
```

### 5. **Security & Authorization Model**

**Currently missing entirely:**

```typescript
interface ApprovalPermissions {
  canApproveSteps: ActionType[];
  canModifyParams: string[]; // Field-level permissions
  canSkipMandatorySteps: boolean;
  requiresSecondaryApproval: {
    stepTypes: ActionType[];
    approverRole: string;
  };
}

interface AuditTrail {
  userId: string;
  action: "approved" | "rejected" | "modified" | "skipped";
  stepId: string;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  reason?: string;
}
```

### 6. **Performance & Scalability Concerns**

**Potential bottlenecks:**

```typescript
// Large workflow memory usage
interface ScalabilityLimits {
  maxStepsPerWorkflow: number; // What's reasonable? 50? 500?
  maxConcurrentWorkflowsPerUser: number;
  maxDependencyDepth: number; // Prevent deep chains
  messagePayloadSizeLimit: number; // WebSocket limits
}

// Redis memory optimization
interface StateOptimization {
  compressLargePayloads: boolean;
  useRedisStreams: boolean; // For audit trail
  partitionByUserId: boolean; // Shard across Redis instances
  cleanupCompletedWorkflows: number; // TTL in hours
}
```

### 7. **Integration Complexity**

**ActionPlanner integration gaps:**

```typescript
// Current ActionPlanner expects immediate execution
// Need bridge pattern:
interface ApprovalActionPlanner extends ActionPlanner {
  // Override to support approval gates
  async executePlan(plan: ActionPlan, context: ExecutionContext): Promise<PlanExecutionResult> {
    // Convert to WorkflowDraft
    // Wait for approvals
    // Execute approved steps
    // Handle interventions within approval flow
  }
}

// Hybrid workflows (some steps auto, some require approval)
interface StepApprovalPolicy {
  stepId: string;
  requiresApproval: boolean;
  autoApprovalRules: ApprovalRule[];
  escalationRules: EscalationRule[];
}
```

### 8. **Missing Observability**

**Production monitoring needs:**

```typescript
interface ApprovalMetrics {
  // Business metrics
  averageApprovalTime: number;
  approvalRate: number; // % of steps approved vs rejected
  commonRejectionReasons: string[];

  // Technical metrics
  dependencyConflictRate: number;
  workflowCompletionRate: number;
  averageWorkflowComplexity: number;

  // User experience
  decisionFatigueScore: number; // Steps requiring decisions / total steps
  sessionAbandonmentRate: number;
}

interface AlertingRules {
  stuckWorkflows: { thresholdMinutes: number };
  highRejectionRate: { thresholdPercent: number };
  systemOverload: { maxConcurrentWorkflows: number };
}
```

### 9. **Development & Testing Challenges**

**Missing dev tools:**

- **Dependency Graph Visualizer**: Complex workflows need visual debugging
- **Approval Flow Testing**: Unit tests for dependency resolution logic
- **State Inspection Tools**: Redis debugging for workflow states
- **Performance Profiling**: Approval overhead vs direct execution

### 10. **Strategic Concerns**

**Fundamental questions to address:**

1. **User Adoption**: Will users actually use approval gates or find them annoying?
2. **Performance Trade-off**: Is approval overhead worth the control?
3. **Complexity Creep**: How to prevent the "simple" system from becoming complex?
4. **Migration Strategy**: How to transition existing auto-execution users?

### Recommended Implementation Phases

**Phase 1: MVP (Current Design)**

- 3 dependency types, 4 resolution strategies
- Basic WebSocket approval flow
- Simple Redis state management

**Phase 2: Production Hardening**

- Timeout handling and session management
- Basic error recovery and fault tolerance
- Performance optimization and limits

**Phase 3: Advanced Features**

- Multi-user collaboration
- Complex dependency types
- Security and audit trail

**Phase 4: Enterprise Features**

- Advanced analytics and monitoring
- Approval policies and delegation
- Integration with external systems

### Key Decision Points

1. **Start simple** with the 80/20 approach ✅
2. **Plan for complexity** but don't build it upfront
3. **Measure user behavior** to guide feature priorities
4. **Build escape hatches** for when simple patterns aren't enough

The current design is a solid foundation, but production deployment will require addressing these gaps systematically.

## Phase 1: MVP Implementation Guide

### Scope & Objectives

**Goal**: Create a working approval system that provides immediate value while establishing a foundation for future complexity.

**Success Criteria**:

- Users can review and approve/reject workflow drafts via WebSocket
- Basic dependency resolution (3 types, 4 strategies)
- State persistence in Redis with TTL cleanup
- Integration with existing ActionPlanner
- Graceful fallback when approval system unavailable

### Core Features for Phase 1

#### 1. **Essential Types & Enums**

```typescript
// action-planning.types.ts - Add to existing file
export enum ApprovalState {
  DRAFT_PENDING = "draft_pending",
  STEP_APPROVED = "step_approved",
  STEP_REJECTED = "step_rejected",
  STEP_MODIFIED = "step_modified",
  USER_CANCELLED = "user_cancelled",
}

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum DependencyEffect {
  BLOCKS = "blocks",
  ENHANCES = "enhances",
  OPTIONAL = "optional",
}

export enum DependencyResolution {
  WAIT = "wait",
  SKIP = "skip",
  FALLBACK = "fallback",
  ASK_USER = "ask_user",
}

export enum EditOperation {
  APPROVE_STEP = "approve_step",
  REJECT_STEP = "reject_step",
  MODIFY_PARAMS = "modify_params",
  CANCEL_ALL = "cancel_all",
}
```

#### 2. **Core Interfaces**

```typescript
// Extend existing ActionStep
export interface ApprovalStep extends ActionStep {
  approvalStatus: ApprovalState;
  riskLevel: RiskLevel;
  estimatedTime: string;
  expectedOutcome: string;

  // Modification tracking
  isModified: boolean;
  originalParams?: Record<string, any>;
  userModifications?: Record<string, any>;
}

// Extend existing ActionPlan
export interface WorkflowDraft extends ActionPlan {
  userId: string; // WebSocket identifier
  phoneNumber: string;
  entities: Entity[];

  // Override steps to use ApprovalStep
  steps: ApprovalStep[];

  // Approval-specific state
  approvalStatus: ApprovalState;
  estimatedDuration: string;

  // Timestamps
  createdAt: number;
  lastInteraction: number;

  // Context for execution
  executionContext: ExecutionContext;
}

// Simple dependency for MVP
export interface StepDependency {
  stepId: string;
  field?: string;
  effect: DependencyEffect;
  resolution: DependencyResolution;
  fallbackValue?: any;
}
```

#### 3. **WebSocket Message Schema**

```typescript
// websocket.types.ts - Add to existing file
export interface WorkflowDraftMessage {
  type: "WORKFLOW_DRAFT";
  sessionId: string;
  payload: {
    originalMessage: string;
    summary: string;
    totalSteps: number;
    estimatedDuration: string;

    steps: {
      id: string;
      order: number;
      description: string;
      type: ActionType;
      action: string;
      riskLevel: RiskLevel;
      estimatedTime: string;
      dependencies: string[];
      expectedOutcome: string;
      state: StepState;
      approvalStatus: ApprovalState;
      params: Record<string, any>;
    }[];

    risks: {
      stepId: string;
      level: RiskLevel;
      description: string;
    }[];
  };
  timestamp: number;
}

export interface WorkflowApprovalMessage {
  type: "WORKFLOW_APPROVAL";
  sessionId: string;
  payload: {
    action:
      | "approve_all"
      | "approve_step"
      | "reject_step"
      | "modify_step"
      | "cancel_all";
    stepId?: string;
    modifications?: Record<string, any>;
    reason?: string;
  };
  timestamp: number;
}

export interface StepExecutionMessage {
  type: "STEP_EXECUTION";
  sessionId: string;
  payload: {
    stepId: string;
    status: StepState;
    progress?: number;
    message: string;
    result?: StepResult;
    nextStepId?: string;
  };
  timestamp: number;
}
```

#### 4. **Redis Key Structure (MVP)**

```typescript
// Simple, focused key patterns
const REDIS_KEYS = {
  // Workflow drafts awaiting approval
  WORKFLOW_DRAFT: (sessionId: string) => `workflow:draft:${sessionId}`,

  // Active workflows per user (for cleanup)
  USER_WORKFLOWS: (userId: string) => `user:${userId}:workflows`,

  // Simple TTL: 2 hours for drafts, 24 hours for completed
  DRAFT_TTL: 2 * 60 * 60, // 2 hours
  COMPLETED_TTL: 24 * 60 * 60, // 24 hours
} as const;
```

#### 5. **Core Services**

```typescript
// approval-workflow-manager.ts
export class ApprovalWorkflowManager {
  constructor(
    private actionPlanner: ActionPlanner,
    private websocketHandler: WebSocketHandlerService
  ) {}

  async createWorkflowDraft(
    message: string,
    userId: string,
    phoneNumber: string,
    entities: Entity[]
  ): Promise<WorkflowDraft> {
    // 1. Create ActionPlan using existing planner
    const actionPlan = await this.actionPlanner.createPlan(message, entities);

    // 2. Convert to WorkflowDraft
    const draft: WorkflowDraft = {
      ...actionPlan,
      userId,
      phoneNumber,
      entities,
      steps: actionPlan.steps.map((step) => this.enhanceStepForApproval(step)),
      approvalStatus: ApprovalState.DRAFT_PENDING,
      estimatedDuration: this.calculateEstimatedDuration(actionPlan.steps),
      createdAt: Date.now(),
      lastInteraction: Date.now(),
      executionContext: this.createExecutionContext(
        userId,
        phoneNumber,
        entities
      ),
    };

    // 3. Store in Redis
    await this.storeDraft(draft);

    // 4. Send to user via WebSocket
    await this.sendDraftToUser(draft);

    return draft;
  }

  async processApproval(
    sessionId: string,
    approval: WorkflowApprovalMessage["payload"]
  ): Promise<void> {
    // 1. Load draft from Redis
    const draft = await this.loadDraft(sessionId);
    if (!draft) throw new Error("Draft not found");

    // 2. Apply approval action
    switch (approval.action) {
      case "approve_all":
        await this.approveAllSteps(draft);
        break;
      case "approve_step":
        await this.approveStep(draft, approval.stepId!);
        break;
      case "reject_step":
        await this.rejectStep(draft, approval.stepId!, approval.reason);
        break;
      case "modify_step":
        await this.modifyStep(draft, approval.stepId!, approval.modifications!);
        break;
      case "cancel_all":
        await this.cancelWorkflow(draft);
        return;
    }

    // 3. Check if ready to execute
    if (this.isReadyForExecution(draft)) {
      await this.executeApprovedWorkflow(draft);
    } else {
      // Save updated draft and wait for more approvals
      await this.storeDraft(draft);
    }
  }

  private enhanceStepForApproval(step: ActionStep): ApprovalStep {
    return {
      ...step,
      approvalStatus: ApprovalState.DRAFT_PENDING,
      riskLevel: this.calculateRiskLevel(step),
      estimatedTime: this.estimateStepTime(step),
      expectedOutcome: this.generateExpectedOutcome(step),
      isModified: false,
    };
  }

  private calculateRiskLevel(step: ActionStep): RiskLevel {
    // Simple risk assessment for MVP
    const HIGH_RISK_ACTIONS = ["send_email", "create_event"];
    const MEDIUM_RISK_ACTIONS = [
      "create_draft",
      "create_task",
      "create_contact",
    ];

    if (HIGH_RISK_ACTIONS.includes(step.action)) return RiskLevel.HIGH;
    if (MEDIUM_RISK_ACTIONS.includes(step.action)) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
}
```

### Phase 1 Implementation Boundaries

#### ✅ **Include in MVP**

1. **Basic approval flow**: approve/reject/modify individual steps
2. **Simple dependency handling**: BLOCKS, ENHANCES, OPTIONAL with basic resolutions
3. **WebSocket communication**: draft presentation and approval messages
4. **Redis persistence**: workflow drafts with TTL cleanup
5. **Risk assessment**: simple LOW/MEDIUM/HIGH classification
6. **ActionPlanner integration**: convert plans to drafts and back
7. **Basic validation**: ensure at least one step approved before execution

#### ❌ **Exclude from MVP**

1. **Complex dependencies**: conditional, multi-field, circular detection
2. **Multi-user collaboration**: workflow locking, concurrent editing
3. **Advanced timeout handling**: just use Redis TTL for now
4. **Security & permissions**: single user per workflow for MVP
5. **Audit trail**: basic logging only, no persistent audit
6. **Performance optimization**: handle basic load, optimize later
7. **Batch operations**: one-by-one approval only
8. **Rollback capabilities**: simple "cancel all" only

### Implementation Priority

#### Week 1: Foundation

- [ ] Add approval types to `action-planning.types.ts`
- [ ] Create `ApprovalWorkflowManager` service
- [ ] Basic Redis operations (store/load drafts)

#### Week 2: WebSocket Integration

- [ ] Add approval message types to `websocket.types.ts`
- [ ] Update `WebSocketHandlerService` to handle approval messages
- [ ] Create draft-to-WebSocket message conversion

#### Week 3: Core Logic

- [ ] Implement approval state transitions
- [ ] Basic dependency resolution (simple cases only)
- [ ] Integration with existing `ActionPlanner`

#### Week 4: Testing & Polish

- [ ] Unit tests for approval logic
- [ ] Integration tests with WebSocket flow
- [ ] Basic error handling and fallbacks

### Success Metrics for MVP

**Functional**:

- Users can approve/reject workflows via WebSocket
- Approved workflows execute using existing ActionPlanner
- Dependency conflicts show user-friendly options
- System gracefully handles Redis unavailability

**Technical**:

- < 500ms latency for approval operations
- Workflows auto-cleanup after 2 hours in Redis
- Zero data loss during approval process
- Existing SMS workflow unaffected

**User Experience**:

- Clear step descriptions and risk levels
- Obvious approval/rejection options
- Real-time execution updates
- Simple error messages

### MVP Deployment Strategy

1. **Feature Flag**: Enable approval system for select users only
2. **Fallback**: Auto-approve all steps if approval system fails
3. **Monitoring**: Basic logging for approval decisions and timings
4. **Rollback Plan**: Disable feature flag to revert to direct execution

This MVP provides immediate value while establishing patterns for future complexity. The boundaries are designed to deliver a working system quickly while avoiding premature optimization.
