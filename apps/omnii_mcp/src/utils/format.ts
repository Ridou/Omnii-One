/**
 * Format memory data for inclusion in the prompt
 * 
 * @param memory - Memory data from Supabase
 * @param screen - Current screen context
 * @returns Formatted memory text
 */
export function formatMemoryForPrompt(memory: any[], screen?: string): string {
  if (!memory || memory.length === 0) {
    return 'No relevant memory found.';
  }

  let formattedMemory = '';

  if (screen === 'journal') {
    // Format journal entries
    formattedMemory = memory.map(entry => 
      `[${formatDate(entry.created_at)}] ${entry.title || 'Untitled'}: ${entry.content}`
    ).join('\n\n');
  } else if (screen === 'goals') {
    // Format goals
    formattedMemory = memory.map(goal => 
      `Goal: ${goal.title}\nStatus: ${goal.status}\nDescription: ${goal.description}`
    ).join('\n\n');
  } else {
    // Default format for messages
    formattedMemory = memory.map(msg => 
      `[${formatDate(msg.created_at)}] ${msg.role === 'user' ? 'User' : 'Omnii'}: ${msg.content}`
    ).join('\n');
  }

  return formattedMemory;
}

/**
 * Format graph data for inclusion in the prompt
 * 
 * @param graphContext - Graph data from Neo4j
 * @returns Formatted graph context
 */
export function formatGraphForPrompt(graphContext: any): string {
  if (!graphContext || 
      !graphContext.nodes || 
      !graphContext.relationships || 
      graphContext.nodes.length === 0) {
    return 'No relevant graph connections found.';
  }

  // Create a map of node IDs to names for easier reference
  const nodeMap = new Map();
  graphContext.nodes.forEach((node: any) => {
    nodeMap.set(node.id, node.name || node.title || `Node ${node.id}`);
  });

  // Format relationships
  const formattedRelations = graphContext.relationships.map((rel: any) => {
    const fromNode = nodeMap.get(rel.from) || `Node ${rel.from}`;
    const toNode = nodeMap.get(rel.to) || `Node ${rel.to}`;
    return `${fromNode} ${formatRelationType(rel.type)} ${toNode}`;
  });

  return formattedRelations.join('\n');
}

/**
 * Format a date string
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Format relation type to be more readable
 */
function formatRelationType(type: string): string {
  // Convert camelCase or snake_case to readable text
  return type
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim();
} 