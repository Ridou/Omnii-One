import type { TRPCRouterRecord } from "@trpc/server";
import { protectedProcedure, publicProcedure } from "../trpc";
import { 
  CompleteTaskOverviewSchema, 
  TaskDataSchema, 
  TaskListWithTasksSchema,
  TasksCompleteOverviewResponseSchema
} from "@omnii/validators";
import type { 
  CompleteTaskOverview, 
  TaskData, 
  TaskListWithTasks,
  TasksCompleteOverviewResponse,
  TasksTestResponse
} from "@omnii/validators";

// Interface for OAuth token manager (matching the existing pattern)
interface IOAuthTokenManager {
  getGoogleOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }>;
}

// Simple OAuth manager implementation that uses Supabase directly
class TasksOAuthManager implements IOAuthTokenManager {
  private supabase: any;

  constructor() {
    // Import Supabase client dynamically to avoid circular dependencies
    const { createClient } = require('@supabase/supabase-js');
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async getGoogleOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }> {
    try {
      console.log(`[TasksOAuthManager] Getting OAuth token for user: ${userId}`);

      // Get current token from database
      const { data: tokenData, error } = await this.supabase
        .from("oauth_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userId)
        .eq("provider", "google")
        .single();

      if (error) {
        console.error("[TasksOAuthManager] Error fetching OAuth token:", error);
        throw new Error(`Failed to fetch OAuth token for user ${userId}: ${error.message}`);
      }

      if (!tokenData) {
        throw new Error(`No OAuth token found for user ${userId}`);
      }

      const currentToken = {
        access_token: tokenData.access_token as string,
        refresh_token: tokenData.refresh_token as string,
        expires_at: tokenData.expires_at as string,
      };

      // Check if token needs refresh (within 5 minutes of expiry)
      const shouldRefresh = this.shouldRefreshToken(currentToken.expires_at);

      if (shouldRefresh) {
        console.log('[TasksOAuthManager] Token needs refresh, refreshing...');
        
        if (!currentToken.refresh_token) {
          throw new Error('No refresh token available. User needs to re-authenticate.');
        }

        // Refresh the token
        const refreshedTokenData = await this.refreshToken(currentToken.refresh_token);
        
        // Update token in database
        await this.updateToken(
          userId,
          refreshedTokenData.access_token,
          refreshedTokenData.refresh_token || currentToken.refresh_token,
          refreshedTokenData.expires_in
        );

        // Get updated token from database
        const { data: updatedData, error: updateError } = await this.supabase
          .from("oauth_tokens")
          .select("access_token, refresh_token, expires_at")
          .eq("user_id", userId)
          .eq("provider", "google")
          .single();

        if (updateError || !updatedData) {
          throw new Error('Failed to retrieve updated token');
        }

        return {
          access_token: updatedData.access_token as string,
          refresh_token: updatedData.refresh_token as string,
          expires_at: updatedData.expires_at as string,
        };
      }

      console.log(`[TasksOAuthManager] Using existing valid token for user: ${userId}`);
      return currentToken;
    } catch (error) {
      console.error(`[TasksOAuthManager] OAuth token retrieval failed for user ${userId}:`, error);
      throw error;
    }
  }

  private shouldRefreshToken(expiresAt: string): boolean {
    const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    return (expiryTime - currentTime) <= REFRESH_THRESHOLD_MS;
  }

  private async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    console.log('[TasksOAuthManager] Refreshing Google OAuth token...');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
    }
    
    const tokenData = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    console.log('[TasksOAuthManager] Token refresh successful');
    
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken, // Use existing refresh token if new one not provided
      expires_in: tokenData.expires_in,
    };
  }

  private async updateToken(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
    
    const { error } = await this.supabase
      .from('oauth_tokens')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (error) {
      throw new Error(`Failed to update token: ${error.message}`);
    }
  }
}

// Core tasks service class
class TasksService {
  private oauthManager: IOAuthTokenManager;

  constructor() {
    this.oauthManager = new TasksOAuthManager();
  }

