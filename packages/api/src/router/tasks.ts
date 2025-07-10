import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import type {
  CompleteTaskOverview,
  TaskData,
  TaskListWithTasks,
  TasksCompleteOverviewResponse,
  TasksTestResponse,
} from "@omnii/validators";
import {
  CompleteTaskOverviewSchema,
  TaskDataSchema,
  TaskListWithTasksSchema,
  TasksCompleteOverviewResponseSchema,
} from "@omnii/validators";

import { protectedProcedure, publicProcedure } from "../trpc";
import { BrainCacheService } from "../services/brain-cache.service";

// ============================================================================
// AUTHENTICATION HELPER
// ============================================================================

/**
 * 🔐 Extract User ID from multiple authentication sources
 * Handles both better-auth sessions and Supabase Bearer tokens
 */
const extractUserId = (ctx: any): string => {
  // Try better-auth session first
  if (ctx.session?.user?.id) {
    console.log(`[TasksAuth] ✅ better-auth session: ${ctx.session.user.id}`);
    return ctx.session.user.id;
  }

  // Try Supabase headers
  const userIdHeader = ctx.headers?.get?.('x-user-id') || '';
  const authHeader = ctx.headers?.get?.('authorization') || '';
  
  if (authHeader.startsWith('Bearer ') && userIdHeader) {
    console.log(`[TasksAuth] 🔄 Supabase token for user: ${userIdHeader}`);
    return userIdHeader;
  }

  // Fallback to test user for development
  const testUserId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
  console.log(`[TasksAuth] 🧪 Using test user fallback: ${testUserId}`);
  return testUserId;
};

// ============================================================================
// INPUT VALIDATION SCHEMAS FOR GOOGLE TASKS API ENDPOINTS
// ============================================================================

// Task List Schemas
const TaskListInputSchema = z.object({
  title: z.string().min(1).max(1024, "Title must be 1024 characters or less"),
});

const TaskListUpdateInputSchema = z.object({
  tasklist: z.string().min(1, "Task list ID is required"),
  title: z.string().min(1).max(1024).optional(),
});

const TaskListIdInputSchema = z.object({
  tasklist: z.string().min(1, "Task list ID is required"),
});

const TaskListsListInputSchema = z.object({
  maxResults: z.number().int().min(1).max(1000).optional(),
  pageToken: z.string().optional(),
});

// Task Schemas
const TaskInputSchema = z.object({
  tasklist: z.string().min(1, "Task list ID is required"),
  title: z.string().min(1).max(1024, "Title must be 1024 characters or less"),
  notes: z.string().max(8192).optional(),
  due: z.string().datetime().optional(),
  status: z.enum(['needsAction', 'completed']).optional(),
  parent: z.string().optional(),
  previous: z.string().optional(),
});

const TaskUpdateInputSchema = z.object({
  tasklist: z.string().min(1, "Task list ID is required"),
  task: z.string().min(1, "Task ID is required"),
  title: z.string().min(1).max(1024).optional(),
  notes: z.string().max(8192).optional(),
  due: z.string().datetime().optional(),
  status: z.enum(['needsAction', 'completed']).optional(),
});

const TaskIdInputSchema = z.object({
  tasklist: z.string().min(1, "Task list ID is required"),
  task: z.string().min(1, "Task ID is required"),
});

const TasksListInputSchema = z.object({
  tasklist: z.string().min(1, "Task list ID is required"),
  completedMax: z.string().datetime().optional(),
  completedMin: z.string().datetime().optional(),
  dueMax: z.string().datetime().optional(),
  dueMin: z.string().datetime().optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
  pageToken: z.string().optional(),
  showAssigned: z.boolean().optional(),
  showCompleted: z.boolean().optional(),
  showDeleted: z.boolean().optional(),
  showHidden: z.boolean().optional(),
  updatedMin: z.string().datetime().optional(),
});

