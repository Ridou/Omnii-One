import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { AppColors } from '~/constants/Colors';
import type { OnboardingQuote } from '~/types/onboarding';

interface OnboardingQuoteCardProps {
  quote: OnboardingQuote;
  onPress?: () => void;
}

export default function OnboardingQuoteCard({ 
  quote, 
  onPress 
}: OnboardingQuoteCardProps) {
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
        return { color: AppColors.textSecondary, label: difficulty.toUpperCase() };
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
        style={[
          styles.container,
          {
            borderLeftColor: categoryConfig.borderColor,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Header with Category and Difficulty */}
        <View style={styles.header}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: categoryConfig.color },
            ]}
          >
            <Text style={styles.categoryText}>
              {categoryConfig.emoji} {categoryConfig.label}
            </Text>
          </View>
          
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: `${difficultyConfig.color}20`, borderColor: difficultyConfig.color },
            ]}
          >
            <Text style={[styles.difficultyText, { color: difficultyConfig.color }]}>
              {difficultyConfig.label}
            </Text>
          </View>
        </View>

        {/* Quote Text */}
        <Text style={styles.quoteText}>
          "{quote.text}"
        </Text>

        {/* Author */}
        <Text style={styles.author}>
          — {quote.author}
        </Text>

        {/* Life Domain */}
        <View style={styles.lifeDomainContainer}>
          <Text style={styles.lifeDomainLabel}>Life Domain:</Text>
          <Text style={styles.lifeDomainText}>
            {quote.life_domain.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>

        {/* Swipe Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            👈 Swipe left to decline • Swipe right to approve 👉
          </Text>
        </View>

        {/* Resonance Indicator */}
        <View style={styles.resonanceContainer}>
          <Text style={styles.resonanceLabel}>Expected resonance:</Text>
          <View style={styles.resonanceBar}>
            <View 
              style={[
                styles.resonanceFill, 
                { width: `${Math.round(quote.expected_resonance * 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.resonanceText}>
            {Math.round(quote.expected_resonance * 100)}%
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 20,
    padding: 24,
    borderLeftWidth: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    minHeight: 280,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryBadge: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  categoryText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize: 20,
    fontWeight: '500',
    color: AppColors.textPrimary,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  author: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  lifeDomainContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  lifeDomainLabel: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  lifeDomainText: {
    fontSize: 13,
    color: AppColors.aiGradientStart,
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: `${AppColors.aiGradientStart}10`,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
  },
  resonanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resonanceLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  resonanceBar: {
    flex: 1,
    height: 6,
    backgroundColor: AppColors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  resonanceFill: {
    height: '100%',
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 3,
  },
  resonanceText: {
    fontSize: 12,
    color: AppColors.aiGradientStart,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
}); 