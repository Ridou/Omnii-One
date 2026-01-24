import { z } from "zod/v4";

// ✅ XP SYSTEM SCHEMAS: Centralized XP data validation
export const XPUpdateSchema = z.object({
  xp_awarded: z.number().int().nonnegative(),
  new_level: z.number().int().positive(),
  level_up: z.boolean(),
  milestone_unlocks: z.array(z.string()).optional(),
  // Optional fields for extended validation
  reason: z.string().optional(),
  category: z.string().optional(),
  timestamp: z.string().optional(),
});

export const XPProgressSchema = z.object({
  current_level: z.number().int().positive(),
  total_xp: z.number().int().nonnegative(),
  xp_to_next_level: z.number().int().nonnegative(),
  xp_in_current_level: z.number().int().nonnegative(),
  xp_needed_for_level: z.number().int().positive(),
  progress_percentage: z.number().min(0).max(100),
  completed: z.boolean(),
  next_level_xp: z.number().int().positive().optional(),
});

export const LevelProgressionSchema = z.object({
  id: z.string(),
  user_id: z.string().uuid(),
  from_level: z.number().int().positive(),
  to_level: z.number().int().positive(),
  xp_at_level_up: z.number().int().nonnegative(),
  milestone_unlocks: z.array(z.string()).optional(),
  celebration_shown: z.boolean(),
  unlock_animations_played: z.array(z.string()),
  achieved_at: z.string(),
});

export const XPRealtimeUpdateSchema = z.object({
  type: z.enum(["xp_awarded", "level_up", "milestone_unlocked"]),
  payload: z.union([XPUpdateSchema, LevelProgressionSchema]),
  timestamp: z.string(),
});
