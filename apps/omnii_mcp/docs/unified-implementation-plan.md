# Unified SMS AI Implementation Plan

## Core Vision: Google Tasks as Salience Tracker

**Strong Opinion**: Use Google Tasks as the persistent memory layer for LLM context management. Tasks become "top of mind" items that persist across conversations and degrade gracefully over time.

## Architecture Overview

```
SMS Message → ActionPlanner → [Calendar + Tasks + Temporal] → Synthesized Response
                ↓
            Salience Tracker (Google Tasks)
                ↓
            Persistent Context Memory
```

## 1. Google Tasks as Salience Infrastructure

### Task Lists as Context Categories

```typescript
enum SalienceTaskList {
  TOP_OF_MIND = "🧠 Top of Mind", // High priority, recent topics
  PERSISTENT_TOPICS = "📌 Persistent", // Long-term important items
  CONTEXT_MEMORY = "💭 Context Memory", // LLM conversation context
  TEMPORAL_PRIORITIES = "⏰ Time Sensitive", // Urgent/deadline items
}
```

### Task Metadata for Salience Scoring

```typescript
interface SalienceTask {
  id: string;
  title: string;
  notes: string; // JSON metadata
  due?: Date; // Temporal urgency
  status: "needsAction" | "completed";

  // Metadata in notes field
  metadata: {
    salienceScore: number; // 0-100 relevance score
    lastMentioned: Date; // When user last referenced
    mentionCount: number; // How often discussed
    contextType: "topic" | "reminder" | "preference" | "fact";
    temporalDecay: number; // How fast importance fades
    relatedEvents: string[]; // Calendar event IDs
  };
}
```

## 2. Unified Service Architecture

### Core Services Integration

```typescript
export class UnifiedSMSAI {
  private actionPlanner: ActionPlanner;
  private calendarManager: CalendarManager;
  private taskManager: TaskManager;
  private salienceTracker: SalienceTracker; // NEW
  private temporalManager: TemporalManager; // NEW
}
```

### Salience Tracker Service

```typescript
export class SalienceTracker {
  // Track what's "top of mind" for user
  async updateTopOfMind(
    topic: string,
    context: ConversationContext
  ): Promise<void>;

  // Get current high-priority context
  async getActiveContext(entityId: string): Promise<SalienceContext>;

  // Temporal decay of importance
  async decayOldContext(): Promise<void>;

  // Extract persistent topics from conversation
  async extractPersistentTopics(
    message: string,
    history: SalienceTask[]
  ): Promise<string[]>;
}
```

## 3. Implementation Strategy

### Phase 1: Salience Foundation (Week 1)

#### 1.1 Create Salience Tracker

```typescript
// src/services/salience-tracker.ts
export class SalienceTracker {
  private taskManager: TaskManager;

  async initializeSalienceLists(entityId: string): Promise<void> {
    // Create the 4 salience task lists if they don't exist
  }

  async updateTopOfMind(
    entityId: string,
    topic: string,
    importance: number
  ): Promise<void> {
    // Add/update task in "Top of Mind" list
    // Include salience metadata in notes
  }
}
```

#### 1.2 Enhanced Action Planner

```typescript
// src/services/enhanced-action-planner.ts
export class EnhancedActionPlanner extends ActionPlanner {
  private salienceTracker: SalienceTracker;

  async createContextAwarePlan(
    message: string,
    salienceContext: SalienceContext
  ): Promise<ActionPlan> {
    // Use salience context to inform planning
    // Prioritize actions related to high-salience topics
  }
}
```

### Phase 2: Temporal Integration (Week 2)

#### 2.1 Temporal Manager

```typescript
// src/services/temporal-manager.ts
export class TemporalManager {
  // Calculate temporal relevance (0-1 score)
  calculateTemporalRelevance(timestamp: Date): number {
    const now = new Date();
    const hoursSince = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

    if (hoursSince < 2) return 1.0; // Last 2 hours: 100%
    if (hoursSince < 24) return 0.8; // Today: 80%
    if (hoursSince < 168) return 0.6; // This week: 60%
    if (hoursSince < 720) return 0.2; // This month: 20%
    return 0.05; // Older: 5%
  }

  // Find optimal time slots with salience awareness
  findSalienceAwareTimeSlots(
    events: CalendarEvent[],
    salienceContext: SalienceContext,
    duration: number
  ): TimeSlot[] {
    // Prioritize slots based on both calendar availability
    // and salience context (e.g., user's peak focus times)
  }
}
```

#### 2.2 Context Decay System

```typescript
// Automatic salience decay
setInterval(async () => {
  await salienceTracker.decayOldContext();
}, 1000 * 60 * 60); // Every hour

// In SalienceTracker
async decayOldContext(): Promise<void> {
  const allSalienceTasks = await this.getAllSalienceTasks();

  for (const task of allSalienceTasks) {
    const metadata = JSON.parse(task.notes);
    const temporalRelevance = this.temporalManager.calculateTemporalRelevance(
      new Date(metadata.lastMentioned)
    );

    // Decay salience score
    metadata.salienceScore *= temporalRelevance;

    // Archive if too low
    if (metadata.salienceScore < 10) {
      await this.archiveTask(task);
    } else {
      await this.updateTaskMetadata(task.id, metadata);
    }
  }
}
```

