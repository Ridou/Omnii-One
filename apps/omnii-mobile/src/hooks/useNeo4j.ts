import { useState, useCallback } from 'react';
import { useAuth } from '~/context/AuthContext';
import { getBaseUrl } from '~/utils/base-url';

export const useNeo4jSimple = () => {
  const [concepts, setConcepts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentSearch, setCurrentSearch] = useState('');
  
  const { session } = useAuth();
  const baseUrl = getBaseUrl();
  const apiNeo4jUrl = `${baseUrl}/api/neo4j`;

  // List concepts - using authenticated user ID
  const listConcepts = useCallback(async (limit = 5) => {
    if (!session?.user?.id) {
      console.warn('No authenticated user found');
      return [];
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiNeo4jUrl}/concepts?user_id=${session.user.id}&limit=${limit}`);
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
  }, [session?.user?.id, apiNeo4jUrl]);

  // Search concepts - using authenticated user ID
  const searchConcepts = useCallback(async (query = 'test') => {
    if (!session?.user?.id) {
      console.warn('No authenticated user found');
      return [];
    }

    setSearchLoading(true);
    setCurrentSearch(query);
    try {
      const response = await fetch(`${apiNeo4jUrl}/concepts/search?user_id=${session.user.id}&q=${query}`);
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
  }, [session?.user?.id, apiNeo4jUrl]);

  return {
    concepts,
    searchResults,
    loading,
    searchLoading,
    currentSearch,
    listConcepts,
    searchConcepts,
    // Helper to check if it has both Note and Concept labels
    getNoteConcepts: () => concepts.filter(c => 
      c.labels?.includes('Note') && c.labels?.includes('Concept')
    ),
    // Authentication state
    isAuthenticated: !!session?.user?.id,
  };
};