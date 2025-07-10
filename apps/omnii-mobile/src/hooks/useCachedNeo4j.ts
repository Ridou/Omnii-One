import { useState, useCallback, useEffect, useRef } from 'react';
import { useNeo4jDirectClient } from './useNeo4jDirectClient';
import { useBrainMemoryCache } from './useBrainMemoryCache';

// Will define BrainCacheData locally since it's not exported

/**
 * 🧠 Cache-First Neo4j Hook with Brain-Inspired Memory
 * 
 * This hook implements a brain-inspired caching strategy for Neo4j concepts:
 * 1. Check brain memory cache first (24hr cache for low volatility)
 * 2. If cache miss, fetch from Neo4j AuraDB directly
 * 3. Store result in brain cache for future requests
 * 4. Expected 90%+ reduction in Neo4j queries with <100ms cached responses
 */

interface CachedConcept {
  id: string;
  name?: string;
  content?: string;
  description?: string;
  labels: string[];
  properties: Record<string, any>;
  relevanceScore?: number;
}

interface ConceptOverview {
  concepts: CachedConcept[];
  totalConcepts: number;
  lastSyncTime: string;
  syncSuccess: boolean;
  responseTime?: number;
  source: 'cache' | 'neo4j';
}

// Local BrainCacheData interface for Neo4j concepts
interface BrainCacheData {
  concepts?: CachedConcept[];
  relationships?: any[];
  totalConcepts?: number;
  lastSynced: string;
  cacheVersion: number;
  dataType: 'neo4j_concepts';
}