### Phase 3: Smart Context Management (Week 3)

#### 3.1 Conversation Context Extraction

```typescript
// Extract topics from conversation and update salience
async processConversation(
  message: string,
  phoneNumber: string,
  entityId: string
): Promise<void> {
  // Use OpenAI to extract topics
  const topics = await this.extractTopics(message);

  // Update salience for mentioned topics
  for (const topic of topics) {
    await this.salienceTracker.updateTopOfMind(
      entityId,
      topic.name,
      topic.importance
    );
  }

  // Check for persistent patterns
  const persistentTopics = await this.salienceTracker.extractPersistentTopics(
    message,
    await this.salienceTracker.getActiveContext(entityId)
  );

  // Update persistent topics list
  for (const topic of persistentTopics) {
    await this.salienceTracker.addToPersistentTopics(entityId, topic);
  }
}
```

#### 3.2 Context-Aware Response Generation

```typescript
async generateContextAwareResponse(
  message: string,
  context: ExecutionContext
): Promise<string> {
  // Get current salience context
  const salienceContext = await this.salienceTracker.getActiveContext(
    context.entityId
  );

  // Create plan with salience awareness
  const plan = await this.enhancedActionPlanner.createContextAwarePlan(
    message,
    salienceContext
  );

  // Execute with temporal prioritization
  const result = await this.enhancedActionPlanner.executeWithTemporalPriority(
    plan,
    context
  );

  // Update salience based on execution results
  await this.updateSalienceFromExecution(result, context.entityId);

  return result.message;
}
```

## 4. Salience Use Cases

### 4.1 Persistent Preferences

```
User: "I prefer meetings in the morning"
→ Creates persistent task: "Prefers morning meetings" (high salience)
→ Future scheduling prioritizes AM slots
```

### 4.2 Ongoing Projects

```
User: "Working on the Johnson proposal"
→ Creates top-of-mind task: "Johnson proposal project"
→ Related calendar events get higher priority
→ Task scheduling considers project deadlines
```

### 4.3 Temporal Priorities

```
User: "Need to finish presentation by Friday"
→ Creates time-sensitive task with Friday deadline
→ Free time analysis prioritizes presentation work
→ Salience score increases as deadline approaches
```

### 4.4 Context Memory

```
User: "Schedule follow-up with Sarah"
→ System remembers previous Sarah meetings
→ Suggests similar time slots and duration
→ Includes relevant context in meeting details
```

## 5. File Structure

```
src/
├── services/
│   ├── unified-sms-ai.ts              (NEW - Main orchestrator)
│   ├── salience-tracker.ts            (NEW - Core salience logic)
│   ├── temporal-manager.ts            (NEW - Time-aware operations)
│   ├── enhanced-action-planner.ts     (NEW - Context-aware planning)
│   ├── calendar-manager.ts            (EXISTING - Enhanced)
│   ├── task-manager.ts                (EXISTING - Enhanced)
│   └── timezone-manager.ts            (EXISTING)
├── types/
│   ├── salience.types.ts              (NEW)
│   ├── temporal.types.ts              (NEW)
│   └── unified-context.types.ts       (NEW)
└── utils/
    ├── salience-scoring.ts            (NEW)
    ├── topic-extraction.ts            (NEW)
    └── context-decay.ts               (NEW)
```

## 6. Benefits of This Approach

### 6.1 Persistent Memory

- **Context Survives**: Important topics persist across conversations
- **Learning System**: Gets smarter about user preferences over time
- **Graceful Degradation**: Old context fades naturally

### 6.2 Intelligent Prioritization

- **Salience-Aware**: High-importance topics get priority
- **Temporal Urgency**: Deadlines amplify importance
- **Context Relevance**: Related items surface together

### 6.3 Natural Integration

- **Uses Existing Infrastructure**: Google Tasks as storage
- **SMS-Friendly**: Works within current SMS workflow
- **Scalable**: Can handle growing context without performance issues

## 7. Implementation Timeline

### Week 1: Foundation

- [ ] Create SalienceTracker service
- [ ] Implement basic salience task lists
- [ ] Add topic extraction from messages
- [ ] Basic salience scoring

### Week 2: Temporal Integration

- [ ] Create TemporalManager service
- [ ] Implement context decay system
- [ ] Add temporal relevance scoring
- [ ] Time-aware free slot finding

### Week 3: Smart Context

- [ ] Enhanced ActionPlanner with salience awareness
- [ ] Context-aware response generation
- [ ] Persistent topic tracking
- [ ] Full integration testing

### Week 4: Polish & Optimization

- [ ] Performance optimization
- [ ] Edge case handling
- [ ] User experience refinement
- [ ] Documentation and monitoring

## 8. Success Metrics

- ✅ **Context Persistence**: Topics mentioned weeks ago still influence responses
- ✅ **Smart Scheduling**: System learns user's time preferences
- ✅ **Proactive Suggestions**: Surfaces relevant context without prompting
- ✅ **Temporal Awareness**: Urgent items get appropriate priority
- ✅ **Natural Conversations**: Feels like talking to someone who remembers

This unified approach transforms the SMS AI from a stateless responder into an intelligent assistant with persistent memory and temporal awareness, all built on the existing Google Tasks infrastructure.
