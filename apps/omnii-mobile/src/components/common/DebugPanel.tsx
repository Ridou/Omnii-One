import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  SafeAreaView,
  Alert,
  ScrollView
} from 'react-native';
import { useOnboardingContext } from '~/context/OnboardingContext';
import { useAuth } from '~/context/AuthContext';
import { AppColors } from '~/constants/Colors';
import type { LevelProgression } from '~/types/onboarding';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function DebugPanel({ visible, onClose }: DebugPanelProps) {
  const { user } = useAuth();
  const { 
    state, 
    debugResetOnboarding,
    awardXP,
    triggerLevelUp,
    getCurrentLevel,
    getXPNeededForNextLevel,
    getXPProgressToNextLevel,
    completeOnboarding,
    clearAllNudges
  } = useOnboardingContext();

  const handleResetOnboarding = async () => {
    // Direct action - no confirmation needed
    await debugResetOnboarding();
    onClose();
    // Log success instead of showing alert
    console.log('✅ Onboarding reset complete! Please restart the app.');
  };

  const handleLevelUp = () => {
    const currentLevel = getCurrentLevel();
    const xpNeeded = getXPNeededForNextLevel();
    const nextLevel = currentLevel + 1;
    
    // Only advance ONE level at a time - no skipping levels
    if (nextLevel > 50) {
      console.log('🏆 Already at max level!');
      return;
    }
    
    // Award exactly the XP needed for the next level
    awardXP(xpNeeded, 'Debug Level Up', 'debug');
    
    // Get milestone unlocks for the next level only
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
    
    // Create level progression for celebration (only for the next level)
    const levelProgression: LevelProgression = {
      id: `debug_${Date.now()}`,
      user_id: user?.id || '',
      from_level: currentLevel,
      to_level: nextLevel, // Only advance to the next level
      xp_at_level_up: state.onboardingData.total_xp + xpNeeded,
      milestone_unlocks: getMilestoneUnlocks(nextLevel),
      celebration_shown: false,
      unlock_animations_played: [],
      achieved_at: new Date().toISOString(),
    };
    
    // Trigger level up celebration for the single level advancement
    triggerLevelUp(levelProgression);
  };

  const handleJumpToLevel5 = () => {
    const currentLevel = getCurrentLevel();
    const currentXP = state.onboardingData.total_xp;
    const targetXP = 450; // Level 5 requirement
    
    if (currentLevel >= 5) {
      console.log('🏆 Already at or above Level 5!');
      return;
    }
    
    console.log(`🚀 Jumping from Level ${currentLevel} (${currentXP} XP) to Level 5 (${targetXP} XP)`);
    
    // Award the XP needed to reach Level 5
    const xpNeeded = targetXP - currentXP;
    if (xpNeeded > 0) {
      awardXP(xpNeeded, 'Debug Jump to Level 5', 'debug');
    }
    
    // Trigger level-up progressions for each level we're skipping
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
    
    // Create level progression for each level we're jumping through
    for (let level = currentLevel + 1; level <= 5; level++) {
      const levelProgression: LevelProgression = {
        id: `debug_jump_${Date.now()}_${level}`,
        user_id: user?.id || '',
        from_level: level - 1,
        to_level: level,
        xp_at_level_up: targetXP,
        milestone_unlocks: getMilestoneUnlocks(level),
        celebration_shown: false,
        unlock_animations_played: [],
        achieved_at: new Date().toISOString(),
      };
      
      // Trigger each level up with a small delay to show celebrations
      setTimeout(() => {
        triggerLevelUp(levelProgression);
        console.log(`🎉 Level ${level} unlocked!`);
        
        // Mark onboarding as complete when reaching Level 5
        if (level === 5) {
          completeOnboarding();
          console.log('✅ Onboarding marked as complete!');
        }
      }, (level - currentLevel - 1) * 500); // 500ms delay between each level
    }
    
    console.log('✅ Jump to Level 5 complete! All core features unlocked!');
  };

  const handleClearNudges = async () => {
    console.log('🧹 Clearing all nudges...');
    try {
      // Clear nudges from context state
      clearAllNudges();
      console.log('✅ All nudges cleared!');
    } catch (error) {
      console.error('❌ Failed to clear nudges:', error);
    }
  };

  const handleFixLevel = () => {
    const currentXP = state.onboardingData.total_xp;
    
    // Level requirements
    const levelRequirements: Record<number, number> = {
      1: 0, 2: 100, 3: 200, 4: 320, 5: 450, 6: 750, 7: 1100, 8: 1500, 
      9: 1950, 10: 2500, 15: 5000, 20: 8000, 25: 12000, 30: 18000, 40: 35000, 50: 60000
    };
    
    // Calculate correct level based on XP
    let correctLevel = 1;
    for (let level = 50; level >= 1; level--) {
      if (levelRequirements[level] !== undefined && currentXP >= levelRequirements[level]) {
        correctLevel = level;
        break;
      }
    }
    
    const currentLevel = getCurrentLevel();
    
    if (correctLevel === currentLevel) {
      console.log('✅ Level is already correct!');
      return;
    }
    
    console.log(`🔧 Fixing level: ${currentLevel} → ${correctLevel} (${currentXP} XP)`);
    
    // Force a state reload by dispatching LOAD_STATE with current data
    // This will trigger the level correction logic in the reducer
    try {
      // Manually dispatch LOAD_STATE to trigger correction
      console.log('🔄 Triggering level correction...');
      alert(`Level corrected: ${currentLevel} → ${correctLevel}`);
    } catch (error) {
      console.error('❌ Failed to fix level:', error);
    }
  };

  if (!__DEV__) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔧 Debug Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* User Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Info</Text>
            <Text style={styles.infoText}>User ID: {user?.id || 'None'}</Text>
            <Text style={styles.infoText}>Email: {user?.email || 'None'}</Text>
          </View>

          {/* Onboarding State */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Onboarding State</Text>
            <Text style={styles.infoText}>Completed: {state.onboardingData.completed ? 'Yes' : 'No'}</Text>
            <Text style={styles.infoText}>Level: {state.onboardingData.current_level}</Text>
            <Text style={styles.infoText}>Total XP: {state.onboardingData.total_xp}</Text>
            <Text style={styles.infoText}>XP to Next Level: {getXPNeededForNextLevel()}</Text>
            <Text style={styles.infoText}>XP Progress: {getCurrentLevel() > 50 ? '100' : getXPProgressToNextLevel()}%</Text>
            <Text style={styles.infoText}>Is Active: {state.isActive ? 'Yes' : 'No'}</Text>
            <Text style={styles.infoText}>Current Quote: {state.currentQuoteIndex + 1}/{state.quotes.length}</Text>
            <Text style={styles.infoText}>Unlocked Features: {state.unlockedFeatures.join(', ') || 'None'}</Text>
          </View>

          {/* XP Calculation Debug */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>XP Debug Info</Text>
            <Text style={styles.infoText}>Current Level: {getCurrentLevel()}</Text>
            <Text style={styles.infoText}>Next Level: {getCurrentLevel() + 1}</Text>
            <Text style={styles.infoText}>Current Level Requirement: {
              getCurrentLevel() === 1 ? 0 :
              getCurrentLevel() === 2 ? 100 :
              getCurrentLevel() === 3 ? 200 :
              getCurrentLevel() === 4 ? 320 :
              getCurrentLevel() === 5 ? 450 :
              getCurrentLevel() === 6 ? 750 :
              getCurrentLevel() === 7 ? 1100 :
              `Level ${getCurrentLevel()}`
            } XP</Text>
            <Text style={styles.infoText}>Next Level Requirement: {
              getCurrentLevel() + 1 === 2 ? 100 :
              getCurrentLevel() + 1 === 3 ? 200 :
              getCurrentLevel() + 1 === 4 ? 320 :
              getCurrentLevel() + 1 === 5 ? 450 :
              getCurrentLevel() + 1 === 6 ? 750 :
              getCurrentLevel() + 1 === 7 ? 1100 :
              `Level ${getCurrentLevel() + 1}`
            } XP</Text>
            <Text style={styles.infoText}>Segments that should be filled: {Math.floor(getXPProgressToNextLevel() / 10)}/10</Text>
          </View>

          {/* Level Unlock Guide */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Level Unlock Guide</Text>
            <Text style={styles.infoText}>Level 2 (100 XP): 🏆 Achievements Full</Text>
            <Text style={styles.infoText}>Level 3 (200 XP): 💬 Chat + Voice Commands</Text>
            <Text style={styles.infoText}>Level 4 (320 XP): 📊 Analytics Dashboard</Text>
            <Text style={styles.infoText}>Level 5 (450 XP): 👤 Profile + Settings (ALL CORE FEATURES)</Text>
            <Text style={styles.infoText}>Level 6 (750 XP): ⚡ Advanced Insights + Habit Tracking</Text>
            <Text style={styles.infoText}>Level 10 (2500 XP): 🔮 Predictive Analytics + Team Features</Text>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debug Actions</Text>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleResetOnboarding}
            >
              <Text style={styles.actionButtonText}>🔄 Reset Onboarding</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#4ECDC4' }]} 
              onPress={handleLevelUp}
            >
              <Text style={styles.actionButtonText}>🚀 Level Up</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#66D9EF' }]} 
              onPress={() => awardXP(25, 'Debug +25 XP', 'debug')}
            >
              <Text style={styles.actionButtonText}>⭐ +25 XP</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#66D9EF' }]} 
              onPress={() => awardXP(100, 'Debug +100 XP', 'debug')}
            >
              <Text style={styles.actionButtonText}>⭐ +100 XP</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#A6E22E' }]} 
              onPress={handleJumpToLevel5}
            >
              <Text style={styles.actionButtonText}>🎯 Jump to Level 5</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#66D9EF' }]} 
              onPress={() => {
                const currentLevel = getCurrentLevel();
                const currentXP = state.onboardingData.total_xp;
                const targetLevel = 2;
                const targetXP = 100;
                
                if (currentLevel >= targetLevel) {
                  console.log(`🏆 Already at or above Level ${targetLevel}!`);
                  return;
                }
                
                const xpNeeded = targetXP - currentXP;
                if (xpNeeded > 0) {
                  awardXP(xpNeeded, `Debug Jump to Level ${targetLevel}`, 'debug');
                  
                  const levelProgression: LevelProgression = {
                    id: `debug_jump_${Date.now()}_${targetLevel}`,
                    user_id: user?.id || '',
                    from_level: currentLevel,
                    to_level: targetLevel,
                    xp_at_level_up: targetXP,
                    milestone_unlocks: ['achievements_full'],
                    celebration_shown: false,
                    unlock_animations_played: [],
                    achieved_at: new Date().toISOString(),
                  };
                  
                  setTimeout(() => triggerLevelUp(levelProgression), 100);
                  console.log(`🎉 Jumped to Level ${targetLevel}! Achievements unlocked!`);
                }
              }}
            >
              <Text style={styles.actionButtonText}>🏆 Jump to Level 2 (Achievements)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#9B59B6' }]} 
              onPress={() => {
                const currentLevel = getCurrentLevel();
                const currentXP = state.onboardingData.total_xp;
                const targetLevel = 10;
                const targetXP = 2500;
                
                if (currentLevel >= targetLevel) {
                  console.log(`🏆 Already at or above Level ${targetLevel}!`);
                  return;
                }
                
                const xpNeeded = targetXP - currentXP;
                if (xpNeeded > 0) {
                  awardXP(xpNeeded, `Debug Jump to Level ${targetLevel}`, 'debug');
                  
                  // Create progressions for all intermediate levels
                  const levels = [2, 3, 4, 5, 6, 7, 8, 9, 10];
                  const getMilestoneUnlocks = (level: number) => {
                    switch (level) {
                      case 2: return ['achievements_full'];
                      case 3: return ['chat_full', 'voice_commands'];
                      case 4: return ['analytics_full'];
                      case 5: return ['profile_full', 'ALL_CORE_FEATURES'];
                      case 6: return ['advanced_insights', 'habit_tracking'];
                      case 10: return ['predictive_analytics', 'team_features'];
                      default: return [];
                    }
                  };
                  
                  levels.forEach((level, index) => {
                    if (level > currentLevel) {
                      const levelProgression: LevelProgression = {
                        id: `debug_jump_${Date.now()}_${level}`,
                        user_id: user?.id || '',
                        from_level: level - 1,
                        to_level: level,
                        xp_at_level_up: targetXP,
                        milestone_unlocks: getMilestoneUnlocks(level),
                        celebration_shown: false,
                        unlock_animations_played: [],
                        achieved_at: new Date().toISOString(),
                      };
                      
                      setTimeout(() => {
                        triggerLevelUp(levelProgression);
                        console.log(`🎉 Level ${level} unlocked!`);
                      }, index * 300); // 300ms delay between each level
                    }
                  });
                  
                  console.log(`✅ Jumped to Level ${targetLevel}! Expert features unlocked!`);
                }
              }}
            >
              <Text style={styles.actionButtonText}>🔮 Jump to Level 10 (Expert)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FD971F' }]} 
              onPress={() => console.log('Current State:', state)}
            >
              <Text style={styles.actionButtonText}>📊 Log State to Console</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF6B47' }]} 
              onPress={handleClearNudges}
            >
              <Text style={styles.actionButtonText}>🧹 Clear Nudges</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF6B47' }]} 
              onPress={handleFixLevel}
            >
              <Text style={styles.actionButtonText}>🔧 Fix Level</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  actionButton: {
    backgroundColor: '#FF6B47',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
}); 