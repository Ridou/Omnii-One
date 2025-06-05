// Onboarding System Types - Holistic Life Domain Learning

export interface OnboardingQuote {
  id: string;
  quote_id: string;
  text: string;
  author: string;
  category: 'productivity' | 'discipline' | 'physical_health' | 'mental_health' | 
           'spiritual_health' | 'social_wellbeing' | 'activities' | 'motivation' | 
           'philosophy' | 'growth' | 'focus';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  order_index: number;
  psychological_markers: string[];
  expected_resonance: number;
  life_domain: 'work' | 'health' | 'relationships' | 'personal_growth' | 'spirituality' | 'lifestyle';
  active: boolean;
}

// New: Interactive onboarding tasks
export interface OnboardingTask {
  id: string;
  task_id: string;
  type: 'quote' | 'preference' | 'scenario' | 'goal_setting' | 'time_audit';
  title: string;
  description: string;
  content: OnboardingQuote | PreferenceTask | ScenarioTask | GoalSettingTask | TimeAuditTask;
  order_index: number;
  xp_reward: number;
  life_domain: 'work' | 'health' | 'relationships' | 'personal_growth' | 'spirituality' | 'lifestyle';
  psychological_markers: string[];
  estimated_time_minutes: number;
}

export interface PreferenceTask {
  question: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
    psychological_markers: string[];
  }>;
  allow_multiple: boolean;
}

export interface ScenarioTask {
  scenario: string;
  question: string;
  options: Array<{
    id: string;
    choice: string;
    outcome: string;
    psychological_markers: string[];
  }>;
}

export interface GoalSettingTask {
  prompt: string;
  categories: string[];
  min_goals: number;
  max_goals: number;
}

export interface TimeAuditTask {
  prompt: string;
  time_blocks: Array<{
    id: string;
    label: string;
    hours: number;
  }>;
  total_hours: number;
}

export interface QuoteResponse {
  id: string;
  user_id: string;
  quote_id: string;
  action: 'approve' | 'decline';
  time_spent_ms: number;
  confidence_score: number;
  session_id?: string;
  created_at: string;
}

export interface OnboardingSession {
  id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  total_quotes_shown: number;
  quotes_approved: number;
  quotes_declined: number;
  average_response_time_ms?: number;
  final_level_reached?: number;
  final_xp_earned?: number;
  abandoned_at_quote?: number;
  completion_rate?: number;
  discord_cta_shown: boolean;
  discord_cta_clicked: boolean;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  category: 'onboarding' | 'daily' | 'achievement' | 'bonus';
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

export interface HolisticPreferences {
  categories: Record<string, number>; // -1 to 1 scale for each category
  life_domains: Record<string, number>; // Preference scores for life domains
  psychological_profile: Record<string, number>; // Psychological marker scores
  holistic_balance_score: number; // 0-100 how balanced across domains
  dominant_life_focus: string; // Primary area of interest
  resonance_score: number; // Overall engagement 0-100
  completion_velocity: number; // Average response time
  decision_confidence: number; // Consistency of responses
}

export interface AIPersonality {
  communication_style: 'direct_results_focused' | 'gentle_reflective' | 'energetic_motivational' | 'balanced';
  focus_areas: string[]; // Life domains to emphasize
  motivation_approach: 'achievement' | 'growth' | 'balance' | 'impact';
  health_integration: boolean;
  spiritual_awareness: boolean;
  social_emphasis: boolean;
}

// AI Tuning Preferences
export interface AITuningPreferences {
  // Communication Style (0-100, where 0=casual, 100=professional)
  communicationStyle: number;
  communicationStyleLabel: 'casual' | 'friendly' | 'balanced' | 'professional' | 'formal';
  
  // Response Length (0-100, where 0=brief, 100=detailed)
  responseLength: number;
  responseLengthLabel: 'brief' | 'concise' | 'balanced' | 'detailed' | 'comprehensive';
  
  // Proactivity Level (0-100, where 0=reactive, 100=proactive)
  proactivityLevel: number;
  proactivityLabel: 'reactive' | 'balanced' | 'proactive' | 'highly_proactive' | 'predictive';
  
  // Focus Protection (0-100, where 0=interrupt anytime, 100=maximum respect)
  focusProtection: number;
  focusProtectionLabel: 'flexible' | 'considerate' | 'respectful' | 'protective' | 'strict';
  
