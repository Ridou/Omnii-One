import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';

interface XPProgressBarProps {
  currentXP: number;
  currentLevel: number;
  size?: 'compact' | 'standard';
  showText?: boolean;
  className?: string;
}

// Level requirements mapping (reusing existing system)
const LEVEL_REQUIREMENTS: Record<number, number> = {
  1: 0, 2: 100, 3: 200, 4: 320, 5: 450, 6: 750, 7: 1100, 8: 1500,
  9: 1950, 10: 2500, 15: 5000, 20: 8000, 25: 12000, 30: 18000, 
  40: 35000, 50: 60000
};

export const XPProgressBar: React.FC<XPProgressBarProps> = ({
  currentXP,
  currentLevel,
  size = 'standard',
  showText = true,
  className = ''
}) => {
  const { isDark } = useTheme();

  // Calculate progress data
  const currentLevelXP = LEVEL_REQUIREMENTS[currentLevel] || 0;
  const nextLevelXP = LEVEL_REQUIREMENTS[currentLevel + 1] || LEVEL_REQUIREMENTS[50] || 60000;
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const progressPercentage = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100));
  const xpToNextLevel = nextLevelXP - currentXP;
  
  // Calculate filled segments (out of 10)
  const filledSegments = Math.floor((progressPercentage / 100) * 10);

  const sizeConfig = {
    compact: {
      barHeight: 'h-1.5',
      segmentGap: 'gap-0.5',
      textSize: 'text-xs',
      spacing: 'mb-1'
    },
    standard: {
      barHeight: 'h-2',
      segmentGap: 'gap-1',
      textSize: 'text-sm',
      spacing: 'mb-2'
    }
  };

  const config = sizeConfig[size];

  return (
    <View className={cn("w-full", className)}>
      {/* Progress Bar with 10 Segments */}
      <View className={cn("flex-row", config.segmentGap, config.spacing)}>
        {Array.from({ length: 10 }, (_, index) => {
          const isActive = index < filledSegments;
          const isPartial = index === filledSegments && progressPercentage % 10 > 0;
          const partialProgress = isPartial ? (progressPercentage % 10) / 10 : 0;
          
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
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
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

      {/* XP Text */}
      {showText && (
        <Text className={cn(
          "font-medium",
          config.textSize,
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
          {xpToNextLevel > 0 && (
            <Text className="opacity-75"> • {xpToNextLevel.toLocaleString()} to go</Text>
          )}
        </Text>
      )}
    </View>
  );
}; 