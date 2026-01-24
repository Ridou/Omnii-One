import { z } from 'zod';

// Mascot stage enumeration
export enum MascotStage {
  SEED = 'seed',
  FLOWER = 'flower', 
  TREE = 'tree'
}

// Mascot size options
export enum MascotSize {
  COMPACT = 'compact',
  STANDARD = 'standard',
  LARGE = 'large'
}

// Mascot expression states
export enum MascotExpression {
  IDLE = 'idle',
  HAPPY = 'happy',
  CELEBRATING = 'celebrating',
  FOCUSED = 'focused',
  ENCOURAGING = 'encouraging'
}

// Cheering trigger types
export enum CheeringTrigger {
  LEVEL_UP = 'level_up',
  TAP_INTERACTION = 'tap_interaction',
  TASK_COMPLETE = 'task_complete',
  DAILY_STREAK = 'daily_streak',
  ACHIEVEMENT_UNLOCK = 'achievement_unlock'
}

// Zod schemas for validation
export const MascotConfigSchema = z.object({
  stage: z.nativeEnum(MascotStage),
  level: z.number().min(1),
  size: z.nativeEnum(MascotSize).optional().default(MascotSize.STANDARD),
  showLabel: z.boolean().optional().default(false),
  showLevel: z.boolean().optional().default(true),
  enableInteraction: z.boolean().optional().default(true),
  enableCheering: z.boolean().optional().default(false),
  cheeringTrigger: z.nativeEnum(CheeringTrigger).nullable().optional(),
});

export const MascotStateSchema = z.object({
  isAnimating: z.boolean(),
  currentExpression: z.nativeEnum(MascotExpression),
  cheeringMessage: z.string().optional(),
  lastInteraction: z.string().optional(),
});

export const CheeringStateSchema = z.object({
  isActive: z.boolean(),
  trigger: z.nativeEnum(CheeringTrigger).nullable(),
  timestamp: z.string().optional(),
});

// TypeScript types inferred from Zod schemas
export type MascotConfig = z.infer<typeof MascotConfigSchema>;
export type MascotState = z.infer<typeof MascotStateSchema>;
export type CheeringState = z.infer<typeof CheeringStateSchema>;

// Asset configuration interface
export interface MascotAssets {
  [MascotStage.SEED]: any;
  [MascotStage.FLOWER]: any;
  [MascotStage.TREE]: any;
}

// Size configuration interface
export interface SizeConfig {
  container: string;
  image: { width: number; height: number };
  badge: string;
  badgeText: string;
  label: string;
}

// Component props interfaces
export interface MascotProps {
  stage: MascotStage;
  level: number;
  size?: MascotSize;
  showLabel?: boolean;
  showLevel?: boolean;
  enableInteraction?: boolean;
  enableCheering?: boolean;
  cheeringTrigger?: CheeringTrigger | null;
  onTap?: () => void;
  className?: string;
  style?: any;
}

export interface MascotDisplayProps extends MascotProps {
  // Extended props for full-featured display
  showEvolutionProgress?: boolean;
  enableVideoAnimations?: boolean;
  customMessages?: string[];
}

// Backwards compatibility
export type ProfileMascotProps = MascotProps;

// Hook return types
export interface UseMascotCheeringReturn {
  cheeringState: CheeringState;
  triggerCheering: (trigger: CheeringTrigger) => void;
  isCheeringActive: boolean;
}

// Utility functions for mascot logic
export const getMascotStageByLevel = (level: number): MascotStage => {
  if (level <= 10) return MascotStage.SEED;
  if (level <= 25) return MascotStage.FLOWER;
  return MascotStage.TREE;
};

export const getStageDisplayName = (stage: MascotStage): string => {
  const names = {
    [MascotStage.SEED]: 'Seed of Life',
    [MascotStage.FLOWER]: 'Flower of Life',
    [MascotStage.TREE]: 'Tree of Life'
  };
  return names[stage];
};

export const getStageEmoji = (stage: MascotStage): string => {
  const emojis = {
    [MascotStage.SEED]: '🌱',
    [MascotStage.FLOWER]: '🌸',
    [MascotStage.TREE]: '🌳'
  };
  return emojis[stage];
};

// Validation helpers
export const validateMascotConfig = (config: any): MascotConfig => {
  return MascotConfigSchema.parse(config);
};

export const isValidMascotStage = (stage: any): stage is MascotStage => {
  return Object.values(MascotStage).includes(stage);
};

export const isValidCheeringTrigger = (trigger: any): trigger is CheeringTrigger => {
  return Object.values(CheeringTrigger).includes(trigger);
};

// Default encouragement messages by trigger type
export const DEFAULT_ENCOURAGEMENT_MESSAGES: Record<CheeringTrigger, string[]> = {
  [CheeringTrigger.LEVEL_UP]: [
    "Level up! Amazing! 🚀",
    "You're growing! 🌟", 
    "Incredible progress! ⭐",
    "Next level achieved! 🎉"
  ],
  [CheeringTrigger.TAP_INTERACTION]: [
    "You've got this! 💪",
    "Keep growing! 🌟",
    "Stay focused! 🎯",
    "Amazing progress! ✨",
    "You're doing great! 🚀"
  ],
  [CheeringTrigger.TASK_COMPLETE]: [
    "Great job! 🎉",
    "You're on fire! 🔥",
    "Keep it up! 💪",
    "Task conquered! ⚡"
  ],
  [CheeringTrigger.DAILY_STREAK]: [
    "Consistency pays off! 📈",
    "Streak master! 🏆",
    "Habits forming! 💫",
    "Daily dedication! 🎯"
  ],
  [CheeringTrigger.ACHIEVEMENT_UNLOCK]: [
    "Achievement unlocked! 🏆",
    "Milestone reached! 🎊",
    "You're unstoppable! ⚡",
    "Goal smashed! 💥"
  ]
};

// Animation timing constants
export const ANIMATION_TIMINGS = {
  BREATHING_DURATION: 3000,
  FLOATING_DURATION: 4000,
  CHEER_DISPLAY_DURATION: 3500,
  PULSE_ANIMATION_DURATION: 150,
  FADE_DURATION: 400
} as const;

export type AnimationTimings = typeof ANIMATION_TIMINGS; 