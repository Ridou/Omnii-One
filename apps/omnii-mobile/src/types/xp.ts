// XP System Types

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  category: 'onboarding' | 'daily' | 'achievement' | 'bonus' | 'productivity' | 'debug';
  source_action?: string;
  multiplier: number;
  metadata: Record<string, any>;
  quote_id?: string;
  level_before?: number;
  level_after?: number;
  created_at: string;
}

export interface LevelProgression {
  id: string;
  user_id: string;
  from_level: number;
  to_level: number;
  xp_at_level_up: number;
  milestone_unlocks?: string[];
  celebration_shown: boolean;
  celebration_shown_at?: string;
  unlock_animations_played: string[];
  achieved_at: string;
}

export interface UserFeatureAccess {
  id: string;
  user_id: string;
  feature_name: string;
  access_level: 'preview' | 'basic' | 'full' | 'advanced';
  unlocked_at: string;
  unlocked_by: 'onboarding' | 'level_milestone' | 'achievement';
  unlock_level?: number;
  first_interaction_at?: string;
  interaction_count: number;
}

// Level progression mapping
export const LEVEL_REQUIREMENTS = {
  1: 0,       // Starting level
  2: 100,     // Simple progression
  3: 200,     // Achievement System
  4: 320,     // Chat & Voice  
  5: 450,     // Analytics & Profile = ALL CORE FEATURES
  6: 750,     // Major jump (+300 XP) - Advanced features begin
  7: 1100,    // Exponential growth
  8: 1500,    
  9: 1950,    
  10: 2500,   // Expert Status
  15: 5000,   // Guru Status
  20: 8000,   // Sage Status
  25: 12000,  // Legend Status
  30: 18000,  // Titan Status
  40: 35000,  // Deity Status
  50: 60000,  // Transcendent Status
} as const;

export const FEATURE_UNLOCK_LEVELS = {
  achievements_full: 3,
  chat_full: 4,
  voice_commands: 4,
  analytics_full: 5,
  profile_full: 5,
  advanced_insights: 6,
  habit_tracking: 6,
  predictive_analytics: 10,
  team_features: 10,
  automations: 15,
  api_access: 15,
  mentor_mode: 20,
  community_leadership: 20,
  ai_evolution: 25,
  predictive_scheduling: 25,
  titan_features: 30,
  advanced_models: 30,
  deity_features: 40,
  governance: 40,
  transcendent_features: 50,
  reality_shaping: 50,
} as const;

export const TAB_UNLOCK_SEQUENCE = {
  0: ['tasks', 'achievements', 'chat', 'analytics', 'profile'], // All features always available
} as const;

// Feature exploration tracking
export interface FeatureExploration {
  feature_name: string;
  first_visit_at?: string;
  visit_count: number;
  xp_rewarded: boolean; // Whether first-visit XP has been awarded
  nudge_dismissed: boolean; // Whether user dismissed the nudge
  last_nudge_shown?: string;
}

export interface ContextualNudge {
  id: string;
  feature_name: string;
  title: string;
  message: string;
  icon: string;
  xp_reward: number;
  trigger_delay_minutes: number; // Show X minutes after unlock
  dismiss_after_hours: number; // Auto-dismiss after X hours
  created_at: string;
  dismissed: boolean;
  shown: boolean; // Track if this nudge has been shown to the user
} 