import { useState, useCallback } from 'react';
import { useAuth } from '~/context/AuthContext';
import { env } from '~/lib/env';
import { supabase } from '~/lib/supabase';

// API constants - now uses production server from environment
const API_BASE_URL = env.app.backendBaseUrl;
const API_NEO4J_URL = `${API_BASE_URL}/api/neo4j`;

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

export const useNeo4jSimple = () => {
  const { user } = useAuth(); // 🔒 Dynamic user ID from Supabase
  const [concepts, setConcepts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentSearch, setCurrentSearch] = useState('');

  // List concepts - now uses dynamic user ID with privacy protection and auth headers
  const listConcepts = useCallback(async (limit = 5) => {
    if (!user?.id) {
      console.error('🔒 Privacy Protection: No authenticated user found');
      setConcepts([]);
      return [];
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_NEO4J_URL}/concepts?user_id=${user.id}&limit=${limit}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setConcepts(data.data || []);
      return data.data;
    } catch (error) {
      console.error('Failed to list concepts:', error);
      setConcepts([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Search concepts - now uses dynamic user ID with privacy protection and auth headers
  const searchConcepts = useCallback(async (query = 'test') => {
    if (!user?.id) {
      console.error('🔒 Privacy Protection: No authenticated user found');
      setSearchResults([]);
      return [];
    }

    setSearchLoading(true);
    setCurrentSearch(query);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_NEO4J_URL}/concepts/search?user_id=${user.id}&q=${query}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSearchResults(data.data || []);
      return data.data;
    } catch (error) {
      console.error('Failed to search concepts:', error);
      setSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, [user?.id]);

  return {
    concepts,
    searchResults,
    loading,
    searchLoading,
    currentSearch,
    listConcepts,
    searchConcepts,
    // Helper to check if it has both Note and Concept labels like your test data
    getNoteConcepts: () => concepts.filter(c => 
      c.labels?.includes('Note') && c.labels?.includes('Concept')
    ),
    // 🔒 Privacy helpers
    userId: user?.id,
    isAuthenticated: !!user?.id,
    // Privacy-aware error states
    hasAuthError: !user?.id,
    // 🌐 API configuration info
    apiBaseUrl: API_BASE_URL,
    isUsingProduction: API_BASE_URL.includes('railway.app'),
  };
};