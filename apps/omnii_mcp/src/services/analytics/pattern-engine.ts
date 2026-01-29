/**
 * Pattern Detection Engine
 *
 * Runs pattern queries and generates actionable insights.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { AnalyticsInsight, PatternType } from '../ai/types';
import type { PatternDefinition, PatternMatch } from './types';
import {
  PATTERN_DEFINITIONS,
  getPatternDefinition,
  dayOfWeekName,
  formatHour,
} from './pattern-definitions';
import { nanoid } from 'nanoid';

/**
 * Default detection parameters
 */
const DEFAULT_PARAMS = {
  lookbackDays: 30,
  minSampleSize: 5,
  deviationThreshold: 0.2,
};

/**
 * Run a single pattern query
 */
async function runPatternQuery(
  client: Neo4jHTTPClient,
  pattern: PatternDefinition,
  params: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  try {
    const result = await client.query(pattern.query, {
      ...DEFAULT_PARAMS,
      ...params,
      minSampleSize: pattern.minSampleSize,
      deviationThreshold: pattern.deviationThreshold,
    });

    return result.records.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const key of r.keys()) {
        obj[key] = r.get(key);
      }
      return obj;
    });
  } catch (error) {
    console.error(`Pattern query failed for ${pattern.type}:`, error);
    return [];
  }
}

/**
 * Evaluate if a pattern result is statistically significant
 */
function evaluateSignificance(
  data: Record<string, unknown>[],
  pattern: PatternDefinition
): { isSignificant: boolean; deviation: number; sampleSize: number } {
  if (data.length === 0) {
    return { isSignificant: false, deviation: 0, sampleSize: 0 };
  }

  // Calculate total sample size
  const sampleSize = data.reduce((sum, row) => {
    const count =
      (row['meetings'] as number) ??
      (row['emailCount'] as number) ??
      (row['taskCount'] as number) ??
      (row['occurrences'] as number) ??
      1;
    return sum + count;
  }, 0);

  // Check minimum sample size
  if (sampleSize < pattern.minSampleSize) {
    return { isSignificant: false, deviation: 0, sampleSize };
  }

  // Calculate deviation (depends on pattern type)
  let deviation = 0;
  const firstRow = data[0];

  if (firstRow) {
    if ('followupRate' in firstRow) {
      const rates = data.map((r) => r['followupRate'] as number);
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      deviation = ((rates[0] ?? 0) - avg) / (avg || 1);
    } else if ('driftPercent' in firstRow) {
      deviation = firstRow['driftPercent'] as number;
    } else if ('avgCompletion' in firstRow) {
      const times = data.map((r) => r['avgCompletion'] as number);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      deviation = (avg - (times[0] ?? 0)) / (avg || 1);
    }
  }

  const isSignificant = Math.abs(deviation) >= pattern.deviationThreshold;

  return { isSignificant, deviation, sampleSize };
}

/**
 * Generate insight text from pattern match
 */
function generateInsightText(
  pattern: PatternDefinition,
  data: Record<string, unknown>[],
  deviation: number
): string {
  if (data.length === 0) return '';

  const firstRow = data[0];
  let text = pattern.insightTemplate;

  // Replace placeholders based on pattern type
  switch (pattern.type) {
    case 'meeting_followup_rate':
      text = text
        .replace('{hour}', formatHour((firstRow?.['meetingHour'] as number) ?? 0))
        .replace('{rate}', Math.round(Math.abs(deviation) * 100).toString());
      break;

    case 'task_completion_velocity':
      text = text
        .replace('{day}', dayOfWeekName((firstRow?.['dayCreated'] as number) ?? 0))
        .replace('{rate}', Math.round(Math.abs(deviation) * 100).toString());
      break;

    case 'meeting_duration_drift':
      text = text
        .replace('{title}', (firstRow?.['title'] as string) ?? 'Meeting')
        .replace('{drift}', Math.round(Math.abs(deviation) * 100).toString());
      break;

    case 'collaboration_clusters':
      text = text
        .replace('{person1}', (firstRow?.['person1'] as string) ?? 'Person 1')
        .replace('{person2}', (firstRow?.['person2'] as string) ?? 'Person 2')
        .replace('{count}', ((firstRow?.['sharedMeetings'] as number) ?? 0).toString());
      break;

    case 'productivity_windows':
      const topHours = data.slice(0, 3).map((r) => r['hour'] as number);
      const startHour = Math.min(...topHours);
      const endHour = Math.max(...topHours) + 1;
      const totalProportion = data
        .slice(0, 3)
        .reduce((sum, r) => sum + ((r['proportion'] as number) ?? 0), 0);
      text = text
        .replace('{startHour}', startHour.toString())
        .replace('{endHour}', endHour.toString())
        .replace('{rate}', Math.round(totalProportion * 100).toString());
      break;

    default:
      // Generic replacement
      for (const [key, value] of Object.entries(firstRow ?? {})) {
        text = text.replace(`{${key}}`, String(value));
      }
  }

  return text;
}

