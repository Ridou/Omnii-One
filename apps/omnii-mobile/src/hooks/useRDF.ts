import { useState, useCallback } from 'react';

// EXACT constants - NO environment variables, just like useNeo4jSimple
const API_BASE_URL = "http://localhost:8000";
const API_RDF_URL = `${API_BASE_URL}/api/rdf`;

/**
 * Simple RDF hook that directly calls the RDF endpoints
 * Similar to useNeo4jSimple - no tRPC, just fetch
 */
export const useRDF = () => {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [concepts, setConcepts] = useState<any>(null);
  const [nameVariations, setNameVariations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analyze message - matches test-local-rdf-flow.js exactly
  const analyzeMessage = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_RDF_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
      });
      console.log('RDF analyze message to:', response);
      const data = await response.json();
      console.log('RDF analyze response data:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        throw new Error(data.error || 'RDF analysis failed');
      }
      
      // Store the entire response, not just data.analysis
      setAnalysisResult(data);
      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to analyze message';
      setError(errorMsg);
      console.error('Failed to analyze message:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Extract concepts - matches test-local-rdf-flow.js exactly  
  const extractConcepts = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_RDF_URL}/extract-concepts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      console.log('RDF extract concepts response data:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        throw new Error(data.error || 'Concept extraction failed');
      }
      
      // Store the entire response
      setConcepts(data);
      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to extract concepts';
      setError(errorMsg);
      console.error('Failed to extract concepts:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Expand contact name - for name variations
  const expandContactName = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_RDF_URL}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Name expansion failed');
      }
      
      // Extract variations similar to RDF router
      const variations = [name]; // Always include original
      
      if (data.phonetic_variations?.variations) {
        variations.push(...data.phonetic_variations.variations);
      }
      if (data.nicknames?.variations) {
        variations.push(...data.nicknames.variations);
      }
      if (data.cultural_variants?.variations) {
        variations.push(...data.cultural_variants.variations);
      }
      
      const uniqueVariations = [...new Set(variations)];
      setNameVariations(uniqueVariations);
      return uniqueVariations;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to expand name';
      setError(errorMsg);
      console.error('Failed to expand contact name:', error);
      return [name]; // Return original name on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Health check
  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_RDF_URL}/health`);
      const data = await response.json();
      return { healthy: response.ok, ...data };
    } catch (error) {
      console.error('RDF health check failed:', error);
      return { healthy: false };
    }
  }, []);

  return {
    // State
    analysisResult,
    concepts,
    nameVariations,
    loading,
    error,
    
    // Actions
    analyzeMessage,
    extractConcepts,
    expandContactName,
    checkHealth,
    
    // Helpers from analysis result
    // The response structure varies, so let's handle multiple formats
    getPrimaryContact: () => {
      if (!analysisResult) return null;
      // Navigate through nested structure
      const analysis = analysisResult?.analysis?.analysis || analysisResult?.analysis || analysisResult;
      // Look for contact in multiple places
      return analysis?.contact_extraction?.primary_contact || 
             analysis?.brain_memory_analysis?.primary_contact ||
             null;
    },
    getIntent: () => {
      if (!analysisResult) return null;
      const analysis = analysisResult?.analysis?.analysis || analysisResult?.analysis || analysisResult;
      return analysis?.intent_analysis?.communication_action || 
             analysis?.ai_insights?.intent ||
             null;
    },
    getFormality: () => {
      if (!analysisResult) return null;
      const analysis = analysisResult?.analysis?.analysis || analysisResult?.analysis || analysisResult;
      return analysis?.context_analysis?.formality_level || null;
    },
    getConfidence: () => {
      if (!analysisResult) return 0;
      const analysis = analysisResult?.analysis?.analysis || analysisResult?.analysis || analysisResult;
      return analysis?.contact_extraction?.confidence || 
             analysis?.confidence ||
             analysisResult?.analysis?.confidence ||
             analysis?.ai_insights?.confidence_metrics?.overall_confidence ||
             0;
    },
    
    // Helpers from concepts
    // The MCP service returns: { success: true, concepts: [...], sentiment: {...}, intent: "...", timestamp: "..." }
    getConceptsArray: () => concepts?.concepts || [],
    getSentiment: () => concepts?.sentiment,
    getTextIntent: () => concepts?.intent,
    
    // Debug helpers - get raw responses
    getRawAnalysisResult: () => analysisResult,
    getRawConcepts: () => concepts,
  };
};