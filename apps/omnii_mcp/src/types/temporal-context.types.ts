/**
 * Temporal Context Types
 *
 * Types for time-aware context management and prioritization
 */

/**
 * Temporal windows for context management
 */
export enum TemporalWindow {
  ACTIVE = "active", // Next 24 hours
  PLANNING = "planning", // Next 7 days
  AWARENESS = "awareness", // Next 30 days
  ARCHIVE = "archive", // Past 7 days
}

/**
 * Temporal priority levels
 */
export enum TemporalPriority {
  IMMEDIATE = "immediate", // Next 2 hours (150% boost)
  URGENT = "urgent", // Today (120% boost)
  NORMAL = "normal", // This week (100% baseline)
  LOW = "low", // Next month (80%)
  MINIMAL = "minimal", // Beyond 3 months (50%)
}

/**
 * Time slot for scheduling
 */
export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number; // minutes
  confidence: number; // 0-1 score
  reason?: string;
}

/**
 * Temporal relevance score
 */
export interface TemporalRelevance {
  score: number; // 0-1
  priority: TemporalPriority;
  window: TemporalWindow;
  urgencyMultiplier: number;
  recencyScore: number;
}

/**
 * Temporal context for events/actions
 */
export interface TemporalContext {
  referenceTime: Date;
  userTimezone: string;
  activeWindow: {
    start: Date;
    end: Date;
    events: any[];
  };
  planningWindow: {
    start: Date;
    end: Date;
    events: any[];
  };
  awarenessWindow: {
    start: Date;
    end: Date;
    events: any[];
  };
  archiveWindow: {
    start: Date;
    end: Date;
    events: any[];
  };
}

/**
 * Smart scheduling preferences
 */
export interface SchedulingPreferences {
  defaultDuration: number; // 30 minutes
  bufferTime: number; // 15 minutes
  optimalHours: {
    start: number; // 10 (10am)
    end: number; // 15 (3pm)
  };
  avoidHours: {
    lunch: { start: number; end: number }; // 12-13
    personal: { start: number; end: number }; // 17-24
  };
  workDays: number[]; // [1,2,3,4,5] Mon-Fri
}

/**
 * Temporal action with priority
 */
export interface TemporalAction {
  action: string;
  priority: TemporalPriority;
  relevance: TemporalRelevance;
  suggestedTime?: TimeSlot;
  conflicts?: any[];
}

/**
 * Free time analysis result
 */
export interface FreeTimeAnalysis {
  slots: TimeSlot[];
  totalFreeTime: number; // minutes
  longestSlot: TimeSlot;
  optimalSlots: TimeSlot[]; // During optimal hours
  conflicts: any[];
  suggestions: string[];
}

/**
 * Temporal scoring weights
 */
export interface TemporalWeights {
  recency: number; // 0.4 - How recent is it?
  urgency: number; // 0.4 - How soon is it?
  importance: number; // 0.2 - How important is it?
}

/**
 * Default temporal configuration
 */
export const DEFAULT_TEMPORAL_CONFIG = {
  windows: {
    active: 24 * 60 * 60 * 1000, // 24 hours
    planning: 7 * 24 * 60 * 60 * 1000, // 7 days
    awareness: 30 * 24 * 60 * 60 * 1000, // 30 days
    archive: 7 * 24 * 60 * 60 * 1000, // 7 days back
  },
  priorities: {
    immediate: 1.5, // 150% boost
    urgent: 1.2, // 120% boost
    normal: 1.0, // 100% baseline
    low: 0.8, // 80%
    minimal: 0.5, // 50%
  },
  scheduling: {
    defaultDuration: 30,
    bufferTime: 15,
    optimalHours: { start: 10, end: 15 },
    avoidHours: {
      lunch: { start: 12, end: 13 },
      personal: { start: 17, end: 24 },
    },
    workDays: [1, 2, 3, 4, 5],
  },
  weights: {
    recency: 0.4,
    urgency: 0.4,
    importance: 0.2,
  },
} as const;