const TaskMoveInputSchema = z.object({
  tasklist: z.string().min(1, "Task list ID is required"),
  task: z.string().min(1, "Task ID is required"),
  parent: z.string().optional(),
  previous: z.string().optional(),
  destinationTasklist: z.string().optional(),
});

const TaskClearInputSchema = z.object({
  tasklist: z.string().min(1, "Task list ID is required"),
});

// ============================================================================
// RESPONSE TYPE DEFINITIONS
// ============================================================================

export interface GoogleTasksResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

export interface TasksResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

// ============================================================================
// OAUTH MANAGER
// ============================================================================

interface IOAuthTokenManager {
  getGoogleOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }>;
}

export class TasksOAuthManager implements IOAuthTokenManager {
  private supabase: any;

  constructor() {
    const { createClient } = require("@supabase/supabase-js");
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async getGoogleOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }> {
    try {
      console.log(`[TasksOAuthManager] Getting OAuth token for user: ${userId}`);

      const { data: tokenData, error } = await this.supabase
        .from("oauth_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userId)
        .eq("provider", "google")
        .single();

      if (error || !tokenData) {
        throw new Error(`No OAuth token found for user ${userId}: ${error?.message ?? 'Token not found'}`);
      }

      const currentToken = {
        access_token: tokenData.access_token as string,
        refresh_token: tokenData.refresh_token as string,
        expires_at: tokenData.expires_at as string,
      };

      // Check if token needs refresh (same logic as contacts)
      const shouldRefresh = this.shouldRefreshToken(currentToken.expires_at);

      if (shouldRefresh && currentToken.refresh_token) {
        console.log("[TasksOAuthManager] Token needs refresh, refreshing...");
        const refreshedTokenData = await this.refreshToken(currentToken.refresh_token);
        await this.updateToken(userId, refreshedTokenData.access_token, refreshedTokenData.refresh_token || currentToken.refresh_token, refreshedTokenData.expires_in);
        
        // Get updated token
        const { data: updatedData } = await this.supabase
          .from("oauth_tokens")
          .select("access_token, refresh_token, expires_at")
          .eq("user_id", userId)
          .eq("provider", "google")
          .single();

        return {
          access_token: updatedData.access_token as string,
          refresh_token: updatedData.refresh_token as string,
          expires_at: updatedData.expires_at as string,
        };
      }

      return currentToken;
    } catch (error) {
      console.error(`[TasksOAuthManager] OAuth token retrieval failed:`, error);
      throw error;
    }
  }

  private shouldRefreshToken(expiresAt: string): boolean {
    const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    return expiryTime - currentTime <= REFRESH_THRESHOLD_MS;
  }

  private async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number; }> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
    }

    return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; }>;
  }

  private async updateToken(userId: string, accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error } = await this.supabase
      .from("oauth_tokens")
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "google");

    if (error) {
      throw new Error(`Failed to update token: ${error.message}`);
    }
  }
}

// Core tasks service class
class TasksService {
  private oauthManager: TasksOAuthManager;

  constructor() {
    this.oauthManager = new TasksOAuthManager();
  }

  // ============================================================================
  // TASK LISTS METHODS
  // ============================================================================

  /**
   * List all task lists
   */
  async listTaskLists(
    userId: string,
    params: z.infer<typeof TaskListsListInputSchema> = {}
  ): Promise<any> {
    console.log(`[TasksService] 📋 Listing task lists for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const queryParams = new URLSearchParams();
    
    if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString());
    if (params.pageToken) queryParams.append('pageToken', params.pageToken);
    
    const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    return this.makeGoogleTasksApiCall(url, oauthToken.access_token);
  }

  /**
   * Get a specific task list
   */
  async getTaskList(
    userId: string,
    params: z.infer<typeof TaskListIdInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] 📋 Getting task list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${params.tasklist}`;
    
    return this.makeGoogleTasksApiCall(url, oauthToken.access_token);
  }

  /**
   * Create a new task list
   */
  async createTaskList(
    userId: string,
    params: z.infer<typeof TaskListInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] ➕ Creating task list for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists`;
    
    return this.makeGoogleTasksApiCall(
      url,
      oauthToken.access_token,
      'POST',
      params
    );
  }

  /**
   * Update a task list
   */
  async updateTaskList(
    userId: string,
    params: z.infer<typeof TaskListUpdateInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] ✏️ Updating task list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${params.tasklist}`;
    
    const { tasklist, ...updateData } = params;
    
    return this.makeGoogleTasksApiCall(
      url,
      oauthToken.access_token,
      'PUT',
      updateData
    );
  }

