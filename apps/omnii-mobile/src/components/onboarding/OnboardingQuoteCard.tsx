import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { AppColors } from '~/constants/Colors';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import type { OnboardingQuote } from '~/types/onboarding';

interface OnboardingQuoteCardProps {
  quote: OnboardingQuote;
  onPress?: () => void;
}

export default function OnboardingQuoteCard({ 
  quote, 
  onPress 
}: OnboardingQuoteCardProps) {
  const { isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [displayStartTime] = useState(Date.now());

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

  const getCategoryConfig = (category: string, lifeDomain: string) => {
    const configs = {
      productivity: {
        color: AppColors.aiGradientStart,
        emoji: '⚡',
        borderColor: AppColors.aiGradientStart,
        label: 'PRODUCTIVITY',
      },
      discipline: {
        color: '#FF6B47',
        emoji: '🎯',
        borderColor: '#FF6B47',
        label: 'DISCIPLINE',
      },
      physical_health: {
        color: '#4ECDC4',
        emoji: '💪',
        borderColor: '#4ECDC4',
        label: 'PHYSICAL HEALTH',
      },
      mental_health: {
        color: '#A8E6CF',
        emoji: '🧠',
        borderColor: '#A8E6CF',
        label: 'MENTAL HEALTH',
      },
      spiritual_health: {
        color: '#DDA0DD',
        emoji: '🕯️',
        borderColor: '#DDA0DD',
        label: 'SPIRITUAL HEALTH',
      },
      social_wellbeing: {
        color: '#FFB347',
        emoji: '🤝',
        borderColor: '#FFB347',
        label: 'SOCIAL WELLBEING',
      },
      activities: {
        color: '#87CEEB',
        emoji: '🚀',
        borderColor: '#87CEEB',
        label: 'ACTIVITIES',
      },
      motivation: {
        color: '#FF69B4',
        emoji: '🔥',
        borderColor: '#FF69B4',
        label: 'MOTIVATION',
      },
      philosophy: {
        color: '#9370DB',
        emoji: '🤔',
        borderColor: '#9370DB',
        label: 'PHILOSOPHY',
      },
      growth: {
        color: '#32CD32',
        emoji: '🌱',
        borderColor: '#32CD32',
        label: 'GROWTH',
      },
      focus: {
        color: '#1E90FF',
        emoji: '🎯',
        borderColor: '#1E90FF',
        label: 'FOCUS',
      },
    };

    return configs[category as keyof typeof configs] || {
      color: AppColors.aiGradientStart,
      emoji: '💭',
      borderColor: AppColors.aiGradientStart,
      label: category.toUpperCase(),
    };
  };

  const getDifficultyConfig = (difficulty: string) => {
    switch(difficulty) {
      case 'beginner':
        return { color: '#32CD32', label: 'BEGINNER' };
      case 'intermediate':
        return { color: '#FFB347', label: 'INTERMEDIATE' };
      case 'advanced':
        return { color: '#FF6B47', label: 'ADVANCED' };
      default:
        return { color: isDark ? '#94a3b8' : '#6b7280', label: difficulty.toUpperCase() };
    }
  };

  const categoryConfig = getCategoryConfig(quote.category, quote.life_domain);
  const difficultyConfig = getDifficultyConfig(quote.difficulty);

  // Track time spent viewing the quote
  const getTimeSpent = () => {
    return Date.now() - displayStartTime;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View
        className={cn(
          "rounded-2xl p-6 border-l-4 shadow-md min-h-70",
          isDark ? "bg-slate-800" : "bg-white"
        )}
        style={{
          borderLeftColor: categoryConfig.borderColor,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {/* Header with Category and Difficulty */}
        <View className="flex-row justify-between items-center mb-5">
          <View
            className="flex-1 px-3 py-2 rounded-xl mr-3"
            style={{ backgroundColor: categoryConfig.color }}
          >
            <Text className="text-white text-xs font-bold text-center tracking-wide">
              {categoryConfig.emoji} {categoryConfig.label}
            </Text>
          </View>
          
          <View
            className="px-3 py-1.5 rounded-lg border"
            style={{ 
              backgroundColor: `${difficultyConfig.color}20`, 
              borderColor: difficultyConfig.color 
            }}
          >
            <Text 
              className="text-xs font-semibold tracking-wide"
              style={{ color: difficultyConfig.color }}
            >
              {difficultyConfig.label}
            </Text>
          </View>
        </View>

        {/* Quote Text */}
        <Text className={cn(
          "text-xl font-medium leading-7 text-center mb-4 italic",
          isDark ? "text-white" : "text-gray-900"
        )}>
          &quot;{quote.text}&quot;
        </Text>

        {/* Author */}
        <Text className={cn(
          "text-base font-semibold text-center mb-5",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          — {quote.author}
        </Text>

        {/* Life Domain */}
        <View className="flex-row justify-center items-center mb-4 gap-2">
          <Text className={cn(
            "text-sm font-medium",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            Life Domain:
          </Text>
          <Text className={cn(
            "text-sm font-semibold",
            isDark ? "text-indigo-400" : "text-indigo-600"
          )}>
            {quote.life_domain.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>

        {/* Swipe Instructions */}
        <View className={cn(
          "py-3 px-4 rounded-xl mb-4",
          isDark ? "bg-indigo-900/20" : "bg-indigo-50"
        )}>
          <Text className={cn(
            "text-xs text-center",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            👈 Swipe left to decline • Swipe right to approve 👉
          </Text>
        </View>

        {/* Resonance Indicator */}
        <View className="flex-row items-center gap-2">
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            Expected resonance:
          </Text>
          <View className={cn(
            "flex-1 h-1.5 rounded-sm overflow-hidden",
            isDark ? "bg-slate-600" : "bg-gray-200"
          )}>
            <View 
              className="h-full rounded-sm"
              style={{ 
                width: `${Math.round(quote.expected_resonance * 100)}%`,
                backgroundColor: AppColors.aiGradientStart
              }} 
            />
          </View>
          <Text 
            className="text-xs font-semibold min-w-9 text-right"
            style={{ color: AppColors.aiGradientStart }}
          >
            {Math.round(quote.expected_resonance * 100)}%
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
} 