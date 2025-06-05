import {
  TemporalWindow,
  TemporalPriority,
  TemporalContext,
  TemporalRelevance,
  TimeSlot,
  FreeTimeAnalysis,
  SchedulingPreferences,
  DEFAULT_TEMPORAL_CONFIG,
} from "../types/temporal-context.types";
import { ActionStep } from "../types/action-planning.types";

export class CalendarTemporalManager {
  private config = DEFAULT_TEMPORAL_CONFIG;

  /**
   * Calculate temporal relevance score (0-1) with strong recency/urgency bias
   */
  calculateRelevance(
    timestamp: Date,
    referenceTime: Date = new Date()
  ): TemporalRelevance {
    const timeDiff = timestamp.getTime() - referenceTime.getTime();
    const absDiff = Math.abs(timeDiff);

    // Determine temporal window
    const window = this.getTemporalWindow(timestamp, referenceTime);

    // Calculate recency score (exponential decay for past events)
    let recencyScore: number;
    if (timeDiff < 0) {
      // Past event - exponential decay
      const hoursAgo = absDiff / (1000 * 60 * 60);
      recencyScore = Math.exp(-hoursAgo / 24); // Decay over 24 hours
    } else {
      // Future event - maintain high relevance for near future
      const hoursAhead = absDiff / (1000 * 60 * 60);
      recencyScore = Math.max(0.1, 1 - hoursAhead / (24 * 7)); // Decay over week
    }

    // Calculate urgency multiplier
    const urgencyMultiplier = this.getUrgencyMultiplier(
      timestamp,
      referenceTime
    );

    // Determine priority level
    const priority = this.getPriorityLevel(timestamp, referenceTime);

    // Final score combines recency and urgency
    const score = Math.min(1, recencyScore * urgencyMultiplier);

    return {
      score,
      priority,
      window,
      urgencyMultiplier,
      recencyScore,
    };
  }

  /**
   * Get temporal window for a timestamp
   */
  private getTemporalWindow(
    timestamp: Date,
    referenceTime: Date
  ): TemporalWindow {
    const timeDiff = timestamp.getTime() - referenceTime.getTime();

    if (timeDiff < 0) {
      // Past event
      if (Math.abs(timeDiff) <= this.config.windows.archive) {
        return TemporalWindow.ARCHIVE;
      }
      return TemporalWindow.ARCHIVE; // All past events go to archive
    } else {
      // Future event
      if (timeDiff <= this.config.windows.active) {
        return TemporalWindow.ACTIVE;
      } else if (timeDiff <= this.config.windows.planning) {
        return TemporalWindow.PLANNING;
      } else if (timeDiff <= this.config.windows.awareness) {
        return TemporalWindow.AWARENESS;
      }
      return TemporalWindow.AWARENESS; // Distant future
    }
  }

  /**
   * Get urgency multiplier based on time until event
   */
  private getUrgencyMultiplier(timestamp: Date, referenceTime: Date): number {
    const timeDiff = timestamp.getTime() - referenceTime.getTime();

    if (timeDiff < 0) {
      // Past events have minimal urgency
      return 0.2;
    }

    const hoursAhead = timeDiff / (1000 * 60 * 60);

    if (hoursAhead <= 2) {
      return this.config.priorities.immediate; // 150%
    } else if (hoursAhead <= 24) {
      return this.config.priorities.urgent; // 120%
    } else if (hoursAhead <= 24 * 7) {
      return this.config.priorities.normal; // 100%
    } else if (hoursAhead <= 24 * 30) {
      return this.config.priorities.low; // 80%
    } else {
      return this.config.priorities.minimal; // 50%
    }
  }

  /**
   * Get priority level for timestamp
   */
  private getPriorityLevel(
    timestamp: Date,
    referenceTime: Date
  ): TemporalPriority {
    const timeDiff = timestamp.getTime() - referenceTime.getTime();
    const hoursAhead = timeDiff / (1000 * 60 * 60);

    if (hoursAhead <= 2) {
      return TemporalPriority.IMMEDIATE;
    } else if (hoursAhead <= 24) {
      return TemporalPriority.URGENT;
    } else if (hoursAhead <= 24 * 7) {
      return TemporalPriority.NORMAL;
    } else if (hoursAhead <= 24 * 30) {
      return TemporalPriority.LOW;
    } else {
      return TemporalPriority.MINIMAL;
    }
  }

