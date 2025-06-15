import { trpc } from '~/utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Hook for Neo4j graph operations using tRPC
 * Provides access to brain memory context, concepts, and node relationships
 */
export const useNeo4j = () => {
  // Query for listing nodes (defaults to Concepts)
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery(trpc.neo4j.listNodes.queryOptions({
    nodeType: 'Concept',
    limit: 100
  }));

  // Handle the tRPC response wrapper
  const nodesData = data?.success ? data.data : null;
  const hasError = !!error || (data && !data.success);
  const errorMessage = error?.message || 
    (data && !data.success ? data.message : null);

  return {
    // Data - all properly typed by tRPC
    nodes: nodesData,
    isLoading,
    isRefetching,
    
    // Error handling
    hasError,
    errorMessage,
    
    // Actions
    refetch,
    
    // Computed values
    totalNodes: nodesData?.length ?? 0,
    
    // Helper functions
    getNodeById: (id: string) => 
      nodesData?.find(node => node.id === id),
    
    getNodesByLabel: (label: string) =>
      nodesData?.filter(node => node.labels.includes(label)) ?? [],
    
    getConceptNodes: () =>
      nodesData?.filter(node => node.labels.includes('Concept')) ?? [],
    
    getEmailNodes: () =>
      nodesData?.filter(node => node.labels.includes('Email')) ?? [],
    
    getEventNodes: () =>
      nodesData?.filter(node => node.labels.includes('Event')) ?? [],
    
    // Access to full tRPC response for debugging
    fullResponse: data,
    rawError: error,
  };
};

/**
 * Hook for Neo4j queries and mutations
 */
export const useNeo4jQueries = () => {
  const queryClient = useQueryClient();

  // Search nodes
  const searchNodes = (query: string, limit?: number) => {
    return trpc.neo4j.searchNodes.useQuery({ 
      query, 
      limit: limit || 10 
    });
  };

  // Get node context
  const getNodeContext = (nodeId: string) => {
    return trpc.neo4j.getNodeContext.useQuery({ nodeId });
  };

  // List nodes by type
  const listNodesByType = (nodeType: string, limit?: number, filter?: string) => {
    return trpc.neo4j.listNodes.useQuery({
      nodeType,
      limit: limit || 100,
      filter
    });
  };

  return {
    searchNodes,
    getNodeContext,
    listNodesByType,
    
    // Invalidate queries helper
    invalidateNodes: () => {
      void queryClient.invalidateQueries({ 
        queryKey: [['neo4j', 'listNodes']] 
      });
      void queryClient.invalidateQueries({ 
        queryKey: [['neo4j', 'searchNodes']] 
      });
    },
  };
};

/**
 * Hook for concept-specific operations
 */
export const useConcepts = () => {
  const {
    data: conceptsData,
    isLoading,
    error,
    refetch
  } = useQuery(trpc.neo4j.listNodes.queryOptions({
    nodeType: 'Concept',
    limit: 1000
  }));

  const concepts = conceptsData?.success ? conceptsData.data : null;

  return {
    concepts,
    isLoading,
    error,
    refetch,
    
    // Concept-specific helpers
    totalConcepts: concepts?.length ?? 0,
    
    getConceptByName: (name: string) =>
      concepts?.find(concept => 
        concept.properties.name === name
      ),
    
    searchConceptsByName: (searchTerm: string) =>
      concepts?.filter(concept =>
        concept.properties.name?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      ) ?? [],
    
    getRecentConcepts: (limit = 10) =>
      concepts
        ?.filter(concept => concept.properties.last_mentioned)
        ?.sort((a, b) => {
          const aDate = new Date(a.properties.last_mentioned as string);
          const bDate = new Date(b.properties.last_mentioned as string);
          return bDate.getTime() - aDate.getTime();
        })
        ?.slice(0, limit) ?? [],
    
    getActiveConcepts: (threshold = 0.5) =>
      concepts?.filter(concept => 
        (concept.properties.activation_strength as number || 0) >= threshold
      ) ?? [],
  };
};

/**
 * Hook for brain memory operations
 */
export const useBrainMemory = () => {
  const { searchNodes } = useNeo4jQueries();
  
  // Search across all memory types
  const searchMemory = (query: string, limit = 20) => {
    return searchNodes(query, limit);
  };

  return {
    searchMemory,
    
    // Memory helpers
    searchConversations: (query: string) => searchMemory(query, 10),
    searchConcepts: (query: string) => searchMemory(query, 15),
    searchEmails: (query: string) => searchMemory(query, 10),
    searchEvents: (query: string) => searchMemory(query, 10),
  };
};

/**
 * Hook for node relationship exploration
 */
export const useNodeRelationships = (nodeId: string | null) => {
  const {
    data: contextData,
    isLoading,
    error,
    refetch
  } = useQuery(
    trpc.neo4j.getNodeContext.queryOptions({ nodeId: nodeId! }),
    {
      enabled: !!nodeId
    }
  );

  const context = contextData?.success ? contextData.data : null;

  return {
    context,
    isLoading,
    error,
    refetch,
    
    // Context helpers
    relatedNodes: context?.relationships.map(rel => ({
      node: rel.source === nodeId ? rel.target : rel.source,
      relationship: rel.type,
      properties: rel.properties
    })) ?? [],
    
    incomingRelationships: context?.relationships.filter(rel => 
      rel.target === nodeId
    ) ?? [],
    
    outgoingRelationships: context?.relationships.filter(rel => 
      rel.source === nodeId
    ) ?? [],
    
    relationshipTypes: Array.from(new Set(
      context?.relationships.map(rel => rel.type) ?? []
    )),
  };
};