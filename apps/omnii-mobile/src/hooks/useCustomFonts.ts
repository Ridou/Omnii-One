import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import { FONT_CONFIG } from '../constants/Typography';

interface FontLoadingState {
  fontsLoaded: boolean;
  fontError: Error | null;
  isLoading: boolean;
}

/**
 * Custom hook for loading Styrene and Tiempos fonts
 * Provides loading state and error handling for font loading
 */
export const useCustomFonts = (): FontLoadingState => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        setIsLoading(true);
        setFontError(null);

        // Load all font variants
        await Font.loadAsync({
          // Styrene font family
          'Styrene-Light': FONT_CONFIG.styrene.light,
          'Styrene-LightItalic': FONT_CONFIG.styrene.lightItalic,
          'Styrene-Regular': FONT_CONFIG.styrene.regular,
          'Styrene-RegularItalic': FONT_CONFIG.styrene.regularItalic,
          'Styrene-Medium': FONT_CONFIG.styrene.medium,
          'Styrene-MediumItalic': FONT_CONFIG.styrene.mediumItalic,
          'Styrene-Bold': FONT_CONFIG.styrene.bold,
          'Styrene-BoldItalic': FONT_CONFIG.styrene.boldItalic,
          'Styrene-Black': FONT_CONFIG.styrene.black,
          'Styrene-BlackItalic': FONT_CONFIG.styrene.blackItalic,
          
          // Tiempos font family
          'Tiempos-Regular': FONT_CONFIG.tiempos.regular,
          'Tiempos-RegularItalic': FONT_CONFIG.tiempos.regularItalic,
          'Tiempos-Medium': FONT_CONFIG.tiempos.medium,
          'Tiempos-MediumItalic': FONT_CONFIG.tiempos.mediumItalic,
          'Tiempos-Semibold': FONT_CONFIG.tiempos.semibold,
          'Tiempos-SemiboldItalic': FONT_CONFIG.tiempos.semiboldItalic,
          'Tiempos-Bold': FONT_CONFIG.tiempos.bold,
          'Tiempos-BoldItalic': FONT_CONFIG.tiempos.boldItalic,
        });

        setFontsLoaded(true);
      } catch (error) {
        setFontError(error instanceof Error ? error : new Error('Unknown font loading error'));
        // Don't block the app if fonts fail to load
        setFontsLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadFonts();
  }, []);

  return {
    fontsLoaded,
    fontError,
    isLoading,
  };
};

/**
 * Helper function to get the correct font family name based on weight and style
 * This handles the mapping between our typography system and the loaded font names
 */
export const getFontFamily = (
  family: 'styrene' | 'tiempos',
  weight: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'black' = 'regular',
  italic = false
) => {
  const suffix = italic ? 'Italic' : '';
  const weightMap = {
    light: 'Light',
    regular: 'Regular',
    medium: 'Medium',
    semibold: 'Semibold',
    bold: 'Bold',
    black: 'Black',
  };

  const capitalizedFamily = family.charAt(0).toUpperCase() + family.slice(1);
  const weightSuffix = weightMap[weight];
  
  return `${capitalizedFamily}-${weightSuffix}${suffix}`;
};

/**
 * Helper function to get system font fallback
 * Returns appropriate system font when custom fonts are not available
 */
export const getSystemFontFallback = (weight = '400') => {
  // iOS system font fallbacks
  if (weight === '700' || weight === 'bold') {
    return 'System';
  }
  return 'System';
}; 