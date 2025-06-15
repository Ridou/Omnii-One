import { useState, useCallback } from 'react';

// EXACT constants from tests/constants.js - NO environment variables
const API_BASE_URL = "http://localhost:8000";
const API_NEO4J_URL = `${API_BASE_URL}/api/neo4j`;
const USER_ID = "cd9bdc60-35af-4bb6-b87e-1932e96fb354";

export const useNeo4jSimple = () => {
  const [concepts, setConcepts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentSearch, setCurrentSearch] = useState('');

  // List concepts - matches your test exactly
  const listConcepts = useCallback(async (limit = 5) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_NEO4J_URL}/concepts?user_id=${USER_ID}&limit=${limit}`);
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
  }, []);

  // Search concepts - matches your test exactly  
  const searchConcepts = useCallback(async (query = 'test') => {
    setSearchLoading(true);
    setCurrentSearch(query);
    try {
      const response = await fetch(`${API_NEO4J_URL}/concepts/search?user_id=${USER_ID}&q=${query}`);
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
  }, []);

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
  };
};