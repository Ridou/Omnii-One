import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingContext } from '~/context/OnboardingContext';
import { AppColors } from '~/constants/Colors';
import type { ContextualNudge } from '~/types/onboarding';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ContextualNudgeProps {
  style?: any;
}

export default function ContextualNudgeComponent({ style }: ContextualNudgeProps) {
  const { getActiveNudges, dismissNudge, recordFeatureVisit, markNudgeShown } = useOnboardingContext();
  const router = useRouter();
  const [currentNudge, setCurrentNudge] = useState<ContextualNudge | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [visible, setVisible] = useState(false);

  // Check for active nudges that should be shown
  useEffect(() => {
    const activeNudges = getActiveNudges();
    
    if (__DEV__) {
      console.log('🔔 ContextualNudge: Checking nudges', {
        activeNudges: activeNudges.map(n => ({ 
          id: n.id, 
          feature: n.feature_name, 
          dismissed: n.dismissed,
          shown: n.shown 
        })),
        currentNudge: currentNudge?.feature_name
      });
    }
    
    // Only show nudges that haven't been dismissed AND haven't been shown
    const nudgeToShow = activeNudges.find(nudge => 
      !nudge.dismissed && !nudge.shown
    );

    if (nudgeToShow && !currentNudge) {
      console.log('🔔 Showing nudge:', nudgeToShow.feature_name);
      setCurrentNudge(nudgeToShow);
      setVisible(true);
      
      // Mark this nudge as shown immediately
      markNudgeShown(nudgeToShow.id);
      
      // Fade in and scale animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        })
      ]).start();
    }
  }, [getActiveNudges(), currentNudge, markNudgeShown]);

  const handleExplore = () => {
    if (!currentNudge) return;

    // Record feature visit (awards XP)
    recordFeatureVisit(currentNudge.feature_name);
    
    // Navigate to the feature
    const routes = {
      achievements: '/(tabs)/achievements',
      chat: '/(tabs)/chat', 
      analytics: '/(tabs)/analytics',
      profile: '/(tabs)/profile',
    };
    
    const route = routes[currentNudge.feature_name as keyof typeof routes];
    if (route) {
      router.push(route);
    }
    
    // Dismiss the nudge
    handleDismiss();
  };

  const handleDismiss = () => {
    if (!currentNudge) return;

    // Fade out animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      dismissNudge(currentNudge.id);
      setCurrentNudge(null);
      setVisible(false);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    });
  };

  // Get detailed benefits for each feature
  const getDetailedBenefits = (featureName: string) => {
    const benefits = {
      achievements: [
        '🎯 Track your productivity milestones',
        '📈 Visualize your growth journey',
        '🏅 Unlock rewards as you progress',
        '💪 Stay motivated with gamification'
      ],
      chat: [
        '🤖 Get instant AI assistance',
        '💡 Receive personalized productivity tips',
        '🎙️ Use voice commands for hands-free control',
        '🧠 Learn from AI insights about your work patterns'
      ],
      analytics: [
        '📊 See your productivity patterns',
        '🔍 Discover your peak performance times',
        '📈 Track improvement over time',
        '🎯 Get data-driven recommendations'
      ],
      profile: [
        '⚙️ Customize your AI assistant personality',
        '🎨 Tune the experience to your work style',
        '🔐 Control your data and privacy',
        '🌟 Join the OMNII community'
      ]
    };
    
    return benefits[featureName as keyof typeof benefits] || [];
  };

  if (!visible || !currentNudge) {
    return null;
  }

  const benefits = getDetailedBenefits(currentNudge.feature_name);

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleDismiss}
      />
      
      <Animated.View
        style={[
          styles.container,
          style,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.nudgeCard}>
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.header}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{currentNudge.title}</Text>
              <Text style={styles.message}>{currentNudge.message}</Text>
            </View>
          </View>
          
          {benefits.length > 0 && (
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>What you'll discover:</Text>
              {benefits.map((benefit, index) => (
                <Text key={index} style={styles.benefitItem}>{benefit}</Text>
              ))}
            </View>
          )}
          
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleExplore} style={styles.exploreButton}>
              <Text style={styles.exploreButtonText}>
                Explore {currentNudge.feature_name}
              </Text>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>+{currentNudge.xp_reward} XP</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
  },
  nudgeCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: AppColors.aiGradientStart,
    shadowColor: AppColors.aiGradientStart,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  dismissButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dismissText: {
    fontSize: 16,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  message: {
    fontSize: 16,
    color: AppColors.textSecondary,
    lineHeight: 22,
  },
  benefitsSection: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  exploreButton: {
    backgroundColor: AppColors.aiGradientStart,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.aiGradientStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  xpBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  xpText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 