import neo4j, { Driver, Session } from 'neo4j-driver';
import { 
  TimeWindow, 
  MemoryStrengthCalculation, 
  EnhancedChatMessage,
  BRAIN_MEMORY_CONSTANTS 
} from '../types/brain-memory-schemas';

/**
 * Time-based memory helpers for brain-like working memory management
 * Implements 3-week time window (previous + current + next week) with recently modified tracking
 */
export class TimeMemoryHelpers {
  private driver: Driver;

  constructor(driver: Driver) {
    this.driver = driver;
  }

  /**
   * Get messages in 3-week time window (previous + current + next week)
   * Mimics brain's working memory time horizon
   */
  async getMessagesInTimeWindow(
    userId: string,
    channel: 'sms' | 'chat' | 'websocket',
    sourceIdentifier: string,
    options: {
      includeNextWeek?: boolean;
      includePreviousWeek?: boolean;
      timeOffset?: number; // For testing different time contexts
    } = {}
  ): Promise<{
    messages: EnhancedChatMessage[];
    timeWindows: TimeWindow[];
    stats: {
      previous_week_count: number;
      current_week_count: number;
      next_week_count: number;
      total_count: number;
    };
  }> {
    const {
      includeNextWeek = true,
      includePreviousWeek = true,
      timeOffset = 0
    } = options;

    const session = this.driver.session();
    
    try {
      // Calculate time boundaries with optional offset for testing
      const now = new Date(Date.now() + timeOffset);
      const currentWeekStart = this.getWeekStart(now);
      const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const nextWeekEnd = new Date(currentWeekStart.getTime() + 14 * 24 * 60 * 60 * 1000);

      console.log(`[TimeMemoryHelpers] 📅 Querying 3-week window: ${previousWeekStart.toISOString()} to ${nextWeekEnd.toISOString()}`);

      const result = await session.run(`
        // Calculate week boundaries
        WITH datetime($now) as now,
             datetime($previousWeekStart) as previousWeekStart,
             datetime($currentWeekStart) as currentWeekStart,
             datetime($nextWeekEnd) as nextWeekEnd
        
        MATCH (user:User {id: $userId})-[:OWNS]->(msg:ChatMessage)
        WHERE msg.channel = $channel 
        AND msg.source_identifier = $sourceIdentifier
        AND msg.timestamp >= previousWeekStart
        AND msg.timestamp <= nextWeekEnd
        
        // Categorize by week
        WITH msg, now, previousWeekStart, currentWeekStart, nextWeekEnd,
             CASE 
               WHEN msg.timestamp >= previousWeekStart AND msg.timestamp < currentWeekStart THEN 'previous'
               WHEN msg.timestamp >= currentWeekStart AND msg.timestamp < datetime($now) THEN 'current'
               WHEN msg.timestamp >= datetime($now) AND msg.timestamp <= nextWeekEnd THEN 'next'
               ELSE 'other'
             END as weekCategory
        
        RETURN msg, weekCategory
        ORDER BY msg.timestamp DESC
      `, {
        userId,
        channel,
        sourceIdentifier,
        now: now.toISOString(),
        previousWeekStart: previousWeekStart.toISOString(),
        currentWeekStart: currentWeekStart.toISOString(),
        nextWeekEnd: nextWeekEnd.toISOString()
      });

      // Process and categorize messages
      const messagesByWeek: { [key: string]: EnhancedChatMessage[] } = {
        previous: [],
        current: [],
        next: []
      };

      const messages: EnhancedChatMessage[] = [];

      for (const record of result.records) {
        const msgNode = record.get('msg').properties;
        const weekCategory = record.get('weekCategory');
        
        const message = this.nodeToEnhancedChatMessage(msgNode);
        messages.push(message);
        
        if (messagesByWeek[weekCategory]) {
          messagesByWeek[weekCategory].push(message);
        }
      }

      // Build time windows
      const timeWindows: TimeWindow[] = [
        {
          start: previousWeekStart.toISOString(),
          end: currentWeekStart.toISOString(),
          type: 'previous_week',
          message_count: messagesByWeek.previous.length
        },
        {
          start: currentWeekStart.toISOString(),
          end: now.toISOString(),
          type: 'current_week',
          message_count: messagesByWeek.current.length
        },
        {
          start: now.toISOString(),
          end: nextWeekEnd.toISOString(),
          type: 'next_week',
          message_count: messagesByWeek.next.length
        }
      ];

      const stats = {
        previous_week_count: messagesByWeek.previous.length,
        current_week_count: messagesByWeek.current.length,
        next_week_count: messagesByWeek.next.length,
        total_count: messages.length
      };

      console.log(`[TimeMemoryHelpers] ✅ Retrieved ${stats.total_count} messages in 3-week window: P(${stats.previous_week_count}) C(${stats.current_week_count}) N(${stats.next_week_count})`);

      return {
        messages,
        timeWindows,
        stats
      };

    } finally {
      await session.close();
    }
  }

