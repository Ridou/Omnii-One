# Workflow Approval System - MVP Implementation

## Overview

The workflow approval system has been implemented as an MVP that allows users to review and approve multi-step workflows before execution. This system integrates with the existing WebSocket infrastructure and action planning system.

## What's Been Implemented

### 1. **Core Types & Enums** ✅

Added to `src/types/action-planning.types.ts`:

- `ApprovalState` enum for workflow states
- `RiskLevel` enum for assessing step risk
- `DependencyEffect` and `DependencyResolution` enums for dependency management
- `EditOperation` enum for workflow modifications
- `ApprovalStep` interface extending `ActionStep`
- `WorkflowDraft` interface extending `ActionPlan`
- `StepDependency` interface for simple dependency tracking

### 2. **WebSocket Message Types** ✅

Added to `src/types/websocket.types.ts`:

- `WorkflowDraftMessage` for presenting drafts to users
- `WorkflowApprovalMessage` for processing user approvals
- `StepExecutionMessage` for execution updates
- New `WebSocketMessageType` enum values for approval system

### 3. **ApprovalWorkflowManager Service** ✅

Created `src/services/approval-workflow-manager.ts`:

- **Draft Creation**: Convert ActionPlan to WorkflowDraft with approval-specific data
- **Risk Assessment**: Simple LOW/MEDIUM/HIGH risk calculation
- **Approval Processing**: Handle approve/reject/modify/cancel operations
- **Redis State Management**: Store and retrieve workflow drafts with TTL
- **WebSocket Integration**: Send drafts and updates to users
- **Execution**: Convert approved workflows back to ActionPlans for execution

### 4. **WebSocket Integration** ✅

Updated `src/services/websocket-handler.service.ts`:

- **Approval Detection**: Determine when to use approval system vs direct execution
- **Fallback Logic**: Gracefully degrade to direct execution if approval system fails
- **Message Routing**: Handle new approval message types
- **Backward Compatibility**: Existing SMS and direct WebSocket workflows unaffected

### 5. **Comprehensive Testing** ✅

Created `test/approval-workflow.test.ts`:

- Unit tests for ApprovalWorkflowManager core functionality
- Risk level calculation validation
- Approval processing workflow testing
- WebSocket integration testing
- Time estimation and duration calculation tests

## How to Use the System

### 1. **Automatic Approval Triggering**

The system automatically triggers approval workflows for:

- **Multi-action commands**: "Create event and send email"
- **High-risk actions**: "Send email", "Delete event", "Create event"

Simple queries like "List my events" continue to execute directly.

### 2. **WebSocket Message Flow**

**Step 1: User sends command**

```json
{
  "type": "command",
  "payload": {
    "commandType": "text_command",
    "message": "Send email to John about meeting and create calendar event",
    "userId": "user123"
  }
}
```

**Step 2: System responds with draft requirement**

```json
{
  "status": "success",
  "data": {
    "message": "Workflow draft created. Please review and approve via WebSocket.",
    "sessionId": "wf_1704067200000_abc123def",
    "requiresApproval": true
  }
}
```

**Step 3: User receives workflow draft**

```json
{
  "type": "WORKFLOW_DRAFT",
  "sessionId": "wf_1704067200000_abc123def",
  "payload": {
    "originalMessage": "Send email to John about meeting and create calendar event",
    "summary": "3-step workflow: Contact lookup → Email composition → Calendar event",
    "totalSteps": 3,
    "estimatedDuration": "1 minute",
    "steps": [
      {
        "id": "contact_1",
        "order": 1,
        "description": "Search for John in contacts",
        "action": "search_contacts",
        "riskLevel": "low",
        "estimatedTime": "10 seconds",
        "expectedOutcome": "Find John's email address",
        "approvalStatus": "draft_pending"
      },
      {
        "id": "email_1",
        "order": 2,
        "description": "Send email to John about meeting",
        "action": "send_email",
        "riskLevel": "high",
        "estimatedTime": "15 seconds",
        "dependencies": ["contact_1"],
        "expectedOutcome": "Email sent via Gmail",
        "approvalStatus": "draft_pending"
      }
    ],
    "risks": [
      {
        "stepId": "email_1",
        "level": "high",
        "description": "Will send an email from your Gmail account"
      }
    ]
  }
}
```

**Step 4: User approves workflow**

```json
{
  "type": "WORKFLOW_APPROVAL",
  "sessionId": "wf_1704067200000_abc123def",
  "payload": {
    "action": "approve_all"
  }
}
```

**Step 5: System executes and sends updates**

```json
{
  "type": "STEP_EXECUTION",
  "sessionId": "wf_1704067200000_abc123def",
  "payload": {
    "stepId": "workflow_complete",
    "status": "COMPLETED",
    "message": "Workflow completed successfully"
  }
}
```

### 3. **Approval Actions**

Users can perform these approval actions:

```typescript
// Approve all steps
{ "action": "approve_all" }

// Approve specific step
{ "action": "approve_step", "stepId": "email_1" }

// Reject specific step
{ "action": "reject_step", "stepId": "email_1", "reason": "Don't send email" }

// Modify step parameters
{
  "action": "modify_step",
  "stepId": "email_1",
  "modifications": { "subject": "Updated subject line" }
}

// Cancel entire workflow
{ "action": "cancel_all" }
```

