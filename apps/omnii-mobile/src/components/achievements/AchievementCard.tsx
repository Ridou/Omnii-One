import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppColors } from '~/constants/Colors';
import type { Achievement } from '~/types/achievements';

interface AchievementCardProps {
  achievement: Achievement;
  onPress?: () => void;
  onClaim?: () => void;
  showProgress?: boolean;
}

export function AchievementCard({ 
  achievement, 
  onPress, 
  onClaim, 
  showProgress = true 
}: AchievementCardProps) {
  const progressPercentage = (achievement.progress / achievement.maxProgress) * 100;
  const isCompleted = achievement.completed;
  const canClaim = isCompleted && achievement.completedAt && !achievement.progress; // Simplified claim logic

  // Helper functions to get difficulty styles
  const getDifficultyBackgroundStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return styles.difficultyEasy;
      case 'medium': return styles.difficultyMedium;
      case 'hard': return styles.difficultyHard;
      case 'legendary': return styles.difficultyLegendary;
      default: return styles.difficultyEasy;
    }
  };

  const getDifficultyTextStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return styles.difficultyEasyText;
      case 'medium': return styles.difficultyMediumText;
      case 'hard': return styles.difficultyHardText;
      case 'legendary': return styles.difficultyLegendaryText;
      default: return styles.difficultyEasyText;
    }
  };

  const getTierStyle = (tier?: string) => {
    switch (tier) {
      case 'bronze': return styles.tierBronze;
      case 'silver': return styles.tierSilver;
      case 'gold': return styles.tierGold;
      case 'platinum': return styles.tierPlatinum;
      default: return styles.tierBronze;
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isCompleted && styles.completedContainer
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Achievement Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{achievement.icon || '🏆'}</Text>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>✓</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerContent}>
          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.description}>{achievement.description}</Text>
        </View>
        
        <View style={styles.xpContainer}>
          <Text style={styles.xpValue}>{achievement.xpReward}</Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
      </View>

      {/* Progress Section */}
      {showProgress && !isCompleted && (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {achievement.progress} / {achievement.maxProgress}
            </Text>
            <Text style={styles.progressPercentage}>
              {Math.round(progressPercentage)}%
            </Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar,
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Completion Section */}
      {isCompleted && (
        <View style={styles.completionSection}>
          <View style={styles.completionInfo}>
            <Text style={styles.completionText}>
              🎉 Completed {achievement.completedAt && new Date(achievement.completedAt).toLocaleDateString()}
            </Text>
            {canClaim && onClaim && (
              <TouchableOpacity 
                style={styles.claimButton}
                onPress={onClaim}
              >
                <Text style={styles.claimButtonText}>Claim XP</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Difficulty & Category Tags */}
      <View style={styles.tagsSection}>
        <View style={[
          styles.difficultyTag,
          getDifficultyBackgroundStyle(achievement.difficulty)
        ]}>
          <Text style={[
            styles.tagText,
            getDifficultyTextStyle(achievement.difficulty)
          ]}>
            {achievement.difficulty.toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.categoryTag}>
          <Text style={styles.categoryTagText}>
            {achievement.category.toUpperCase()}
          </Text>
        </View>
        
        {achievement.communityTier && (
          <View style={[
            styles.tierTag,
            getTierStyle(achievement.communityTier)
          ]}>
            <Text style={styles.tierTagText}>
              {achievement.communityTier.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: AppColors.shadows.card.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  completedContainer: {
    borderColor: AppColors.aiGradientStart,
    borderWidth: 2,
    backgroundColor: '#FF704320',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  icon: {
    fontSize: 32,
    lineHeight: 40,
  },
  completedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadgeText: {
    color: AppColors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  xpContainer: {
    alignItems: 'center',
    backgroundColor: `${AppColors.aiGradientStart}15`,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.aiGradientStart,
  },
  xpLabel: {
    fontSize: 12,
    color: AppColors.aiGradientStart,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.aiGradientStart,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: AppColors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 4,
  },
  completionSection: {
    backgroundColor: `${AppColors.aiGradientStart}10`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  completionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.aiGradientStart,
    flex: 1,
  },
  claimButton: {
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  claimButtonText: {
    color: AppColors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  difficultyTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  difficultyEasy: {
    backgroundColor: '#10B98120',
  },
  difficultyMedium: {
    backgroundColor: '#F59E0B20',
  },
  difficultyHard: {
    backgroundColor: '#EF444420',
  },
  difficultyLegendary: {
    backgroundColor: '#8B5CF620',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  difficultyEasyText: {
    color: '#10B981',
  },
  difficultyMediumText: {
    color: '#F59E0B',
  },
  difficultyHardText: {
    color: '#EF4444',
  },
  difficultyLegendaryText: {
    color: '#8B5CF6',
  },
  categoryTag: {
    backgroundColor: `${AppColors.textSecondary}20`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  tierTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tierBronze: {
    backgroundColor: '#CD7F3220',
  },
  tierSilver: {
    backgroundColor: '#C0C0C020',
  },
  tierGold: {
    backgroundColor: '#FF704320',
  },
  tierPlatinum: {
    backgroundColor: '#E5E4E220',
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
}); 