  /**
   * Get recently modified messages (2-hour window)
   * Pulls messages back into working memory when they're modified
   */
  async getRecentlyModifiedMessages(
    userId: string,
    channel?: 'sms' | 'chat' | 'websocket',
    options: {
      modificationWindowHours?: number;
      includeReasons?: string[];
      excludeReasons?: string[];
      timeOffset?: number;
    } = {}
  ): Promise<{
    messages: EnhancedChatMessage[];
    modificationReasons: string[];
    totalCount: number;
  }> {
    const {
      modificationWindowHours = BRAIN_MEMORY_CONSTANTS.RECENT_MODIFICATION_HOURS,
      includeReasons,
      excludeReasons,
      timeOffset = 0
    } = options;

    const session = this.driver.session();
    
    try {
      const cutoffTime = new Date(Date.now() + timeOffset - modificationWindowHours * 60 * 60 * 1000);

      console.log(`[TimeMemoryHelpers] 🔄 Querying recently modified messages since: ${cutoffTime.toISOString()}`);

      let whereClause = `msg.last_modified > datetime($cutoffTime)`;
      if (channel) {
        whereClause += ` AND msg.channel = $channel`;
      }
      if (includeReasons?.length) {
        whereClause += ` AND msg.modification_reason IN $includeReasons`;
      }
      if (excludeReasons?.length) {
        whereClause += ` AND NOT msg.modification_reason IN $excludeReasons`;
      }

      const result = await session.run(`
        MATCH (user:User {id: $userId})-[:OWNS]->(msg:ChatMessage)
        WHERE ${whereClause}
        
        RETURN msg, msg.modification_reason as reason
        ORDER BY msg.last_modified DESC
      `, {
        userId,
        channel,
        cutoffTime: cutoffTime.toISOString(),
        includeReasons,
        excludeReasons
      });

      const messages: EnhancedChatMessage[] = [];
      const modificationReasons: string[] = [];

      for (const record of result.records) {
        const msgNode = record.get('msg').properties;
        const reason = record.get('reason');
        
        messages.push(this.nodeToEnhancedChatMessage(msgNode));
        if (reason && !modificationReasons.includes(reason)) {
          modificationReasons.push(reason);
        }
      }

      console.log(`[TimeMemoryHelpers] ✅ Found ${messages.length} recently modified messages with reasons: ${modificationReasons.join(', ')}`);

      return {
        messages,
        modificationReasons,
        totalCount: messages.length
      };

    } finally {
      await session.close();
    }
  }

  /**
   * Calculate memory strength with time distribution bonuses
   * Mimics how human brain values memories across time
   */
  calculateMemoryStrength(
    message: EnhancedChatMessage,
    timeWindowStats: {
      previous_week_count: number;
      current_week_count: number;
      next_week_count: number;
      recently_modified_count: number;
    },
    options: {
      timeOffset?: number;
      customBonuses?: {
        recency?: number;
        frequency?: number;
        semantic?: number;
        time_distribution?: number;
        modification?: number;
      };
    } = {}
  ): MemoryStrengthCalculation {
    const { timeOffset = 0, customBonuses = {} } = options;
    const now = new Date(Date.now() + timeOffset);
    const messageTime = new Date(message.timestamp);
    const timeDiffHours = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);

    // Base importance from message properties
    const baseImportance = message.importance_score || 0.5;

    // Recency bonus (exponential decay)
    const recencyBonus = customBonuses.recency ?? Math.exp(-timeDiffHours / 24) * 0.3;

    // Frequency bonus (based on time window distribution)
    const totalMessages = timeWindowStats.previous_week_count + 
                         timeWindowStats.current_week_count + 
                         timeWindowStats.next_week_count;
    const frequencyBonus = customBonuses.frequency ?? Math.min(totalMessages / 20, 0.3);

    // Semantic bonus (based on intent and sentiment)
    let semanticBonus = customBonuses.semantic ?? 0;
    if (message.intent) {
      semanticBonus += 0.1;
      if (['calendar', 'task_management', 'email', 'contact'].includes(message.intent)) {
        semanticBonus += 0.1; // Bonus for actionable intents
      }
    }
    if (message.sentiment && Math.abs(message.sentiment) > 0.5) {
      semanticBonus += 0.1; // Bonus for emotional messages
    }

