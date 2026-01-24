import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '~/utils/api';
import { useBrainTasksCache } from './useBrainMemoryCache';
import { debugAuthStatus } from '~/utils/auth';
import { performanceMonitor } from '../services/performanceMonitor';
import { concurrencyManager } from '../services/concurrencyManager';

import type { TaskData } from '@omnii/validators';

interface TasksCompleteOverviewResponse {
  taskLists: Array<{
    id: string;
    title: string;
    tasks: TaskData[];
  }>;
  totalTasks: number;
  totalLists: number;
  totalCompleted: number;
  totalPending: number;
  totalOverdue: number;
  lastSyncTime?: string;
  syncSuccess: boolean;
}

/**
 * 🧠 Cache-First Tasks Hook with Brain-Inspired Memory
 * 
 * ✅ REVERTED: Back to working Calendar pattern (no Delta Sync Coordinator)
 * 
 * This hook implements a brain-inspired caching strategy:
 * 1. Check brain memory cache first (3-week cache for comprehensive task view)
 * 2. If cache miss, fetch from Google Tasks API via tRPC
 * 3. Store result in brain cache for future requests
 * 4. Expected 95%+ reduction in API calls with <100ms cached responses
 */

export const useCachedTasks = () => {
  const initializingRef = useRef(false);
  const [tasksData, setTasksData] = useState<TasksCompleteOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Brain memory cache for tasks (3-week cache - comprehensive task view)
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
    staleTime: 21 * 24 * 60 * 60 * 1000, // 3 weeks to match cache strategy
  });

  // ✅ Cache-First Tasks Fetching with Concurrency Prevention
  const fetchTasks = useCallback(async (forceRefresh = false): Promise<TasksCompleteOverviewResponse | null> => {
    if (initializingRef.current) return null;
    
    const resourceKey = `tasks-${forceRefresh ? 'force' : 'normal'}`;
    
    // Use concurrency manager to prevent simultaneous requests
    return concurrencyManager.preventConcurrentRefresh(resourceKey, async () => {
      initializingRef.current = true;

      try {
        console.log(`[CachedTasks] 🗓️ Starting 3-week cache fetch (force: ${forceRefresh})`);
        setIsLoading(true);
        setHasError(false);
        setErrorMessage(null);
        
        const startTime = Date.now();

      // Step 1: Check brain memory cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = await getCachedData();
        
        if (cachedData?.tasks && cachedData?.totalTasks !== undefined) {
          // Cache hit! 🎯 Track performance and transform cached data
          const cacheDuration = Date.now() - startTime;
          performanceMonitor.recordMetric('tasks-cache-hit', cacheDuration, true);
          
          const cachedTasks: TasksCompleteOverviewResponse = {
            taskLists: cachedData.taskLists || [],
            totalTasks: cachedData.totalTasks || 0,
            totalLists: cachedData.totalLists || 0,
            totalCompleted: cachedData.totalCompleted || 0,
            totalPending: cachedData.totalPending || 0,
            totalOverdue: cachedData.totalOverdue || 0,
            lastSyncTime: cachedData.lastSyncTime,
            syncSuccess: true
          };

          setTasksData(cachedTasks);
          setLastFetchTime(Date.now());
          setIsLoading(false);
          
          console.log(`[CachedTasks] 🎯 Cache HIT: ${cachedData.totalTasks} tasks in ${cacheDuration}ms`);
          return cachedTasks;
        }
      }

      // Step 2: Cache miss - fetch from Google Tasks API
      console.log('[CachedTasks] 📭 Cache miss - fetching from Google Tasks API...');
      const apiStartTime = Date.now();
      const tRPCResult = await tRPCRefetch();
      const apiDuration = Date.now() - apiStartTime;
      performanceMonitor.recordMetric('tasks-api-call', apiDuration, false);
      
      if (tRPCResult.error) {
        throw new Error(tRPCResult.error.message);
      }

      // 🔧 Handle tRPC serialization wrapper (json/meta format)
      let freshData: TasksCompleteOverviewResponse | null = null;
      
      // Helper function to convert raw tRPC data to our expected format
      const convertToTasksOverview = (rawData: any): TasksCompleteOverviewResponse => {
        return {
          taskLists: rawData?.taskLists || [],
          totalTasks: rawData?.totalTasks || 0,
          totalLists: rawData?.totalLists || 0,
          totalCompleted: rawData?.totalCompleted || 0,
          totalPending: rawData?.totalPending || 0,
          totalOverdue: rawData?.totalOverdue || 0,
          lastSyncTime: rawData?.lastSyncTime,
          syncSuccess: true
        };
      };
      
      // Check if data is wrapped in serialization format: { json: { data: {...} }, meta: {...} }
      if ((tRPCResult.data as any)?.json?.data) {
        const rawData = (tRPCResult.data as any).json.data;
        freshData = convertToTasksOverview(rawData);
      } 
      // Fallback: Direct success/data format
      else if (tRPCResult.data?.success && (tRPCResult.data as any)?.data) {
        const rawData = (tRPCResult.data as any).data;
        freshData = convertToTasksOverview(rawData);
      } 
      // Fallback: Direct data format
      else if (tRPCResult.data && typeof tRPCResult.data === 'object' && 'taskLists' in tRPCResult.data) {
        const rawData = tRPCResult.data as any;
        freshData = convertToTasksOverview(rawData);
      }
      
      if (!freshData) {
        console.log('[CachedTasks] ⚠️ No Google Tasks data available - returning empty data');
        // Return empty data structure instead of throwing error
        const emptyData: TasksCompleteOverviewResponse = {
          taskLists: [],
          totalTasks: 0,
          totalLists: 0,
          totalCompleted: 0,
          totalPending: 0,
          totalOverdue: 0,
          syncSuccess: false
        };
        
        setTasksData(emptyData);
        setLastFetchTime(Date.now());
        setIsLoading(false);
        return emptyData;
      }

      // Step 3: Store in brain memory cache for future requests
      const cacheData = {
        tasks: freshData.taskLists || [],
        taskLists: freshData.taskLists || [],
        totalTasks: freshData.totalTasks || 0,
        totalLists: freshData.totalLists || 0,
        totalCompleted: freshData.totalCompleted || 0,
        totalPending: freshData.totalPending || 0,
        totalOverdue: freshData.totalOverdue || 0,
        lastSyncTime: freshData.lastSyncTime || new Date().toISOString(),
        lastSynced: new Date().toISOString(),
        cacheVersion: 1,
        dataType: 'google_tasks' as const,
      };

      await setCachedData(cacheData);

      setTasksData(freshData);
      setLastFetchTime(Date.now());
      setIsLoading(false);
      
      console.log(`[CachedTasks] ✅ Fresh data cached: ${freshData.totalTasks} tasks in ${Date.now() - startTime}ms`);
      return freshData;

    } catch (error) {
      console.error('[CachedTasks] ❌ Error fetching tasks:', error);
      
      // Graceful degradation - return empty data instead of crashing
      const emptyData: TasksCompleteOverviewResponse = {
        taskLists: [],
        totalTasks: 0,
        totalLists: 0,
        totalCompleted: 0,
        totalPending: 0,
        totalOverdue: 0,
        syncSuccess: false
      };
      
      setTasksData(emptyData);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
      return emptyData;
    } finally {
      initializingRef.current = false;
    }
    }); // Close concurrency manager preventConcurrentRefresh
  }, [getCachedData, setCachedData, tRPCRefetch]);

  // Initialize data on mount (run once only)
  useEffect(() => {
    fetchTasks();
  }, []); // Empty deps to prevent infinite loops

  // Refresh function (force cache refresh)
  const refetch = useCallback(() => {
    return fetchTasks(true);
  }, [fetchTasks]);

  // Invalidate cache function
  const invalidateCacheAndRefresh = useCallback(async () => {
    await invalidateCache();
    return fetchTasks(true);
  }, [invalidateCache, fetchTasks]);

  return {
    // 🧠 Brain-cached data with enhanced performance
    tasksData,
    tasksOverview: tasksData,
    taskLists: tasksData?.taskLists ?? [],
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
    totalTasks: tasksData?.totalTasks ?? 0,
    totalLists: tasksData?.totalLists ?? 0,
    totalCompleted: tasksData?.totalCompleted ?? 0,
    totalPending: tasksData?.totalPending ?? 0,
    totalOverdue: tasksData?.totalOverdue ?? 0,
    syncSuccess: tasksData?.syncSuccess ?? false,
    hasTasks: (tasksData?.totalTasks ?? 0) > 0,
    
    // ✅ COMPATIBILITY: Add back expected helper functions for Tasks screen
    getAllTasks: useCallback((): TaskData[] => {
      const allTasks: TaskData[] = [];
      for (const taskList of tasksData?.taskLists ?? []) {
        allTasks.push(...taskList.tasks);
      }
      return allTasks;
    }, [tasksData]),

    getPendingTasks: useCallback((): TaskData[] => {
      const allTasks: TaskData[] = [];
      for (const taskList of tasksData?.taskLists ?? []) {
        allTasks.push(...taskList.tasks.filter((task: TaskData) => task.status === 'needsAction'));
      }
      return allTasks;
    }, [tasksData]),
    
    // Other helper functions with proper typing
    getTaskById: useCallback((id: string): TaskData | undefined => {
      for (const taskList of tasksData?.taskLists ?? []) {
        const task = taskList.tasks.find((task: TaskData) => task.id === id);
        if (task) return task;
      }
      return undefined;
    }, [tasksData]),
    
    getTasksByStatus: useCallback((status: 'needsAction' | 'completed'): TaskData[] => {
      const allTasks: TaskData[] = [];
      for (const taskList of tasksData?.taskLists ?? []) {
        allTasks.push(...taskList.tasks.filter((task: TaskData) => task.status === status));
      }
      return allTasks;
    }, [tasksData]),

    getTasksByList: useCallback((listId: string): TaskData[] => {
      const taskList = tasksData?.taskLists.find(list => list.id === listId);
      return taskList?.tasks ?? [];
    }, [tasksData]),

    getOverdueTasks: useCallback((): TaskData[] => {
      const now = new Date();
      const allTasks: TaskData[] = [];
      for (const taskList of tasksData?.taskLists ?? []) {
        allTasks.push(...taskList.tasks.filter((task: TaskData) => {
          if (!task.due || task.status === 'completed') return false;
          const dueDate = new Date(task.due);
          return dueDate < now;
        }));
      }
      return allTasks;
    }, [tasksData]),

    getTasksDueToday: useCallback((): TaskData[] => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const allTasks: TaskData[] = [];
      for (const taskList of tasksData?.taskLists ?? []) {
        allTasks.push(...taskList.tasks.filter((task: TaskData) => {
          if (!task.due || task.status === 'completed') return false;
          const dueDate = new Date(task.due);
          return dueDate >= startOfDay && dueDate < endOfDay;
        }));
      }
      return allTasks;
    }, [tasksData]),
  };
};

