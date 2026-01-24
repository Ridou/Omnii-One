import { z } from "zod/v4";

// ✅ ACHIEVEMENT SYSTEM SCHEMAS: Centralized achievement data validation
export const AchievementDataSchema = z.object({
  achievement_id: z.string(),
  title: z.string(),
  description: z.string().optional().default(""),
  category: z.string(),
  difficulty: z.string(),
  xp_reward: z.number().nonnegative().default(0),
  icon: z.string().optional().default("🏆"),
  max_progress: z.number().positive().default(1),
  current_progress: z.number().nonnegative().default(0),
  completed: z.boolean().default(false),
  completed_at: z.string().nullable().optional(),
  can_unlock: z.boolean().default(true),
  progress_percentage: z.number().min(0).max(100).default(0),
});

export const AchievementProgressResultSchema = z.object({
  progress_updated: z.boolean(),
  new_progress: z.number(),
  achievement_unlocked: z.boolean(),
  xp_awarded: z.number(),
  level_up: z.boolean(),
  new_level: z.number(),
});

export const AchievementStatsSchema = z.object({
  total_achievements: z.number(),
  completed_achievements: z.number(),
  completion_percentage: z.number(),
  total_xp_from_achievements: z.number(),
  current_streak: z.number(),
  longest_streak: z.number(),
  recent_unlocks: z
    .array(
      z.object({
        achievement_id: z.string(),
        title: z.string().optional().nullable(),
        xp_awarded: z.number().optional().default(0),
        unlocked_at: z.string().optional().nullable(),
      }),
    )
    .default([]),
});
