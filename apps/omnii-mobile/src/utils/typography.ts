import { Platform, Dimensions } from 'react-native';
import { TYPOGRAPHY_VARIANTS, FONT_SIZES, type TypographyVariant, FONT_WEIGHTS } from '../constants/Typography';
import { getSystemFontFallback } from '../hooks/useCustomFonts';
import { cn } from './cn';

/**
 * Typography utility functions for NativeWind integration
 * Simplified for reliable implementation with OMNII design system
 */

// Get screen dimensions for responsive typography
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enhanced typography class mappings with font integration
export const TYPOGRAPHY_CLASSES = {
  // Display Typography (Tiempos for headlines)
  displayLarge: 'text-display-1 font-bold',
  displayMedium: 'text-display-2 font-bold',
  displaySmall: 'text-display-3 font-bold',
  
  // Headings (Tiempos)
  h1: 'text-heading-1 font-bold',
  h2: 'text-heading-2 font-bold',
  h3: 'text-heading-3 font-semibold',
  h4: 'text-xl font-semibold',
  h5: 'text-lg font-medium',
  h6: 'text-base font-medium',
  
  // Body text (Tiempos)
  body1: 'text-base leading-relaxed',
  body2: 'text-sm leading-relaxed',
  
  // Brand Typography (Styrene)
  brandLarge: 'text-display-1 font-bold',
  brandMedium: 'text-heading-1 font-black',
  brandSmall: 'text-heading-3 font-medium',
  
  // Buttons (Styrene)
  buttonLarge: 'text-button-large font-semibold',
  buttonMedium: 'text-button-medium font-semibold',
  buttonSmall: 'text-button-small font-medium',
  
  // Captions
  caption: 'text-xs leading-normal',
  overline: 'text-xs font-medium uppercase tracking-widest',
} as const;

// Enhanced font family mapping for NativeWind
export const getTypographyFontClass = (
  fontFamily: string,
  fontWeight: string,
  fontsLoaded: boolean = false
): string => {
  if (!fontsLoaded) {
    return 'font-system';
  }
  
  // Map font families to NativeWind classes
  if (fontFamily === 'Styrene') {
    if (fontWeight === '300') return 'text-styrene-light';
    if (fontWeight === '700') return 'text-styrene-bold';
    if (fontWeight === '900') return 'text-styrene-black';
    return 'text-styrene';
  }
  
  if (fontFamily === 'Tiempos') {
    if (fontWeight === '600') return 'text-tiempos-semibold';
    if (fontWeight === '700') return 'text-tiempos-bold';
    return 'text-tiempos';
  }
  
  return 'font-system';
};

// Enhanced typography utility with accessibility and font loading
export function getAccessibleTypographyClass(
  variant: keyof typeof TYPOGRAPHY_CLASSES,
  options: {
    highContrast?: boolean;
    largeText?: boolean;
    fontsLoaded?: boolean;
    fontError?: boolean;
  } = {}
): string {
  const { 
    highContrast = false, 
    largeText = false,
    fontsLoaded = false,
    fontError = false
  } = options;
  
  const baseClass = TYPOGRAPHY_CLASSES[variant];
  const modifiers = [];
  
  // Font loading handling
  if (fontsLoaded && !fontError) {
    // Use specific font classes based on variant
    if (variant.startsWith('brand')) {
      modifiers.push('text-styrene');
    } else {
      modifiers.push('text-tiempos');
    }
  } else {
    modifiers.push('font-system');
  }
  
  // Simple accessibility enhancements
  if (highContrast) {
    modifiers.push('high-contrast');
  }
  
  if (largeText) {
    modifiers.push('text-lg-acc');
  }
  
  return cn(baseClass, ...modifiers);
}

// Typography hook for component integration
export function useTypography(variant: keyof typeof TYPOGRAPHY_CLASSES) {
  return {
    className: getAccessibleTypographyClass(variant, { fontsLoaded: false, fontError: false }),
    fontsLoaded: false,
    fontError: false,
  };
}

// Complete mapping from constants/Typography.ts to NativeWind
export const TYPOGRAPHY_VARIANT_MAPPING = {
  // Brand Typography
  brandLarge: 'text-display-1 text-styrene-bold font-bold leading-tight tracking-wide',
  brandMedium: 'text-heading-1 text-styrene-black font-black leading-tight',
  brandSmall: 'text-heading-3 text-styrene-medium font-medium leading-normal tracking-wide',
  
  // Display Typography
  displayLarge: 'text-display-1 text-tiempos-bold font-bold leading-tight',
  displayMedium: 'text-display-2 text-tiempos-bold font-bold leading-tight',
  displaySmall: 'text-display-3 text-tiempos-bold font-bold leading-normal',
  
  // Headings
  h1: 'text-heading-1 text-tiempos-bold font-bold leading-normal',
  h2: 'text-heading-2 text-tiempos-bold font-bold leading-normal',
  h3: 'text-heading-3 text-tiempos-semibold font-semibold leading-normal',
  h4: 'text-lg text-tiempos-semibold font-semibold leading-normal',
  h5: 'text-base text-tiempos-medium font-medium leading-normal',
  h6: 'text-sm text-tiempos-medium font-medium leading-normal',
  
  // Body Text
  body1: 'text-base text-tiempos leading-relaxed',
  body2: 'text-sm text-tiempos leading-relaxed',
  
  // Utility Text
  caption: 'text-xs text-tiempos leading-normal',
  overline: 'text-xs text-styrene-medium font-medium uppercase tracking-widest',
  
  // Button Text
  buttonLarge: 'text-button-large text-styrene-semibold font-semibold leading-normal',
  buttonMedium: 'text-button-medium text-styrene-semibold font-semibold leading-normal',
  buttonSmall: 'text-button-small text-styrene-medium font-medium leading-normal',
} as const;

