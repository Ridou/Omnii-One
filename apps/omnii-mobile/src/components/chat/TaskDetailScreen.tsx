import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView, Pressable, Platform } from 'react-native';

import { CrossPlatformDatePicker, DatePickerButton } from '~/components/common/CrossPlatformDatePicker';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import type { TaskData, TaskListWithTasks } from '@omnii/validators';

interface TaskDetailScreenProps {
  task: TaskData;
  list: TaskListWithTasks;
  subtasks: TaskData[];
  onClose: () => void;
  onAction: (action: string, data: any) => void;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ 
  task, 
  list,
  subtasks,
  onClose, 
  onAction 
}) => {
  const { isDark } = useTheme();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedNotes, setEditedNotes] = useState(task.notes || '');
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskNotes, setNewSubtaskNotes] = useState('');
  const [newSubtaskDue, setNewSubtaskDue] = useState<string | null>(null);

  const isCompleted = task.status === 'completed';
  const isOverdue = task.due && new Date(task.due) < new Date() && !isCompleted;

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onAction('edit_task', { 
        task, 
        listId: list.id,
        newTitle: editedTitle.trim(),
        newNotes: task.notes
      });
    } else {
      setEditedTitle(task.title);
    }
    setIsEditingTitle(false);
  };

  const handleNotesSubmit = () => {
    if (editedNotes !== task.notes) {
      onAction('edit_task', { 
        task, 
        listId: list.id,
        newTitle: task.title,
        newNotes: editedNotes.trim()
      });
    }
    setIsEditingNotes(false);
  };

  const handleToggleComplete = () => {
    onAction(
      task.status === 'completed' ? 'mark_incomplete' : 'mark_complete',
      { task, listId: list.id }
    );
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onAction('create_subtask_detailed', {
        parentTask: task,
        listId: list.id,
        title: newSubtaskTitle.trim(),
        notes: newSubtaskNotes.trim(),
        due: newSubtaskDue
      });
      setNewSubtaskTitle('');
      setNewSubtaskNotes('');
      setNewSubtaskDue(null);
      setShowAddSubtask(false);
    }
  };

  return (
    <SafeAreaView className={cn(
      "flex-1",
      isDark ? "bg-slate-900" : "bg-white"
    )}>
      {/* Header */}
      <View className={cn(
        "flex-row items-center justify-between px-4 py-3 border-b",
        isDark ? "border-slate-700" : "border-gray-200"
      )}>
        <TouchableOpacity onPress={onClose} className="p-2">
          <Text className={cn(
            "text-lg",
            isDark ? "text-white" : "text-gray-900"
          )}>←</Text>
        </TouchableOpacity>
        
        <Text className={cn(
          "text-base font-medium",
          isDark ? "text-slate-300" : "text-gray-600"
        )}>
          {list.title}
        </Text>

        <TouchableOpacity
          onPress={() => onAction('delete_task', { task, listId: list.id })}
          className="p-2"
        >
          <Text className="text-red-500 text-sm">Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Completion Status */}
        <TouchableOpacity
          onPress={handleToggleComplete}
          className={cn(
            "flex-row items-center py-4 border-b",
            isDark ? "border-slate-700" : "border-gray-200"
          )}
        >
          <View className={cn(
            "w-8 h-8 rounded-full border-2 items-center justify-center mr-4",
            isCompleted 
              ? "bg-blue-600 border-blue-600" 
              : isDark 
                ? "border-slate-400" 
                : "border-gray-400"
          )}>
            {isCompleted && (
              <Text className="text-white text-base">✓</Text>
            )}
          </View>
          <Text className={cn(
            "text-base",
            isDark ? "text-slate-300" : "text-gray-600"
          )}>
            {isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          </Text>
        </TouchableOpacity>

        {/* Title */}
        <View className="py-4">
          <Text className={cn(
            "text-xs mb-2",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>TITLE</Text>
          {isEditingTitle ? (
            <TextInput
              value={editedTitle}
              onChangeText={setEditedTitle}
              onBlur={handleTitleSubmit}
              onSubmitEditing={handleTitleSubmit}
              autoFocus
              className={cn(
                "text-xl font-semibold px-3 py-2 rounded-lg border",
                isDark 
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-gray-50 border-gray-300 text-gray-900"
              )}
              placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
            />
          ) : (
            <TouchableOpacity onPress={() => !isCompleted && setIsEditingTitle(true)}>
              <Text className={cn(
                "text-xl font-semibold px-3 py-2",
                isCompleted && "line-through",
                isCompleted 
                  ? isDark ? "text-slate-500" : "text-gray-500"
                  : isDark ? "text-white" : "text-gray-900"
              )}>
                {task.title}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notes */}
        <View className="py-4">
          <Text className={cn(
            "text-xs mb-2",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>NOTES</Text>
          {isEditingNotes ? (
            <TextInput
              value={editedNotes}
              onChangeText={setEditedNotes}
              onBlur={handleNotesSubmit}
              onSubmitEditing={handleNotesSubmit}
              autoFocus
              multiline
              numberOfLines={4}
              className={cn(
                "text-base px-3 py-2 rounded-lg border",
                isDark 
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-gray-50 border-gray-300 text-gray-900"
              )}
              placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
            />
          ) : (
            <TouchableOpacity onPress={() => !isCompleted && setIsEditingNotes(true)}>
              <Text className={cn(
                "text-base px-3 py-2",
                isDark ? "text-slate-300" : "text-gray-700"
              )}>
                {task.notes || (isCompleted ? '' : 'Add notes...')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Due Date */}
        <View className="py-4">
          <Text className={cn(
            "text-xs mb-2",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>DUE DATE</Text>
          <DatePickerButton
            date={task.due ? new Date(task.due) : null}
            onDateChange={(date) => {
              if (date) {
                onAction('set_due_date', { 
                  task, 
                  listId: list.id,
                  dueDate: date.toISOString()
                });
              } else {
                onAction('clear_due_date', { task, listId: list.id });
              }
            }}
            placeholder="Set due date"
            minimumDate={new Date()}
            className={cn(
              "py-3",
              isDark 
                ? "bg-slate-800"
                : "bg-gray-50"
            )}
          />
        </View>

        {/* Subtasks Section */}
        <View className="py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-500" : "text-gray-500"
            )}>SUBTASKS ({subtasks.length})</Text>
            {!task.parent && (
              <TouchableOpacity
                onPress={() => setShowAddSubtask(true)}
                className={cn(
                  "px-3 py-1.5 rounded-lg",
                  isDark ? "bg-slate-800" : "bg-gray-100"
                )}
              >
                <Text className={cn(
                  "text-sm",
                  isDark ? "text-blue-400" : "text-blue-600"
                )}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Add Subtask Form */}
          {showAddSubtask && (
            <View className={cn(
              "p-3 rounded-lg mb-3",
              isDark ? "bg-slate-800" : "bg-gray-50"
            )}>
              <TextInput
                placeholder="Subtask title"
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                className={cn(
                  "text-base px-3 py-2 rounded-lg border mb-2",
                  isDark 
                    ? "bg-slate-900 border-slate-600 text-white placeholder:text-slate-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                )}
                autoFocus
                placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
              />
              <TextInput
                placeholder="Notes (optional)"
                value={newSubtaskNotes}
                onChangeText={setNewSubtaskNotes}
                multiline
                numberOfLines={2}
                className={cn(
                  "text-sm px-3 py-2 rounded-lg border mb-2",
                  isDark 
                    ? "bg-slate-900 border-slate-600 text-white placeholder:text-slate-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                )}
                placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
              />
              <DatePickerButton
                date={newSubtaskDue ? new Date(newSubtaskDue) : null}
                onDateChange={(date) => setNewSubtaskDue(date ? date.toISOString() : null)}
                placeholder="Set due date (optional)"
                minimumDate={new Date()}
                className={cn(
                  "mb-3",
                  isDark 
                    ? "bg-slate-900"
                    : "bg-white"
                )}
              />
              <View className="flex-row justify-end gap-2">
                <TouchableOpacity 
                  onPress={() => {
                    setShowAddSubtask(false);
                    setNewSubtaskTitle('');
                    setNewSubtaskNotes('');
                    setNewSubtaskDue(null);
                  }}
                  className="px-4 py-2"
                >
                  <Text className={cn(
                    "text-sm",
                    isDark ? "text-slate-400" : "text-gray-600"
                  )}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleAddSubtask}
                  className={cn(
                    "px-4 py-2 rounded-lg",
                    newSubtaskTitle.trim() 
                      ? "bg-blue-600" 
                      : isDark ? "bg-slate-700" : "bg-gray-300"
                  )}
                  disabled={!newSubtaskTitle.trim()}
                >
                  <Text className={cn(
                    "text-sm font-medium",
                    newSubtaskTitle.trim() ? "text-white" : isDark ? "text-slate-500" : "text-gray-500"
                  )}>Add</Text>
                </TouchableOpacity>
              </View>
              
            </View>
          )}

          {/* Subtask List */}
          {subtasks.map((subtask) => (
            <TouchableOpacity
              key={subtask.id}
              onPress={() => onAction('view_task', { task: subtask, listId: list.id })}
              className={cn(
                "flex-row items-center p-3 rounded-lg mb-2 border",
                isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200"
              )}
            >
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onAction(
                    subtask.status === 'completed' ? 'mark_incomplete' : 'mark_complete',
                    { task: subtask, listId: list.id }
                  );
                }}
                className="mr-3"
              >
                <View className={cn(
                  "w-6 h-6 rounded-full border-2 items-center justify-center",
                  subtask.status === 'completed'
                    ? "bg-blue-600 border-blue-600" 
                    : isDark 
                      ? "border-slate-400" 
                      : "border-gray-400"
                )}>
                  {subtask.status === 'completed' && (
                    <Text className="text-white text-sm">✓</Text>
                  )}
                </View>
              </TouchableOpacity>
              <View className="flex-1">
                <Text className={cn(
                  "text-base",
                  subtask.status === 'completed' && "line-through",
                  subtask.status === 'completed'
                    ? isDark ? "text-slate-500" : "text-gray-500"
                    : isDark ? "text-white" : "text-gray-900"
                )}>
                  {subtask.title}
                </Text>
                {subtask.due && (
                  <Text className={cn(
                    "text-xs mt-1",
                    new Date(subtask.due) < new Date() && subtask.status !== 'completed'
                      ? "text-red-500"
                      : isDark ? "text-slate-500" : "text-gray-500"
                  )}>
                    Due: {new Date(subtask.due).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <Text className={cn(
                "text-lg ml-2",
                isDark ? "text-slate-400" : "text-gray-400"
              )}>›</Text>
            </TouchableOpacity>
          ))}

          {subtasks.length === 0 && !showAddSubtask && (
            <Text className={cn(
              "text-sm text-center py-4",
              isDark ? "text-slate-500" : "text-gray-500"
            )}>
              No subtasks yet
            </Text>
          )}
        </View>

        {/* Parent Task Info (if this is a subtask) */}
        {task.parent && (
          <View className={cn(
            "py-4 mt-4 border-t",
            isDark ? "border-slate-700" : "border-gray-200"
          )}>
            <Text className={cn(
              "text-xs mb-2",
              isDark ? "text-slate-500" : "text-gray-500"
            )}>PARENT TASK</Text>
            <TouchableOpacity
              className={cn(
                "px-3 py-2 rounded-lg",
                isDark ? "bg-slate-800" : "bg-gray-50"
              )}
            >
              <Text className={cn(
                "text-base",
                isDark ? "text-white" : "text-gray-900"
              )}>
                ↑ View parent task
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Metadata */}
        <View className={cn(
          "py-4 mt-4 mb-8 border-t",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          <Text className={cn(
            "text-xs mb-2",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>DETAILS</Text>
          <Text className={cn(
            "text-sm mb-1",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            Created: {new Date(task.updated).toLocaleString()}
          </Text>
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            Last updated: {new Date(task.updated).toLocaleString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};