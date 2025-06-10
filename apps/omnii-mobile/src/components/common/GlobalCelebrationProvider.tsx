import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useXPContext } from '~/context/XPContext';
import LevelCelebration from '~/components/onboarding/LevelCelebration';
import type { LevelProgression } from '~/types/xp';

/**
 * Global Celebration Provider
 * 
 * Monitors the XP system for level up celebrations and displays them
 * across all screens in the app. This ensures that level up celebrations
 * work no matter which screen the user is on when they level up.
 */
export function GlobalCelebrationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { getNextCelebration, showCelebration } = useXPContext();
  
  // Local state for managing celebration display
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [currentCelebration, setCurrentCelebration] = useState<LevelProgression | null>(null);

  // Monitor for new celebrations in the queue
  useEffect(() => {
    const nextCelebration = getNextCelebration();
    
    if (nextCelebration && !showCelebrationModal) {
      console.log('🎉 [GlobalCelebrationProvider] New level up celebration detected:', {
        fromLevel: nextCelebration.from_level,
        toLevel: nextCelebration.to_level,
        celebrationId: nextCelebration.id
      });
      
      setCurrentCelebration(nextCelebration);
      setShowCelebrationModal(true);
    }
  }, [getNextCelebration(), showCelebrationModal]);

  // Handle celebration completion
  const handleCelebrationComplete = useCallback(() => {
    console.log('✅ [GlobalCelebrationProvider] Celebration completed:', currentCelebration?.id);
    
    if (currentCelebration) {
      // Remove the celebration from the queue
      showCelebration(currentCelebration.id);
    }
    
    // Reset local state
    setShowCelebrationModal(false);
    setCurrentCelebration(null);
  }, [currentCelebration, showCelebration]);

  // Handle Discord CTA for level 5 milestone
  const handleDiscordCTA = useCallback(async () => {
    console.log('🚀 [GlobalCelebrationProvider] Discord CTA clicked');
    // TODO: Implement Discord invite logic
    // For now, just complete the celebration
    handleCelebrationComplete();
  }, [handleCelebrationComplete]);

  // Handle navigation to newly unlocked features
  const handleNavigationCTA = useCallback((level: number) => {
    console.log('🎯 [GlobalCelebrationProvider] Navigation CTA clicked for level:', level);
    
    // Navigate to the appropriate feature based on level
    switch (level) {
      case 2:
        router.push('/(tabs)/achievements');
        break;
      case 3:
        router.push('/(tabs)/chat');
        break;
      case 4:
        router.push('/(tabs)/analytics');
        break;
      case 5:
        router.push('/(tabs)/profile');
        break;
      default:
        // For higher levels, go to achievements to see progress
        router.push('/(tabs)/achievements');
        break;
    }
    
    handleCelebrationComplete();
  }, [router, handleCelebrationComplete]);

  return (
    <>
      {children}
      
      {/* Global Level Celebration Modal */}
      <LevelCelebration
        visible={showCelebrationModal}
        levelProgression={currentCelebration}
        onComplete={handleCelebrationComplete}
        onDiscordCTA={handleDiscordCTA}
        onNavigationCTA={handleNavigationCTA}
      />
    </>
  );
} 