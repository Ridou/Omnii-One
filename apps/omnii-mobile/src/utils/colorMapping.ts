import { AppColors } from '~/constants/Colors';

/**
 * Color mapping utility for converting AppColors constants to NativeWind classes
 * Enables gradual migration from StyleSheet to NativeWind
 */

// Color to Tailwind class mapping
export const colorToClass = {
  // Background colors
  [AppColors.background]: 'bg-omnii-background',
  [AppColors.cardBackground]: 'bg-omnii-card',
  
  // Text colors
  [AppColors.textPrimary]: 'text-omnii-text-primary',
  [AppColors.textSecondary]: 'text-omnii-text-secondary',
  
  // Status colors
  [AppColors.success]: 'bg-success',
  [AppColors.successLight]: 'bg-success-light',
  [AppColors.warning]: 'bg-warning',
  [AppColors.warningBackground]: 'bg-warning-background',
  [AppColors.error]: 'bg-error',
  [AppColors.errorLight]: 'bg-error-light',
  
  // Priority colors
  [AppColors.highPriority]: 'bg-priority-high',
  [AppColors.mediumPriority]: 'bg-priority-medium',
  [AppColors.lowPriority]: 'bg-priority-low',
  
  // AI theme colors
  [AppColors.aiGradientStart]: 'bg-ai-start',
  [AppColors.aiGradientEnd]: 'bg-ai-end',
  
  // Border colors
  [AppColors.border]: 'border-omnii-border',
  [AppColors.borderLight]: 'border-omnii-border-light',
} as const;

// Text color mappings
export const textColorToClass = {
  [AppColors.textPrimary]: 'text-omnii-text-primary',
  [AppColors.textSecondary]: 'text-omnii-text-secondary',
  [AppColors.success]: 'text-success',
  [AppColors.warning]: 'text-warning',
  [AppColors.error]: 'text-error',
  [AppColors.aiGradientStart]: 'text-ai-start',
  '#ffffff': 'text-white',
  '#000000': 'text-black',
  '#FFFFFF': 'text-white',
} as const;

// Border color mappings
export const borderColorToClass = {
  [AppColors.border]: 'border-omnii-border',
  [AppColors.borderLight]: 'border-omnii-border-light',
  [AppColors.highPriority]: 'border-priority-high',
  [AppColors.mediumPriority]: 'border-priority-medium',
  [AppColors.lowPriority]: 'border-priority-low',
  [AppColors.success]: 'border-success',
  [AppColors.warning]: 'border-warning',
  [AppColors.error]: 'border-error',
} as const;

/**
 * Get background color class for a given color value
 */
export function getColorClass(color: string): string {
  return colorToClass[color as keyof typeof colorToClass] || '';
}

/**
 * Get text color class for a given color value
 */
export function getTextColorClass(color: string): string {
  return textColorToClass[color as keyof typeof textColorToClass] || '';
}

/**
 * Get border color class for a given color value
 */
export function getBorderColorClass(color: string): string {
  return borderColorToClass[color as keyof typeof borderColorToClass] || '';
}

/**
 * Convert any color value to appropriate NativeWind class
 * Automatically detects the type of color class needed
 */
export function convertColorToClass(
  color: string, 
  type: 'bg' | 'text' | 'border' = 'bg'
): string {
  switch (type) {
    case 'text':
      return getTextColorClass(color);
    case 'border':
      return getBorderColorClass(color);
    case 'bg':
    default:
      return getColorClass(color);
  }
}

/**
 * Helper to get color class with fallback
 */
export function getColorClassWithFallback(
  color: string, 
  fallback: string = 'bg-gray-500'
): string {
  const colorClass = getColorClass(color);
  return colorClass || fallback;
}

/**
 * Priority color helpers for quick access
 */
export const PRIORITY_CLASSES = {
  high: {
    bg: 'bg-priority-high',
    text: 'text-priority-high',
    border: 'border-priority-high',
  },
  medium: {
    bg: 'bg-priority-medium',
    text: 'text-priority-medium', 
    border: 'border-priority-medium',
  },
  low: {
    bg: 'bg-priority-low',
    text: 'text-priority-low',
    border: 'border-priority-low',
  },
} as const;

/**
 * Get priority classes for a given priority level
 */
export function getPriorityClasses(priority: 'high' | 'medium' | 'low') {
  return PRIORITY_CLASSES[priority];
} 