  /**
   * Create temporal context from events
   */
  createTemporalContext(
    events: any[],
    userTimezone: string,
    referenceTime: Date = new Date()
  ): TemporalContext {
    const activeStart = new Date(referenceTime);
    const activeEnd = new Date(
      referenceTime.getTime() + this.config.windows.active
    );

    const planningStart = new Date(referenceTime);
    const planningEnd = new Date(
      referenceTime.getTime() + this.config.windows.planning
    );

    const awarenessStart = new Date(referenceTime);
    const awarenessEnd = new Date(
      referenceTime.getTime() + this.config.windows.awareness
    );

    const archiveStart = new Date(
      referenceTime.getTime() - this.config.windows.archive
    );
    const archiveEnd = new Date(referenceTime);

    return {
      referenceTime,
      userTimezone,
      activeWindow: {
        start: activeStart,
        end: activeEnd,
        events: this.filterEventsByWindow(events, activeStart, activeEnd),
      },
      planningWindow: {
        start: planningStart,
        end: planningEnd,
        events: this.filterEventsByWindow(events, planningStart, planningEnd),
      },
      awarenessWindow: {
        start: awarenessStart,
        end: awarenessEnd,
        events: this.filterEventsByWindow(events, awarenessStart, awarenessEnd),
      },
      archiveWindow: {
        start: archiveStart,
        end: archiveEnd,
        events: this.filterEventsByWindow(events, archiveStart, archiveEnd),
      },
    };
  }

  /**
   * Filter events by time window
   */
  private filterEventsByWindow(events: any[], start: Date, end: Date): any[] {
    return events.filter((event) => {
      const eventTime = new Date(event.start?.dateTime || event.start?.date);
      return eventTime >= start && eventTime <= end;
    });
  }

  /**
   * Get events within active window (next 24 hours)
   */
  getActiveWindow(events: any[], referenceTime: Date = new Date()): any[] {
    const endTime = new Date(
      referenceTime.getTime() + this.config.windows.active
    );
    return this.filterEventsByWindow(events, referenceTime, endTime);
  }

  /**
   * Get events within planning window (next 7 days)
   */
  getPlanningWindow(events: any[], referenceTime: Date = new Date()): any[] {
    const endTime = new Date(
      referenceTime.getTime() + this.config.windows.planning
    );
    return this.filterEventsByWindow(events, referenceTime, endTime);
  }

  /**
   * Get events within awareness window (next 30 days)
   */
  getAwarenessWindow(events: any[], referenceTime: Date = new Date()): any[] {
    const endTime = new Date(
      referenceTime.getTime() + this.config.windows.awareness
    );
    return this.filterEventsByWindow(events, referenceTime, endTime);
  }

  /**
   * Prioritize actions based on temporal urgency
   */
  prioritizeActions(
    actions: ActionStep[],
    referenceTime: Date = new Date()
  ): ActionStep[] {
    return actions
      .map((action) => ({
        ...action,
        temporalScore: this.calculateActionScore(action, referenceTime),
      }))
      .sort((a, b) => (b as any).temporalScore - (a as any).temporalScore);
  }

  /**
   * Calculate temporal score for an action
   */
  private calculateActionScore(
    action: ActionStep,
    referenceTime: Date
  ): number {
    // Base score
    let score = 1.0;

    // Boost for time-sensitive actions
    if (action.type === "calendar") {
      if (
        action.action.includes("CREATE") ||
        action.action.includes("UPDATE")
      ) {
        score *= 1.2; // 20% boost for modifications
      }
      if (
        action.action.includes("FIND_FREE") ||
        action.action.includes("SYNC")
      ) {
        score *= 1.5; // 50% boost for time-critical operations
      }
    }

    // Boost for immediate actions
    if (action.params?.urgency === "immediate") {
      score *= this.config.priorities.immediate;
    }

    return score;
  }

  /**
   * Find free time slots with temporal awareness
   */
  findFreeTimeSlots(
    events: any[],
    duration: number = 30, // minutes
    userTimezone: string,
    referenceTime: Date = new Date()
  ): FreeTimeAnalysis {
    const activeEvents = this.getActiveWindow(events, referenceTime);
    const planningEvents = this.getPlanningWindow(events, referenceTime);

    // Combine active and planning events for comprehensive analysis
    const relevantEvents = [...activeEvents, ...planningEvents];

    const slots = this.calculateFreeSlots(
      relevantEvents,
      duration,
      referenceTime,
      userTimezone
    );
    const optimalSlots = this.filterOptimalSlots(slots);

    return {
      slots,
      totalFreeTime: slots.reduce((total, slot) => total + slot.duration, 0),
      longestSlot: slots.reduce(
        (longest, slot) => (slot.duration > longest.duration ? slot : longest),
        slots[0] || {
          start: new Date(),
          end: new Date(),
          duration: 0,
          confidence: 0,
        }
      ),
      optimalSlots,
      conflicts: this.findConflicts(relevantEvents),
      suggestions: this.generateSchedulingSuggestions(slots, optimalSlots),
    };
  }

