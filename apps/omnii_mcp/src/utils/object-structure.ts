/**
 * Utility to get object structure outline (keys only, no values) for debugging
 * Prevents terminal spam when logging large objects
 */
export function getObjectStructure(obj: any, depth: number = 0, maxDepth: number = 5): string {
  if (depth > maxDepth) return '[max depth reached]';
  
  const indent = '  '.repeat(depth);
  
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return `[\n${indent}  ${getObjectStructure(obj[0], depth + 1, maxDepth)}\n${indent}] (${obj.length} items)`;
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    
    const keyStructures = keys.slice(0, 20).map(key => { // Limit to first 20 keys
      const value = obj[key];
      const valueStructure = getObjectStructure(value, depth + 1, maxDepth);
      return `${indent}  ${key}: ${valueStructure}`;
    });
    
    const truncatedNote = keys.length > 20 ? `\n${indent}  ... (${keys.length - 20} more keys)` : '';
    
    return `{\n${keyStructures.join(',\n')}${truncatedNote}\n${indent}}`;
  }
  
  return typeof obj;
}

/**
 * Utility to log object structure with a label
 */
export function logObjectStructure(label: string, obj: any, maxDepth: number = 5): void {
  console.log(`${label}:`);
  console.log(getObjectStructure(obj, 0, maxDepth));
} 