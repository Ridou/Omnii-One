import { useState, useCallback } from 'react';
import { useAuth } from '~/context/AuthContext';
import { env } from '~/lib/env';
import { supabase } from '~/lib/supabase';

// Direct Neo4j API constants - bypasses existing routes
// TEMPORARY: Use localhost for testing direct Neo4j connection
const API_BASE_URL = 'http://localhost:8000'; // env.app.backendBaseUrl;
const NEO4J_DIRECT_URL = `${API_BASE_URL}/api/neo4j-direct`;

// Enhanced interface for direct Neo4j concepts
interface DirectConcept {
  id: string;
  labels: string[];
  properties: {
    name?: string;
    content?: string;
    description?: string;
    keywords?: string;
    user_id?: string;
    created_at?: string;
    last_mentioned?: string;
    activation_strength?: number;
    mention_count?: number;
    relevanceScore?: number;
    [key: string]: any;
  };
}

interface DirectSearchResult {
  success: boolean;
  data: DirectConcept[];
  meta: {
    totalFound: number;
    searchTerm: string;
    executionTime: number;
    service: string;
  };
}

interface DirectListResult {
  success: boolean;
  data: DirectConcept[];
  meta: {
    totalFound: number;
    executionTime: number;
    service: string;
    limit: number;
    offset: number;
  };
}

// Helper function to get authentication headers
const getAuthHeaders = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session && !error) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      if (session.user?.id) {
        headers['x-user-id'] = session.user.id;
      }
      
      return headers;
    }
  } catch (error) {
    console.warn('Failed to get auth headers:', error);
  }
  
  return {
    'Content-Type': 'application/json',
  };
};

