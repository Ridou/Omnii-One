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
          firstQuote: data?.[0]?.text.substring(0, 50) + '...'
        });

        if (error) throw error;
        
        setQuotes(data || []);
        console.log('✅ useOnboarding: Quotes loaded successfully!', data?.length, 'quotes');
      } catch (err) {
        console.error('❌ useOnboarding: Error loading quotes:', err);
        setError('Failed to load onboarding content');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuotes();
  }, [user?.id]); // Only depend on user ID to avoid infinite loops

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

  // Record quote response and award XP
  const recordQuoteResponse = useCallback(async (
    quoteId: string, 
    action: 'approve' | 'decline', 
    timeSpent: number
  ) => {
    if (!user || !currentSession) return null;

    setIsLoading(true);
    try {
      // Call the database function to record response and award XP
      const { data, error } = await supabase.rpc('record_quote_response', {
        p_user_id: user.id,
        p_quote_id: quoteId,
        p_action: action,
        p_time_spent_ms: timeSpent,
        p_session_id: currentSession.id,
      });

      if (error) throw error;

      // Update session counts
      const updatedSession = {
        ...currentSession,
        quotes_approved: action === 'approve' ? currentSession.quotes_approved + 1 : currentSession.quotes_approved,
        quotes_declined: action === 'decline' ? currentSession.quotes_declined + 1 : currentSession.quotes_declined,
      };
      setCurrentSession(updatedSession);

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
    } catch (err) {
      console.error('Error recording quote response:', err);
      setError('Failed to record response');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentSession?.id]); // Only essential dependencies

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