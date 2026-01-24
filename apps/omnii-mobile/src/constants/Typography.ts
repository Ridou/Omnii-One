/**
 * Typography Constants
 * Centralized typography system for consistent font usage across the app
 */

// Font Family Definitions
export const FONT_FAMILIES = {
  // Brand fonts (custom)
  styrene: 'Styrene',
  tiempos: 'Tiempos',
  
  // System fallbacks
  system: 'System',
  systemBold: 'System',
} as const;

// Font Weight Mappings for Custom Fonts
export const FONT_WEIGHTS = {
  thin: '100',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
} as const;

// Font Size Scale (following iOS Human Interface Guidelines)
export const FONT_SIZES = {
  // Display sizes
  display1: 48,
  display2: 40,
  display3: 32,
  
  // Heading sizes
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  h6: 14,
  
  // Body sizes
  body1: 16,
  body2: 14,
  
  // Utility sizes
  caption: 12,
  overline: 10,
  
  // Button sizes
  buttonLarge: 18,
  buttonMedium: 16,
  buttonSmall: 14,
} as const;

// Line Height Scale
export const LINE_HEIGHTS = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
} as const;

// Letter Spacing Scale
export const LETTER_SPACING = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

// Typography Variants - Pre-defined combinations
export const TYPOGRAPHY_VARIANTS = {
  // Brand Typography (using Styrene for branding)
  brandLarge: {
    fontFamily: FONT_FAMILIES.styrene,
    fontSize: FONT_SIZES.display1,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: FONT_SIZES.display1 * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.wide,
  },
  brandMedium: {
    fontFamily: FONT_FAMILIES.styrene,
    fontSize: FONT_SIZES.h1,
    fontWeight: FONT_WEIGHTS.black,
    lineHeight: FONT_SIZES.h1 * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.normal,
  },
  brandSmall: {
    fontFamily: FONT_FAMILIES.styrene,
    fontSize: FONT_SIZES.h3,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.h3 * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.wide,
  },
  
  // Display Typography (using Tiempos for headlines)
  displayLarge: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.display1,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: FONT_SIZES.display1 * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.normal,
  },
  displayMedium: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.display2,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: FONT_SIZES.display2 * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.normal,
  },
  displaySmall: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.display3,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: FONT_SIZES.display3 * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  
  // Heading Typography (using Tiempos)
  h1: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.h1,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: FONT_SIZES.h1 * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  h2: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.h2,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: FONT_SIZES.h2 * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  h3: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.h3,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: FONT_SIZES.h3 * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  h4: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.h4,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: FONT_SIZES.h4 * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  h5: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.h5,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.h5 * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  h6: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.h6,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.h6 * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  
  // Body Typography (using Tiempos for readability)
  body1: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.body1,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: FONT_SIZES.body1 * LINE_HEIGHTS.relaxed,
    letterSpacing: LETTER_SPACING.normal,
  },
  body2: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.body2,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: FONT_SIZES.body2 * LINE_HEIGHTS.relaxed,
    letterSpacing: LETTER_SPACING.normal,
  },
  
  // Utility Typography
  caption: {
    fontFamily: FONT_FAMILIES.tiempos,
    fontSize: FONT_SIZES.caption,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: FONT_SIZES.caption * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  overline: {
    fontFamily: FONT_FAMILIES.styrene,
    fontSize: FONT_SIZES.overline,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.overline * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.widest,
    textTransform: 'uppercase' as const,
  },
  
  // Button Typography
  buttonLarge: {
    fontFamily: FONT_FAMILIES.styrene,
    fontSize: FONT_SIZES.buttonLarge,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: FONT_SIZES.buttonLarge * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  buttonMedium: {
    fontFamily: FONT_FAMILIES.styrene,
    fontSize: FONT_SIZES.buttonMedium,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: FONT_SIZES.buttonMedium * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  buttonSmall: {
    fontFamily: FONT_FAMILIES.styrene,
    fontSize: FONT_SIZES.buttonSmall,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.buttonSmall * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
} as const;

// Font Loading Configuration
export const FONT_CONFIG = {
  styrene: {
    regular: require('../assets/fonts/Styrene Font Family/StyreneA-Regular-Trial-BF63f6cbd970ee9.otf'),
    regularItalic: require('../assets/fonts/Styrene Font Family/StyreneA-RegularItalic-Trial-BF63f6cbd94325f.otf'),
    light: require('../assets/fonts/Styrene Font Family/StyreneA-Light-Trial-BF63f6cbd99dc3e.otf'),
    lightItalic: require('../assets/fonts/Styrene Font Family/StyreneA-LightItalic-Trial-BF63f6cbd9cb933.otf'),
    medium: require('../assets/fonts/Styrene Font Family/StyreneA-Medium-Trial-BF63f6cbdb24b6d.otf'),
    mediumItalic: require('../assets/fonts/Styrene Font Family/StyreneA-MediumItalic-Trial-BF63f6cbd925a68.otf'),
    bold: require('../assets/fonts/Styrene Font Family/StyreneA-Bold-Trial-BF63f6cbda1877f.otf'),
    boldItalic: require('../assets/fonts/Styrene Font Family/StyreneA-BoldItalic-Trial-BF63f6cbd9bec08.otf'),
    black: require('../assets/fonts/Styrene Font Family/StyreneA-Black-Trial-BF63f6cbd9da245.otf'),
    blackItalic: require('../assets/fonts/Styrene Font Family/StyreneA-BlackItalic-Trial-BF63f6cbd7cb688.otf'),
  },
  tiempos: {
    regular: require('../assets/fonts/Tiempos Font Family/TestTiemposText-Regular-BF66457a50cd521.otf'),
    regularItalic: require('../assets/fonts/Tiempos Font Family/TestTiemposText-RegularItalic-BF66457a50421c2.otf'),
    medium: require('../assets/fonts/Tiempos Font Family/TestTiemposText-Medium-BF66457a508489a.otf'),
    mediumItalic: require('../assets/fonts/Tiempos Font Family/TestTiemposText-MediumItalic-BF66457a508d6d9.otf'),
    semibold: require('../assets/fonts/Tiempos Font Family/TestTiemposText-Semibold-BF66457a4fed201.otf'),
    semiboldItalic: require('../assets/fonts/Tiempos Font Family/TestTiemposText-SemiboldItalic-BF66457a505477c.otf'),
    bold: require('../assets/fonts/Tiempos Font Family/TestTiemposText-Bold-BF66457a4f03c40.otf'),
    boldItalic: require('../assets/fonts/Tiempos Font Family/TestTiemposText-BoldItalic-BF66457a50155b4.otf'),
  },
} as const;

// Export types for TypeScript
export type FontFamily = keyof typeof FONT_FAMILIES;
export type FontWeight = keyof typeof FONT_WEIGHTS;
export type FontSize = keyof typeof FONT_SIZES;
export type TypographyVariant = keyof typeof TYPOGRAPHY_VARIANTS; 