  /**
   * Delete a task list
   */
  async deleteTaskList(
    userId: string,
    params: z.infer<typeof TaskListIdInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] 🗑️ Deleting task list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${params.tasklist}`;
    
    return this.makeGoogleTasksApiCall(url, oauthToken.access_token, 'DELETE');
  }

  // ============================================================================
  // TASKS METHODS
  // ============================================================================

  /**
   * List tasks in a task list
   */
  async listTasks(
    userId: string,
    params: z.infer<typeof TasksListInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] 📝 Listing tasks in list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const queryParams = new URLSearchParams();
    
    if (params.completedMax) queryParams.append('completedMax', params.completedMax);
    if (params.completedMin) queryParams.append('completedMin', params.completedMin);
    if (params.dueMax) queryParams.append('dueMax', params.dueMax);
    if (params.dueMin) queryParams.append('dueMin', params.dueMin);
    if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString());
    if (params.pageToken) queryParams.append('pageToken', params.pageToken);
    if (params.showAssigned !== undefined) queryParams.append('showAssigned', params.showAssigned.toString());
    if (params.showCompleted !== undefined) queryParams.append('showCompleted', params.showCompleted.toString());
    if (params.showDeleted !== undefined) queryParams.append('showDeleted', params.showDeleted.toString());
    if (params.showHidden !== undefined) queryParams.append('showHidden', params.showHidden.toString());
    if (params.updatedMin) queryParams.append('updatedMin', params.updatedMin);
    
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${params.tasklist}/tasks${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    return this.makeGoogleTasksApiCall(url, oauthToken.access_token);
  }

  /**
   * Get a specific task
   */
  async getTask(
    userId: string,
    params: z.infer<typeof TaskIdInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] 📝 Getting task ${params.task} from list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${params.tasklist}/tasks/${params.task}`;
    
