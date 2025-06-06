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
  LevelProgression,
  ContextualNudge,
  FeatureExploration,
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

const recordFeatureVisitSecure = async (userId: string, featureName: string) => {
  const { data, error } = await supabase.rpc('record_feature_visit_secure', {
    p_user_id: userId,
    p_feature_name: featureName
  });
  
  if (error) {
    console.error('🚨 Feature visit recording failed:', error);
    throw error;
  }
  
  return data[0]; // Returns single row
};

const getUserLevelXP = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_user_level_xp', {
    p_user_id: userId
  });
  
  if (error) {
    console.error('🚨 Get level/XP failed:', error);
    throw error;
  }
  
  return data[0]; // Returns single row
};

// SECURITY: Helper function to get unlocked features for a level (matches server-side logic)
function getUnlockedFeaturesForLevel(level: number): string[] {
  const features: string[] = ['approvals']; // Always available
  
  if (level >= 2) features.push('achievements');
  if (level >= 3) features.push('chat', 'voice_commands');
  if (level >= 4) features.push('analytics');
  if (level >= 5) features.push('profile'); // ALL CORE FEATURES
  if (level >= 6) features.push('advanced_insights', 'habit_tracking');
  if (level >= 10) features.push('predictive_analytics', 'team_features');
  
  return features;
}

// Initial state
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
  unlockedFeatures: ['approvals'],
  pendingUnlocks: [],
  celebrationQueue: [],
  isLoading: false,
};

