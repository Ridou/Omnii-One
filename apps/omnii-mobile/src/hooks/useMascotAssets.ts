import { useMemo } from 'react';
import type { ImageRequireSource } from 'react-native';

// Types for mascot assets
export interface MascotStage {
  level: number;
  name: 'seed' | 'flower' | 'tree';
  displayName: string;
  description: string;
  minLevel: number;
  maxLevel: number;
  baseImage?: ImageRequireSource; // React Native image source type
  idleAnimation?: ImageRequireSource;
  celebrationAnimation?: ImageRequireSource;
}

export interface MascotExpression {
  name: string;
  image?: ImageRequireSource;
  description: string;
}

export interface MascotAssets {
  stages: {
    seed: MascotStage;
    flower: MascotStage;
    tree: MascotStage;
  };
  expressions: {
    happy: MascotExpression[];
    surprised: MascotExpression[];
    focused: MascotExpression[];
    proud: MascotExpression[];
    encouraging: MascotExpression[];
  };
  animations: {
    evolution: {
      seedToFlower?: ImageRequireSource;
      flowerToTree?: ImageRequireSource;
    };
    celebration: {
      achievement?: ImageRequireSource;
      levelUp?: ImageRequireSource;
      milestone?: ImageRequireSource;
    };
    idle: {
      breathing?: ImageRequireSource;
      subtle?: ImageRequireSource;
    };
    interaction: {
      tap?: ImageRequireSource;
      success?: ImageRequireSource;
    };
  };
  accessories: {
    levelBadges: ImageRequireSource[];
    xpIndicators: ImageRequireSource[];
    stageDecorations: ImageRequireSource[];
  };
  sounds: {
    achievements: ImageRequireSource[];
    celebrations: ImageRequireSource[];
    notifications: ImageRequireSource[];
  };
}

