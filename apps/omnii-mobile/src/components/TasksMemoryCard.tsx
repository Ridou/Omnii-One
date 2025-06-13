import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { cn } from '~/utils/cn';
import { useColorScheme } from 'nativewind';
import { useTasks } from '~/hooks/useTasks';
import { createTaskComponent } from '~/components/chat/MessageComponents';
import { GoogleTasksView } from '~/components/chat/GoogleTasksView';
import { isCompleteTaskOverview } from '@omnii/validators';
import type { CompleteTaskOverview } from '@omnii/validators';

interface TasksMemoryCardProps {
  tasksOverview?: any;
  onTaskAction?: (action: string, data?: any) => void;
}

export const TasksMemoryCard: React.FC<TasksMemoryCardProps> = ({ 
  tasksOverview, 
  onTaskAction = () => {} 
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [expanded, setExpanded] = useState(true); // Show expanded by default
  
  const {
    createTaskInFirstList,
    createTaskList,
    isCreatingTask,
    isCreatingTaskList,
    createTaskError,
    updateTaskError,
    deleteTaskError,
    createTaskListError,
    taskLists,
  } = useTasks();

  if (!tasksOverview) {
    return null;
  }

  // Check if it's a complete task overview with task lists
  const isCompleteOverview = isCompleteTaskOverview(tasksOverview);
  
  // If expanded and we have complete data, show Google Tasks view
  if (expanded && isCompleteOverview) {
    return (
      <View className="mb-4">
        <GoogleTasksView 
          overview={tasksOverview as CompleteTaskOverview} 
          onAction={onTaskAction}
        />
        <TouchableOpacity
          onPress={() => setExpanded(false)}
          className={cn(
            "mx-4 mt-2 px-4 py-2 rounded-lg items-center",
            isDark ? "bg-slate-700" : "bg-gray-200"
          )}
        >
          <Text className={cn(
            "text-sm font-medium",
            isDark ? "text-white" : "text-gray-700"
          )}>Collapse View</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className={cn(
      "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-purple-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3">
        <View className={cn(
          "w-10 h-10 rounded-lg items-center justify-center mr-3",
          isDark ? "bg-purple-900/30" : "bg-purple-100"
        )}>
          <Text className="text-xl">📋</Text>
        </View>
        <Text className={cn(
          "text-lg font-bold",
          isDark ? "text-white" : "text-gray-900"
        )}>Task Memory</Text>
      </View>
      <Text className={cn(
        "text-sm leading-6 mb-4",
        isDark ? "text-slate-300" : "text-gray-600"
      )}>
        Current tasks and patterns from your Google Tasks, stored in AI memory for better assistance.
      </Text>
      
      {/* Show expand button if we have complete overview data */}
      {isCompleteOverview && (
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          className={cn(
            "mb-4 px-4 py-3 rounded-lg border flex-row items-center justify-center",
            isDark ? "bg-indigo-600 border-indigo-500" : "bg-indigo-500 border-indigo-600"
          )}
        >
          <Text className="text-white font-medium mr-2">📊 View All Task Lists</Text>
          <Text className="text-white">→</Text>
        </TouchableOpacity>
      )}
      
      {/* Show compact task component */}
      {createTaskComponent(tasksOverview, {
        onEmailAction: () => {},
        onAction: onTaskAction,
        data: tasksOverview
      })}

      {/* Task CRUD Testing Buttons */}
      <View className="mt-4 pt-4 border-t border-purple-200">
        <Text className={cn(
          "text-sm font-semibold mb-3",
          isDark ? "text-purple-300" : "text-purple-700"
        )}>🧪 Task CRUD Testing</Text>
        
        <View className="gap-2">
          {/* Create Test Task Button */}
          <TouchableOpacity
            className={cn(
              "px-4 py-3 rounded-lg border flex-row items-center justify-between",
              isCreatingTask 
                ? (isDark ? "bg-purple-900/30 border-purple-600" : "bg-purple-100 border-purple-300")
                : (isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200")
            )}
            onPress={async () => {
              try {
                const testTaskTitle = `Test Task ${new Date().toLocaleTimeString()}`;
                const result = await createTaskInFirstList(
                  testTaskTitle,
                  'Created via CRUD testing in Memory tab',
                  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Due tomorrow
                );
                console.log('[CRUD Test] Task created:', result);
              } catch (error) {
                console.error('[CRUD Test] Create failed:', error);
              }
            }}
            disabled={isCreatingTask}
          >
            <Text className={cn(
              "text-sm font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {isCreatingTask ? "Creating..." : "➕ Create Test Task"}
            </Text>
            {isCreatingTask && (
              <View className="w-4 h-4 bg-purple-500 rounded-full animate-pulse" />
            )}
          </TouchableOpacity>

          {/* Create Task List Button */}
          <TouchableOpacity
            className={cn(
              "px-4 py-3 rounded-lg border flex-row items-center justify-between",
              isCreatingTaskList 
                ? (isDark ? "bg-blue-900/30 border-blue-600" : "bg-blue-100 border-blue-300")
                : (isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200")
            )}
            onPress={async () => {
              try {
                const testListTitle = `Test List ${new Date().toLocaleTimeString()}`;
                const result = await createTaskList({ title: testListTitle });
                console.log('[CRUD Test] Task list created:', result);
              } catch (error) {
                console.error('[CRUD Test] Create list failed:', error);
              }
            }}
            disabled={isCreatingTaskList}
          >
            <Text className={cn(
              "text-sm font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {isCreatingTaskList ? "Creating..." : "📋 Create Test List"}
            </Text>
            {isCreatingTaskList && (
              <View className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
            )}
          </TouchableOpacity>

          {/* Task Lists Info */}
          {taskLists && (
            <View className={cn(
              "px-3 py-2 rounded-lg border-l-4 border-l-green-500",
              isDark ? "bg-slate-800 border-slate-600" : "bg-green-50 border-gray-200"
            )}>
              <Text className={cn(
                "text-xs font-medium",
                isDark ? "text-green-400" : "text-green-700"
              )}>
                📋 Available Lists: {taskLists.items?.length || 0}
              </Text>
              {taskLists.items?.slice(0, 3).map((list: any, index: number) => (
                <Text key={list.id} className={cn(
                  "text-xs mt-1",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>
                  {index + 1}. {list.title}
                </Text>
              ))}
            </View>
          )}

          {/* Error Display */}
          {(createTaskError || updateTaskError || deleteTaskError || createTaskListError) && (
            <View className={cn(
              "px-3 py-2 rounded-lg border border-red-500",
              isDark ? "bg-red-900/20" : "bg-red-50"
            )}>
              <Text className="text-red-500 text-xs font-medium">
                ❌ Error: {
                  createTaskError?.message || 
                  updateTaskError?.message || 
                  deleteTaskError?.message || 
                  createTaskListError?.message
                }
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}; 