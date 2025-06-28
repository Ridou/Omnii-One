import { useState, useCallback, useEffect, useRef } from 'react';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { useAuth } from '~/context/AuthContext';

// Direct Neo4j connection configuration
const NEO4J_CONFIG = {
  uri: 'neo4j+s://d066c29d.databases.neo4j.io:7687',
  username: 'neo4j',
  database: 'neo4j',
  // Password should be provided via environment variable or secure storage
  password: process.env.EXPO_PUBLIC_NEO4J_PASSWORD || '_o0JebFPkSb51lSjC7BUqdsvDhD4e5bYGFV1uoVv3QE'
};

// Enhanced interface for direct Neo4j concepts
interface DirectConcept {
  id: string;
  labels: string[];
  properties: {
    name?: string;
    content?: string;
    description?: string;
    keywords?: string | string[];
    user_id?: string;
    created_at?: string;
    last_mentioned?: string;
    activation_strength?: number;
    mention_count?: number;
    relevanceScore?: number;
    [key: string]: any;
  };
}

interface ConnectionStatus {
  connected: boolean;
  responseTime?: number;
  totalConcepts?: number;
  version?: string;
  error?: string;
}

export const useNeo4jDirectClient = () => {
  const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [concepts, setConcepts] = useState<DirectConcept[]>([]);
  const [searchResults, setSearchResults] = useState<DirectConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [totalConcepts, setTotalConcepts] = useState(0);
  
  // Add ref to prevent multiple simultaneous initializations
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);

  // Initialize Neo4j driver
  const initializeDriver = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (initializingRef.current || driver) {
      console.log('[Neo4j-DirectClient] ⏭️ Skipping initialization - already initializing or connected');
      return;
    }
    
    initializingRef.current = true;
    
    try {
      console.log('[Neo4j-DirectClient] 🚀 Initializing direct Neo4j driver...');
      
      const neo4jDriver = neo4j.driver(
        NEO4J_CONFIG.uri,
        neo4j.auth.basic(NEO4J_CONFIG.username, NEO4J_CONFIG.password),
        {
          maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
          maxConnectionPoolSize: 10,
          connectionAcquisitionTimeout: 15000, // 15 seconds
          connectionTimeout: 10000, // 10 seconds
          disableLosslessIntegers: true
          // Note: encryption is handled by neo4j+s:// URI scheme
        }
      );

      // Test the connection
      const session = neo4jDriver.session({ database: NEO4J_CONFIG.database });
      const startTime = Date.now();
      
      await session.run('RETURN 1 as test');
      
      const responseTime = Date.now() - startTime;
      
      // Get total concepts
      const countResult = await session.run('MATCH (c:Concept) RETURN count(c) as total');
      const totalConceptsRaw = countResult.records[0]?.get('total');
      const totalConcepts = typeof totalConceptsRaw === 'number' ? totalConceptsRaw : (totalConceptsRaw?.toNumber?.() || totalConceptsRaw?.low || 0);
      
      await session.close();
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setDriver(neo4jDriver);
        setConnectionStatus({
          connected: true,
          responseTime,
          totalConcepts,
          version: 'direct-client'
        });
        
        console.log(`[Neo4j-DirectClient] ✅ Connected successfully! ${totalConcepts} concepts, ${responseTime}ms`);
      } else {
        // Close driver if component unmounted during initialization
        await neo4jDriver.close();
      }
      
    } catch (error) {
      console.error('[Neo4j-DirectClient] ❌ Connection failed:', error);
      if (mountedRef.current) {
        setConnectionStatus({
          connected: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        });
      }
    } finally {
      initializingRef.current = false;
    }
  }, [driver]);

  // Close driver
  const closeDriver = useCallback(async () => {
    if (driver) {
      await driver.close();
      setDriver(null);
      setConnectionStatus({ connected: false });
      console.log('[Neo4j-DirectClient] 🔌 Driver closed');
    }
  }, [driver]);

  // Health check
  const checkHealth = useCallback(async () => {
    if (!driver) return { connected: false };

    try {
      const session = driver.session({ database: NEO4J_CONFIG.database });
      const startTime = Date.now();
      
      await session.run('RETURN 1 as test');
      const responseTime = Date.now() - startTime;
      
      // Get total concepts
      const countResult = await session.run('MATCH (c:Concept) RETURN count(c) as total');
      const totalConceptsRaw = countResult.records[0]?.get('total');
      const totalConcepts = typeof totalConceptsRaw === 'number' ? totalConceptsRaw : (totalConceptsRaw?.toNumber?.() || totalConceptsRaw?.low || 0);
      
      await session.close();
      
      const status = {
        connected: true,
        responseTime,
        totalConcepts,
        version: 'direct-client'
      };
      
      setConnectionStatus(status);
      console.log(`[Neo4j-DirectClient] ✅ Health check: ${totalConcepts} concepts, ${responseTime}ms`);
      
      return status;
    } catch (error) {
      console.error('[Neo4j-DirectClient] ❌ Health check failed:', error);
      const status = { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Health check failed' 
      };
      setConnectionStatus(status);
      return status;
    }
  }, [driver]);

  // Search concepts directly
  const searchConcepts = useCallback(async (query: string = 'test', limit: number = 20) => {
    if (!driver) {
      // Don't log error constantly - just return empty quietly
      setSearchResults([]);
      return [];
    }

    // 🚨 TEMPORARY FIX: Use hardcoded test user when auth fails
    const testUserId = user?.id || 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
    
    if (!testUserId) {
      console.log('[Neo4j-DirectClient] ❌ No user ID available for search');
      setSearchResults([]);
      return [];
    }

    if (searchLoading) {
      console.log('[Neo4j-DirectClient] ⏳ Search already in progress, skipping');
      return searchResults;
    }

    setSearchLoading(true);
    
    try {
      console.log(`[Neo4j-DirectClient] 🔍 Direct search: "${query}" (limit: ${limit})`);
      console.log(`[Neo4j-DirectClient] 🔑 Using User ID: ${testUserId}`);
      
      const session = driver.session({ database: NEO4J_CONFIG.database });
      const startTime = Date.now();
      
      // Enhanced search query - safe for all property types
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        AND (
          coalesce(toLower(toString(c.name)), '') CONTAINS toLower($searchTerm) OR
          coalesce(toLower(toString(c.content)), '') CONTAINS toLower($searchTerm) OR
          coalesce(toLower(toString(c.description)), '') CONTAINS toLower($searchTerm)
        )
        WITH c, labels(c) as nodeLabels,
             CASE 
               WHEN coalesce(toLower(toString(c.name)), '') = toLower($searchTerm) THEN 10
               WHEN coalesce(toLower(toString(c.name)), '') CONTAINS toLower($searchTerm) THEN 8
               WHEN coalesce(toLower(toString(c.content)), '') CONTAINS toLower($searchTerm) THEN 6
               WHEN coalesce(toLower(toString(c.description)), '') CONTAINS toLower($searchTerm) THEN 4
               ELSE 1
             END as relevanceScore
        RETURN c, nodeLabels, relevanceScore
        ORDER BY relevanceScore DESC, c.name ASC
        LIMIT $limit
      `, {
        userId: testUserId,
        searchTerm: query,
        limit: neo4j.int(limit)
      });

      const concepts: DirectConcept[] = result.records.map((record) => {
        const node = record.get('c');
        const labels = record.get('nodeLabels');
        const relevanceScore = record.get('relevanceScore');

        return {
          id: node.identity.toString(),
          labels: labels,
          properties: {
            ...node.properties,
            relevanceScore: typeof relevanceScore === 'number' ? relevanceScore : (relevanceScore?.toNumber?.() || relevanceScore?.low || 1)
          }
        };
      });

      await session.close();
      
      const executionTime = Date.now() - startTime;
      setSearchResults(concepts);
      
      console.log(`[Neo4j-DirectClient] ✅ Search found ${concepts.length} concepts in ${executionTime}ms`);
      
      return concepts;
      
    } catch (error) {
      console.error('[Neo4j-DirectClient] ❌ Search failed:', error);
      setSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, [driver, user?.id]);

  // List concepts directly
  const listConcepts = useCallback(async (limit: number = 100, offset: number = 0) => {
    if (!driver) {
      // Don't log error constantly - just return empty quietly
      setConcepts([]);
      return [];
    }

    // 🚨 TEMPORARY FIX: Use hardcoded test user when auth fails
    const testUserId = user?.id || 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
    
    if (!testUserId) {
      console.log('[Neo4j-DirectClient] ❌ No user ID available');
      setConcepts([]);
      return [];
    }

    if (loading) {
      console.log('[Neo4j-DirectClient] ⏳ List already in progress, skipping');
      return concepts;
    }

    setLoading(true);
    
    try {
      console.log(`[Neo4j-DirectClient] 📋 Direct list: ${limit} concepts (offset: ${offset})`);
      console.log(`[Neo4j-DirectClient] 🔑 Using User ID: ${testUserId}`);
      
      const session = driver.session({ database: NEO4J_CONFIG.database });
      const startTime = Date.now();
      
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        WITH c, labels(c) as nodeLabels
        RETURN c, nodeLabels
        ORDER BY 
          CASE WHEN c.last_mentioned IS NOT NULL THEN c.last_mentioned ELSE c.created_at END DESC,
          c.name ASC
        SKIP $offset
        LIMIT $limit
      `, {
        userId: testUserId,
        limit: neo4j.int(limit),
        offset: neo4j.int(offset)
      });

      const concepts: DirectConcept[] = result.records.map((record) => {
        const node = record.get('c');
        const labels = record.get('nodeLabels');

        return {
          id: node.identity.toString(),
          labels: labels,
          properties: node.properties
        };
      });

      await session.close();
      
      const executionTime = Date.now() - startTime;
      setConcepts(concepts);
      
      console.log(`[Neo4j-DirectClient] ✅ List found ${concepts.length} concepts in ${executionTime}ms`);
      
      return concepts;
      
    } catch (error) {
      console.error('[Neo4j-DirectClient] ❌ List failed:', error);
      setConcepts([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [driver, user?.id]);

  // Get concept count for user
  const getConceptCount = useCallback(async () => {
    if (!driver) {
      return 0;
    }

    // 🚨 TEMPORARY FIX: Use hardcoded test user when auth fails
    const testUserId = user?.id || 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
    
    if (!testUserId) {
      console.log('[Neo4j-DirectClient] ❌ No user ID available for count');
      return 0;
    }

    try {
      const session = driver.session({ database: NEO4J_CONFIG.database });
      
      console.log(`[Neo4j-DirectClient] 📊 Counting concepts for User ID: ${testUserId}`);
      
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE c.user_id = $userId
        RETURN count(c) as total
      `, { userId: testUserId });

      const totalRaw = result.records[0]?.get('total');
      const total = typeof totalRaw === 'number' ? totalRaw : (totalRaw?.toNumber?.() || totalRaw?.low || 0);
      await session.close();
      
      setTotalConcepts(total);
      console.log(`[Neo4j-DirectClient] 📊 User has ${total} concepts`);
      
      return total;
    } catch (error) {
      console.error('[Neo4j-DirectClient] ❌ Count failed:', error);
      return 0;
    }
  }, [driver, user?.id]);

  // Get concept by ID
  const getConceptById = useCallback(async (conceptId: string) => {
    if (!driver) {
      return null;
    }

    // 🚨 TEMPORARY FIX: Use hardcoded test user when auth fails
    const testUserId = user?.id || 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
    
    if (!testUserId) {
      console.log('[Neo4j-DirectClient] ❌ No user ID available for getById');
      return null;
    }

    try {
      const session = driver.session({ database: NEO4J_CONFIG.database });
      
      console.log(`[Neo4j-DirectClient] 🔍 Getting concept ${conceptId} for User ID: ${testUserId}`);
      
      const result = await session.run(`
        MATCH (c:Concept)
        WHERE id(c) = $conceptId AND c.user_id = $userId
        RETURN c, labels(c) as nodeLabels
      `, {
        conceptId: neo4j.int(conceptId),
        userId: testUserId
      });

      if (result.records.length === 0) {
        await session.close();
        return null;
      }

      const record = result.records[0];
      if (!record) {
        await session.close();
        return null;
      }
      
      const node = record.get('c');
      const labels = record.get('nodeLabels');

      await session.close();

      return {
        id: node.identity.toString(),
        labels: labels,
        properties: node.properties
      };
    } catch (error) {
      console.error('[Neo4j-DirectClient] ❌ Get concept failed:', error);
      return null;
    }
  }, [driver, user?.id]);

  // Initialize driver on mount (only once)
  useEffect(() => {
    // 🚨 TEMPORARY FIX: Initialize driver without waiting for user authentication
    if (!driver && !initializingRef.current) {
      console.log('[Neo4j-DirectClient] 🚀 Initializing driver (bypassing auth check)');
      initializeDriver();
    }
    
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (driver) {
        closeDriver();
      }
    };
  }, []); // 🚨 TEMPORARY: Empty deps to initialize immediately

  // Refresh all data
  const refreshAll = useCallback(async () => {
    console.log('[Neo4j-DirectClient] 🔄 Refreshing all data...');
    await checkHealth();
    await getConceptCount();
    await listConcepts(10); // Get first 10 concepts
  }, [checkHealth, getConceptCount, listConcepts]);

  return {
    // Connection state
    driver,
    connectionStatus,
    isConnected: connectionStatus.connected,
    
    // Data state
    concepts,
    searchResults,
    loading,
    searchLoading,
    totalConcepts,
    
    // Actions
    searchConcepts,
    listConcepts,
    getConceptCount,
    getConceptById,
    checkHealth,
    refreshAll,
    initializeDriver,
    closeDriver,
    
    // Computed values
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
    config: NEO4J_CONFIG,
    userId: user?.id,
    isAuthenticated: !!user?.id,
    service: 'neo4j-direct-client'
  };
}; 