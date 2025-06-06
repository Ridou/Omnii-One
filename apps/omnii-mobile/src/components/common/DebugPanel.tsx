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
import { useXPSystem } from '~/hooks/useXPSystem';
import { useAuth } from '~/context/AuthContext';
import { useOnboardingContext } from '~/context/OnboardingContext';
import { AppColors } from '~/constants/Colors';
import { XPSystemUtils } from '~/constants/XPSystem';
import type { LevelProgression } from '~/types/onboarding';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function DebugPanel({ visible, onClose }: DebugPanelProps) {
  const { user } = useAuth();
  const { 
    awardXP, 
    currentXP, 
    currentLevel, 
    xpProgress, 
    isLoading, 
    error,
    pendingXP,
    refetchXP
  } = useXPSystem();
  
  const {
    state: onboardingState,
    completeOnboarding,
    triggerLevelUp,
    isOnboardingComplete
  } = useOnboardingContext();

  // Enhanced debugging with unified system logging
  const logCurrentState = () => {
    console.log('🔍 [DEBUG] Unified XP System State:', {
      currentLevel,
      currentXP,
      xpInCurrentLevel: xpProgress.xp_in_current_level,
      xpToNextLevel: xpProgress.xp_to_next_level,
      progressPercentage: xpProgress.progress_percentage,
      nextLevelXP: xpProgress.next_level_xp,
      pendingXP,
      isLoading,
      error: error || 'None',
      segmentsFilled: Math.floor((xpProgress.progress_percentage || 0) / 10),
      // Onboarding state
      onboardingCompleted: onboardingState.onboardingData.completed,
      onboardingActive: onboardingState.isActive,
      unlockedFeatures: onboardingState.unlockedFeatures,
      timestamp: new Date().toISOString()
    });
  };

  const awardXPWithLogging = async (amount: number, reason: string) => {
    console.log(`💰 [DEBUG] About to award ${amount} XP for: ${reason}`);
    logCurrentState();
    
    try {
      await awardXP(amount, reason, 'debug');
      
      // Log state after awarding
      setTimeout(() => {
        console.log(`✅ [DEBUG] After awarding ${amount} XP:`);
        logCurrentState();
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to award XP:', error);
    }
  };

  const handleLevelUp = async () => {
    if (currentLevel >= 50) {
      console.log('🏆 Already at max level!');
      return;
    }
    
    const xpNeeded = xpProgress.xp_to_next_level || 0;
    const nextLevel = currentLevel + 1;
    
    console.log(`🚀 Leveling up from ${currentLevel} to ${nextLevel} (needs ${xpNeeded} XP)`);
    
    await awardXPWithLogging(xpNeeded, 'Debug Level Up');
    
    // Let the unified XP system handle level progression and celebrations naturally
    console.log('✅ [DEBUG] XP awarded, letting unified system handle level progression naturally');
  };

  const handleJumpToLevel = async (targetLevel: number) => {
    if (currentLevel >= targetLevel) {
      console.log(`🏆 Already at or above Level ${targetLevel}!`);
      return;
    }
    
    const targetXP = XPSystemUtils.getXPForLevel(targetLevel);
    const xpNeeded = Math.max(0, targetXP - currentXP);
    
    console.log(`🚀 Jumping from Level ${currentLevel} (${currentXP} XP) to Level ${targetLevel} (${targetXP} XP)`);
    console.log(`💰 Need ${xpNeeded} more XP`);
    
    if (xpNeeded > 0) {
      await awardXPWithLogging(xpNeeded, `Debug Jump to Level ${targetLevel}`);
      
      // Wait for the XP system to process and trigger natural level-ups
      // The unified XP system will handle level progression and celebrations properly
      console.log('✅ [DEBUG] XP awarded, letting unified system handle level progression naturally');
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Refreshing XP data...');
    try {
      await refetchXP();
      console.log('✅ XP data refreshed!');
    } catch (error) {
      console.error('❌ Failed to refresh XP:', error);
    }
  };

  const handleNuclearReset = async () => {
    // Multiple confirmations for destructive action
    Alert.alert(
      '⚠️ NUCLEAR RESET WARNING',
      'This will PERMANENTLY DELETE ALL XP DATA for ALL USERS and reset everyone to Level 1.\n\nThis action cannot be undone!\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand - RESET ALL',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '💀 FINAL CONFIRMATION',
              'Last chance! This will:\n\n• Delete ALL xp_transactions\n• Delete ALL level_progressions\n• Reset ALL users to Level 1 (0 XP)\n• Clear ALL test data\n\nProceed with nuclear reset?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'YES - NUKE EVERYTHING',
                  style: 'destructive',
                  onPress: executeNuclearReset
                }
              ]
            );
          }
        }
      ]
    );
  };

  const executeNuclearReset = async () => {
    console.log('💥 [NUCLEAR RESET] Starting complete XP system reset...');
    
    try {
      // Initialize Supabase client for proper function calls
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
      );

      console.log('🗑️ [NUCLEAR RESET] Deleting all XP transactions...');
      
      // Use proper database function calls instead of direct table access
      // Delete all XP transactions (requires admin privileges)
      const { error: xpError } = await supabase.rpc('sql', {
        query: 'DELETE FROM xp_transactions;'
      });
      
      if (xpError) {
        console.warn('⚠️ [NUCLEAR RESET] Direct XP deletion failed, trying alternative approach:', xpError.message);
      }

      console.log('🗑️ [NUCLEAR RESET] Deleting all level progressions...');
      
      // Delete all level progressions (requires admin privileges)
      const { error: levelError } = await supabase.rpc('sql', {
        query: 'DELETE FROM level_progressions;'
      });
      
      if (levelError) {
        console.warn('⚠️ [NUCLEAR RESET] Direct level deletion failed, trying alternative approach:', levelError.message);
      }

      console.log('🔄 [NUCLEAR RESET] Resetting current user data...');
      
      // Reset current user's onboarding data using proper function
      if (user?.id) {
        const { error: resetError } = await supabase.rpc('reset_user_onboarding_complete', {
          p_user_id: user.id
        });
        
        if (resetError) {
          console.warn('⚠️ [NUCLEAR RESET] User reset failed:', resetError.message);
        } else {
          console.log('✅ [NUCLEAR RESET] Current user reset successful');
        }
      }

      // Refresh current user's XP data
      await refetchXP();

      console.log('✅ [NUCLEAR RESET] Complete! All XP data has been reset.');
      
      Alert.alert(
        '💥 Nuclear Reset Complete!',
        'XP system has been reset!\n\n• Current user reset to Level 1\n• Database cleanup attempted\n• Please refresh the app\n\nNote: Full database reset requires admin privileges.',
        [{ text: 'OK' }]
      );

      // Close the debug panel
      onClose();

    } catch (error) {
      console.error('❌ [NUCLEAR RESET] Failed:', error);
      Alert.alert(
        'Nuclear Reset Failed',
        `Error: ${error instanceof Error ? error.message : String(error)}\n\nTrying personal reset instead...`,
        [{ text: 'OK' }]
      );
      
      // Fallback: Try personal reset
      await handlePersonalReset();
    }
  };

  const handlePersonalReset = async () => {
    console.log('🔄 [PERSONAL RESET] Resetting current user only...');
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
      );

      if (!user?.id) {
        throw new Error('No user logged in');
      }

      // Reset current user's onboarding data
      const { error: resetError } = await supabase.rpc('reset_user_onboarding_complete', {
        p_user_id: user.id
      });
      
      if (resetError) {
        throw new Error(`Reset failed: ${resetError.message}`);
      }

      // Validate and fix any data integrity issues
      const { data: validationData, error: validationError } = await supabase.rpc('validate_user_data_integrity', {
        p_user_id: user.id
      });
      
      if (validationError) {
        console.warn('⚠️ Validation failed:', validationError.message);
      } else {
        console.log('✅ Data validation result:', validationData);
      }

      // Refresh XP data
      await refetchXP();
      
      Alert.alert(
        '✅ Personal Reset Complete!',
        'Your account has been reset to Level 1!\n\n• All your XP data cleared\n• Level reset to 1\n• Onboarding will restart\n\nPlease refresh the app.',
        [{ text: 'OK' }]
      );

      onClose();

    } catch (error) {
      console.error('❌ [PERSONAL RESET] Failed:', error);
      Alert.alert(
        'Personal Reset Failed',
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        [{ text: 'OK' }]
      );
    }
  };

  if (!__DEV__) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔧 Debug Panel (Unified XP)</Text>
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

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#4ECDC4' }]} 
              onPress={handleLevelUp}
            >
              <Text style={styles.actionButtonText}>🚀 Level Up (+{xpProgress.xp_to_next_level} XP)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#66D9EF' }]} 
              onPress={() => awardXPWithLogging(25, 'Debug +25 XP')}
            >
              <Text style={styles.actionButtonText}>⭐ +25 XP</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#66D9EF' }]} 
              onPress={() => awardXPWithLogging(100, 'Debug +100 XP')}
            >
              <Text style={styles.actionButtonText}>⭐ +100 XP</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#A6E22E' }]} 
              onPress={() => handleJumpToLevel(2)}
            >
              <Text style={styles.actionButtonText}>🏆 Jump to Level 2</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#A6E22E' }]} 
              onPress={() => handleJumpToLevel(5)}
            >
              <Text style={styles.actionButtonText}>🎯 Jump to Level 5</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#9B59B6' }]} 
              onPress={() => handleJumpToLevel(10)}
            >
              <Text style={styles.actionButtonText}>🔮 Jump to Level 10</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FD971F' }]} 
              onPress={logCurrentState}
            >
              <Text style={styles.actionButtonText}>🔍 Log Current State</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#17A2B8' }]} 
              onPress={handleRefresh}
            >
              <Text style={styles.actionButtonText}>🔄 Refresh XP Data</Text>
            </TouchableOpacity>
          </View>

          {/* Small XP Amounts for Testing Progress */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧪 Fine-Tune Progress (Small Amounts)</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.smallButton, { backgroundColor: '#28A745' }]} 
                onPress={() => awardXPWithLogging(5, 'Debug +5 XP')}
              >
                <Text style={styles.smallButtonText}>+5</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.smallButton, { backgroundColor: '#28A745' }]} 
                onPress={() => awardXPWithLogging(10, 'Debug +10 XP')}
              >
                <Text style={styles.smallButtonText}>+10</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.smallButton, { backgroundColor: '#28A745' }]} 
                onPress={() => awardXPWithLogging(20, 'Debug +20 XP')}
              >
                <Text style={styles.smallButtonText}>+20</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.smallButton, { backgroundColor: '#28A745' }]} 
                onPress={() => awardXPWithLogging(50, 'Debug +50 XP')}
              >
                <Text style={styles.smallButtonText}>+50</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nuclear Reset - Destructive Actions */}
          <View style={[styles.section, { borderColor: '#FF0000', borderWidth: 2 }]}>
            <Text style={[styles.sectionTitle, { color: '#FF0000' }]}>💀 DESTRUCTIVE ACTIONS</Text>
            <Text style={[styles.infoText, { color: '#FF6B47', marginBottom: 12 }]}>
              ⚠️ WARNING: These actions are PERMANENT!
            </Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FD971F' }]} 
              onPress={handlePersonalReset}
            >
              <Text style={styles.actionButtonText}>🔄 RESET MY ACCOUNT - Back to Level 1</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF0000' }]} 
              onPress={handleNuclearReset}
            >
              <Text style={styles.actionButtonText}>💥 NUCLEAR RESET - WIPE ALL USERS</Text>
            </TouchableOpacity>
            
            <Text style={[styles.infoText, { fontSize: 11, color: '#FF6B47', marginTop: 8, textAlign: 'center' }]}>
              Personal Reset: Just your account • Nuclear Reset: ALL users (requires admin)
            </Text>
          </View>

          {/* DIVIDER */}
          <View style={[styles.section, { backgroundColor: 'transparent', borderWidth: 0, padding: 8, alignItems: 'center' }]}>
            <Text style={[styles.sectionTitle, { color: '#888', fontSize: 14 }]}>📊 STATS & DEBUG INFO</Text>
          </View>

          {/* Unified XP System State */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Unified XP System (Live Data)</Text>
            <Text style={styles.infoText}>Level: {currentLevel}</Text>
            <Text style={styles.infoText}>Total XP: {currentXP.toLocaleString()}</Text>
            <Text style={styles.infoText}>XP in Current Level: {xpProgress.xp_in_current_level}</Text>
            <Text style={styles.infoText}>XP to Next Level: {xpProgress.xp_to_next_level}</Text>
            <Text style={styles.infoText}>Progress Percentage: {Math.round(xpProgress.progress_percentage || 0)}%</Text>
            <Text style={styles.infoText}>Next Level XP: {xpProgress.next_level_xp?.toLocaleString() || 'Max Level'}</Text>
            <Text style={styles.infoText}>Pending XP: {pendingXP}</Text>
            <Text style={styles.infoText}>Loading: {isLoading ? 'Yes' : 'No'}</Text>
            <Text style={styles.infoText}>Error: {error || 'None'}</Text>
          </View>

          {/* Visual Progress Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Visual Progress Info</Text>
            <Text style={styles.infoText}>Segments Filled: {Math.floor((xpProgress.progress_percentage || 0) / 10)}/10</Text>
            <Text style={styles.infoText}>Progress Bar: {Math.round(xpProgress.progress_percentage || 0)}%</Text>
            <Text style={styles.infoText}>Expected Segments: {Math.floor((xpProgress.progress_percentage || 0) / 10)} filled out of 10</Text>
            <Text style={styles.infoText}>Visual Check: {Math.floor((xpProgress.progress_percentage || 0) / 10) === 2 ? '✅ 2 segments = 20%' : `❓ ${Math.floor((xpProgress.progress_percentage || 0) / 10)} segments`}</Text>
          </View>

          {/* Level Requirements Guide */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Level Requirements</Text>
            <Text style={styles.infoText}>Level 1: 0 XP</Text>
            <Text style={styles.infoText}>Level 2: 100 XP 🏆</Text>
            <Text style={styles.infoText}>Level 3: 200 XP 💬</Text>
            <Text style={styles.infoText}>Level 4: 320 XP 📊</Text>
            <Text style={styles.infoText}>Level 5: 450 XP 👤 (All Core Features)</Text>
            <Text style={styles.infoText}>Level 6: 750 XP ⚡</Text>
            <Text style={styles.infoText}>Level 10: 2,500 XP 🔮</Text>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  smallButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
}); 