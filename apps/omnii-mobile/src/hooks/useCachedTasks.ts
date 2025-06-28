import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { trpc } from '~/utils/api';
import { useBrainTasksCache } from './useBrainMemoryCache';
import { debugAuthStatus } from '~/utils/auth';

import type { CompleteTaskOverview, TaskData, TaskListWithTasks } from '@omnii/validators';

/**
 * 🧠 Cache-First Tasks Hook with Brain-Inspired Memory
 * 
 * This hook implements a brain-inspired caching strategy:
 * 1. Check brain memory cache first (30min cache for medium volatility)
 * 2. If cache miss, fetch from Google Tasks API via tRPC
 * 3. Store result in brain cache for future requests
 * 4. Expected 90%+ reduction in API calls with <50ms cached responses
 */

export const useCachedTasks = () => {
  const initializingRef = useRef(false);
  const [tasksOverview, setTasksOverview] = useState<CompleteTaskOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Brain memory cache for tasks (30min cache - medium volatility)
  const {
    cache,
    getCachedData,
    setCachedData,
    invalidateCache,
    isValid: isCacheValid,
    cacheStrategy,
    stats
  } = useBrainTasksCache();

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
    ...trpc.tasks.getCompleteOverview.queryOptions(),
    enabled: false, // Only fetch manually when cache misses
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000, // 30 minutes to match cache strategy
  });

  // Cache-first data fetching strategy
  const fetchTasks = useCallback(async (forceRefresh = false): Promise<CompleteTaskOverview | null> => {
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
        
        if (cachedData?.taskLists && cachedData?.totalTasks !== undefined) {
          // Cache hit! 🎯 Use cached data with correct schema
          const cachedOverview: CompleteTaskOverview = {
            taskLists: cachedData.taskLists || [],
            totalLists: cachedData.totalLists || 0,
            totalTasks: cachedData.totalTasks,
            totalCompleted: cachedData.totalCompleted || 0,
            totalPending: cachedData.totalPending || 0,
            totalOverdue: cachedData.totalOverdue || 0,
            lastSyncTime: cachedData.lastSyncTime || new Date().toISOString(),
            syncSuccess: cachedData.syncSuccess || true,
          };

          setTasksOverview(cachedOverview);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          
          console.log(`[CachedTasks] 🎯 Cache HIT: ${cachedData.totalTasks} tasks in ${Date.now() - startTime}ms`);
          return cachedOverview;
        }
      }

      // Step 2: Cache miss - try to fetch from Google Tasks API (graceful failure)
      console.log('[CachedTasks] 📭 Cache miss - attempting to fetch from Google Tasks API...');
      
      try {
        const tRPCResult = await tRPCRefetch();
        
        if (tRPCResult.error) {
          console.log('[CachedTasks] ⚠️ Google Tasks API not available - returning empty data');
          // Return empty data structure instead of throwing error
          const emptyData: CompleteTaskOverview = {
            taskLists: [],
            totalLists: 0,
            totalTasks: 0,
            totalCompleted: 0,
            totalPending: 0,
            totalOverdue: 0,
            lastSyncTime: new Date().toISOString(),
            syncSuccess: false,
          };
          
          setTasksOverview(emptyData);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          return emptyData;
        }

        // 🔧 FIX: Handle tRPC serialization wrapper (json/meta format)
        let freshData = null;
        
        // Check if data is wrapped in serialization format: { json: { data: {...} }, meta: {...} }
        if ((tRPCResult.data as any)?.json?.data) {
          freshData = (tRPCResult.data as any).json.data;
        } 
        // Fallback: Direct success/data format
        else if (tRPCResult.data?.success && tRPCResult.data?.data) {
          freshData = tRPCResult.data.data;
        }
        
        if (!freshData) {
          console.log('[CachedTasks] ⚠️ No Google Tasks data available - returning empty data');
          // Return empty data structure instead of throwing error
          const emptyData: CompleteTaskOverview = {
            taskLists: [],
            totalLists: 0,
            totalTasks: 0,
            totalCompleted: 0,
            totalPending: 0,
            totalOverdue: 0,
            lastSyncTime: new Date().toISOString(),
            syncSuccess: false,
          };
          
          setTasksOverview(emptyData);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          return emptyData;
        }

        // Step 3: Store in brain memory cache for future requests
        const cacheData = {
          taskLists: freshData.taskLists || [],
          totalLists: freshData.totalLists || 0,
          totalTasks: freshData.totalTasks || 0,
          totalCompleted: freshData.totalCompleted || 0,
          totalPending: freshData.totalPending || 0,
          totalOverdue: freshData.totalOverdue || 0,
          lastSyncTime: freshData.lastSyncTime || new Date().toISOString(),
          syncSuccess: freshData.syncSuccess || true,
          lastSynced: new Date().toISOString(),
          cacheVersion: 1,
          dataType: 'google_tasks' as const,
        };

        await setCachedData(cacheData);

        setTasksOverview(freshData as CompleteTaskOverview);
        setLastFetchTime(Date.now());
        setIsLoading(false);
        
        console.log(`[CachedTasks] ✅ Fresh data cached: ${freshData.totalTasks} tasks in ${Date.now() - startTime}ms`);
        return freshData;

      } catch (authError) {
        console.log('[CachedTasks] ⚠️ Authentication required for Google Tasks - returning empty data');
        // Return empty data structure when authentication fails
        const emptyData: CompleteTaskOverview = {
          taskLists: [],
          totalLists: 0,
          totalTasks: 0,
          totalCompleted: 0,
          totalPending: 0,
          totalOverdue: 0,
          lastSyncTime: new Date().toISOString(),
          syncSuccess: false,
        };
        
        setTasksOverview(emptyData);
        setLastFetchTime(Date.now());
        setIsLoading(false);
        return emptyData;
      }

    } catch (error) {
      console.log('[CachedTasks] ⚠️ Unexpected error - returning empty data');
      const emptyData: CompleteTaskOverview = {
        taskLists: [],
        totalLists: 0,
        totalTasks: 0,
        totalCompleted: 0,
        totalPending: 0,
        totalOverdue: 0,
        lastSyncTime: new Date().toISOString(),
        syncSuccess: false,
      };
      
      setTasksOverview(emptyData);
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
    fetchTasks();
  }, []); // 🔧 Empty deps to prevent infinite loops

  // Refresh function (force cache refresh)
  const refetch = useCallback(() => {
    return fetchTasks(true);
  }, [fetchTasks]);

  // Invalidate cache function
  const invalidateCacheAndRefresh = useCallback(async () => {
    await invalidateCache();
    return fetchTasks(true);
  }, [invalidateCache, fetchTasks]);

  // Helper function to get all tasks from all task lists
  const getAllTasksFromOverview = useCallback((overview: CompleteTaskOverview | null): TaskData[] => {
    if (!overview?.taskLists) return [];
    return overview.taskLists.flatMap(list => list.tasks || []);
  }, []);

  // TODO: Add task mutations later - focus on cache-first reads for now

  return {
    // 🧠 Brain-cached data with enhanced performance
    tasksOverview,
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
    totalTasks: tasksOverview?.totalTasks ?? 0,
    totalLists: tasksOverview?.taskLists.length ?? 0,
    totalCompleted: tasksOverview?.totalCompleted ?? 0,
    totalPending: tasksOverview?.totalPending ?? 0,
    totalOverdue: tasksOverview?.totalOverdue ?? 0,
    syncSuccess: tasksOverview?.syncSuccess ?? true,
    lastSyncTime: tasksOverview?.lastSyncTime 
      ? new Date(tasksOverview.lastSyncTime).toISOString()
      : new Date().toISOString(),
    
    // Helper functions with proper typing
    getTaskListById: useCallback((id: string): TaskListWithTasks | undefined => 
      tasksOverview?.taskLists.find((list: TaskListWithTasks) => list.id === id), [tasksOverview]),
    
    getAllTasks: useCallback((): TaskData[] => 
      getAllTasksFromOverview(tasksOverview), [tasksOverview, getAllTasksFromOverview]),
      
    getPendingTasks: useCallback((): TaskData[] =>
      getAllTasksFromOverview(tasksOverview).filter((task: TaskData) => task.status === 'needsAction'), [tasksOverview, getAllTasksFromOverview]),
        
    getOverdueTasks: useCallback((): TaskData[] =>
      getAllTasksFromOverview(tasksOverview).filter((task: TaskData) => 
        task.status === 'needsAction' && 
        task.due && 
        new Date(task.due) < new Date()
      ), [tasksOverview, getAllTasksFromOverview]),
  };
};

/**
 * 📊 Brain Performance Metrics Hook
 * Track cache performance for tasks
 */
export const useTasksCacheMetrics = () => {
  const { stats, cacheStrategy, isValid } = useBrainTasksCache();
  
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
      ? Math.round((2000 - (stats.avg_response_time_ms ?? 0)) / 2000 * 100) // Assuming 2s baseline
      : 0,
  };
}; 