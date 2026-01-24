# Temporal Salience Infrastructure Plan

## Core Philosophy: Time is Context

**Strong Opinion**: All operations should be temporally aware. Recent events matter more than old ones. Upcoming deadlines override distant tasks. Context degrades with time.

## Temporal Salience Principles

### 1. **Recency Bias** (Exponential Decay)

- Events from last hour: 100% relevance
- Events from today: 80% relevance
- Events from this week: 60% relevance
- Events from last month: 20% relevance
- Events older than 3 months: 5% relevance

### 2. **Urgency Amplification**

- Events in next 2 hours: 150% priority boost
- Events today: 120% priority boost
- Events this week: 100% baseline
- Events next month: 80% priority
- Events beyond 3 months: 50% priority

### 3. **Context Window Management**

- **Active Window**: Next 24 hours (high detail)
- **Planning Window**: Next 7 days (medium detail)
- **Awareness Window**: Next 30 days (low detail)
- **Archive Window**: Past 7 days (reference only)

## Infrastructure Design

### 1. Temporal Context Manager

```typescript
export class TemporalContextManager {
  // Calculate temporal relevance score (0-1)
  calculateRelevance(timestamp: Date, referenceTime: Date = new Date()): number;

  // Get events within temporal windows
  getActiveWindow(events: Event[]): Event[];
  getPlanningWindow(events: Event[]): Event[];
  getAwarenessWindow(events: Event[]): Event[];

  // Prioritize actions based on temporal urgency
  prioritizeActions(actions: ActionStep[]): ActionStep[];
}
```

### 2. Enhanced Calendar Manager

Support ALL Google Calendar actions with temporal awareness:

#### Core Actions (High Priority)

- `GOOGLECALENDAR_CREATE_EVENT` - Create with smart time suggestions
- `GOOGLECALENDAR_FIND_FREE_SLOTS` - Find optimal free time
- `GOOGLECALENDAR_SYNC_EVENTS` - Keep data fresh
- `GOOGLECALENDAR_GET_CURRENT_DATE_TIME` - Temporal anchor

#### Query Actions (Medium Priority)

- `GOOGLECALENDAR_FIND_EVENT` - Search with recency bias
- `GOOGLECALENDAR_LIST_CALENDARS` - Show active calendars first
- `GOOGLECALENDAR_GET_CALENDAR` - Calendar metadata

#### Modification Actions (Context Dependent)

- `GOOGLECALENDAR_UPDATE_EVENT` - Prioritize near-term events
- `GOOGLECALENDAR_PATCH_EVENT` - Quick updates for urgent events
- `GOOGLECALENDAR_DELETE_EVENT` - Confirm for near-term deletions
- `GOOGLECALENDAR_PATCH_CALENDAR` - Calendar settings
- `GOOGLECALENDAR_DUPLICATE_CALENDAR` - Template operations

#### Advanced Actions (Low Priority)

- `GOOGLECALENDAR_QUICK_ADD` - Natural language event creation
- `GOOGLECALENDAR_REMOVE_ATTENDEE` - Meeting management

### 3. Temporal Action Planner

```typescript
export class TemporalActionPlanner extends ActionPlanner {
  // Plan with temporal context
  async createTemporalPlan(
    message: string,
    temporalContext: TemporalContext
  ): Promise<ActionPlan>;

  // Execute with time-aware prioritization
  async executeWithTemporalPriority(
    plan: ActionPlan,
    context: ExecutionContext
  ): Promise<PlanExecutionResult>;

  // Smart scheduling suggestions
  async suggestOptimalTiming(
    action: ActionStep,
    context: TemporalContext
  ): Promise<TimeSlot[]>;
}
```

## Implementation Strategy

### Phase 1: Temporal Context Foundation

1. **TemporalContextManager** - Core temporal logic
2. **Enhanced Calendar Manager** - All 14 Google Calendar actions
3. **Temporal-aware Action Planning** - Time-based prioritization

### Phase 2: Smart Scheduling

1. **Free Time Analysis** - Intelligent gap finding
2. **Conflict Detection** - Temporal overlap analysis
3. **Optimal Timing Suggestions** - AI-powered scheduling

### Phase 3: Context Degradation

1. **Automatic Archiving** - Move old events to archive window
2. **Relevance Scoring** - Dynamic importance calculation
3. **Smart Summarization** - Compress old context

## Temporal Salience Rules

### Message Processing Priority

1. **Immediate Actions** (next 2 hours) - Process first
2. **Today's Actions** - High priority queue
3. **This Week's Actions** - Normal priority
4. **Future Actions** - Background processing

### Context Retention Policy

- **Active Events**: Full detail, immediate access
- **Recent Events**: Summarized, quick access
- **Historical Events**: Compressed, search only
- **Ancient Events**: Archived, minimal metadata

### Smart Defaults

- **Default Event Duration**: 30 minutes (most meetings are shorter than scheduled)
- **Default Buffer Time**: 15 minutes between events
- **Optimal Meeting Times**: 10am-11am, 2pm-3pm (peak focus hours)
- **Avoid Times**: 12pm-1pm (lunch), after 5pm (personal time)

## File Structure

```
src/
├── services/
│   ├── temporal-context-manager.ts (NEW)
│   ├── temporal-action-planner.ts (NEW)
│   ├── enhanced-calendar-manager.ts (ENHANCED)
│   └── sms-ai-simple.ts (UPDATE)
├── types/
│   ├── temporal-context.types.ts (NEW)
│   └── enhanced-calendar.types.ts (NEW)
└── utils/
    ├── temporal-scoring.ts (NEW)
    └── time-slot-analysis.ts (NEW)
```

## Benefits

### 1. **Intelligent Prioritization**

- Urgent events get immediate attention
- Old events don't clutter current context
- Smart scheduling suggestions

### 2. **Context Efficiency**

- Relevant information surfaces automatically
- Reduced cognitive load
- Faster decision making

### 3. **Temporal Awareness**

- Time-sensitive operations prioritized
- Natural language understanding of "soon", "later", "urgent"
- Automatic conflict detection

### 4. **Scalable Architecture**

- Clean separation of temporal logic
- Easy to extend with new time-based features
- Performance optimized for real-time use

## Strong Opinions Baked In

1. **Recent > Distant**: Always prioritize recent events and near-term planning
2. **Context Degrades**: Information becomes less relevant over time
3. **Urgency Amplifies**: Near-term events get exponential priority boost
4. **Smart Defaults**: Opinionated scheduling suggestions based on productivity research
5. **Minimal Cognitive Load**: System should think about time so user doesn't have to

This creates a temporally intelligent system that understands the urgency and relevance of time-based operations!