    return this.makeGoogleTasksApiCall(url, oauthToken.access_token);
  }

  /**
   * Create a new task
   */
  async createTask(
    userId: string,
    params: z.infer<typeof TaskInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] ➕ Creating task in list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const queryParams = new URLSearchParams();
    
    if (params.parent) queryParams.append('parent', params.parent);
    if (params.previous) queryParams.append('previous', params.previous);
    
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${params.tasklist}/tasks${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const { tasklist, parent, previous, ...taskData } = params;
    
    return this.makeGoogleTasksApiCall(
      url,
      oauthToken.access_token,
      'POST',
      taskData
    );
  }

  /**
   * Update a task
   */
  async updateTask(
    userId: string,
    params: z.infer<typeof TaskUpdateInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] ✏️ Updating task ${params.task} in list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${params.tasklist}/tasks/${params.task}`;
    
    const { tasklist, task, ...updateData } = params;
    
    return this.makeGoogleTasksApiCall(
      url,
      oauthToken.access_token,
      'PUT',
      updateData
    );
  }

  /**
   * Delete a task
   */
  async deleteTask(
    userId: string,
    params: z.infer<typeof TaskIdInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] 🗑️ Deleting task ${params.task} from list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${params.tasklist}/tasks/${params.task}`;
    
    return this.makeGoogleTasksApiCall(url, oauthToken.access_token, 'DELETE');
  }

  /**
   * Move a task
   */
  async moveTask(
    userId: string,
    params: z.infer<typeof TaskMoveInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] 🔄 Moving task ${params.task} in list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const queryParams = new URLSearchParams();
    
    if (params.parent) queryParams.append('parent', params.parent);
    if (params.previous) queryParams.append('previous', params.previous);
    if (params.destinationTasklist) queryParams.append('destinationTasklist', params.destinationTasklist);
    
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${params.tasklist}/tasks/${params.task}/move${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    return this.makeGoogleTasksApiCall(url, oauthToken.access_token, 'POST');
  }

  /**
   * Clear completed tasks
   */
  async clearCompletedTasks(
    userId: string,
    params: z.infer<typeof TaskClearInputSchema>
  ): Promise<any> {
    console.log(`[TasksService] 🧹 Clearing completed tasks in list ${params.tasklist} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${params.tasklist}/clear`;
    
    return this.makeGoogleTasksApiCall(url, oauthToken.access_token, 'POST');
  }

  /**
   * Fetch complete task overview with parallel task fetching
   * This is the extracted core functionality from the TasksPlugin
   */
  async fetchCompleteTaskOverview(
    userId: string,
  ): Promise<CompleteTaskOverview> {
    console.log(
      `[TasksService] 🚀 Fetching complete task overview for user: ${userId}`,
    );

    try {
      // 🧠 Brain Cache Integration - Step 1: Check cache first
      const brainCache = new BrainCacheService();
      const cachedData = await brainCache.getCachedData(userId, 'google_tasks');
      
      if (cachedData && !brainCache.isExpired(cachedData)) {
        console.log(`[TasksService] 🎯 Cache HIT - returning cached tasks overview`);
        return cachedData.data as CompleteTaskOverview;
      }

      console.log(`[TasksService] 📭 Cache MISS - fetching fresh data from Google Tasks API`);

      // Step 2: Get OAuth token (cache miss - need to fetch fresh data)
      const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
      console.log(`[TasksService] ✅ OAuth token retrieved successfully`);

      // Step 2: Get all task lists
      console.log(`[TasksService] 📋 Fetching task lists...`);
      const taskListsResponse = await this.makeGoogleTasksApiCall(
        "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
        oauthToken.access_token,
      );

      const taskLists = taskListsResponse?.items || [];

      if (!Array.isArray(taskLists) || taskLists.length === 0) {
        console.log(`[TasksService] ⚠️ No task lists found`);
        return {
          taskLists: [],
          totalLists: 0,
          totalTasks: 0,
          totalCompleted: 0,
          totalPending: 0,
          totalOverdue: 0,
          lastSyncTime: new Date().toISOString(),
          syncSuccess: true,
        };
      }

      console.log(
        `[TasksService] 📋 Found ${taskLists.length} task lists, fetching tasks in parallel...`,
      );

      // Step 3: Fetch tasks from all lists in parallel
      const taskListPromises = taskLists.map(
        async (taskList: any): Promise<TaskListWithTasks> => {
          try {
            console.log(
              `[TasksService] 🔄 Fetching tasks for list: "${taskList.title}" (${taskList.id})`,
            );

            // ✅ Request ALL tasks with high maxResults (instead of default 100)
            // This ensures ActionPlanner gets complete task list for accurate context  
            const tasksResponse = await this.makeGoogleTasksApiCall(
              `https://tasks.googleapis.com/tasks/v1/lists/${taskList.id}/tasks?showCompleted=true&maxResults=1000`,
              oauthToken.access_token,
            );

            const tasks = tasksResponse?.items || [];
            console.log(
              `[TasksService] 📝 Found ${tasks.length} tasks in "${taskList.title}"`,
            );

            // Validate and process tasks with Zod
            const processedTasks = tasks
              .map((task: any) => {
                const taskResult = TaskDataSchema.safeParse({
                  id: task.id,
                  title: task.title,
                  status: task.status || "needsAction",
                  notes: task.notes,
                  due: task.due,
                  completed: task.completed,
                  updated: task.updated,
                  parent: task.parent,
                  position: task.position,
                  selfLink: task.selfLink,
                  etag: task.etag,
                  kind: task.kind,
                  links: task.links,
                });

                if (!taskResult.success) {
                  console.warn(
                    `[TasksService] ⚠️ Invalid task data in "${taskList.title}":`,
                    taskResult.error,
                  );
                  return null;
                }

                return taskResult.data;
              })
              .filter(Boolean) as TaskData[];

            // Calculate statistics
            const completedCount = processedTasks.filter(
              (t) => t.status === "completed",
            ).length;
            const pendingCount = processedTasks.filter(
              (t) => t.status === "needsAction",
            ).length;
            const now = new Date();
            const overdueCount = processedTasks.filter(
              (t) =>
                t.status === "needsAction" && t.due && new Date(t.due) < now,
            ).length;

            // Validate the complete TaskListWithTasks object
            const taskListWithTasksResult = TaskListWithTasksSchema.safeParse({
              id: taskList.id,
              title: taskList.title,
              updated: taskList.updated,
              selfLink: taskList.selfLink,
              etag: taskList.etag,
              kind: taskList.kind,
              tasks: processedTasks,
              taskCount: processedTasks.length,
              completedCount,
              pendingCount,
              overdueCount,
              lastFetched: new Date().toISOString(),
              fetchSuccess: true,
            });

            if (!taskListWithTasksResult.success) {
              throw new Error(
                `TaskListWithTasks validation failed for "${taskList.title}": ${taskListWithTasksResult.error.message}`,
              );
            }

            console.log(
              `[TasksService] ✅ Successfully processed ${processedTasks.length} tasks from "${taskList.title}"`,
            );
            return taskListWithTasksResult.data;
          } catch (error) {
            console.error(
              `[TasksService] ❌ Failed to fetch tasks for list "${taskList.title}":`,
              error,
            );

            // Return error case with Zod validation
            const errorResult = TaskListWithTasksSchema.safeParse({
              id: taskList.id,
              title: taskList.title,
              updated: taskList.updated,
              selfLink: taskList.selfLink,
              etag: taskList.etag,
              kind: taskList.kind,
              tasks: [],
              taskCount: 0,
              completedCount: 0,
              pendingCount: 0,
              overdueCount: 0,
              lastFetched: new Date().toISOString(),
              fetchSuccess: false,
              fetchError:
                error instanceof Error ? error.message : "Unknown error",
            });

            return errorResult.success
              ? errorResult.data
              : ({
                  id: taskList.id,
                  title: taskList.title,
                  updated: taskList.updated,
                  selfLink: taskList.selfLink,
                  etag: taskList.etag,
                  kind: taskList.kind,
                  tasks: [],
                  taskCount: 0,
                  completedCount: 0,
                  pendingCount: 0,
                  overdueCount: 0,
                  lastFetched: new Date().toISOString(),
                  fetchSuccess: false,
                  fetchError:
                    error instanceof Error ? error.message : "Unknown error",
                } as TaskListWithTasks);
          }
        },
      );

      // Execute all task fetches in parallel
      console.log(
        `[TasksService] ⚡ Executing ${taskListPromises.length} parallel task fetches...`,
      );
      const taskListsWithTasks = await Promise.all(taskListPromises);

      // Aggregate statistics and build complete overview
      const totalTasks = taskListsWithTasks.reduce(
        (sum: number, list: any) => sum + list.taskCount,
        0,
      );
      const totalCompleted = taskListsWithTasks.reduce(
        (sum: number, list: any) => sum + list.completedCount,
        0,
      );
      const totalPending = taskListsWithTasks.reduce(
        (sum: number, list: any) => sum + list.pendingCount,
        0,
      );
      const totalOverdue = taskListsWithTasks.reduce(
        (sum: number, list: any) => sum + list.overdueCount,
        0,
      );

      // Collect partial failures
      const partialFailures = taskListsWithTasks
        .filter((list: any) => !list.fetchSuccess)
        .map((list: any) => ({
          listId: list.id,
          listTitle: list.title,
          error: list.fetchError || "Unknown error",
        }));

      // Validate the complete overview with Zod
      const completeOverviewResult = CompleteTaskOverviewSchema.safeParse({
        taskLists: taskListsWithTasks,
        totalLists: taskListsWithTasks.length,
        totalTasks,
        totalCompleted,
        totalPending,
        totalOverdue,
        lastSyncTime: new Date().toISOString(),
        syncSuccess: partialFailures.length === 0,
        partialFailures:
          partialFailures.length > 0 ? partialFailures : undefined,
      });

      if (!completeOverviewResult.success) {
        throw new Error(
          `CompleteTaskOverview validation failed: ${completeOverviewResult.error.message}`,
        );
      }

      console.log(
        `[TasksService] 🎉 Complete overview ready: ${totalTasks} tasks across ${taskListsWithTasks.length} lists`,
      );

      // 🧠 Brain Cache Integration - Step 3: Store fresh data in cache
      try {
        const brainCache = new BrainCacheService();
        await brainCache.setCachedData(userId, 'google_tasks', completeOverviewResult.data);
        console.log(`[TasksService] 💾 Fresh data cached for future requests`);
      } catch (cacheError) {
        console.warn(`[TasksService] ⚠️ Failed to cache data (non-critical):`, cacheError);
        // Don't throw - cache failure shouldn't break the main functionality
      }

      return completeOverviewResult.data;
    } catch (error) {
      console.error(
        `[TasksService] 💥 Failed to fetch complete task overview:`,
        error,
      );
      
      // 🧠 Brain Cache Integration - Fallback to stale cache on error
      try {
        const brainCache = new BrainCacheService();
        const staleCache = await brainCache.getCachedData(userId, 'google_tasks');
        if (staleCache) {
          console.log(`[TasksService] 🔄 Returning stale cache due to API error`);
          return staleCache.data as CompleteTaskOverview;
        }
      } catch (fallbackError) {
        console.warn(`[TasksService] ⚠️ Stale cache fallback failed:`, fallbackError);
      }
      
      throw error;
    }
  }

  private async makeGoogleTasksApiCall(
    url: string,
    accessToken: string,
    method: string = 'GET',
    body?: any
  ): Promise<any> {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Tasks API call failed: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }
}

