import { useXPContext } from '~/context/XPContext';
import { XPUpdate, XPProgress } from '~/types/unified-response.validation';

export interface XPSystemHook {
  // Current XP state
  currentXP: number;
  currentLevel: number;
  isLoading: boolean;
  error: string | null;
  
  // Progress calculations
  xpProgress: XPProgress;
  
  // Actions
  awardXP: (amount: number, reason: string, category: string) => Promise<XPUpdate | null>;
  syncXP: () => Promise<void>;
  refetchXP: () => Promise<void>;
  
  // Real-time updates
  isConnected: boolean;
  lastUpdated: Date | null;
  
  // Optimistic updates
  pendingXP: number;
  setPendingXP: (amount: number) => void;
  
  // ✅ TESTING HELPER: Clear celebration storage for debugging
  clearCelebrationStorage: () => Promise<void>;
}

/**
 * Simplified XP System Hook
 * Now uses the global XP context to prevent multiple subscriptions
 */
export function useXPSystem(): XPSystemHook {
  // Simply return the context data - no more duplicate subscriptions!
  return useXPContext();
} 