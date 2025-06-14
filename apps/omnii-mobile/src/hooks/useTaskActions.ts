import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  requested_by: string;
  type: string;
}

interface UseTaskActionsProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onAchievement?: (achievementId: string) => void;
}

export function useTaskActions({ 
  tasks, 
  setTasks, 
  onAchievement 
}: UseTaskActionsProps) {
  const [undoStack, setUndoStack] = useState<{
    action: 'approve' | 'reject';
    task: Task;
    timestamp: number;
  }[]>([]);

const removeTask = useCallback((id: string) => {
  setTasks(prev => prev.filter(task => task.id !== id));
}, [setTasks]);

  const handleApprove = useCallback((task: Task) => {
    // Add to undo stack
    setUndoStack(prev => [...prev, {
      action: 'approve',
      task,
      timestamp: Date.now(),
    }]);

    // Remove from current list
    removeTask(task.id);

    // Track achievement progress
    onAchievement?.('swipe-approve');

    // In real app, would also make API call
  }, [removeTask, onAchievement]);

  const handleReject = useCallback((task: Task) => {
    // Add to undo stack
    setUndoStack(prev => [...prev, {
      action: 'reject',
      task,
      timestamp: Date.now(),
    }]);

    // Remove from current list
    removeTask(task.id);

    // Track achievement progress
    onAchievement?.('swipe-reject');

    // In real app, would also make API call
  }, [removeTask, onAchievement]);

  const undoLastAction = useCallback(() => {
    const lastAction = undoStack[undoStack.length - 1];
    if (!lastAction) return;

    // Check if undo is still valid (within 10 seconds)
    if (Date.now() - lastAction.timestamp > 10000) {
      Alert.alert('Cannot Undo', 'This action is too old to undo.');
      return;
    }

    // Restore the task to the list
    setTasks(prev => [...prev, lastAction.task]);
    
    // Remove from undo stack
    setUndoStack(prev => prev.slice(0, -1));

  }, [undoStack, setTasks]);

  return {
    handleApprove,
    handleReject,
    undoLastAction,
    canUndo: undoStack.length > 0,
    lastAction: undoStack[undoStack.length - 1],
  };
} 