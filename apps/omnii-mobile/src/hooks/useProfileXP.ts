import { useCallback, useMemo } from 'react';
import { useProfile } from '~/context/ProfileContext';
import type { ProfileMilestone } from '~/types/profile';

export interface ProfileXPHook {
  currentXP: number;
  level: number;
  mascotStage: 'seed' | 'flower' | 'tree';
  nextLevelXP: number;
  progressToNextLevel: number;
  milestones: ProfileMilestone[];
  awardXP: (amount: number, reason: string, category: string) => void;
  checkMilestones: () => void;
  getUnlockedFeatures: () => string[];
  xpToNextLevel: number;
  levelProgress: number;
}

// Feature unlocks based on mascot stage
const STAGE_FEATURES = {
  seed: [
    'Basic AI Tuning',
    'Work Style Assessment', 
    'Energy Mapping',
    'Communication Preferences',
    'Goal Setting',
    'Basic Integrations'
  ],
  flower: [
    'Advanced AI Personality',
    'Intelligent Notifications',
    'Team Sync Features',
    'Custom Workflows',
    'Privacy Controls',
    'Achievement Sharing'
  ],
  tree: [
    'Mentor Mode',
    'Community Leadership',
    'Advanced Analytics',
    'Workflow Templates',
    'Team Guidance',
    'Full AI Autonomy'
  ]
} as const;

export function useProfileXP(): ProfileXPHook {
  const { state, awardXP, updateMilestone, completeMilestone } = useProfile();
  
  // Calculate XP progress
  const xpForNextLevel = useMemo(() => {
    return (state.level) * 100; // Each level requires 100 more XP
  }, [state.level]);
  
  const xpToNextLevel = useMemo(() => {
    return xpForNextLevel - (state.currentXP % 100);
  }, [xpForNextLevel, state.currentXP]);
  
  const levelProgress = useMemo(() => {
    const currentLevelXP = state.currentXP % 100;
    return currentLevelXP / 100;
  }, [state.currentXP]);
  
  const progressToNextLevel = useMemo(() => {
    return (state.currentXP % 100) / 100;
  }, [state.currentXP]);
  
  // Get unlocked features based on current stage
  const getUnlockedFeatures = useCallback((): string[] => {
    const features: string[] = [...STAGE_FEATURES.seed];
    
    if (state.mascotStage === 'flower' || state.mascotStage === 'tree') {
      features.push(...STAGE_FEATURES.flower);
    }
    
    if (state.mascotStage === 'tree') {
      features.push(...STAGE_FEATURES.tree);
    }
    
    return features;
  }, [state.mascotStage]);
  
  // Check and update milestone progress
  const checkMilestones = useCallback(() => {
    for (const milestone of state.milestones) {
      if (milestone.completed) continue;
      
      let shouldComplete = false;
      let newProgress = milestone.progress;
      
      // Check completion conditions based on milestone category
      switch (milestone.id) {
        case 'self-discovery': {
          // Complete when all productivity DNA fields are filled
          if (state.productivityDNA) {
            const dnaFields = Object.values(state.productivityDNA);
            const filledFields = dnaFields.filter(field => field !== undefined && field !== '').length;
            newProgress = filledFields >= 6 ? 1 : 0;
            shouldComplete = newProgress >= milestone.maxProgress;
          }
          break;
        }
          
        case 'integration-master': {
          // Complete when 5+ integrations are connected
          const connectedIntegrations = state.integrations.filter(i => i.status === 'connected').length;
          newProgress = Math.min(connectedIntegrations, milestone.maxProgress);
          shouldComplete = newProgress >= milestone.maxProgress;
          break;
        }
          
        case 'privacy-guardian': {
          // Complete when all privacy settings are configured
          if (state.privacy) {
            const privacyFields = Object.values(state.privacy);
            const configuredFields = privacyFields.filter(field => field !== undefined).length;
            newProgress = Math.min(configuredFields, milestone.maxProgress);
            shouldComplete = newProgress >= milestone.maxProgress;
          }
          break;
        }
          
        case 'team-player': {
          // Complete when team sync is enabled
          if (state.teamSync?.shareProductivityInsights) {
            newProgress = 1;
            shouldComplete = true;
          }
          break;
        }
          
        case 'personalization-pro': {
          // Complete when AI persona is fully configured
          if (state.aiPersona) {
            const personaFields = Object.values(state.aiPersona);
            const configuredFields = personaFields.filter(field => field !== undefined && field !== '').length;
            newProgress = Math.min(configuredFields, milestone.maxProgress);
            shouldComplete = newProgress >= milestone.maxProgress;
          }
          break;
        }
          
        case 'setup-sage': {
          // This would be tracked externally when helping colleagues
          // For now, we'll leave it as manual completion
          break;
        }
      }
      
      // Update milestone progress
      if (newProgress !== milestone.progress) {
        updateMilestone(milestone.id, newProgress);
      }
      
      // Complete milestone if conditions are met
      if (shouldComplete && !milestone.completed) {
        completeMilestone(milestone.id);
      }
    }
  }, [state, updateMilestone, completeMilestone]);
  
  // Enhanced XP awarding with automatic milestone checking
  const enhancedAwardXP = useCallback((amount: number, reason: string, category: string) => {
    awardXP(amount, reason, category);
    
    // Check milestones after awarding XP
    setTimeout(checkMilestones, 100);
  }, [awardXP, checkMilestones]);
  
  return {
    currentXP: state.currentXP,
    level: state.level,
    mascotStage: state.mascotStage,
    nextLevelXP: xpForNextLevel,
    progressToNextLevel,
    milestones: state.milestones,
    awardXP: enhancedAwardXP,
    checkMilestones,
    getUnlockedFeatures,
    xpToNextLevel,
    levelProgress
  };
} 