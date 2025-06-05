import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

interface Approval {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  requested_by: string;
  type: string;
}

interface UseApprovalActionsProps {
  approvals: Approval[];
  setApprovals: React.Dispatch<React.SetStateAction<Approval[]>>;
  onAchievement?: (achievementId: string) => void;
}

export function useApprovalActions({ 
  approvals, 
  setApprovals, 
  onAchievement 
}: UseApprovalActionsProps) {
  const [undoStack, setUndoStack] = useState<{
    action: 'approve' | 'reject';
    approval: Approval;
    timestamp: number;
  }[]>([]);

  const removeApproval = useCallback((id: string) => {
    setApprovals(approvals.filter(approval => approval.id !== id));
  }, [approvals, setApprovals]);

  const handleApprove = useCallback((approval: Approval) => {
    // Add to undo stack
    setUndoStack(prev => [...prev, {
      action: 'approve',
      approval,
      timestamp: Date.now(),
    }]);

    // Remove from current list
    removeApproval(approval.id);

    // Track achievement progress
    onAchievement?.('swipe-approve');

    // In real app, would also make API call
    console.log('Approved:', approval.title);
  }, [removeApproval, onAchievement]);

  const handleReject = useCallback((approval: Approval) => {
    // Add to undo stack
    setUndoStack(prev => [...prev, {
      action: 'reject',
      approval,
      timestamp: Date.now(),
    }]);

    // Remove from current list
    removeApproval(approval.id);

    // Track achievement progress
    onAchievement?.('swipe-reject');

    // In real app, would also make API call
    console.log('Rejected:', approval.title);
  }, [removeApproval, onAchievement]);

  const undoLastAction = useCallback(() => {
    const lastAction = undoStack[undoStack.length - 1];
    if (!lastAction) return;

    // Check if undo is still valid (within 10 seconds)
    if (Date.now() - lastAction.timestamp > 10000) {
      Alert.alert('Cannot Undo', 'This action is too old to undo.');
      return;
    }

    // Restore the approval to the list
    setApprovals(prev => [...prev, lastAction.approval]);
    
    // Remove from undo stack
    setUndoStack(prev => prev.slice(0, -1));

    console.log('Undid:', lastAction.action, lastAction.approval.title);
  }, [undoStack, setApprovals]);

  return {
    handleApprove,
    handleReject,
    undoLastAction,
    canUndo: undoStack.length > 0,
    lastAction: undoStack[undoStack.length - 1],
  };
} 