  // Urgency Threshold (0-100, where 0=notify everything, 100=only critical)
  urgencyThreshold: number;
  urgencyThresholdLabel: 'all' | 'most' | 'important' | 'critical' | 'emergency_only';
  
  // Learning Speed (0-100, where 0=slow/cautious, 100=fast/adaptive)
  learningSpeed: number;
  learningSpeedLabel: 'cautious' | 'steady' | 'balanced' | 'adaptive' | 'rapid';
  
  // Privacy Level (0-100, where 0=share everything, 100=maximum privacy)
  privacyLevel: number;
  privacyLevelLabel: 'open' | 'selective' | 'balanced' | 'guarded' | 'maximum';
  
  // Enthusiasm (0-100, where 0=calm, 100=energetic)
  enthusiasm: number;
  enthusiasmLabel: 'calm' | 'measured' | 'balanced' | 'upbeat' | 'energetic';
  
  // Motivation Style (0-100, where 0=gentle, 100=direct)
  motivationStyle: number;
  motivationStyleLabel: 'gentle' | 'supportive' | 'balanced' | 'direct' | 'challenging';
  
  // Last updated
  lastUpdated: string;
}

// Helper to generate system prompt variables from preferences
export interface SystemPromptVariables {
  communication_style: string;
  response_length: string;
  proactivity: string;
  interruption_policy: string;
  urgency_filter: string;
  learning_rate: string;
  privacy_mode: string;
  enthusiasm_level: string;
  motivation_approach: string;
}

export interface OnboardingData {
  completed: boolean;
  current_level: number;
  total_xp: number;
  onboarding_xp: number;
  level_5_achieved_at?: string;
  highest_level_achieved: number;
  last_level_up_at?: string;
  feature_exploration: Record<string, FeatureExploration>;
  active_nudges: ContextualNudge[];
  ai_tuning?: AITuningPreferences; // Add AI tuning preferences
}

export interface OnboardingState {
  // Onboarding progress
  isActive: boolean;
  currentQuoteIndex: number;
  quotes: OnboardingQuote[];
  responses: QuoteResponse[];
  session?: OnboardingSession;
  
  // User progression
  onboardingData: OnboardingData;
  holisticPreferences?: HolisticPreferences;
  aiPersonality?: AIPersonality;
  
  // Feature unlocks
  unlockedFeatures: string[];
  pendingUnlocks: string[];
  celebrationQueue: LevelProgression[];
  
  // Loading states
  isLoading: boolean;
  error?: string;
}

export type OnboardingAction = 
  | { type: 'START_ONBOARDING'; payload: { quotes: OnboardingQuote[]; sessionId: string } }
  | { type: 'RECORD_QUOTE_RESPONSE'; payload: { quoteId: string; action: 'approve' | 'decline'; timeSpent: number } }
  | { type: 'ADVANCE_QUOTE' }
  | { type: 'AWARD_XP'; payload: { amount: number; reason: string; category: string } }
  | { type: 'LEVEL_UP'; payload: LevelProgression }
  | { type: 'UNLOCK_FEATURE'; payload: { feature: string; level: number } }
  | { type: 'SHOW_CELEBRATION'; payload: string }
  | { type: 'COMPLETE_ONBOARDING'; payload: { finalLevel: number; totalXP: number } }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<HolisticPreferences> }
  | { type: 'UPDATE_AI_PERSONALITY'; payload: Partial<AIPersonality> }
  | { type: 'LOAD_STATE'; payload: { onboardingData?: OnboardingData; holisticPreferences?: HolisticPreferences } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET_ONBOARDING' }
  // New: Feature exploration actions
  | { type: 'RECORD_FEATURE_VISIT'; payload: { feature: string; isFirstVisit: boolean } }
  | { type: 'CREATE_NUDGE'; payload: ContextualNudge }
  | { type: 'DISMISS_NUDGE'; payload: string } // nudge ID
  | { type: 'MARK_NUDGE_SHOWN'; payload: string } // nudge ID
  | { type: 'CLEAN_EXPIRED_NUDGES' }
  | { type: 'CLEAR_ALL_NUDGES' };

// Level progression mapping (from onboarding.mdc)
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
  0: ['approvals'], // Always available
  3: ['approvals', 'achievements'], // Level 3
  4: ['approvals', 'achievements', 'chat'], // Level 4
  5: ['approvals', 'achievements', 'chat', 'analytics', 'profile'], // Level 5 - ALL CORE FEATURES
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