import { EnhancedApprovalWorkflowManager } from "./enhanced-approval-workflow-manager";
import { redisCache } from "./redis-cache";

/**
 * WorkflowScheduler handles periodic maintenance and cleanup operations
 * for the enhanced approval workflow system
 */
export class WorkflowScheduler {
  private maintenanceInterval?: NodeJS.Timer;
  private metricsInterval?: NodeJS.Timer;
  private isRunning = false;

  constructor(
    private enhancedWorkflowManager: EnhancedApprovalWorkflowManager,
    private config: {
      maintenanceIntervalMs: number; // How often to run maintenance
      metricsIntervalMs: number; // How often to collect metrics
      enableAutoCleanup: boolean; // Auto cleanup expired workflows
    } = {
      maintenanceIntervalMs: 60 * 60 * 1000, // 1 hour
      metricsIntervalMs: 15 * 60 * 1000, // 15 minutes
      enableAutoCleanup: true,
    }
  ) {}

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log("[WorkflowScheduler] Already running");
      return;
    }

    console.log("[WorkflowScheduler] Starting scheduler...");
    this.isRunning = true;

    // Start maintenance interval
    this.maintenanceInterval = setInterval(async () => {
      await this.runMaintenance();
    }, this.config.maintenanceIntervalMs);

    // Start metrics collection interval
    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.metricsIntervalMs);

    console.log("[WorkflowScheduler] Scheduler started");
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("[WorkflowScheduler] Not running");
      return;
    }

    console.log("[WorkflowScheduler] Stopping scheduler...");

    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = undefined;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    this.isRunning = false;
    console.log("[WorkflowScheduler] Scheduler stopped");
  }

  /**
   * Run maintenance tasks
   */
  private async runMaintenance(): Promise<void> {
    try {
      console.log("[WorkflowScheduler] Running maintenance tasks...");

      const startTime = Date.now();

      // Run enhanced workflow manager maintenance
      await this.enhancedWorkflowManager.performMaintenance();

      // Additional scheduler-specific maintenance
      if (this.config.enableAutoCleanup) {
        await this.cleanupExpiredWorkflows();
        await this.cleanupOrphanedTimeouts();
        await this.optimizeRedisKeys();
      }

      const duration = Date.now() - startTime;
      console.log(`[WorkflowScheduler] Maintenance completed in ${duration}ms`);
    } catch (error) {
      console.error("[WorkflowScheduler] Maintenance failed:", error);
    }
  }

  /**
   * Collect performance and usage metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      console.log("[WorkflowScheduler] Collecting metrics...");

      const metrics = {
        timestamp: Date.now(),
        activeWorkflows: await this.countActiveWorkflows(),
        completedWorkflows: await this.countCompletedWorkflows(),
        failedWorkflows: await this.countFailedWorkflows(),
        avgWorkflowComplexity: await this.calculateAverageComplexity(),
        redisMemoryUsage: await this.getRedisMemoryUsage(),
        timeoutEvents: await this.countTimeoutEvents(),
      };

      // Store metrics for analysis
      await this.storeMetrics(metrics);

      console.log(`[WorkflowScheduler] Metrics collected:`, {
        active: metrics.activeWorkflows,
        completed: metrics.completedWorkflows,
        failed: metrics.failedWorkflows,
        memory: `${Math.round(metrics.redisMemoryUsage / 1024 / 1024)}MB`,
      });
    } catch (error) {
      console.error("[WorkflowScheduler] Metrics collection failed:", error);
    }
  }

  /**
   * Clean up expired workflows that are no longer needed
   */
  private async cleanupExpiredWorkflows(): Promise<void> {
    try {
      // Get all workflow keys
      const workflowKeys = await this.getAllWorkflowKeys();

      let cleanedCount = 0;
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago

      for (const key of workflowKeys) {
        try {
          const workflow = await redisCache.get(key);
          if (!workflow) continue;

          // Check if workflow is old and completed/failed
          if (
            workflow.createdAt < cutoffTime &&
            (workflow.approvalStatus === "completed" ||
              workflow.approvalStatus === "failed" ||
              workflow.approvalStatus === "user_cancelled")
          ) {
            await redisCache.del(key);
            cleanedCount++;
          }
        } catch (error) {
          console.warn(
            `[WorkflowScheduler] Failed to process workflow key ${key}:`,
            error
          );
        }
      }

      if (cleanedCount > 0) {
        console.log(
          `[WorkflowScheduler] Cleaned up ${cleanedCount} expired workflows`
        );
      }
    } catch (error) {
      console.error("[WorkflowScheduler] Workflow cleanup failed:", error);
    }
  }

  /**
   * Clean up orphaned timeout entries
   */
  private async cleanupOrphanedTimeouts(): Promise<void> {
    try {
      // Implementation would scan for timeout keys that no longer have corresponding workflows
      console.log("[WorkflowScheduler] Cleaning up orphaned timeouts...");

      // This is a placeholder - actual implementation would:
      // 1. Get all timeout keys from Redis
      // 2. Check if corresponding workflow still exists
      // 3. Delete orphaned timeout keys
    } catch (error) {
      console.error("[WorkflowScheduler] Timeout cleanup failed:", error);
    }
  }

  /**
   * Optimize Redis key organization and memory usage
   */
  private async optimizeRedisKeys(): Promise<void> {
    try {
      console.log("[WorkflowScheduler] Optimizing Redis keys...");

      // Implementation would:
      // 1. Compress large workflow objects
      // 2. Move old data to secondary storage
      // 3. Optimize key naming patterns
      // 4. Update TTL on keys as needed
    } catch (error) {
      console.error("[WorkflowScheduler] Redis optimization failed:", error);
    }
  }

  /**
   * Count active workflows across all users
   */
  private async countActiveWorkflows(): Promise<number> {
    try {
      // This would scan Redis for all active workflow keys
      const workflowKeys = await this.getAllWorkflowKeys();
      let activeCount = 0;

      for (const key of workflowKeys) {
        const workflow = await redisCache.get(key);
        if (
          workflow &&
          ["draft_pending", "step_approved"].includes(workflow.approvalStatus)
        ) {
          activeCount++;
        }
      }

      return activeCount;
    } catch (error) {
      console.error(
        "[WorkflowScheduler] Failed to count active workflows:",
        error
      );
      return 0;
    }
  }

  /**
   * Count completed workflows
   */
  private async countCompletedWorkflows(): Promise<number> {
    try {
      const workflowKeys = await this.getAllWorkflowKeys();
      let completedCount = 0;

      for (const key of workflowKeys) {
        const workflow = await redisCache.get(key);
        if (workflow && workflow.approvalStatus === "completed") {
          completedCount++;
        }
      }

      return completedCount;
    } catch (error) {
      console.error(
        "[WorkflowScheduler] Failed to count completed workflows:",
        error
      );
      return 0;
    }
  }

  /**
   * Count failed workflows
   */
  private async countFailedWorkflows(): Promise<number> {
    try {
      const workflowKeys = await this.getAllWorkflowKeys();
      let failedCount = 0;

      for (const key of workflowKeys) {
        const workflow = await redisCache.get(key);
        if (
          workflow &&
          ["failed", "timeout_expired", "error_recovery"].includes(
            workflow.approvalStatus
          )
        ) {
          failedCount++;
        }
      }

      return failedCount;
    } catch (error) {
      console.error(
        "[WorkflowScheduler] Failed to count failed workflows:",
        error
      );
      return 0;
    }
  }

  /**
   * Calculate average workflow complexity
   */
  private async calculateAverageComplexity(): Promise<number> {
    try {
      const workflowKeys = await this.getAllWorkflowKeys();
      let totalComplexity = 0;
      let count = 0;

      for (const key of workflowKeys) {
        const workflow = await redisCache.get(key);
        if (workflow && workflow.performance?.complexity) {
          totalComplexity += workflow.performance.complexity;
          count++;
        }
      }

      return count > 0 ? totalComplexity / count : 0;
    } catch (error) {
      console.error(
        "[WorkflowScheduler] Failed to calculate average complexity:",
        error
      );
      return 0;
    }
  }

  /**
   * Get Redis memory usage (approximate)
   */
  private async getRedisMemoryUsage(): Promise<number> {
    try {
      // This would use Redis MEMORY USAGE command or similar
      // For now, return estimated usage
      const workflowKeys = await this.getAllWorkflowKeys();
      return workflowKeys.length * 2048; // Estimate 2KB per workflow
    } catch (error) {
      console.error(
        "[WorkflowScheduler] Failed to get Redis memory usage:",
        error
      );
      return 0;
    }
  }

  /**
   * Count timeout events in recent period
   */
  private async countTimeoutEvents(): Promise<number> {
    try {
      // This would check timeout event logs or metrics
      // Placeholder implementation
      return 0;
    } catch (error) {
      console.error(
        "[WorkflowScheduler] Failed to count timeout events:",
        error
      );
      return 0;
    }
  }

  /**
   * Store metrics for analysis
   */
  private async storeMetrics(metrics: any): Promise<void> {
    try {
      const metricsKey = `system:metrics:${Math.floor(
        Date.now() / (60 * 60 * 1000)
      )}`; // Hourly metrics
      await redisCache.set(metricsKey, metrics, 7 * 24 * 60 * 60); // Keep for 7 days
    } catch (error) {
      console.error("[WorkflowScheduler] Failed to store metrics:", error);
    }
  }

  /**
   * Get all workflow keys from Redis
   */
  private async getAllWorkflowKeys(): Promise<string[]> {
    try {
      // This would use Redis SCAN command to get all workflow keys
      // Placeholder implementation - actual implementation would scan Redis
      return [];
    } catch (error) {
      console.error("[WorkflowScheduler] Failed to get workflow keys:", error);
      return [];
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    maintenanceInterval: number;
    metricsInterval: number;
    nextMaintenance?: number;
    nextMetrics?: number;
  } {
    return {
      isRunning: this.isRunning,
      maintenanceInterval: this.config.maintenanceIntervalMs,
      metricsInterval: this.config.metricsIntervalMs,
    };
  }

  /**
   * Manual maintenance trigger (for testing/debugging)
   */
  async triggerMaintenance(): Promise<void> {
    console.log("[WorkflowScheduler] Manual maintenance triggered");
    await this.runMaintenance();
  }

  /**
   * Manual metrics collection trigger
   */
  async triggerMetricsCollection(): Promise<void> {
    console.log("[WorkflowScheduler] Manual metrics collection triggered");
    await this.collectMetrics();
  }
}
