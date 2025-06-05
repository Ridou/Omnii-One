# Simple Action Planner Integration Plan

## Overview

Integrate TaskManager, TemporalContextManager, and CalendarManager into ActionPlanner using **simple heuristics** and **minimal complexity**. Focus on the 80/20 rule - handle the most common use cases with the simplest possible implementation.

## Core Philosophy: Keep It Simple

### **Heuristic-Based Approach**

- **Message keywords** determine actions (not complex AI planning)
- **Simple rules** over complex logic
- **Common patterns** over edge cases
- **Fast execution** over perfect optimization

### **Integration Strategy**

- **Extend existing ActionPlanner** (don't rebuild)
- **Add simple detection methods** for task and temporal operations
- **Use existing managers** as-is (minimal changes)
- **Fallback to current behavior** when unsure

## Simple Message Classification Heuristics

### **1. Calendar Operations** (Already Working ✅)

```typescript
// Current working logic
isCalendarMessage(message: string): boolean {
  return message.includes("calendar") || message.includes("meeting") ||
         message.includes("event") || message.includes("schedule") ||
         message.includes("list") || message.includes("show");
}
```

### **2. Task Operations** (Add to ActionPlanner)

```typescript
isTaskMessage(message: string): boolean {
  const msg = message.toLowerCase();
  return msg.includes("task") || msg.includes("todo") ||
         msg.includes("remind") || msg.includes("add") ||
         (msg.includes("create") && (msg.includes("task") || msg.includes("todo")));
}
```

### **3. Temporal/Free Time Operations** (Add to ActionPlanner)

```typescript
isTemporalMessage(message: string): boolean {
  const msg = message.toLowerCase();
  return (msg.includes("free time") || msg.includes("available") ||
          msg.includes("when can") || msg.includes("find time")) &&
         (msg.includes("calendar") || msg.includes("schedule"));
}
```

### **4. Multi-Step Detection** (Simple Heuristic)

```typescript
isMultiStepMessage(message: string): boolean {
  const msg = message.toLowerCase();
  // Look for "and" connecting different operations
  return (msg.includes(" and ") || msg.includes(" then ")) &&
         (this.isCalendarMessage(msg) || this.isTaskMessage(msg) || this.isTemporalMessage(msg));
}
```

## Minimal ActionPlanner Enhancement

### **Current Structure** (Keep As-Is)

```typescript
export class ActionPlanner {
  private calendarManager: CalendarManager; // ✅ Already integrated
  private taskManager: TaskManager; // ✅ Already integrated
  private temporalContextManager: TemporalContextManager; // ✅ Already integrated
}
```

### **Simple Message Router** (Add This)

```typescript
async processMessage(
  message: string,
  phoneNumber: string,
  entityId: string,
  userTimezone: string,
  localDatetime?: string
): Promise<{ success: boolean; message: string; error?: string }> {

  // Simple heuristic routing
  if (this.isMultiStepMessage(message)) {
    return await this.handleMultiStep(message, phoneNumber, entityId, userTimezone, localDatetime);
  }

  if (this.isCalendarMessage(message)) {
    return await this.handleCalendarOnly(message, phoneNumber, entityId, userTimezone, localDatetime);
  }

  if (this.isTaskMessage(message)) {
    return await this.handleTaskOnly(message, phoneNumber, entityId, userTimezone, localDatetime);
  }

  if (this.isTemporalMessage(message)) {
    return await this.handleTemporalOnly(message, phoneNumber, entityId, userTimezone, localDatetime);
  }

  // Fallback to existing behavior
  return { success: true, message: "I can help with calendar events and tasks. Try 'list my events' or 'add task: buy groceries'" };
}
```

## Simple Multi-Step Patterns

### **Pattern 1: List + Analyze** (Most Common)

```
"List my events and find time for groceries"
"Show my calendar and when am I free"
"What meetings do I have and when can I work out"
```

**Simple Implementation:**

```typescript
async handleListAndAnalyze(message: string, context: ExecutionContext): Promise<string> {
  // Step 1: Get calendar events (suppress SMS)
  const events = await this.calendarManager.listEvents(
    context.entityId, context.userTimezone, context.phoneNumber, true
  );

  // Step 2: Find free time using temporal manager
  const freeTime = this.temporalContextManager.findFreeTimeSlots(
    events.rawEvents || [], 30, context.userTimezone
  );

  // Step 3: Combine results
  return this.combineCalendarAndFreeTime(events.message, freeTime);
}
```

### **Pattern 2: Create + List** (Common)

```
"Add task: buy groceries and show my tasks"
"Create meeting tomorrow and list my events"
```

**Simple Implementation:**

```typescript
async handleCreateAndList(message: string, context: ExecutionContext): Promise<string> {
  // Step 1: Create item (calendar or task)
  const createResult = await this.handleCreate(message, context);

  // Step 2: List items (suppress SMS)
  const listResult = await this.handleList(message, context, true);

  // Step 3: Combine results
  return `${createResult.message}\n\n${listResult.message}`;
}
```

## Heuristic-Based Step Detection

### **Simple Pattern Matching**

```typescript
private detectSteps(message: string): ActionStep[] {
  const steps: ActionStep[] = [];
  const msg = message.toLowerCase();

  // Heuristic 1: List operations (always first)
  if (msg.includes("list") || msg.includes("show") || msg.includes("what")) {
    if (msg.includes("event") || msg.includes("meeting") || msg.includes("calendar")) {
      steps.push({ type: "calendar", action: "list_events", description: "List calendar events" });
    }
    if (msg.includes("task") || msg.includes("todo")) {
      steps.push({ type: "task", action: "list_tasks", description: "List tasks" });
    }
  }

  // Heuristic 2: Free time analysis (after list)
  if (msg.includes("free time") || msg.includes("available") || msg.includes("when")) {
    steps.push({ type: "analysis", action: "find_free_time", description: "Find free time slots" });
  }

  // Heuristic 3: Create operations (usually last)
  if (msg.includes("add") || msg.includes("create") || msg.includes("schedule")) {
    if (msg.includes("task") || msg.includes("todo")) {
      steps.push({ type: "task", action: "create_task", description: "Create new task" });
    }
    if (msg.includes("meeting") || msg.includes("event")) {
      steps.push({ type: "calendar", action: "create_event", description: "Create calendar event" });
    }
  }

  return steps;
}
```

## Temporal Context Integration (Simple)

### **Use Existing TemporalContextManager As-Is**

```typescript
// No changes needed - just call existing methods
private async analyzeFreetime(events: any[], userTimezone: string): Promise<string> {
  const analysis = this.temporalContextManager.findFreeTimeSlots(
    events, 30, userTimezone
  );

  return this.formatFreeTimeAnalysis(analysis);
}

private formatFreeTimeAnalysis(analysis: FreeTimeAnalysis): string {
  let message = "🕐 Free time analysis:\n\n";

  if (analysis.optimalSlots.length > 0) {
    message += `✨ OPTIMAL SLOTS (${analysis.optimalSlots.length}):\n`;
    analysis.optimalSlots.slice(0, 3).forEach((slot, index) => {
      message += `${index + 1}. ${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()} (${slot.duration}min)\n`;
    });
  }

  if (analysis.suggestions.length > 0) {
    message += `\n💡 ${analysis.suggestions.join(", ")}`;
  }

  return message;
}
```

## Task Manager Integration (Simple)

### **Use Existing TaskManager As-Is**

```typescript
// No changes needed - just call existing methods
private async handleTaskOperation(message: string, context: ExecutionContext, suppressSMS: boolean = false): Promise<string> {
  if (message.toLowerCase().includes("list")) {
    const result = await this.taskManager.listTasks(
      context.entityId, context.userTimezone, context.phoneNumber, {}, suppressSMS
    );
    return result.message;
  } else {
    const result = await this.taskManager.processTaskOperation(
      message, context.phoneNumber, context.entityId, context.userTimezone, context.localDatetime
    );
    return result.message;
  }
}
```

## Implementation Steps (Minimal Changes)

### **Step 1: Add Simple Message Detection** (5 minutes)

```typescript
// Add to ActionPlanner class
private isTaskMessage(message: string): boolean { /* simple keyword check */ }
private isTemporalMessage(message: string): boolean { /* simple keyword check */ }
private isMultiStepMessage(message: string): boolean { /* look for "and" */ }
```

### **Step 2: Add Simple Router** (10 minutes)

```typescript
// Replace complex createPlan() with simple routing
async processMessage(message, phoneNumber, entityId, userTimezone, localDatetime) {
  if (this.isMultiStepMessage(message)) {
    return await this.handleMultiStep(/* ... */);
  }
  // ... other simple routes
}
```

### **Step 3: Add Common Patterns** (15 minutes)

```typescript
// Handle the 3 most common multi-step patterns
private async handleListAndAnalyze() { /* list events + find free time */ }
private async handleCreateAndList() { /* create item + list items */ }
private async handleAnalyzeAndCreate() { /* find free time + create in slot */ }
```

### **Step 4: Update SimpleSMSAI** (5 minutes)

```typescript
// In SimpleSMSAI, replace complex logic with simple call
return await this.actionPlanner.processMessage(
  message,
  phoneNumber,
  entityId,
  localDatetime
);
```

## Benefits of This Simple Approach

### **Minimal Code Changes**

- **No refactoring** of existing managers
- **No complex AI planning** - just simple heuristics
- **Fallback behavior** preserves current functionality

### **Fast & Reliable**

- **Keyword-based detection** is instant
- **Predictable behavior** - no AI unpredictability
- **Easy to debug** - clear logic flow

### **Easy to Extend**

- **Add new patterns** by adding simple methods
- **New keywords** just extend detection functions
- **No complex state management**

## Common Use Cases Covered (80/20 Rule)

### **✅ Single Operations** (60% of usage)

- "List my events" → Calendar list
- "Add task: buy groceries" → Task creation
- "When am I free?" → Free time analysis

### **✅ List + Analyze** (25% of usage)

- "List events and find free time"
- "Show calendar and when can I work out"

### **✅ Create + List** (10% of usage)

- "Add task and show my tasks"
- "Create meeting and list events"

### **✅ Analyze + Create** (5% of usage)

- "Find free time and schedule workout"
- "When am I available and add task then"

## What We DON'T Build (Keep It Simple)

### **❌ Complex AI Planning**

- No OpenAI calls for step decomposition
- No complex dependency analysis
- No dynamic step generation

### **❌ Advanced Temporal Logic**

- No complex scheduling optimization
- No multi-calendar coordination
- No advanced conflict resolution

### **❌ Complex State Management**

- No persistent step state
- No complex error recovery
- No transaction management

## Final Implementation

### **Total Code Addition: ~100 lines**

- Simple message detection: 30 lines
- Simple routing: 20 lines
- Common patterns: 50 lines

### **Total Time: ~1 hour**

- Implementation: 35 minutes
- Testing: 15 minutes
- Documentation: 10 minutes

This approach gives you **80% of the functionality with 20% of the complexity** while keeping the system simple, fast, and maintainable.
