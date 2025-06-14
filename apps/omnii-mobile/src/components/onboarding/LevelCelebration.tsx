import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  Animated, 
  Dimensions, 
  Modal,
  TouchableOpacity,
  StatusBar,
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cn } from '~/utils/cn';
import { useTheme } from '~/context/ThemeContext';
import { useResponsiveDesign } from '~/utils/responsive';
import { useAuth } from '~/context/AuthContext';
import type { LevelProgression } from '~/types/xp';
import { LEVEL_REQUIREMENTS } from '~/types/xp';
import { Mascot } from '~/components/common/Mascot';
import { 
  MascotStage, 
  MascotSize, 
  CheeringTrigger, 
  getMascotStageByLevel 
} from '~/types/mascot';

const { width, height } = Dimensions.get('window');

// Storage key for tracking seen celebrations
const SEEN_CELEBRATIONS_KEY = 'seen_level_celebrations';

// Helper functions for persistent celebration tracking
const getCelebrationKey = (userId: string, level: number): string => {
  return `${userId}_level_${level}`;
};

const hasSeenCelebration = async (userId: string, level: number): Promise<boolean> => {
  try {
    const seenCelebrations = await AsyncStorage.getItem(SEEN_CELEBRATIONS_KEY);
    if (!seenCelebrations) return false;
    
    const seen = JSON.parse(seenCelebrations);
    const key = getCelebrationKey(userId, level);
    return seen[key] === true;
  } catch (error) {
    return false;
  }
};

const markCelebrationAsSeen = async (userId: string, level: number): Promise<void> => {
  try {
    const seenCelebrations = await AsyncStorage.getItem(SEEN_CELEBRATIONS_KEY);
    const seen = seenCelebrations ? JSON.parse(seenCelebrations) : {};
    
    const key = getCelebrationKey(userId, level);
    seen[key] = true;
    
    await AsyncStorage.setItem(SEEN_CELEBRATIONS_KEY, JSON.stringify(seen));
  } catch (error) {
    // Silently fail - celebration tracking is not critical
  }
};

// Utility function to clear celebration history (useful for testing)
export const clearCelebrationHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SEEN_CELEBRATIONS_KEY);
  } catch (error) {
    // Silently fail
  }
};

// Utility function to get all seen celebrations (useful for debugging)
export const getSeenCelebrations = async (): Promise<Record<string, boolean>> => {
  try {
    const seenCelebrations = await AsyncStorage.getItem(SEEN_CELEBRATIONS_KEY);
    return seenCelebrations ? JSON.parse(seenCelebrations) : {};
  } catch (error) {
    return {};
  }
};

interface LevelCelebrationProps {
  visible: boolean;
  levelProgression: LevelProgression | null;
  onComplete: () => void;
  onDiscordCTA?: () => void;
  onNavigationCTA?: (level: number) => void;
}