// Reducer
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

    case 'AWARD_XP':
      const newTotalXP = state.onboardingData.total_xp + action.payload.amount;
      const newOnboardingXP = state.onboardingData.onboarding_xp + action.payload.amount;
      
      // Only update XP, don't automatically calculate levels
      // Let the LEVEL_UP action handle level progression properly
      return {
        ...state,
        onboardingData: {
          ...state.onboardingData,
          total_xp: newTotalXP,
          onboarding_xp: newOnboardingXP,
          // Keep current level - only change via LEVEL_UP action
        },
      };

    case 'LEVEL_UP':
      const levelProgression = action.payload;
      const newUnlockedFeatures = getUnlockedFeaturesForLevel(levelProgression.to_level);
      const previousUnlockedFeatures = getUnlockedFeaturesForLevel(levelProgression.from_level);
      
      // Find newly unlocked features
      const justUnlocked = newUnlockedFeatures.filter(feature => !previousUnlockedFeatures.includes(feature));
      
      // Check for existing nudges to avoid duplicates
      const existingNudgeFeatures = state.onboardingData.active_nudges.map(n => n.feature_name);
      
      // Create nudges only for newly unlocked features that don't already have nudges
      const newNudges = justUnlocked
        .filter(feature => !existingNudgeFeatures.includes(feature))
        .map(feature => createFeatureNudge(feature, levelProgression.to_level))
        .filter(Boolean) as ContextualNudge[];
      
      return {
        ...state,
        onboardingData: {
          ...state.onboardingData,
          current_level: levelProgression.to_level,
          highest_level_achieved: Math.max(
            state.onboardingData.highest_level_achieved, 
            levelProgression.to_level
          ),
          last_level_up_at: levelProgression.achieved_at,
          // Add new nudges with delays
          active_nudges: [...state.onboardingData.active_nudges, ...newNudges],
        },
        unlockedFeatures: newUnlockedFeatures,
        celebrationQueue: [...state.celebrationQueue, levelProgression],
      };

    case 'UNLOCK_FEATURE':
      if (!state.unlockedFeatures.includes(action.payload.feature)) {
        return {
          ...state,
          unlockedFeatures: [...state.unlockedFeatures, action.payload.feature],
          pendingUnlocks: [...state.pendingUnlocks, action.payload.feature],
        };
      }
      return state;

    case 'SHOW_CELEBRATION':
      return {
        ...state,
        celebrationQueue: state.celebrationQueue.filter(c => c.id !== action.payload),
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
      const serverUnlockedFeatures = getUnlockedFeaturesForLevel(loadedData.current_level);
      
      // PERSISTENT TAB UNLOCKING: Never downgrade unlocked features
      // Once a feature is unlocked, it should stay unlocked
      const persistentUnlockedFeatures = (() => {
        const currentFeatures = new Set(state.unlockedFeatures);
        const serverFeatures = new Set(serverUnlockedFeatures);
        
        // Union of current and server features - never remove features
        const allFeatures = new Set([...currentFeatures, ...serverFeatures]);
        
        console.log('🔓 TAB PERSISTENCE CHECK:', {
          serverLevel: loadedData.current_level,
          serverFeatures: Array.from(serverFeatures),
          currentFeatures: Array.from(currentFeatures),
          finalFeatures: Array.from(allFeatures),
          neverDowngrade: 'Features once unlocked stay unlocked'
        });
        
        return Array.from(allFeatures);
      })();
      
      // Log validation results for debugging
      if (__DEV__) {
        console.log('📥 LOAD_STATE (Server-Validated):', {
          serverLevel: loadedData.current_level,
          currentLevel: state.onboardingData.current_level,
          serverXP: loadedData.total_xp,
          currentXP: state.onboardingData.total_xp,
          serverFeatures: serverUnlockedFeatures,
          currentFeatures: state.unlockedFeatures,
          finalFeatures: persistentUnlockedFeatures,
          completed: loadedData.completed,
          tabPersistence: 'ENABLED - No downgrading'
        });
      }
      
      // Filter out invalid nudges
      const validNudges = (loadedData.active_nudges || []).filter((nudge: ContextualNudge) => {
        return persistentUnlockedFeatures.includes(nudge.feature_name) && nudge.shown !== undefined;
      });
      
      return {
        ...state,
        onboardingData: {
          ...loadedData,
          active_nudges: validNudges,
        },
        holisticPreferences: action.payload.holisticPreferences || state.holisticPreferences,
        unlockedFeatures: persistentUnlockedFeatures,
      };

    // New: Feature exploration actions
    case 'RECORD_FEATURE_VISIT':
      const { feature, isFirstVisit } = action.payload;
      const existingExploration = state.onboardingData.feature_exploration[feature];
      
      return {
        ...state,
        onboardingData: {
          ...state.onboardingData,
          feature_exploration: {
            ...state.onboardingData.feature_exploration,
            [feature]: {
              feature_name: feature,
              first_visit_at: existingExploration?.first_visit_at || (isFirstVisit ? new Date().toISOString() : undefined),
              visit_count: (existingExploration?.visit_count || 0) + 1,
              xp_rewarded: isFirstVisit ? true : (existingExploration?.xp_rewarded || false),
              nudge_dismissed: existingExploration?.nudge_dismissed || false,
              last_nudge_shown: existingExploration?.last_nudge_shown,
            },
          },
        },
      };

    case 'CREATE_NUDGE':
      return {
        ...state,
        onboardingData: {
          ...state.onboardingData,
          active_nudges: [...state.onboardingData.active_nudges, action.payload],
        },
      };

    case 'DISMISS_NUDGE':
      const nudgeId = action.payload;
      return {
        ...state,
        onboardingData: {
          ...state.onboardingData,
          active_nudges: state.onboardingData.active_nudges.map(nudge =>
            nudge.id === nudgeId ? { ...nudge, dismissed: true } : nudge
          ),
          feature_exploration: {
            ...state.onboardingData.feature_exploration,
            // Mark the feature's nudge as dismissed
            ...Object.fromEntries(
              Object.entries(state.onboardingData.feature_exploration).map(([key, exploration]) => [
                key,
                state.onboardingData.active_nudges.find(n => n.id === nudgeId)?.feature_name === key
                  ? { ...exploration, nudge_dismissed: true }
                  : exploration
              ])
            ),
          },
        },
      };

    case 'MARK_NUDGE_SHOWN':
      const nudgeIdToMarkShown = action.payload;
      return {
        ...state,
        onboardingData: {
          ...state.onboardingData,
          active_nudges: state.onboardingData.active_nudges.map(nudge =>
            nudge.id === nudgeIdToMarkShown ? { ...nudge, shown: true } : nudge
          ),
        },
      };

    case 'CLEAN_EXPIRED_NUDGES':
      const now = new Date();
      return {
        ...state,
        onboardingData: {
          ...state.onboardingData,
          active_nudges: state.onboardingData.active_nudges.filter(nudge => {
            const createdAt = new Date(nudge.created_at);
            const expireTime = new Date(createdAt.getTime() + nudge.dismiss_after_hours * 60 * 60 * 1000);
            return now < expireTime && !nudge.dismissed;
          }),
        },
      };

    case 'CLEAR_ALL_NUDGES':
      return {
        ...state,
        onboardingData: {
          ...state.onboardingData,
          active_nudges: [],
        },
      };

    default:
      return state;
  }
}

