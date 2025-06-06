import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Image, Animated, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import {
  MascotStage,
  MascotSize,
  MascotExpression,
  CheeringTrigger,
  type ProfileMascotProps as MascotProps,
  type MascotState,
  type CheeringState,
  type SizeConfig,
  type UseMascotCheeringReturn,
  DEFAULT_ENCOURAGEMENT_MESSAGES,
  ANIMATION_TIMINGS,
  getMascotStageByLevel,
  getStageDisplayName
} from '~/types/mascot';

interface MascotStateInternal extends MascotState {
  cheeringMessage?: string;
}

export const Mascot: React.FC<MascotProps> = ({
  stage,
  level,
  size = MascotSize.STANDARD,
  showLabel = false,
  showLevel = true,
  enableInteraction = true,
  enableCheering = false,
  cheeringTrigger = null,
  onTap,
  className = '',
  style = {}
}) => {
  const { isDark } = useTheme();
  const [mascotState, setMascotState] = useState<MascotStateInternal>({
    isAnimating: false,
    currentExpression: MascotExpression.IDLE
  });

  // Animation references
  const breathingAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const cheerAnim = useRef(new Animated.Value(0)).current;

  // Size configurations for professional appearance
  const sizeConfigs: Record<MascotSize, SizeConfig> = {
    [MascotSize.COMPACT]: {
      container: 'w-10 h-10',
      image: { width: 40, height: 40 },
      badge: 'w-4 h-4 -top-1 -right-1',
      badgeText: 'text-xs',
      label: 'text-xs'
    },
    [MascotSize.STANDARD]: {
      container: 'w-12 h-12',
      image: { width: 48, height: 48 },
      badge: 'w-5 h-5 -top-2 -right-2', 
      badgeText: 'text-xs',
      label: 'text-sm'
    },
    [MascotSize.LARGE]: {
      container: 'w-16 h-16',
      image: { width: 64, height: 64 },
      badge: 'w-6 h-6 -top-2 -right-2',
      badgeText: 'text-xs',
      label: 'text-base'
    }
  };

  const config = sizeConfigs[size];

  // Asset mapping with correct file paths (note the typo in original file name "LIfe")
  const mascotAssets = {
    [MascotStage.SEED]: require('../../../assets/images/mascot/idle/Seed of LIfe No Background.png'),
    [MascotStage.FLOWER]: require('../../../assets/images/mascot/idle/Flower Of LIfe No Background.png'),
    [MascotStage.TREE]: require('../../../assets/images/mascot/idle/Tree of Life No Background.png')
  };

  // Stage display names
  const stageNames = {
    [MascotStage.SEED]: 'Seed',
    [MascotStage.FLOWER]: 'Flower', 
    [MascotStage.TREE]: 'Tree'
  };

  // Get encouragement messages for current trigger
  const getEncouragementMessage = useCallback((trigger: CheeringTrigger): string => {
    const messages = DEFAULT_ENCOURAGEMENT_MESSAGES[trigger];
    if (!messages || messages.length === 0) {
      return "You're doing great! 🌟"; // Fallback message
    }
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    return randomMessage || "Keep going! ✨"; // Additional safety fallback
  }, []);

  const triggerCheerAnimation = useCallback((trigger: CheeringTrigger) => {
    setMascotState(prev => ({
      ...prev,
      isAnimating: true,
      currentExpression: MascotExpression.CELEBRATING,
      cheeringMessage: getEncouragementMessage(trigger)
    }));

    // Celebration animation - directly animate the breathing scale
    Animated.sequence([
      Animated.timing(breathingAnim, {
        toValue: 1.15,
        duration: ANIMATION_TIMINGS.PULSE_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(breathingAnim, {
        toValue: 1.02,
        duration: ANIMATION_TIMINGS.PULSE_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(breathingAnim, {
        toValue: 1.1,
        duration: ANIMATION_TIMINGS.PULSE_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(breathingAnim, {
        toValue: 1.02,
        duration: ANIMATION_TIMINGS.PULSE_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Resume normal breathing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnim, {
            toValue: 1.02,
            duration: ANIMATION_TIMINGS.BREATHING_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: ANIMATION_TIMINGS.BREATHING_DURATION,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Show cheer message
    Animated.timing(cheerAnim, {
      toValue: 1,
      duration: ANIMATION_TIMINGS.FADE_DURATION,
      useNativeDriver: true,
    }).start();

    // Reset after animation
    setTimeout(() => {
      Animated.timing(cheerAnim, {
        toValue: 0,
        duration: ANIMATION_TIMINGS.FADE_DURATION,
        useNativeDriver: true,
      }).start();
      
      setTimeout(() => {
        setMascotState(prev => ({
          ...prev,
          isAnimating: false,
          currentExpression: MascotExpression.IDLE,
          cheeringMessage: undefined
        }));
      }, ANIMATION_TIMINGS.FADE_DURATION);
    }, ANIMATION_TIMINGS.CHEER_DISPLAY_DURATION);
  }, [getEncouragementMessage, breathingAnim, cheerAnim]);

  // Initialize animations
  useEffect(() => {
    // Gentle breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnim, {
          toValue: 1.02,
          duration: ANIMATION_TIMINGS.BREATHING_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(breathingAnim, {
          toValue: 1,
          duration: ANIMATION_TIMINGS.BREATHING_DURATION,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: -3,
          duration: ANIMATION_TIMINGS.FLOATING_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: ANIMATION_TIMINGS.FLOATING_DURATION,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [breathingAnim, floatingAnim]);

  // Handle cheering animations
  useEffect(() => {
    if (enableCheering && cheeringTrigger) {
      triggerCheerAnimation(cheeringTrigger);
    }
  }, [enableCheering, cheeringTrigger, triggerCheerAnimation]);

  const handleTap = () => {
    if (!enableInteraction) return;
    
    triggerCheerAnimation(CheeringTrigger.TAP_INTERACTION);
    onTap?.();
  };

  return (
    <View className={cn("items-center relative", className)} style={style}>
      {/* Horizontal Rectangular Chat Box - Positioned to the left of mascot */}
      {mascotState.cheeringMessage && (
        <Animated.View
          className={cn(
            "absolute top-0 -left-80 z-20",
            "px-4 py-2.5 rounded-lg shadow-xl",
            "border-l-4 border-l-emerald-400",
            "min-h-16",
            isDark ? "bg-slate-800/95 border border-slate-600/50" : "bg-white/95 border border-gray-200/50"
          )}
          style={{
            width: 288, // 72 * 4 = 288px (equivalent to w-72)
            opacity: cheerAnim,
            transform: [
              {
                translateX: cheerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              },
              {
                scale: cheerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1]
                })
              }
            ]
          }}
        >
          {/* Horizontal layout for chat content */}
          <View className="flex-row items-center gap-3">
            {/* Compact mascot icon */}
            <View className={cn(
              "w-7 h-7 rounded-full items-center justify-center shrink-0",
              isDark ? "bg-emerald-900/30" : "bg-emerald-100"
            )}>
              <Text className="text-xs">🌱</Text>
            </View>
            
            {/* Message content - takes most space */}
            <View className="flex-1 min-w-0">
              <Text className={cn(
                "text-xs font-medium opacity-75 leading-tight",
                isDark ? "text-slate-400" : "text-gray-500"
              )}>
                Growth Companion
              </Text>
              <Text className={cn(
                "text-sm font-semibold leading-tight mt-0.5",
                isDark ? "text-slate-100" : "text-gray-800"
              )}>
                {mascotState.cheeringMessage}
              </Text>
            </View>

            {/* Compact sparkle animation */}
            <Animated.View 
              className="shrink-0"
              style={{
                opacity: cheerAnim,
                transform: [{
                  rotate: cheerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg']
                  })
                }]
              }}
            >
              <Text className="text-amber-400 text-base">✨</Text>
            </Animated.View>
          </View>

          {/* Thin progress bar at bottom */}
          <View className={cn(
            "mt-2 h-0.5 rounded-full overflow-hidden",
            isDark ? "bg-slate-700/50" : "bg-gray-200/50"
          )}>
            <View 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
              style={{ width: '100%' }}
            />
          </View>
        </Animated.View>
      )}

      {/* Main mascot container */}
      <TouchableOpacity
        onPress={handleTap}
        disabled={!enableInteraction}
        className={cn(
          "relative items-center justify-center rounded-2xl",
          config.container,
          enableInteraction && "active:opacity-80"
        )}
      >
        {/* Professional background with subtle gradient */}
        <View className={cn(
          "absolute inset-0 rounded-2xl",
          isDark 
            ? "bg-gradient-to-br from-slate-700/20 to-slate-800/30" 
            : "bg-gradient-to-br from-gray-100/50 to-gray-200/30"
        )} />

        {/* Mascot image with animations */}
        <Animated.View
          style={{
            transform: [
              { scale: breathingAnim },
              { translateY: floatingAnim }
            ]
          }}
        >
          <Image
            source={mascotAssets[stage]}
            style={[config.image, { borderRadius: 12 }]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Level badge */}
        {showLevel && (
          <View className={cn(
            "absolute flex items-center justify-center rounded-full shadow-md",
            config.badge,
            "bg-gradient-to-r from-indigo-500 to-purple-600"
          )}>
            <Text className={cn(
              "font-bold text-white text-center",
              config.badgeText
            )}>
              {level}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Stage label */}
      {showLabel && (
        <Text className={cn(
          "mt-1 font-medium text-center capitalize",
          config.label,
          isDark ? "text-slate-400" : "text-gray-500"
        )}>
          {stageNames[stage]}
        </Text>
      )}
    </View>
  );
};

// Enhanced hook for managing mascot cheering state across components
export const useMascotCheering = (): UseMascotCheeringReturn => {
  const [cheeringState, setCheeringState] = useState<CheeringState>({
    isActive: false,
    trigger: null
  });

  const triggerCheering = useCallback((trigger: CheeringTrigger) => {
    setCheeringState({
      isActive: true,
      trigger,
      timestamp: new Date().toISOString()
    });

    // Auto-reset after animation duration
    setTimeout(() => {
      setCheeringState({
        isActive: false,
        trigger: null
      });
    }, ANIMATION_TIMINGS.CHEER_DISPLAY_DURATION + ANIMATION_TIMINGS.FADE_DURATION * 2);
  }, []);

  return { 
    cheeringState, 
    triggerCheering, 
    isCheeringActive: cheeringState.isActive 
  };
};

// Utility component for consistent mascot placement across screens
export const MascotContainer: React.FC<{
  children: React.ReactNode;
  position?: 'header' | 'floating' | 'sidebar';
  className?: string;
}> = ({ children, position = 'header', className = '' }) => {
  const positionClasses = {
    header: 'items-center justify-center',
    floating: 'absolute top-4 right-4 z-20',
    sidebar: 'flex-col items-center space-y-2'
  };

  return (
    <View className={cn(positionClasses[position], className)}>
      {children}
    </View>
  );
};

// Backwards compatibility export
export const ProfileMascot = Mascot; 