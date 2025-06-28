import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '~/utils/api';
import { useBrainContactsCache } from './useBrainMemoryCache';
import { debugAuthStatus } from '~/utils/auth';
import { cacheCoordinator } from '~/services/cacheCoordinator';

import type { ContactData } from '@omnii/validators';

interface ContactsListResponse {
  contacts: ContactData[];
  totalCount: number;
  nextPageToken?: string;
}

/**
 * 🧠 Cache-First Contacts Hook with Brain-Inspired Memory
 * 
 * This hook implements a brain-inspired caching strategy:
 * 1. Check brain memory cache first (24hr cache for very low volatility)
 * 2. If cache miss, fetch from Google Contacts API via tRPC
 * 3. Store result in brain cache for future requests
 * 4. Expected 90%+ reduction in API calls with <50ms cached responses
 */
export const useCachedContacts = (pageSize: number = 1000) => {
  const initializingRef = useRef(false);
  const [contactsData, setContactsData] = useState<ContactsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Brain memory cache for contacts (24hr cache - very low volatility)
  const {
    cache,
    getCachedData,
    setCachedData,
    invalidateCache,
    isValid: isCacheValid,
    cacheStrategy,
    stats
  } = useBrainContactsCache();

  // Debug auth status when hook mounts
  useEffect(() => {
    const checkAuth = async () => {
      await debugAuthStatus();
    };
    checkAuth();
  }, []);

  // Direct tRPC query (used for cache misses)
  const {
    data: tRPCData,
    isLoading: tRPCLoading,
    error: tRPCError,
    refetch: tRPCRefetch,
  } = useQuery({
    ...trpc.contacts.listContacts.queryOptions(),
    enabled: false, // Only fetch manually when cache misses
    refetchOnWindowFocus: false,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours to match cache strategy
  });

  // Cache-first data fetching strategy
  const fetchContacts = useCallback(async (forceRefresh = false): Promise<ContactsListResponse | null> => {
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
        
        if (cachedData?.contacts && cachedData?.totalContacts !== undefined) {
          // Cache hit! 🎯 Transform cached data back to ContactsListResponse format
          const cachedContacts: ContactsListResponse = {
            contacts: cachedData.contacts,
            totalCount: cachedData.totalContacts,
          };

          setContactsData(cachedContacts);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          
          console.log(`[CachedContacts] 🎯 Cache HIT: ${cachedData.totalContacts} contacts in ${Date.now() - startTime}ms`);
          return cachedContacts;
        }
      }

      // Step 2: Cache miss - try to fetch from Google Contacts API with coordination
      console.log('[CachedContacts] 📭 Cache miss - attempting to fetch from Google Contacts API...');
      
      try {
        // ✅ Use CacheCoordinator to prevent rate limiting and cache stampedes
        const tRPCResult = await cacheCoordinator.safeRefreshCache(
          'google_contacts',
          cacheStrategy?.refresh_strategy || 'rate_limited_background',
          async () => await tRPCRefetch()
        );
        
        console.log('[CachedContacts] 🔍 tRPC Response Debug:', {
          hasError: !!tRPCResult.error,
          errorMessage: tRPCResult.error?.message,
          hasData: !!tRPCResult.data,
          dataStructure: tRPCResult.data ? (Array.isArray(tRPCResult.data) ? tRPCResult.data : Object.keys(tRPCResult.data)) : null,
          isArray: Array.isArray(tRPCResult.data),
          dataType: typeof tRPCResult.data,
          fullData: tRPCResult.data,
          success: tRPCResult.data?.success,
          actualData: tRPCResult.data?.data ? 'present' : 'missing'
        });
        
        if (tRPCResult.error) {
          console.log('[CachedContacts] ⚠️ Google Contacts API not available - returning empty data');
          // Return empty data structure instead of throwing error
          const emptyData: ContactsListResponse = {
            contacts: [],
            totalCount: 0,
          };
          
          setContactsData(emptyData);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          return emptyData;
        }

        // 🔧 FIX: Handle tRPC serialization wrapper (json/meta format)
        let freshData: ContactsListResponse | null = null;
        
        // Check if data is wrapped in serialization format: { json: { data: {...} }, meta: {...} }
        if ((tRPCResult.data as any)?.json?.data) {
          freshData = (tRPCResult.data as any).json.data as ContactsListResponse;
        } 
        // Fallback: Direct success/data format
        else if (tRPCResult.data?.success && tRPCResult.data?.data) {
          freshData = tRPCResult.data.data as ContactsListResponse;
        } 
        // Fallback: Direct data format
        else if (tRPCResult.data && typeof tRPCResult.data === 'object' && 'contacts' in tRPCResult.data && 'totalCount' in tRPCResult.data) {
          freshData = tRPCResult.data as ContactsListResponse;
        }
        
        if (!freshData || !freshData.contacts) {
          console.log('[CachedContacts] ⚠️ No Google Contacts data available - returning empty data');
          // Return empty data structure instead of throwing error
          const emptyData: ContactsListResponse = {
            contacts: [],
            totalCount: 0,
          };
          
          setContactsData(emptyData);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          return emptyData;
        }

        // Step 3: Store in brain memory cache for future requests
        const cacheData = {
          contacts: freshData.contacts || [],
          totalContacts: freshData.totalCount || 0,
          lastSynced: new Date().toISOString(),
          cacheVersion: 1,
          dataType: 'google_contacts' as const,
        };

        await setCachedData(cacheData);

        setContactsData(freshData);
        setLastFetchTime(Date.now());
        setIsLoading(false);
        
        console.log(`[CachedContacts] ✅ Fresh data cached: ${freshData.totalCount} contacts in ${Date.now() - startTime}ms`);
        return freshData;

      } catch (apiError: any) {
        // ✅ Enhanced error handling for rate limiting and other API issues
        const errorMessage = apiError?.message || 'Unknown error';
        
        if (errorMessage.includes('Rate limited')) {
          console.log('[CachedContacts] 🚦 Rate limited - returning stale cache data if available');
          
          // Try to return stale cache data during rate limiting
          const staleData = await getCachedData();
          if (staleData?.contacts) {
            const staleContacts: ContactsListResponse = {
              contacts: staleData.contacts,
              totalCount: staleData.totalContacts || staleData.contacts.length,
            };
            
            setContactsData(staleContacts);
            setLastFetchTime(Date.now());
            setIsLoading(false);
            console.log('[CachedContacts] 🔄 Returning stale data during rate limiting');
            return staleContacts;
          }
        }
        
        console.log('[CachedContacts] ⚠️ API error or authentication required - returning empty data:', errorMessage);
        // Return empty data structure when API fails
        const emptyData: ContactsListResponse = {
          contacts: [],
          totalCount: 0,
        };
        
        setContactsData(emptyData);
        setLastFetchTime(Date.now());
        setIsLoading(false);
        return emptyData;
      }

    } catch (error) {
      console.log('[CachedContacts] ⚠️ Unexpected error - returning empty data');
      const emptyData: ContactsListResponse = {
        contacts: [],
        totalCount: 0,
      };
      
      setContactsData(emptyData);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
      return emptyData;
    } finally {
      initializingRef.current = false;
    }
  }, [getCachedData, setCachedData, tRPCRefetch]);

  // Initialize data on mount (run once only)
  useEffect(() => {
    fetchContacts();
  }, []); // 🔧 Empty deps to prevent infinite loops



  // Refresh function (force cache refresh)
  const refetch = useCallback(() => {
    return fetchContacts(true);
  }, [fetchContacts]);

  // Invalidate cache function
  const invalidateCacheAndRefresh = useCallback(async () => {
    await invalidateCache();
    return fetchContacts(true);
  }, [invalidateCache, fetchContacts]);

  return {
    // 🧠 Brain-cached data with enhanced performance
    contactsData,
    contacts: contactsData?.contacts ?? [],
    isLoading,
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
    refetch,
    invalidateCache: invalidateCacheAndRefresh,
    
    // Computed values with null safety
    totalContacts: contactsData?.totalCount ?? 0,
    hasContacts: (contactsData?.contacts?.length ?? 0) > 0,
    
    // Helper functions with proper typing
    getContactById: useCallback((id: string): ContactData | undefined => 
      contactsData?.contacts.find((contact: ContactData) => contact.contactId === id), [contactsData]),
    
    getContactsByName: useCallback((searchName: string): ContactData[] =>
      contactsData?.contacts.filter((contact: ContactData) => 
        contact.name.toLowerCase().includes(searchName.toLowerCase())
      ) ?? [], [contactsData]),
      
    getContactsByEmail: useCallback((searchEmail: string): ContactData[] =>
      contactsData?.contacts.filter((contact: ContactData) => 
        contact.emails.some(email => 
          email.address.toLowerCase().includes(searchEmail.toLowerCase())
        )
      ) ?? [], [contactsData]),

    getContactsByPhone: useCallback((searchPhone: string): ContactData[] =>
      contactsData?.contacts.filter((contact: ContactData) => 
        contact.phones.some(phone => phone.number.includes(searchPhone))
      ) ?? [], [contactsData]),
  };
};

/**
 * 📊 Brain Performance Metrics Hook for Contacts
 * Track cache performance for contacts
 */
export const useContactsCacheMetrics = () => {
  const { stats, cacheStrategy, isValid } = useBrainContactsCache();
  
  return {
    cacheStats: stats,
    cacheStrategy,
    isCacheValid: isValid,
    
    // Computed metrics
    hitRatio: stats.cache_hits + stats.cache_misses > 0 
      ? Math.round((stats.cache_hits / (stats.cache_hits + stats.cache_misses)) * 100)
      : 0,
    
    averageResponseTime: stats.avg_response_time_ms ?? 0,
    totalApiCallsSaved: stats.neo4j_queries_saved, // Reusing field for API calls
    
    // Performance insights
    performanceImprovement: (stats.avg_response_time_ms ?? 0) > 0 
      ? Math.round((600 - (stats.avg_response_time_ms ?? 0)) / 600 * 100) // Assuming 600ms baseline for contacts
      : 0,
  };
}; 