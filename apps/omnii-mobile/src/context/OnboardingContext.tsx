import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '~/context/AuthContext';
import { useXPContext } from '~/context/XPContext';
import { useOnboarding } from '~/hooks/useOnboarding';
import { supabase } from '~/lib/supabase';
import type { 
  OnboardingState, 
  OnboardingAction, 
  OnboardingQuote,
  OnboardingData,
  HolisticPreferences,
  AIPersonality,
  AITuningPreferences
} from '~/types/onboarding';

// SECURITY: Server-side validation functions (replaces all client-side calculations)
const syncUserOnboardingSecure = async (userId: string) => {
  const { data, error } = await supabase.rpc('sync_user_onboarding_secure', {
    p_user_id: userId
  });
  
  if (error) {
    console.error('🚨 Server sync failed:', error);
    throw error;
  }
  
  return data;
};

// Initial state - focused only on onboarding flow
const initialState: OnboardingState = {
  isActive: false,
  currentQuoteIndex: 0,
  quotes: [],
  responses: [],
  onboardingData: {
    completed: false,
    current_level: 1,
    total_xp: 0,
    onboarding_xp: 0,
    highest_level_achieved: 1,
    feature_exploration: {},
    active_nudges: [],
  },
  unlockedFeatures: ['approvals'], // Deprecated - use XPContext
  pendingUnlocks: [],
  celebrationQueue: [], // Deprecated - use XPContext
  isLoading: false,
};

// Simplified reducer focused on onboarding flow
function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'START_ONBOARDING':
      return {
        ...state,
        isActive: true,
        currentQuoteIndex: 0,
        quotes: action.payload.quotes,
        responses: [],
        session: {
          id: action.payload.sessionId,
          user_id: '',
          started_at: new Date().toISOString(),
          total_quotes_shown: action.payload.quotes.length,
          quotes_approved: 0,
          quotes_declined: 0,
          discord_cta_shown: false,
          discord_cta_clicked: false,
        },
      };

    case 'RECORD_QUOTE_RESPONSE':
      const newResponse = {
        id: `${Date.now()}`,
        user_id: '',
        quote_id: action.payload.quoteId,
        action: action.payload.action,
        time_spent_ms: action.payload.timeSpent,
        confidence_score: 1.0,
        created_at: new Date().toISOString(),
      };
      
      return {
        ...state,
        responses: [...state.responses, newResponse],
        session: state.session ? {
          ...state.session,
          quotes_approved: action.payload.action === 'approve' 
            ? state.session.quotes_approved + 1 
            : state.session.quotes_approved,
          quotes_declined: action.payload.action === 'decline' 
            ? state.session.quotes_declined + 1 
            : state.session.quotes_declined,
        } : undefined,
      };

    case 'ADVANCE_QUOTE':
      return {
        ...state,
        currentQuoteIndex: Math.min(state.currentQuoteIndex + 1, state.quotes.length),
      };

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        isActive: false,
        onboardingData: {
          ...state.onboardingData,
          completed: true,
          level_5_achieved_at: new Date().toISOString(),
        },
        session: state.session ? {
          ...state.session,
          completed_at: new Date().toISOString(),
          final_level_reached: action.payload.finalLevel,
          final_xp_earned: action.payload.totalXP,
          completion_rate: 100,
        } : undefined,
      };

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        holisticPreferences: { ...state.holisticPreferences, ...action.payload } as HolisticPreferences,
      };

    case 'UPDATE_AI_PERSONALITY':
      return {
        ...state,
        aiPersonality: { ...state.aiPersonality, ...action.payload } as AIPersonality,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'RESET_ONBOARDING':
      return initialState;

    case 'LOAD_STATE':
      // SECURITY: Load server-validated data only
      const loadedData = action.payload.onboardingData || state.onboardingData;
      
      return {
        ...state,
        onboardingData: loadedData,
        holisticPreferences: action.payload.holisticPreferences || state.holisticPreferences,
      };

    // Deprecated actions - now handled by XPContext
    case 'AWARD_XP':
    case 'LEVEL_UP':
    case 'UNLOCK_FEATURE':
    case 'SHOW_CELEBRATION':
    case 'RECORD_FEATURE_VISIT':
    case 'CREATE_NUDGE':
    case 'DISMISS_NUDGE':
    case 'MARK_NUDGE_SHOWN':
    case 'CLEAN_EXPIRED_NUDGES':
    case 'CLEAR_ALL_NUDGES':
      console.warn('⚠️ [OnboardingContext] Deprecated action:', action.type, '- Use XPContext instead');
      return state;

    default:
      return state;
  }
}

