import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Modal,
  TouchableOpacity,
  StatusBar 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppColors } from '~/constants/Colors';
import type { LevelProgression } from '~/types/onboarding';

const { width, height } = Dimensions.get('window');

interface LevelCelebrationProps {
  visible: boolean;
  levelProgression: LevelProgression | null;
  onComplete: () => void;
  onDiscordCTA?: () => void;
}

export default function LevelCelebration({
  visible,
  levelProgression,
  onComplete,
  onDiscordCTA
}: LevelCelebrationProps) {
  const [animationPhase, setAnimationPhase] = useState<'entrance' | 'celebration' | 'features' | 'complete'>('entrance');
  
  // Animated values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sparkleRotation = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.5)).current;
  const particleAnimations = useRef(Array.from({ length: 12 }, () => new Animated.Value(0))).current;
  const featureSlideIns = useRef(Array.from({ length: 3 }, () => new Animated.Value(-width))).current;

  useEffect(() => {
    if (visible && levelProgression) {
      startCelebrationSequence();
    } else {
      resetAnimations();
    }
  }, [visible, levelProgression]);

  const resetAnimations = () => {
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    sparkleRotation.setValue(0);
    titleScale.setValue(0.5);
    particleAnimations.forEach(anim => anim.setValue(0));
    featureSlideIns.forEach(anim => anim.setValue(-width));
    setAnimationPhase('entrance');
  };

  const startCelebrationSequence = async () => {
    // Phase 1: Dramatic entrance
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Wait for entrance to complete
    setTimeout(() => {
      startMainCelebration();
    }, 500);
  };

  const startMainCelebration = async () => {
    setAnimationPhase('celebration');
    
    // Epic level up explosion
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Title scale up
    Animated.spring(titleScale, {
      toValue: 1.2,
      tension: 80,
      friction: 6,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(titleScale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });

    // Sparkle rotation
    Animated.loop(
      Animated.timing(sparkleRotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Particle burst animation
    particleAnimations.forEach((anim, index) => {
      const delay = index * 50;
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    });

    // Wait then show features
    setTimeout(() => {
      showUnlockedFeatures();
    }, 1500);
  };

  const showUnlockedFeatures = () => {
    setAnimationPhase('features');
    
    // Slide in feature cards
    featureSlideIns.forEach((anim, index) => {
      const delay = index * 200;
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, delay);
    });

    // Auto-complete after showing features
    setTimeout(() => {
      setAnimationPhase('complete');
    }, 2000);
  };

  const getUnlockedFeatures = (level: number) => {
    switch (level) {
      case 2:
        return [{
          icon: '🏆',
          title: 'Achievement System',
          description: 'Track your progress and unlock milestones'
        }];
      case 3:
        return [
          {
            icon: '💬',
            title: 'AI Chat Assistant',
            description: 'Get personalized productivity guidance'
          },
          {
            icon: '🎤',
            title: 'Voice Commands',
            description: 'Control OMNII with your voice'
          }
        ];
      case 4:
        return [{
          icon: '📊',
          title: 'Analytics Dashboard',
          description: 'Deep insights into your productivity patterns'
        }];
      case 5:
        return [{
          icon: '👤',
          title: 'Profile & Settings',
          description: 'Customize your AI partnership experience'
        }];
      default:
        return [];
    }
  };

  const getLevelTitle = (level: number) => {
    if (level === 2) return 'ACHIEVEMENT UNLOCKED';
    if (level === 3) return 'AI AWAKENING';
    if (level === 4) return 'DATA INSIGHTS';
    if (level === 5) return 'MASTERY ACHIEVED';
    if (level <= 10) return 'PRODUCTIVITY EXPERT';
    if (level <= 15) return 'EFFICIENCY GURU';
    if (level <= 20) return 'WORKFLOW SAGE';
    if (level <= 25) return 'PRODUCTIVITY LEGEND';
    if (level <= 30) return 'SYSTEM TITAN';
    if (level <= 40) return 'EFFICIENCY DEITY';
    return 'TRANSCENDENT MASTER';
  };

  const getLevelColors = (level: number) => {
    if (level <= 2) return { primary: '#4ECDC4', secondary: '#44B3A8' };
    if (level === 3) return { primary: '#FF7043', secondary: '#FF5722' }; // Vibrant Orange
    if (level === 4) return { primary: '#00BFFF', secondary: '#1E90FF' }; // AI Blue
    if (level === 5) return { primary: '#FF3B30', secondary: '#DC143C' }; // Clean Red
    if (level <= 10) return { primary: '#9B59B6', secondary: '#8E44AD' }; // Purple
    if (level <= 15) return { primary: '#E74C3C', secondary: '#C0392B' }; // Red
    if (level <= 20) return { primary: '#F39C12', secondary: '#E67E22' }; // Orange
    if (level <= 25) return { primary: '#2ECC71', secondary: '#27AE60' }; // Green
    if (level <= 30) return { primary: '#3498DB', secondary: '#2980B9' }; // Blue
    if (level <= 40) return { primary: '#9B59B6', secondary: '#8E44AD' }; // Purple
    return { primary: '#FF7043', secondary: '#FF5722' }; // Transcendent Orange
  };

  if (!visible || !levelProgression) return null;

  const levelColors = getLevelColors(levelProgression.to_level);
  const unlockedFeatures = getUnlockedFeatures(levelProgression.to_level);
  const isLevel5 = levelProgression.to_level === 5;

  const sparkleRotate = sparkleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} animationType="none" transparent>
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Background Sparkles */}
          {particleAnimations.map((anim, index) => {
            const angle = (index / particleAnimations.length) * 2 * Math.PI;
            const radius = 120;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            return (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  {
                    transform: [
                      { translateX: x },
                      { translateY: y },
                      { scale: anim },
                      { rotate: sparkleRotate },
                    ],
                    opacity: anim,
                  },
                ]}
              >
                <Text style={styles.sparkle}>✨</Text>
              </Animated.View>
            );
          })}

          {/* Main Content */}
          <View style={styles.content}>
            {/* Level Badge */}
            <View style={[styles.levelBadge, { backgroundColor: levelColors.primary }]}>
              <Text style={styles.levelNumber}>{levelProgression.to_level}</Text>
            </View>

            {/* Title */}
            <Animated.View
              style={[
                styles.titleContainer,
                { transform: [{ scale: titleScale }] },
              ]}
            >
              <Text style={[styles.levelTitle, { color: levelColors.primary }]}>
                {getLevelTitle(levelProgression.to_level)}
              </Text>
              {isLevel5 && (
                <Text style={styles.subtitle}>
                  🎉 ALL CORE FEATURES UNLOCKED! 🎉
                </Text>
              )}
            </Animated.View>

            {/* XP Gained */}
            <View style={styles.xpContainer}>
              <Text style={styles.xpLabel}>XP GAINED</Text>
              <Text style={[styles.xpAmount, { color: levelColors.primary }]}>
                +{levelProgression.xp_at_level_up - (levelProgression.from_level * 100)}
              </Text>
            </View>

            {/* Unlocked Features */}
            {animationPhase === 'features' && unlockedFeatures.length > 0 && (
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>NEW FEATURES UNLOCKED</Text>
                {unlockedFeatures.map((feature, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.featureCard,
                      {
                        transform: [{ translateX: featureSlideIns[index] || new Animated.Value(-width) }],
                        backgroundColor: `${levelColors.primary}15`,
                        borderColor: `${levelColors.primary}40`,
                      },
                    ]}
                  >
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                    <View style={styles.featureText}>
                      <Text style={[styles.featureTitle, { color: levelColors.primary }]}>
                        {feature.title}
                      </Text>
                      <Text style={styles.featureDescription}>
                        {feature.description}
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}

            {/* Level 5 Discord CTA */}
            {isLevel5 && animationPhase === 'complete' && onDiscordCTA && (
              <TouchableOpacity style={styles.discordButton} onPress={onDiscordCTA}>
                <Text style={styles.discordText}>
                  💬 Join our Discord for feedback & exclusive tips!
                </Text>
              </TouchableOpacity>
            )}

            {/* Continue Button */}
            {animationPhase === 'complete' && (
              <TouchableOpacity style={styles.continueButton} onPress={onComplete}>
                <Text style={styles.continueText}>
                  {isLevel5 ? 'Begin Your Journey' : 'Continue'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: 40,
  },
  particle: {
    position: 'absolute',
    top: 80,
    left: '50%',
    marginLeft: -10,
  },
  sparkle: {
    fontSize: 20,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  levelBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#FF7043',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  xpContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  xpLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  xpAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featuresContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 14,
    color: 'white',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  discordButton: {
    backgroundColor: '#5865F2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  discordText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: AppColors.aiGradientStart,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: AppColors.aiGradientStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 