## Risk Assessment

The system categorizes workflow steps by risk level:

### High Risk (Requires Approval)

- `send_email` - Sends actual email
- `create_event` - Creates calendar event

### Medium Risk (Recommended Approval)

- `create_draft` - Creates email draft
- `create_task` - Adds task to Google Tasks
- `create_contact` - Adds contact to Google Contacts

### Low Risk (Can Auto-Execute)

- `list_events` - Read-only calendar access
- `list_tasks` - Read-only task access
- `search_contacts` - Read-only contact search

## Redis State Management

### Key Structure

```
workflow:draft:{sessionId} → WorkflowDraft (TTL: 2 hours)
user:{userId}:workflows → [sessionId, ...] (TTL: 2 hours)
```

### Automatic Cleanup

- Draft workflows expire after 2 hours
- Completed workflows stored for 24 hours
- Failed/cancelled workflows cleaned up immediately

## Fallback Behavior

The system includes robust fallback mechanisms:

1. **Approval System Unavailable**: Falls back to direct execution
2. **Redis Failure**: Executes workflow directly with warning
3. **WebSocket Disconnection**: Workflows persist in Redis for reconnection
4. **ActionPlanner Errors**: Returns clear error messages to user

## Testing

Run the approval system tests:

```bash
npm test approval-workflow.test.ts
```

The test suite covers:

- ✅ Workflow draft creation
- ✅ Risk level calculation
- ✅ Approval processing (approve/reject/modify)
- ✅ Execution readiness detection
- ✅ Time estimation accuracy
- ✅ WebSocket integration logic

## Monitoring & Observability

The system includes comprehensive logging:

```typescript
// ApprovalWorkflowManager logs
console.log("[ApprovalWorkflowManager] Draft created:", sessionId);
console.log("[ApprovalWorkflowManager] Approval processed:", action);
console.error("[ApprovalWorkflowManager] Execution failed:", error);

// WebSocketHandlerService logs
console.log("WebSocket registered:", ws.id);
console.log("Falling back to direct processing...");
```

## Configuration

### Enable/Disable Approval System

Modify `shouldUseApprovalSystem()` in `WebSocketHandlerService`:

```typescript
private shouldUseApprovalSystem(payload: CommandPayload): boolean {
  // Disable approval system entirely
  return false;

  // Enable for all commands
  return true;

  // Use existing heuristics (default)
  const multiActionKeywords = ['and', 'then', 'also', 'plus'];
  const highRiskKeywords = ['send', 'delete', 'create event', 'email'];
  // ... existing logic
}
```

### Adjust Risk Levels

Modify `calculateRiskLevel()` in `ApprovalWorkflowManager`:

```typescript
private calculateRiskLevel(step: ActionStep): RiskLevel {
  const HIGH_RISK_ACTIONS = ["send_email", "create_event", "delete_event"];
  const MEDIUM_RISK_ACTIONS = ["create_draft", "create_task", "create_contact"];
  // ... risk assessment logic
}
```

### Configure Redis TTL

Modify `REDIS_KEYS` in `ApprovalWorkflowManager`:

```typescript
const REDIS_KEYS = {
  DRAFT_TTL: 4 * 60 * 60, // 4 hours instead of 2
  COMPLETED_TTL: 48 * 60 * 60, // 48 hours instead of 24
} as const;
```

## Next Steps (Future Phases)

### Phase 2: Production Hardening

- [ ] Timeout handling for approval decisions
- [ ] Enhanced error recovery and retry logic
- [ ] Performance optimization for large workflows
- [ ] Advanced dependency resolution

### Phase 3: Advanced Features

- [ ] Multi-user collaboration on workflows
- [ ] Conditional dependencies and complex dependency chains
- [ ] Approval policies and delegation
- [ ] Audit trail and compliance features

### Phase 4: Enterprise Features

- [ ] Advanced analytics and monitoring
- [ ] Integration with external approval systems
- [ ] Role-based approval permissions
- [ ] Workflow templates and automation

## Migration Strategy

The approval system is fully backward compatible:

1. **Existing SMS workflows** continue to work unchanged
2. **Existing WebSocket clients** receive direct execution for simple commands
3. **New approval flows** only trigger for complex/high-risk commands
4. **Feature flag ready** - can be disabled entirely if needed

## Performance Characteristics

**Latency Targets** (MVP):

- Draft creation: < 500ms
- Approval processing: < 200ms
- WebSocket message delivery: < 100ms

**Memory Usage**:

- Average workflow draft: ~2KB in Redis
- Maximum concurrent workflows per user: 10 (configurable)

**Scalability**:

- Current implementation: Single Redis instance
- Future: Redis cluster support for horizontal scaling

## Security Considerations

**Current MVP Security**:

- Workflow drafts stored with TTL in Redis
- No sensitive data logged in plaintext
- User identification via userId (not exposed externally)

**Future Security Enhancements**:

- Encrypted workflow storage
- Audit trail for all approval decisions
- Rate limiting for approval requests
- User permission model for workflow types

This MVP provides a solid foundation for the approval system while maintaining simplicity and reliability. The architecture is designed to scale and accommodate future complexity as needed.
