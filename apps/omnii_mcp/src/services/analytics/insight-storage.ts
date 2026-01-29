/**
 * Insight Storage
 *
 * Stores and manages detected analytics insights.
 */

import type { Neo4jHTTPClient } from '../neo4j/http-client';
import type { AnalyticsInsight, PatternType } from '../ai/types';

/**
 * Store insight in Neo4j
 */
export async function storeInsight(
  client: Neo4jHTTPClient,
  insight: AnalyticsInsight
): Promise<void> {
  const query = `
    MERGE (i:Insight {id: $id})
    SET i.type = $type,
        i.category = $category,
        i.title = $title,
        i.description = $description,
        i.confidence = $confidence,
        i.data = $data,
        i.recommendation = $recommendation,
        i.detectedAt = datetime($detectedAt),
        i.dismissed = $dismissed
  `;

  await client.query(query, {
    id: insight.id,
    type: insight.type,
    category: insight.category,
    title: insight.title,
    description: insight.description,
    confidence: insight.confidence,
    data: JSON.stringify(insight.data),
    recommendation: insight.recommendation,
    detectedAt: insight.detectedAt,
    dismissed: insight.dismissed,
  });
}

/**
 * Store multiple insights
 */
export async function storeInsights(
  client: Neo4jHTTPClient,
  insights: AnalyticsInsight[]
): Promise<void> {
  for (const insight of insights) {
    await storeInsight(client, insight);
  }
}

/**
 * Get insights by category
 */
export async function getInsightsByCategory(
  client: Neo4jHTTPClient,
  category: AnalyticsInsight['category'],
  limit = 20,
  includeDismissed = false
): Promise<AnalyticsInsight[]> {
  const query = `
    MATCH (i:Insight)
    WHERE i.category = $category
    ${includeDismissed ? '' : 'AND i.dismissed = false'}
    RETURN i
    ORDER BY i.detectedAt DESC
    LIMIT $limit
  `;

  const result = await client.query(query, { category, limit });

  return result.records.map((r) => {
    const node = r.get('i') as { properties: Record<string, unknown> } | null;
    return parseInsightRecord(node?.properties ?? {});
  });
}

/**
 * Get recent insights
 */
export async function getRecentInsights(
  client: Neo4jHTTPClient,
  limit = 20,
  daysBack = 7,
  includeDismissed = false
): Promise<AnalyticsInsight[]> {
  const query = `
    MATCH (i:Insight)
    WHERE i.detectedAt > datetime() - duration({days: $daysBack})
    ${includeDismissed ? '' : 'AND i.dismissed = false'}
    RETURN i
    ORDER BY i.confidence DESC, i.detectedAt DESC
    LIMIT $limit
  `;

  const result = await client.query(query, { limit, daysBack });

  return result.records.map((r) => {
    const node = r.get('i') as { properties: Record<string, unknown> } | null;
    return parseInsightRecord(node?.properties ?? {});
  });
}

/**
 * Get insight by ID
 */
export async function getInsightById(
  client: Neo4jHTTPClient,
  insightId: string
): Promise<AnalyticsInsight | null> {
  const query = `
    MATCH (i:Insight {id: $insightId})
    RETURN i
  `;

  const result = await client.query(query, { insightId });

  if (result.records.length === 0) {
    return null;
  }

  const node = result.records[0].get('i') as { properties: Record<string, unknown> } | null;
  return parseInsightRecord(node?.properties ?? {});
}

/**
 * Dismiss an insight
 */
export async function dismissInsight(
  client: Neo4jHTTPClient,
  insightId: string
): Promise<void> {
  const query = `
    MATCH (i:Insight {id: $insightId})
    SET i.dismissed = true, i.dismissedAt = datetime()
  `;

  await client.query(query, { insightId });
}

/**
 * Mark insight as viewed
 */
export async function markInsightViewed(
  client: Neo4jHTTPClient,
  insightId: string
): Promise<void> {
  const query = `
    MATCH (i:Insight {id: $insightId})
    SET i.viewedAt = datetime()
  `;

  await client.query(query, { insightId });
}

/**
 * Delete old insights
 */
export async function cleanupOldInsights(
  client: Neo4jHTTPClient,
  daysToKeep = 90
): Promise<number> {
  const query = `
    MATCH (i:Insight)
    WHERE i.detectedAt < datetime() - duration({days: $daysToKeep})
    DELETE i
    RETURN count(i) as deleted
  `;

  const result = await client.query(query, { daysToKeep });
  return (result.records[0]?.get('deleted') as number) ?? 0;
}

/**
 * Get insight statistics
 */
export async function getInsightStats(
  client: Neo4jHTTPClient
): Promise<{
  total: number;
  active: number;
  dismissed: number;
  byCategory: Record<string, number>;
  avgConfidence: number;
}> {
  const query = `
    MATCH (i:Insight)
    RETURN
      count(i) as total,
      sum(CASE WHEN i.dismissed = false THEN 1 ELSE 0 END) as active,
      sum(CASE WHEN i.dismissed = true THEN 1 ELSE 0 END) as dismissed,
      avg(i.confidence) as avgConfidence
  `;

  const result = await client.query(query, {});

  // Get counts by category
  const categoryQuery = `
    MATCH (i:Insight)
    RETURN i.category as category, count(i) as count
  `;
  const categoryResult = await client.query(categoryQuery, {});
  const byCategory: Record<string, number> = {};
  for (const r of categoryResult.records) {
    byCategory[r.get('category') as string] = r.get('count') as number;
  }

  if (result.records.length === 0) {
    return {
      total: 0,
      active: 0,
      dismissed: 0,
      byCategory,
      avgConfidence: 0,
    };
  }

  const record = result.records[0];
  return {
    total: record.get('total') as number,
    active: record.get('active') as number,
    dismissed: record.get('dismissed') as number,
    byCategory,
    avgConfidence: record.get('avgConfidence') as number,
  };
}

/**
 * Parse insight record from Neo4j
 */
function parseInsightRecord(props: Record<string, unknown>): AnalyticsInsight {
  return {
    id: props.id as string,
    type: props.type as PatternType,
    category: props.category as AnalyticsInsight['category'],
    title: props.title as string,
    description: props.description as string,
    confidence: props.confidence as number,
    data: JSON.parse((props.data as string) ?? '{}'),
    recommendation: props.recommendation as string,
    detectedAt: props.detectedAt?.toString() ?? '',
    dismissed: props.dismissed as boolean,
    viewedAt: props.viewedAt?.toString(),
  };
}