    // Time distribution bonus (brain-like time-based learning)
    let timeDistributionBonus = customBonuses.time_distribution ?? 0;
    const weekStart = this.getWeekStart(now);
    const previousWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(weekStart.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (messageTime >= previousWeekStart && messageTime < weekStart) {
      timeDistributionBonus = BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.PREVIOUS_WEEK;
    } else if (messageTime >= weekStart && messageTime <= now) {
      timeDistributionBonus = BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.CURRENT_WEEK;
    } else if (messageTime > now && messageTime <= nextWeekEnd) {
      timeDistributionBonus = BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.NEXT_WEEK;
    }

    // Modification bonus (recently modified messages get pulled back to working memory)
    let modificationBonus = customBonuses.modification ?? 0;
    if (message.last_modified) {
      const modificationTime = new Date(message.last_modified);
      const modificationHours = (now.getTime() - modificationTime.getTime()) / (1000 * 60 * 60);
      if (modificationHours <= BRAIN_MEMORY_CONSTANTS.RECENT_MODIFICATION_HOURS) {
        modificationBonus = BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.RECENT_MODIFICATION;
      }
    }

    // Calculate final strength
    const finalStrength = Math.min(
      baseImportance + recencyBonus + frequencyBonus + semanticBonus + timeDistributionBonus + modificationBonus,
      1.0
    );

    return {
      base_importance: baseImportance,
      recency_bonus: recencyBonus,
      frequency_bonus: frequencyBonus,
      semantic_bonus: semanticBonus,
      time_distribution_bonus: timeDistributionBonus,
      modification_bonus: modificationBonus,
      final_strength: finalStrength
    };
  }

