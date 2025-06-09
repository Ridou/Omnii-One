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
import type { 
  LevelProgression,
  ContextualNudge,
  FeatureExploration
} from '~/types/onboarding';

// Level up callback type
export type LevelUpCallback = (fromLevel: number, toLevel: number, totalXP: number) => void;

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

// Helper function to create contextual nudges for newly unlocked features
function createFeatureNudge(feature: string, level: number): ContextualNudge | null {
  const nudgeConfigs = {
    achievements: {
      title: "🏆 Your Achievement System is Ready!",
      message: "Start tracking your productivity milestones and unlock rewards as you grow. Your journey to mastery begins here!",
      icon: "🏆",
      xp_reward: 25,
      trigger_delay_minutes: 0,
      dismiss_after_hours: 24,
    },
    chat: {
      title: "💬 Your AI Assistant Awaits!",
      message: "Meet your personal productivity companion. Get instant help, tips, and use voice commands to supercharge your workflow!",
      icon: "💬", 
      xp_reward: 30,
      trigger_delay_minutes: 0,
      dismiss_after_hours: 48,
    },
    analytics: {
      title: "📊 Unlock Your Productivity Insights!",
      message: "Discover when you're most productive, track your progress, and get personalized recommendations based on your work patterns.",
      icon: "📊",
      xp_reward: 35,
      trigger_delay_minutes: 0,
      dismiss_after_hours: 72,
    },
    profile: {
      title: "👤 Make OMNII Truly Yours!",
      message: "Customize your AI's personality, fine-tune your experience, and join our vibrant community of productivity enthusiasts.",
      icon: "👤",
      xp_reward: 40,
      trigger_delay_minutes: 0,
      dismiss_after_hours: 168,
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

interface XPContextState {
  // Current XP state
  currentXP: number;
  currentLevel: number;
  isLoading: boolean;
  error: string | null;
  
  // Progress calculations
  xpProgress: XPProgress;
  
  // Feature unlocking
  unlockedFeatures: string[];
  isFeatureUnlocked: (feature: string) => boolean;
  getTabsForLevel: (level: number) => string[];
  
  // Level progressions and celebrations
  celebrationQueue: LevelProgression[];
  getNextCelebration: () => LevelProgression | null;
  showCelebration: (celebrationId: string) => void;
  clearCelebrationStorage: () => Promise<void>;
  
  // Feature exploration
  featureExploration: { [feature: string]: FeatureExploration };
  recordFeatureVisit: (feature: string) => Promise<void>;
  hasVisitedFeature: (feature: string) => boolean;
  getFeatureExploration: (feature: string) => FeatureExploration | null;
  
  // Nudge system
  activeNudges: ContextualNudge[];
  getActiveNudges: () => ContextualNudge[];
  dismissNudge: (nudgeId: string) => void;
  markNudgeShown: (nudgeId: string) => void;
  clearAllNudges: () => void;
  
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
  
  // Level up callbacks
  setOnLevelUp: (callback: LevelUpCallback | null) => void;
}

const XPContext = createContext<XPContextState | undefined>(undefined);

interface XPProviderProps {
  children: ReactNode;
}

export function XPProvider({ children }: XPProviderProps) {
  const { user } = useAuth();
  
  // Core XP state
  const [currentXP, setCurrentXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [pendingXP, setPendingXP] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Level progression and celebration state - server handles celebrations now
  const [celebrationQueue, setCelebrationQueue] = useState<LevelProgression[]>([]);
  
  // Feature unlocking state
  const [unlockedFeatures, setUnlockedFeatures] = useState<string[]>(['approvals']);
  
  // Feature exploration and nudge state
  const [featureExploration, setFeatureExploration] = useState<{ [feature: string]: FeatureExploration }>({});
  const [activeNudges, setActiveNudges] = useState<ContextualNudge[]>([]);
  
  // Real-time connection state
  const [isConnected, setIsConnected] = useState(true);
  
  // Caching and debouncing refs
  const lastFetchTime = useRef<Date | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetching = useRef(false);
  const hasInitialLoad = useRef(false);
  
  // XP award debouncing to prevent rapid successive awards
  const recentXPAwards = useRef<Map<string, number>>(new Map());
  const xpAwardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for real-time subscription cleanup (SINGLETON PATTERN)
  const subscriptionRef = useRef<any>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubscribedRef = useRef(false);
  
  // Level up callback ref
  const onLevelUpRef = useRef<LevelUpCallback | null>(null);

  // Set level up callback
  const setOnLevelUp = useCallback((callback: LevelUpCallback | null) => {
    onLevelUpRef.current = callback;
  }, []);

  // Helper function to trigger level up celebrations - CREATE ACTUAL CELEBRATIONS
  const triggerLevelUpIfNeeded = useCallback((oldLevel: number, newLevel: number, newTotalXP: number) => {
    if (newLevel <= oldLevel || !user?.id) {
      return;
    }

    console.log('🎉 [XPContext] Level up detected - creating celebrations:', {
      fromLevel: oldLevel,
      toLevel: newLevel,
      totalXP: newTotalXP
    });

    // CREATE ACTUAL CELEBRATIONS: Add level progressions to the queue for each level gained
    const newCelebrations: LevelProgression[] = [];
    
    for (let level = oldLevel + 1; level <= newLevel; level++) {
      // Create a celebration for each level gained
      const celebration: LevelProgression = {
        id: `level_${level}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
        user_id: user.id,
        from_level: level - 1,
        to_level: level,
        xp_at_level_up: newTotalXP,
        milestone_unlocks: [], // Will be populated with features if needed
        celebration_shown: false,
        celebration_shown_at: undefined,
        unlock_animations_played: [],
        achieved_at: new Date().toISOString(),
      };

      // Add milestone unlocks based on level
      const oldLevelFeatures = getUnlockedFeaturesForLevel(level - 1);
      const newLevelFeatures = getUnlockedFeaturesForLevel(level);
      const justUnlocked = newLevelFeatures.filter(feature => !oldLevelFeatures.includes(feature));
      
      if (justUnlocked.length > 0) {
        celebration.milestone_unlocks = justUnlocked;
      }

      newCelebrations.push(celebration);

      // Create nudges for newly unlocked features
      const newNudges = justUnlocked
        .map(feature => createFeatureNudge(feature, level))
        .filter(Boolean) as ContextualNudge[];
      
      if (newNudges.length > 0) {
        setActiveNudges(prev => [...prev, ...newNudges]);
      }

      console.log('🎊 [XPContext] Created celebration for level:', {
        level,
        fromLevel: level - 1,
        toLevel: level,
        unlockedFeatures: justUnlocked,
        celebrationId: celebration.id
      });
    }

    // ADD CELEBRATIONS TO QUEUE: This is what was missing!
    if (newCelebrations.length > 0) {
      setCelebrationQueue(prev => [...prev, ...newCelebrations]);
      console.log('🎉 [XPContext] Added celebrations to queue:', {
        count: newCelebrations.length,
        levels: newCelebrations.map(c => c.to_level),
        queueLength: newCelebrations.length
      });
    }

    // Trigger callback if set
    if (onLevelUpRef.current) {
      onLevelUpRef.current(oldLevel, newLevel, newTotalXP);
    }
  }, [user?.id]);

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

  // Feature management functions
  const isFeatureUnlocked = useCallback((feature: string) => {
    return unlockedFeatures.includes(feature);
  }, [unlockedFeatures]);

  const getTabsForLevel = useCallback((level: number) => {
    return getUnlockedFeaturesForLevel(level).filter(feature => 
      ['approvals', 'achievements', 'chat', 'analytics', 'profile'].includes(feature)
    );
  }, []);

  // Celebration management
  const getNextCelebration = useCallback(() => {
    return celebrationQueue[0] || null;
  }, [celebrationQueue]);

  const showCelebration = useCallback((celebrationId: string) => {
    setCelebrationQueue(prev => prev.filter(c => c.id !== celebrationId));
  }, []);

  const clearCelebrationStorage = useCallback(async () => {
    console.log('🧹 [XPContext] Clearing celebration cache...');
    setCelebrationQueue([]);
    console.log('✅ [XPContext] Celebration cache cleared');
  }, []);

  // Feature exploration functions
  // NOTE: This recordFeatureVisit function may be legacy - consider removing if not needed
  const recordFeatureVisit = useCallback(async (feature: string) => {
    if (!user) return;
    
    try {
      // Call server function for feature visit recording
      const { data, error } = await supabase.rpc('record_feature_visit_secure', {
        p_user_id: user.id,
        p_feature_name: feature
      });

      if (error) {
        throw error;
      }

      const result = data[0];
      
      // ✅ NEW: Check for exploration achievements on first visit
      if (result.is_first_visit) {
        try {
          await supabase.rpc('check_exploration_achievements', {
            p_user_id: user.id,
            p_feature_name: feature,
            p_is_first_visit: true
          });
        } catch (achievementError) {
          // Silent failure for achievements
        }
      }
      
      // Update local feature exploration state
      setFeatureExploration(prev => ({
        ...prev,
        [feature]: {
          feature_name: feature,
          first_visit_at: result.is_first_visit ? new Date().toISOString() : (prev[feature]?.first_visit_at || new Date().toISOString()),
          visit_count: result.visit_count,
          xp_rewarded: result.is_first_visit ? true : (prev[feature]?.xp_rewarded || false),
          nudge_dismissed: prev[feature]?.nudge_dismissed || false,
          last_nudge_shown: prev[feature]?.last_nudge_shown,
        }
      }));
      
      // Award XP if it's a first visit
      if (result.is_first_visit && result.xp_awarded > 0) {
        // Award XP directly (this will trigger level up if needed)
        await awardXP(result.xp_awarded, `First exploration of ${feature}`, 'exploration');
      }
    } catch (error) {
      // Fallback to local recording only (silent)
      const existingExploration = featureExploration[feature];
      const isFirstVisit = !existingExploration?.first_visit_at;
      
      setFeatureExploration(prev => ({
        ...prev,
        [feature]: {
          feature_name: feature,
          first_visit_at: isFirstVisit ? new Date().toISOString() : (existingExploration?.first_visit_at || new Date().toISOString()),
          visit_count: (existingExploration?.visit_count || 0) + 1,
          xp_rewarded: isFirstVisit ? true : (existingExploration?.xp_rewarded || false),
          nudge_dismissed: existingExploration?.nudge_dismissed || false,
          last_nudge_shown: existingExploration?.last_nudge_shown,
        }
      }));
    }
  }, [user?.id, featureExploration]);

  const hasVisitedFeature = useCallback((feature: string) => {
    return !!featureExploration[feature];
  }, [featureExploration]);

  const getFeatureExploration = useCallback((feature: string) => {
    return featureExploration[feature] || null;
  }, [featureExploration]);

  // Nudge management functions
  const getActiveNudges = useCallback(() => {
    return activeNudges;
  }, [activeNudges]);

  const dismissNudge = useCallback((nudgeId: string) => {
    setActiveNudges(prev => prev.map(nudge =>
      nudge.id === nudgeId ? { ...nudge, dismissed: true } : nudge
    ));
    
    // Mark the feature's nudge as dismissed
    const nudge = activeNudges.find(n => n.id === nudgeId);
    if (nudge) {
      setFeatureExploration(prev => ({
        ...prev,
        [nudge.feature_name]: {
          feature_name: nudge.feature_name,
          first_visit_at: prev[nudge.feature_name]?.first_visit_at,
          visit_count: prev[nudge.feature_name]?.visit_count ?? 0,
          xp_rewarded: prev[nudge.feature_name]?.xp_rewarded ?? false,
          last_nudge_shown: prev[nudge.feature_name]?.last_nudge_shown,
          ...prev[nudge.feature_name],
          nudge_dismissed: true
        }
      }));
    }
  }, [activeNudges]);

  const markNudgeShown = useCallback((nudgeId: string) => {
    setActiveNudges(prev => prev.map(nudge =>
      nudge.id === nudgeId ? { ...nudge, shown: true } : nudge
    ));
  }, []);

  const clearAllNudges = useCallback(() => {
    setActiveNudges([]);
  }, []);

  /**
   * Fetch XP data from server with smart caching and debouncing
   */
  const fetchXPData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    // Cache check: Don't fetch if we just fetched recently (unless forced)
    const now = new Date();
    const timeSinceLastFetch = lastFetchTime.current ? now.getTime() - lastFetchTime.current.getTime() : Infinity;
    const CACHE_DURATION = 30000; // 30 seconds cache
    
    if (!forceRefresh && timeSinceLastFetch < CACHE_DURATION && hasInitialLoad.current) {
      console.log('⚡ [XPContext] Using cached XP data (fresh data available)');
      return;
    }

    // Debounce: If already fetching, don't start another fetch
    if (isFetching.current) {
      console.log('⏳ [XPContext] XP fetch already in progress, skipping duplicate');
      return;
    }

    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    isFetching.current = true;
    
    // Smart loading: Only show loading spinner on initial app load
    if (!hasInitialLoad.current) {
      setIsLoading(true);
      console.log('🔄 [XPContext] Initial XP load - showing loading spinner');
    } else {
      console.log('🔄 [XPContext] Updating XP data silently (no loading spinner)');
    }

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
          setUnlockedFeatures(getUnlockedFeaturesForLevel(fallbackLevel));
          setLastUpdated(new Date());
          setPendingXP(0);
          setError(null);
          lastFetchTime.current = now;
          hasInitialLoad.current = true;
          
          return;
        }
        throw fetchError;
      }

      if (data && data.length > 0) {
        const xpData = data[0];
        const newLevel = xpData.current_level || 1;
        const newXP = xpData.total_xp || 0;
        
        // Clear stale celebrations: If we have a significant level/XP mismatch, clear old celebrations
        const levelDifference = Math.abs(newLevel - currentLevel);
        const xpDifference = Math.abs(newXP - currentXP);
        
        // Detect level reset (when new level is significantly lower)
        const isLevelReset = newLevel < currentLevel && levelDifference > 1;

        // Initial sync: Prevent false celebrations on app startup
        if (!hasInitialLoad.current) {
          console.log('🚀 [XPContext] Initial server sync - setting baseline level without celebrations:', {
            serverLevel: newLevel,
            currentLocalLevel: currentLevel,
            preventing: `false celebrations for levels 1-${newLevel}`
          });
          
          // Set the server level as baseline without triggering celebrations
          setCurrentXP(newXP);
          setCurrentLevel(newLevel);
          setUnlockedFeatures(getUnlockedFeaturesForLevel(newLevel));
          setLastUpdated(now);
          setPendingXP(0);
          setError(null);
          lastFetchTime.current = now;
          hasInitialLoad.current = true;
          
          console.log('✅ [XPContext] Initial sync complete - future level-ups will trigger celebrations');
          return; // Exit early, no level-up processing
        }

        if ((levelDifference > 2 || xpDifference > 200) && celebrationQueue.length > 0) {
          console.log('🧹 [XPContext] Clearing stale celebrations due to significant state change');
          setCelebrationQueue([]);
        }
        
        // Check for level up (only if it's a reasonable progression)
        if (newLevel > currentLevel && levelDifference <= 3) {
          triggerLevelUpIfNeeded(currentLevel, newLevel, newXP);
        } else if (levelDifference > 3) {
          console.log('🚫 [XPContext] Skipping level celebration for large level jump (likely stale data):', {
            from: currentLevel,
            to: newLevel,
            difference: levelDifference
          });
        }
        
        setCurrentXP(newXP);
        setCurrentLevel(newLevel);
        setUnlockedFeatures(getUnlockedFeaturesForLevel(newLevel));
        setLastUpdated(now);
        setPendingXP(0);
        setError(null);
        lastFetchTime.current = now;
        hasInitialLoad.current = true;

        // Immediately update unlocked features for instant unlock
        setUnlockedFeatures(getUnlockedFeaturesForLevel(newLevel));
        
        console.log('✅ [XPContext] XP data synced from server:', {
          totalXP: newXP,
          currentLevel: newLevel,
          cached: true
        });
      } else {
        console.log('🔄 [XPContext] No server data, maintaining local state');
        setError(null);
        lastFetchTime.current = now;
        hasInitialLoad.current = true;
      }
    } catch (err: any) {
      // Handle network errors silently for better UX - but preserve current state
      if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
        console.log('🌐 [XPContext] Network unavailable, preserving current XP state');
        
        // Only set defaults if we have no existing state (first time user)
        if (currentXP === 0 && currentLevel === 1 && !hasInitialLoad.current) {
          setCurrentXP(0);
          setCurrentLevel(1);
          setUnlockedFeatures(['approvals']);
        }
        // Otherwise, keep existing state to prevent false level jumps
        
        setError(null);
        lastFetchTime.current = now;
        hasInitialLoad.current = true;
      } else {
        console.warn('⚠️ [XPContext] XP sync issue (preserving local state):', err.message);
        
        // For non-network errors, also preserve state
        setError(null);
        lastFetchTime.current = now;
        hasInitialLoad.current = true;
      }
    } finally {
      isFetching.current = false;
      setIsLoading(false); // Always clear loading state
    }
  }, [user?.id, currentXP, currentLevel, triggerLevelUpIfNeeded, celebrationQueue.length]);

  /**
   * Award XP with optimistic updates and server sync (with fallback)
   */
  const awardXP = useCallback(async (
    amount: number, 
    reason: string, 
    category: string
  ): Promise<XPUpdate | null> => {
    if (!user?.id || amount <= 0) return null;

    // Debounce XP awards: Prevent rapid duplicate awards
    const awardKey = `${amount}_${reason}_${category}`;
    const now = Date.now();
    const lastAwardTime = recentXPAwards.current.get(awardKey);
    
    if (lastAwardTime && (now - lastAwardTime) < 2000) { // 2 second debounce
      console.log('⚡ [XPContext] Debouncing duplicate XP award:', awardKey);
      return null;
    }
    
    // Track this award
    recentXPAwards.current.set(awardKey, now);
    
    // Clean up old awards after 5 seconds
    if (xpAwardTimeoutRef.current) {
      clearTimeout(xpAwardTimeoutRef.current);
    }
    xpAwardTimeoutRef.current = setTimeout(() => {
      const cutoff = Date.now() - 5000;
      for (const [key, time] of recentXPAwards.current.entries()) {
        if (time < cutoff) {
          recentXPAwards.current.delete(key);
        }
      }
    }, 5000);

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
          
          // Check milestone achievements even in local mode
          if (levelUp) {
            try {
              await supabase.rpc('check_milestone_achievements', {
                p_user_id: user.id,
                p_new_level: newLevel,
                p_total_xp: newTotalXP
              });
            } catch (milestoneError) {
              // Silent failure for milestone achievements
            }
          }
          
          // Update state locally
          setCurrentXP(newTotalXP);
          setCurrentLevel(newLevel);
          setLastUpdated(new Date());
          setPendingXP(0);
          
          // Immediately update unlocked features for instant unlock
          setUnlockedFeatures(getUnlockedFeaturesForLevel(newLevel));
          
          triggerLevelUpIfNeeded(currentLevel, newLevel, newTotalXP);
          
          // Return mock response matching expected format
          return {
            xp_awarded: amount,
            new_level: newLevel,
            level_up: levelUp,
            milestone_unlocks: levelUp ? [`level_${newLevel}`] : []
          };
        }
        throw awardError;
      }

      if (data && data.length > 0) {
        const result = data[0];
        
        // Validate the XP update response
        if (isValidXPUpdate(result)) {
          const validatedUpdate = validateXPUpdate(result);
          
          // Calculate new totals since the function only returns the award amount and new level
          const newTotalXP = currentXP + validatedUpdate.xp_awarded;
          const newLevel = validatedUpdate.new_level;
          
          // Check for milestone achievements after XP award
          try {
            await supabase.rpc('check_milestone_achievements', {
              p_user_id: user.id,
              p_new_level: newLevel,
              p_total_xp: newTotalXP
            });
          } catch (milestoneError) {
            // Silent failure for milestone achievements
          }
          
          // Update state with calculated values
          setCurrentXP(newTotalXP);
          setCurrentLevel(newLevel);
          setLastUpdated(new Date());
          setPendingXP(0);
          
          // Immediately update unlocked features for instant unlock
          setUnlockedFeatures(getUnlockedFeaturesForLevel(newLevel));
          
          triggerLevelUpIfNeeded(currentLevel, newLevel, newTotalXP);
          
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
      
      // Immediately update unlocked features for instant unlock
      setUnlockedFeatures(getUnlockedFeaturesForLevel(newLevel));
      
      triggerLevelUpIfNeeded(currentLevel, newLevel, newTotalXP);
      
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
        
        // Immediately update unlocked features for instant unlock
        setUnlockedFeatures(getUnlockedFeaturesForLevel(newLevel));
        
        console.log('💰 [XPContext] Offline XP awarded:', {
          amount,
          newTotal: newTotalXP,
          newLevel: newLevel,
          levelUp: levelUp
        });
        
        triggerLevelUpIfNeeded(currentLevel, newLevel, newTotalXP);
        
        return {
          xp_awarded: amount,
          new_level: newLevel,
          level_up: levelUp,
          milestone_unlocks: levelUp ? [`level_${newLevel}`] : []
        };
      }
      
      console.warn('⚠️ [XPContext] XP award issue (reverting):', err.message);
      
      // Rollback optimistic update on unexpected errors
      setPendingXP(prev => Math.max(0, prev - amount));
      
      return null;
    }
  }, [user?.id, pendingXP, currentXP, currentLevel, triggerLevelUpIfNeeded]);

  /**
   * Manual sync function - forces a fresh fetch
   */
  const syncXP = useCallback(async () => {
    console.log('🔄 [XPContext] Manual XP sync requested');
    await fetchXPData(true); // Force refresh
  }, [fetchXPData]);

  /**
   * Refetch function - uses cache by default
   */
  const refetchXP = useCallback(async () => {
    console.log('🔄 [XPContext] XP refetch requested');
    await fetchXPData(false); // Use cache
  }, [fetchXPData]);

  /**
   * Cleanup function for timeouts
   */
  const cleanupTimeouts = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    if (xpAwardTimeoutRef.current) {
      clearTimeout(xpAwardTimeoutRef.current);
      xpAwardTimeoutRef.current = null;
    }
    // Clear XP award tracking
    recentXPAwards.current.clear();
  }, []);

  /**
   * Setup real-time subscription for XP updates (with silent fallback)
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id || isSubscribedRef.current) {
      return;
    }

    console.log('🔄 [XPContext] Attempting real-time XP subscription...');
    isSubscribedRef.current = true;

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

  // Clean up expired nudges every hour
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      setActiveNudges(prev => prev.filter(nudge => {
        const createdAt = new Date(nudge.created_at);
        const expireTime = new Date(createdAt.getTime() + nudge.dismiss_after_hours * 60 * 60 * 1000);
        return now < expireTime && !nudge.dismissed;
      }));
    }, 60 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Initialize XP data and real-time subscription
  useEffect(() => {
    if (user?.id) {
      // Only use cached version after initial load to prevent loading spam
      console.log('🚀 [XPContext] Initializing XP system for user:', user.id);
      fetchXPData(false); // Use cache by default
      setupRealtimeSubscription();
    } else {
      // Reset state when user logs out
      console.log('🔄 [XPContext] User logged out, resetting XP state');
      setCurrentXP(0);
      setCurrentLevel(1);
      setUnlockedFeatures(['approvals']);
      setCelebrationQueue([]);
      setFeatureExploration({});
      setActiveNudges([]);
      setPendingXP(0);
      setIsLoading(false);
      setError(null);
      setLastUpdated(null);
      lastFetchTime.current = null;
      hasInitialLoad.current = false;
      cleanupSubscription();
      cleanupTimeouts();
    }

    return () => {
      cleanupSubscription();
      cleanupTimeouts();
    };
  }, [user?.id, fetchXPData, setupRealtimeSubscription, cleanupSubscription, cleanupTimeouts]);

  const contextValue: XPContextState = {
    currentXP,
    currentLevel,
    isLoading,
    error,
    xpProgress,
    
    // Feature unlocking
    unlockedFeatures,
    isFeatureUnlocked,
    getTabsForLevel,
    
    // Level progressions and celebrations
    celebrationQueue,
    getNextCelebration,
    showCelebration,
    clearCelebrationStorage,
    
    // Feature exploration
    featureExploration,
    recordFeatureVisit,
    hasVisitedFeature,
    getFeatureExploration,
    
    // Nudge system
    activeNudges,
    getActiveNudges,
    dismissNudge,
    markNudgeShown,
    clearAllNudges,
    
    awardXP,
    syncXP,
    refetchXP,
    isConnected,
    lastUpdated,
    pendingXP,
    setPendingXP,
    setOnLevelUp,
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