/**
 * Generate recommendation from pattern match
 */
function generateRecommendation(
  pattern: PatternDefinition,
  data: Record<string, unknown>[]
): string {
  if (data.length === 0) return '';

  const firstRow = data[0];
  let text = pattern.recommendationTemplate;

  // Similar replacement logic as generateInsightText
  switch (pattern.type) {
    case 'meeting_followup_rate':
      text = text.replace('{hour}', formatHour((firstRow?.['meetingHour'] as number) ?? 0));
      break;

    case 'task_completion_velocity':
      text = text.replace('{day}', dayOfWeekName((firstRow?.['dayCreated'] as number) ?? 0));
      break;

    case 'meeting_duration_drift':
      const scheduled = (firstRow?.['scheduled'] as number) ?? 30;
      const avgActual = (firstRow?.['avgActual'] as number) ?? 30;
      const suggested = Math.round(avgActual / 15) * 15; // Round to 15 min
      text = text
        .replace('{title}', (firstRow?.['title'] as string) ?? 'Meeting')
        .replace('{suggested}', suggested.toString());
      break;

    case 'productivity_windows':
      const topHours = data.slice(0, 3).map((r) => r['hour'] as number);
      text = text
        .replace('{startHour}', Math.min(...topHours).toString())
        .replace('{endHour}', (Math.max(...topHours) + 1).toString());
      break;

    default:
      for (const [key, value] of Object.entries(firstRow ?? {})) {
        text = text.replace(`{${key}}`, String(value));
      }
  }

  return text;
}

/**
 * Detect patterns and generate insights
 */
export async function detectPatterns(
  client: Neo4jHTTPClient,
  params: {
    lookbackDays?: number;
    patternTypes?: PatternType[];
  } = {}
): Promise<AnalyticsInsight[]> {
  const insights: AnalyticsInsight[] = [];
  const lookbackDays = params.lookbackDays ?? DEFAULT_PARAMS.lookbackDays;

  // Filter patterns if specific types requested
  const patternsToRun = params.patternTypes
    ? PATTERN_DEFINITIONS.filter((p) => params.patternTypes?.includes(p.type))
    : PATTERN_DEFINITIONS;

  for (const pattern of patternsToRun) {
    try {
      // Run query
      const data = await runPatternQuery(client, pattern, { lookbackDays });

      // Evaluate significance
      const { isSignificant, deviation, sampleSize } = evaluateSignificance(
        data,
        pattern
      );

      if (isSignificant && data.length > 0) {
        // Generate insight
        const insight: AnalyticsInsight = {
          id: nanoid(),
          type: pattern.type,
          category: pattern.category,
          title: pattern.name,
          description: generateInsightText(pattern, data, deviation),
          confidence: Math.min(0.9, 0.5 + sampleSize / 50), // Higher sample = higher confidence
          data: {
            rawData: data.slice(0, 5),
            sampleSize,
            deviation,
          },
          recommendation: generateRecommendation(pattern, data),
          detectedAt: new Date().toISOString(),
          dismissed: false,
        };

        insights.push(insight);
      }
    } catch (error) {
      console.error(`Failed to detect pattern ${pattern.type}:`, error);
    }
  }

  // Sort by confidence (highest first)
  insights.sort((a, b) => b.confidence - a.confidence);

  return insights;
}

/**
 * Run single pattern detection
 */
export async function detectSinglePattern(
  client: Neo4jHTTPClient,
  patternType: PatternType,
  params: { lookbackDays?: number } = {}
): Promise<AnalyticsInsight | null> {
  const insights = await detectPatterns(client, {
    ...params,
    patternTypes: [patternType],
  });

  return insights[0] ?? null;
}
