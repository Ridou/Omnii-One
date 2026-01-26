import type { ExportNode } from './json';

export function formatAsMarkdown(nodes: ExportNode[], userId: string): string {
  const lines: string[] = [];

  lines.push('# Data Export');
  lines.push('');
  lines.push(`**Export Date:** ${new Date().toISOString()}`);
  lines.push(`**User ID:** ${userId}`);
  lines.push(`**Total Items:** ${nodes.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Group by type
  const grouped = new Map<string, ExportNode[]>();
  for (const node of nodes) {
    const existing = grouped.get(node.type) || [];
    existing.push(node);
    grouped.set(node.type, existing);
  }

  for (const [type, typeNodes] of grouped) {
    lines.push(`## ${type}s (${typeNodes.length})`);
    lines.push('');

    for (const node of typeNodes) {
      lines.push(`### ${node.name || node.id}`);
      lines.push('');
      lines.push(`- **ID:** \`${node.id}\``);
      if (node.createdAt) {
        lines.push(`- **Created:** ${node.createdAt}`);
      }

      // Properties
      const props = Object.entries(node.properties)
        .filter(([key]) => !['id', 'name', 'createdAt', 'embedding'].includes(key));

      if (props.length > 0) {
        lines.push('- **Properties:**');
        for (const [key, value] of props) {
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          lines.push(`  - ${key}: ${displayValue}`);
        }
      }

      // Relationships
      if (node.relationships && node.relationships.length > 0) {
        lines.push('- **Relationships:**');
        for (const rel of node.relationships) {
          lines.push(`  - ${rel.type} -> ${rel.targetName || rel.targetId}`);
        }
      }

      // Version history
      if (node.versionHistory && node.versionHistory.length > 0) {
        lines.push(`- **Version History:** ${node.versionHistory.length} versions`);
        for (const ver of node.versionHistory.slice(0, 5)) {
          lines.push(`  - v${ver.version} (${ver.createdAt}) by ${ver.createdBy}${ver.changeDescription ? `: ${ver.changeDescription}` : ''}`);
        }
        if (node.versionHistory.length > 5) {
          lines.push(`  - ...and ${node.versionHistory.length - 5} more`);
        }
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}