// Desktop Toast Notification Component
const DesktopLevelToast: React.FC<{
  visible: boolean;
  levelProgression: LevelProgression;
  onComplete: () => void | Promise<void>;
  xpGained: number;
  levelTitle: string;
  levelColors: { primary: string; secondary: string };
}> = ({ visible, levelProgression, onComplete, xpGained, levelTitle, levelColors }) => {
  const { isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(-400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in from the top-right
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 5 seconds
      const timeout = setTimeout(() => {
        dismissToast();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -400,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      className="absolute top-6 right-6 z-50"
      style={{
        transform: [{ translateX: slideAnim }],
        opacity: fadeAnim,
      }}
    >
      <View
        className={cn(
          "rounded-2xl p-4 border shadow-2xl min-w-[320px] max-w-[400px]",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}
        style={{
          shadowColor: levelColors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 15,
        }}
      >
        {/* Header with Level Badge */}
        <View className="flex-row items-center mb-3">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-3 border-2 border-white/20"
            style={{ backgroundColor: levelColors.primary }}
          >
            <Text className="text-lg font-black text-white">
              {levelProgression.to_level}
            </Text>
          </View>
          <View className="flex-1">
            <Text className={cn(
              "text-lg font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              Level Up!
            </Text>
            <Text className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {levelTitle}
            </Text>
          </View>
          <TouchableOpacity
            onPress={dismissToast}
            className="w-6 h-6 items-center justify-center"
          >
            <Text className={cn(
              "text-lg",
              isDark ? "text-slate-400" : "text-gray-400"
            )}>×</Text>
          </TouchableOpacity>
        </View>

        {/* XP Gained */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className={cn(
            "text-sm font-medium",
            isDark ? "text-slate-300" : "text-gray-700"
          )}>
            XP Gained:
          </Text>
          <Text
            className="text-lg font-bold"
            style={{ color: levelColors.primary }}
          >
            +{xpGained}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 py-2 px-3 rounded-lg"
            style={{ backgroundColor: `${levelColors.primary}20` }}
            onPress={dismissToast}
          >
            <Text
              className="text-sm font-semibold text-center"
              style={{ color: levelColors.primary }}
            >
              Continue
            </Text>
          </TouchableOpacity>
          {levelProgression.to_level === 5 && (
            <TouchableOpacity
              className="flex-1 py-2 px-3 rounded-lg border"
              style={{ 
                backgroundColor: levelColors.primary,
                borderColor: levelColors.secondary
              }}
              onPress={dismissToast}
            >
              <Text className="text-sm font-semibold text-center text-white">
                Explore
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Celebration particles */}
        <View className="absolute top-2 right-2">
          <Text className="text-xl">🎉</Text>
        </View>
        <View className="absolute top-4 right-8">
          <Text className="text-sm">✨</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default function LevelCelebration({
  visible,
  levelProgression,
  onComplete,
  onDiscordCTA,
  onNavigationCTA
}: LevelCelebrationProps) {
  const { isDark } = useTheme();
  const responsive = useResponsiveDesign();
  const router = useRouter();
  const { user } = useAuth();
  const [animationPhase, setAnimationPhase] = useState<'entrance' | 'celebration' | 'features' | 'complete'>('entrance');
  const [shouldShowCelebration, setShouldShowCelebration] = useState(false);
  const [isCheckingCelebration, setIsCheckingCelebration] = useState(true);
  
  // Check if this celebration has already been shown
  useEffect(() => {
    const checkCelebrationStatus = async () => {
      if (!visible || !levelProgression || !user?.id) {
        setIsCheckingCelebration(false);
        setShouldShowCelebration(false);
        return;
      }

      try {
        const hasBeenSeen = await hasSeenCelebration(user.id, levelProgression.to_level);
        setShouldShowCelebration(!hasBeenSeen);
      } catch (error) {
        // If we can't check, show the celebration to be safe
        setShouldShowCelebration(true);
      } finally {
        setIsCheckingCelebration(false);
      }
    };

    checkCelebrationStatus();
  }, [visible, levelProgression, user?.id]);

  // Handle completion and mark as seen
  const handleComplete = async () => {
    if (levelProgression && user?.id) {
      await markCelebrationAsSeen(user.id, levelProgression.to_level);
    }
    onComplete();
  };

  // Calculate the actual XP gained for this level up
  const calculateXPGained = (levelProgression: LevelProgression | null): number => {
    if (!levelProgression) return 0;
    
    // ✅ VALIDATION: Check if the progression data makes sense
    const currentLevelXP = levelProgression.xp_at_level_up;
    const fromLevelRequirement = LEVEL_REQUIREMENTS[levelProgression.from_level as keyof typeof LEVEL_REQUIREMENTS] || 0;
    const toLevelRequirement = LEVEL_REQUIREMENTS[levelProgression.to_level as keyof typeof LEVEL_REQUIREMENTS] || 0;
    
    // Validate that the user has enough XP for the claimed level
    if (currentLevelXP < toLevelRequirement) {
      // Invalid level progression data detected
      return 0; // This will cause the celebration to show 0 XP (indicating invalid data)
    }
    
    // More accurate calculation: XP at level up minus XP required for previous level
    const xpInPreviousLevel = currentLevelXP - fromLevelRequirement;
    
    // For a cleaner display, show XP needed to level up (more intuitive)
    const xpToLevelUp = toLevelRequirement - fromLevelRequirement;
    
    // Level progression calculations logged for debugging
    
    // Show the XP required to reach this level (more meaningful for user)
    return xpToLevelUp;
  };
  
  // Animated values - MORE PARTICLES for bigger dopamine hit!
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sparkleRotation = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.5)).current;
  const particleAnimations = useRef(Array.from({ length: 24 }, () => new Animated.Value(0))).current; // Double the particles!
  const featureSlideIns = useRef(Array.from({ length: 3 }, () => new Animated.Value(-width))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current; // New pulse animation for level badge

  useEffect(() => {
    if (visible && levelProgression && shouldShowCelebration) {
      startCelebrationSequence();
    } else {
      resetAnimations();
    }
  }, [visible, levelProgression, shouldShowCelebration]);

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
    
    // Epic level up explosion with MORE haptic feedback!
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Double haptic for extra satisfaction
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 200);
    
    // Dramatic title scale up with bounce
    Animated.spring(titleScale, {
      toValue: 1.3, // Bigger scale!
      tension: 60,  // More bounce
      friction: 5,  // More dramatic
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(titleScale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });

    // Continuous pulsing animation for level badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Faster sparkle rotation for more energy
    Animated.loop(
      Animated.timing(sparkleRotation, {
        toValue: 1,
        duration: 2000, // Faster rotation
        useNativeDriver: true,
      })
    ).start();

    // More intense particle burst animation with staggered timing
    particleAnimations.forEach((anim, index) => {
      const delay = (index % 8) * 30; // Stagger in waves
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1200, // Longer duration
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    });

    // Wait then show completion
    setTimeout(() => {
      setAnimationPhase('complete');
    }, 3000); // Show celebration for 3 seconds
  };



  const getLevelTitle = (level: number) => {
    if (level <= 5) return `LEVEL ${level} ACHIEVED`;
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

  // Don't show anything while checking if celebration has been seen
  if (isCheckingCelebration) return null;

  // Don't show if this celebration has already been seen
  if (!shouldShowCelebration) return null;

  // ✅ VALIDATION: Don't show celebration if data is invalid
  const xpGained = calculateXPGained(levelProgression);
  if (xpGained === 0) {
    // Auto-close invalid celebration after a brief delay
    setTimeout(() => {
      handleComplete();
    }, 100);
    return null;
  }

  const levelColors = getLevelColors(levelProgression.to_level);

  // ✅ DESKTOP: Show compact toast notification instead of full-screen modal
  if (responsive.effectiveIsDesktop) {
    return (
      <DesktopLevelToast
        visible={visible}
        levelProgression={levelProgression}
        onComplete={handleComplete}
        xpGained={xpGained}
        levelTitle={getLevelTitle(levelProgression.to_level)}
        levelColors={levelColors}
      />
    );
  }

  // ✅ MOBILE: Show full celebration experience
  const sparkleRotate = sparkleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} animationType="none" transparent>
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      
      {/* Dark Background */}
      <View 
        style={{ 
          flex: 1, 
          backgroundColor: 'rgba(15, 15, 35, 0.97)' // Dark purple-blue background
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={{ 
              flexGrow: 1, 
              justifyContent: 'center', 
              alignItems: 'center', 
              paddingHorizontal: 16,
              paddingVertical: 20,
              minHeight: height * 0.8 // Ensure minimum height for proper centering
            }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Animated.View
              className="w-full items-center"
              style={{
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
                maxWidth: 350, // Limit max width for better responsive design
                width: '100%'
              }}
            >
              {/* Floating Sparkles with MORE VARIETY! */}
              {particleAnimations.map((anim, index) => {
                const angle = (index / particleAnimations.length) * 2 * Math.PI;
                const radius = 160 + (index % 3) * 20; // Varying radius for depth
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                // Different sparkle types for more visual interest
                const sparkleTypes = ['✨', '⭐', '💫', '🌟', '✦', '⚡'];
                const sparkleType = sparkleTypes[index % sparkleTypes.length];
                const sparkleSize = index % 2 === 0 ? 'text-3xl' : 'text-2xl';
                
                return (
                  <Animated.View
                    key={index}
                    className="absolute"
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
                    <Text className={sparkleSize}>{sparkleType}</Text>
                  </Animated.View>
                );
              })}

              {/* Level Badge with Glow and Pulse */}
              <Animated.View 
                className="relative mb-6"
                style={{
                  transform: [{ scale: pulseAnim }],
                }}
              >
                <View
                  className="w-24 h-24 rounded-full justify-center items-center shadow-2xl border-4 border-white/30"
                  style={{ 
                    backgroundColor: levelColors.primary,
                    shadowColor: levelColors.primary,
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.8,
                    shadowRadius: 25,
                    elevation: 15,
                  }}
                >
                  <Text className="text-4xl font-black text-white">
                    {levelProgression.to_level}
                  </Text>
                </View>
                
                {/* Multiple Pulsing Rings for more impact */}
                <Animated.View 
                  className="absolute inset-0 w-24 h-24 rounded-full border-2 opacity-60"
                  style={{ 
                    borderColor: levelColors.primary,
                    transform: [{ scale: pulseAnim }],
                  }}
                />
                <Animated.View 
                  className="absolute inset-0 w-24 h-24 rounded-full border-2 opacity-30"
                  style={{ 
                    borderColor: levelColors.secondary,
                    transform: [{ scale: pulseAnim.interpolate({
                      inputRange: [1, 1.1],
                      outputRange: [1.1, 1.2]
                    }) }],
                  }}
                />
              </Animated.View>

              {/* Title with Gradient Text Effect */}
              <Animated.View
                className="items-center mb-4"
                style={{ transform: [{ scale: titleScale }] }}
              >
                <Text 
                  className="text-2xl font-black text-center tracking-wider mb-2 text-white"
                  style={{ 
                    textShadowColor: levelColors.primary,
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 8,
                  }}
                >
                  {getLevelTitle(levelProgression.to_level)}
                </Text>

              </Animated.View>

              {/* XP Gained with Glow Effect */}
              <View className="items-center mb-6">
                <Text className="text-xs tracking-[0.2em] mb-2 text-gray-300 font-semibold">
                  XP GAINED
                </Text>
                <View 
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-3"
                  style={{ 
                    shadowColor: levelColors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                  }}
                >
                  <Text 
                    className="text-4xl font-black text-center"
                    style={{ 
                      color: levelColors.primary,
                      textShadowColor: 'rgba(255,255,255,0.3)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 4,
                    }}
                  >
                    +{xpGained}
                  </Text>
                </View>
              </View>



              {/* Action Buttons */}
              {animationPhase === 'complete' && (
                <View className="w-full">
                  {/* Continue Button */}
                  <TouchableOpacity 
                    className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl py-3 px-8 shadow-xl active:scale-95 mb-6"
                    onPress={handleComplete}
                  >
                    <Text className="text-white text-base font-bold text-center">
                      ✨ Continue
                    </Text>
                  </TouchableOpacity>

                  {/* Celebrating Mascot */}
                  <View className="items-center mt-2">
                    <Mascot
                      stage={getMascotStageByLevel(levelProgression.to_level)}
                      level={levelProgression.to_level}
                      size={MascotSize.LARGE}
                      showLevel={false}
                      enableInteraction={false}
                      enableCheering={false}
                      cheeringTrigger={CheeringTrigger.LEVEL_UP}
                    />
                    <Text className="text-white/70 text-xs mt-2 text-center font-medium">
                      🎉 Congratulations on reaching Level {levelProgression.to_level}! 🎉
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
} 