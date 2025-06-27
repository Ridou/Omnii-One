import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '~/utils/api';
import { useBrainEmailCache } from './useBrainMemoryCache';
import { debugAuthStatus } from '~/utils/auth';

import type { EmailData } from '@omnii/validators';

interface EmailsListResponse {
  emails: EmailData[];
  totalCount: number;
  unreadCount: number;
  nextPageToken?: string;
}

/**
 * 🧠 Cache-First Email Hook with Brain-Inspired Memory
 * 
 * This hook implements a brain-inspired caching strategy:
 * 1. Check brain memory cache first (5min cache for high volatility)
 * 2. If cache miss, fetch from Gmail API via tRPC
 * 3. Store result in brain cache for future requests
 * 4. Expected 90%+ reduction in API calls with <50ms cached responses
 */

export const useCachedEmail = (maxResults: number = 20, query: string = "newer_than:7d") => {
  const initializingRef = useRef(false);
  const [emailsData, setEmailsData] = useState<EmailsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Brain memory cache for emails (5min cache - high volatility)
  const {
    cache,
    getCachedData,
    setCachedData,
    invalidateCache,
    isValid: isCacheValid,
    cacheStrategy,
    stats
  } = useBrainEmailCache();

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
    ...trpc.email.listEmails.queryOptions(),
    enabled: false, // Only fetch manually when cache misses
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes to match cache strategy
  });

  // Cache-first data fetching strategy
  const fetchEmails = useCallback(async (forceRefresh = false): Promise<EmailsListResponse | null> => {
    if (initializingRef.current) return null;
    initializingRef.current = true;

    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
      
      const startTime = Date.now();

      // Step 1: Check brain memory cache first (unless forcing refresh)
      if (!forceRefresh) {
        console.log('[CachedEmail] 🧠 Checking brain memory cache...');
        const cachedData = await getCachedData();
        
        if (cachedData?.emails && cachedData?.totalEmails !== undefined) {
          // Cache hit! 🎯 Transform cached data back to EmailsListResponse format
          const cachedEmails: EmailsListResponse = {
            emails: cachedData.emails,
            totalCount: cachedData.totalEmails,
            unreadCount: cachedData.unreadCount || 0,
          };

          setEmailsData(cachedEmails);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          
          console.log(`[CachedEmail] 🎯 Cache HIT: ${cachedData.totalEmails} emails in ${Date.now() - startTime}ms`);
          return cachedEmails;
        }
      }

      // Step 2: Cache miss - fetch from tRPC/Gmail API
      console.log('[CachedEmail] 📭 Cache miss - fetching from Gmail API...');
      const tRPCResult = await tRPCRefetch();
      
      console.log('[CachedEmail] 🔍 tRPC Response Debug:', {
        hasError: !!tRPCResult.error,
        errorMessage: tRPCResult.error?.message,
        hasData: !!tRPCResult.data,
        dataStructure: tRPCResult.data ? Object.keys(tRPCResult.data) : null,
        success: tRPCResult.data?.success,
        actualData: tRPCResult.data?.data ? 'present' : 'missing'
      });
      
      if (tRPCResult.error) {
        console.error('[CachedEmail] ❌ tRPC Error:', tRPCResult.error);
        throw new Error(`Gmail API Authentication Error: ${tRPCResult.error.message}`);
      }

      let freshData = tRPCResult.data?.success ? tRPCResult.data.data : null;
      
      if (!freshData) {
        console.error('[CachedEmail] ❌ Gmail API Authentication Failed');
        console.error('  - Check Google OAuth configuration');
        console.error('  - Verify Gmail API scopes are enabled');
        console.error('  - Ensure user is properly authenticated');
        throw new Error('Gmail API Authentication Failed - user must re-authenticate with Google');
      }

      // Step 3: Store in brain memory cache for future requests
      const cacheData = {
        emails: freshData.emails || [],
        totalEmails: freshData.totalCount || 0,
        unreadCount: freshData.unreadCount || 0,
        lastSynced: new Date().toISOString(),
        cacheVersion: 1,
        dataType: 'google_emails' as const,
      };

      await setCachedData(cacheData);

      setEmailsData(freshData);
      setLastFetchTime(Date.now());
      setIsLoading(false);
      
      console.log(`[CachedEmail] ✅ Fresh data cached: ${freshData.totalCount} emails in ${Date.now() - startTime}ms`);
      return freshData;

    } catch (error) {
      console.error('[CachedEmail] ❌ Error fetching emails:', error);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
      return null;
    } finally {
      initializingRef.current = false;
    }
  }, [getCachedData, setCachedData, tRPCRefetch]);

  // Initialize data on mount (Fixed to prevent infinite loops)
  useEffect(() => {
    let isMounted = true;
    
    const initializeEmails = async () => {
      console.log('[CachedEmail] 🚀 EFFECT TRIGGERED - initializing emails...');
      if (!isMounted) return;
      
      try {
        await fetchEmails();
      } catch (error) {
        console.error('[CachedEmail] ❌ Error in initialization:', error);
      }
    };

    initializeEmails();
    
    return () => {
      isMounted = false;
    };
  }, []); // 🔧 Empty deps to prevent infinite loops

  // Log when dependencies change to debug re-renders
  useEffect(() => {
    console.log('[CachedEmail] 🔄 Dependencies changed:', {
      getCachedData: typeof getCachedData,
      setCachedData: typeof setCachedData,
      tRPCRefetch: typeof tRPCRefetch
    });
  }, [getCachedData, setCachedData, tRPCRefetch]);

  // Refresh function (force cache refresh)
  const refetch = useCallback(() => {
    return fetchEmails(true);
  }, [fetchEmails]);

  // Invalidate cache function
  const invalidateCacheAndRefresh = useCallback(async () => {
    await invalidateCache();
    return fetchEmails(true);
  }, [invalidateCache, fetchEmails]);

  return {
    // 🧠 Brain-cached data with enhanced performance
    emailsData,
    emails: emailsData?.emails ?? [],
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
    totalEmails: emailsData?.totalCount ?? 0,
    unreadCount: emailsData?.unreadCount ?? 0,
    hasEmails: (emailsData?.emails?.length ?? 0) > 0,
    
    // Helper functions with proper typing
    getEmailById: useCallback((id: string): EmailData | undefined => 
      emailsData?.emails.find((email: EmailData) => email.id === id), [emailsData]),
    
    getEmailsBySubject: useCallback((searchTerm: string): EmailData[] =>
      emailsData?.emails.filter((email: EmailData) => 
        email.subject.toLowerCase().includes(searchTerm.toLowerCase())
      ) ?? [], [emailsData]),
      
    getEmailsBySender: useCallback((senderEmail: string): EmailData[] =>
      emailsData?.emails.filter((email: EmailData) => 
        email.from.toLowerCase().includes(senderEmail.toLowerCase())
      ) ?? [], [emailsData]),

    getUnreadEmails: useCallback((): EmailData[] =>
      emailsData?.emails.filter((email: EmailData) => email.labelIds?.includes('UNREAD')) ?? [], [emailsData]),

    getRecentEmails: useCallback((hours: number = 24): EmailData[] => {
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      return emailsData?.emails.filter((email: EmailData) => {
        if (!email.date) return false;
        const emailDate = new Date(email.date);
        return emailDate >= cutoffTime;
      }) ?? [];
    }, [emailsData]),
  };
};

/**
 * 📊 Brain Performance Metrics Hook for Email
 * Track cache performance for emails
 */
export const useEmailCacheMetrics = () => {
  const { stats, cacheStrategy, isValid } = useBrainEmailCache();
  
  return {
    cacheStats: stats,
    cacheStrategy,
    isCacheValid: isValid,
    
    // Computed metrics
    hitRatio: stats.cache_hits + stats.cache_misses > 0 
      ? Math.round((stats.cache_hits / (stats.cache_hits + stats.cache_misses)) * 100)
      : 0,
    
    averageResponseTime: stats.avg_response_time_ms,
    totalApiCallsSaved: stats.neo4j_queries_saved, // Reusing field for API calls
    
    // Performance insights
    performanceImprovement: stats.avg_response_time_ms > 0 
      ? Math.round((2000 - stats.avg_response_time_ms) / 2000 * 100) // Assuming 2s baseline for emails
      : 0,
  };
}; 