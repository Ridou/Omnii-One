/**
 * Public Assets Utility
 * Centralized access to all public assets for consistent usage across the app
 */

// Brand colors (from the Omnii logo design)
export const BRAND_COLORS = {
  primary: '#007AFF',        // iOS blue - main brand color
  secondary: '#071835',      // Dark blue from logo
  accent: '#021d42',         // Secondary blue
  tertiary: '#024a28',       // Green accent
  quaternary: '#2f182f',     // Purple accent
  background: '#F2F2F7',     // iOS system background
  white: '#FFFFFF',
  text: '#000000',
  secondaryText: '#8E8E93',
  border: '#C7C7CC',
} as const;

// Logo dimensions for different use cases
export const LOGO_DIMENSIONS = {
  tiny: { width: 32, height: 32 },
  small: { width: 60, height: 60 },
  medium: { width: 120, height: 120 },
  large: { width: 200, height: 200 },
  xlarge: { width: 300, height: 300 },
} as const;

// Export types for TypeScript
export type LogoSize = keyof typeof LOGO_DIMENSIONS;
export type BrandColor = keyof typeof BRAND_COLORS;