// Utility to get complete typography class string
export function getTypographyClass(
  variant: keyof typeof TYPOGRAPHY_VARIANT_MAPPING,
  fallback: boolean = false
): string {
  if (fallback) {
    // Return system font fallback version
    return TYPOGRAPHY_VARIANT_MAPPING[variant].replace(/text-(styrene|tiempos)[^\s]*/g, 'font-system');
  }
  
  return TYPOGRAPHY_VARIANT_MAPPING[variant];
}

/**
 * Calculate responsive font size based on screen width
 * Useful for making typography scale appropriately on different devices
 */
export const getResponsiveFontSize = (baseFontSize: number, scaleFactor = 1): number => {
  const baseWidth = 375; // iPhone 8 width as base
  const scale = (screenWidth / baseWidth) * scaleFactor;
  const newSize = baseFontSize * scale;
  
  // Ensure minimum and maximum font sizes
  const minSize = baseFontSize * 0.8;
  const maxSize = baseFontSize * 1.3;
  
  return Math.max(minSize, Math.min(maxSize, newSize));
};

/**
 * Create a typography style with custom overrides
 */
export const createCustomTypographyStyle = (
  variant: TypographyVariant,
  overrides: {
    fontSize?: number;
    fontWeight?: string;
    lineHeight?: number;
    letterSpacing?: number;
    color?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  } = {}
) => {
  const baseStyle = TYPOGRAPHY_VARIANTS[variant];
  
  return {
    ...baseStyle,
    ...overrides,
  };
};

/**
 * Simple typography presets
 */
export const TYPOGRAPHY_PRESETS = {
  // Navigation and headers
  navigationTitle: createCustomTypographyStyle('h5', {
    fontWeight: FONT_WEIGHTS.semibold,
    textAlign: 'center',
  }),
  
  // Form elements
  inputLabel: createCustomTypographyStyle('body2', {
    fontWeight: FONT_WEIGHTS.medium,
    color: '#666666',
  }),
  inputText: createCustomTypographyStyle('body1'),
  inputError: createCustomTypographyStyle('caption', {
    color: '#FF3B30',
  }),
  
  // Buttons
  primaryButton: createCustomTypographyStyle('buttonMedium', {
    color: '#FFFFFF',
  }),
  secondaryButton: createCustomTypographyStyle('buttonMedium', {
    color: '#007AFF',
  }),
  
  // Cards and lists
  cardTitle: createCustomTypographyStyle('h6', {
    fontWeight: FONT_WEIGHTS.semibold,
  }),
  cardSubtitle: createCustomTypographyStyle('body2', {
    color: '#666666',
  }),
  listItemTitle: createCustomTypographyStyle('body1', {
    fontWeight: FONT_WEIGHTS.medium,
  }),
  listItemSubtitle: createCustomTypographyStyle('caption', {
    color: '#8E8E93',
  }),
  
  // Status and badges
  statusText: createCustomTypographyStyle('caption', {
    fontWeight: FONT_WEIGHTS.semibold,
    textTransform: 'uppercase',
  }),
  badgeText: createCustomTypographyStyle('caption', {
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
  }),
  
  // Special text
  linkText: createCustomTypographyStyle('body1', {
    color: '#007AFF',
  }),
  errorText: createCustomTypographyStyle('body2', {
    color: '#FF3B30',
  }),
  successText: createCustomTypographyStyle('body2', {
    color: '#34C759',
  }),
  warningText: createCustomTypographyStyle('body2', {
    color: '#FF9500',
  }),
} as const;

/**
 * Get font size for a specific typography variant
 */
export const getFontSizeForVariant = (variant: TypographyVariant): number => {
  return TYPOGRAPHY_VARIANTS[variant].fontSize;
};

/**
 * Get line height for a specific typography variant
 */
export const getLineHeightForVariant = (variant: TypographyVariant): number => {
  return TYPOGRAPHY_VARIANTS[variant].lineHeight;
};

/**
 * Check if a font size is considered large (for accessibility)
 */
export const isLargeFontSize = (fontSize: number): boolean => {
  return fontSize >= FONT_SIZES.h3;
};

/**
 * Get minimum touch target size for accessibility (iOS guideline: 44pt)
 */
export const getMinimumTouchTarget = () => ({
  minHeight: 44,
  minWidth: 44,
});

/**
 * Typography scale utilities for consistent sizing
 */
export const TYPOGRAPHY_SCALE = {
  xs: 0.75,
  sm: 0.875,
  base: 1,
  lg: 1.125,
  xl: 1.25,
  '2xl': 1.5,
  '3xl': 1.875,
  '4xl': 2.25,
} as const;

/**
 * Apply typography scale to a base font size
 */
export const applyTypographyScale = (
  baseFontSize: number,
  scale: keyof typeof TYPOGRAPHY_SCALE
): number => {
  return baseFontSize * TYPOGRAPHY_SCALE[scale];
}; 