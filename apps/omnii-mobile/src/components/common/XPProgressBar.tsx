import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { useXPSystem } from '~/hooks/useXPSystem';
import { XPSystemUtils } from '~/constants/XPSystem';

export interface XPProgressBarProps {
  // Display variants
  variant?: 'minimal' | 'compact' | 'standard' | 'detailed';
  size?: 'micro' | 'small' | 'medium' | 'large';
  
  // Content options
  showText?: boolean;
  showLevel?: boolean;
  showProgress?: boolean;
  showPending?: boolean;
  
  // Visual options
  animated?: boolean;
  showSegments?: boolean;
  segmentCount?: number;
  
  // Styling
  className?: string;
  
  // Override props (for testing or custom usage)
  overrideXP?: number;
  overrideLevel?: number;
}

/**
 * Enhanced XP Progress Bar Component
 * Unified component for displaying XP progress across all screens
 * Uses NativeWind V4 styling and real-time XP updates
 */
export const XPProgressBar: React.FC<XPProgressBarProps> = ({
  variant = 'standard',
  size = 'medium',
  showText = true,
  showLevel = false,
  showProgress = true,
  showPending = true,
  animated = true,
  showSegments = true,
  segmentCount = 10,
  className = '',
  overrideXP,
  overrideLevel,
}) => {
  const { isDark } = useTheme();
  const { xpProgress, isLoading, error, pendingXP, currentXP, currentLevel } = useXPSystem();
  
  // Animation value for progress bar
  const [progressAnim] = useState(new Animated.Value(xpProgress.progress_percentage || 0));

  // Use override values if provided, otherwise use hook data
  const displayXP = overrideXP ?? currentXP;
  const displayLevel = overrideLevel ?? currentLevel;
  
  // Recalculate progress with current data (ensuring real-time updates)
  const actualProgress = overrideXP !== undefined || overrideLevel !== undefined ? 
    XPSystemUtils.getProgressPercentage(displayXP, displayLevel) : 
    xpProgress.progress_percentage;

  // ✅ CLAMP PROGRESS: Ensure progress is always between 0-100
  const clampedProgress = Math.min(100, Math.max(0, actualProgress || 0));

  const xpInLevel = overrideXP !== undefined || overrideLevel !== undefined ?
    XPSystemUtils.getXPInCurrentLevel(displayXP, displayLevel) :
    xpProgress.xp_in_current_level;

  const nextLevelXP = overrideLevel !== undefined ?
    XPSystemUtils.getNextLevelXP(displayLevel) :
    xpProgress.next_level_xp;

  // Log debug info for progress bar updates (ONLY in development and only for errors)
  useEffect(() => {
    if (__DEV__ && error) {
      console.log('🎯 [XPProgressBar] Progress Error:', {
        displayXP,
        displayLevel,
        rawProgress: actualProgress,
        clampedProgress,
        error
      });
    }
  }, [error, displayXP, displayLevel, actualProgress, clampedProgress]);

  // Animate progress bar when XP changes (with proper dependencies)
  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: clampedProgress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, progressAnim, displayXP, displayLevel]);

  // Configuration based on variant and size
  const config = getVariantConfig(variant, size);

  // Show loading state - ONLY on initial load, not on cached updates
  if (isLoading && !overrideXP && currentXP === 0 && currentLevel === 1) {
    return (
      <View className={cn("w-full", className)}>
        <View className={cn(
          "rounded-full",
          config.barHeight,
          isDark ? "bg-slate-700" : "bg-gray-200"
        )}>
          <View className={cn(
            "h-full rounded-full bg-gradient-to-r from-indigo-500/50 to-purple-600/50 animate-pulse",
            "w-1/3"
          )} />
        </View>
        {showText && (
          <Text className={cn(
            "text-center mt-1",
            config.textSize,
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            Loading XP...
          </Text>
        )}
      </View>
    );
  }

  // Show error state
  if (error && !overrideXP) {
    return (
      <View className={cn("w-full", className)}>
        <View className={cn(
          "rounded-full border border-red-300",
          config.barHeight,
          isDark ? "bg-red-900/20" : "bg-red-100"
        )}>
          <View className="h-full rounded-full bg-red-400 w-0" />
        </View>
        {showText && (
          <Text className={cn(
            "text-center mt-1 text-red-500",
            config.textSize
          )}>
            XP Error
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className={cn("w-full", className)}>
      {/* Header Text */}
      {variant === 'detailed' && (
        <View className="flex-row justify-between items-center mb-2">
          <Text className={cn(
            "font-semibold",
            config.textSize,
            isDark ? "text-white" : "text-gray-900"
          )}>
            Level {displayLevel}
          </Text>
          <Text className={cn(
            "font-medium",
            config.secondaryTextSize,
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            {xpInLevel} / {nextLevelXP} XP
          </Text>
        </View>
      )}

      {/* XP Text - Above progress bar */}
      {showText && variant !== 'detailed' && variant !== 'minimal' && (
        <Text className={cn(
          "font-medium mb-1",
          config.textSize,
          config.spacing,
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          {showLevel && `Level ${displayLevel} • `}
          {displayXP.toLocaleString()} 
          {nextLevelXP && ` / ${nextLevelXP.toLocaleString()}`} XP
          {showPending && pendingXP > 0 && (
            <Text className="text-yellow-500 font-semibold">
              {` (+${pendingXP})`}
            </Text>
          )}
        </Text>
      )}

      {/* Progress Bar */}
      {showProgress && (
        <View className="w-full">
          {showSegments ? (
            // Segmented progress bar
            <View className={cn("flex-row", config.segmentGap)}>
              {Array.from({ length: segmentCount }, (_, index) => {
                const segmentThreshold = ((index + 1) / segmentCount) * 100;
                const isActive = clampedProgress >= segmentThreshold;
                const isPartial = clampedProgress > (index / segmentCount) * 100 && 
                                clampedProgress < segmentThreshold;
                const partialProgress = isPartial ? 
                  ((clampedProgress - (index / segmentCount) * 100) / (100 / segmentCount)) : 0;
                
                return (
                  <View
                    key={index}
                    className={cn(
                      "flex-1 rounded-full overflow-hidden",
                      config.barHeight,
                      isDark ? "bg-slate-700" : "bg-gray-200"
                    )}
                  >
                    {(isActive || isPartial) && (
                      <View
                        className={cn(
                          "h-full rounded-full",
                          getProgressGradient(variant, pendingXP > 0)
                        )}
                        style={{ 
                          flex: isActive ? 1 : partialProgress,
                          maxWidth: '100%'
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            // Smooth progress bar
            <View className={cn(
              "w-full rounded-full overflow-hidden",
              config.barHeight,
              isDark ? "bg-slate-700" : "bg-gray-200"
            )}>
              <Animated.View
                key={`smooth-progress-${displayLevel}-${Math.floor(displayXP / 100)}`}
                className={cn(
                  "h-full rounded-full",
                  getProgressGradient(variant, false)
                )}
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                  transform: [{ translateX: 0 }],
                  ...(pendingXP > 0 && { opacity: 0.8 }),
                }}
              />
            </View>
          )}
        </View>
      )}

      {/* Level Badge - For minimal variant */}
      {variant === 'minimal' && showLevel && (
        <View className={cn(
          "self-end mt-1 px-2 py-0.5 rounded-full",
          isDark ? "bg-indigo-900/40" : "bg-indigo-100"
        )}>
          <Text className={cn(
            "font-bold",
            config.secondaryTextSize,
            isDark ? "text-indigo-400" : "text-indigo-700"
          )}>
            Lv.{displayLevel}
          </Text>
        </View>
      )}

      {/* Detailed Footer */}
      {variant === 'detailed' && (
        <View className="flex-row justify-between items-center mt-2">
          <View className="items-center">
            <Text className={cn(
              "font-medium mb-1",
              config.secondaryTextSize,
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Current XP</Text>
            <View className={cn(
              "px-2 py-1 rounded-full",
              isDark ? "bg-indigo-900/40" : "bg-indigo-100"
            )}>
              <Text className={cn(
                "font-bold",
                config.secondaryTextSize,
                isDark ? "text-indigo-400" : "text-indigo-700"
              )}>
                {xpInLevel}
              </Text>
            </View>
          </View>
          
          <View className="items-center">
            <Text className={cn(
              "font-medium mb-1",
              config.secondaryTextSize,
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Progress</Text>
            <View className={cn(
              "px-2 py-1 rounded-full",
              isDark ? "bg-green-900/40" : "bg-green-100"
            )}>
              <Text className={cn(
                "font-bold",
                config.secondaryTextSize,
                isDark ? "text-green-400" : "text-green-700"
              )}>
                {Math.round(clampedProgress)}%
              </Text>
            </View>
          </View>
          
          <View className="items-center">
            <Text className={cn(
              "font-medium mb-1",
              config.secondaryTextSize,
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Next Level</Text>
            <View className={cn(
              "px-2 py-1 rounded-full",
              isDark ? "bg-orange-900/40" : "bg-orange-100"
            )}>
              <Text className={cn(
                "font-bold",
                config.secondaryTextSize,
                isDark ? "text-orange-400" : "text-orange-700"
              )}>
                {nextLevelXP || 'Max'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * Get configuration based on variant and size
 */
function getVariantConfig(variant: string, size: string) {
  const sizeConfigs = {
    micro: {
      barHeight: 'h-1',
      segmentGap: 'gap-0.5',
      textSize: 'text-xs',
      secondaryTextSize: 'text-xs',
      spacing: 'mb-0.5'
    },
    small: {
      barHeight: 'h-1.5',
      segmentGap: 'gap-0.5',
      textSize: 'text-xs',
      secondaryTextSize: 'text-xs',
      spacing: 'mb-1'
    },
    medium: {
      barHeight: 'h-2',
      segmentGap: 'gap-1',
      textSize: 'text-sm',
      secondaryTextSize: 'text-xs',
      spacing: 'mb-1'
    },
    large: {
      barHeight: 'h-3',
      segmentGap: 'gap-1',
      textSize: 'text-base',
      secondaryTextSize: 'text-sm',
      spacing: 'mb-2'
    }
  };

  const baseConfig = sizeConfigs[size as keyof typeof sizeConfigs] || sizeConfigs.medium;

  // Variant-specific adjustments
  if (variant === 'minimal') {
    return {
      ...baseConfig,
      barHeight: 'h-1',
      textSize: 'text-xs',
    };
  }

  if (variant === 'detailed') {
    return {
      ...baseConfig,
      barHeight: size === 'large' ? 'h-4' : 'h-3',
    };
  }

  return baseConfig;
}

/**
 * Get progress gradient classes based on variant (no animation classes)
 */
function getProgressGradient(variant: string, hasPending: boolean): string {
  // Always return solid colors to avoid animation warnings
  switch (variant) {
    case 'minimal':
      return 'bg-indigo-500';
    case 'detailed':
      return 'bg-purple-600';
    default:
      return 'bg-indigo-600';
  }
} 