export const useCachedNeo4j = () => {
  const initializingRef = useRef(false);
  const [conceptsOverview, setConceptsOverview] = useState<ConceptOverview | null>(null);
  const [searchResults, setSearchResults] = useState<CachedConcept[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Brain memory cache for Neo4j concepts (24hr cache - low volatility)
  const {
    cache,
    getCachedData,
    setCachedData,
    invalidateCache,
    isValid: isCacheValid,
    cacheStrategy,
    stats
  } = useBrainMemoryCache('current_week', 'neo4j_concepts');

  // Direct Neo4j client (used for cache misses)
  const neo4jClient = useNeo4jDirectClient();

  // Convert Neo4j concepts to cached format
  const formatConceptsForCache = useCallback((neo4jConcepts: any[]): CachedConcept[] => {
    return neo4jConcepts.map(concept => ({
      id: concept.id,
      name: concept.properties?.name,
      content: concept.properties?.content,
      description: concept.properties?.description,
      labels: concept.labels || [],
      properties: concept.properties || {},
      relevanceScore: concept.properties?.relevanceScore
    }));
  }, []);

  // Cache-first concept fetching strategy
  const fetchConcepts = useCallback(async (
    limit: number = 100, 
    forceRefresh = false
  ): Promise<ConceptOverview | null> => {
    if (initializingRef.current) return null;
    initializingRef.current = true;

    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
      
      const startTime = Date.now();

      // Step 1: Check brain memory cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = await getCachedData();
        
        // 🔧 FIXED: Access cache data directly like working hooks (contacts, calendar, tasks)
        if (cachedData?.concepts && Array.isArray(cachedData.concepts) && cachedData.concepts.length > 0) {
          // Cache hit! 🎯 Transform cached data back to ConceptOverview format
          const cachedOverview: ConceptOverview = {
            concepts: cachedData.concepts.slice(0, limit),
            totalConcepts: cachedData.totalConcepts || cachedData.concepts.length,
            lastSyncTime: cachedData.lastSynced,
            syncSuccess: true,
            responseTime: Date.now() - startTime,
            source: 'cache'
          };

          setConceptsOverview(cachedOverview);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          
          console.log(`[CachedNeo4j] 🎯 Cache HIT: ${cachedData.concepts.length} concepts in ${Date.now() - startTime}ms`);
          return cachedOverview;
        }
      }

      // Step 2: Cache miss - fetch from Neo4j AuraDB
      console.log('[CachedNeo4j] 📭 Cache miss - fetching from Neo4j AuraDB...');
      
      // 🔧 FIX: Use proper await and error handling for Neo4j calls
      console.log('[CachedNeo4j] 🔍 Calling neo4jClient.listConcepts...');
      const neo4jConcepts = await neo4jClient.listConcepts(limit);
      console.log(`[CachedNeo4j] 📊 Received ${neo4jConcepts ? neo4jConcepts.length : 0} concepts from Neo4j`);
      
      console.log('[CachedNeo4j] 🔍 Calling neo4jClient.getConceptCount...');
      const totalCount = await neo4jClient.getConceptCount();
      console.log(`[CachedNeo4j] 📊 Total concept count: ${totalCount}`);
      
      // 🔧 FIX: Better error handling and validation
      if (!neo4jConcepts) {
        console.error('[CachedNeo4j] ❌ Neo4j returned null/undefined concepts');
        throw new Error('No data received from Neo4j AuraDB - check connection and authentication');
      }

      if (!Array.isArray(neo4jConcepts)) {
        console.error('[CachedNeo4j] ❌ Neo4j returned non-array:', typeof neo4jConcepts);
        throw new Error('Invalid data format from Neo4j AuraDB');
      }

      console.log(`[CachedNeo4j] ✅ Valid Neo4j data: ${neo4jConcepts.length} concepts, total: ${totalCount}`);
      
      // 🔧 FIX: Add detailed logging for data transformation
      console.log('[CachedNeo4j] 🔄 Transforming Neo4j concepts for cache...');
      const formattedConcepts = formatConceptsForCache(neo4jConcepts);
      console.log(`[CachedNeo4j] ✅ Formatted ${formattedConcepts.length} concepts for cache`);

      // Step 3: Store in brain memory cache for future requests
      const cacheData: BrainCacheData = {
        concepts: formattedConcepts,
        relationships: [],
        totalConcepts: totalCount,
        lastSynced: new Date().toISOString(),
        cacheVersion: 1,
        dataType: 'neo4j_concepts',
      };

      console.log('[CachedNeo4j] 💾 Storing cache data:', {
        conceptsCount: cacheData.concepts?.length,
        totalConcepts: cacheData.totalConcepts,
        dataType: cacheData.dataType
      });

      // 🔧 FIX: Add error handling for cache storage
      try {
        await setCachedData(cacheData);
        console.log('[CachedNeo4j] ✅ Successfully stored data in cache');
      } catch (cacheError) {
        console.error('[CachedNeo4j] ❌ Failed to store in cache:', cacheError);
        // Continue anyway - we still have the fresh data
      }

      const freshOverview: ConceptOverview = {
        concepts: formattedConcepts,
        totalConcepts: totalCount,
        lastSyncTime: new Date().toISOString(),
        syncSuccess: true,
        responseTime: Date.now() - startTime,
        source: 'neo4j'
      };

      setConceptsOverview(freshOverview);
      setLastFetchTime(Date.now());
      setIsLoading(false);
      
      console.log(`[CachedNeo4j] ✅ Fresh data cached: ${formattedConcepts.length} concepts in ${Date.now() - startTime}ms`);
      return freshOverview;

    } catch (error) {
      console.error('[CachedNeo4j] ❌ Error fetching concepts:', error);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
      return null;
    } finally {
      initializingRef.current = false;
    }
  }, [getCachedData, setCachedData, neo4jClient, formatConceptsForCache]);

  // Cache-first concept search
  const searchConcepts = useCallback(async (
    query: string, 
    limit: number = 20,
    forceRefresh = false
  ): Promise<CachedConcept[]> => {
    if (!query.trim()) return [];

    setIsSearching(true);
    const startTime = Date.now();

    try {
      console.log(`[CachedNeo4j] 🔍 Brain search: "${query}" (cache-first strategy)`);

      // Step 1: Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = await getCachedData();
        
        if (cachedData?.concepts && cachedData.concepts.length > 0) {
          // Cache hit! Filter concepts locally for search
          console.log(`[CachedNeo4j] 🎯 Cache HIT - searching ${cachedData.concepts.length} cached concepts`);
          
          const searchLower = query.toLowerCase();
          const filteredConcepts = cachedData.concepts.filter(concept => {
            return (
              concept.name?.toLowerCase().includes(searchLower) ||
              concept.content?.toLowerCase().includes(searchLower) ||
              concept.description?.toLowerCase().includes(searchLower) ||
              concept.properties?.keywords?.toString().toLowerCase().includes(searchLower)
            );
          }).slice(0, limit);

          setSearchResults(filteredConcepts);
          const responseTime = Date.now() - startTime;
          
          console.log(`[CachedNeo4j] ✅ Cached search: ${filteredConcepts.length} results in ${responseTime}ms`);
          return filteredConcepts;
        }
      }

      // Step 2: Cache miss - search Neo4j directly
      console.log(`[CachedNeo4j] 📭 Cache MISS - searching Neo4j directly`);
      
      const neo4jResults = await neo4jClient.searchConcepts(query, limit);
      const formattedResults = formatConceptsForCache(neo4jResults);
      
      // Step 3: Update cache with search results (if significant)
      if (formattedResults.length > 10) {
        const cacheData: BrainCacheData = {
          concepts: formattedResults,
          relationships: [],
          totalConcepts: formattedResults.length,
          lastSynced: new Date().toISOString(),
          cacheVersion: 1,
          dataType: 'neo4j_concepts',
        };
        
        await setCachedData(cacheData);
        console.log(`[CachedNeo4j] 💾 Updated cache with ${formattedResults.length} search results`);
      }

      setSearchResults(formattedResults);
      const responseTime = Date.now() - startTime;
      
      console.log(`[CachedNeo4j] ✅ Neo4j search: ${formattedResults.length} results in ${responseTime}ms`);
      return formattedResults;

    } catch (error) {
      console.error('[CachedNeo4j] ❌ Search failed:', error);
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [getCachedData, setCachedData, neo4jClient, formatConceptsForCache]);

  // 🔧 FIXED: Cache-only initialization - never call Neo4j directly on mount
  // Initialize data on mount (run once only)
  useEffect(() => {
    // Only load from cache - never call Neo4j directly
    const loadFromCacheOnly = async () => {
      try {
        console.log('[CachedNeo4j] 🔄 Loading from cache only (no Neo4j calls)...');
        
        const cachedData = await getCachedData();
        
        // 🔧 FIXED: Access cache data directly like working hooks (contacts, calendar, tasks)
        if (cachedData?.concepts && Array.isArray(cachedData.concepts) && cachedData.concepts.length > 0) {
          // Cache hit! Use cached data
          const cachedOverview: ConceptOverview = {
            concepts: cachedData.concepts,
            totalConcepts: cachedData.totalConcepts || cachedData.concepts.length,
            lastSyncTime: cachedData.lastSynced,
            syncSuccess: true,
            responseTime: 0,
            source: 'cache'
          };

          setConceptsOverview(cachedOverview);
          setLastFetchTime(Date.now());
          console.log(`[CachedNeo4j] 🎯 Cache-only HIT: ${cachedData.concepts.length} concepts loaded`);
        } else {
          // No cache data available - set empty state (don't call Neo4j)
          console.log('[CachedNeo4j] 📭 No cache data available - setting empty state');
          setConceptsOverview({
            concepts: [],
            totalConcepts: 0,
            lastSyncTime: new Date().toISOString(),
            syncSuccess: false,
            responseTime: 0,
            source: 'cache'
          });
        }
      } catch (error) {
        console.error('[CachedNeo4j] ❌ Cache-only load failed:', error);
        setHasError(true);
        setErrorMessage('Failed to load cached concepts');
      }
    };
    
    loadFromCacheOnly();
  }, []); // 🔧 Empty deps to prevent infinite loops

  // Refresh function (force cache refresh)
  const refetch = useCallback(() => {
    return fetchConcepts(100, true);
  }, [fetchConcepts]);

  // Invalidate cache function
  const invalidateCacheAndRefresh = useCallback(async () => {
    await invalidateCache();
    return fetchConcepts(100, true);
  }, [invalidateCache, fetchConcepts]);

    // Get concept by ID (cache-first)
  const getConceptById = useCallback(async (id: string): Promise<CachedConcept | null> => {
    // Try cache first
    if (conceptsOverview?.concepts) {
      const cachedConcept = conceptsOverview.concepts.find(c => c.id === id);
      if (cachedConcept) {
        console.log(`[CachedNeo4j] 🎯 Found concept in cache: ${id}`);
        return cachedConcept;
      }
    }

    // Fallback to Neo4j
    try {
      const neo4jConcept = await neo4jClient.getConceptById(id);
      if (neo4jConcept) {
        const formatted = formatConceptsForCache([neo4jConcept])[0];
        console.log(`[CachedNeo4j] ✅ Found concept in Neo4j: ${id}`);
        return formatted || null;
      }
    } catch (error) {
      console.error(`[CachedNeo4j] ❌ Error getting concept ${id}:`, error);
    }

    return null;
  }, [conceptsOverview?.concepts, neo4jClient, formatConceptsForCache]);

  return {
    // 🧠 Brain-cached data with enhanced performance
    conceptsOverview,
    searchResults,
    isLoading,
    isSearching,
    isRefetching: isLoading,
    
    // Error handling
    hasError,
    errorMessage,
    
    // Cache performance metrics
    isCacheValid,
    cacheStrategy,
    cacheStats: stats,
    lastFetchTime,
    
    // Actions
    fetchConcepts,
    searchConcepts,
    getConceptById,
    refetch,
    invalidateCache: invalidateCacheAndRefresh,
    
    // Computed values with null safety
    totalConcepts: conceptsOverview?.totalConcepts ?? 0,
    conceptCount: conceptsOverview?.concepts.length ?? 0,
    searchResultCount: searchResults.length,
    lastSyncTime: conceptsOverview?.lastSyncTime,
    syncSuccess: conceptsOverview?.syncSuccess ?? false,
    responseTime: conceptsOverview?.responseTime,
    source: conceptsOverview?.source ?? 'unknown',
    
    // Connection status from Neo4j client
    isConnected: neo4jClient.connectionStatus.connected,
    connectionStatus: neo4jClient.connectionStatus,
    
    // Helper functions
    getRecentConcepts: useCallback((days: number = 7): CachedConcept[] => {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return conceptsOverview?.concepts.filter(concept => 
        concept.properties.created_at && new Date(concept.properties.created_at) > cutoff
      ) ?? [];
    }, [conceptsOverview?.concepts]),
    
    getActiveConcepts: useCallback((threshold: number = 0.5): CachedConcept[] => {
      return conceptsOverview?.concepts.filter(concept => 
        (concept.properties.activation_strength || 0) >= threshold
      ) ?? [];
    }, [conceptsOverview?.concepts]),
    
    // Brain memory insights
    getBrainInsights: useCallback(() => {
      if (!conceptsOverview?.concepts.length) return null;
      
      const concepts = conceptsOverview.concepts;
      const withKeywords = concepts.filter(c => c.properties.keywords).length;
      const recentlyActive = concepts.filter(c => 
        c.properties.last_mentioned && 
        new Date(c.properties.last_mentioned) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;
      
      return {
        keywordCoverage: Math.round((withKeywords / concepts.length) * 100),
        recentActivity: recentlyActive,
        avgMentionCount: Math.round(
          concepts.reduce((sum, c) => sum + (c.properties.mention_count || 0), 0) / concepts.length
        ),
        cacheEfficiency: isCacheValid ? 
          Math.round(((stats.cache_hits || 0) / ((stats.cache_hits || 0) + (stats.cache_misses || 1))) * 100) : 0
      };
    }, [conceptsOverview?.concepts, isCacheValid, stats])
  };
};

/**
 * 📊 Neo4j Brain Cache Performance Metrics Hook
 * Track cache performance for Neo4j concepts
 */
export const useNeo4jCacheMetrics = () => {
  const { stats, cacheStrategy, isValid } = useBrainMemoryCache('current_week', 'neo4j_concepts');
  
  return {
    cacheStats: stats,
    cacheStrategy,
    isCacheValid: isValid,
    
    // Computed metrics
    hitRatio: stats.cache_hits + stats.cache_misses > 0 
      ? Math.round((stats.cache_hits / (stats.cache_hits + stats.cache_misses)) * 100)
      : 0,
    
    averageResponseTime: stats.avg_response_time_ms ?? 0,
    totalQueriesSaved: stats.neo4j_queries_saved ?? 0,
    
    // Performance insights
    performanceImprovement: (stats.avg_response_time_ms ?? 0) > 0 
      ? Math.round((2000 - (stats.avg_response_time_ms ?? 0)) / 2000 * 100) // Assuming 2s Neo4j baseline
      : 0,
      
    // Brain memory specific metrics
    brainEfficiency: {
      queryReduction: (stats.neo4j_queries_saved ?? 0) > 0 ? 
        Math.round(((stats.neo4j_queries_saved ?? 0) / (stats.cache_hits + stats.cache_misses)) * 100) : 0,
      responseSpeedup: (stats.avg_response_time_ms ?? 0) > 0 ? 
        Math.round((2000 / (stats.avg_response_time_ms ?? 0)) * 10) / 10 : 1, // X times faster
      cacheUtilization: isValid ? 100 : 0
    }
  };
}; 