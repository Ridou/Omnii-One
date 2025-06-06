import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '~/context/AuthContext';
import { supabase } from '~/lib/supabase';
import { XPSystemUtils } from '~/constants/XPSystem';
import { 
  XPUpdate, 
  XPProgress, 
  validateXPUpdate,
  isValidXPUpdate
} from '~/types/unified-response.validation';

interface XPContextState {
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
}

const XPContext = createContext<XPContextState | undefined>(undefined);

interface XPProviderProps {
  children: ReactNode;
}

export function XPProvider({ children }: XPProviderProps) {
  const { user } = useAuth();
  const [currentXP, setCurrentXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pendingXP, setPendingXP] = useState(0);
  
  // Refs for real-time subscription cleanup (SINGLETON PATTERN)
  const subscriptionRef = useRef<any>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubscribedRef = useRef(false); // Prevent multiple subscriptions

  // Calculate XP progress
  const xpProgress: XPProgress = {
    current_level: currentLevel,
    total_xp: currentXP + pendingXP,
    xp_to_next_level: XPSystemUtils.getXPToNextLevel(currentXP + pendingXP, currentLevel),
    xp_in_current_level: XPSystemUtils.getXPInCurrentLevel(currentXP + pendingXP, currentLevel),
    xp_needed_for_level: XPSystemUtils.getNextLevelXP(currentLevel) - XPSystemUtils.getXPForLevel(currentLevel),
    progress_percentage: XPSystemUtils.getProgressPercentage(currentXP + pendingXP, currentLevel),
    completed: currentLevel >= 50,
    next_level_xp: currentLevel < 50 ? XPSystemUtils.getNextLevelXP(currentLevel) : undefined,
  };

  /**
   * Fetch XP data from server with silent fallback
   */
  const fetchXPData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Silent attempt - don't set error state yet
      const { data, error: fetchError } = await supabase.rpc('get_user_level_xp', {
        p_user_id: user.id
      });

      if (fetchError) {
        // Check if it's a function not found error - fall back silently
        if (fetchError.message?.includes('function') || fetchError.code === '42883') {
          console.log('🔄 [XPContext] Using local XP system (Supabase functions not available)');
          
          // Use local fallback - maintain user's current progress silently
          const fallbackLevel = Math.max(1, currentLevel);
          const fallbackXP = Math.max(0, currentXP);
          
          setCurrentXP(fallbackXP);
          setCurrentLevel(fallbackLevel);
          setLastUpdated(new Date());
          setPendingXP(0);
          setError(null); // Ensure no error state
          
          return; // Silent success
        }
        throw fetchError; // Only throw for unexpected errors
      }

      if (data && data.length > 0) {
        const xpData = data[0];
        setCurrentXP(xpData.total_xp || 0);
        setCurrentLevel(xpData.current_level || 1);
        setLastUpdated(new Date());
        setPendingXP(0);
        setError(null);

        console.log('✅ [XPContext] XP data synced from server:', {
          totalXP: xpData.total_xp,
          currentLevel: xpData.current_level
        });
      } else {
        // No data returned - use current state silently
        console.log('🔄 [XPContext] No server data, maintaining local state');
        setError(null);
      }
    } catch (err: any) {
      // Handle network errors silently for better UX
      if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
        console.log('🌐 [XPContext] Network unavailable, using local XP system');
        
        // Keep existing state if we have it, otherwise use safe defaults
        if (currentXP === 0 && currentLevel === 1) {
          setCurrentXP(0);
          setCurrentLevel(1);
        }
        setError(null); // No error for network issues - silent offline mode
      } else {
        // Only log console error, don't show to user unless it's a real problem
        console.warn('⚠️ [XPContext] XP sync issue (using local system):', err.message);
        setError(null); // Don't show errors to user during initialization
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentXP, currentLevel]);

  /**
   * Award XP with optimistic updates and server sync (with fallback)
   */
  const awardXP = useCallback(async (
    amount: number, 
    reason: string, 
    category: string
  ): Promise<XPUpdate | null> => {
    if (!user?.id || amount <= 0) return null;

    try {
      // Optimistic update - immediately show XP increase
      setPendingXP(prev => prev + amount);
      
      console.log('💰 [XPContext] Awarding XP (optimistic):', {
        amount,
        reason,
        category,
        pendingTotal: pendingXP + amount
      });

      // Try to call server function to award XP
      const { data, error: awardError } = await supabase.rpc('award_user_xp', {
        p_user_id: user.id,
        p_amount: amount,
        p_reason: reason,
        p_category: category
      });

      if (awardError) {
        // Check if it's a function not found error - fall back silently  
        if (awardError.message?.includes('function') || awardError.code === '42883') {
          console.log('🔄 [XPContext] Using local XP calculation (server functions not available)');
          
          // Local XP calculation fallback
          const newTotalXP = currentXP + amount;
          const newLevel = XPSystemUtils.calculateLevelFromXP(newTotalXP);
          const levelUp = newLevel > currentLevel;
          
          // Update state locally
          setCurrentXP(newTotalXP);
          setCurrentLevel(newLevel);
          setLastUpdated(new Date());
          setPendingXP(0);
          
          console.log('💰 [XPContext] Local XP awarded:', {
            amount,
            newTotal: newTotalXP,
            newLevel: newLevel,
            levelUp: levelUp
          });
          
          // Return mock response matching expected format
          return {
            xp_awarded: amount,
            new_level: newLevel,
            level_up: levelUp,
            milestone_unlocks: levelUp ? [`level_${newLevel}`] : []
          };
        }
        throw awardError; // Only throw for unexpected errors
      }

      if (data && data.length > 0) {
        const result = data[0];
        
        // Validate the XP update response
        if (isValidXPUpdate(result)) {
          const validatedUpdate = validateXPUpdate(result);
          
          // Calculate new totals since the function only returns the award amount and new level
          const newTotalXP = currentXP + validatedUpdate.xp_awarded;
          const newLevel = validatedUpdate.new_level;
          
          // Update state with calculated values
          setCurrentXP(newTotalXP);
          setCurrentLevel(newLevel);
          setLastUpdated(new Date());
          setPendingXP(0);
          
          console.log('✅ [XPContext] XP awarded successfully:', {
            xpAwarded: validatedUpdate.xp_awarded,
            newTotal: newTotalXP,
            newLevel: newLevel,
            levelUp: validatedUpdate.level_up,
            milestoneUnlocks: validatedUpdate.milestone_unlocks
          });
          
          return validatedUpdate;
        }
      }
      
      // If no valid data returned, use local fallback
      console.warn('⚠️ [XPContext] No valid server response, using local calculation');
      const newTotalXP = currentXP + amount;
      const newLevel = XPSystemUtils.calculateLevelFromXP(newTotalXP);
      const levelUp = newLevel > currentLevel;
      
      setCurrentXP(newTotalXP);
      setCurrentLevel(newLevel);
      setLastUpdated(new Date());
      setPendingXP(0);
      
      return {
        xp_awarded: amount,
        new_level: newLevel,
        level_up: levelUp,
        milestone_unlocks: levelUp ? [`level_${newLevel}`] : []
      };
      
    } catch (err: any) {
      // Handle network errors with silent local fallback
      if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
        console.log('🌐 [XPContext] Network unavailable during XP award, using local calculation');
        
        // Local XP calculation fallback
        const newTotalXP = currentXP + amount;
        const newLevel = XPSystemUtils.calculateLevelFromXP(newTotalXP);
        const levelUp = newLevel > currentLevel;
        
        setCurrentXP(newTotalXP);
        setCurrentLevel(newLevel);
        setLastUpdated(new Date());
        setPendingXP(0);
        
        console.log('💰 [XPContext] Offline XP awarded:', {
          amount,
          newTotal: newTotalXP,
          newLevel: newLevel,
          levelUp: levelUp
        });
        
        return {
          xp_awarded: amount,
          new_level: newLevel,
          level_up: levelUp,
          milestone_unlocks: levelUp ? [`level_${newLevel}`] : []
        };
      }
      
      // Only log other errors, don't show to user
      console.warn('⚠️ [XPContext] XP award issue (reverting):', err.message);
      
      // Rollback optimistic update on unexpected errors
      setPendingXP(prev => Math.max(0, prev - amount));
      // Don't set error state to avoid user-facing error messages
      
      return null;
    }
  }, [user?.id, pendingXP, currentXP, currentLevel]);

  /**
   * Sync XP with server (manual refresh)
   */
  const syncXP = useCallback(async () => {
    await fetchXPData();
  }, [fetchXPData]);

  /**
   * Refetch XP data (alias for sync)
   */
  const refetchXP = useCallback(async () => {
    await fetchXPData();
  }, [fetchXPData]);

  /**
   * Setup real-time subscription for XP updates (with silent fallback)
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id || isSubscribedRef.current) {
      return; // Skip silently
    }

    console.log('🔄 [XPContext] Attempting real-time XP subscription...');
    isSubscribedRef.current = true;

    // Create unique channel name per user
    const channelName = `xp_updates_${user.id}_${Date.now()}`;
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xp_transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('🔔 [XPContext] Real-time XP update received');
          
          // Debounce server sync to avoid rapid-fire updates
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          
          syncTimeoutRef.current = setTimeout(() => {
            fetchXPData();
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'level_progressions',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('🎉 [XPContext] Real-time level progression update');
          fetchXPData();
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 [XPContext] Real-time XP sync active');
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('📡 [XPContext] Real-time sync unavailable (using local XP system)');
          isSubscribedRef.current = false;
          setIsConnected(false);
        }
      });

    subscriptionRef.current = subscription;
  }, [user?.id, fetchXPData]);

  /**
   * Cleanup real-time subscription
   */
  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    
    isSubscribedRef.current = false;
    setIsConnected(false);
  }, []);

  // Initialize XP data and real-time subscription
  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      fetchXPData();
      setupRealtimeSubscription();
    } else {
      // Reset state when user logs out
      setCurrentXP(0);
      setCurrentLevel(1);
      setPendingXP(0);
      setIsLoading(false);
      setError(null);
      setLastUpdated(null);
      cleanupSubscription();
    }

    return cleanupSubscription;
  }, [user?.id, fetchXPData, setupRealtimeSubscription, cleanupSubscription]);

  // Periodic sync fallback (less aggressive for local mode)
  useEffect(() => {
    if (!user?.id || !isConnected) return;

    const interval = setInterval(() => {
      // Only sync if we're actually connected to real-time updates
      fetchXPData();
    }, 60000); // 60 seconds - less aggressive

    return () => clearInterval(interval);
  }, [user?.id, isConnected, fetchXPData]);

  const contextValue: XPContextState = {
    currentXP,
    currentLevel,
    isLoading,
    error,
    xpProgress,
    awardXP,
    syncXP,
    refetchXP,
    isConnected,
    lastUpdated,
    pendingXP,
    setPendingXP,
  };

  return (
    <XPContext.Provider value={contextValue}>
      {children}
    </XPContext.Provider>
  );
}

/**
 * Hook to use XP system context
 */
export function useXPContext(): XPContextState {
  const context = useContext(XPContext);
  if (context === undefined) {
    throw new Error('useXPContext must be used within an XPProvider');
  }
  return context;
} 