export const useNeo4jDirect = () => {
  const { user } = useAuth();
  const [concepts, setConcepts] = useState<DirectConcept[]>([]);
  const [searchResults, setSearchResults] = useState<DirectConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentSearch, setCurrentSearch] = useState('');
  const [totalConcepts, setTotalConcepts] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    responseTime?: number;
    totalConcepts?: number;
    version?: string;
  }>({ connected: false });

  // Health check for direct Neo4j service
  const checkHealth = useCallback(async () => {
    console.log('[Neo4j-Direct] 🏥 Checking direct Neo4j health...');
    console.log(`[Neo4j-Direct] 🔗 URL: ${NEO4J_DIRECT_URL}/health`);
    console.log(`[Neo4j-Direct] 🔗 Base URL: ${API_BASE_URL}`);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${NEO4J_DIRECT_URL}/health`, {
        method: 'GET',
        headers,
      });
      
      console.log(`[Neo4j-Direct] 📡 Response status: ${response.status}`);
      console.log(`[Neo4j-Direct] 📡 Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus({
          connected: data.connected,
          responseTime: data.responseTime,
          totalConcepts: data.totalConcepts,
          version: data.version
        });
        console.log(`[Neo4j-Direct] ✅ Health check: ${data.connected ? 'CONNECTED' : 'DISCONNECTED'} - ${data.totalConcepts} total concepts`);
        return data;
      } else {
        console.error(`[Neo4j-Direct] ❌ Health check failed with status: ${response.status}`);
        const responseText = await response.text();
        console.error(`[Neo4j-Direct] ❌ Response body:`, responseText);
      }
    } catch (error) {
      console.error('[Neo4j-Direct] ❌ Health check failed:', error);
      setConnectionStatus({ connected: false });
    }
    return { connected: false };
  }, []);

  // Search concepts directly - bypasses API routes
  const searchConcepts = useCallback(async (query: string = 'test', limit: number = 20) => {
    if (!user?.id) {
      console.error('[Neo4j-Direct] 🔒 No authenticated user found');
      setSearchResults([]);
      return [];
    }

    setSearchLoading(true);
    setCurrentSearch(query);
    
    try {
      console.log(`[Neo4j-Direct] 🔍 Direct search: "${query}" (limit: ${limit})`);
      
      const headers = await getAuthHeaders();
      const url = `${NEO4J_DIRECT_URL}/search?user_id=${user.id}&q=${encodeURIComponent(query)}&limit=${limit}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: DirectSearchResult = await response.json();
      
      if (result.success) {
        setSearchResults(result.data);
        console.log(`[Neo4j-Direct] ✅ Search found ${result.data.length} concepts in ${result.meta.executionTime}ms`);
        return result.data;
      } else {
        throw new Error('Search failed');
      }
      
    } catch (error) {
      console.error('[Neo4j-Direct] ❌ Search failed:', error);
      setSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, [user?.id]);

  // List concepts directly - bypasses API routes
  const listConcepts = useCallback(async (limit: number = 100, offset: number = 0) => {
    if (!user?.id) {
      console.error('[Neo4j-Direct] 🔒 No authenticated user found');
      setConcepts([]);
      return [];
    }

    setLoading(true);
    
    try {
      console.log(`[Neo4j-Direct] 📋 Direct list: ${limit} concepts (offset: ${offset})`);
      
      const headers = await getAuthHeaders();
      const url = `${NEO4J_DIRECT_URL}/list?user_id=${user.id}&limit=${limit}&offset=${offset}`;
      console.log(`[Neo4j-Direct] 🔗 List URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      console.log(`[Neo4j-Direct] 📡 List response status: ${response.status}`);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error(`[Neo4j-Direct] ❌ List response body:`, responseText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: DirectListResult = await response.json();
      
      if (result.success) {
        setConcepts(result.data);
        console.log(`[Neo4j-Direct] ✅ List found ${result.data.length} concepts in ${result.meta.executionTime}ms`);
        return result.data;
      } else {
        throw new Error('List failed');
      }
      
    } catch (error) {
      console.error('[Neo4j-Direct] ❌ List failed:', error);
      setConcepts([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Get concept count directly
  const getConceptCount = useCallback(async () => {
    if (!user?.id) {
      console.error('[Neo4j-Direct] 🔒 No authenticated user found');
      return 0;
    }

    try {
      const headers = await getAuthHeaders();
      const url = `${NEO4J_DIRECT_URL}/count?user_id=${user.id}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const count = result.data.count;
        setTotalConcepts(count);
        console.log(`[Neo4j-Direct] 📊 User has ${count} concepts`);
        return count;
      }
      
      return 0;
    } catch (error) {
      console.error('[Neo4j-Direct] ❌ Count failed:', error);
      return 0;
    }
  }, [user?.id]);

  // Get concept by ID directly
  const getConceptById = useCallback(async (conceptId: string) => {
    if (!user?.id) {
      console.error('[Neo4j-Direct] 🔒 No authenticated user found');
      return null;
    }

    try {
      const headers = await getAuthHeaders();
      const url = `${NEO4J_DIRECT_URL}/concept/${conceptId}?user_id=${user.id}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[Neo4j-Direct] 📭 Concept ${conceptId} not found`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`[Neo4j-Direct] ✅ Found concept: ${result.data.properties.name || conceptId}`);
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('[Neo4j-Direct] ❌ Get concept failed:', error);
      return null;
    }
  }, [user?.id]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    console.log('[Neo4j-Direct] 🔄 Refreshing all data...');
    await checkHealth();
    await getConceptCount();
    await listConcepts(10); // Get first 10 concepts
    if (currentSearch) {
      await searchConcepts(currentSearch);
    }
  }, [checkHealth, getConceptCount, listConcepts, currentSearch, searchConcepts]);

  return {
    // State
    concepts,
    searchResults,
    loading,
    searchLoading,
    currentSearch,
    totalConcepts,
    connectionStatus,
    
    // Actions
    searchConcepts,
    listConcepts,
    getConceptCount,
    getConceptById,
    checkHealth,
    refreshAll,
    
    // Computed values
    isConnected: connectionStatus.connected,
    hasResults: concepts.length > 0 || searchResults.length > 0,
    searchResultsCount: searchResults.length,
    conceptsCount: concepts.length,
    
    // Helper methods
    getNoteConcepts: () => concepts.filter(c => 
      c.labels?.includes('Note') && c.labels?.includes('Concept')
    ),
    getRecentConcepts: () => concepts.filter(c => 
      c.properties.last_mentioned
    ).sort((a, b) => 
      new Date(b.properties.last_mentioned!).getTime() - new Date(a.properties.last_mentioned!).getTime()
    ).slice(0, 10),
    getActiveConcepts: (threshold: number = 0.5) => concepts.filter(c => 
      (c.properties.activation_strength || 0) >= threshold
    ),
    
    // Meta information
    apiUrl: NEO4J_DIRECT_URL,
    userId: user?.id,
    isAuthenticated: !!user?.id,
    service: 'neo4j-direct'
  };
}; 