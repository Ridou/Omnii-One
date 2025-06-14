import { supabase } from '~/lib/supabase';
import { 
  AchievementDataSchema, 
  AchievementProgressResultSchema,
  AchievementStatsSchema,
  type AchievementData,
  type AchievementProgressResult,
  type AchievementStats,
  validateAchievementProgressResult,
  validateAchievementStats
} from '@omnii/validators';

/**
 * Achievement Service
 * Connects client to Supabase achievement functions with type safety
 * 
 * Database Schema Reference:
 * - achievements: id, title, description, category, difficulty, xp_reward, icon, etc.
 * - user_achievement_progress: user_id, achievement_id (refs achievements.id), current_progress, completed
 * - achievement_unlocks: user_id, achievement_id (refs achievements.id), unlocked_at, xp_awarded
 * 
 * NOTE: Backend SQL functions status:
 * ✅ get_user_achievements - FIXED
 * ✅ get_user_achievement_stats - FIXED (GROUP BY issue resolved)
 */
export const achievementService = {
  /**
   * Get all achievements for a user with progress data
   */
  async getUserAchievements(userId: string): Promise<any[]> {
    if (!userId) {
      return [];
    }

    
    try {
      const { data, error } = await supabase.rpc('get_user_achievements', {
        p_user_id: userId
      });
      
      if (error) {
        // For column errors, this indicates the backend SQL needs fixing
        if (error.code === '42703') {
        }
        throw error; // Let the hook handle the error properly
      }


      // Transform database format to client format for compatibility with existing types
      return data?.map((item: any) => ({
        id: item.achievement_id || item.id, // Handle both possible column names
        title: item.title,
        description: item.description,
        category: item.category,
        difficulty: item.difficulty,
        xpReward: item.xp_reward,
        icon: item.icon,
        progress: item.current_progress || 0,
        maxProgress: item.max_progress || 1,
        completed: item.completed || false,
        completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
        canUnlock: item.can_unlock !== false, // Default to true if not specified
        progressPercentage: item.progress_percentage || 0,
        // Default values for compatibility with existing Achievement type
        isHidden: item.is_hidden || false,
        isShareable: item.is_shareable !== false,
        prerequisites: item.prerequisite_achievements || [],
        unlockConditions: item.unlock_conditions || [],
        communityTier: item.community_tier || 'bronze',
        unlocksAt: 'seed' as const
      })) || [];
    } catch (networkError) {
      throw networkError; // Let the hook handle network errors
    }
  },

  /**
   * Record progress for a specific achievement
   */
  async recordProgress(userId: string, achievementId: string, increment = 1): Promise<AchievementProgressResult> {
    if (!userId || !achievementId) {
      return {
        progress_updated: false,
        new_progress: 0,
        achievement_unlocked: false,
        xp_awarded: 0,
        level_up: false,
        new_level: 1
      };
    }

    // Progress recording parameters logged for debugging

    try {
      const { data, error } = await supabase.rpc('record_achievement_progress', {
        p_user_id: userId,
        p_achievement_id: achievementId,
        p_increment: increment
      });
      
      if (error) {
        if (error.code === '42703') {
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          progress_updated: false,
          new_progress: 0,
          achievement_unlocked: false,
          xp_awarded: 0,
          level_up: false,
          new_level: 1
        };
      }
      
      // Validate the response with Zod
      const result = validateAchievementProgressResult(data[0]);
      
      if (result.achievement_unlocked) {
        // Achievement unlock details logged for debugging
      } else {
        // Progress update details logged for debugging
      }
      
      return result;
    } catch (networkError) {
      throw networkError;
    }
  },

  /**
   * Get achievement statistics for a user
   */
  async getStats(userId: string): Promise<AchievementStats> {
    if (!userId) {
      return {
        total_achievements: 0,
        completed_achievements: 0,
        completion_percentage: 0,
        total_xp_from_achievements: 0,
        current_streak: 0,
        longest_streak: 0,
        recent_unlocks: []
      };
    }

    
    try {
      const { data, error } = await supabase.rpc('get_user_achievement_stats', {
        p_user_id: userId
      });
      
      if (error) {
        if (error.code === '42703') {
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          total_achievements: 0,
          completed_achievements: 0,
          completion_percentage: 0,
          total_xp_from_achievements: 0,
          current_streak: 0,
          longest_streak: 0,
          recent_unlocks: []
        };
      }
      
      // Use the new validation function with fallback behavior
      const stats = validateAchievementStats(data[0]);
      
      // Achievement stats logged for debugging
      
      return stats;
    } catch (networkError) {
      throw networkError;
    }
  },

  /**
   * Check if achievement exists and can be unlocked
   */
  async canUnlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    try {
      const achievements = await this.getUserAchievements(userId);
      const achievement = achievements.find(a => a.id === achievementId);
      return achievement ? achievement.canUnlock && !achievement.completed : false;
    } catch (error) {
      return false;
    }
  }
};

export default achievementService; 