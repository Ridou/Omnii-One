import { useState, useCallback } from 'react';
import { useAuth } from '~/context/AuthContext';
import { env } from '~/lib/env';

// API constants - now uses production server from environment
const API_BASE_URL = env.app.backendBaseUrl;
const API_NEO4J_URL = `${API_BASE_URL}/api/neo4j`;

export const useNeo4jSimple = () => {
  const { user } = useAuth(); // 🔒 Dynamic user ID from Supabase
  const [concepts, setConcepts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentSearch, setCurrentSearch] = useState('');

  // List concepts - now uses dynamic user ID with privacy protection
  const listConcepts = useCallback(async (limit = 5) => {
    if (!user?.id) {
      console.error('🔒 Privacy Protection: No authenticated user found');
      setConcepts([]);
      return [];
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_NEO4J_URL}/concepts?user_id=${user.id}&limit=${limit}`);
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

  // Search concepts - now uses dynamic user ID with privacy protection
  const searchConcepts = useCallback(async (query = 'test') => {
    if (!user?.id) {
      console.error('🔒 Privacy Protection: No authenticated user found');
      setSearchResults([]);
      return [];
    }

    setSearchLoading(true);
    setCurrentSearch(query);
    try {
      const response = await fetch(`${API_NEO4J_URL}/concepts/search?user_id=${user.id}&q=${query}`);
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