import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { AppColors } from '~/constants/Colors';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';

interface StreamlinedApprovalCardProps {
  approval: {
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    created_at: string;
    requested_by: string;
    type: string;
  };
  onPress?: () => void;
}

export default function StreamlinedApprovalCard({ 
  approval, 
  onPress 
}: StreamlinedApprovalCardProps) {
  const { isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const getPriorityConfig = (priority: string) => {
    switch(priority) {
      case 'high':
        return {
          color: AppColors.highPriority,
          label: 'HIGH PRIORITY',
          emoji: '🔥',
          borderColor: AppColors.highPriority,
        };
      case 'medium':
        return {
          color: AppColors.mediumPriority,
          label: 'MEDIUM PRIORITY',
          emoji: '📊',
          borderColor: AppColors.mediumPriority,
        };
      case 'low':
        return {
          color: AppColors.lowPriority,
          label: 'LOW PRIORITY',
          emoji: '✅',
          borderColor: AppColors.lowPriority,
        };
      default:
        return {
          color: AppColors.aiGradientStart,
          label: 'PRIORITY',
          emoji: '📋',
          borderColor: AppColors.aiGradientStart,
        };
    }
  };

  const priorityConfig = getPriorityConfig(approval.priority);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View
        className={cn(
          "rounded-2xl p-5 border-l-4 shadow-md",
          "bg-omnii-card",
          isDark && "bg-omnii-dark-card"
        )}
        style={{
          borderLeftColor: priorityConfig.borderColor,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {/* Priority Badge */}
        <View className="mb-3">
          <View
            className="self-start px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: priorityConfig.color }}
          >
            <Text className="text-white text-xs font-semibold tracking-wide">
              {priorityConfig.label}
            </Text>
          </View>
        </View>

        {/* Title with Emoji */}
        <Text className={cn(
          "text-lg font-semibold mb-2 leading-6",
          isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
        )}>
          {priorityConfig.emoji} {approval.title}
        </Text>

        {/* Description */}
        <Text className={cn(
          "text-sm leading-5 mb-4",
          isDark ? "text-omnii-dark-text-secondary" : "text-omnii-text-secondary"
        )}>
          {approval.description}
        </Text>

        {/* Meta Information */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className={cn(
            "text-sm flex-1",
            isDark ? "text-omnii-dark-text-secondary" : "text-omnii-text-secondary"
          )}>
            📅 Suggested for today at 2:00 PM
          </Text>
          <View 
            className="px-2 py-1 rounded-lg"
            style={{ backgroundColor: `${AppColors.aiGradientStart}15` }}
          >
            <Text 
              className="text-xs font-semibold"
              style={{ color: AppColors.aiGradientStart }}
            >
              AI Generated
            </Text>
          </View>
        </View>

        {/* Confidence Indicator */}
        <View className="flex-row items-center gap-2">
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-omnii-dark-text-secondary" : "text-omnii-text-secondary"
          )}>
            AI Confidence:
          </Text>
          <View className={cn(
            "flex-1 h-1.5 rounded-sm overflow-hidden",
            isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
          )}>
            <View 
              className="h-full rounded-sm"
              style={{ 
                width: '92%',
                backgroundColor: AppColors.aiGradientStart 
              }} 
            />
          </View>
          <Text 
            className="text-xs font-semibold"
            style={{ color: AppColors.aiGradientStart }}
          >
            92%
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
} 