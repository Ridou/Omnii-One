/**
 * Analytics Types
 *
 * Type definitions for analytics patterns and insights.
 */

export type {
  AnalyticsInsight,
  PatternType,
  AnalyticsSummary,
} from '../ai/types';

/**
 * Pattern definition
 */
export interface PatternDefinition {
  type: import('../ai/types').PatternType;
  name: string;
  description: string;
  category: 'productivity' | 'collaboration' | 'patterns' | 'trends';
  /** Cypher query template */
  query: string;
  /** Minimum sample size for statistical significance */
  minSampleSize: number;
  /** Deviation threshold from baseline (percentage) */
  deviationThreshold: number;
  /** Template for generating insight text */
  insightTemplate: string;
  /** Template for recommendation */
  recommendationTemplate: string;
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  type: import('../ai/types').PatternType;
  data: Record<string, unknown>;
  sampleSize: number;
  deviation: number;
  isSignificant: boolean;
}

/**
 * Aggregation result from Cypher
 */
export interface AggregationResult {
  metric: string;
  value: number;
  baseline?: number;
  sampleSize: number;
  timeRange?: { start: string; end: string };
  breakdown?: Record<string, number>;
}
