import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '~/context/AuthContext';
import { useXPContext } from '~/context/XPContext';
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
  
  // Onboarding-specific utilities (gets level from XPContext)
  getUnlockedFeatures: (level: number) => string[];
  
  // State
  isLoading: boolean;
  error: string | null;
}

export function useOnboarding(): OnboardingHook {
  const { user } = useAuth();
  const { currentLevel } = useXPContext(); // Get level from XPContext
  const [quotes, setQuotes] = useState<OnboardingQuote[]>([]);
  const [currentSession, setCurrentSession] = useState<OnboardingSession>();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>();
  const [holisticPreferences, setHolisticPreferences] = useState<HolisticPreferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ ONBOARDING RESPONSIBILITY: Feature unlocking (but gets level from XPContext)
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

  // Load quotes from database (only run once per user)
  useEffect(() => {
    const loadQuotes = async () => {
      console.log('🎯 useOnboarding: loadQuotes called', {
        user: user ? `${user.email || 'no-email'} (${user.id || 'no-id'})` : 'null',
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
      expected_resonance: 0.8,
      life_domain: 'work'
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
      expected_resonance: 0.7,
      life_domain: 'work'
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
      expected_resonance: 0.8,
      life_domain: 'personal_growth'
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
      expected_resonance: 0.7,
      life_domain: 'health'
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
      expected_resonance: 0.7,
      life_domain: 'personal_growth'
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
          .eq('user_id', user?.id)
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
  }, [user?.id, onboardingData?.current_level]); // Fix: Add null check to dependencies

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
      // ✅ SIMPLIFIED: Just calculate XP without updating level state
      const isFallbackQuote = quoteId.startsWith('fallback_');
      
      // Standard XP calculation for all quote responses
      const baseXP = action === 'approve' ? 10 : 5; // Quote approval: 10 XP, decline: 5 XP
      const engagementBonus = 3; // Engagement bonus
      const totalXP = baseXP + engagementBonus;
      
      console.log('✅ useOnboarding: Quote response processed:', {
        quoteId,
        action,
        xpAwarded: totalXP,
        isFallback: isFallbackQuote,
        note: 'Level calculations handled by XPContext'
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

      // ✅ FIX: Don't update level/XP state - let XPContext be the single source of truth
      // Just return the XP data for the calling component to process through XPContext
      return {
        xp_awarded: totalXP,
        level_up: false, // XPContext will determine this when it processes the XP
        new_level: currentLevel, // Get current level from XPContext
        milestone_unlocks: [] // XPContext will determine unlocks
      };

    } catch (err: any) {
      console.error('Error recording quote response:', err);
      setError('Failed to record response');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentSession, currentLevel]); // Use XPContext level instead of onboarding data

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
  }, [user?.id, currentSession?.id, currentLevel]); // Use XPContext level instead of onboarding data

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
    
    // Onboarding-specific utilities (gets level from XPContext)
    getUnlockedFeatures,
    
    // State
    isLoading,
    error,
  };
} 