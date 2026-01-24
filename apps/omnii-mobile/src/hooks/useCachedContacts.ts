import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '~/utils/api';
import { useBrainContactsCache } from './useBrainMemoryCache';
import { debugAuthStatus } from '~/utils/auth';

import type { ContactData } from '@omnii/validators';

/**
 * 🧠 Cache-First Contacts Hook with Brain-Inspired Memory
 * 
 * ✅ REVERTED: Back to working Tasks/Calendar pattern (no Delta Sync Coordinator)
 * 
 * This hook implements a brain-inspired caching strategy:
 * 1. Check brain memory cache first (3-week cache for comprehensive contact view)
 * 2. If cache miss, fetch from Google Contacts API via tRPC
 * 3. Store result in brain cache for future requests
 * 4. Expected 95%+ reduction in API calls with <100ms cached responses
 */

interface ContactsListResponse {
  contacts: ContactData[];
  totalCount: number;
}

export const useCachedContacts = () => {
  const initializingRef = useRef(false);
  const [contactsData, setContactsData] = useState<ContactsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Brain memory cache for contacts (3-week cache - comprehensive contact view)
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
    staleTime: 21 * 24 * 60 * 60 * 1000, // 3 weeks to match cache strategy
  });

  // ✅ Cache-First Contacts Fetching (Tasks/Calendar Pattern)
  const fetchContacts = useCallback(async (forceRefresh = false): Promise<ContactsListResponse | null> => {
    if (initializingRef.current) return null;
    initializingRef.current = true;

    try {
      console.log(`[CachedContacts] 🗓️ Starting 3-week cache fetch (force: ${forceRefresh})`);
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
      
      const startTime = Date.now();

      // Step 1: Check brain memory cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = await getCachedData();
        
        if (cachedData?.contacts && cachedData?.totalCount !== undefined) {
          // Cache hit! 🎯 Transform cached data back to ContactsListResponse format
          const cachedContacts: ContactsListResponse = {
            contacts: cachedData.contacts,
            totalCount: cachedData.totalCount,
          };

          setContactsData(cachedContacts);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          
          console.log(`[CachedContacts] 🎯 Cache HIT: ${cachedData.totalCount} contacts in ${Date.now() - startTime}ms`);
          return cachedContacts;
        }
      }

      // Step 2: Cache miss - try to fetch from Google Contacts API (graceful failure)
      console.log('[CachedContacts] 📭 Cache miss - attempting to fetch from Google Contacts API...');
      
      try {
        const tRPCResult = await tRPCRefetch();
        
        if (tRPCResult.error) {
          console.log('[CachedContacts] ⚠️ Contacts API not available - returning empty data');
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

        // 🔧 Handle tRPC serialization wrapper (json/meta format)
        let freshData: ContactsListResponse | null = null;
        
        // Helper function to convert raw tRPC data to our expected format
        const convertToContactsResponse = (rawData: any): ContactsListResponse => {
          return {
            contacts: rawData?.contacts || [],
            totalCount: rawData?.totalCount || (rawData?.contacts?.length || 0)
          };
        };
        
        // Check if data is wrapped in serialization format: { json: { data: {...} }, meta: {...} }
        if ((tRPCResult.data as any)?.json?.data?.json?.data) {
          const rawData = (tRPCResult.data as any).json.data.json.data;
          freshData = convertToContactsResponse(rawData);
        } 
        else if ((tRPCResult.data as any)?.json?.data) {
          const rawData = (tRPCResult.data as any).json.data;
          freshData = convertToContactsResponse(rawData);
        } 
        // Fallback: Direct success/data format
        else if (tRPCResult.data?.success && (tRPCResult.data as any)?.data) {
          const rawData = (tRPCResult.data as any).data;
          freshData = convertToContactsResponse(rawData);
        }
        // Fallback: Direct data format
        else if (tRPCResult.data && typeof tRPCResult.data === 'object' && 'contacts' in tRPCResult.data) {
          const rawData = tRPCResult.data as any;
          freshData = convertToContactsResponse(rawData);
        }
        
        if (!freshData) {
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
          totalCount: freshData.totalCount || 0,
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

      } catch (authError) {
        console.log('[CachedContacts] ⚠️ Authentication required for Contacts - returning empty data');
        // Return empty data structure when authentication fails
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
  }, []); // Empty deps to prevent infinite loops

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
    contacts: contactsData?.contacts ?? [],
    
    // Helper functions with proper ContactData typing
    getContactById: useCallback((id: string): ContactData | undefined => 
      contactsData?.contacts.find((contact: ContactData) => contact.contactId === id), [contactsData]),
    
    searchContacts: useCallback((query: string): ContactData[] => 
      contactsData?.contacts.filter((contact: ContactData) => 
        contact.name?.toLowerCase().includes(query.toLowerCase()) ||
        contact.emails?.some(email => email.address?.toLowerCase().includes(query.toLowerCase()))
      ) ?? [], [contactsData]),
    
    getContactByEmail: useCallback((email: string): ContactData | undefined => 
      contactsData?.contacts.find((contact: ContactData) => 
        contact.emails?.some((emailAddr) => 
          emailAddr.address?.toLowerCase() === email.toLowerCase()
        )
      ), [contactsData]),
  };
}; 