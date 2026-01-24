/**
 * Centralized XP System Constants
 * Single source of truth for all XP calculations across the app
 */

// ✅ LEVEL REQUIREMENTS: Official progression system
export const LEVEL_REQUIREMENTS: Record<number, number> = {
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
  50: 60000,  // Transcendent Status (max level)
} as const;

// ✅ LEVEL TITLES: Human-readable level names
export const LEVEL_TITLES: Record<number, string> = {
  1: 'Starter',
  2: 'Explorer', 
  3: 'Achiever',
  4: 'Communicator',
  5: 'Analyst',
  6: 'Advanced User',
  7: 'Power User',
  8: 'Expert',
  9: 'Veteran',
  10: 'Master',
  15: 'Guru',
  20: 'Sage',
  25: 'Legend',
  30: 'Titan',
  40: 'Deity',
  50: 'Transcendent',
} as const;

// ✅ FEATURE UNLOCKS: What features unlock at each level
export const FEATURE_UNLOCKS: Record<number, string[]> = {
  1: ['Basic Tasks'],
  2: ['Achievements System'],
  3: ['Chat & Voice'],
  4: ['Analytics Dashboard'],
  5: ['Profile & ALL CORE FEATURES'],
  6: ['Advanced Analytics'],
  7: ['Team Features'],
  8: ['Automation Tools'],
  9: ['Advanced Integrations'],
  10: ['Expert Mode'],
} as const;

// ✅ XP REWARDS: Standard XP amounts for different actions
export const XP_REWARDS = {
  // Onboarding actions
  QUOTE_APPROVAL: 10,
  QUOTE_DECLINE: 5,
  QUOTE_INTERACTION: 3,
  ONBOARDING_COMPLETE: 100,
  
  // Feature exploration
  FEATURE_VISIT: 5,
  FIRST_FEATURE_VISIT: 15,
  
  // Achievements
  ACHIEVEMENT_UNLOCK: 25,
  MILESTONE_COMPLETE: 50,
  
  // System actions
  PROFILE_COMPLETE: 30,
  SETTINGS_CONFIGURE: 20,
  
  // Special events
  LEVEL_UP_BONUS: 20,
  SUBSCRIPTION_ACTIVATED: 500,
  SCREEN_UNLOCK: 50,
} as const;

// ✅ UTILITY FUNCTIONS: Helper functions for XP calculations
export const XPSystemUtils = {
  /**
   * Get the XP requirement for a specific level
   */
  getXPForLevel(level: number): number {
    return LEVEL_REQUIREMENTS[level] ?? 60000; // Fallback to max level XP
  },

  /**
   * Calculate which level a user should be at based on total XP
   */
  calculateLevelFromXP(totalXP: number): number {
    let level = 1;
    for (const [lvl, requirement] of Object.entries(LEVEL_REQUIREMENTS)) {
      if (totalXP >= requirement) {
        level = parseInt(lvl);
      } else {
        break;
      }
    }
    return Math.min(level, 50); // Cap at max level
  },

  /**
   * Get the next level's XP requirement
   */
  getNextLevelXP(currentLevel: number): number {
    const nextLevel = currentLevel + 1;
    return LEVEL_REQUIREMENTS[nextLevel] ?? 60000; // Fallback to max level XP
  },

  /**
   * Calculate XP progress within current level
   */
  getXPInCurrentLevel(totalXP: number, currentLevel: number): number {
    const currentLevelXP = this.getXPForLevel(currentLevel);
    return Math.max(0, totalXP - currentLevelXP);
  },

  /**
   * Calculate XP needed for next level
   */
  getXPToNextLevel(totalXP: number, currentLevel: number): number {
    if (currentLevel >= 50) return 0; // Max level reached
    
    const nextLevelXP = this.getNextLevelXP(currentLevel);
    return Math.max(0, nextLevelXP - totalXP);
  },

  /**
   * Calculate progress percentage within current level
   */
  getProgressPercentage(totalXP: number, currentLevel: number): number {
    if (currentLevel >= 50) return 100; // Max level reached
    
    const currentLevelXP = this.getXPForLevel(currentLevel);
    const nextLevelXP = this.getNextLevelXP(currentLevel);
    const xpInLevel = totalXP - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    
    return Math.min(100, Math.max(0, (xpInLevel / xpNeededForLevel) * 100));
  },

  /**
   * Get level title for display
   */
  getLevelTitle(level: number): string {
    return LEVEL_TITLES[level] ?? `Level ${level}`;
  },

  /**
   * Get features unlocked at a specific level
   */
  getFeaturesUnlockedAtLevel(level: number): string[] {
    return FEATURE_UNLOCKS[level] ?? [];
  },

  /**
   * Check if level up should occur
   */
  shouldLevelUp(currentXP: number, currentLevel: number, newXP: number): boolean {
    const newTotalXP = currentXP + newXP;
    const newCalculatedLevel = this.calculateLevelFromXP(newTotalXP);
    return newCalculatedLevel > currentLevel;
  },

  /**
   * Get all levels between current and new level (for multi-level jumps)
   */
  getLevelsBetween(fromLevel: number, toLevel: number): number[] {
    const levels: number[] = [];
    for (let level = fromLevel + 1; level <= toLevel; level++) {
      levels.push(level);
    }
    return levels;
  }
} as const;

// ✅ TYPE DEFINITIONS: TypeScript types for XP system
export type LevelNumber = keyof typeof LEVEL_REQUIREMENTS;
export type XPRewardType = keyof typeof XP_REWARDS;
export type FeatureUnlock = string;

// ✅ VALIDATION HELPERS: Runtime validation for XP system
export const XPValidation = {
  isValidLevel(level: number): level is LevelNumber {
    return level >= 1 && level <= 50 && Number.isInteger(level);
  },

  isValidXP(xp: number): boolean {
    return xp >= 0 && Number.isInteger(xp);
  },

  isLevelUnlocked(level: number, userXP: number): boolean {
    const requiredXP = XPSystemUtils.getXPForLevel(level);
    return userXP >= requiredXP;
  }
} as const; 