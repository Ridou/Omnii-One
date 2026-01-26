export interface ExportNode {
  id: string;
  type: string;
  name?: string;
  properties: Record<string, unknown>;
  createdAt?: string;
  relationships?: {
    type: string;
    targetId: string;
    targetName?: string;
  }[];
  versionHistory?: {
    version: number;
    createdAt: string;
    createdBy: string;
    changeDescription?: string;
  }[];
}

export interface ExportData {
  exportDate: string;
  userId: string;
  format: string;
  nodeCount: number;
  nodes: ExportNode[];
}

export function formatAsJson(data: ExportData): string {
  return JSON.stringify(
    {
      exportDate: data.exportDate,
      userId: data.userId,
      format: 'GDPR Data Export - JSON',
      nodeCount: data.nodeCount,
      data: data.nodes,
    },
    null,
    2
  );
}

export function formatAsJsonStream(nodes: ExportNode[]): Generator<string> {
  return (function* () {
    yield '{\n';
    yield `  "exportDate": "${new Date().toISOString()}",\n`;
    yield `  "format": "GDPR Data Export - JSON",\n`;
    yield `  "nodeCount": ${nodes.length},\n`;
    yield '  "data": [\n';

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const json = JSON.stringify(node, null, 4).replace(/^/gm, '    ');
      yield json;
      if (i < nodes.length - 1) {
        yield ',';
      }
      yield '\n';
    }

    yield '  ]\n';
    yield '}\n';
  })();
}