  /**
   * Calculate free time slots between events
   */
  private calculateFreeSlots(
    events: any[],
    minDuration: number,
    referenceTime: Date,
    userTimezone: string
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const sortedEvents = events
      .map((event) => ({
        start: new Date(event.start?.dateTime || event.start?.date),
        end: new Date(
          event.end?.dateTime ||
            event.end?.date ||
            new Date(
              new Date(event.start?.dateTime || event.start?.date).getTime() +
                30 * 60 * 1000
            )
        ),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Check slot from now until first event
    if (sortedEvents.length > 0) {
      const firstSlot = this.createTimeSlot(
        referenceTime,
        sortedEvents[0].start,
        userTimezone
      );
      if (firstSlot.duration >= minDuration) {
        slots.push(firstSlot);
      }
    }

    // Check slots between events
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const slot = this.createTimeSlot(
        sortedEvents[i].end,
        sortedEvents[i + 1].start,
        userTimezone
      );
      if (slot.duration >= minDuration) {
        slots.push(slot);
      }
    }

    return slots;
  }

  /**
   * Create time slot with confidence scoring
   */
  private createTimeSlot(
    start: Date,
    end: Date,
    userTimezone: string
  ): TimeSlot {
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    const hour = start.getHours();

    // Calculate confidence based on optimal timing
    let confidence = 0.5; // base confidence

    // Boost for optimal hours (10am-3pm)
    if (
      hour >= this.config.scheduling.optimalHours.start &&
      hour <= this.config.scheduling.optimalHours.end
    ) {
      confidence += 0.3;
    }

    // Reduce for lunch time
    if (
      hour >= this.config.scheduling.avoidHours.lunch.start &&
      hour < this.config.scheduling.avoidHours.lunch.end
    ) {
      confidence -= 0.2;
    }

    // Reduce for after hours
    if (hour >= this.config.scheduling.avoidHours.personal.start || hour < 8) {
      confidence -= 0.3;
    }

    // Boost for longer slots
    if (duration >= 60) {
      confidence += 0.2;
    }

    return {
      start,
      end,
      duration,
      confidence: Math.max(0, Math.min(1, confidence)),
      reason: this.getSlotReason(hour, duration),
    };
  }

  /**
   * Get reason for slot confidence
   */
  private getSlotReason(hour: number, duration: number): string {
    if (hour >= 10 && hour <= 15) {
      return "Optimal focus hours";
    } else if (hour >= 12 && hour < 13) {
      return "Lunch time - lower confidence";
    } else if (hour >= 17) {
      return "After hours - personal time";
    } else if (duration >= 60) {
      return "Long slot - good for deep work";
    } else {
      return "Standard availability";
    }
  }

  /**
   * Filter slots during optimal hours
   */
  private filterOptimalSlots(slots: TimeSlot[]): TimeSlot[] {
    return slots.filter((slot) => {
      const hour = slot.start.getHours();
      return (
        hour >= this.config.scheduling.optimalHours.start &&
        hour <= this.config.scheduling.optimalHours.end
      );
    });
  }

  /**
   * Find scheduling conflicts
   */
  private findConflicts(events: any[]): any[] {
    const conflicts: any[] = [];

    for (let i = 0; i < events.length - 1; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const start1 = new Date(event1.start?.dateTime || event1.start?.date);
        const end1 = new Date(event1.end?.dateTime || event1.end?.date);
        const start2 = new Date(event2.start?.dateTime || event2.start?.date);
        const end2 = new Date(event2.end?.dateTime || event2.end?.date);

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            event1: event1.summary || "Untitled Event",
            event2: event2.summary || "Untitled Event",
            overlapStart: new Date(
              Math.max(start1.getTime(), start2.getTime())
            ),
            overlapEnd: new Date(Math.min(end1.getTime(), end2.getTime())),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Generate scheduling suggestions
   */
  private generateSchedulingSuggestions(
    allSlots: TimeSlot[],
    optimalSlots: TimeSlot[]
  ): string[] {
    const suggestions: string[] = [];

    if (optimalSlots.length > 0) {
      suggestions.push(
        `${optimalSlots.length} optimal time slots available during focus hours`
      );
    }

    if (allSlots.length === 0) {
      suggestions.push(
        "Schedule is fully booked - consider rescheduling non-critical meetings"
      );
    } else if (allSlots.length < 3) {
      suggestions.push(
        "Limited availability - prioritize essential meetings only"
      );
    }

    const longSlots = allSlots.filter((slot) => slot.duration >= 60);
    if (longSlots.length > 0) {
      suggestions.push(
        `${longSlots.length} slots available for deep work (60+ minutes)`
      );
    }

    return suggestions;
  }
}
