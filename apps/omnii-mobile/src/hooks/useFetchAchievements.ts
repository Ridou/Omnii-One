import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '~/context/AuthContext';
import { achievementService } from '~/services/achievements';
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
  const { user } = useAuth();
  const [data, setData] = useState<AchievementState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!user?.id) {
      console.log('⚠️ [useFetchAchievements] No user available, skipping fetch');
      setLoading(false);
      setError(null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏆 [useFetchAchievements] Fetching real achievement data for user:', user.id);
      
      // Fetch achievements and stats separately with individual error handling
      let achievements: any[] = [];
      let stats: any = {
        total_achievements: 0,
        completed_achievements: 0,
        completion_percentage: 0,
        total_xp_from_achievements: 0,
        current_streak: 0,
        longest_streak: 0,
        recent_unlocks: []
      };
      
      // Try to fetch achievements first
      try {
        achievements = await achievementService.getUserAchievements(user.id);
        console.log('✅ [useFetchAchievements] Retrieved achievements:', achievements.length);
      } catch (achievementError) {
        console.error('❌ [useFetchAchievements] Achievement fetch error (non-critical):', achievementError);
        // Continue with empty achievements array
      }
      
      // Try to fetch stats separately
      try {
        stats = await achievementService.getStats(user.id);
        console.log('✅ [useFetchAchievements] Retrieved stats:', {
          completedCount: stats.completed_achievements,
          totalXP: stats.total_xp_from_achievements
        });
      } catch (statsError) {
        console.error('❌ [useFetchAchievements] Stats fetch error (non-critical):', statsError);
        // Use default stats calculated from achievements
        if (achievements.length > 0) {
          const completed = achievements.filter(a => a.completed);
          stats = {
            total_achievements: achievements.length,
            completed_achievements: completed.length,
            completion_percentage: achievements.length > 0 ? (completed.length / achievements.length) * 100 : 0,
            total_xp_from_achievements: completed.reduce((sum, a) => sum + (a.xpReward || 0), 0),
            current_streak: 0,
            longest_streak: 0,
            recent_unlocks: [] as any[]
          };
          console.log('📊 [useFetchAchievements] Using calculated stats from achievements');
        }
      }
      
      // Transform stats to match existing AchievementStats interface
      const transformedStats: AchievementStats = {
        totalAchievements: stats.total_achievements,
        completedAchievements: stats.completed_achievements,
        totalXPFromAchievements: stats.total_xp_from_achievements,
        averageCompletionTime: 0, // TODO: Calculate from database
        currentStreak: stats.current_streak,
        longestStreak: stats.longest_streak,
        categoryStats: {}, // TODO: Calculate from achievements
        difficultyStats: {
          'easy': { total: 0, completed: 0 },
          'medium': { total: 0, completed: 0 },
          'hard': { total: 0, completed: 0 },
          'legendary': { total: 0, completed: 0 },
        },
        recentUnlocks: [], // TODO: Transform from recent_unlocks
        nearCompletion: achievements.filter(a => 
          !a.completed && a.progressPercentage > 75
        ),
      };

      // Calculate difficulty stats from achievements
      achievements.forEach(achievement => {
        const difficulty = achievement.difficulty as 'easy' | 'medium' | 'hard' | 'legendary';
        if (transformedStats.difficultyStats[difficulty]) {
          transformedStats.difficultyStats[difficulty]!.total++;
          if (achievement.completed) {
            transformedStats.difficultyStats[difficulty]!.completed++;
          }
        }
      });

      // Calculate category stats
      const categoryStats: Record<string, { total: number; completed: number; xpEarned: number }> = {};
      achievements.forEach(achievement => {
        if (!categoryStats[achievement.category]) {
          categoryStats[achievement.category] = { total: 0, completed: 0, xpEarned: 0 };
        }
        const categoryInfo = categoryStats[achievement.category];
        if (categoryInfo) {
          categoryInfo.total++;
          if (achievement.completed) {
            categoryInfo.completed++;
            categoryInfo.xpEarned += achievement.xpReward;
          }
        }
      });
      transformedStats.categoryStats = categoryStats;

      const achievementState: AchievementState = {
        achievements,
        stats: transformedStats,
        progress: {}, // Individual progress tracking - populated from achievements
        unlocks: [], // Recent unlocks - TODO: populate from database
        feed: { 
          items: [], 
          hasMore: false, 
          lastUpdated: new Date() 
        },
        mentorInsights: [], // TODO: Generate based on progress
        showCelebrations: true,
        autoShare: false,
        difficultyPreference: 'balanced',
        isLoading: false,
        lastSync: new Date()
      };
      
      setData(achievementState);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch achievements';
      console.error('❌ [useFetchAchievements] Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const recordProgress = useCallback(async (achievementId: string, increment = 1) => {
    if (!user?.id) {
      console.warn('🚫 [useFetchAchievements] Cannot record progress - no user ID');
      return null;
    }
    
    try {
      console.log('📈 [useFetchAchievements] Recording progress for achievement:', achievementId);
      
      const result = await achievementService.recordProgress(user.id, achievementId, increment);
      
      if (result.achievement_unlocked) {
        console.log('🎉 [useFetchAchievements] Achievement unlocked! Refreshing data...');
        await fetchAchievements(); // Refresh all achievement data
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record progress';
      console.error('❌ [useFetchAchievements] Progress recording error:', errorMessage);
      return null;
    }
  }, [user?.id, fetchAchievements]);

  const refetch = useCallback(() => {
    return fetchAchievements();
  }, [fetchAchievements]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return { 
    data, 
    loading, 
    error, 
    refetch, 
    recordProgress 
  };
} 