// Helper function to create contextual nudges for newly unlocked features
function createFeatureNudge(feature: string, level: number): ContextualNudge | null {
  const nudgeConfigs = {
    achievements: {
      title: "🏆 Your Achievement System is Ready!",
      message: "Start tracking your productivity milestones and unlock rewards as you grow. Your journey to mastery begins here!",
      icon: "🏆",
      xp_reward: 25,
      trigger_delay_minutes: 0, // Show immediately after level celebration
      dismiss_after_hours: 24, // Auto-dismiss after 24 hours
    },
    chat: {
      title: "💬 Your AI Assistant Awaits!",
      message: "Meet your personal productivity companion. Get instant help, tips, and use voice commands to supercharge your workflow!",
      icon: "💬", 
      xp_reward: 30,
      trigger_delay_minutes: 0, // Show immediately after level celebration
      dismiss_after_hours: 48, // Auto-dismiss after 48 hours
    },
    analytics: {
      title: "📊 Unlock Your Productivity Insights!",
      message: "Discover when you're most productive, track your progress, and get personalized recommendations based on your work patterns.",
      icon: "📊",
      xp_reward: 35,
      trigger_delay_minutes: 0, // Show immediately after level celebration
      dismiss_after_hours: 72, // Auto-dismiss after 72 hours
    },
    profile: {
      title: "👤 Make OMNII Truly Yours!",
      message: "Customize your AI's personality, fine-tune your experience, and join our vibrant community of productivity enthusiasts.",
      icon: "👤",
      xp_reward: 40,
      trigger_delay_minutes: 0, // Show immediately after level celebration
      dismiss_after_hours: 168, // Auto-dismiss after 1 week
    }
  };

  const config = nudgeConfigs[feature as keyof typeof nudgeConfigs];
  if (!config) return null;

  return {
    id: `nudge_${feature}_${Date.now()}`,
    feature_name: feature,
    title: config.title,
    message: config.message,
    icon: config.icon,
    xp_reward: config.xp_reward,
    trigger_delay_minutes: config.trigger_delay_minutes,
    dismiss_after_hours: config.dismiss_after_hours,
    created_at: new Date().toISOString(),
    dismissed: false,
    shown: false,
  };
}

// Context interface
interface OnboardingContextValue {
  state: OnboardingState;
  
  // Core actions
  startOnboarding: () => Promise<void>;
  recordQuoteResponse: (quoteId: string, action: 'approve' | 'decline', timeSpent: number) => Promise<void>;
  advanceToNextQuote: () => void;
  completeOnboarding: () => Promise<void>;
  
  // Level/XP actions
  awardXP: (amount: number, reason: string, category: string) => Promise<void>;
  triggerLevelUp: (progression: LevelProgression) => void;
  
