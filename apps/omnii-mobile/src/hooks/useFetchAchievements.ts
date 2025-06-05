import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  Achievement, 
  AchievementState, 
  AchievementProgress, 
  AchievementStats,
  AchievementUnlock,
  MentorInsight,
  AchievementFeed
} from '~/types/achievements';

export function useFetchAchievements() {
  const [data, setData] = useState<AchievementState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock achievements data following screens.mdc structure
  const mockAchievements: Achievement[] = useMemo(() => [
    // 🌱 Seed Achievements (Levels 1-10)
    {
      id: 'first-steps',
      title: 'First Steps',
      description: 'Approve your first AI-generated task',
      xpReward: 25,
      progress: 1,
      maxProgress: 1,
      completed: true,
      category: 'discovery',
      difficulty: 'easy',
      isHidden: false,
      isShareable: true,
      communityTier: 'bronze',
      icon: '👶',
      unlocksAt: 'seed',
      completedAt: new Date('2025-01-15T10:30:00Z'),
    },
    {
      id: 'trust-builder',
      title: 'Trust Builder',
      description: 'Approve 10 AI suggestions in a row without rejecting',
      xpReward: 75,
      progress: 10,
      maxProgress: 10,
      completed: true,
      category: 'discovery',
      difficulty: 'medium',
      isHidden: false,
      isShareable: true,
      communityTier: 'silver',
      icon: '🤝',
      unlocksAt: 'seed',
      completedAt: new Date('2025-01-16T14:20:00Z'),
    },
    {
      id: 'early-bird',
      title: 'Early Bird',
      description: 'Check approvals within 30 minutes of waking for 5 days',
      xpReward: 150,
      progress: 3,
      maxProgress: 5,
      completed: false,
      category: 'discovery',
      difficulty: 'medium',
      isHidden: false,
      isShareable: true,
      communityTier: 'gold',
      icon: '🌅',
      unlocksAt: 'seed',
    },
  ], []);

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock data - in real implementation would fetch from API
      const mockData: AchievementState = {
        achievements: mockAchievements,
        progress: {},
        unlocks: [],
        stats: {
          totalAchievements: mockAchievements.length,
          completedAchievements: 2,
          totalXPFromAchievements: 100,
          averageCompletionTime: 2,
          currentStreak: 2,
          longestStreak: 3,
          categoryStats: {},
          difficultyStats: {
            'easy': { total: 1, completed: 1 },
            'medium': { total: 2, completed: 1 },
            'hard': { total: 0, completed: 0 },
            'legendary': { total: 0, completed: 0 },
          },
          recentUnlocks: [],
          nearCompletion: [mockAchievements[2]],
        },
        feed: {
          items: [],
          hasMore: false,
          lastUpdated: new Date(),
        },
        mentorInsights: [],
        showCelebrations: true,
        autoShare: false,
        difficultyPreference: 'balanced',
        isLoading: false,
        lastSync: new Date(),
      };
      
      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch achievements');
    } finally {
      setLoading(false);
    }
  }, [mockAchievements]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    data,
    loading,
    error,
    refetch: fetchAchievements,
  };
} 