// Simplified context interface focused on onboarding
interface OnboardingContextValue {
  state: OnboardingState;
  
  // Core onboarding actions
  startOnboarding: () => Promise<void>;
  recordQuoteResponse: (quoteId: string, action: 'approve' | 'decline', timeSpent: number) => Promise<{
    xp_awarded: number;
    level_up: boolean;
    new_level: number;
    milestone_unlocks: string[];
  } | null>;
  advanceToNextQuote: () => void;
  completeOnboarding: () => Promise<void>;
  
  // Preferences management
  updateHolisticPreferences: (preferences: Partial<HolisticPreferences>) => void;
  updateAIPersonality: (personality: Partial<AIPersonality>) => void;
  updateAITuning: (tuning: AITuningPreferences) => void;
  
  // Utilities
  getCurrentQuote: () => OnboardingQuote | null;
  isOnboardingComplete: () => boolean;
  getProgressPercentage: () => number;
  
  // System state
  isSystemReady: boolean;
  
  // Reset
  resetOnboarding: () => void;
  debugResetOnboarding: () => Promise<void>;
}

// Create context
const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

// Provider component
interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user } = useAuth();
  const { currentLevel, isFeatureUnlocked } = useXPContext(); // Remove awardXP - keep OnboardingContext pure
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const onboardingHook = useOnboarding();
  const initializationCompletedRef = useRef(false);
  const saveInProgressRef = useRef(false);

  // SECURITY: Server-side sync function (replaces all client-side calculations)
  const syncWithServer = useCallback(async () => {
    if (!user || saveInProgressRef.current) return;

    saveInProgressRef.current = true;

    try {
      console.log('🔒 SECURE SYNC: Server validation for', user.email);
      
      const serverData = await syncUserOnboardingSecure(user.id);
      
      console.log('✅ Server response:', {
        level: serverData.onboarding.current_level,
        xp: serverData.onboarding.total_xp,
        completed: serverData.onboarding.completed,
        serverValidated: serverData.onboarding.server_validated
      });

      dispatch({
        type: 'LOAD_STATE',
        payload: {
          onboardingData: serverData.onboarding,
          holisticPreferences: serverData.holistic_preferences,
        },
      });

    } catch (error) {
      console.error('❌ Server sync failed:', error);
    } finally {
      saveInProgressRef.current = false;
    }
  }, [user]);

  // SECURITY: Single initialization effect (server-side only)
  useEffect(() => {
    if (!user || initializationCompletedRef.current) return;

    const initializeOnboarding = async () => {
      try {
        console.log('🔒 SECURE INIT: Loading onboarding data for', user.email);
        
        await syncWithServer();
        initializationCompletedRef.current = true;
        
        console.log('✅ Initialization complete - ready for auto-start checks');
      } catch (error) {
        console.error('🚨 Initialization failed:', error);
      }
    };

    initializeOnboarding();
  }, [user?.id, syncWithServer]);

  // QUOTE LOADING STATUS: Log when quotes become available
  useEffect(() => {
    if (onboardingHook.quotes.length > 0) {
      console.log('📚 QUOTES AVAILABLE:', {
        count: onboardingHook.quotes.length,
        isHookLoading: onboardingHook.isLoading,
        hasError: !!onboardingHook.error,
        readyForOnboarding: !onboardingHook.isLoading && !onboardingHook.error
      });
    } else if (onboardingHook.error) {
      console.error('❌ QUOTE LOADING FAILED:', onboardingHook.error);
    }
  }, [onboardingHook.quotes.length, onboardingHook.isLoading, onboardingHook.error]);

  // COMPONENT READINESS: Track when system is ready for auto-start
  const isSystemReady = useMemo(() => {
    const ready = 
      initializationCompletedRef.current && // Server sync completed
      onboardingHook.quotes.length > 0 && // Quotes loaded
      !onboardingHook.error; // No errors
    
    if (__DEV__ && ready) {
      console.log('✅ SYSTEM READY for auto-start:', {
        serverSyncComplete: initializationCompletedRef.current,
        quotesLoaded: onboardingHook.quotes.length,
        hookHasError: !!onboardingHook.error,
        note: 'Removed loading sensitivity for stability'
      });
    }
    
    return ready;
  }, [
    onboardingHook.quotes.length,
    onboardingHook.error,
  ]);

  // SECURITY: Periodic sync with server (replaces client-side saves)  
  useEffect(() => {
    if (!initializationCompletedRef.current) return;

    // During onboarding, sync less frequently to avoid race conditions
    const syncInterval = state.onboardingData.completed ? 30000 : 60000; // 30s vs 60s
    
    const timeoutId = setTimeout(() => {
      syncWithServer();
    }, syncInterval);

    return () => clearTimeout(timeoutId);
  }, [
    state.onboardingData.current_level,
    state.onboardingData.total_xp,
    state.onboardingData.completed,
    syncWithServer
  ]);

  // Update onboarding data based on XPContext level changes
  useEffect(() => {
    if (state.onboardingData && currentLevel !== state.onboardingData.current_level) {
      console.log('🔄 [OnboardingContext] Syncing with XPContext level change:', {
        onboardingLevel: state.onboardingData.current_level,
        xpContextLevel: currentLevel,
        action: 'Updating onboarding state to match XPContext'
      });
      
      // Update onboarding data to match XPContext level immediately
      dispatch({
        type: 'LOAD_STATE',
        payload: {
          onboardingData: {
            ...state.onboardingData,
            current_level: currentLevel, // Sync with XPContext
            completed: currentLevel >= 5, // Onboarding completes at level 5
          },
          holisticPreferences: state.holisticPreferences,
        },
      });
    }
  }, [currentLevel, state.onboardingData, state.holisticPreferences]);

  // Context value implementation - simplified to onboarding only
  const value: OnboardingContextValue = {
    state,

    // Core onboarding actions
    startOnboarding: async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        console.log('🎯 START_ONBOARDING called', {
          quotesLoaded: onboardingHook.quotes.length,
          isHookLoading: onboardingHook.isLoading,
          hasError: !!onboardingHook.error,
          error: onboardingHook.error
        });

        // Check if quotes are available immediately - no waiting/retrying
        if (onboardingHook.quotes.length === 0) {
          const errorMsg = onboardingHook.error 
            ? `Quote loading failed: ${onboardingHook.error}`
            : 'Quotes not loaded yet. This should be handled by proper component lifecycle.';
          
          console.error('❌ No quotes available for onboarding start');
          console.error('🔍 Hook state:', {
            quotesLength: onboardingHook.quotes.length,
            isLoading: onboardingHook.isLoading,
            error: onboardingHook.error
          });
          
          throw new Error(errorMsg);
        }

        console.log('🎯 Starting onboarding session with', onboardingHook.quotes.length, 'quotes from database');
        const sessionId = await onboardingHook.startOnboarding();
        
        if (sessionId) {
          // Randomize quotes for better data gathering
          const shuffledQuotes = [...onboardingHook.quotes].sort(() => Math.random() - 0.5);
          
          console.log('✅ Onboarding session created:', sessionId, 'with', shuffledQuotes.length, 'real quotes from database');
          
          dispatch({
            type: 'START_ONBOARDING',
            payload: {
              quotes: shuffledQuotes,
              sessionId,
            },
          });
        } else {
          throw new Error('Failed to create onboarding session');
        }
      } catch (error) {
        console.error('❌ Start onboarding failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        dispatch({ type: 'SET_ERROR', payload: `Failed to start onboarding: ${errorMessage}` });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    recordQuoteResponse: async (quoteId: string, action: 'approve' | 'decline', timeSpent: number) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        // Record response locally
        dispatch({
          type: 'RECORD_QUOTE_RESPONSE',
          payload: { quoteId, action, timeSpent },
        });

        // Send to database and get XP/level data
        const result = await onboardingHook.recordQuoteResponse(quoteId, action, timeSpent);
        
        if (result) {
          console.log('✅ [OnboardingContext] Quote response recorded:', {
            quoteId,
            action,
            xpAwarded: result.xp_awarded,
            levelUp: result.level_up,
            newLevel: result.new_level
          });
        }

        // Only advance to next quote if we haven't completed onboarding
        if (currentLevel < 5) {
          dispatch({ type: 'ADVANCE_QUOTE' });
        } else {
          // Complete onboarding when Level 5 is reached
          dispatch({
            type: 'COMPLETE_ONBOARDING',
            payload: {
              finalLevel: currentLevel,
              totalXP: result?.xp_awarded || 0,
            },
          });
        }

        // Return result so calling component can handle XP awarding
        return result;

      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to record response' });
        throw error; // Re-throw so calling component can handle
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    advanceToNextQuote: () => {
      dispatch({ type: 'ADVANCE_QUOTE' });
    },

    completeOnboarding: async () => {
      try {
        await onboardingHook.completeOnboarding();
        dispatch({
          type: 'COMPLETE_ONBOARDING',
          payload: {
            finalLevel: currentLevel,
            totalXP: state.onboardingData.total_xp,
          },
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to complete onboarding' });
      }
    },

    // Preferences management
    updateHolisticPreferences: (preferences: Partial<HolisticPreferences>) => {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
    },

    updateAIPersonality: (personality: Partial<AIPersonality>) => {
      dispatch({ type: 'UPDATE_AI_PERSONALITY', payload: personality });
    },

    updateAITuning: (tuning: AITuningPreferences) => {
      // Implementation needed
    },

    // Utilities
    getCurrentQuote: () => {
      if (state.currentQuoteIndex < state.quotes.length) {
        return state.quotes[state.currentQuoteIndex] || null;
      }
      return null;
    },

    isOnboardingComplete: () => {
      return state.onboardingData.completed;
    },

    getProgressPercentage: () => {
      if (state.quotes.length === 0) return 0;
      return Math.round((state.currentQuoteIndex / state.quotes.length) * 100);
    },

    // Reset
    resetOnboarding: () => {
      dispatch({ type: 'RESET_ONBOARDING' });
    },

    // Debug functions for testing
    debugResetOnboarding: async () => {
      if (!user) return;
      
      console.log('🔧 SECURE RESET: Starting complete onboarding reset...');
      
      try {
        // Step 1: Call server-side reset function (clears ALL data)
        const { data: resetResult, error } = await supabase.rpc('reset_user_onboarding_complete', {
          p_user_id: user.id
        });
        
        if (error) {
          console.error('❌ Server reset failed:', error);
          throw error;
        }
        
        console.log('✅ Server reset successful:', resetResult);
        
        // Step 2: Clear local state
        dispatch({ type: 'RESET_ONBOARDING' });
        
        // Step 3: Clear AsyncStorage
        await AsyncStorage.removeItem('@omnii_onboarding_state');
        
        // Step 4: Reset initialization flag so sync runs again
        initializationCompletedRef.current = false;
        saveInProgressRef.current = false;
        
        // Step 5: Force immediate sync to get fresh data
        await syncWithServer();
        
        console.log('🎉 COMPLETE RESET SUCCESS! Onboarding ready to start.');
        console.log('📝 Check state: Level 1, 0 XP, Not completed, Quotes should start on approvals screen');
        
      } catch (error) {
        console.error('❌ Secure reset failed:', error);
      }
    },

    // System state
    isSystemReady,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Hook to use onboarding context
export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
} 