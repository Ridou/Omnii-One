import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '~/context/AuthContext';
import { supabase } from '~/lib/supabase';
import type { 
  OnboardingQuote, 
  QuoteResponse, 
  OnboardingSession,
  XPTransaction,
  LevelProgression,
  OnboardingData,
  HolisticPreferences 
} from '~/types/onboarding';

interface OnboardingHook {
  // Data
  quotes: OnboardingQuote[];
  currentSession?: OnboardingSession;
  onboardingData?: OnboardingData;
  holisticPreferences?: HolisticPreferences;
  
  // Actions
  startOnboarding: () => Promise<string | null>;
  recordQuoteResponse: (quoteId: string, action: 'approve' | 'decline', timeSpent: number) => Promise<{
    xp_awarded: number;
    level_up: boolean;
    new_level: number;
    milestone_unlocks: string[];
  } | null>;
  completeOnboarding: () => Promise<void>;
  
  // Utilities
  getCurrentLevel: () => number;
  getUnlockedFeatures: (level: number) => string[];
  calculateLevelFromXP: (xp: number) => number;
  
  // State
  isLoading: boolean;
  error: string | null;
}

export function useOnboarding(): OnboardingHook {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<OnboardingQuote[]>([]);
  const [currentSession, setCurrentSession] = useState<OnboardingSession>();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>();
  const [holisticPreferences, setHolisticPreferences] = useState<HolisticPreferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate level from XP using exponential curve
  const calculateLevelFromXP = useCallback((totalXP: number): number => {
    const levels = [0, 100, 200, 320, 450, 750, 1100, 1500, 1950, 2500, 
                   3500, 5000, 8000, 12000, 18000, 25000, 35000, 60000];
    
    let level = 1;
    for (let i = 0; i < levels.length; i++) {
      if (totalXP >= levels[i]) {
        level = i + 1;
      } else {
        break;
      }
    }
    return level;
  }, []);

  // Get unlocked features for a given level
  const getUnlockedFeatures = useCallback((level: number): string[] => {
    const features: string[] = ['approvals']; // Always available
    
    if (level >= 3) features.push('achievements');
    if (level >= 4) features.push('chat', 'voice_commands');
    if (level >= 5) features.push('analytics', 'profile'); // ALL CORE FEATURES
    if (level >= 6) features.push('advanced_insights', 'habit_tracking');
    if (level >= 10) features.push('predictive_analytics', 'team_features');
    // ... more levels as needed
    
    return features;
  }, []);

  // Get current level from onboarding data
  const getCurrentLevel = useCallback((): number => {
    return onboardingData?.current_level || 1;
  }, [onboardingData?.current_level]);

  // Load quotes from database (only run once per user)
  useEffect(() => {
    const loadQuotes = async () => {
      console.log('🎯 useOnboarding: loadQuotes called', {
        user: user ? `${user.email} (${user.id})` : 'null',
        quotesLength: quotes.length,
        shouldLoad: !!(user && quotes.length === 0)
      });
      
      if (!user || quotes.length > 0) {
        console.log('🎯 useOnboarding: Skipping quote load', {
          noUser: !user,
          alreadyLoaded: quotes.length > 0
        });
        return; // Don't reload if already loaded
      }
      
      console.log('🎯 useOnboarding: Starting quote load from database...');
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('onboarding_quotes')
          .select('*')
          .eq('active', true)
          .order('order_index');

        console.log('🎯 useOnboarding: Database response', {
          error: error ? error.message : 'none',
          quotesCount: data ? data.length : 0,
          firstQuote: data && data[0] ? data[0].text.substring(0, 50) + '...' : 'No quotes'
        });

        if (error) {
          // Check if it's a table not found error or network error
          if (error.message?.includes('relation') || error.message?.includes('table') || error.code === '42P01') {
            console.warn('⚠️ useOnboarding: onboarding_quotes table not found, using fallback quotes');
            setQuotes(getFallbackQuotes());
            setError(null); // Clear error since fallback worked
            console.log('🔄 useOnboarding: Fallback quotes loaded successfully!', getFallbackQuotes().length, 'quotes');
            return;
          }
          throw error;
        }
        
        // If no data returned or empty array, use fallback
        if (!data || data.length === 0) {
          console.warn('⚠️ useOnboarding: No quotes found in database, using fallback quotes');
          setQuotes(getFallbackQuotes());
          setError(null); // Clear error since fallback worked
          console.log('🔄 useOnboarding: Fallback quotes loaded successfully!', getFallbackQuotes().length, 'quotes');
          return;
        }
        
        setQuotes(data);
        setError(null); // Clear any previous errors
        console.log('✅ useOnboarding: Quotes loaded successfully from database!', data.length, 'quotes');
      } catch (err: any) {
        console.error('❌ useOnboarding: Error loading quotes:', err);
        
        // Handle network errors gracefully with fallback
        if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
          console.warn('🌐 useOnboarding: Network error, using fallback quotes');
          setQuotes(getFallbackQuotes());
          setError(null); // Clear error for offline mode - quotes still work
          console.log('🔄 useOnboarding: Offline fallback quotes loaded!', getFallbackQuotes().length, 'quotes');
        } else {
          setError('Failed to load onboarding content');
          // Still provide fallback quotes so the app doesn't break
          setQuotes(getFallbackQuotes());
          console.log('🔄 useOnboarding: Error fallback quotes loaded!', getFallbackQuotes().length, 'quotes');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadQuotes();
  }, [user?.id]); // Only depend on user ID to avoid infinite loops

  // Fallback quotes for when database is unavailable
  const getFallbackQuotes = (): OnboardingQuote[] => [
    {
      id: 'fallback_1',
      quote_id: 'fallback_1',
      text: 'The way to get started is to quit talking and begin doing.',
      author: 'Walt Disney',
      category: 'motivation',
      difficulty: 'beginner',
      order_index: 1,
      active: true,
      psychological_markers: ['action-oriented', 'positive'],
      expected_resonance: 'high',
      life_domain: 'productivity'
    },
    {
      id: 'fallback_2',
      quote_id: 'fallback_2', 
      text: 'Innovation distinguishes between a leader and a follower.',
      author: 'Steve Jobs',
      category: 'productivity',
      difficulty: 'intermediate',
      order_index: 2,
      active: true,
      psychological_markers: ['leadership', 'innovation'],
      expected_resonance: 'medium',
      life_domain: 'professional'
    },
    {
      id: 'fallback_3',
      quote_id: 'fallback_3',
      text: 'The future belongs to those who believe in the beauty of their dreams.',
      author: 'Eleanor Roosevelt', 
      category: 'growth',
      difficulty: 'beginner',
      order_index: 3,
      active: true,
      psychological_markers: ['optimistic', 'future-focused'],
      expected_resonance: 'high',
      life_domain: 'personal'
    },
    {
      id: 'fallback_4',
      quote_id: 'fallback_4',
      text: 'It is during our darkest moments that we must focus to see the light.',
      author: 'Aristotle',
      category: 'mental_health',
      difficulty: 'intermediate',
      order_index: 4,
      active: true,
      psychological_markers: ['resilient', 'hope'],
      expected_resonance: 'medium',
      life_domain: 'emotional'
    },
    {
      id: 'fallback_5',
      quote_id: 'fallback_5',
      text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
      author: 'Winston Churchill',
      category: 'discipline',
      difficulty: 'advanced',
      order_index: 5,
      active: true,
      psychological_markers: ['persistent', 'courageous'],
      expected_resonance: 'medium',
      life_domain: 'achievement'
    }
  ];

  // Load user's onboarding data (only run once per user)
  useEffect(() => {
    const loadOnboardingData = async () => {
      if (!user || onboardingData?.current_level) return; // Don't reload if already loaded

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        
        if (data?.settings?.onboarding) {
          setOnboardingData(data.settings.onboarding);
        }
        
        if (data?.settings?.holistic_preferences) {
          setHolisticPreferences(data.settings.holistic_preferences);
        }
      } catch (err) {
        console.error('Error loading onboarding data:', err);
      }
    };

    loadOnboardingData();
  }, [user?.id]); // Only depend on user ID

  // Start onboarding session
  const startOnboarding = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    setIsLoading(true);
    try {
      // Create new onboarding session
      const { data: sessionData, error: sessionError } = await supabase
        .from('onboarding_sessions')
        .insert({
          user_id: user.id,
          total_quotes_shown: quotes.length,
          quotes_approved: 0,
          quotes_declined: 0,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      
      setCurrentSession(sessionData);
      return sessionData.id;
    } catch (err) {
      console.error('Error starting onboarding:', err);
      setError('Failed to start onboarding');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, quotes.length]); // Stable dependencies

  // Record quote response and award XP (with fallback)
  const recordQuoteResponse = useCallback(async (
    quoteId: string, 
    action: 'approve' | 'decline', 
    timeSpent: number
  ) => {
    if (!user) return null;

    setIsLoading(true);
    try {
      // Try to call the database function to record response and award XP
      const { data, error } = await supabase.rpc('record_quote_response', {
        p_user_id: user.id,
        p_quote_id: quoteId,
        p_action: action,
        p_time_spent_ms: timeSpent,
        p_session_id: currentSession?.id || 'fallback_session',
      });

      if (error) {
        // Check if it's a function not found error or network error
        if (error.message?.includes('function') || error.code === '42883' || 
            error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
          console.warn('⚠️ useOnboarding: record_quote_response function not found or network error, using local calculation');
          
          // Local XP calculation fallback
          const baseXP = action === 'approve' ? 10 : 5; // Quote approval: 10 XP, decline: 5 XP
          const engagementBonus = 3; // Engagement bonus
          const totalXP = baseXP + engagementBonus;
          
          const currentLevel = onboardingData?.current_level || 1;
          const currentTotalXP = onboardingData?.total_xp || 0;
          const newTotalXP = currentTotalXP + totalXP;
          const newLevel = calculateLevelFromXP(newTotalXP);
          const levelUp = newLevel > currentLevel;
          
          console.log('🔄 useOnboarding: Local quote response calculation:', {
            quoteId,
            action,
            xpAwarded: totalXP,
            newTotal: newTotalXP,
            newLevel: newLevel,
            levelUp: levelUp,
            reason: 'Server function not available'
          });
          
          // Update session counts locally if we have a session
          if (currentSession) {
            const updatedSession = {
              ...currentSession,
              quotes_approved: action === 'approve' ? currentSession.quotes_approved + 1 : currentSession.quotes_approved,
              quotes_declined: action === 'decline' ? currentSession.quotes_declined + 1 : currentSession.quotes_declined,
            };
            setCurrentSession(updatedSession);
          }

          // Update onboarding data locally
          setOnboardingData(prev => ({
            current_level: newLevel,
            total_xp: newTotalXP,
            onboarding_xp: (prev?.onboarding_xp || 0) + totalXP,
            completed: prev?.completed || false,
            level_5_achieved_at: prev?.level_5_achieved_at,
            feature_exploration: prev?.feature_exploration || {},
            active_nudges: prev?.active_nudges || [],
            preferences: prev?.preferences || {},
            ai_personality: prev?.ai_personality || {},
            celebration_queue: prev?.celebration_queue || []
          }));
          
          // Return mock response matching expected format
          return {
            xp_awarded: totalXP,
            level_up: levelUp,
            new_level: newLevel,
            milestone_unlocks: levelUp ? [`level_${newLevel}`] : []
          };
        }
        throw error;
      }

      // Server response handling
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          quotes_approved: action === 'approve' ? currentSession.quotes_approved + 1 : currentSession.quotes_approved,
          quotes_declined: action === 'decline' ? currentSession.quotes_declined + 1 : currentSession.quotes_declined,
        };
        setCurrentSession(updatedSession);
      }

      // Update onboarding data if level changed
      if (data?.[0]?.level_up) {
        setOnboardingData(prev => prev ? {
          ...prev,
          current_level: data[0].new_level,
          total_xp: (prev.total_xp || 0) + data[0].xp_awarded,
          onboarding_xp: (prev.onboarding_xp || 0) + data[0].xp_awarded,
        } : undefined);
      }

      return data?.[0] || null;
    } catch (err: any) {
      console.error('Error recording quote response:', err);
      
      // Final fallback for any other errors
      if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
        console.warn('🌐 useOnboarding: Network error during quote response, using local calculation');
        
        const baseXP = action === 'approve' ? 10 : 5;
        const engagementBonus = 3;
        const totalXP = baseXP + engagementBonus;
        
        const currentLevel = onboardingData?.current_level || 1;
        const currentTotalXP = onboardingData?.total_xp || 0;
        const newTotalXP = currentTotalXP + totalXP;
        const newLevel = calculateLevelFromXP(newTotalXP);
        const levelUp = newLevel > currentLevel;
        
        // Update local state
        setOnboardingData(prev => ({
          current_level: newLevel,
          total_xp: newTotalXP,
          onboarding_xp: (prev?.onboarding_xp || 0) + totalXP,
          completed: prev?.completed || false,
          level_5_achieved_at: prev?.level_5_achieved_at,
          feature_exploration: prev?.feature_exploration || {},
          active_nudges: prev?.active_nudges || [],
          preferences: prev?.preferences || {},
          ai_personality: prev?.ai_personality || {},
          celebration_queue: prev?.celebration_queue || []
        }));
        
        setError(null); // Clear error state for offline mode
        
        return {
          xp_awarded: totalXP,
          level_up: levelUp,
          new_level: newLevel,
          milestone_unlocks: levelUp ? [`level_${newLevel}`] : []
        };
      }
      
      setError('Failed to record response');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentSession, onboardingData, calculateLevelFromXP]); // Include all dependencies

  // Complete onboarding
  const completeOnboarding = useCallback(async (): Promise<void> => {
    if (!user || !currentSession) return;

    try {
      // Update session as completed
      const { error: sessionError } = await supabase
        .from('onboarding_sessions')
        .update({
          completed_at: new Date().toISOString(),
          completion_rate: 100,
        })
        .eq('id', currentSession.id);

      if (sessionError) throw sessionError;

      // Get current user settings
      const { data: currentData } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      const currentSettings = currentData?.settings || {};
      
      // Mark onboarding as completed in user settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: {
            ...currentSettings,
            onboarding: {
              ...onboardingData,
              completed: true,
              level_5_achieved_at: new Date().toISOString(),
            }
          }
        }, { onConflict: 'user_id' });

      if (settingsError) throw settingsError;

      // Update local state
      setOnboardingData(prev => prev ? { ...prev, completed: true } : undefined);
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Failed to complete onboarding');
    }
  }, [user?.id, currentSession?.id, onboardingData?.current_level]); // Stable dependencies

  return {
    // Data
    quotes,
    currentSession,
    onboardingData,
    holisticPreferences,
    
    // Actions
    startOnboarding,
    recordQuoteResponse,
    completeOnboarding,
    
    // Utilities
    getCurrentLevel,
    getUnlockedFeatures,
    calculateLevelFromXP,
    
    // State
    isLoading,
    error,
  };
} 