  // Feature management
  unlockFeature: (feature: string, level: number) => void;
  isFeatureUnlocked: (feature: string) => boolean;
  getTabsForLevel: (level: number) => string[];
  
  // Celebrations
  showCelebration: (celebrationId: string) => void;
  getNextCelebration: () => LevelProgression | null;
  
  // Preferences
  updateHolisticPreferences: (preferences: Partial<HolisticPreferences>) => void;
  updateAIPersonality: (personality: Partial<AIPersonality>) => void;
  updateAITuning: (tuning: AITuningPreferences) => void;
  
  // Utilities
  getCurrentQuote: () => OnboardingQuote | null;
  isOnboardingComplete: () => boolean;
  getCurrentLevel: () => number;
  getProgressPercentage: () => number;
  getXPProgressToNextLevel: () => number;
  getXPNeededForNextLevel: () => number;
  
  // System state
  isSystemReady: boolean;
  
  // New: Feature exploration and nudges
  recordFeatureVisit: (feature: string) => Promise<void>;
  getActiveNudges: () => ContextualNudge[];
  dismissNudge: (nudgeId: string) => void;
  markNudgeShown: (nudgeId: string) => void;
  clearAllNudges: () => void;
  hasVisitedFeature: (feature: string) => boolean;
  getFeatureExploration: (feature: string) => FeatureExploration | null;
  
  // Reset
  resetOnboarding: () => void;
  
  // Debug functions for testing
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
  const { awardXP: unifiedAwardXP, syncXP: syncUnifiedXP } = useXPContext();
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const onboardingHook = useOnboarding();

  // SECURITY: Refs to prevent race conditions
  const saveInProgressRef = useRef(false);
  const initializationCompletedRef = useRef(false);

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

