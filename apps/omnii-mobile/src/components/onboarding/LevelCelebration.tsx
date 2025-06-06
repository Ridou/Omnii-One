import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  Animated, 
  Dimensions, 
  Modal,
  TouchableOpacity,
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { cn } from '~/utils/cn';
import { useTheme } from '~/context/ThemeContext';
import type { LevelProgression } from '~/types/onboarding';

const { width, height } = Dimensions.get('window');

interface LevelCelebrationProps {
  visible: boolean;
  levelProgression: LevelProgression | null;
  onComplete: () => void;
  onDiscordCTA?: () => void;
  onNavigationCTA?: (level: number) => void;
}

export default function LevelCelebration({
  visible,
  levelProgression,
  onComplete,
  onDiscordCTA,
  onNavigationCTA
}: LevelCelebrationProps) {
  const { isDark } = useTheme();
  const router = useRouter();
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
          description: 'Track your progress and unlock milestones',
          route: '/(tabs)/achievements'
        }];
      case 3:
        return [
          {
            icon: '💬',
            title: 'AI Chat Assistant',
            description: 'Get personalized productivity guidance',
            route: '/(tabs)/chat' // When implemented
          },
          {
            icon: '🎤',
            title: 'Voice Commands',
            description: 'Control OMNII with your voice',
            route: null // System feature
          }
        ];
      case 4:
        return [{
          icon: '📊',
          title: 'Analytics Dashboard',
          description: 'Deep insights into your productivity patterns',
          route: '/(tabs)/analytics' // When implemented
        }];
      case 5:
        return [{
          icon: '👤',
          title: 'Profile & Settings',
          description: 'Customize your AI partnership experience',
          route: '/(tabs)/profile'
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

  // Handle navigation to newly unlocked features
  const handleNavigationCTA = (route: string | null) => {
    if (route && onNavigationCTA && levelProgression) {
      onNavigationCTA(levelProgression.to_level);
      onComplete(); // Close the modal after navigation
    }
  };

  // Handle Discord CTA with proper async/await
  const handleDiscordCTA = async () => {
    if (onDiscordCTA) {
      await onDiscordCTA();
    }
    onComplete();
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
      <View className={cn(
        "flex-1 justify-center items-center",
        "bg-black/95"
      )}>
        <Animated.View
          className={cn(
            "w-[90%] max-w-md items-center py-10"
          )}
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
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
                className="absolute top-20 left-1/2 -ml-2.5"
                style={{
                  transform: [
                    { translateX: x },
                    { translateY: y },
                    { scale: anim },
                    { rotate: sparkleRotate },
                  ],
                  opacity: anim,
                }}
              >
                <Text className="text-xl text-center">✨</Text>
              </Animated.View>
            );
          })}

          {/* Main Content */}
          <View className="items-center w-full">
            {/* Level Badge */}
            <View 
              className="w-20 h-20 rounded-full justify-center items-center mb-5 shadow-2xl"
              style={{ 
                backgroundColor: levelColors.primary,
                shadowColor: levelColors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Text className="text-3xl font-bold text-white">
                {levelProgression.to_level}
              </Text>
            </View>

            {/* Title */}
            <Animated.View
              className="items-center mb-6"
              style={{ transform: [{ scale: titleScale }] }}
            >
              <Text 
                className="text-2xl font-bold text-center tracking-wider mb-2"
                style={{ 
                  color: levelColors.primary,
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                }}
              >
                {getLevelTitle(levelProgression.to_level)}
              </Text>
              {isLevel5 && (
                <Text className="text-base text-orange-400 text-center font-semibold">
                  🎉 ALL CORE FEATURES UNLOCKED! 🎉
                </Text>
              )}
            </Animated.View>

            {/* XP Gained */}
            <View className="items-center mb-8">
              <Text className={cn(
                "text-xs tracking-widest mb-1",
                isDark ? "text-gray-400" : "text-gray-500"
              )}>
                XP GAINED
              </Text>
              <Text 
                className="text-4xl font-bold"
                style={{ 
                  color: levelColors.primary,
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                }}
              >
                +{levelProgression.xp_at_level_up - (levelProgression.from_level * 100)}
              </Text>
            </View>

            {/* Unlocked Features */}
            {animationPhase === 'features' && unlockedFeatures.length > 0 && (
              <View className="w-full items-center mb-6">
                <Text className="text-sm text-white tracking-wide mb-4 text-center">
                  NEW FEATURES UNLOCKED
                </Text>
                {unlockedFeatures.map((feature, index) => (
                  <Animated.View
                    key={index}
                    className={cn(
                      "flex-row items-center w-full p-4 rounded-xl border mb-3",
                      isDark ? "bg-gray-800/50" : "bg-white/10"
                    )}
                    style={{
                      transform: [{ translateX: featureSlideIns[index] || new Animated.Value(-width) }],
                      backgroundColor: `${levelColors.primary}15`,
                      borderColor: `${levelColors.primary}40`,
                    }}
                  >
                    <Text className="text-2xl mr-3">{feature.icon}</Text>
                    <View className="flex-1">
                      <Text 
                        className="text-base font-semibold mb-1"
                        style={{ color: levelColors.primary }}
                      >
                        {feature.title}
                      </Text>
                      <Text className={cn(
                        "text-sm leading-5",
                        isDark ? "text-gray-300" : "text-gray-200"
                      )}>
                        {feature.description}
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}

            {/* Level 5 Discord CTA */}
            {isLevel5 && animationPhase === 'complete' && onDiscordCTA && (
              <TouchableOpacity 
                className="bg-[#5865F2] px-6 py-3 rounded-xl mb-4 shadow-lg active:scale-95"
                onPress={handleDiscordCTA}
                style={{
                  shadowColor: '#5865F2',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Text className="text-white text-sm font-semibold text-center">
                  💬 Join our Discord for feedback & exclusive tips!
                </Text>
              </TouchableOpacity>
            )}

            {/* Navigation CTAs for unlocked features */}
            {animationPhase === 'complete' && unlockedFeatures.length > 0 && (
              <View className="w-full mb-4">
                {unlockedFeatures.filter(f => f.route).map((feature, index) => (
                  <TouchableOpacity
                    key={index}
                    className={cn(
                      "flex-row items-center justify-center py-3 px-6 rounded-xl mb-2 shadow-lg active:scale-95"
                    )}
                    style={{
                      backgroundColor: levelColors.primary,
                      shadowColor: levelColors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                    onPress={() => handleNavigationCTA(feature.route)}
                  >
                    <Text className="text-white text-base font-semibold mr-2">
                      Explore {feature.title}
                    </Text>
                    <Text className="text-white text-lg">→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Continue Button */}
            {animationPhase === 'complete' && (
              <TouchableOpacity 
                className={cn(
                  "px-8 py-4 rounded-2xl shadow-xl active:scale-95",
                  isLevel5 ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-indigo-500 to-purple-600"
                )}
                onPress={onComplete}
                style={{
                  shadowColor: isLevel5 ? '#FF3B30' : '#6366f1',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Text className="text-white text-lg font-semibold text-center">
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