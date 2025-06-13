import { OpenAI } from "openai";
import { OpenAIToolSet } from "composio-core";
import {
  GoogleServicePlugin,
  GoogleServiceType,
  IOAuthTokenManager
} from "../google-service-plugin";
import { ExecutionContextType } from "../../types/action-planning.types";
import { GoogleTasksAction } from "../../types/composio-enums";
import {
  UnifiedToolResponse,
  UnifiedResponseBuilder,
} from "@omnii/validators";
import {
  ServiceType,
  TaskData, 
  TaskListData,
  TaskListsData,
  UnifiedAction,
  TaskListWithTasks,
  CompleteTaskOverview,
  TaskListsDataSchema,
  TaskListDataSchema,
  TaskDataSchema,
  TaskListWithTasksSchema,
  CompleteTaskOverviewSchema
} from "@omnii/validators";
import { getObjectStructure } from "../../utils/object-structure";

export class TasksPlugin implements GoogleServicePlugin {
  serviceType = GoogleServiceType.TASKS;
  private manager?: IOAuthTokenManager; // Manager reference for OAuth token access

  /**
   * Set the manager reference for OAuth token access
   */
  setManager(manager: IOAuthTokenManager): void {
    this.manager = manager;
  }

  /**
   * Detect task-related messages (conservative - only used as AI fallback)
   */
  isServiceMessage(message: string): boolean {
    const msg = message.toLowerCase();
    return (
      msg.startsWith("create task") ||
      msg.startsWith("add task") ||
      msg.startsWith("list tasks") ||
      msg.startsWith("show tasks") ||
      msg.startsWith("complete task") ||
      msg.startsWith("mark task") ||
      msg === "my tasks" ||
      msg === "tasks" ||
      msg === "todo" ||
      msg === "to do"
    );
  }

  /**
   * Process task-specific messages using UnifiedToolResponse with Zod validation
   */
  async processMessage(
    message: string,
    userId: string,
    context: ExecutionContextType,
    activeConnection: any,
    composio: OpenAIToolSet,
    openai: OpenAI
  ): Promise<UnifiedToolResponse> {
    const builder = new UnifiedResponseBuilder(ServiceType.TASK, userId);

    try {
      console.log(`[TasksPlugin] Processing message: "${message}"`);
      console.log(`[TasksPlugin] Using connection: ${activeConnection?.id}`);

      // ✅ NEW: Intelligent strategy selection
      const shouldUseCompleteOverview = this.shouldUseCompleteOverviewStrategy(message);
      
      if (shouldUseCompleteOverview) {
        console.log(`[TasksPlugin] 🎯 USING COMPLETE OVERVIEW STRATEGY`);
        return await this.processCompleteOverviewRequest(message, userId, composio, openai, builder);
      } else {
        console.log(`[TasksPlugin] 📋 USING INDIVIDUAL API STRATEGY`);
        return await this.processIndividualTaskRequest(message, userId, composio, openai, builder);
      }

    } catch (error) {
      console.error(`[TasksPlugin] Error processing message:`, error);
      return builder
        .setSuccess(false)
        .setTitle("Tasks Error")
        .setContent("Sorry, I had trouble with your task request.")
        .setMessage(error instanceof Error ? error.message : "Unknown error")
        .build();
    }
  }

  /**
   * ✅ NEW: Determine if message should use complete overview strategy
   */
  private shouldUseCompleteOverviewStrategy(message: string): boolean {
    const msg = message.toLowerCase();
    
    // Keywords that indicate user wants comprehensive overview
    const overviewKeywords = [
      'all tasks', 'all my tasks', 'task overview', 'task summary',
      'everything', 'complete', 'full', 'overview', 'summary',
      'show tasks', 'list tasks', 'my tasks', 'tasks', 'todo',
      'what tasks', 'check tasks', 'view tasks', 'see tasks'
    ];
    
    // Keywords that indicate specific actions (use individual strategy)
    const specificKeywords = [
      'create task', 'add task', 'new task', 'make task',
      'complete task', 'mark task', 'finish task', 'done task',
      'update task', 'edit task', 'change task', 'modify task',
      'delete task', 'remove task', 'cancel task'
    ];
    
    // Check for specific action keywords first
    const hasSpecificKeyword = specificKeywords.some(keyword => msg.includes(keyword));
    if (hasSpecificKeyword) {
      console.log(`[TasksPlugin] Using individual strategy (specific action detected)`);
      return false;
    }
    
    // Check for overview keywords
    const hasOverviewKeyword = overviewKeywords.some(keyword => msg.includes(keyword));
    if (hasOverviewKeyword) {
      console.log(`[TasksPlugin] Using complete overview strategy (overview keyword detected)`);
      return true;
    }
    
    // Default: use complete overview for safety
    console.log(`[TasksPlugin] Using complete overview strategy (default)`);
    return true;
  }