  /**
   * Fetch complete task overview with parallel task fetching
   * This is the extracted core functionality from the TasksPlugin
   */
  async fetchCompleteTaskOverview(userId: string): Promise<CompleteTaskOverview> {
    console.log(`[TasksService] 🚀 Fetching complete task overview for user: ${userId}`);
    
    try {
      // Step 1: Get OAuth token
      const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
      console.log(`[TasksService] ✅ OAuth token retrieved successfully`);

      // Step 2: Get all task lists
      console.log(`[TasksService] 📋 Fetching task lists...`);
      const taskListsResponse = await this.makeGoogleTasksApiCall(
        'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
        oauthToken.access_token
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

      console.log(`[TasksService] 📋 Found ${taskLists.length} task lists, fetching tasks in parallel...`);

      // Step 3: Fetch tasks from all lists in parallel
      const taskListPromises = taskLists.map(async (taskList: any): Promise<TaskListWithTasks> => {
        try {
          console.log(`[TasksService] 🔄 Fetching tasks for list: "${taskList.title}" (${taskList.id})`);
          
          const tasksResponse = await this.makeGoogleTasksApiCall(
            `https://tasks.googleapis.com/tasks/v1/lists/${taskList.id}/tasks?showCompleted=true&maxResults=100`,
            oauthToken.access_token
          );
          
          const tasks = tasksResponse?.items || [];
          console.log(`[TasksService] 📝 Found ${tasks.length} tasks in "${taskList.title}"`);

          // Validate and process tasks with Zod
          const processedTasks = tasks.map((task: any) => {
            const taskResult = TaskDataSchema.safeParse({
              id: task.id,
              title: task.title,
              status: task.status || 'needsAction',
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
              console.warn(`[TasksService] ⚠️ Invalid task data in "${taskList.title}":`, taskResult.error);
              return null;
            }
            
            return taskResult.data;
          }).filter(Boolean) as TaskData[];

          // Calculate statistics
          const completedCount = processedTasks.filter(t => t.status === 'completed').length;
          const pendingCount = processedTasks.filter(t => t.status === 'needsAction').length;
          const now = new Date();
          const overdueCount = processedTasks.filter(t => 
            t.status === 'needsAction' && t.due && new Date(t.due) < now
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
            throw new Error(`TaskListWithTasks validation failed for "${taskList.title}": ${taskListWithTasksResult.error.message}`);
          }

          console.log(`[TasksService] ✅ Successfully processed ${processedTasks.length} tasks from "${taskList.title}"`);
          return taskListWithTasksResult.data;

        } catch (error) {
          console.error(`[TasksService] ❌ Failed to fetch tasks for list "${taskList.title}":`, error);
          
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
            fetchError: error instanceof Error ? error.message : 'Unknown error',
          });

          return errorResult.success ? errorResult.data : {
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
            fetchError: error instanceof Error ? error.message : 'Unknown error',
          } as TaskListWithTasks;
        }
      });

      // Execute all task fetches in parallel
      console.log(`[TasksService] ⚡ Executing ${taskListPromises.length} parallel task fetches...`);
      const taskListsWithTasks = await Promise.all(taskListPromises);

      // Aggregate statistics and build complete overview
      const totalTasks = taskListsWithTasks.reduce((sum, list) => sum + list.taskCount, 0);
      const totalCompleted = taskListsWithTasks.reduce((sum, list) => sum + list.completedCount, 0);
      const totalPending = taskListsWithTasks.reduce((sum, list) => sum + list.pendingCount, 0);
      const totalOverdue = taskListsWithTasks.reduce((sum, list) => sum + list.overdueCount, 0);
      
      // Collect partial failures
      const partialFailures = taskListsWithTasks
        .filter(list => !list.fetchSuccess)
        .map(list => ({
          listId: list.id,
          listTitle: list.title,
          error: list.fetchError || 'Unknown error',
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
        partialFailures: partialFailures.length > 0 ? partialFailures : undefined,
      });

      if (!completeOverviewResult.success) {
        throw new Error(`CompleteTaskOverview validation failed: ${completeOverviewResult.error.message}`);
      }

      console.log(`[TasksService] 🎉 Complete overview ready: ${totalTasks} tasks across ${taskListsWithTasks.length} lists`);
      
      return completeOverviewResult.data;
    } catch (error) {
      console.error(`[TasksService] 💥 Failed to fetch complete task overview:`, error);
      throw error;
    }
  }

  private async makeGoogleTasksApiCall(url: string, accessToken: string): Promise<any> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Tasks API call failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }
}

// Create singleton instance
const tasksService = new TasksService();

export const tasksRouter = {
  getCompleteOverview: protectedProcedure
    .query(async ({ ctx }): Promise<TasksCompleteOverviewResponse> => {
      try {
        const userId = ctx.session.user.id;
        console.log(`[TasksRouter] Getting complete task overview for user: ${userId}`);
        
        const overview = await tasksService.fetchCompleteTaskOverview(userId);
        
        const response: TasksCompleteOverviewResponse = {
          success: true,
          data: overview,
          message: `Retrieved ${overview.totalTasks} tasks across ${overview.totalLists} lists`,
        };
        
        const validation = TasksCompleteOverviewResponseSchema.safeParse(response);
        if (!validation.success) {
          console.error('[TasksRouter] Response validation failed:', validation.error);
        }
        return response;
      } catch (error) {
        console.error(`[TasksRouter] Error fetching complete task overview:`, error);
        
        const errorResponse: TasksCompleteOverviewResponse = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: 'Failed to fetch complete task overview',
        };
        
        return errorResponse;
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
} satisfies TRPCRouterRecord; 