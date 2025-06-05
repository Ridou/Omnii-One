/**
 * Composio Google Tasks Types
 * 
 * Type definitions for Google Tasks API integration via Composio
 */

/**
 * Task List interface
 */
export interface TaskList {
  id: string;
  title: string;
  selfLink?: string;
  updated?: string;
  etag?: string;
}

/**
 * Task interface
 */
export interface Task {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string; // RFC 3339 timestamp
  completed?: string; // RFC 3339 timestamp
  deleted?: boolean;
  hidden?: boolean;
  position?: string;
  parent?: string;
  selfLink?: string;
  updated?: string;
  etag?: string;
  links?: TaskLink[];
}

/**
 * Task Link interface
 */
export interface TaskLink {
  type: string;
  description?: string;
  link: string;
}

/**
 * Create Task Data interface
 */
export interface CreateTaskData {
  title: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
  parent?: string;
  previous?: string;
}

/**
 * Update Task Data interface
 */
export interface UpdateTaskData {
  title?: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
  completed?: string;
}

/**
 * List Tasks Parameters interface
 */
export interface ListTasksParams {
  maxResults?: number;
  pageToken?: string;
  showCompleted?: boolean;
  showDeleted?: boolean;
  showHidden?: boolean;
  updatedMin?: string;
  completedMax?: string;
  completedMin?: string;
  dueMax?: string;
  dueMin?: string;
}

/**
 * Move Task Parameters interface
 */
export interface MoveTaskParams {
  parent?: string;
  previous?: string;
}

/**
 * Error classes for Google Tasks operations
 */
export class ComposioTasksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComposioTasksError';
  }
}

export class ComposioTasksConnectionError extends ComposioTasksError {
  constructor(message: string, public entityId: string) {
    super(message);
    this.name = 'ComposioTasksConnectionError';
  }
}

export class ComposioTasksRateLimitError extends ComposioTasksError {
  constructor(message: string) {
    super(message);
    this.name = 'ComposioTasksRateLimitError';
  }
}