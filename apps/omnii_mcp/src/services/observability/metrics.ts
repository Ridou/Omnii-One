import pino from 'pino';

export const metricsLogger = pino({
  name: 'omnii-metrics',
  level: 'info',
  base: {
    service: 'omnii-mcp',
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export interface ApiLatencyMetric {
  metric: 'api_latency';
  route: string;
  method: string;
  duration: number;
  status: number;
}

export interface GraphQueryMetric {
  metric: 'graph_query_duration';
  queryType: string;
  duration: number;
  resultCount?: number;
}

export interface SyncMetric {
  metric: 'sync_duration';
  source: 'calendar' | 'tasks' | 'gmail' | 'contacts';
  userId: string;
  duration: number;
  itemsSynced: number;
}

export type PerformanceMetric = ApiLatencyMetric | GraphQueryMetric | SyncMetric;

export function logMetric(metric: PerformanceMetric): void {
  metricsLogger.info(metric);
}

export async function timedOperation<T>(
  metricType: string,
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;

  metricsLogger.info({
    metric: 'operation_duration',
    operation: metricType,
    duration,
  });

  return { result, duration };
}