export function useMascotAssets(): {
  assets: MascotAssets;
  getMascotForLevel: (level: number) => MascotStage;
  getExpressionForMood: (mood: string) => MascotExpression;
  getCurrentStage: (level: number) => 'seed' | 'flower' | 'tree';
} {
  // Define mascot stages configuration
  const mascotStages: MascotAssets['stages'] = useMemo(() => ({
    seed: {
      level: 1,
      name: 'seed',
      displayName: '🌱 Seed',
      description: 'Just starting your productivity journey',
      minLevel: 1,
      maxLevel: 10,
      // baseImage: require('@/assets/images/mascot/stages/seed/base.png'), // TODO: Add when assets available
      // idleAnimation: require('@/assets/images/mascot/animations/idle/seed-breathing.gif'),
      // celebrationAnimation: require('@/assets/images/mascot/animations/celebration/seed-celebration.gif'),
    },
    flower: {
      level: 11,
      name: 'flower',
      displayName: '🌸 Flower',
      description: 'Blooming with consistent habits',
      minLevel: 11,
      maxLevel: 25,
      // baseImage: require('@/assets/images/mascot/stages/flower/base.png'),
      // idleAnimation: require('@/assets/images/mascot/animations/idle/flower-breathing.gif'),
      // celebrationAnimation: require('@/assets/images/mascot/animations/celebration/flower-celebration.gif'),
    },
    tree: {
      level: 26,
      name: 'tree',
      displayName: '🌳 Tree',
      description: 'Mastered productivity, giving back to others',
      minLevel: 26,
      maxLevel: 999,
      // baseImage: require('@/assets/images/mascot/stages/tree/base.png'),
      // idleAnimation: require('@/assets/images/mascot/animations/idle/tree-breathing.gif'),
      // celebrationAnimation: require('@/assets/images/mascot/animations/celebration/tree-celebration.gif'),
    },
  }), []);

  // Define expressions for different moods
  const mascotExpressions: MascotAssets['expressions'] = useMemo(() => ({
    happy: [
      {
        name: 'achievement-happy',
        description: 'Celebrating achievement completion',
        // image: require('@/assets/images/mascot/expressions/happy/achievement.png'),
      },
      {
        name: 'general-happy',
        description: 'General positive mood',
        // image: require('@/assets/images/mascot/expressions/happy/general.png'),
      },
    ],
    surprised: [
      {
        name: 'level-up-surprised',
        description: 'Surprised by level up',
        // image: require('@/assets/images/mascot/expressions/surprised/level-up.png'),
      },
    ],
    focused: [
      {
        name: 'work-focused',
        description: 'During focused work sessions',
        // image: require('@/assets/images/mascot/expressions/focused/work.png'),
      },
    ],
    proud: [
      {
        name: 'milestone-proud',
        description: 'Proud of reaching milestones',
        // image: require('@/assets/images/mascot/expressions/proud/milestone.png'),
      },
    ],
    encouraging: [
      {
        name: 'motivation',
        description: 'Encouraging user to continue',
        // image: require('@/assets/images/mascot/expressions/encouraging/motivation.png'),
      },
    ],
  }), []);

  // Animation assets
  const animations: MascotAssets['animations'] = useMemo(() => ({
    evolution: {
      // seedToFlower: require('@/assets/videos/mascot/evolution-sequences/seed-to-flower.mp4'),
      // flowerToTree: require('@/assets/videos/mascot/evolution-sequences/flower-to-tree.mp4'),
    },
    celebration: {
      // achievement: require('@/assets/videos/mascot/celebration-animations/achievement.mp4'),
      // levelUp: require('@/assets/videos/mascot/celebration-animations/level-up.mp4'),
      // milestone: require('@/assets/videos/mascot/celebration-animations/milestone.mp4'),
    },
    idle: {
      // breathing: require('@/assets/images/mascot/animations/idle/breathing.gif'),
      // subtle: require('@/assets/images/mascot/animations/idle/subtle.gif'),
    },
    interaction: {
      // tap: require('@/assets/images/mascot/animations/interaction/tap.gif'),
      // success: require('@/assets/images/mascot/animations/interaction/success.gif'),
    },
  }), []);

  // Accessory assets
  const accessories: MascotAssets['accessories'] = useMemo(() => ({
    levelBadges: [
      // require('@/assets/images/mascot/accessories/level-badges/level-1.png'),
      // require('@/assets/images/mascot/accessories/level-badges/level-5.png'),
      // require('@/assets/images/mascot/accessories/level-badges/level-10.png'),
      // Add more level badges as needed
    ],
    xpIndicators: [
      // require('@/assets/images/mascot/accessories/xp-indicators/xp-burst.png'),
      // require('@/assets/images/mascot/accessories/xp-indicators/xp-sparkle.png'),
    ],
    stageDecorations: [
      // require('@/assets/images/mascot/accessories/stage-decorations/seed-pot.png'),
      // require('@/assets/images/mascot/accessories/stage-decorations/flower-garden.png'),
      // require('@/assets/images/mascot/accessories/stage-decorations/tree-landscape.png'),
    ],
  }), []);

  // Sound assets
  const sounds: MascotAssets['sounds'] = useMemo(() => ({
    achievements: [
      // require('@/assets/sounds/achievements/unlock.wav'),
      // require('@/assets/sounds/achievements/complete.wav'),
    ],
    celebrations: [
      // require('@/assets/sounds/celebrations/level-up.wav'),
      // require('@/assets/sounds/celebrations/evolution.wav'),
    ],
    notifications: [
      // require('@/assets/sounds/notifications/gentle-chime.wav'),
      // require('@/assets/sounds/notifications/encouragement.wav'),
    ],
  }), []);

  // Combine all assets
  const assets: MascotAssets = useMemo(() => ({
    stages: mascotStages,
    expressions: mascotExpressions,
    animations,
    accessories,
    sounds,
  }), [mascotStages, mascotExpressions, animations, accessories, sounds]);

  // Helper functions
  const getMascotForLevel = (level: number): MascotStage => {
    if (level <= 10) return assets.stages.seed;
    if (level <= 25) return assets.stages.flower;
    return assets.stages.tree;
  };

  const getExpressionForMood = (mood: string): MascotExpression => {
    const moodExpressions = assets.expressions[mood as keyof typeof assets.expressions];
    if (!moodExpressions || moodExpressions.length === 0) {
      return assets.expressions.happy[0]; // Default to happy
    }
    return moodExpressions[0]; // Return first expression for now
  };

  const getCurrentStage = (level: number): 'seed' | 'flower' | 'tree' => {
    if (level <= 10) return 'seed';
    if (level <= 25) return 'flower';
    return 'tree';
  };

  return {
    assets,
    getMascotForLevel,
    getExpressionForMood,
    getCurrentStage,
  };
} 