  /**
   * ✅ NEW: Process complete overview requests
   */
  private async processCompleteOverviewRequest(
    message: string,
    userId: string,
    composio: OpenAIToolSet,
    openai: OpenAI,
    builder: UnifiedResponseBuilder
  ): Promise<UnifiedToolResponse> {
    try {
      const completeOverview = await this.fetchCompleteTaskOverview(userId, composio, openai);
      
      // ✅ Validate with Zod
      const validationResult = CompleteTaskOverviewSchema.safeParse(completeOverview);
      if (!validationResult.success) {
        console.error(`[TasksPlugin] ❌ Complete overview validation failed:`, validationResult.error);
        return this.formatErrorResponse(builder, "Invalid complete task overview data structure");
      }

      console.log(`[TasksPlugin] ✅ Complete overview validation successful`);

      // Enhanced actions for complete overview
      const actions: UnifiedAction[] = [
        {
          id: "create_task",
          label: "Create Task",
          type: "primary",
          icon: "➕"
        },
        {
          id: "refresh_overview",
          label: "Refresh",
          type: "secondary",
          icon: "🔄"
        }
      ];

      const { totalTasks, totalCompleted, totalPending, totalOverdue, totalLists } = completeOverview;
      
      // Build rich content description
      let content = `Complete task overview: ${totalTasks} task${totalTasks === 1 ? '' : 's'} across ${totalLists} list${totalLists === 1 ? '' : 's'}`;
      if (totalCompleted > 0) content += `, ${totalCompleted} completed`;
      if (totalPending > 0) content += `, ${totalPending} pending`;
      if (totalOverdue > 0) content += `, ${totalOverdue} overdue ⚠️`;

      const title = totalOverdue > 0 ? "📋 Tasks (Overdue Items!)" : "📋 Complete Task Overview";
      const message = `📋 Complete overview retrieved\n${content}`;

      const result = builder
        .setSuccess(true)
        .setTitle(title)
        .setSubtitle(`${totalTasks} total task${totalTasks === 1 ? '' : 's'}`)
        .setContent(content)
        .setMessage(message)
        .setStructuredData(validationResult.data)
        .setMetadata({ 
          confidence: 95, 
          source: 'Google Tasks'
        });

      actions.forEach(action => result.addAction(action));
      return result.build();

    } catch (error) {
      console.error(`[TasksPlugin] ❌ Complete overview request failed:`, error);
      return this.formatErrorResponse(builder, `Failed to fetch complete task overview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ✅ EXISTING: Process individual task requests (refactored from original logic)
   */
  private async processIndividualTaskRequest(
    message: string,
    userId: string,
    composio: OpenAIToolSet,
    openai: OpenAI,
    builder: UnifiedResponseBuilder
  ): Promise<UnifiedToolResponse> {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
          content: `You are a Google Tasks assistant. Based on the user's message, determine what they want to do and call the appropriate function.

Available actions:
- LIST_TASK_LISTS: Get all task lists (containers for tasks)
- LIST_TASKS: Get tasks within a specific task list
- INSERT_TASK: Create a new task in a task list
- PATCH_TASK: Update/complete a task

For most "list tasks" or "show tasks" requests, use LIST_TASK_LISTS first to show available task lists, then user can drill down into specific lists.

For creating tasks, you'll need a tasklist parameter - use the default task list ID or ask user to specify.`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        tools: await composio.getTools({
          actions: [
            GoogleTasksAction.LIST_TASK_LISTS,
            GoogleTasksAction.LIST_TASKS,
            GoogleTasksAction.INSERT_TASK,
            GoogleTasksAction.PATCH_TASK,
          ],
        }),
        tool_choice: "auto",
      });

      const toolCalls = response.choices[0].message.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
      return builder
        .setSuccess(false)
        .setTitle("Task Request Failed")
        .setContent("I couldn't determine what task action you want to perform.")
        .setMessage("No tool calls in response")
        .build();
      }

      // NEW: Use custom OAuth tokens from Supabase via manager
      let toolResponse: any;
      
      try {
        if (this.manager) {
          console.log(`[TasksPlugin] 🔐 Using custom OAuth tokens from Supabase for user: ${userId}`);
          
          // Get OAuth token from Supabase via the manager
          const oauthToken = await this.manager.getGoogleOAuthToken(userId);
          console.log(`[TasksPlugin] ✅ OAuth token retrieved successfully`);

          // Execute tool calls with custom bearer token
          const toolResponses = [];  
          for (const toolCall of toolCalls) {  
            try {
              console.log(`[TasksPlugin] 🔧 Executing ${toolCall.function.name} with custom auth`);
              
              const result = await composio.client.actions.execute({  
                actionName: toolCall.function.name,  
                requestBody: {  
                  input: JSON.parse(toolCall.function.arguments),  
                  appName: "googletasks",
                  authConfig: {  
                    parameters: [  
                      {  
                        name: "Authorization",  
                        value: `Bearer ${oauthToken.access_token}`,  
                        in: "header"  
                      }  
                    ]  
                  }  
                }  
              });  
              toolResponses.push(JSON.stringify(result));  
            } catch (error) {  
              console.error(`[TasksPlugin] ❌ Error executing tool call ${toolCall.function.name}:`, error);  
              toolResponses.push(JSON.stringify({ 
                error: error instanceof Error ? error.message : 'Unknown error' 
              }));  
            }  
          }
          
          // Use the first response or combine them
          toolResponse = toolResponses.length > 0 ? toolResponses[0] : null;
          
        } else {
          console.log(`[TasksPlugin] ⚠️ No manager available, falling back to standard Composio auth`);
          // Fallback to standard Composio authentication
        }
      } catch (authError) {
        console.error(`[TasksPlugin] ❌ Custom auth failed, falling back to standard Composio auth:`, authError);
        // Fallback to standard Composio authentication
      }

      console.log(`[TasksPlugin] 📋 RAW GOOGLE TASKS API RESPONSE STRUCTURE:`);
      console.log(getObjectStructure(toolResponse));

      // Parse and format the response
      const responseData = Array.isArray(toolResponse)
        ? toolResponse[0]
        : toolResponse;
      let parsedData;
      try {
        parsedData =
          typeof responseData === "string"
            ? JSON.parse(responseData)
            : responseData;
      } catch (e) {
        parsedData = responseData;
      }

      if (parsedData?.error) {
      return builder
        .setSuccess(false)
        .setTitle("Tasks Error")
        .setContent("Failed to complete task operation.")
        .setMessage(parsedData.error)
        .setRawData(parsedData)
        .build();
    }

    // ✅ Use Zod validation to determine response type and format accordingly
    const result = this.formatTasksResponseWithValidation(message, parsedData, builder);
    
    console.log(`[TasksPlugin] 🔑 FORMATTED TASKS RESPONSE STRUCTURE:`);
    console.log(getObjectStructure(result));
    
    return result;
  }

  /**
   * ✅ NEW: Format response using Zod validation to detect data type
   */
  private formatTasksResponseWithValidation(
    originalMessage: string,
    parsed: any,
    builder: UnifiedResponseBuilder
  ): UnifiedToolResponse {
    console.log(`[TasksPlugin] 🎯 FORMAT TASKS RESPONSE WITH ZOD VALIDATION`);
    console.log(`[TasksPlugin] - Original message: "${originalMessage}"`);
    console.log(`[TasksPlugin] - Parsed data keys:`, parsed ? Object.keys(parsed) : 'no parsed data');
    
    // Extract the actual data from the Google Tasks API response
    const responseData = parsed?.data?.response_data;
    if (!responseData) {
      return this.formatErrorResponse(builder, "No response data found");
    }

    console.log(`[TasksPlugin] - Response data kind:`, responseData.kind);
    console.log(`[TasksPlugin] - Response data items count:`, responseData.items?.length || 0);
    
    // ✅ Use Zod validation to determine data type
    
    // Check if it's task lists (LIST_TASK_LISTS response)
    if (responseData.kind === "tasks#taskLists") {
      console.log(`[TasksPlugin] 🔍 DETECTED: Task Lists Response`);
      return this.formatTaskListsResponse(responseData, parsed, builder);
    }
    
    // Check if it's tasks within a list (LIST_TASKS response)
    if (responseData.kind === "tasks#tasks") {
      console.log(`[TasksPlugin] 🔍 DETECTED: Tasks Response`);
      return this.formatTaskListResponse(responseData, parsed, builder);
    }
    
    // Check if it's a single task (INSERT_TASK or PATCH_TASK response)
    if (responseData.kind === "tasks#task") {
      console.log(`[TasksPlugin] 🔍 DETECTED: Single Task Response`);
      return this.formatSingleTaskResponse(responseData, parsed, builder);
    }
    
    // Fallback for unknown response types
    console.log(`[TasksPlugin] ❓ UNKNOWN RESPONSE TYPE, using generic formatting`);
    return this.formatGenericTaskResponse(parsed, builder);
  }

  /**
   * ✅ Format task lists response (LIST_TASK_LISTS)
   */
  private formatTaskListsResponse(
    responseData: any,
    parsed: any,
    builder: UnifiedResponseBuilder
  ): UnifiedToolResponse {
    const taskListsData = responseData.items || [];
    
    if (!Array.isArray(taskListsData) || taskListsData.length === 0) {
      return builder
        .setSuccess(true)
        .setTitle("📋 Task Lists")
        .setContent("No task lists found")
        .setMessage("📋 No task lists in your account")
        .build();
    }

    console.log(`[TasksPlugin] 🔍 PROCESSING ${taskListsData.length} TASK LISTS`);
    console.log(`[TasksPlugin] - First task list structure:`, taskListsData[0] ? Object.keys(taskListsData[0]) : 'no first task list');

    // ✅ Validate and transform using Zod
    const taskListsStructuredData: TaskListsData = {
      taskLists: taskListsData.map((taskList: any) => ({
        id: taskList.id,
        title: taskList.title,
        updated: taskList.updated,
        selfLink: taskList.selfLink,
        etag: taskList.etag,
        kind: taskList.kind,
      })),
      totalCount: taskListsData.length,
      hasMore: false, // Google Tasks API doesn't provide pagination info directly
    };

    // ✅ Validate with Zod
    const validationResult = TaskListsDataSchema.safeParse(taskListsStructuredData);
    if (!validationResult.success) {
      console.error(`[TasksPlugin] ❌ Task lists validation failed:`, validationResult.error);
      return this.formatErrorResponse(builder, "Invalid task lists data structure");
    }

    console.log(`[TasksPlugin] ✅ Task lists validation successful`);

    // Enhanced actions for task lists
    const actions: UnifiedAction[] = [
      {
        id: "view_tasks",
        label: "View Tasks",
        type: "primary",
        icon: "📋"
      },
      {
        id: "create_task",
        label: "Create Task",
        type: "secondary",
        icon: "➕"
      }
    ];

    const content = `Found ${taskListsData.length} task list${taskListsData.length === 1 ? '' : 's'}`;

    const result = builder
      .setSuccess(true)
      .setTitle("📋 My Task Lists")
      .setSubtitle(`${taskListsData.length} list${taskListsData.length === 1 ? '' : 's'}`)
      .setContent(content)
      .setMessage(`📋 Task lists retrieved\n${content}`)
      .setStructuredData(validationResult.data)
      .setRawData(parsed)
      .setMetadata({ 
        confidence: 95, 
        source: 'Google Tasks'
      });

    actions.forEach(action => result.addAction(action));
    return result.build();
  }

  /**
   * ✅ Format tasks response (LIST_TASKS)
   */
  private formatTaskListResponse(
    responseData: any,
    parsed: any,
    builder: UnifiedResponseBuilder
  ): UnifiedToolResponse {
    const tasksData = responseData.items || [];
    
    if (!Array.isArray(tasksData) || tasksData.length === 0) {
      return builder
        .setSuccess(true)
        .setTitle("📋 Tasks")
        .setContent("No tasks found in this list")
        .setMessage("📋 No tasks in this list")
        .build();
    }

    console.log(`[TasksPlugin] 🔍 PROCESSING ${tasksData.length} TASKS`);
    console.log(`[TasksPlugin] - First task structure:`, tasksData[0] ? Object.keys(tasksData[0]) : 'no first task');

    // ✅ Validate and transform using Zod
    const taskListStructuredData: TaskListData = {
      tasks: tasksData.map((task: any) => ({
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
      })),
      totalCount: tasksData.length,
      completedCount: tasksData.filter((task: any) => task.status === 'completed').length,
      hasMore: false,
      listTitle: "Tasks", // Could extract from list API call
    };

    // ✅ Validate with Zod
    const validationResult = TaskListDataSchema.safeParse(taskListStructuredData);
    if (!validationResult.success) {
      console.error(`[TasksPlugin] ❌ Task list validation failed:`, validationResult.error);
      return this.formatErrorResponse(builder, "Invalid task list data structure");
    }

    console.log(`[TasksPlugin] ✅ Task list validation successful`);

    // Enhanced actions for task list
    const actions: UnifiedAction[] = [
      {
        id: "create_task",
        label: "Create Task",
        type: "primary",
        icon: "➕"
      },
      {
        id: "complete_first",
        label: "Complete First",
        type: "secondary",
        icon: "✅"
      }
    ];

    const content = `Found ${tasksData.length} task${tasksData.length === 1 ? '' : 's'}${taskListStructuredData.completedCount > 0 ? ` (${taskListStructuredData.completedCount} completed)` : ''}`;

    const result = builder
      .setSuccess(true)
      .setTitle("📋 Tasks")
      .setSubtitle(`${tasksData.length} task${tasksData.length === 1 ? '' : 's'}`)
      .setContent(content)
      .setMessage(`📋 Tasks retrieved\n${content}`)
      .setStructuredData(validationResult.data)
      .setRawData(parsed)
      .setMetadata({ 
        confidence: 95, 
        source: 'Google Tasks'
      });

    actions.forEach(action => result.addAction(action));
    return result.build();
  }

  /**
   * ✅ Format single task response (INSERT_TASK, PATCH_TASK)
   */
  private formatSingleTaskResponse(
    responseData: any,
    parsed: any,
    builder: UnifiedResponseBuilder
  ): UnifiedToolResponse {
    // ✅ Validate single task with Zod
    const taskData = {
      id: responseData.id,
      title: responseData.title,
      status: responseData.status || 'needsAction',
      notes: responseData.notes,
      due: responseData.due,
      completed: responseData.completed,
      updated: responseData.updated,
      parent: responseData.parent,
      position: responseData.position,
      selfLink: responseData.selfLink,
      etag: responseData.etag,
      kind: responseData.kind,
      links: responseData.links,
    };

    const validationResult = TaskDataSchema.safeParse(taskData);
    if (!validationResult.success) {
      console.error(`[TasksPlugin] ❌ Single task validation failed:`, validationResult.error);
      return this.formatErrorResponse(builder, "Invalid task data structure");
    }

    console.log(`[TasksPlugin] ✅ Single task validation successful`);

    const isCompleted = taskData.status === 'completed';
    const title = isCompleted ? "🎉 Task Completed" : "✅ Task Created";
    const message = isCompleted ? `🎉 Task completed: "${taskData.title}"` : `✅ Task created: "${taskData.title}"`;

    const actions: UnifiedAction[] = [
      {
        id: "view_tasks",
        label: "View All Tasks",
        type: "secondary",
        icon: "📋",
        command: "list tasks"
      }
    ];

    return builder
      .setSuccess(true)
      .setTitle(title)
      .setContent(`"${taskData.title}"`)
      .setMessage(message)
      .setStructuredData(validationResult.data)
      .setRawData(parsed)
      .addAction(actions[0])
      .build();
  }

  /**
   * ✅ Format generic task response
   */
  private formatGenericTaskResponse(parsed: any, builder: UnifiedResponseBuilder): UnifiedToolResponse {
    return builder
      .setSuccess(true)
      .setTitle("📋 Task Operation")
      .setContent("Task operation completed successfully")
      .setMessage("📋 Task operation completed")
      .setRawData(parsed)
      .build();
  }

  /**
   * ✅ Format error response
   */
  private formatErrorResponse(builder: UnifiedResponseBuilder, message: string): UnifiedToolResponse {
    return builder
      .setSuccess(false)
      .setTitle("Tasks Error")
      .setContent(message)
      .setMessage(`❌ ${message}`)
      .build();
  }

  /**
   * Get task-specific actions with LLM-friendly descriptions
   */
  getServiceActions(): Record<string, string> {
    return {
      [GoogleTasksAction.LIST_TASK_LISTS]: "Get all task lists (containers for tasks). Use this to show available task lists before listing tasks. Include userId for authentication.",
      [GoogleTasksAction.LIST_TASKS]: "Get tasks within a specific task list. Requires tasklist_id parameter. Set showCompleted: true to include completed tasks, maxResults: 100 for more tasks. Include userId for authentication.",
      [GoogleTasksAction.INSERT_TASK]: "Create a new task in a task list. Requires tasklist_id and title. Optional: notes, due date. Include userId for authentication.",
      [GoogleTasksAction.UPDATE_TASK]: "Update or complete a task. Requires tasklist_id and task_id. To complete: set status: 'completed'. To update: change title, notes, or due. Include userId for authentication.",
      [GoogleTasksAction.DELETE_TASK]: "Delete a task permanently. Requires tasklist_id and task_id parameters. Include userId for authentication.",
      [GoogleTasksAction.CLEAR_COMPLETED]: "Remove all completed tasks from a task list. Requires tasklist_id parameter. Include userId for authentication.",
      [GoogleTasksAction.MOVE_TASK]: "Move a task to a different position or parent in the list. Requires tasklist_id, task_id, and position/parent parameters. Include userId for authentication."
    };
  }

  /**
   * ✅ NEW: Fetch complete task overview with parallel task fetching
   * This is the enhanced strategy that fetches task lists AND their tasks
   */
  private async fetchCompleteTaskOverview(
    userId: string,
    composio: OpenAIToolSet,
    openai: OpenAI
  ): Promise<CompleteTaskOverview> {
    console.log(`[TasksPlugin] 🚀 FETCH COMPLETE TASK OVERVIEW - Parallel Strategy`);
    
    // Step 1: Get all task lists
    console.log(`[TasksPlugin] 📋 Step 1: Fetching task lists...`);
    const taskListsResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Get all task lists using LIST_TASK_LISTS.",
        },
        {
          role: "user", 
          content: "List all my task lists",
        },
      ],
      tools: await composio.getTools({
        actions: [GoogleTasksAction.LIST_TASK_LISTS],
      }),
      tool_choice: "auto",
    });

    // NEW: Use custom OAuth tokens from Supabase via manager for task lists
    let taskListsToolResponse: any;
    try {
      if (this.manager) {
        console.log(`[TasksPlugin] 🔐 Using custom OAuth tokens for fetching task lists`);
        
        const oauthToken = await this.manager.getGoogleOAuthToken(userId);
        const toolCalls = taskListsResponse.choices[0].message.tool_calls;
        console.log('[TasksPlugin] 🔐 tool calls: ', toolCalls, 'oauthToken: ', oauthToken);
        
        if (toolCalls && toolCalls.length > 0) {
          const result = await composio.client.actions.execute({  
            actionName: toolCalls[0].function.name, 
            requestBody: {  
              input: JSON.parse(toolCalls[0].function.arguments),  
              appName: "GOOGLETASKS",
              authConfig: {  
                base_url: "https://tasks.googleapis.com", // Add the base URL 
                parameters: [  
                  {  
                    name: "Authorization",  
                    value: `Bearer ${oauthToken.access_token}`,  
                    in: "header"  
                  }  
                ]  
              }  
            }  
          });
          taskListsToolResponse = JSON.stringify(result);
        } else {
          throw new Error("No tool calls found for task lists request");
        }
      } else {
        console.log(`[TasksPlugin] ⚠️ No manager available for task lists, using standard auth`);
      }
    } catch (authError) {
      console.error(`[TasksPlugin] ❌ Custom auth failed for task lists, using standard auth:`, authError);
    }

    // Parse the task lists response
    const taskListsData = Array.isArray(taskListsToolResponse) 
      ? taskListsToolResponse[0] 
      : taskListsToolResponse;
    
    let parsedTaskLists;
    try {
      parsedTaskLists = typeof taskListsData === "string" 
        ? JSON.parse(taskListsData) 
        : taskListsData;
    } catch (e) {
      parsedTaskLists = taskListsData;
    }

    console.log(`[TasksPlugin] 🔍 Task lists response structure:`, {
      hasData: !!parsedTaskLists?.data,
      hasResponseData: !!parsedTaskLists?.data?.response_data,
      hasDirectItems: !!parsedTaskLists?.data?.items,
      responseDataKeys: parsedTaskLists?.data?.response_data ? Object.keys(parsedTaskLists.data.response_data) : 'no response_data',
      directDataKeys: parsedTaskLists?.data ? Object.keys(parsedTaskLists.data) : 'no data'
    }, 'task lists response: ', taskListsToolResponse);

    // ✅ TRY BOTH POSSIBLE PATHS: Check both response_data.items and direct items
    const taskLists = parsedTaskLists?.data?.response_data?.items || 
                      parsedTaskLists?.data?.items || 
                      parsedTaskLists?.data?.taskLists || 
                      [];
    
    if (!Array.isArray(taskLists) || taskLists.length === 0) {
      console.log(`[TasksPlugin] ⚠️ No task lists found`);
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

    console.log(`[TasksPlugin] 📋 Found ${taskLists.length} task lists, fetching tasks in parallel...`);

    // Step 2: Fetch tasks from all lists in parallel using Promise.all
    const taskListPromises = taskLists.map(async (taskList: any): Promise<TaskListWithTasks> => {
      try {
        console.log(`[TasksPlugin] 🔄 Fetching tasks for list: "${taskList.title}" (${taskList.id})`);
        
        // ✅ SIMPLIFIED: Direct function call with proper parameters
        const tasksResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Call GOOGLETASKS_LIST_TASKS with tasklist_id: "${taskList.id}", showCompleted: true, maxResults: 100`,
            },
            {
              role: "user",
              content: `Get all tasks from task list ID: ${taskList.id}`,
            },
          ],
          tools: await composio.getTools({
            actions: [GoogleTasksAction.LIST_TASKS],
          }),
          tool_choice: "required",
        });

        // NEW: Use custom OAuth tokens from Supabase via manager for individual task lists
        let tasksToolResponse: any;
        try {
          if (this.manager) {
            console.log(`[TasksPlugin] 🔐 Using custom OAuth tokens for fetching tasks from "${taskList.title}"`);
            
            const oauthToken = await this.manager.getGoogleOAuthToken(userId);
            const toolCalls = tasksResponse.choices[0].message.tool_calls;
            
            if (toolCalls && toolCalls.length > 0) {
              const result = await composio.client.actions.execute({  
                actionName: toolCalls[0].function.name,  
                requestBody: {  
                  input: JSON.parse(toolCalls[0].function.arguments),  
                  appName: "googletasks",
                  authConfig: {  
                    parameters: [  
                      {  
                        name: "Authorization",  
                        value: `Bearer ${oauthToken.access_token}`,  
                        in: "header"  
                      }  
                    ]  
                  }  
                }  
              });
              tasksToolResponse = JSON.stringify(result);
            } else {
              throw new Error("No tool calls found for tasks request");
            }
          } else {
            console.log(`[TasksPlugin] ⚠️ No manager available for tasks, using standard auth`);
          }
        } catch (authError) {
          console.error(`[TasksPlugin] ❌ Custom auth failed for tasks, using standard auth:`, authError);
        }
        
        // ✅ SIMPLIFIED: Parse response and extract tasks
        const tasksData = Array.isArray(tasksToolResponse) ? tasksToolResponse[0] : tasksToolResponse;
        const parsed = typeof tasksData === "string" ? JSON.parse(tasksData) : tasksData;
        const tasks = parsed?.data?.tasks || [];
        
        console.log(`[TasksPlugin] 📝 Found ${tasks.length} tasks in "${taskList.title}"`, 'tool response: ',tasksToolResponse);

        // ✅ ZOD VALIDATION: Let Zod handle the task validation
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
            console.warn(`[TasksPlugin] ⚠️ Invalid task data in "${taskList.title}":`, taskResult.error);
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

        // ✅ ZOD VALIDATION: Validate the complete TaskListWithTasks object
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

        console.log(`[TasksPlugin] ✅ Successfully processed ${processedTasks.length} tasks from "${taskList.title}"`);
        return taskListWithTasksResult.data;

      } catch (error) {
        console.error(`[TasksPlugin] ❌ Failed to fetch tasks for list "${taskList.title}":`, error);
        
        // ✅ ZOD VALIDATION: Even error case uses Zod
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
    console.log(`[TasksPlugin] ⚡ Executing ${taskListPromises.length} parallel task fetches...`);
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

    // ✅ ZOD VALIDATION: Use Zod for the complete overview
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

    console.log(`[TasksPlugin] 🎉 Complete overview ready: ${totalTasks} tasks across ${taskListsWithTasks.length} lists`);
    
    return completeOverviewResult.data;
  }
}