// Create singleton instance
const tasksService = new TasksService();

export const tasksRouter = {
  // ============================================================================
  // EXISTING ENDPOINTS
  // ============================================================================
  
  getCompleteOverview: publicProcedure
    .query(async ({ ctx }): Promise<TasksResponse<CompleteTaskOverview>> => {
      try {
        // Get user ID from headers (mobile app compatibility) - same pattern as email router
        const userIdHeader = ctx.headers?.get?.('x-user-id') || '';
        
        // Try session first, fallback to headers, then test user
        const userId = ctx.session?.user?.id || 
                      userIdHeader || 
                      'cd9bdc60-35af-4bb6-b87e-1932e96fb354'; // Test user fallback
        
        console.log(`[TasksRouter] Getting tasks for user: ${userId} (source: ${
          ctx.session?.user?.id ? 'session' : userIdHeader ? 'header' : 'fallback'
        })`);

        const result = await tasksService.fetchCompleteTaskOverview(userId);

        return {
          success: true,
          data: result,
          message: `Retrieved task overview with ${result.taskLists.length} task lists`,
        };
      } catch (error) {
        console.error(`[TasksRouter] Error getting complete overview:`, error);

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to get complete task overview",
        };
      }
    }),

  test: publicProcedure.query(({ ctx }): TasksTestResponse => {
    console.log("[TasksRouter] Testing public procedure", ctx);

    const response: TasksTestResponse = {
      success: true,
      data: "Hello, world!",
    };

    return response;
  }),

  // ============================================================================
  // TASK LISTS ENDPOINTS
  // ============================================================================

  listTaskLists: protectedProcedure
    .input(TaskListsListInputSchema)
    .query(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        const data = await tasksService.listTaskLists(userId, input);
        
        return {
          success: true,
          data,
          message: `Retrieved ${data.items?.length || 0} task lists`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to list task lists",
        };
      }
    }),

  getTaskList: protectedProcedure
    .input(TaskListIdInputSchema)
    .query(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        const data = await tasksService.getTaskList(userId, input);
        
        return {
          success: true,
          data,
          message: `Retrieved task list: ${data.title}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to get task list",
        };
      }
    }),

  createTaskList: protectedProcedure
    .input(TaskListInputSchema)
    .mutation(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        const data = await tasksService.createTaskList(userId, input);
        
        return {
          success: true,
          data,
          message: `Created task list: ${data.title}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to create task list",
        };
      }
    }),

  updateTaskList: protectedProcedure
    .input(TaskListUpdateInputSchema)
    .mutation(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        const data = await tasksService.updateTaskList(userId, input);
        
        return {
          success: true,
          data,
          message: `Updated task list: ${data.title}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to update task list",
        };
      }
    }),

  deleteTaskList: protectedProcedure
    .input(TaskListIdInputSchema)
    .mutation(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        await tasksService.deleteTaskList(userId, input);
        
        return {
          success: true,
          message: "Task list deleted successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to delete task list",
        };
      }
    }),

  // ============================================================================
  // TASKS ENDPOINTS
  // ============================================================================

  listTasks: protectedProcedure
    .input(TasksListInputSchema)
    .query(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        const data = await tasksService.listTasks(userId, input);
        
        return {
          success: true,
          data,
          message: `Retrieved ${data.items?.length || 0} tasks`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to list tasks",
        };
      }
    }),

  getTask: protectedProcedure
    .input(TaskIdInputSchema)
    .query(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        const data = await tasksService.getTask(userId, input);
        
        return {
          success: true,
          data,
          message: `Retrieved task: ${data.title}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to get task",
        };
      }
    }),

  createTask: protectedProcedure
    .input(TaskInputSchema)
    .mutation(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        const data = await tasksService.createTask(userId, input);
        
        return {
          success: true,
          data,
          message: `Created task: ${data.title}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to create task",
        };
      }
    }),

  updateTask: protectedProcedure
    .input(TaskUpdateInputSchema)
    .mutation(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        const data = await tasksService.updateTask(userId, input);
        
        return {
          success: true,
          data,
          message: `Updated task: ${data.title}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to update task",
        };
      }
    }),

  deleteTask: protectedProcedure
    .input(TaskIdInputSchema)
    .mutation(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        await tasksService.deleteTask(userId, input);
        
        return {
          success: true,
          message: "Task deleted successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to delete task",
        };
      }
    }),

  moveTask: protectedProcedure
    .input(TaskMoveInputSchema)
    .mutation(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        const data = await tasksService.moveTask(userId, input);
        
        return {
          success: true,
          data,
          message: "Task moved successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to move task",
        };
      }
    }),

  clearCompletedTasks: protectedProcedure
    .input(TaskClearInputSchema)
    .mutation(async ({ ctx, input }): Promise<GoogleTasksResponse> => {
      try {
        const userId = ctx.session.user.id;
        await tasksService.clearCompletedTasks(userId, input);
        
        return {
          success: true,
          message: "Completed tasks cleared successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to clear completed tasks",
        };
      }
    }),

} satisfies TRPCRouterRecord;
