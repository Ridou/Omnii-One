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
import { AppColors } from '~/constants/Colors';
import { XPSystemUtils } from '~/constants/XPSystem';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function DebugPanel({ visible, onClose }: DebugPanelProps) {
  const { user } = useAuth();
  const { xpProgress, currentLevel, currentXP, awardXP } = useXPSystem();
  const [isLoading, setIsLoading] = useState(false);

  const handleAwardTestXP = async () => {
    try {
      setIsLoading(true);
      await awardXP(25, 'Debug Test', 'debug');
      Alert.alert('Success', 'Awarded 25 XP for testing');
    } catch (error) {
      Alert.alert('Error', 'Failed to award XP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelUpTest = async () => {
    try {
      setIsLoading(true);
      const xpNeeded = XPSystemUtils.getXPToNextLevel(currentXP, currentLevel);
      await awardXP(xpNeeded, 'Debug Level Up Test', 'debug');
      Alert.alert('Success', `Awarded ${xpNeeded} XP to level up`);
    } catch (error) {
      Alert.alert('Error', 'Failed to award level up XP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMegaXP = async () => {
    try {
      setIsLoading(true);
      await awardXP(500, 'Debug Mega XP', 'debug');
      Alert.alert('Success', 'Awarded 500 XP!');
    } catch (error) {
      Alert.alert('Error', 'Failed to award mega XP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔧 Debug Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 User Info</Text>
            <Text style={styles.debugText}>Email: {user?.email || 'Not logged in'}</Text>
            <Text style={styles.debugText}>ID: {user?.id || 'N/A'}</Text>
          </View>

          {/* XP System Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ XP System</Text>
            <Text style={styles.debugText}>Current Level: {currentLevel}</Text>
            <Text style={styles.debugText}>Current XP: {currentXP}</Text>
            <Text style={styles.debugText}>XP in Level: {xpProgress.xp_in_current_level}</Text>
            <Text style={styles.debugText}>XP to Next: {xpProgress.xp_to_next_level}</Text>
            <Text style={styles.debugText}>Progress: {Math.round(xpProgress.progress_percentage)}%</Text>
            <Text style={styles.debugText}>Next Level XP: {xpProgress.next_level_xp || 'Max Level'}</Text>
          </View>

          {/* XP Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎮 XP Testing</Text>
            
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]}
              onPress={handleAwardTestXP}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Award 25 XP</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={handleLevelUpTest}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Level Up ({XPSystemUtils.getXPToNextLevel(currentXP, currentLevel)} XP)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.warningButton]}
              onPress={handleMegaXP}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Mega XP (500)</Text>
            </TouchableOpacity>
          </View>

          {/* Level Requirements Reference */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Level Requirements</Text>
            <Text style={styles.debugText}>Level 1: 0 XP</Text>
            <Text style={styles.debugText}>Level 2: 100 XP</Text>
            <Text style={styles.debugText}>Level 3: 200 XP</Text>
            <Text style={styles.debugText}>Level 4: 320 XP</Text>
            <Text style={styles.debugText}>Level 5: 450 XP</Text>
            <Text style={styles.debugText}>Level 6: 750 XP</Text>
            <Text style={styles.debugText}>Level 10: 2500 XP</Text>
          </View>

          {/* Status */}
          {isLoading && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏳ Loading...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.aiGradientStart,
    marginBottom: 10,
  },
  debugText: {
    fontSize: 13,
    color: '#CCC',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: AppColors.aiGradientStart,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AppColors.aiGradientStart,
  },
  warningButton: {
    backgroundColor: '#FF6B47',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: AppColors.aiGradientStart,
  },
}); 