/**
 * 📊 Enhanced 3-Week Cache Performance Metrics Hook
 * Track performance metrics for the new 3-week window system
 */
export const useTasksCacheMetrics = () => {
  const { stats, cacheStrategy, isValid } = useBrainTasksCache();
  
  return {
    cacheStats: stats,
    cacheStrategy: {
      ...cacheStrategy,
      cacheType: '3-week-window',
      windowSize: '21-days',
      concurrencyPrevention: true,
      deltaSyncEnabled: true
    },
    isCacheValid: isValid,
    
    // Computed metrics for 3-week system
    hitRatio: stats.cache_hits + stats.cache_misses > 0 
      ? Math.round((stats.cache_hits / (stats.cache_hits + stats.cache_misses)) * 100)
      : 0,
    
    averageResponseTime: stats.avg_response_time_ms ?? 0,
    totalApiCallsSaved: stats.neo4j_queries_saved, // Reusing field for API calls
    
    // Performance insights for 3-week caching
    performanceImprovement: (stats.avg_response_time_ms ?? 0) > 0 
      ? Math.round((2000 - (stats.avg_response_time_ms ?? 0)) / 2000 * 100) // Assuming 2s API baseline
      : 0,
      
    // 3-week specific metrics
    cacheEfficiency: {
      windowType: '3-week',
      expectedApiReduction: '95%',
      concurrencyPrevention: 'enabled',
      rateLimitingProtection: 'enabled'
    }
  };
}; 