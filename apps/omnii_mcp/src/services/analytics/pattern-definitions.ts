/**
 * Pattern Definitions
 *
 * Defines analytics patterns for detecting actionable insights.
 */

import type { PatternType } from '../ai/types';
import type { PatternDefinition } from './types';

/**
 * All pattern definitions
 */
export const PATTERN_DEFINITIONS: PatternDefinition[] = [
  {
    type: 'meeting_followup_rate',
    name: 'Meeting Follow-up Rate',
    description: 'Analyzes correlation between meeting time and follow-up task creation',
    category: 'productivity',
    query: `
      MATCH (e:Event)
      WHERE e.startTime > datetime() - duration({days: $lookbackDays})
      AND e.attendeeCount >= 2
      WITH e, e.startTime.hour as meetingHour
      OPTIONAL MATCH (t:Task)
      WHERE t.createdAt > e.endTime
      AND t.createdAt < e.endTime + duration({hours: 24})
      WITH meetingHour, count(DISTINCT e) as meetings, count(t) as followupTasks
      WHERE meetings >= $minSampleSize
      RETURN meetingHour, meetings, followupTasks,
             toFloat(followupTasks) / meetings as followupRate
      ORDER BY followupRate DESC
    `,
    minSampleSize: 5,
    deviationThreshold: 0.2,
    insightTemplate: 'Meetings at {hour}:00 generate {rate}% more follow-up tasks than average',
    recommendationTemplate: 'Schedule important meetings around {hour}:00 for better follow-through',
  },
  {
    type: 'email_response_time',
    name: 'Email Response Patterns',
    description: 'Identifies contacts with faster or slower response times',
    category: 'collaboration',
    query: `
      MATCH (sent:Email)-[:SENT_BY]->(:Contact {id: $userId})
      MATCH (reply:Email)-[:REPLY_TO]->(sent)
      WITH reply.sender as contact,
           duration.between(sent.date, reply.date).hours as responseHours
      WHERE responseHours > 0 AND responseHours < 168
      WITH contact, avg(responseHours) as avgResponseTime, count(*) as emailCount
      WHERE emailCount >= $minSampleSize
      RETURN contact, avgResponseTime, emailCount
      ORDER BY avgResponseTime
    `,
    minSampleSize: 3,
    deviationThreshold: 0.5,
    insightTemplate: 'You respond to {contact} {rate}x faster than average',
    recommendationTemplate: 'Consider prioritizing responses to {contact}',
  },
  {
    type: 'task_completion_velocity',
    name: 'Task Completion Velocity',
    description: 'Analyzes task completion speed by creation day',
    category: 'productivity',
    query: `
      MATCH (t:Task)
      WHERE t.completedAt IS NOT NULL
      AND t.createdAt > datetime() - duration({days: $lookbackDays})
      WITH t.createdAt.dayOfWeek as dayCreated,
           duration.between(t.createdAt, t.completedAt).hours as completionHours
      WHERE completionHours > 0 AND completionHours < 720
      WITH dayCreated, avg(completionHours) as avgCompletion, count(*) as taskCount
      WHERE taskCount >= $minSampleSize
      RETURN dayCreated, avgCompletion, taskCount
      ORDER BY avgCompletion
    `,
    minSampleSize: 5,
    deviationThreshold: 0.3,
    insightTemplate: 'Tasks created on {day} complete {rate}% faster than average',
    recommendationTemplate: 'Create important tasks on {day} for faster completion',
  },
  {
    type: 'meeting_duration_drift',
    name: 'Meeting Duration Drift',
    description: 'Detects recurring meetings that consistently run over/under scheduled time',
    category: 'patterns',
    query: `
      MATCH (e:Event)
      WHERE e.isRecurring = true
      AND e.actualEndTime IS NOT NULL
      AND e.startTime > datetime() - duration({days: $lookbackDays})
      WITH e.recurringId as recurringId, e.title as title,
           e.scheduledDuration as scheduled,
           duration.between(e.startTime, e.actualEndTime).minutes as actual
      WITH recurringId, title, scheduled, avg(actual) as avgActual, count(*) as occurrences
      WHERE occurrences >= $minSampleSize
      AND abs(avgActual - scheduled) / scheduled > $deviationThreshold
      RETURN recurringId, title, scheduled, avgActual, occurrences,
             (avgActual - scheduled) / scheduled as driftPercent
      ORDER BY abs(driftPercent) DESC
    `,
    minSampleSize: 3,
    deviationThreshold: 0.15,
    insightTemplate: '"{title}" runs {drift}% longer than scheduled',
    recommendationTemplate: 'Consider adjusting "{title}" to {suggested} minutes',
  },
  {
    type: 'collaboration_clusters',
    name: 'Collaboration Clusters',
    description: 'Identifies groups of people you collaborate with frequently',
    category: 'collaboration',
    query: `
      MATCH (c1:Contact)-[:ATTENDED]->(:Event)<-[:ATTENDED]-(c2:Contact)
      WHERE c1.id <> c2.id
      AND c1.id > c2.id
      WITH c1, c2, count(*) as sharedMeetings
      WHERE sharedMeetings >= $minSampleSize
      RETURN c1.name as person1, c2.name as person2, sharedMeetings
      ORDER BY sharedMeetings DESC
      LIMIT 10
    `,
    minSampleSize: 3,
    deviationThreshold: 0,
    insightTemplate: 'You collaborate most with {person1} and {person2} ({count} shared meetings)',
    recommendationTemplate: 'Consider creating a team channel for {person1} and {person2}',
  },
  {
    type: 'productivity_windows',
    name: 'Productivity Windows',
    description: 'Identifies most productive hours based on task completion',
    category: 'productivity',
    query: `
      MATCH (t:Task)
      WHERE t.completedAt IS NOT NULL
      AND t.completedAt > datetime() - duration({days: $lookbackDays})
      WITH t.completedAt.hour as hour, count(*) as tasksCompleted
      WHERE tasksCompleted >= $minSampleSize
      WITH collect({hour: hour, count: tasksCompleted}) as hourData,
           sum(tasksCompleted) as total
      UNWIND hourData as hd
      RETURN hd.hour as hour, hd.count as tasksCompleted,
             toFloat(hd.count) / total as proportion
      ORDER BY tasksCompleted DESC
    `,
    minSampleSize: 5,
    deviationThreshold: 0.2,
    insightTemplate: 'You are most productive between {startHour}:00-{endHour}:00 ({rate}% of tasks completed)',
    recommendationTemplate: 'Protect {startHour}:00-{endHour}:00 for focused work',
  },
  {
    type: 'communication_patterns',
    name: 'Communication Patterns',
    description: 'Analyzes communication frequency and preferred channels',
    category: 'trends',
    query: `
      MATCH (e:Email)
      WHERE e.date > datetime() - duration({days: $lookbackDays})
      WITH e.date.dayOfWeek as day, count(*) as emailCount
      RETURN day, emailCount
      ORDER BY day
    `,
    minSampleSize: 10,
    deviationThreshold: 0.3,
    insightTemplate: 'Email volume peaks on {day} ({count}% above average)',
    recommendationTemplate: 'Schedule email processing time on {day}',
  },
];

/**
 * Get pattern definition by type
 */
export function getPatternDefinition(type: PatternType): PatternDefinition | undefined {
  return PATTERN_DEFINITIONS.find((p) => p.type === type);
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(
  category: PatternDefinition['category']
): PatternDefinition[] {
  return PATTERN_DEFINITIONS.filter((p) => p.category === category);
}

/**
 * Day of week number to name
 */
export function dayOfWeekName(dayNum: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum] ?? `Day ${dayNum}`;
}

/**
 * Format hour for display
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}
