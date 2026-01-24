// Achievement System Types - Extends ProfileMilestone from profile.ts

import type { ProfileMilestone, ProfileState } from './profile';
import type { ImageRequireSource } from 'react-native';

export interface Achievement extends ProfileMilestone {
  // Additional achievement-specific properties
  icon?: string;
  badge?: ImageRequireSource;
  celebrationAnimation?: ImageRequireSource;
  soundEffect?: ImageRequireSource;
  shareableGraphic?: ImageRequireSource;
  
  // Achievement specific metadata
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  isHidden: boolean; // Hidden achievements discovered through gameplay
  prerequisites?: string[]; // Achievement IDs that must be completed first
  unlockConditions?: AchievementCondition[];
  
  // Social features
  isShareable: boolean;
  communityTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  
  // Tracking
  firstCompletedBy?: string; // User ID
  averageCompletionTime?: number; // In days
  completionRate?: number; // Percentage of users who complete this
}

export interface AchievementCondition {
  type: 'level' | 'xp' | 'time_based' | 'streak' | 'milestone_completion' | 'action_count';
  operator: 'equals' | 'greater_than' | 'less_than' | 'within_range';
  value: number | string;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export interface AchievementCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  achievements: Achievement[];
  totalXP: number;
  completionPercentage: number;
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  maxValue: number;
  lastUpdated: Date;
  milestones?: ProgressMilestone[];
}

export interface ProgressMilestone {
  value: number;
  label: string;
  claimed: boolean;
  reward?: {
    xp: number;
    badge?: ImageRequireSource;
  };
}

export interface AchievementUnlock {
  achievement: Achievement;
  unlockedAt: Date;
  celebrationShown: boolean;
  xpClaimed: boolean;
  shared: boolean;
}

export interface AchievementStats {
  totalAchievements: number;
  completedAchievements: number;
  totalXPFromAchievements: number;
  averageCompletionTime: number;
  currentStreak: number;
  longestStreak: number;
  
  // By category
  categoryStats: Record<string, {
    total: number;
    completed: number;
    xpEarned: number;
  }>;
  
  // By difficulty
  difficultyStats: Record<Achievement['difficulty'], {
    total: number;
    completed: number;
  }>;
  
  // Recent activity
  recentUnlocks: AchievementUnlock[];
  nearCompletion: Achievement[]; // Achievements close to completion
}

export interface AchievementRecommendation {
  achievement: Achievement;
  reasoning: string;
  confidence: number; // 0-100
  estimatedCompletionTime: number; // In days
  requiredActions: string[];
  difficulty: 'trivial' | 'easy' | 'moderate' | 'challenging';
}

export interface SocialAchievement {
  achievement: Achievement;
  user: {
    id: string;
    name: string;
    avatar?: string;
    level: number;
    mascotStage: 'seed' | 'flower' | 'tree';
  };
  unlockedAt: Date;
  celebrationMessage: string;
  likes: number;
  comments: SocialComment[];
}

export interface SocialComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  createdAt: Date;
  reactions: Reaction[];
}

export interface Reaction {
  type: 'like' | 'celebrate' | 'support' | 'wow';
  userId: string;
  createdAt: Date;
}

export interface AchievementFeed {
  items: (SocialAchievement | AchievementRecommendation)[];
  hasMore: boolean;
  lastUpdated: Date;
}

export interface MentorInsight {
  id: string;
  title: string;
  message: string;
  type: 'encouragement' | 'guidance' | 'celebration' | 'challenge';
  relatedAchievements: string[];
  actionable: boolean;
  expiresAt?: Date;
}

export interface AchievementState {
  // Core data
  achievements: Achievement[];
  progress: Record<string, AchievementProgress>;
  unlocks: AchievementUnlock[];
  
  // Stats and analytics
  stats: AchievementStats;
  
  // Social features
  feed: AchievementFeed;
  mentorInsights: MentorInsight[];
  
  // User preferences
  showCelebrations: boolean;
  autoShare: boolean;
  difficultyPreference: 'easy' | 'balanced' | 'challenging';
  
  // Loading states
  isLoading: boolean;
  lastSync: Date;
}

// Tab configuration for achievements screen
export type AchievementTab = 'evolve' | 'discover' | 'gallery' | 'social';

export interface AchievementTabConfig {
  key: AchievementTab;
  label: string;
  icon: string;
  gradient: [string, string];
}

// Integration with existing systems
export interface AchievementIntegration {
  // Connect to profile milestones
  convertMilestoneToAchievement: (milestone: ProfileMilestone) => Achievement;
  syncWithProfileProgress: (profileState: ProfileState) => void;
  
  // Connect to analytics
  trackAchievementProgress: (achievementId: string, value: number) => void;
  
  // Connect to XP system
  awardAchievementXP: (achievementId: string, xp: number) => void;
} 