import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { trpc } from '~/utils/api';
import { useBrainMemoryCache } from './useBrainMemoryCache';

/**
 * 🧠 Cache-First Concepts Hook with Brain-Inspired Memory & Fuzzy Search
 * 
 * This hook implements a brain-inspired caching strategy for Neo4j concepts:
 * 1. Check brain memory cache first (24hr cache for low volatility concepts)
 * 2. If cache miss, fetch from Neo4j via tRPC
 * 3. Store result in brain cache for future requests
 * 4. Fuzzy search through cached concepts for fast UX
 * 5. Expected 90%+ reduction in Neo4j queries with <100ms cached responses
 */

export interface CachedConcept {
  id: string;
  name?: string;
  text?: string;
  title?: string;
  content?: string;
  description?: string;
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
    context?: string;
    [key: string]: any;
  };
  relevanceScore?: number;
}

export interface ConceptsOverview {
  concepts: CachedConcept[];
  totalConcepts: number;
  isConnected: boolean;
  lastSyncTime: string;
  syncSuccess: boolean;
  connectionStatus: {
    connected: boolean;
    responseTime?: number;
    totalConcepts?: number;
    version?: string;
    error?: string;
  };
}

export const useCachedConcepts = () => {
  const initializingRef = useRef(false);
  const [conceptsOverview, setConceptsOverview] = useState<ConceptsOverview | null>(null);
  const [searchResults, setSearchResults] = useState<CachedConcept[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Brain memory cache for concepts (24hr cache - very low volatility)
  // Using 'current_week' to access existing cached data
  const {
    cache,
    getCachedData,
    setCachedData,
    invalidateCache,
    isValid: isCacheValid,
    cacheStrategy,
    stats
  } = useBrainMemoryCache('current_week', 'neo4j_concepts');

  // Direct tRPC query for concepts (used for cache misses)
  const {
    data: tRPCConceptsData,
    isLoading: tRPCConceptsLoading,
    error: tRPCConceptsError,
    refetch: tRPCConceptsRefetch,
  } = useQuery({
    ...trpc.neo4j.listNodes.queryOptions({ nodeType: 'Concept', limit: 100 }),
    enabled: false, // Only fetch manually when cache misses
    refetchOnWindowFocus: false,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours to match cache strategy
  });

  // Direct tRPC query for concept search (used for fresh searches)
  const {
    data: tRPCSearchData,
    isLoading: tRPCSearchLoading,
    error: tRPCSearchError,
    refetch: tRPCSearchRefetch,
  } = useQuery({
    ...trpc.neo4j.searchNodes.queryOptions({ query: searchQuery || 'test', limit: 50 }),
    enabled: false, // Only fetch manually when needed
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
  });

  // Fuzzy search function for cached concepts
  const fuzzySearchConcepts = useCallback((query: string, concepts: CachedConcept[]): CachedConcept[] => {
    if (!query.trim()) return concepts;

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return concepts
      .map(concept => {
        let score = 0;
        const searchableText = [
          concept.name,
          concept.text,
          concept.title,
          concept.content,
          concept.description,
          concept.properties?.name,
          concept.properties?.content,
          concept.properties?.keywords,
          concept.properties?.context,
          ...(concept.labels || [])
        ].filter(Boolean).join(' ').toLowerCase();

        // Calculate relevance score based on term matches
        searchTerms.forEach(term => {
          if (searchableText.includes(term)) {
            // Boost score for exact matches in important fields
            if (concept.name?.toLowerCase().includes(term)) score += 10;
            if (concept.text?.toLowerCase().includes(term)) score += 8;
            if (concept.title?.toLowerCase().includes(term)) score += 8;
            if (concept.properties?.name?.toLowerCase().includes(term)) score += 6;
            if (concept.properties?.keywords?.toLowerCase().includes(term)) score += 5;
            if (concept.labels?.some(label => label.toLowerCase().includes(term))) score += 4;
            if (searchableText.includes(term)) score += 2;
          }
          
          // Partial matches get lower scores
          const regex = new RegExp(term.split('').join('.*'), 'i');
          if (regex.test(searchableText)) {
            score += 1;
          }
        });

        // Apply existing activation strength as a multiplier
        const activationBoost = concept.properties?.activation_strength || 0.5;
        score *= (1 + activationBoost);

        return { ...concept, relevanceScore: score };
      })
      .filter(concept => concept.relevanceScore! > 0)
      .sort((a, b) => (b.relevanceScore! - a.relevanceScore!))
      .slice(0, 50); // Limit results for performance
  }, []);

  // Cache-first data fetching strategy
  const fetchConcepts = useCallback(async (forceRefresh = false): Promise<ConceptsOverview | null> => {
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
        if (cachedData?.concepts && Array.isArray(cachedData.concepts)) {
          // Cache hit! 🎯 Use cached data
          const cachedOverview: ConceptsOverview = {
            concepts: cachedData.concepts,
            totalConcepts: cachedData.totalConcepts || cachedData.concepts.length,
            isConnected: true, // Assume connected if we have cached data
            lastSyncTime: cachedData.lastSynced || new Date().toISOString(),
            syncSuccess: true,
            connectionStatus: {
              connected: true,
              totalConcepts: cachedData.totalConcepts || cachedData.concepts.length,
              version: 'cached'
            }
          };

          setConceptsOverview(cachedOverview);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          
          console.log(`[CachedConcepts] 🎯 Cache HIT: ${cachedData.concepts.length} concepts in ${Date.now() - startTime}ms`);
          return cachedOverview;
        }
      }

      // Step 2: Cache miss - try to fetch from Neo4j API (graceful failure)
      console.log('[CachedConcepts] 📭 Cache miss - attempting to fetch from Neo4j...');
      
      try {
        const tRPCResult = await tRPCConceptsRefetch();
        
        if (tRPCResult.error) {
          console.log('[CachedConcepts] ⚠️ Neo4j API not available - checking for stale cache...');
          
          // 🔧 FIX: Try to use stale cache data when tRPC fails
          const staleCache = await getCachedData();
          if (staleCache?.concepts && Array.isArray(staleCache.concepts) && staleCache.concepts.length > 0) {
            console.log(`[CachedConcepts] 🔄 Using stale cache with ${staleCache.concepts.length} concepts`);
            const staleOverview: ConceptsOverview = {
              concepts: staleCache.concepts,
              totalConcepts: staleCache.totalConcepts || staleCache.concepts.length,
              isConnected: false, // Mark as disconnected but with data
              lastSyncTime: staleCache.lastSynced || new Date().toISOString(),
              syncSuccess: false,
              connectionStatus: {
                connected: false,
                totalConcepts: staleCache.totalConcepts || staleCache.concepts.length,
                version: 'stale-cache'
              }
            };
            
            setConceptsOverview(staleOverview);
            setLastFetchTime(Date.now());
            setIsLoading(false);
            return staleOverview;
          }
          
          // Only return empty if no cache available
          console.log('[CachedConcepts] 📭 No cache available - returning empty data');
          const emptyData: ConceptsOverview = {
            concepts: [],
            totalConcepts: 0,
            isConnected: false,
            lastSyncTime: new Date().toISOString(),
            syncSuccess: false,
            connectionStatus: {
              connected: false
            }
          };
          
          setConceptsOverview(emptyData);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          return emptyData;
        }

        // Handle tRPC response format
        let freshData = null;
        
        if (tRPCResult.data?.success && tRPCResult.data?.data) {
          freshData = tRPCResult.data.data;
        }
        
        if (!freshData || !Array.isArray(freshData)) {
          console.log('[CachedConcepts] ⚠️ No Neo4j concepts data available - returning empty data');
          const emptyData: ConceptsOverview = {
            concepts: [],
            totalConcepts: 0,
            isConnected: false,
            lastSyncTime: new Date().toISOString(),
            syncSuccess: false,
            connectionStatus: {
              connected: false
            }
          };
          
          setConceptsOverview(emptyData);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          return emptyData;
        }

        // Transform Neo4j data to our concept format
        const concepts: CachedConcept[] = freshData.map((node: any) => ({
          id: node.id || `concept_${Date.now()}_${Math.random()}`,
          name: node.properties?.name || node.properties?.text || node.properties?.title,
          text: node.properties?.text || node.properties?.content,
          title: node.properties?.title || node.properties?.name,
          content: node.properties?.content || node.properties?.description,
          description: node.properties?.description,
          labels: node.labels || ['Concept'],
          properties: {
            ...node.properties,
            user_id: node.properties?.user_id,
            created_at: node.properties?.created_at,
            last_mentioned: node.properties?.last_mentioned,
            activation_strength: node.properties?.activation_strength || 0.5,
            mention_count: node.properties?.mention_count || 0,
            keywords: node.properties?.keywords,
            context: node.properties?.context
          }
        }));

        const conceptsOverview: ConceptsOverview = {
          concepts,
          totalConcepts: concepts.length,
          isConnected: true,
          lastSyncTime: new Date().toISOString(),
          syncSuccess: true,
          connectionStatus: {
            connected: true,
            totalConcepts: concepts.length,
            version: 'neo4j-fresh'
          }
        };

        // Step 3: Store in brain memory cache for future requests
        const cacheData = {
          concepts,
          totalConcepts: concepts.length,
          lastSynced: new Date().toISOString(),
          cacheVersion: 1,
          dataType: 'neo4j_concepts' as const,
        };

        await setCachedData(cacheData);

        setConceptsOverview(conceptsOverview);
        setLastFetchTime(Date.now());
        setIsLoading(false);
        
        console.log(`[CachedConcepts] ✅ Fresh data cached: ${concepts.length} concepts in ${Date.now() - startTime}ms`);
        return conceptsOverview;

      } catch (neo4jError) {
        console.log('[CachedConcepts] ⚠️ Neo4j connection failed - returning empty data');
        const emptyData: ConceptsOverview = {
          concepts: [],
          totalConcepts: 0,
          isConnected: false,
          lastSyncTime: new Date().toISOString(),
          syncSuccess: false,
          connectionStatus: {
            connected: false,
            error: neo4jError instanceof Error ? neo4jError.message : 'Connection failed'
          }
        };
        
        setConceptsOverview(emptyData);
        setLastFetchTime(Date.now());
        setIsLoading(false);
        return emptyData;
      }

    } catch (error) {
      console.log('[CachedConcepts] ⚠️ Unexpected error - returning empty data');
      const emptyData: ConceptsOverview = {
        concepts: [],
        totalConcepts: 0,
        isConnected: false,
        lastSyncTime: new Date().toISOString(),
        syncSuccess: false,
        connectionStatus: {
          connected: false
        }
      };
      
      setConceptsOverview(emptyData);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
      return emptyData;
    } finally {
      initializingRef.current = false;
    }
  }, [getCachedData, setCachedData, tRPCConceptsRefetch]);

  // Fuzzy search function (cache-first with fallback to live search)
  const searchConcepts = useCallback(async (query: string): Promise<CachedConcept[]> => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchQuery('');
      return [];
    }

    setIsSearching(true);
    setSearchQuery(query);

    try {
      // Step 1: Try fuzzy search on cached concepts first
      if (conceptsOverview?.concepts && conceptsOverview.concepts.length > 0) {
        console.log(`[CachedConcepts] 🔍 Fuzzy searching ${conceptsOverview.concepts.length} cached concepts for: "${query}"`);
        
        const fuzzyResults = fuzzySearchConcepts(query, conceptsOverview.concepts);
        
        if (fuzzyResults.length > 0) {
          console.log(`[CachedConcepts] ✅ Fuzzy search found ${fuzzyResults.length} matches in cache`);
          setSearchResults(fuzzyResults);
          setIsSearching(false);
          return fuzzyResults;
        }
      }

      // Step 2: Fallback to live Neo4j search if no cached results
      console.log(`[CachedConcepts] 📡 No cached results, searching Neo4j for: "${query}"`);
      
      try {
        // Update the search query for the tRPC search
        const searchResult = await tRPCSearchRefetch();
        
        if (searchResult.data?.success && searchResult.data?.data) {
          const liveResults: CachedConcept[] = searchResult.data.data.map((node: any) => ({
            id: node.id || `search_${Date.now()}_${Math.random()}`,
            name: node.properties?.name || node.properties?.text,
            text: node.properties?.text || node.properties?.content,
            title: node.properties?.title || node.properties?.name,
            content: node.properties?.content,
            description: node.properties?.description,
            labels: node.labels || ['Concept'],
            properties: {
              ...node.properties,
              activation_strength: node.properties?.activation_strength || 0.5,
              mention_count: node.properties?.mention_count || 0
            },
            relevanceScore: node.properties?.relevanceScore || 1.0
          }));
          
          console.log(`[CachedConcepts] ✅ Live search found ${liveResults.length} matches`);
          setSearchResults(liveResults);
          setIsSearching(false);
          return liveResults;
        }
      } catch (searchError) {
        console.log('[CachedConcepts] ⚠️ Live search failed, returning empty results');
      }

      // Step 3: No results found
      setSearchResults([]);
      setIsSearching(false);
      return [];

    } catch (error) {
      console.error('[CachedConcepts] ❌ Search error:', error);
      setSearchResults([]);
      setIsSearching(false);
      return [];
    }
  }, [conceptsOverview, fuzzySearchConcepts, tRPCSearchRefetch]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchQuery('');
  }, []);

  // Initialize data on mount (run once only)
  useEffect(() => {
    fetchConcepts();
  }, []); // Empty deps to prevent infinite loops

  // Refresh function (force cache refresh)
  const refetch = useCallback(() => {
    return fetchConcepts(true);
  }, [fetchConcepts]);

  // Invalidate cache function
  const invalidateCacheAndRefresh = useCallback(async () => {
    await invalidateCache();
    return fetchConcepts(true);
  }, [invalidateCache, fetchConcepts]);

  return {
    // 🧠 Brain-cached data with enhanced performance
    conceptsOverview,
    isLoading,
    isRefetching: isLoading,
    
    // Search functionality
    searchResults,
    searchQuery,
    isSearching,
    searchConcepts,
    clearSearch,
    
    // Error handling
    hasError,
    errorMessage,
    
    // Cache performance metrics
    isCacheValid,
    cacheStrategy,
    cacheStats: stats,
    lastFetchTime,
    
    // Actions
    refetch,
    invalidateCache: invalidateCacheAndRefresh,
    
    // Computed values with null safety
    totalConcepts: conceptsOverview?.totalConcepts ?? 0,
    isConnected: conceptsOverview?.isConnected ?? false,
    syncSuccess: conceptsOverview?.syncSuccess ?? false,
    lastSyncTime: conceptsOverview?.lastSyncTime || new Date().toISOString(),
    
    // Helper functions
    getConceptById: useCallback((id: string): CachedConcept | undefined => 
      conceptsOverview?.concepts.find(concept => concept.id === id), [conceptsOverview]),
    
    getConceptsByLabel: useCallback((label: string): CachedConcept[] =>
      conceptsOverview?.concepts.filter(concept => 
        concept.labels.includes(label)
      ) || [], [conceptsOverview]),
      
    getActiveConcepts: useCallback((threshold: number = 0.5): CachedConcept[] =>
      conceptsOverview?.concepts.filter(concept => 
        (concept.properties.activation_strength || 0) >= threshold
      ) || [], [conceptsOverview]),
        
    getRecentConcepts: useCallback((): CachedConcept[] =>
      conceptsOverview?.concepts.filter(concept => 
        concept.properties.last_mentioned &&
        new Date(concept.properties.last_mentioned) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).sort((a, b) => 
        new Date(b.properties.last_mentioned!).getTime() - new Date(a.properties.last_mentioned!).getTime()
      ) || [], [conceptsOverview]),
  };
};

/**
 * 📊 Brain Performance Metrics Hook for Concepts
 * Track cache performance for Neo4j concepts
 */
export const useConceptsCacheMetrics = () => {
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
      
    // Neo4j specific metrics
    neo4jEfficiency: {
      queryReduction: (stats.neo4j_queries_saved ?? 0) > 0 ? 
        Math.round(((stats.neo4j_queries_saved ?? 0) / (stats.cache_hits + stats.cache_misses)) * 100) : 0,
      responseSpeedup: (stats.avg_response_time_ms ?? 0) > 0 ? 
        Math.round((2000 / (stats.avg_response_time_ms ?? 0)) * 10) / 10 : 1, // X times faster
      cacheUtilization: isValid ? 100 : 0
    }
  };
}; 