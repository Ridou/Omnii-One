/**
 * Google Tasks Ingestion Service
 *
 * Syncs Google Tasks to the knowledge graph with:
 * - Incremental sync using updatedMin timestamp
 * - Quality gate validation with GoogleTaskSchema
 * - Task stored as Entity nodes with entity_type='task'
 */

import { backOff } from "exponential-backoff";
import { getComposioClient } from "../composio-client";
import { getSyncStateService, type SyncSource } from "../sync-state";
import {
  GoogleTaskSchema,
  GoogleTaskListSchema,
  type GoogleTask,
  validateIngestionData,
} from "../validators";
import { createNode } from "../../graph/operations/crud";
import { NodeLabel, type EntityNode } from "../../graph/schema/nodes";
import type { Neo4jHTTPClient } from "../../services/neo4j/http-client";

const SYNC_SOURCE: SyncSource = "google_tasks";

export interface TasksSyncResult {
  success: boolean;
  tasksProcessed: number;
  tasksCreated: number;
  tasksSkipped: number;
  errors: string[];
  nextUpdatedMin?: string;
}

export class TasksIngestionService {
  private composio = getComposioClient();
  private syncStateService = getSyncStateService();

  async syncTasks(
    userId: string,
    client: Neo4jHTTPClient,
    forceFullSync: boolean = false
  ): Promise<TasksSyncResult> {
    const result: TasksSyncResult = {
      success: false,
      tasksProcessed: 0,
      tasksCreated: 0,
      tasksSkipped: 0,
      errors: [],
    };

    try {
      await this.syncStateService.markSyncStarted(userId, SYNC_SOURCE);

      const syncState = await this.syncStateService.getState(userId, SYNC_SOURCE);
      const updatedMin = forceFullSync ? null : syncState?.updated_min;

      // First, get all task lists
      const taskLists = await this.fetchTaskLists(userId);

      // Then fetch tasks from each list
      for (const list of taskLists) {
        const listValidation = validateIngestionData(GoogleTaskListSchema, list, "tasklist");
        if (!listValidation.success) {
          result.errors.push(...(listValidation as { success: false; errors: string[] }).errors);
          continue;
        }

        const tasks = await this.fetchTasks(userId, listValidation.data.id, updatedMin);

        for (const rawTask of tasks) {
          result.tasksProcessed++;

          const validation = validateIngestionData(GoogleTaskSchema, rawTask, "task");
          if (!validation.success) {
            result.errors.push(...(validation as { success: false; errors: string[] }).errors);
            result.tasksSkipped++;
            continue;
          }

          const task = validation.data;

          // Skip completed tasks older than 30 days
          if (task.status === "completed" && task.completed) {
            const completedDate = new Date(task.completed);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            if (completedDate < thirtyDaysAgo) {
              result.tasksSkipped++;
              continue;
            }
          }

          const created = await this.upsertTaskNode(userId, client, task, listValidation.data.title);
          if (created) result.tasksCreated++;
        }
      }

      // Store current timestamp for next incremental sync
      const newUpdatedMin = new Date().toISOString();
      await this.syncStateService.markSyncCompleted(userId, SYNC_SOURCE, {
        updatedMin: newUpdatedMin,
        itemsSynced: result.tasksCreated,
      });

      result.success = true;
      result.nextUpdatedMin = newUpdatedMin;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.syncStateService.markSyncFailed(userId, SYNC_SOURCE, errorMessage);
      result.errors.push(errorMessage);
    }

    return result;
  }

  private async fetchTaskLists(userId: string): Promise<unknown[]> {
    const entity = this.composio.getEntity(userId);

    const response = await backOff(
      async () =>
        entity.execute({
          actionName: "googletasks_list_tasklists",
          params: { maxResults: 100 },
        }),
      { numOfAttempts: 5, maxDelay: 30000, jitter: "full" }
    );

    return (response.data as { items?: unknown[] })?.items || [];
  }

  private async fetchTasks(
    userId: string,
    taskListId: string,
    updatedMin: string | null
  ): Promise<unknown[]> {
    const entity = this.composio.getEntity(userId);
    const allTasks: unknown[] = [];
    let pageToken: string | undefined;

    do {
      const response = await backOff(
        async () =>
          entity.execute({
            actionName: "googletasks_list_tasks",
            params: {
              tasklist: taskListId,
              maxResults: 100,
              showCompleted: true,
              showHidden: true,
              ...(updatedMin ? { updatedMin } : {}),
              ...(pageToken ? { pageToken } : {}),
            },
          }),
        { numOfAttempts: 5, maxDelay: 30000, jitter: "full" }
      );

      const data = response.data as { items?: unknown[]; nextPageToken?: string };
      if (data.items) allTasks.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);

    return allTasks;
  }

  private async upsertTaskNode(
    _userId: string,
    client: Neo4jHTTPClient,
    task: GoogleTask,
    listTitle: string
  ): Promise<boolean> {
    // Check if task exists
    const existing = await this.findTaskByGoogleId(client, task.id);
    if (existing) return false;

    // Store tasks as Entity nodes with entity_type='task'
    await createNode<EntityNode>(client, NodeLabel.Entity, {
      name: task.title,
      type: "thing", // EntityType
      properties: {
        entity_type: "task",
        google_task_id: task.id,
        source: "google_tasks",
        list_name: listTitle,
        status: task.status,
        due: task.due,
        notes: task.notes,
        completed: task.completed,
      },
    } as Omit<EntityNode, "id" | "createdAt">);

    return true;
  }

  private async findTaskByGoogleId(
    client: Neo4jHTTPClient,
    googleTaskId: string
  ): Promise<EntityNode | null> {
    const cypher = `
      MATCH (e:Entity)
      WHERE e.properties.google_task_id = $googleTaskId
      RETURN properties(e) AS props
      LIMIT 1
    `;
    const result = await client.query(cypher, { googleTaskId });
    return result.data?.values?.[0]?.[0] as EntityNode | null;
  }
}

let _tasksService: TasksIngestionService | null = null;

export function getTasksIngestionService(): TasksIngestionService {
  if (!_tasksService) _tasksService = new TasksIngestionService();
  return _tasksService;
}

export async function ingestTasks(
  userId: string,
  client: Neo4jHTTPClient,
  forceFullSync: boolean = false
): Promise<TasksSyncResult> {
  return getTasksIngestionService().syncTasks(userId, client, forceFullSync);
}
