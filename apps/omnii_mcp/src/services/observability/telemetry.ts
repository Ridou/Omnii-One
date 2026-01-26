import { opentelemetry } from '@elysiajs/opentelemetry';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

export function createTelemetryPlugin() {
  // Skip in development if no collector configured
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!otlpEndpoint && process.env.NODE_ENV !== 'production') {
    console.warn('[OpenTelemetry] No OTLP endpoint configured, using noop exporter');
    return opentelemetry({
      serviceName: 'omnii-mcp',
    });
  }

  return opentelemetry({
    serviceName: 'omnii-mcp',
    spanProcessors: otlpEndpoint
      ? [
          new BatchSpanProcessor(
            new OTLPTraceExporter({
              url: otlpEndpoint,
            })
          ),
        ]
      : undefined,
  });
}
