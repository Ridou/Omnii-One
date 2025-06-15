# Neo4j tRPC Integration Usage

## Overview

The Neo4j tRPC router provides access to the brain memory graph database through type-safe procedures. It connects to the MCP service via HTTP calls with environment-aware URL resolution.

## Available Procedures

### 1. `searchNodes`
Search across all node types (Concepts, Emails, Events) in the graph.

```typescript
// In your React component
import { useNeo4jQueries } from '~/hooks/useNeo4j';

const MyComponent = () => {
  const { searchNodes } = useNeo4jQueries();
  const { data, isLoading } = searchNodes('machine learning', 10);
  
  if (isLoading) return <Text>Searching...</Text>;
  
  return (
    <View>
      {data?.data?.map(node => (
        <Text key={node.id}>{node.properties.name}</Text>
      ))}
    </View>
  );
};
```

### 2. `listNodes`
List nodes of a specific type with optional filtering.

```typescript
// Using the main hook
import { useNeo4j } from '~/hooks/useNeo4j';

const ConceptsList = () => {
  const { nodes, isLoading, totalNodes } = useNeo4j();
  
  return (
    <View>
      <Text>Total Concepts: {totalNodes}</Text>
      {nodes?.map(concept => (
        <Text key={concept.id}>{concept.properties.name}</Text>
      ))}
    </View>
  );
};
```

### 3. `getNodeContext`
Get relationships and connected nodes for a specific node (currently returns mock data).

```typescript
import { useNodeRelationships } from '~/hooks/useNeo4j';

const NodeDetails = ({ nodeId }: { nodeId: string }) => {
  const { context, relatedNodes, relationshipTypes } = useNodeRelationships(nodeId);
  
  return (
    <View>
      <Text>Related Nodes: {relatedNodes.length}</Text>
      <Text>Relationship Types: {relationshipTypes.join(', ')}</Text>
    </View>
  );
};
```

## Hook Usage Examples

### Basic Concepts Hook
```typescript
import { useConcepts } from '~/hooks/useNeo4j';

const ConceptsView = () => {
  const {
    concepts,
    totalConcepts,
    getConceptByName,
    searchConceptsByName,
    getRecentConcepts,
    getActiveConcepts
  } = useConcepts();
  
  // Search for concepts by name
  const mlConcepts = searchConceptsByName('machine learning');
  
  // Get recently mentioned concepts
  const recentConcepts = getRecentConcepts(5);
  
  // Get highly activated concepts
  const activeConcepts = getActiveConcepts(0.7);
  
  return (
    // Your UI here
  );
};
```

### Brain Memory Search
```typescript
import { useBrainMemory } from '~/hooks/useNeo4j';

const MemorySearch = () => {
  const { searchMemory, searchConversations, searchConcepts } = useBrainMemory();
  
  // Search across all memory types
  const { data: allResults } = searchMemory('project deadline');
  
  // Search specific memory types
  const { data: conversations } = searchConversations('meeting');
  const { data: concepts } = searchConcepts('AI');
  
  return (
    // Your UI here
  );
};
```

## Environment Configuration

The Neo4j router automatically detects the environment and uses the appropriate MCP service URL:

- **Local Development**: `http://localhost:9090`
- **Production**: `https://omniimcp-production.up.railway.app`

You can override this by setting the `MCP_SERVICE_URL` environment variable.

## Type Safety

All procedures are fully typed through tRPC, providing:
- Compile-time type checking
- Autocompletion in your IDE
- Runtime validation with Zod schemas

## Error Handling

The router returns a consistent response format:

```typescript
interface Neo4jResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  totalCount?: number;
}
```

Always check the `success` field before using the data:

```typescript
const { nodes, hasError, errorMessage } = useNeo4j();

if (hasError) {
  console.error('Failed to load nodes:', errorMessage);
  return <Text>Error: {errorMessage}</Text>;
}
```

## Performance Considerations

1. **Caching**: The MCP service implements Redis caching for Neo4j queries
2. **Pagination**: Use the `limit` parameter to control result size
3. **Filtering**: Apply filters at the query level to reduce data transfer

## Next Steps

To extend the Neo4j integration:

1. Add more specific node type routers (emails, events, etc.)
2. Implement the node context endpoint in the MCP service
3. Add mutation procedures for creating/updating nodes
4. Implement real-time subscriptions for graph changes