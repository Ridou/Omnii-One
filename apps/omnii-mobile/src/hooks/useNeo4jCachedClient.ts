import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '~/context/AuthContext';
import { useNeo4jDirectClient } from './useNeo4jDirectClient';
import { useBrainMemoryCache, type MemoryPeriod } from './useBrainMemoryCache';

// Brain-inspired memory system that combines Neo4j with Supabase caching
interface CachedConcept {
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

interface MemorySystemStatus {
  neo4j: {
    connected: boolean;
    responseTime?: number;
    totalConcepts?: number;
  };
  cache: {
    isValid: boolean;
    hitRatio?: number;
    conceptCount: number;
    lastUpdated?: string;
  };
  efficiency: {
    queriesSaved: number;
    avgResponseTime: number;
    cacheUtilization: number;
  };
}

export const useNeo4jCachedClient = (preferredPeriod: MemoryPeriod = 'current_week') => {
  const { user } = useAuth();
  
  // Brain memory system components
  const neo4jClient = useNeo4jDirectClient();
  const cacheClient = useBrainMemoryCache(preferredPeriod);
  
  // Combined state
  const [concepts, setConcepts] = useState<CachedConcept[]>([]);
  const [searchResults, setSearchResults] = useState<CachedConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [memorySystemStatus, setMemorySystemStatus] = useState<MemorySystemStatus>({
    neo4j: { connected: false, totalConcepts: 0 },
    cache: { isValid: false, conceptCount: 0 },
    efficiency: { queriesSaved: 0, avgResponseTime: 0, cacheUtilization: 0 }
  });

  // Convert Neo4j concepts to cached format
  const formatConceptsForCache = (neo4jConcepts: any[]) => {
    return neo4jConcepts.map(concept => ({
      id: concept.id,
      labels: concept.labels,
      properties: concept.properties
    }));
  };

  // Brain-inspired concept search with cache-first strategy
  const searchConcepts = useCallback(async (query: string = 'test', limit: number = 20): Promise<CachedConcept[]> => {
    if (!user?.id) {
      console.log('[BrainMemory] 🔒 No authenticated user');
      return [];
    }

    setSearchLoading(true);
    const startTime = Date.now();

    try {
      console.log(`[BrainMemory] 🧠 Brain search: "${query}" (cache-first strategy)`);

      // Step 1: Check cache first (short-term memory)
      const cachedData = await cacheClient.getCachedData();
      
      if (cachedData && cachedData.concepts.length > 0) {
        // Cache hit! Filter concepts locally
        console.log(`[BrainMemory] 🎯 Cache HIT - searching ${cachedData.concepts.length} cached concepts`);
        
        const filteredConcepts = cachedData.concepts.filter(concept => {
          const searchLower = query.toLowerCase();
          return (
            concept.name?.toLowerCase().includes(searchLower) ||
            concept.content?.toLowerCase().includes(searchLower) ||
            concept.description?.toLowerCase().includes(searchLower)
          );
        }).slice(0, limit);

        setSearchResults(filteredConcepts);
        const responseTime = Date.now() - startTime;
        
        console.log(`[BrainMemory] ✅ Cached search: ${filteredConcepts.length} results in ${responseTime}ms`);
        return filteredConcepts;
      }

      // Step 2: Cache miss - query Neo4j (long-term memory)
      console.log(`[BrainMemory] 📭 Cache MISS - querying Neo4j directly`);
      
      const neo4jResults = await neo4jClient.searchConcepts(query, limit);
      const formattedResults = formatConceptsForCache(neo4jResults);
      
      // Step 3: Update cache with new data
      if (formattedResults.length > 0) {
        const cacheData = {
          concepts: formattedResults,
          relationships: [],
          totalConcepts: formattedResults.length,
          lastSynced: new Date().toISOString(),
          cacheVersion: 1
        };
        
        await cacheClient.setCachedData(cacheData);
        console.log(`[BrainMemory] 💾 Updated cache with ${formattedResults.length} search results`);
      }

      setSearchResults(formattedResults);
      const responseTime = Date.now() - startTime;
      
      console.log(`[BrainMemory] ✅ Neo4j search: ${formattedResults.length} results in ${responseTime}ms`);
      return formattedResults;

    } catch (error) {
      console.error('[BrainMemory] ❌ Search failed:', error);
      setSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, [user?.id, cacheClient, neo4jClient]);

  // Brain-inspired concept listing with intelligent caching
  const listConcepts = useCallback(async (limit: number = 100, offset: number = 0): Promise<CachedConcept[]> => {
    if (!user?.id) {
      console.log('[BrainMemory] 🔒 No authenticated user');
      return [];
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      console.log(`[BrainMemory] 📋 Brain list: ${limit} concepts (cache-first)`);

      // Step 1: Check cache first
      const cachedData = await cacheClient.getCachedData();
      
      if (cachedData && cachedData.concepts.length > 0) {
        // Cache hit! Use cached data
        console.log(`[BrainMemory] 🎯 Cache HIT - ${cachedData.concepts.length} cached concepts`);
        
        const paginatedConcepts = cachedData.concepts.slice(offset, offset + limit);
        setConcepts(paginatedConcepts);
        
        const responseTime = Date.now() - startTime;
        console.log(`[BrainMemory] ✅ Cached list: ${paginatedConcepts.length} concepts in ${responseTime}ms`);
        
        return paginatedConcepts;
      }

      // Step 2: Cache miss - query Neo4j
      console.log(`[BrainMemory] 📭 Cache MISS - querying Neo4j for fresh data`);
      
      const neo4jConcepts = await neo4jClient.listConcepts(limit, offset);
      const formattedConcepts = formatConceptsForCache(neo4jConcepts);
      
      // Step 3: Populate cache for future requests
      if (formattedConcepts.length > 0) {
        const cacheData = {
          concepts: formattedConcepts,
          relationships: [],
          totalConcepts: formattedConcepts.length,
          lastSynced: new Date().toISOString(),
          cacheVersion: 1
        };
        
        await cacheClient.setCachedData(cacheData);
        console.log(`[BrainMemory] 💾 Populated cache with ${formattedConcepts.length} concepts`);
      }

      setConcepts(formattedConcepts);
      const responseTime = Date.now() - startTime;
      
      console.log(`[BrainMemory] ✅ Neo4j list: ${formattedConcepts.length} concepts in ${responseTime}ms`);
      return formattedConcepts;

    } catch (error) {
      console.error('[BrainMemory] ❌ List failed:', error);
      setConcepts([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id, cacheClient, neo4jClient]);

  // Get concept count with cache optimization
  const getConceptCount = useCallback(async (): Promise<number> => {
    // Try cache first
    if (cacheClient.cache && cacheClient.cache.concepts.length > 0) {
      const count = cacheClient.cache.totalConcepts;
      console.log(`[BrainMemory] 📊 Cached concept count: ${count}`);
      return count;
    }

    // Fallback to Neo4j
    const count = await neo4jClient.getConceptCount();
    console.log(`[BrainMemory] 📊 Neo4j concept count: ${count}`);
    return count;
  }, [cacheClient.cache, neo4jClient]);

  // Force refresh from Neo4j (bypass cache)
  const forceRefresh = useCallback(async (): Promise<void> => {
    console.log('[BrainMemory] 🔄 Force refresh: invalidating cache and fetching fresh data');
    
    // Invalidate current cache
    await cacheClient.invalidateCache();
    
    // Fetch fresh data from Neo4j
    await listConcepts(50); // Get fresh batch
    
    console.log('[BrainMemory] ✅ Force refresh completed');
  }, [cacheClient, listConcepts]);

  // Memory consolidation (cache warm-up during idle time)
  const consolidateMemory = useCallback(async (): Promise<void> => {
    if (!user?.id || cacheClient.isValid) {
      return; // Skip if already cached
    }

    console.log('[BrainMemory] 🧠 Memory consolidation: warming up cache');
    
    try {
      // Fetch a larger batch for caching
      const largeBatch = await neo4jClient.listConcepts(200);
      const formattedBatch = formatConceptsForCache(largeBatch);
      
      if (formattedBatch.length > 0) {
        const cacheData = {
          concepts: formattedBatch,
          relationships: [],
          totalConcepts: formattedBatch.length,
          lastSynced: new Date().toISOString(),
          cacheVersion: 1
        };
        
        await cacheClient.setCachedData(cacheData);
        console.log(`[BrainMemory] 🧠 Memory consolidated: ${formattedBatch.length} concepts cached`);
      }
    } catch (error) {
      console.error('[BrainMemory] ❌ Memory consolidation failed:', error);
    }
  }, [user?.id, cacheClient, neo4jClient]);

  // Update memory system status (Fixed to prevent infinite loops)
  useEffect(() => {
    console.log('[BrainMemory] 🔄 Memory status update triggered');
    
    const updateStatus = () => {
      setMemorySystemStatus({
        neo4j: {
          connected: neo4jClient.connectionStatus.connected,
          responseTime: neo4jClient.connectionStatus.responseTime,
          totalConcepts: neo4jClient.connectionStatus.totalConcepts
        },
        cache: {
          isValid: cacheClient.isValid,
          hitRatio: cacheClient.hitRatio,
          conceptCount: cacheClient.conceptCount,
          lastUpdated: cacheClient.cacheStatus.lastUpdated
        },
        efficiency: {
          queriesSaved: cacheClient.stats.neo4j_queries_saved,
          avgResponseTime: cacheClient.stats.avg_response_time_ms,
          cacheUtilization: cacheClient.hitRatio || 0
        }
      });
    };

    updateStatus();
  }, [
    neo4jClient.connectionStatus.connected,
    neo4jClient.connectionStatus.responseTime,
    neo4jClient.connectionStatus.totalConcepts,
    cacheClient.isValid,
    cacheClient.hitRatio,
    cacheClient.conceptCount,
    cacheClient.cacheStatus.lastUpdated,
    cacheClient.stats.neo4j_queries_saved,
    cacheClient.stats.avg_response_time_ms
  ]); // 🔧 Specific primitive dependencies instead of objects

  // Automatic memory consolidation on connection (Fixed to prevent infinite loops)
  useEffect(() => {
    if (neo4jClient.connectionStatus.connected && !cacheClient.isValid && user?.id) {
      console.log('[BrainMemory] 🧠 Scheduling memory consolidation...');
      
      // Delay consolidation to avoid blocking initial load
      const timer = setTimeout(() => {
        console.log('[BrainMemory] 🧠 Starting memory consolidation...');
        consolidateMemory();
      }, 2000);
      
      return () => {
        console.log('[BrainMemory] 🧠 Cancelling memory consolidation timer');
        clearTimeout(timer);
      };
    }
  }, [
    neo4jClient.connectionStatus.connected, 
    cacheClient.isValid, 
    user?.id
  ]); // 🔧 Removed consolidateMemory from deps to prevent loops

  return {
    // Data state
    concepts,
    searchResults,
    loading,
    searchLoading,
    memorySystemStatus,
    
    // Core operations (cache-optimized)
    searchConcepts,
    listConcepts,
    getConceptCount,
    
    // Memory management
    forceRefresh,
    consolidateMemory,
    invalidateCache: cacheClient.invalidateCache,
    
    // Direct Neo4j access (bypass cache)
    directNeo4j: {
      searchConcepts: neo4jClient.searchConcepts,
      listConcepts: neo4jClient.listConcepts,
      getConceptById: neo4jClient.getConceptById,
      healthCheck: neo4jClient.checkHealth
    },
    
    // Cache management
    cache: {
      isValid: cacheClient.isValid,
      isLoading: cacheClient.isLoading,
      stats: cacheClient.stats,
      hitRatio: cacheClient.hitRatio,
      currentPeriod: cacheClient.currentPeriod,
      periodDates: cacheClient.periodDates
    },
    
    // Computed values
    isConnected: neo4jClient.connectionStatus.connected,
    hasCache: cacheClient.isValid,
    totalConcepts: neo4jClient.totalConcepts || cacheClient.conceptCount,
    isOptimized: cacheClient.isValid && neo4jClient.connectionStatus.connected,
    
    // Brain-inspired helpers
    getRecentMemories: () => concepts.filter(c => 
      c.properties.last_mentioned && 
      new Date(c.properties.last_mentioned) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ),
    getActiveMemories: (threshold: number = 0.5) => concepts.filter(c => 
      (c.properties.activation_strength || 0) >= threshold
    ),
    
    // System info
    service: 'brain-memory-system',
    version: '1.0.0',
    architecture: 'cache-first-neo4j'
  };
}; 