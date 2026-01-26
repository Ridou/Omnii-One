import type { ExportNode } from './json';

// Escape CSV values (handle commas, quotes, newlines)
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function formatAsCsv(nodes: ExportNode[]): string {
  const headers = ['type', 'id', 'name', 'createdAt', 'properties', 'relationships', 'versionCount'];
  const lines: string[] = [headers.join(',')];

  for (const node of nodes) {
    const row = [
      escapeCSV(node.type),
      escapeCSV(node.id),
      escapeCSV(node.name || ''),
      escapeCSV(node.createdAt || ''),
      escapeCSV(JSON.stringify(node.properties)),
      escapeCSV(node.relationships?.map((r) => `${r.type}->${r.targetId}`).join('; ') || ''),
      escapeCSV(node.versionHistory?.length || 0),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

export function* formatAsCsvStream(nodes: ExportNode[]): Generator<string> {
  const headers = ['type', 'id', 'name', 'createdAt', 'properties', 'relationships', 'versionCount'];
  yield headers.join(',') + '\n';

  for (const node of nodes) {
    const row = [
      escapeCSV(node.type),
      escapeCSV(node.id),
      escapeCSV(node.name || ''),
      escapeCSV(node.createdAt || ''),
      escapeCSV(JSON.stringify(node.properties)),
      escapeCSV(node.relationships?.map((r) => `${r.type}->${r.targetId}`).join('; ') || ''),
      escapeCSV(node.versionHistory?.length || 0),
    ];
    yield row.join(',') + '\n';
  }
}