  // Handle delayed nudge creation
  useEffect(() => {
    const nudgesToShow = state.onboardingData.active_nudges.filter(nudge => {
      const createdAt = new Date(nudge.created_at);
      const showTime = new Date(createdAt.getTime() + nudge.trigger_delay_minutes * 60 * 1000);
      const now = new Date();
      return now >= showTime && !nudge.dismissed;
    });

    // Create timers for nudges that haven't been triggered yet
    state.onboardingData.active_nudges.forEach(nudge => {
      if (!nudge.dismissed) {
        const createdAt = new Date(nudge.created_at);
        const showTime = new Date(createdAt.getTime() + nudge.trigger_delay_minutes * 60 * 1000);
        const now = new Date();
        const delay = showTime.getTime() - now.getTime();

        if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Max 24 hours
          const timeoutId = setTimeout(() => {
            // Nudge is ready to be shown - will be handled by UI components
            console.log(`🔔 Nudge ready: ${nudge.title}`);
          }, delay);

          return () => clearTimeout(timeoutId);
        }
      }
    });
  }, [state.onboardingData.active_nudges]);

  // Clean up expired nudges every hour
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      dispatch({ type: 'CLEAN_EXPIRED_NUDGES' });
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(cleanupInterval);
  }, []);

  // Context value implementation
  const value: OnboardingContextValue = {
    state,

    // Core actions
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
          // Award XP using unified system instead of local dispatch
          console.log('💰 [OnboardingContext] Awarding XP via unified system:', {
            amount: result.xp_awarded,
            reason: `Quote ${action}`,
            category: 'onboarding'
          });
          
          // Sync unified XP system after server XP award
          await syncUnifiedXP();

          // Check if we should level up (server-side validation)
          const currentLevel = state.onboardingData.current_level;
          const newTotalXP = state.onboardingData.total_xp + result.xp_awarded;
          
          // Log for debugging
          if (__DEV__) {
            console.log('📝 Quote Response XP:', {
              quoteId,
              action,
              xpAwarded: result.xp_awarded,
              currentLevel,
              currentXP: state.onboardingData.total_xp,
              newTotalXP
            });
          }
          
          // SECURITY: Use server function to determine level up
          // The server has already validated the level in the recordQuoteResponse function
          if (result.level_up && result.new_level > currentLevel) {
            const nextLevel = result.new_level;
            
            // Only level up if we haven't already leveled up
            setTimeout(() => {
              // Re-check current level from the latest state
              const latestState = state.onboardingData;
              const latestLevel = latestState.current_level;
              
              // Only proceed if we haven't already leveled up
              if (latestLevel === currentLevel) {
                console.log(`🎮 Level Up from Quote: ${currentLevel} → ${nextLevel} (${newTotalXP} XP)`);
                
                const getMilestoneUnlocks = (level: number) => {
                  switch (level) {
                    case 2: return ['achievements_full'];
                    case 3: return ['chat_full', 'voice_commands'];
                    case 4: return ['analytics_full'];
                    case 5: return ['profile_full', 'ALL_CORE_FEATURES'];
                    case 6: return ['advanced_insights', 'habit_tracking'];
                    case 10: return ['predictive_analytics', 'team_features'];
                    case 15: return ['automations', 'api_access'];
                    case 20: return ['mentor_mode', 'community_leadership'];
                    default: return [];
                  }
                };

                const levelProgression: LevelProgression = {
                  id: `${Date.now()}`,
                  user_id: user?.id || '',
                  from_level: currentLevel,
                  to_level: nextLevel,
                  xp_at_level_up: newTotalXP,
                  milestone_unlocks: getMilestoneUnlocks(nextLevel),
                  celebration_shown: false,
                  unlock_animations_played: [],
                  achieved_at: new Date().toISOString(),
                };

                dispatch({ type: 'LEVEL_UP', payload: levelProgression });

                // Complete onboarding when Level 5 is reached (ALL CORE FEATURES UNLOCKED!)
                if (nextLevel === 5 && !state.onboardingData.completed) {
                  setTimeout(() => {
                    dispatch({
                      type: 'COMPLETE_ONBOARDING',
                      payload: {
                        finalLevel: nextLevel,
                        totalXP: newTotalXP,
                      },
                    });
                    console.log('🎉 Onboarding automatically completed at Level 5!');
                  }, 2000); // Allow celebration to show first
                }
              } else {
                console.log(`⏭️ Skipping quote level up - already at level ${latestLevel}`);
              }
            }, 100); // Small delay to let state update
          }
        }

        // Only advance to next quote if we haven't completed onboarding
        if (state.onboardingData.current_level < 5) {
          dispatch({ type: 'ADVANCE_QUOTE' });
        }

        // Remove the old completion check based on quote count
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to record response' });
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
            finalLevel: state.onboardingData.current_level,
            totalXP: state.onboardingData.total_xp,
          },
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to complete onboarding' });
      }
    },

    // Level/XP actions (SECURITY: Server handles all calculations)
    awardXP: async (amount: number, reason: string, category: string) => {
      // Log XP award for debugging
      if (__DEV__) {
        console.log('💰 [OnboardingContext] Awarding XP via unified system:', {
          amount,
          reason,
          category,
          currentLevel: state.onboardingData.current_level,
          currentXP: state.onboardingData.total_xp,
        });
      }
      
      // Use unified XP system instead of local dispatch
      if (user) {
        await unifiedAwardXP(amount, reason, category);
      }
    },

    triggerLevelUp: (progression: LevelProgression) => {
      dispatch({ type: 'LEVEL_UP', payload: progression });
    },

    // Feature management
    unlockFeature: (feature: string, level: number) => {
      dispatch({ type: 'UNLOCK_FEATURE', payload: { feature, level } });
    },

    isFeatureUnlocked: (feature: string) => {
      return state.unlockedFeatures.includes(feature);
    },

    getTabsForLevel: (level: number) => {
      return getUnlockedFeaturesForLevel(level).filter(feature => 
        ['approvals', 'achievements', 'chat', 'analytics', 'profile'].includes(feature)
      );
    },

    // Celebrations
    showCelebration: (celebrationId: string) => {
      dispatch({ type: 'SHOW_CELEBRATION', payload: celebrationId });
    },

    getNextCelebration: () => {
      return state.celebrationQueue[0] || null;
    },

    // Preferences
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

    getCurrentLevel: () => {
      return state.onboardingData.current_level;
    },

    getProgressPercentage: () => {
      if (state.quotes.length === 0) return 0;
      return Math.round((state.currentQuoteIndex / state.quotes.length) * 100);
    },

    getXPProgressToNextLevel: () => {
      // SECURITY: Get progress from server state (already validated)
      const currentLevel = state.onboardingData.current_level;
      const currentXP = state.onboardingData.total_xp;
      
      // Use server-provided progress data if available
      if ((state.onboardingData as any).xp_progress_percentage !== undefined) {
        return (state.onboardingData as any).xp_progress_percentage;
      }
      
      // Fallback calculation for backward compatibility
      if (currentLevel >= 50) return 100;
      return Math.min(100, Math.max(0, Math.round((currentXP / (currentLevel * 150)) * 100)));
    },

    getXPNeededForNextLevel: () => {
      // SECURITY: Get XP needed from server state
      if ((state.onboardingData as any).xp_needed_for_next_level !== undefined) {
        return (state.onboardingData as any).xp_needed_for_next_level;
      }
      
      // Fallback for backward compatibility
      const currentLevel = state.onboardingData.current_level;
      if (currentLevel >= 50) return 0;
      return Math.max(0, (currentLevel + 1) * 150 - state.onboardingData.total_xp);
    },

    // New: Feature exploration and nudges
    recordFeatureVisit: async (feature: string) => {
      if (!user) return;
      
      try {
        // SECURITY: Use server-side function for feature visit recording
        const result = await recordFeatureVisitSecure(user.id, feature);
        
        console.log('🔒 Secure feature visit recorded:', {
          feature,
          xpAwarded: result.xp_awarded,
          isFirstVisit: result.is_first_visit,
          visitCount: result.visit_count
        });
        
        // Record the visit locally
        dispatch({ 
          type: 'RECORD_FEATURE_VISIT', 
          payload: { 
            feature, 
            isFirstVisit: result.is_first_visit 
          } 
        });
        
        // Award XP if it's a first visit and onboarding is complete
        if (result.is_first_visit && result.xp_awarded > 0 && state.onboardingData.completed) {
          console.log('💰 [OnboardingContext] Feature exploration XP via unified system:', {
            feature,
            amount: result.xp_awarded,
            reason: `First exploration of ${feature}`,
            category: 'exploration'
          });
          
          // Use unified XP system
          await unifiedAwardXP(result.xp_awarded, `First exploration of ${feature}`, 'exploration');
        }
      } catch (error) {
        console.error('❌ Feature visit recording failed:', error);
        
        // Fallback to local recording only
        const existingExploration = state.onboardingData.feature_exploration[feature];
        const isFirstVisit = !existingExploration?.first_visit_at;
        
        dispatch({ 
          type: 'RECORD_FEATURE_VISIT', 
          payload: { feature, isFirstVisit } 
        });
      }
    },

    getActiveNudges: () => {
      return state.onboardingData.active_nudges;
    },

    dismissNudge: (nudgeId: string) => {
      dispatch({ type: 'DISMISS_NUDGE', payload: nudgeId });
    },

    markNudgeShown: (nudgeId: string) => {
      dispatch({ type: 'MARK_NUDGE_SHOWN', payload: nudgeId });
    },

    clearAllNudges: () => {
      dispatch({ type: 'CLEAR_ALL_NUDGES' });
    },

    hasVisitedFeature: (feature: string) => {
      return !!state.onboardingData.feature_exploration[feature];
    },

    getFeatureExploration: (feature: string) => {
      return state.onboardingData.feature_exploration[feature] || null;
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