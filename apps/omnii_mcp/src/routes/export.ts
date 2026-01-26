import { Elysia, t } from 'elysia';
import { DataExporter, type ExportFormat } from '../services/export';
import { logAuditEvent, AuditEventType } from '../services/audit';

export const exportRoutes = new Elysia({ prefix: '/export' })
  // Export user data
  .get(
    '/',
    async ({ query, set, request }) => {
      const userId = query.userId;
      const format = (query.format || 'json') as ExportFormat;

      if (!userId) {
        set.status = 400;
        return { error: 'userId is required' };
      }

      // Validate format
      if (!['json', 'csv', 'markdown'].includes(format)) {
        set.status = 400;
        return { error: 'Invalid format. Must be json, csv, or markdown' };
      }

      try {
        const exporter = new DataExporter();
        const data = await exporter.exportUserData({
          userId,
          format,
          includeRelationships: query.includeRelationships !== 'false',
          includeVersionHistory: query.includeVersionHistory === 'true',
          nodeTypes: query.nodeTypes?.split(','),
        });

        // Log audit event
        await logAuditEvent({
          eventType: AuditEventType.GRAPH_DATA_ACCESSED,
          actor: { type: 'user', id: userId },
          resource: { type: 'export', id: `export-${Date.now()}` },
          action: 'export',
          metadata: {
            format,
            includeVersionHistory: query.includeVersionHistory === 'true',
          },
          severity: 'info',
          correlationId: request.headers.get('x-correlation-id') || undefined,
        });

        // Set response headers for download
        const filename = `omnii-export-${new Date().toISOString().split('T')[0]}.${DataExporter.getFileExtension(format)}`;
        set.headers = {
          'Content-Type': DataExporter.getContentType(format),
          'Content-Disposition': `attachment; filename="${filename}"`,
        };

        return data;
      } catch (error) {
        console.error('[Export] Failed:', error);
        set.status = 500;
        return {
          error: 'Export failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      query: t.Object({
        userId: t.String(),
        format: t.Optional(t.Union([
          t.Literal('json'),
          t.Literal('csv'),
          t.Literal('markdown'),
        ])),
        includeRelationships: t.Optional(t.String()),
        includeVersionHistory: t.Optional(t.String()),
        nodeTypes: t.Optional(t.String()),
      }),
    }
  )

  // Health check
  .get('/health', () => ({
    status: 'ok',
    formats: ['json', 'csv', 'markdown'],
  }));