  /**
   * Update message modification timestamp and reason
   * Used to pull messages back into working memory
   */
  async updateMessageModification(
    messageId: string,
    reason: string,
    options: {
      timeOffset?: number;
      additionalProperties?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const { timeOffset = 0, additionalProperties = {} } = options;
    const session = this.driver.session();

    try {
      const now = new Date(Date.now() + timeOffset);

      console.log(`[TimeMemoryHelpers] 🔄 Updating modification for message ${messageId}: ${reason}`);

      // Build property updates
      const propertyUpdates = [
        'msg.last_modified = datetime($timestamp)',
        'msg.modification_reason = $reason'
      ];

      for (const [key, value] of Object.entries(additionalProperties)) {
        propertyUpdates.push(`msg.${key} = $${key}`);
      }

      await session.run(`
        MATCH (msg:ChatMessage {id: $messageId})
        SET ${propertyUpdates.join(', ')}
        RETURN msg
      `, {
        messageId,
        timestamp: now.toISOString(),
        reason,
        ...additionalProperties
      });

      console.log(`[TimeMemoryHelpers] ✅ Updated message modification: ${messageId}`);

    } finally {
      await session.close();
    }
  }

  /**
   * Get balanced time distribution for working memory optimization
   * Ensures we have good representation across the 3-week window
   */
  getBalancedTimeDistribution(
    messages: EnhancedChatMessage[],
    targetSize: number = BRAIN_MEMORY_CONSTANTS.WORKING_MEMORY_SIZE
  ): {
    selected: EnhancedChatMessage[];
    distribution: {
      previous_week: number;
      current_week: number;
      next_week: number;
      recent_modifications: number;
    };
  } {
    const now = new Date();
    const weekStart = this.getWeekStart(now);
    const previousWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(weekStart.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Categorize messages
    const categories = {
      previous_week: [],
      current_week: [],
      next_week: [],
      recent_modifications: []
    } as { [key: string]: EnhancedChatMessage[] };

    for (const message of messages) {
      const messageTime = new Date(message.timestamp);
      
      // Check for recent modifications first
      if (message.last_modified) {
        const modTime = new Date(message.last_modified);
        const modHours = (now.getTime() - modTime.getTime()) / (1000 * 60 * 60);
        if (modHours <= BRAIN_MEMORY_CONSTANTS.RECENT_MODIFICATION_HOURS) {
          categories.recent_modifications.push(message);
          continue; // Recently modified takes precedence
        }
      }

      // Categorize by time window
      if (messageTime >= previousWeekStart && messageTime < weekStart) {
        categories.previous_week.push(message);
      } else if (messageTime >= weekStart && messageTime <= now) {
        categories.current_week.push(message);
      } else if (messageTime > now && messageTime <= nextWeekEnd) {
        categories.next_week.push(message);
      }
    }

    // Select balanced distribution
    const selected: EnhancedChatMessage[] = [];
    const targetDistribution = {
      recent_modifications: Math.min(categories.recent_modifications.length, Math.ceil(targetSize * 0.3)),
      current_week: Math.min(categories.current_week.length, Math.ceil(targetSize * 0.4)),
      previous_week: Math.min(categories.previous_week.length, Math.ceil(targetSize * 0.2)),
      next_week: Math.min(categories.next_week.length, Math.ceil(targetSize * 0.1))
    };

    // Add messages by priority
    selected.push(...categories.recent_modifications.slice(0, targetDistribution.recent_modifications));
    selected.push(...categories.current_week.slice(0, targetDistribution.current_week));
    selected.push(...categories.previous_week.slice(0, targetDistribution.previous_week));
    selected.push(...categories.next_week.slice(0, targetDistribution.next_week));

    // Fill remaining slots with highest strength messages
    const remaining = targetSize - selected.length;
    if (remaining > 0) {
      const allRemaining = messages.filter(m => !selected.includes(m));
      const sortedByStrength = allRemaining.sort((a, b) => 
        (b.importance_score || 0) - (a.importance_score || 0)
      );
      selected.push(...sortedByStrength.slice(0, remaining));
    }

    return {
      selected: selected.slice(0, targetSize),
      distribution: {
        previous_week: selected.filter(m => {
          const mt = new Date(m.timestamp);
          return mt >= previousWeekStart && mt < weekStart;
        }).length,
        current_week: selected.filter(m => {
          const mt = new Date(m.timestamp);
          return mt >= weekStart && mt <= now;
        }).length,
        next_week: selected.filter(m => {
          const mt = new Date(m.timestamp);
          return mt > now && mt <= nextWeekEnd;
        }).length,
        recent_modifications: selected.filter(m => {
          if (!m.last_modified) return false;
          const modTime = new Date(m.last_modified);
          const modHours = (now.getTime() - modTime.getTime()) / (1000 * 60 * 60);
          return modHours <= BRAIN_MEMORY_CONSTANTS.RECENT_MODIFICATION_HOURS;
        }).length
      }
    };
  }

  // Helper methods

  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day; // Sunday = 0
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private nodeToEnhancedChatMessage(node: any): EnhancedChatMessage {
    // Parse JSON metadata fields safely
    const smsMetadata = node.sms_metadata ? 
      (typeof node.sms_metadata === 'string' ? JSON.parse(node.sms_metadata) : node.sms_metadata) : 
      undefined;
    
    const chatMetadata = node.chat_metadata ? 
      (typeof node.chat_metadata === 'string' ? JSON.parse(node.chat_metadata) : node.chat_metadata) : 
      undefined;
    
    const googleServiceContext = node.google_service_context ? 
      (typeof node.google_service_context === 'string' ? JSON.parse(node.google_service_context) : node.google_service_context) : 
      undefined;

    return {
      id: node.id,
      content: node.content,
      timestamp: node.timestamp,
      user_id: node.user_id || node.userId || '',
      channel: node.channel,
      source_identifier: node.source_identifier,
      intent: node.intent,
      sentiment: node.sentiment,
      importance_score: node.importance_score,
      last_modified: node.last_modified,
      modification_reason: node.modification_reason,
      sms_metadata: smsMetadata,
      chat_metadata: chatMetadata,
      google_service_context: googleServiceContext
    };
  }
}

// Export utility functions for standalone use
export function calculateTimeDistributionBonus(
  messageTimestamp: string,
  currentTime: Date = new Date()
): number {
  const messageTime = new Date(messageTimestamp);
  const weekStart = getWeekStart(currentTime);
  const previousWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeekEnd = new Date(weekStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (messageTime >= previousWeekStart && messageTime < weekStart) {
    return BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.PREVIOUS_WEEK;
  } else if (messageTime >= weekStart && messageTime <= currentTime) {
    return BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.CURRENT_WEEK;
  } else if (messageTime > currentTime && messageTime <= nextWeekEnd) {
    return BRAIN_MEMORY_CONSTANTS.TIME_DISTRIBUTION_BONUSES.NEXT_WEEK;
  }
  
  return 0;
}

export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day; // Sunday = 0
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isInTimeWindow(
  messageTimestamp: string,
  windowType: 'previous_week' | 'current_week' | 'next_week',
  currentTime: Date = new Date()
): boolean {
  const messageTime = new Date(messageTimestamp);
  const weekStart = getWeekStart(currentTime);
  const previousWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeekEnd = new Date(weekStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  switch (windowType) {
    case 'previous_week':
      return messageTime >= previousWeekStart && messageTime < weekStart;
    case 'current_week':
      return messageTime >= weekStart && messageTime <= currentTime;
    case 'next_week':
      return messageTime > currentTime && messageTime <= nextWeekEnd;
    default:
      return false;
  }
} 