import { createHttpNeo4jClient, type Neo4jHttpClient } from '../neo4j/http-client';
import { createVersionedOperations } from '../../graph/versioning';
import { formatAsJson, type ExportNode, type ExportData } from './formatters/json';
import { formatAsCsv } from './formatters/csv';
import { formatAsMarkdown } from './formatters/markdown';

export type ExportFormat = 'json' | 'csv' | 'markdown';

export interface ExportOptions {
  userId: string;
  format: ExportFormat;
  includeRelationships?: boolean;
  includeVersionHistory?: boolean;
  nodeTypes?: string[];
}

export class DataExporter {
  private client: Neo4jHttpClient;

  constructor(client?: Neo4jHttpClient) {
    this.client = client || createHttpNeo4jClient();
  }

  async exportUserData(options: ExportOptions): Promise<string> {
    const {
      userId,
      format,
      includeRelationships = true,
      includeVersionHistory = false,
      nodeTypes,
    } = options;

    // Fetch all user data from graph
    const nodes = await this.fetchUserNodes(userId, nodeTypes, includeRelationships);

    // Optionally fetch version history for each node
    if (includeVersionHistory) {
      await this.enrichWithVersionHistory(nodes);
    }

    // Format based on requested format
    const exportData: ExportData = {
      exportDate: new Date().toISOString(),
      userId,
      format: format.toUpperCase(),
      nodeCount: nodes.length,
      nodes,
    };

    switch (format) {
      case 'json':
        return formatAsJson(exportData);
      case 'csv':
        return formatAsCsv(nodes);
      case 'markdown':
        return formatAsMarkdown(nodes, userId);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async fetchUserNodes(
    userId: string,
    nodeTypes?: string[],
    includeRelationships = true
  ): Promise<ExportNode[]> {
    // Build type filter
    const types = nodeTypes?.length
      ? nodeTypes.map((t) => `n:${t}`).join(' OR ')
      : 'n:Concept OR n:Entity OR n:Event OR n:Contact';

    // Build query - exclude embedding from properties (too large)
    const query = `
      MATCH (n)
      WHERE n.userId = $userId AND (${types})
      ${includeRelationships ? `
        OPTIONAL MATCH (n)-[r]->(m)
        WHERE m.userId = $userId
      ` : ''}
      RETURN
        n.id as id,
        labels(n)[0] as type,
        n.name as name,
        n.created_at as createdAt,
        properties(n) as props
        ${includeRelationships ? `,
          collect(DISTINCT {
            type: type(r),
            targetId: m.id,
            targetName: m.name
          }) as relationships
        ` : ''}
    `;

    const result = await this.client.query(query, { userId });

    return result.map((row) => {
      // Remove embedding from properties
      const props = row.props as Record<string, unknown>;
      const { embedding, userId: _, ...cleanProps } = props;

      const node: ExportNode = {
        id: row.id as string,
        type: row.type as string,
        name: row.name as string | undefined,
        createdAt: row.createdAt as string | undefined,
        properties: cleanProps,
      };

      if (includeRelationships && row.relationships) {
        node.relationships = (row.relationships as any[]).filter(
          (r) => r.type && r.targetId
        );
      }

      return node;
    });
  }

  private async enrichWithVersionHistory(nodes: ExportNode[]): Promise<void> {
    const versionOps = createVersionedOperations(this.client);

    for (const node of nodes) {
      try {
        const history = await versionOps.getVersionHistory(node.id, 20);
        if (history.length > 0) {
          node.versionHistory = history.map((h) => ({
            version: h.version,
            createdAt: h.createdAt,
            createdBy: h.createdBy,
            changeDescription: h.changeDescription,
          }));
        }
      } catch (error) {
        // Node may not have version history - continue
        console.warn(`[Export] No version history for ${node.id}`);
      }
    }
  }

  /**
   * Get content type for export format
   */
  static getContentType(format: ExportFormat): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'markdown':
        return 'text/markdown';
    }
  }

  /**
   * Get file extension for export format
   */
  static getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'json':
        return 'json';
      case 'csv':
        return 'csv';
      case 'markdown':
        return 'md';
    }
  }
}
