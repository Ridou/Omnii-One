import { trpc } from '~/utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Hook for RDF semantic analysis and contact resolution using tRPC
 * Based on the working RDF Contact Analyzer from tests
 */
export const useRDF = () => {
  // Default to extracting concepts from a sample text
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery(trpc.rdf.extractConcepts.queryOptions({
    text: "List my recent contacts and tasks"
  }));

  // Handle the tRPC response wrapper
  const conceptsData = data?.success ? data.data : null;
  const hasError = !!error || (data && !data.success);
  const errorMessage = error?.message || 
    (data && !data.success ? data.message : null);

  return {
    // Data - all properly typed by tRPC
    concepts: conceptsData?.concepts || [],
    sentiment: conceptsData?.sentiment,
    intent: conceptsData?.intent,
    isLoading,
    isRefetching,
    
    // Error handling
    hasError,
    errorMessage,
    
    // Actions
    refetch,
    
    // Computed values
    totalConcepts: conceptsData?.concepts?.length ?? 0,
    
    // Helper functions
    getConceptByType: (type: string) => 
      conceptsData?.concepts?.filter(concept => concept.type === type) ?? [],
    
    getPersonConcepts: () =>
      conceptsData?.concepts?.filter(concept => concept.type === 'person') ?? [],
    
    getActionConcepts: () =>
      conceptsData?.concepts?.filter(concept => concept.type === 'action') ?? [],
    
    // Access to full tRPC response for debugging
    fullResponse: data,
    rawError: error,
  };
};

/**
 * Hook for RDF message analysis and contact resolution
 */
export const useRDFAnalysis = () => {
  const queryClient = useQueryClient();

  // Analyze message for contact communication
  const analyzeMessage = (text: string) => {
    return trpc.rdf.analyzeMessage.useQuery({ 
      text,
      domain: 'contact_communication',
      task: 'message_analysis',
      extractors: [
        'contact_names',
        'communication_intent',
        'context_clues',
        'formality_level',
        'urgency_indicators'
      ]
    });
  };

  // Extract concepts from text
  const extractConcepts = (text: string) => {
    return trpc.rdf.extractConcepts.useQuery({ text });
  };

  // Expand contact name with variations
  const expandContactName = (name: string) => {
    return trpc.rdf.expandContactName.useQuery({
      name,
      domain: 'name_linguistics',
      task: 'name_variation_generation',
      variation_types: [
        'phonetic_variations',
        'nickname_derivations',
        'cultural_variants',
        'orthographic_variations',
        'diminutive_forms',
        'similar_sounding_names'
      ]
    });
  };

  return {
    analyzeMessage,
    extractConcepts,
    expandContactName,
    
    // Invalidate queries helper
    invalidateRDF: () => {
      void queryClient.invalidateQueries({ 
        queryKey: [['rdf', 'analyzeMessage']] 
      });
      void queryClient.invalidateQueries({ 
        queryKey: [['rdf', 'extractConcepts']] 
      });
      void queryClient.invalidateQueries({ 
        queryKey: [['rdf', 'expandContactName']] 
      });
    },
  };
};

/**
 * Hook for contact resolution workflow
 * Combines message analysis, name expansion, and contact search
 */
export const useContactResolution = (message: string | null) => {
  const { analyzeMessage, expandContactName } = useRDFAnalysis();
  
  // Step 1: Analyze the message
  const messageAnalysis = analyzeMessage(message || '');
  
  // Extract primary contact from analysis
  const primaryContact = messageAnalysis.data?.data?.contact_extraction?.primary_contact;
  
  // Step 2: Expand contact name if we have one
  const nameExpansion = expandContactName(primaryContact || '');
  
  // Get analysis results
  const analysis = messageAnalysis.data?.success ? messageAnalysis.data.data : null;
  const variations = nameExpansion.data?.success ? nameExpansion.data.data.variations : [];
  
  return {
    // Message analysis
    analysis,
    isAnalyzing: messageAnalysis.isLoading,
    analysisError: messageAnalysis.error,
    
    // Name variations
    variations,
    isExpandingName: nameExpansion.isLoading,
    nameError: nameExpansion.error,
    
    // Combined loading state
    isLoading: messageAnalysis.isLoading || nameExpansion.isLoading,
    
    // Extracted values
    primaryContact,
    intent: analysis?.intent_analysis?.communication_action,
    formality: analysis?.context_analysis?.formality_level,
    confidence: analysis?.contact_extraction?.confidence || 0,
    
    // Refetch functions
    refetchAnalysis: messageAnalysis.refetch,
    refetchVariations: nameExpansion.refetch,
  };
};

/**
 * Hook for RDF service health and status
 */
export const useRDFStatus = () => {
  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth
  } = useQuery(trpc.rdf.health.queryOptions());

  const {
    data: statusData,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus
  } = useQuery(trpc.rdf.status.queryOptions());

  const health = healthData?.success ? healthData.data : null;
  const status = statusData?.success ? statusData.data : null;

  return {
    // Health check
    health,
    isHealthy: health?.status === 'healthy',
    healthLoading,
    healthError,
    refetchHealth,
    
    // Service status
    status,
    isAvailable: status?.status === 'available',
    statusLoading,
    statusError,
    refetchStatus,
    
    // Combined states
    isLoading: healthLoading || statusLoading,
    hasError: !!healthError || !!statusError,
    
    // Service info
    serviceVersion: status?.version,
    integration: status?.integration,
  };
};