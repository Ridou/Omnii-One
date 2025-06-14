import { trpc } from '~/utils/api';

import type { CompleteTaskOverview, TaskData, TaskListWithTasks } from '@omnii/validators';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debugAuthStatus } from '~/utils/auth';
import { useEffect } from 'react';

/**
 * Hook for fetching tasks using tRPC with proper type safety
 * Now that dependencies are installed, this should work correctly
 */
export const useTasks = () => {
  // Debug auth status when hook mounts
  useEffect(() => {
    const checkAuth = async () => {
      const session = await debugAuthStatus();
    };
    checkAuth();
  }, []);
  

  // ✅ FIXED: tRPC packages now installed - using proper tRPC hook
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery(trpc.tasks.getCompleteOverview.queryOptions());

  // ✅ Handle the actual router return type (success/error wrapper)
  const tasksOverview = data?.success ? data.data : null;
  const hasError = !!error || (data && !data.success);
  const errorMessage = error?.message || 
    (data && !data.success ? data.error : null);

  return {
    // Data - all properly typed by tRPC
    tasksOverview,
    isLoading,
    isRefetching,
    
    // Error handling
    hasError,
    errorMessage,
    
    // Actions
    refetch,
    
    // Computed values - TypeScript knows tasksOverview structure
    totalTasks: tasksOverview?.totalTasks ?? 0,
    totalLists: tasksOverview?.totalLists ?? 0,
    totalCompleted: tasksOverview?.totalCompleted ?? 0,
    totalPending: tasksOverview?.totalPending ?? 0,
    totalOverdue: tasksOverview?.totalOverdue ?? 0,
    syncSuccess: tasksOverview?.syncSuccess ?? false,
    lastSyncTime: tasksOverview?.lastSyncTime,
    
    // Helper functions with proper typing
    getTaskListById: (id: string): TaskListWithTasks | undefined => 
      tasksOverview?.taskLists.find((list: TaskListWithTasks) => list.id === id),
    
    getAllTasks: (): TaskData[] => 
      tasksOverview?.taskLists.flatMap((list: TaskListWithTasks) => list.tasks) ?? [],
      
    getPendingTasks: (): TaskData[] =>
      tasksOverview?.taskLists
        .flatMap((list: TaskListWithTasks) => list.tasks)
        .filter((task: TaskData) => task.status === 'needsAction') ?? [],
        
    getOverdueTasks: (): TaskData[] =>
      tasksOverview?.taskLists
        .flatMap((list: TaskListWithTasks) => list.tasks)
        .filter((task: TaskData) => 
          task.status === 'needsAction' && 
          task.due && 
          new Date(task.due) < new Date()
        ) ?? [],

    // Access to full tRPC response for debugging
    fullResponse: data,
    rawError: error,
  };
};

/**
 * Hook for task CRUD operations using the new tRPC endpoints
 */
export const useTaskMutations = () => {
  const queryClient = useQueryClient();

  // ============================================================================
  // TASK LISTS QUERIES - Following existing pattern
  // ============================================================================

  const {
    data: taskListsData,
    isLoading: taskListsLoading,
    error: taskListsError
  } = useQuery(trpc.tasks.listTaskLists.queryOptions({
    maxResults: 100
  }));

  // ============================================================================
  // TASK MUTATIONS - Using tRPC v11 useMutation pattern
  // ============================================================================

  const createTaskMutation = useMutation(trpc.tasks.createTask.mutationOptions({
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: [['tasks', 'getCompleteOverview']] });
    },
    onError: (error) => {
      // Handle error silently
    }
  }));

  const updateTaskMutation = useMutation(trpc.tasks.updateTask.mutationOptions({
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: [['tasks', 'getCompleteOverview']] });
    },
    onError: (error) => {
      // Handle error silently
    }
  }));

  const deleteTaskMutation = useMutation(trpc.tasks.deleteTask.mutationOptions({
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: [['tasks', 'getCompleteOverview']] });
    },
    onError: (error) => {
      // Handle error silently
    }
  }));

  const createTaskListMutation = useMutation(trpc.tasks.createTaskList.mutationOptions({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['tasks', 'getCompleteOverview']] });
      void queryClient.invalidateQueries({ queryKey: [['tasks', 'listTaskLists']] });
    },
    onError: (error) => {
      // Handle error silently
    }
  }))

  // ============================================================================
  // CONVENIENCE METHODS WITH PROPER ERROR HANDLING
  // ============================================================================

  const createTaskInFirstList = async (title: string, notes?: string, due?: string) => {
    // Extract the actual data from the tRPC response wrapper
    const taskListsResponse = taskListsData?.success ? taskListsData.data : null;
    
    if (!taskListsResponse) {
      throw new Error('No task lists available. Please create a task list first.');
    }

    // For now, we'll need to implement this when we have the proper task lists structure
    throw new Error('Task list creation not yet implemented');
  };

  const markTaskCompleted = async (tasklist: string, task: string) => {
    return updateTaskMutation.mutateAsync({
      tasklist,
      task,
      status: 'completed' as const
    });
  };

  const markTaskIncomplete = async (tasklist: string, task: string) => {
    return updateTaskMutation.mutateAsync({
      tasklist,
      task,
      status: 'needsAction' as const
    });
  };

  return {
    // Task Lists Data - Properly typed
    taskLists: taskListsData?.success ? taskListsData.data : null,
    taskListsLoading,
    taskListsError,
    
    // Task Mutations - Following tRPC v11 pattern
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    createTaskList: createTaskListMutation.mutateAsync,
    
    // Convenience Methods
    createTaskInFirstList,
    markTaskCompleted,
    markTaskIncomplete,
    
    // Loading States
    isCreatingTask: createTaskMutation.isPending,
    isUpdatingTask: updateTaskMutation.isPending,
    isDeletingTask: deleteTaskMutation.isPending,
    isCreatingTaskList: createTaskListMutation.isPending,
    
    // Error States
    createTaskError: createTaskMutation.error,
    updateTaskError: updateTaskMutation.error,
    deleteTaskError: deleteTaskMutation.error,
    createTaskListError: createTaskListMutation.error,
  };
};

/**
 * Hook for getting task statistics with proper typing
 */
export const useTaskStats = () => {
  const { tasksOverview, isLoading } = useTasks();
  
  return {
    isLoading,
    stats: tasksOverview ? {
      completion_rate: tasksOverview.totalTasks > 0 
        ? Math.round((tasksOverview.totalCompleted / tasksOverview.totalTasks) * 100)
        : 0,
      overdue_percentage: tasksOverview.totalTasks > 0
        ? Math.round((tasksOverview.totalOverdue / tasksOverview.totalTasks) * 100)
        : 0,
      lists_count: tasksOverview.totalLists,
      avg_tasks_per_list: tasksOverview.totalLists > 0
        ? Math.round(tasksOverview.totalTasks / tasksOverview.totalLists)
        : 0,
    } : null
  };
}; 